// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as Bindings from '../bindings/bindings.js';
import * as Workspace from '../workspace/workspace.js';

import type {AutomappingStatus} from './Automapping.js';
import {Automapping} from './Automapping.js';
import {LinkDecorator} from './PersistenceUtils.js';

let persistenceInstance: PersistenceImpl;

export class PersistenceImpl extends Common.ObjectWrapper.ObjectWrapper {
  _workspace: Workspace.Workspace.WorkspaceImpl;
  _breakpointManager: Bindings.BreakpointManager.BreakpointManager;
  _filePathPrefixesToBindingCount: Map<string, number>;
  _subscribedBindingEventListeners: Platform.MapUtilities.Multimap<Workspace.UISourceCode.UISourceCode, () => void>;
  _mapping: Automapping;

  constructor(
      workspace: Workspace.Workspace.WorkspaceImpl, breakpointManager: Bindings.BreakpointManager.BreakpointManager) {
    super();
    this._workspace = workspace;
    this._breakpointManager = breakpointManager;
    this._filePathPrefixesToBindingCount = new Map();

    this._subscribedBindingEventListeners = new Platform.MapUtilities.Multimap();

    const linkDecorator = new LinkDecorator(this);
    Components.Linkifier.Linkifier.setLinkDecorator(linkDecorator);

    this._mapping = new Automapping(this._workspace, this._onStatusAdded.bind(this), this._onStatusRemoved.bind(this));
  }

  static instance(opts: {
    forceNew: boolean|null,
    workspace: Workspace.Workspace.WorkspaceImpl|null,
    breakpointManager: Bindings.BreakpointManager.BreakpointManager|null,
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
    this._mapping.addNetworkInterceptor(interceptor);
  }

  refreshAutomapping(): void {
    this._mapping.scheduleRemap();
  }

  async addBinding(binding: PersistenceBinding): Promise<void> {
    await this._innerAddBinding(binding);
  }

  async addBindingForTest(binding: PersistenceBinding): Promise<void> {
    await this._innerAddBinding(binding);
  }

  async removeBinding(binding: PersistenceBinding): Promise<void> {
    await this._innerRemoveBinding(binding);
  }

  async removeBindingForTest(binding: PersistenceBinding): Promise<void> {
    await this._innerRemoveBinding(binding);
  }

  async _innerAddBinding(binding: PersistenceBinding): Promise<void> {
    bindings.set(binding.network, binding);
    bindings.set(binding.fileSystem, binding);

    binding.fileSystem.forceLoadOnCheckContent();

    binding.network.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.fileSystem.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.network.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);
    binding.fileSystem.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);

    this._addFilePathBindingPrefixes(binding.fileSystem.url());

    await this._moveBreakpoints(binding.fileSystem, binding.network);

    console.assert(!binding.fileSystem.isDirty() || !binding.network.isDirty());
    if (binding.fileSystem.isDirty()) {
      this._syncWorkingCopy(binding.fileSystem);
    } else if (binding.network.isDirty()) {
      this._syncWorkingCopy(binding.network);
    } else if (binding.network.hasCommits() && binding.network.content() !== binding.fileSystem.content()) {
      binding.network.setWorkingCopy(binding.network.content());
      this._syncWorkingCopy(binding.network);
    }

