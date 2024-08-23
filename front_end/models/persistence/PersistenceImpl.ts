// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as Bindings from '../bindings/bindings.js';
import * as BreakpointManager from '../breakpoints/breakpoints.js';
import * as Workspace from '../workspace/workspace.js';

import {Automapping, type AutomappingStatus} from './Automapping.js';
import {LinkDecorator} from './PersistenceUtils.js';

let persistenceInstance: PersistenceImpl;

export class PersistenceImpl extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private readonly workspace: Workspace.Workspace.WorkspaceImpl;
  private readonly breakpointManager: BreakpointManager.BreakpointManager.BreakpointManager;
  private readonly filePathPrefixesToBindingCount: FilePathPrefixesBindingCounts;
  private subscribedBindingEventListeners:
      Platform.MapUtilities.Multimap<Workspace.UISourceCode.UISourceCode, () => void>;
  private readonly mapping: Automapping;

  constructor(
      workspace: Workspace.Workspace.WorkspaceImpl,
      breakpointManager: BreakpointManager.BreakpointManager.BreakpointManager) {
    super();
    this.workspace = workspace;
    this.breakpointManager = breakpointManager;
    this.breakpointManager.addUpdateBindingsCallback(this.#setupBindings.bind(this));
    this.filePathPrefixesToBindingCount = new FilePathPrefixesBindingCounts();

    this.subscribedBindingEventListeners = new Platform.MapUtilities.Multimap();

    const linkDecorator = new LinkDecorator(this);
    Components.Linkifier.Linkifier.setLinkDecorator(linkDecorator);

    this.mapping = new Automapping(this.workspace, this.onStatusAdded.bind(this), this.onStatusRemoved.bind(this));
  }

  static instance(opts: {
    forceNew: boolean|null,
    workspace: Workspace.Workspace.WorkspaceImpl|null,
    breakpointManager: BreakpointManager.BreakpointManager.BreakpointManager|null,
  } = {forceNew: null, workspace: null, breakpointManager: null}): PersistenceImpl {
    const {forceNew, workspace, breakpointManager} = opts;
    if (!persistenceInstance || forceNew) {
      if (!workspace || !breakpointManager) {
        throw new Error('Missing arguments for workspace');
      }
      persistenceInstance = new PersistenceImpl(workspace, breakpointManager);
    }

    return persistenceInstance;
  }

  addNetworkInterceptor(interceptor: (arg0: Workspace.UISourceCode.UISourceCode) => boolean): void {
    this.mapping.addNetworkInterceptor(interceptor);
  }

  refreshAutomapping(): void {
    this.mapping.scheduleRemap();
  }

  async addBinding(binding: PersistenceBinding): Promise<void> {
    await this.innerAddBinding(binding);
  }

  async addBindingForTest(binding: PersistenceBinding): Promise<void> {
    await this.innerAddBinding(binding);
  }

  async removeBinding(binding: PersistenceBinding): Promise<void> {
    await this.innerRemoveBinding(binding);
  }

  async removeBindingForTest(binding: PersistenceBinding): Promise<void> {
    await this.innerRemoveBinding(binding);
  }

  #setupBindings(networkUISourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    if (networkUISourceCode.project().type() !== Workspace.Workspace.projectTypes.Network) {
      return Promise.resolve();
    }
    return this.mapping.computeNetworkStatus(networkUISourceCode);
  }

  private async innerAddBinding(binding: PersistenceBinding): Promise<void> {
    bindings.set(binding.network, binding);
    bindings.set(binding.fileSystem, binding);

    binding.fileSystem.forceLoadOnCheckContent();

    binding.network.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.onWorkingCopyCommitted, this);
    binding.fileSystem.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.onWorkingCopyCommitted, this);
    binding.network.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this.onWorkingCopyChanged, this);
    binding.fileSystem.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this.onWorkingCopyChanged, this);

    this.filePathPrefixesToBindingCount.add(binding.fileSystem.url());

    await this.moveBreakpoints(binding.fileSystem, binding.network);

    console.assert(!binding.fileSystem.isDirty() || !binding.network.isDirty());
    if (binding.fileSystem.isDirty()) {
      this.syncWorkingCopy(binding.fileSystem);
    } else if (binding.network.isDirty()) {
      this.syncWorkingCopy(binding.network);
    } else if (binding.network.hasCommits() && binding.network.content() !== binding.fileSystem.content()) {
      binding.network.setWorkingCopy(binding.network.content());
      this.syncWorkingCopy(binding.network);
    }

    this.notifyBindingEvent(binding.network);
    this.notifyBindingEvent(binding.fileSystem);
    this.dispatchEventToListeners(Events.BindingCreated, binding);
  }

  private async innerRemoveBinding(binding: PersistenceBinding): Promise<void> {
    if (bindings.get(binding.network) !== binding) {
      return;
    }
    console.assert(
        bindings.get(binding.network) === bindings.get(binding.fileSystem),
        'ERROR: inconsistent binding for networkURL ' + binding.network.url());

    bindings.delete(binding.network);
    bindings.delete(binding.fileSystem);

    binding.network.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.onWorkingCopyCommitted, this);
    binding.fileSystem.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.onWorkingCopyCommitted, this);
    binding.network.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this.onWorkingCopyChanged, this);
    binding.fileSystem.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this.onWorkingCopyChanged, this);

    this.filePathPrefixesToBindingCount.remove(binding.fileSystem.url());
    await this.breakpointManager.copyBreakpoints(binding.network, binding.fileSystem);

    this.notifyBindingEvent(binding.network);
    this.notifyBindingEvent(binding.fileSystem);
    this.dispatchEventToListeners(Events.BindingRemoved, binding);
  }

  private onStatusAdded(status: AutomappingStatus): Promise<void> {
    const binding = new PersistenceBinding(status.network, status.fileSystem);
    statusBindings.set(status, binding);
    return this.innerAddBinding(binding);
  }

  private async onStatusRemoved(status: AutomappingStatus): Promise<void> {
    const binding = statusBindings.get(status) as PersistenceBinding;
    await this.innerRemoveBinding(binding);
  }

  private onWorkingCopyChanged(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    this.syncWorkingCopy(uiSourceCode);
  }

  private syncWorkingCopy(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const binding = bindings.get(uiSourceCode);
    if (!binding || mutedWorkingCopies.has(binding)) {
      return;
    }
    const other = binding.network === uiSourceCode ? binding.fileSystem : binding.network;
    if (!uiSourceCode.isDirty()) {
      mutedWorkingCopies.add(binding);
      other.resetWorkingCopy();
      mutedWorkingCopies.delete(binding);
      this.contentSyncedForTest();
      return;
    }

    const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(binding.network);
    if (target && target.type() === SDK.Target.Type.NODE) {
      const newContent = uiSourceCode.workingCopy();
      void other.requestContentData().then(() => {
        const nodeJSContent = PersistenceImpl.rewrapNodeJSContent(other, other.workingCopy(), newContent);
        setWorkingCopy.call(this, () => nodeJSContent);
      });
      return;
    }

    setWorkingCopy.call(this, () => uiSourceCode.workingCopy());

    function setWorkingCopy(this: PersistenceImpl, workingCopyGetter: () => string): void {
      if (binding) {
        mutedWorkingCopies.add(binding);
      }
      other.setWorkingCopyGetter(workingCopyGetter);
      if (binding) {
        mutedWorkingCopies.delete(binding);
      }
      this.contentSyncedForTest();
    }
  }

  private onWorkingCopyCommitted(
      event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.WorkingCopyCommitedEvent>): void {
    const uiSourceCode = event.data.uiSourceCode;
    const newContent = event.data.content;
    this.syncContent(uiSourceCode, newContent, Boolean(event.data.encoded));
  }

  syncContent(uiSourceCode: Workspace.UISourceCode.UISourceCode, newContent: string, encoded: boolean): void {
    const binding = bindings.get(uiSourceCode);
    if (!binding || mutedCommits.has(binding)) {
      return;
    }
    const other = binding.network === uiSourceCode ? binding.fileSystem : binding.network;
    const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(binding.network);
    if (target && target.type() === SDK.Target.Type.NODE) {
      void other.requestContent().then(currentContent => {
        const nodeJSContent = PersistenceImpl.rewrapNodeJSContent(other, currentContent.content || '', newContent);
        setContent.call(this, nodeJSContent);
      });
      return;
    }
    setContent.call(this, newContent);

    function setContent(this: PersistenceImpl, newContent: string): void {
      if (binding) {
        mutedCommits.add(binding);
      }
      other.setContent(newContent, encoded);
      if (binding) {
        mutedCommits.delete(binding);
      }
      this.contentSyncedForTest();
    }
  }

  static rewrapNodeJSContent(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, currentContent: string, newContent: string): string {
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.FileSystem) {
      if (newContent.startsWith(NodePrefix) && newContent.endsWith(NodeSuffix)) {
        newContent = newContent.substring(NodePrefix.length, newContent.length - NodeSuffix.length);
      }
      if (currentContent.startsWith(NodeShebang)) {
        newContent = NodeShebang + newContent;
      }
    } else {
      if (newContent.startsWith(NodeShebang)) {
        newContent = newContent.substring(NodeShebang.length);
      }
      if (currentContent.startsWith(NodePrefix) && currentContent.endsWith(NodeSuffix)) {
        newContent = NodePrefix + newContent + NodeSuffix;
      }
    }
    return newContent;
  }

  private contentSyncedForTest(): void {
  }

  private async moveBreakpoints(from: Workspace.UISourceCode.UISourceCode, to: Workspace.UISourceCode.UISourceCode):
      Promise<void> {
    const breakpoints = this.breakpointManager.breakpointLocationsForUISourceCode(from).map(
        breakpointLocation => breakpointLocation.breakpoint);
    await Promise.all(breakpoints.map(async breakpoint => {
      await breakpoint.remove(false /* keepInStorage */);
      return this.breakpointManager.setBreakpoint(
          to, breakpoint.lineNumber(), breakpoint.columnNumber(), breakpoint.condition(), breakpoint.enabled(),
          breakpoint.isLogpoint(), BreakpointManager.BreakpointManager.BreakpointOrigin.OTHER);
    }));
  }

  hasUnsavedCommittedChanges(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    if (this.workspace.hasResourceContentTrackingExtensions()) {
      return false;
    }
    if (uiSourceCode.project().canSetFileContent()) {
      return false;
    }
    if (bindings.has(uiSourceCode)) {
      return false;
    }
    return Boolean(uiSourceCode.hasCommits());
  }

  binding(uiSourceCode: Workspace.UISourceCode.UISourceCode): PersistenceBinding|null {
    return bindings.get(uiSourceCode) || null;
  }

  subscribeForBindingEvent(uiSourceCode: Workspace.UISourceCode.UISourceCode, listener: () => void): void {
    this.subscribedBindingEventListeners.set(uiSourceCode, listener);
  }

  unsubscribeFromBindingEvent(uiSourceCode: Workspace.UISourceCode.UISourceCode, listener: () => void): void {
    this.subscribedBindingEventListeners.delete(uiSourceCode, listener);
  }

  private notifyBindingEvent(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (!this.subscribedBindingEventListeners.has(uiSourceCode)) {
      return;
    }
    const listeners = Array.from(this.subscribedBindingEventListeners.get(uiSourceCode));
    for (const listener of listeners) {
      listener.call(null);
    }
  }

  fileSystem(uiSourceCode: Workspace.UISourceCode.UISourceCode): Workspace.UISourceCode.UISourceCode|null {
    const binding = this.binding(uiSourceCode);
    return binding ? binding.fileSystem : null;
  }

  network(uiSourceCode: Workspace.UISourceCode.UISourceCode): Workspace.UISourceCode.UISourceCode|null {
    const binding = this.binding(uiSourceCode);
    return binding ? binding.network : null;
  }

  filePathHasBindings(filePath: Platform.DevToolsPath.UrlString): boolean {
    return this.filePathPrefixesToBindingCount.hasBindingPrefix(filePath);
  }
}

