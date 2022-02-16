// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Diff from '../../third_party/diff/diff.js';
import * as FormatterModule from '../formatter/formatter.js';
import * as Persistence from '../persistence/persistence.js';
import * as Workspace from '../workspace/workspace.js';

interface DiffRequestOptions {
  shouldFormatDiff: boolean;
}

interface DiffResponse {
  diff: Diff.Diff.DiffArray;
  formattedCurrentMapping?: FormatterModule.ScriptFormatter.FormatterSourceMapping;
}

export class WorkspaceDiffImpl extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private readonly uiSourceCodeDiffs: WeakMap<Workspace.UISourceCode.UISourceCode, UISourceCodeDiff>;
  private readonly loadingUISourceCodes:
      Map<Workspace.UISourceCode.UISourceCode, Promise<[string | null, string|null]>>;
  private readonly modifiedUISourceCodesInternal: Set<Workspace.UISourceCode.UISourceCode>;

  constructor(workspace: Workspace.Workspace.WorkspaceImpl) {
    super();
    this.uiSourceCodeDiffs = new WeakMap();

    this.loadingUISourceCodes = new Map();

    this.modifiedUISourceCodesInternal = new Set();
    workspace.addEventListener(Workspace.Workspace.Events.WorkingCopyChanged, this.uiSourceCodeChanged, this);
    workspace.addEventListener(Workspace.Workspace.Events.WorkingCopyCommitted, this.uiSourceCodeChanged, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAdded, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.uiSourceCodeRemoved, this);
    workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.projectRemoved, this);
    workspace.uiSourceCodes().forEach(this.updateModifiedState.bind(this));
  }

  requestDiff(uiSourceCode: Workspace.UISourceCode.UISourceCode, diffRequestOptions: DiffRequestOptions):
      Promise<DiffResponse|null> {
    return this.uiSourceCodeDiff(uiSourceCode).requestDiff(diffRequestOptions);
  }

  subscribeToDiffChange(uiSourceCode: Workspace.UISourceCode.UISourceCode, callback: () => void, thisObj?: Object):
      void {
    this.uiSourceCodeDiff(uiSourceCode).addEventListener(UISourceCodeDiffEvents.DiffChanged, callback, thisObj);
  }

  unsubscribeFromDiffChange(uiSourceCode: Workspace.UISourceCode.UISourceCode, callback: () => void, thisObj?: Object):
      void {
    this.uiSourceCodeDiff(uiSourceCode).removeEventListener(UISourceCodeDiffEvents.DiffChanged, callback, thisObj);
  }

  modifiedUISourceCodes(): Workspace.UISourceCode.UISourceCode[] {
    return Array.from(this.modifiedUISourceCodesInternal);
  }

  isUISourceCodeModified(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return this.modifiedUISourceCodesInternal.has(uiSourceCode) || this.loadingUISourceCodes.has(uiSourceCode);
  }

  private uiSourceCodeDiff(uiSourceCode: Workspace.UISourceCode.UISourceCode): UISourceCodeDiff {
    let diff = this.uiSourceCodeDiffs.get(uiSourceCode);
    if (!diff) {
      diff = new UISourceCodeDiff(uiSourceCode);
      this.uiSourceCodeDiffs.set(uiSourceCode, diff);
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
    const uiSourceCodeDiff = this.uiSourceCodeDiffs.get(uiSourceCode);
    if (uiSourceCodeDiff) {
      uiSourceCodeDiff.dispose = true;
    }
    this.markAsUnmodified(uiSourceCode);
  }

  private markAsUnmodified(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.uiSourceCodeProcessedForTest();
    if (this.modifiedUISourceCodesInternal.delete(uiSourceCode)) {
      this.dispatchEventToListeners(Events.ModifiedStatusChanged, {uiSourceCode, isModified: false});
    }
  }

  private markAsModified(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.uiSourceCodeProcessedForTest();
    if (this.modifiedUISourceCodesInternal.has(uiSourceCode)) {
      return;
    }
    this.modifiedUISourceCodesInternal.add(uiSourceCode);
    this.dispatchEventToListeners(Events.ModifiedStatusChanged, {uiSourceCode, isModified: true});
  }

  private uiSourceCodeProcessedForTest(): void {
  }

  private async updateModifiedState(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    this.loadingUISourceCodes.delete(uiSourceCode);

    if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.Network) {
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
  ModifiedStatusChanged = 'ModifiedStatusChanged',
}

export interface ModifiedStatusChangedEvent {
  uiSourceCode: Workspace.UISourceCode.UISourceCode;
  isModified: boolean;
}

export type EventTypes = {
  [Events.ModifiedStatusChanged]: ModifiedStatusChangedEvent,
};

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
      this.dispatchEventToListeners(UISourceCodeDiffEvents.DiffChanged);
      this.pendingChanges = null;
    }
  }

  requestDiff(diffRequestOptions: DiffRequestOptions): Promise<DiffResponse|null> {
    if (!this.requestDiffPromise) {
      this.requestDiffPromise = this.innerRequestDiff(diffRequestOptions);
    }
    return this.requestDiffPromise;
  }

  async originalContent(): Promise<string|null> {
    const originalNetworkContent =
        Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().originalContentForUISourceCode(
            this.uiSourceCode);
    if (originalNetworkContent) {
      return originalNetworkContent;
    }

    const content = await this.uiSourceCode.project().requestFileContent(this.uiSourceCode);
    return content.content || ('error' in content && content.error) || '';
  }

  private async innerRequestDiff({shouldFormatDiff}: DiffRequestOptions): Promise<DiffResponse|null> {
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

    if (current === null || baseline === null) {
      return null;
    }
    let formattedCurrentMapping;
    if (shouldFormatDiff) {
      baseline = (await FormatterModule.ScriptFormatter.format(
                      this.uiSourceCode.contentType(), this.uiSourceCode.mimeType(), baseline))
                     .formattedContent;
      const formatCurrentResult = await FormatterModule.ScriptFormatter.format(
          this.uiSourceCode.contentType(), this.uiSourceCode.mimeType(), current);
      current = formatCurrentResult.formattedContent;
      formattedCurrentMapping = formatCurrentResult.formattedMapping;
    }
    const reNewline = /\r\n?|\n/;
    const diff = Diff.Diff.DiffWrapper.lineDiff(baseline.split(reNewline), current.split(reNewline));
    return {
      diff,
      formattedCurrentMapping,
    };
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum UISourceCodeDiffEvents {
  DiffChanged = 'DiffChanged',
}

export type UISourceCodeDiffEventTypes = {
  [UISourceCodeDiffEvents.DiffChanged]: void,
};

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
let _instance: WorkspaceDiffImpl|null = null;

export function workspaceDiff(): WorkspaceDiffImpl {
  if (!_instance) {
    _instance = new WorkspaceDiffImpl(Workspace.Workspace.WorkspaceImpl.instance());
  }
  return _instance;
}

export class DiffUILocation {
  uiSourceCode: Workspace.UISourceCode.UISourceCode;
  constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    this.uiSourceCode = uiSourceCode;
  }
}

export const UpdateTimeout = 200;
