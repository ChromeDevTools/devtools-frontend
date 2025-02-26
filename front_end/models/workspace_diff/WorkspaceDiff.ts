// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import * as Diff from '../../third_party/diff/diff.js';
import * as FormatterModule from '../formatter/formatter.js';
import * as Persistence from '../persistence/persistence.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

interface DiffResponse {
  diff: Diff.Diff.DiffArray;
  formattedCurrentMapping?: FormatterModule.ScriptFormatter.FormatterSourceMapping;
}

export class WorkspaceDiffImpl extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #persistence = Persistence.Persistence.PersistenceImpl.instance();
  readonly #diffs = new WeakMap<Workspace.UISourceCode.UISourceCode, UISourceCodeDiff>();
  private readonly loadingUISourceCodes =
      new Map<Workspace.UISourceCode.UISourceCode, Promise<[string | null, string|null]>>();
  readonly #modified = new Set<Workspace.UISourceCode.UISourceCode>();

  constructor(workspace: Workspace.Workspace.WorkspaceImpl) {
    super();
    workspace.addEventListener(Workspace.Workspace.Events.WorkingCopyChanged, this.uiSourceCodeChanged, this);
    workspace.addEventListener(Workspace.Workspace.Events.WorkingCopyCommitted, this.uiSourceCodeChanged, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAdded, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.uiSourceCodeRemoved, this);
    workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.projectRemoved, this);
    workspace.uiSourceCodes().forEach(this.updateModifiedState.bind(this));
  }

  requestDiff(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<DiffResponse|null> {
    return this.uiSourceCodeDiff(uiSourceCode).requestDiff();
  }

  subscribeToDiffChange(uiSourceCode: Workspace.UISourceCode.UISourceCode, callback: () => void, thisObj?: Object):
      void {
    this.uiSourceCodeDiff(uiSourceCode).addEventListener(UISourceCodeDiffEvents.DIFF_CHANGED, callback, thisObj);
  }

  unsubscribeFromDiffChange(uiSourceCode: Workspace.UISourceCode.UISourceCode, callback: () => void, thisObj?: Object):
      void {
    this.uiSourceCodeDiff(uiSourceCode).removeEventListener(UISourceCodeDiffEvents.DIFF_CHANGED, callback, thisObj);
  }

  modifiedUISourceCodes(): Workspace.UISourceCode.UISourceCode[] {
    return Array.from(this.#modified);
  }

  private uiSourceCodeDiff(uiSourceCode: Workspace.UISourceCode.UISourceCode): UISourceCodeDiff {
    let diff = this.#diffs.get(uiSourceCode);
    if (!diff) {
      diff = new UISourceCodeDiff(uiSourceCode);
      this.#diffs.set(uiSourceCode, diff);
    }
    return diff;
  }

  private uiSourceCodeChanged(
      event: Common.EventTarget.EventTargetEvent<{uiSourceCode: Workspace.UISourceCode.UISourceCode}>): void {
    const uiSourceCode = event.data.uiSourceCode;
    void this.updateModifiedState(uiSourceCode);
  }

  private uiSourceCodeAdded(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    void this.updateModifiedState(uiSourceCode);
  }

  private uiSourceCodeRemoved(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    this.removeUISourceCode(uiSourceCode);
  }

  private projectRemoved(event: Common.EventTarget.EventTargetEvent<Workspace.Workspace.Project>): void {
    const project = event.data;
    for (const uiSourceCode of project.uiSourceCodes()) {
      this.removeUISourceCode(uiSourceCode);
    }
  }

  private removeUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.loadingUISourceCodes.delete(uiSourceCode);
    const uiSourceCodeDiff = this.#diffs.get(uiSourceCode);
    if (uiSourceCodeDiff) {
      uiSourceCodeDiff.dispose = true;
    }
    this.markAsUnmodified(uiSourceCode);
  }

  private markAsUnmodified(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.uiSourceCodeProcessedForTest();
    if (this.#modified.delete(uiSourceCode)) {
      this.dispatchEventToListeners(Events.MODIFIED_STATUS_CHANGED, {uiSourceCode, isModified: false});
    }
  }

  private markAsModified(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.uiSourceCodeProcessedForTest();
    if (this.#modified.has(uiSourceCode)) {
      return;
    }
    this.#modified.add(uiSourceCode);
    this.dispatchEventToListeners(Events.MODIFIED_STATUS_CHANGED, {uiSourceCode, isModified: true});
  }

  private uiSourceCodeProcessedForTest(): void {
  }

  #shouldTrack(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    // We track differences for all Network resources.
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network) {
      return true;
    }

    // Additionally we also track differences for FileSystem resources that don't have
    // a binding (as part of the kDevToolsImprovedWorkspaces feature).
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.FileSystem &&
        this.#persistence.binding(uiSourceCode) === null &&
        Root.Runtime.hostConfig.devToolsImprovedWorkspaces?.enabled) {
      return true;
    }

    return false;
  }

  private async updateModifiedState(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    this.loadingUISourceCodes.delete(uiSourceCode);

    if (!this.#shouldTrack(uiSourceCode)) {
      this.markAsUnmodified(uiSourceCode);
      return;
    }
    if (uiSourceCode.isDirty()) {
      this.markAsModified(uiSourceCode);
      return;
    }
    if (!uiSourceCode.hasCommits()) {
      this.markAsUnmodified(uiSourceCode);
      return;
    }

    const contentsPromise = Promise.all([
      this.requestOriginalContentForUISourceCode(uiSourceCode),
      uiSourceCode.requestContent().then(deferredContent => deferredContent.content),
    ]);

    this.loadingUISourceCodes.set(uiSourceCode, contentsPromise);
    const contents = await contentsPromise;
    if (this.loadingUISourceCodes.get(uiSourceCode) !== contentsPromise) {
      return;
    }
    this.loadingUISourceCodes.delete(uiSourceCode);

    if (contents[0] !== null && contents[1] !== null && contents[0] !== contents[1]) {
      this.markAsModified(uiSourceCode);
    } else {
      this.markAsUnmodified(uiSourceCode);
    }
  }

  requestOriginalContentForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<string|null> {
    return this.uiSourceCodeDiff(uiSourceCode).originalContent();
  }

  revertToOriginal(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    function callback(content: string|null): void {
      if (typeof content !== 'string') {
        return;
      }

      uiSourceCode.addRevision(content);
    }

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.RevisionApplied);
    return this.requestOriginalContentForUISourceCode(uiSourceCode).then(callback);
  }
}