class FilePathPrefixesBindingCounts {
  private prefixCounts: Map<string, number>;

  constructor() {
    this.prefixCounts = new Map();
  }

  private getPlatformCanonicalFilePath(path: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString {
    return Host.Platform.isWin() ? Common.ParsedURL.ParsedURL.toLowerCase(path) : path;
  }

  add(filePath: Platform.DevToolsPath.UrlString): void {
    filePath = this.getPlatformCanonicalFilePath(filePath);
    let relative = '';
    for (const token of filePath.split('/')) {
      relative += token + '/';
      const count = this.prefixCounts.get(relative) || 0;
      this.prefixCounts.set(relative, count + 1);
    }
  }

  remove(filePath: Platform.DevToolsPath.UrlString): void {
    filePath = this.getPlatformCanonicalFilePath(filePath);
    let relative = '';
    for (const token of filePath.split('/')) {
      relative += token + '/';
      const count = this.prefixCounts.get(relative);
      if (count === 1) {
        this.prefixCounts.delete(relative);
      } else if (count !== undefined) {
        this.prefixCounts.set(relative, count - 1);
      }
    }
  }

  hasBindingPrefix(filePath: Platform.DevToolsPath.UrlString): boolean {
    filePath = this.getPlatformCanonicalFilePath(filePath);
    if (!filePath.endsWith('/')) {
      filePath = Common.ParsedURL.ParsedURL.concatenate(filePath, '/');
    }
    return this.prefixCounts.has(filePath);
  }
}

const bindings = new WeakMap<Workspace.UISourceCode.UISourceCode, PersistenceBinding>();
const statusBindings = new WeakMap<AutomappingStatus, PersistenceBinding>();

const mutedCommits = new WeakSet<PersistenceBinding>();

const mutedWorkingCopies = new WeakSet<PersistenceBinding>();

export const NodePrefix = '(function (exports, require, module, __filename, __dirname) { ';
export const NodeSuffix = '\n});';
export const NodeShebang = '#!/usr/bin/env node';

export enum Events {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  BindingCreated = 'BindingCreated',
  BindingRemoved = 'BindingRemoved',
  /* eslint-enable @typescript-eslint/naming-convention */
}

export type EventTypes = {
  [Events.BindingCreated]: PersistenceBinding,
  [Events.BindingRemoved]: PersistenceBinding,
};

export class PersistenceBinding {
  network: Workspace.UISourceCode.UISourceCode;
  fileSystem: Workspace.UISourceCode.UISourceCode;
  constructor(network: Workspace.UISourceCode.UISourceCode, fileSystem: Workspace.UISourceCode.UISourceCode) {
    this.network = network;
    this.fileSystem = fileSystem;
  }
}