    this._notifyBindingEvent(binding.network);
    this._notifyBindingEvent(binding.fileSystem);
    this.dispatchEventToListeners(Events.BindingCreated, binding);
  }

  async _innerRemoveBinding(binding: PersistenceBinding): Promise<void> {
    if (bindings.get(binding.network) !== binding) {
      return;
    }
    console.assert(
        bindings.get(binding.network) === bindings.get(binding.fileSystem),
        'ERROR: inconsistent binding for networkURL ' + binding.network.url());

    bindings.delete(binding.network);
    bindings.delete(binding.fileSystem);

    binding.network.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.fileSystem.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this._onWorkingCopyCommitted, this);
    binding.network.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);
    binding.fileSystem.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this._onWorkingCopyChanged, this);

    this._removeFilePathBindingPrefixes(binding.fileSystem.url());
    await this._breakpointManager.copyBreakpoints(binding.network.url(), binding.fileSystem);

    this._notifyBindingEvent(binding.network);
    this._notifyBindingEvent(binding.fileSystem);
    this.dispatchEventToListeners(Events.BindingRemoved, binding);
  }

  async _onStatusAdded(status: AutomappingStatus): Promise<void> {
    const binding = new PersistenceBinding(status.network, status.fileSystem);
    statusBindings.set(status, binding);
    await this._innerAddBinding(binding);
  }

  async _onStatusRemoved(status: AutomappingStatus): Promise<void> {
    const binding = statusBindings.get(status) as PersistenceBinding;
    await this._innerRemoveBinding(binding);
  }

  _onWorkingCopyChanged(event: Common.EventTarget.EventTargetEvent): void {
    const uiSourceCode = event.data as Workspace.UISourceCode.UISourceCode;
    this._syncWorkingCopy(uiSourceCode);
  }

  _syncWorkingCopy(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const binding = bindings.get(uiSourceCode);
    if (!binding || mutedWorkingCopies.has(binding)) {
      return;
    }
    const other = binding.network === uiSourceCode ? binding.fileSystem : binding.network;
    if (!uiSourceCode.isDirty()) {
      mutedWorkingCopies.add(binding);
      other.resetWorkingCopy();
      mutedWorkingCopies.delete(binding);
      this._contentSyncedForTest();
      return;
    }

    const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(binding.network);
    if (target && target.type() === SDK.SDKModel.Type.Node) {
      const newContent = uiSourceCode.workingCopy();
      other.requestContent().then(() => {
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
      this._contentSyncedForTest();
    }
  }

  _onWorkingCopyCommitted(event: Common.EventTarget.EventTargetEvent): void {
    const uiSourceCode = event.data.uiSourceCode as Workspace.UISourceCode.UISourceCode;
    const newContent = event.data.content as string;
    this.syncContent(uiSourceCode, newContent, event.data.encoded);
  }

  syncContent(uiSourceCode: Workspace.UISourceCode.UISourceCode, newContent: string, encoded: boolean): void {
    const binding = bindings.get(uiSourceCode);
    if (!binding || mutedCommits.has(binding)) {
      return;
    }
    const other = binding.network === uiSourceCode ? binding.fileSystem : binding.network;
    const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(binding.network);
    if (target && target.type() === SDK.SDKModel.Type.Node) {
      other.requestContent().then(currentContent => {
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
      this._contentSyncedForTest();
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

  _contentSyncedForTest(): void {
  }

  async _moveBreakpoints(from: Workspace.UISourceCode.UISourceCode, to: Workspace.UISourceCode.UISourceCode):
      Promise<void> {
    const breakpoints = this._breakpointManager.breakpointLocationsForUISourceCode(from).map(
        breakpointLocation => breakpointLocation.breakpoint);
    await Promise.all(breakpoints.map(breakpoint => {
      breakpoint.remove(false /* keepInStorage */);
      return this._breakpointManager.setBreakpoint(
          to, breakpoint.lineNumber(), breakpoint.columnNumber(), breakpoint.condition(), breakpoint.enabled());
    }));
  }

  hasUnsavedCommittedChanges(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    if (this._workspace.hasResourceContentTrackingExtensions()) {
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
    this._subscribedBindingEventListeners.set(uiSourceCode, listener);
  }

  unsubscribeFromBindingEvent(uiSourceCode: Workspace.UISourceCode.UISourceCode, listener: () => void): void {
    this._subscribedBindingEventListeners.delete(uiSourceCode, listener);
  }

  _notifyBindingEvent(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (!this._subscribedBindingEventListeners.has(uiSourceCode)) {
      return;
    }
    const listeners = Array.from(this._subscribedBindingEventListeners.get(uiSourceCode));
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

  _addFilePathBindingPrefixes(filePath: string): void {
    let relative = '';
    for (const token of filePath.split('/')) {
      relative += token + '/';
      const count = this._filePathPrefixesToBindingCount.get(relative) || 0;
      this._filePathPrefixesToBindingCount.set(relative, count + 1);
    }
  }

  _removeFilePathBindingPrefixes(filePath: string): void {
    let relative = '';
    for (const token of filePath.split('/')) {
      relative += token + '/';
      const count = this._filePathPrefixesToBindingCount.get(relative);
      if (count === 1) {
        this._filePathPrefixesToBindingCount.delete(relative);
      } else if (count !== undefined) {
        this._filePathPrefixesToBindingCount.set(relative, count - 1);
      }
    }
  }

  filePathHasBindings(filePath: string): boolean {
    if (!filePath.endsWith('/')) {
      filePath += '/';
    }
    return this._filePathPrefixesToBindingCount.has(filePath);
  }
}

const bindings = new WeakMap<Workspace.UISourceCode.UISourceCode, PersistenceBinding>();
const statusBindings = new WeakMap<AutomappingStatus, PersistenceBinding>();

const mutedCommits = new WeakSet<PersistenceBinding>();

const mutedWorkingCopies = new WeakSet<PersistenceBinding>();

export const NodePrefix = '(function (exports, require, module, __filename, __dirname) { ';
export const NodeSuffix = '\n});';
export const NodeShebang = '#!/usr/bin/env node';

export const Events = {
  BindingCreated: Symbol('BindingCreated'),
  BindingRemoved: Symbol('BindingRemoved'),
};

export class PathEncoder {
  _encoder: Common.CharacterIdMap.CharacterIdMap<string>;
  constructor() {
    this._encoder = new Common.CharacterIdMap.CharacterIdMap();
  }

  encode(path: string): string {
    return path.split('/').map(token => this._encoder.toChar(token)).join('');
  }

  decode(path: string): string {
    return path.split('').map(token => this._encoder.fromChar(token)).join('/');
  }
}

export class PersistenceBinding {
  network: Workspace.UISourceCode.UISourceCode;
  fileSystem: Workspace.UISourceCode.UISourceCode;
  constructor(network: Workspace.UISourceCode.UISourceCode, fileSystem: Workspace.UISourceCode.UISourceCode) {
    this.network = network;
    this.fileSystem = fileSystem;
  }
}