export const enum Events {
  MODIFIED_STATUS_CHANGED = 'ModifiedStatusChanged',
}

export interface ModifiedStatusChangedEvent {
  uiSourceCode: Workspace.UISourceCode.UISourceCode;
  isModified: boolean;
}

export interface EventTypes {
  [Events.MODIFIED_STATUS_CHANGED]: ModifiedStatusChangedEvent;
}

export class UISourceCodeDiff extends Common.ObjectWrapper.ObjectWrapper<UISourceCodeDiffEventTypes> {
  private uiSourceCode: Workspace.UISourceCode.UISourceCode;
  private requestDiffPromise: Promise<DiffResponse|null>|null;
  private pendingChanges: number|null;
  dispose: boolean;
  constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super();
    this.uiSourceCode = uiSourceCode;
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this.uiSourceCodeChanged, this);
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.uiSourceCodeChanged, this);
    this.requestDiffPromise = null;
    this.pendingChanges = null;
    this.dispose = false;
  }

  private uiSourceCodeChanged(): void {
    if (this.pendingChanges) {
      clearTimeout(this.pendingChanges);
      this.pendingChanges = null;
    }
    this.requestDiffPromise = null;

    const content = this.uiSourceCode.content();
    const delay = (!content || content.length < 65536) ? 0 : UpdateTimeout;
    this.pendingChanges = window.setTimeout(emitDiffChanged.bind(this), delay);

    function emitDiffChanged(this: UISourceCodeDiff): void {
      if (this.dispose) {
        return;
      }
      this.dispatchEventToListeners(UISourceCodeDiffEvents.DIFF_CHANGED);
      this.pendingChanges = null;
    }
  }

  requestDiff(): Promise<DiffResponse|null> {
    if (!this.requestDiffPromise) {
      this.requestDiffPromise = this.innerRequestDiff();
    }
    return this.requestDiffPromise;
  }

  async originalContent(): Promise<string|null> {
    const originalNetworkContent =
        Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().originalContentForUISourceCode(
            this.uiSourceCode);
    if (originalNetworkContent) {
      return await originalNetworkContent;
    }

    const content = await this.uiSourceCode.project().requestFileContent(this.uiSourceCode);
    if (TextUtils.ContentData.ContentData.isError(content)) {
      return content.error;
    }
    return content.asDeferedContent().content;
  }

  private async innerRequestDiff(): Promise<DiffResponse|null> {
    if (this.dispose) {
      return null;
    }

    let baseline = await this.originalContent();
    if (baseline === null) {
      return null;
    }
    if (baseline.length > 1024 * 1024) {
      return null;
    }
    // ------------ ASYNC ------------
    if (this.dispose) {
      return null;
    }

    let current = this.uiSourceCode.workingCopy();
    if (!current && !this.uiSourceCode.contentLoaded()) {
      current = ((await this.uiSourceCode.requestContent()).content as string);
    }

    if (current.length > 1024 * 1024) {
      return null;
    }

    if (this.dispose) {
      return null;
    }

    baseline = (await FormatterModule.ScriptFormatter.format(
                    this.uiSourceCode.contentType(), this.uiSourceCode.mimeType(), baseline))
                   .formattedContent;
    const formatCurrentResult = await FormatterModule.ScriptFormatter.format(
        this.uiSourceCode.contentType(), this.uiSourceCode.mimeType(), current);
    current = formatCurrentResult.formattedContent;
    const formattedCurrentMapping = formatCurrentResult.formattedMapping;
    const reNewline = /\r\n?|\n/;
    const diff = Diff.Diff.DiffWrapper.lineDiff(baseline.split(reNewline), current.split(reNewline));
    return {
      diff,
      formattedCurrentMapping,
    };
  }
}

export const enum UISourceCodeDiffEvents {
  DIFF_CHANGED = 'DiffChanged',
}

export interface UISourceCodeDiffEventTypes {
  [UISourceCodeDiffEvents.DIFF_CHANGED]: void;
}

let workspaceDiffImplInstance: WorkspaceDiffImpl|null = null;

export function workspaceDiff(): WorkspaceDiffImpl {
  if (!workspaceDiffImplInstance) {
    workspaceDiffImplInstance = new WorkspaceDiffImpl(Workspace.Workspace.WorkspaceImpl.instance());
  }
  return workspaceDiffImplInstance;
}

export const UpdateTimeout = 200;
