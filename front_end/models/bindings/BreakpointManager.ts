/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import {DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';
import type {LiveLocation} from './LiveLocation.js';
import {LiveLocationPool} from './LiveLocation.js';
import {DefaultScriptMapping} from './DefaultScriptMapping.js';

let breakpointManagerInstance: BreakpointManager;

export class BreakpointManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    SDK.TargetManager.SDKModelObserver<SDK.DebuggerModel.DebuggerModel> {
  readonly storage: Storage;
  readonly #workspace: Workspace.Workspace.WorkspaceImpl;
  readonly targetManager: SDK.TargetManager.TargetManager;
  readonly debuggerWorkspaceBinding: DebuggerWorkspaceBinding;
  readonly #breakpointsForUISourceCode: Map<Workspace.UISourceCode.UISourceCode, Map<string, BreakpointLocation>>;
  readonly #breakpointByStorageId: Map<string, Breakpoint>;
  #updateBindingsCallbacks: ((uiSourceCode: Workspace.UISourceCode.UISourceCode) => Promise<void>)[];

  private constructor(
      targetManager: SDK.TargetManager.TargetManager, workspace: Workspace.Workspace.WorkspaceImpl,
      debuggerWorkspaceBinding: DebuggerWorkspaceBinding) {
    super();
    this.storage = new Storage();
    this.#workspace = workspace;
    this.targetManager = targetManager;
    this.debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    this.#breakpointsForUISourceCode = new Map();
    this.#breakpointByStorageId = new Map();

    this.#workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAdded, this);
    this.#workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.uiSourceCodeRemoved, this);
    this.#workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.projectRemoved, this);

    this.targetManager.observeModels(SDK.DebuggerModel.DebuggerModel, this);
    this.#updateBindingsCallbacks = [];
  }

  static instance(opts: {
    forceNew: boolean|null,
    targetManager: SDK.TargetManager.TargetManager|null,
    workspace: Workspace.Workspace.WorkspaceImpl|null,
    debuggerWorkspaceBinding: DebuggerWorkspaceBinding|null,
  } = {forceNew: null, targetManager: null, workspace: null, debuggerWorkspaceBinding: null}): BreakpointManager {
    const {forceNew, targetManager, workspace, debuggerWorkspaceBinding} = opts;
    if (!breakpointManagerInstance || forceNew) {
      if (!targetManager || !workspace || !debuggerWorkspaceBinding) {
        throw new Error(
            `Unable to create settings: targetManager, workspace, and debuggerWorkspaceBinding must be provided: ${
                new Error().stack}`);
      }

      breakpointManagerInstance = new BreakpointManager(targetManager, workspace, debuggerWorkspaceBinding);
    }

    return breakpointManagerInstance;
  }

  static breakpointStorageId(url: Platform.DevToolsPath.UrlString, lineNumber: number, columnNumber?: number): string {
    if (!url) {
      return '';
    }
    return `${url}:${lineNumber}` + (typeof columnNumber === 'number' ? `:${columnNumber}` : '');
  }

  modelAdded(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS)) {
      debuggerModel.setSynchronizeBreakpointsCallback(this.restoreBreakpointsForScript.bind(this));
    }
  }

  modelRemoved(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    debuggerModel.setSynchronizeBreakpointsCallback(null);
  }

  addUpdateBindingsCallback(callback: ((uiSourceCode: Workspace.UISourceCode.UISourceCode) => Promise<void>)): void {
    this.#updateBindingsCallbacks.push(callback);
  }

  async copyBreakpoints(fromURL: Platform.DevToolsPath.UrlString, toSourceCode: Workspace.UISourceCode.UISourceCode):
      Promise<void> {
    const breakpointItems = this.storage.breakpointItems(fromURL);
    for (const item of breakpointItems) {
      await this.setBreakpoint(toSourceCode, item.lineNumber, item.columnNumber, item.condition, item.enabled);
    }
  }

  // This method explicitly awaits the source map (if necessary) and the uiSourceCodes
  // required to set all breakpoints that are related to this script.
  async restoreBreakpointsForScript(script: SDK.Script.Script): Promise<void> {
    if (!Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS)) {
      return;
    }
    if (!script.sourceURL) {
      return;
    }

    const debuggerModel = script.debuggerModel;
    const uiSourceCode = await this.getUpdatedUISourceCode(script);
    if (this.#hasBreakpointsForUrl(script.sourceURL)) {
      await this.#restoreBreakpointsForUrl(uiSourceCode);
    }

    // Handle source maps and the original sources.
    const sourceMap = await debuggerModel.sourceMapManager().sourceMapForClientPromise(script);
    if (sourceMap) {
      for (const sourceURL of sourceMap.sourceURLs()) {
        if (this.#hasBreakpointsForUrl(sourceURL)) {
          const uiSourceCode = await Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURLPromise(sourceURL);
          await this.#restoreBreakpointsForUrl(uiSourceCode);
        }
      }
    }

    // Handle language plugins
    const {pluginManager} = this.debuggerWorkspaceBinding;
    if (pluginManager) {
      const sourceUrls = await pluginManager.getSourcesForScript(script);
      if (Array.isArray(sourceUrls)) {
        for (const sourceURL of sourceUrls) {
          if (this.#hasBreakpointsForUrl(sourceURL)) {
            const uiSourceCode =
                await Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURLPromise(sourceURL);
            await this.#restoreBreakpointsForUrl(uiSourceCode);
          }
        }
      }
    }
  }

  async getUpdatedUISourceCode(script: SDK.Script.Script): Promise<Workspace.UISourceCode.UISourceCode> {
    const isSnippet = script.sourceURL.startsWith('snippet://');
    const projectType = isSnippet ? Workspace.Workspace.projectTypes.Network : undefined;

    // Handle inline scripts without sourceURL comment separately:
    // The UISourceCode of inline scripts without sourceURLs will not be availabe
    // until a later point. Use the v8 script for setting the breakpoint.
    const isInlineScriptWithoutSourceURL = script.isInlineScript() && !script.hasSourceURL;
    const sourceURL =
        isInlineScriptWithoutSourceURL ? DefaultScriptMapping.createV8ScriptURL(script) : script.sourceURL;
    const uiSourceCode =
        await Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURLPromise(sourceURL, projectType);

    if (this.#updateBindingsCallbacks.length > 0) {
      // It's possible to set breakpoints on files on the file system, and to have them
      // hit whenever we navigate to a page that serves that file.
      // To make sure that we have all breakpoint information moved from the file system
      // to the served file, we need to update the bindings and await it. This will
      // move the breakpoints from the FileSystem UISourceCode to the Network UiSourceCode.
      const promises = [];
      for (const callback of this.#updateBindingsCallbacks) {
        promises.push(callback(uiSourceCode));
      }
      await Promise.all(promises);
    }
    return uiSourceCode;
  }

  async #restoreBreakpointsForUrl(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    this.restoreBreakpoints(uiSourceCode);
    const breakpoints = this.#breakpointByStorageId.values();
    const affectedBreakpoints = Array.from(breakpoints).filter(x => x.uiSourceCodes.has(uiSourceCode));
    // Make sure to properly await their updates
    await Promise.all(affectedBreakpoints.map(bp => bp.updateBreakpoint()));
  }

  #hasBreakpointsForUrl(url: Platform.DevToolsPath.UrlString): boolean {
    const breakpointItems = this.storage.breakpointItems(url);
    return breakpointItems.length > 0;
  }

  private restoreBreakpoints(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const url = uiSourceCode.url();
    if (!url) {
      return;
    }

    this.storage.mute();
    const breakpointItems = this.storage.breakpointItems(url);
    for (const item of breakpointItems) {
      this.innerSetBreakpoint(uiSourceCode, item.lineNumber, item.columnNumber, item.condition, item.enabled);
    }
    this.storage.unmute();
  }

  private uiSourceCodeAdded(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    this.restoreBreakpoints(uiSourceCode);
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
    const breakpoints = this.breakpointLocationsForUISourceCode(uiSourceCode);
    breakpoints.forEach(bp => bp.breakpoint.removeUISourceCode(uiSourceCode));
  }

  async setBreakpoint(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, lineNumber: number, columnNumber: number|undefined,
      condition: string, enabled: boolean): Promise<Breakpoint> {
    let uiLocation: Workspace.UISourceCode.UILocation =
        new Workspace.UISourceCode.UILocation(uiSourceCode, lineNumber, columnNumber);
    const normalizedLocation = await this.debuggerWorkspaceBinding.normalizeUILocation(uiLocation);
    if (normalizedLocation.id() !== uiLocation.id()) {
      void Common.Revealer.reveal(normalizedLocation);
      uiLocation = normalizedLocation;
    }
    return this.innerSetBreakpoint(
        uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber, condition, enabled);
  }

  private innerSetBreakpoint(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, lineNumber: number, columnNumber: number|undefined,
      condition: string, enabled: boolean): Breakpoint {
    const itemId = BreakpointManager.breakpointStorageId(uiSourceCode.url(), lineNumber, columnNumber);
    let breakpoint = this.#breakpointByStorageId.get(itemId);
    if (breakpoint) {
      breakpoint.updateState(condition, enabled);
      breakpoint.addUISourceCode(uiSourceCode);
      void breakpoint.updateBreakpoint();
      return breakpoint;
    }
    breakpoint = new Breakpoint(this, uiSourceCode, uiSourceCode.url(), lineNumber, columnNumber, condition, enabled);
    this.#breakpointByStorageId.set(itemId, breakpoint);
    return breakpoint;
  }

  findBreakpoint(uiLocation: Workspace.UISourceCode.UILocation): BreakpointLocation|null {
    const breakpoints = this.#breakpointsForUISourceCode.get(uiLocation.uiSourceCode);
    return breakpoints ? (breakpoints.get(uiLocation.id())) || null : null;
  }

  async possibleBreakpoints(
      uiSourceCode: Workspace.UISourceCode.UISourceCode,
      textRange: TextUtils.TextRange.TextRange): Promise<Workspace.UISourceCode.UILocation[]> {
    const {pluginManager} = this.debuggerWorkspaceBinding;
    if (pluginManager) {
      // TODO(bmeurer): Refactor this logic, as for DWARF and sourcemaps, it doesn't make sense
      //                to even ask V8 for possible break locations, since these are determined
      //                from the debugging information.
      const rawLocations = await pluginManager.uiLocationToRawLocations(uiSourceCode, textRange.startLine);
      if (rawLocations) {
        const uiLocations = [];
        for (const rawLocation of rawLocations) {
          const uiLocation = await this.debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation);
          if (uiLocation) {
            uiLocations.push(uiLocation);
          }
        }
        return uiLocations;
      }
    }
    const startLocationsPromise = DebuggerWorkspaceBinding.instance().uiLocationToRawLocations(
        uiSourceCode, textRange.startLine, textRange.startColumn);
    const endLocationsPromise = DebuggerWorkspaceBinding.instance().uiLocationToRawLocations(
        uiSourceCode, textRange.endLine, textRange.endColumn);
    const [startLocations, endLocations] = await Promise.all([startLocationsPromise, endLocationsPromise]);
    const endLocationByModel = new Map<SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Location>();
    for (const location of endLocations) {
      endLocationByModel.set(location.debuggerModel, location);
    }
    let startLocation: SDK.DebuggerModel.Location|null = null;
    let endLocation: SDK.DebuggerModel.Location|null = null;
    for (const location of startLocations) {
      const endLocationCandidate = endLocationByModel.get(location.debuggerModel);
      if (endLocationCandidate) {
        startLocation = location;
        endLocation = endLocationCandidate;
        break;
      }
    }
    if (!startLocation || !endLocation) {
      return [];
    }

    return startLocation.debuggerModel
        .getPossibleBreakpoints(startLocation, endLocation, /* restrictToFunction */ false)
        .then(toUILocations.bind(this));

    async function toUILocations(this: BreakpointManager, locations: SDK.DebuggerModel.BreakLocation[]):
        Promise<Workspace.UISourceCode.UILocation[]> {
      const sortedLocationsPromises =
          locations.map(location => this.debuggerWorkspaceBinding.rawLocationToUILocation(location));
      const nullableLocations = await Promise.all(sortedLocationsPromises);
      const sortedLocations =
          (nullableLocations.filter(location => location && location.uiSourceCode === uiSourceCode) as
           Workspace.UISourceCode.UILocation[]);
      if (!sortedLocations.length) {
        return [];
      }
      sortedLocations.sort(Workspace.UISourceCode.UILocation.comparator);
      let lastLocation: Workspace.UISourceCode.UILocation = sortedLocations[0];
      const result = [lastLocation];
      for (const location of sortedLocations) {
        if (location.id() !== lastLocation.id()) {
          result.push(location);
          lastLocation = location;
        }
      }
      return result;
    }
  }

  breakpointLocationsForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): BreakpointLocation[] {
    const breakpoints = this.#breakpointsForUISourceCode.get(uiSourceCode);
    return breakpoints ? Array.from(breakpoints.values()) : [];
  }

  allBreakpointLocations(): BreakpointLocation[] {
    const result = [];
    for (const breakpoints of this.#breakpointsForUISourceCode.values()) {
      result.push(...breakpoints.values());
    }
    return result;
  }

  removeBreakpoint(breakpoint: Breakpoint, removeFromStorage: boolean): void {
    if (removeFromStorage) {
      this.storage.removeBreakpoint(breakpoint);
    }
    this.#breakpointByStorageId.delete(breakpoint.breakpointStorageId());
  }

  uiLocationAdded(breakpoint: Breakpoint, uiLocation: Workspace.UISourceCode.UILocation): void {
    let breakpoints = this.#breakpointsForUISourceCode.get(uiLocation.uiSourceCode);
    if (!breakpoints) {
      breakpoints = new Map();
      this.#breakpointsForUISourceCode.set(uiLocation.uiSourceCode, breakpoints);
    }
    const breakpointLocation = {breakpoint: breakpoint, uiLocation: uiLocation};
    breakpoints.set(uiLocation.id(), breakpointLocation);
    this.dispatchEventToListeners(Events.BreakpointAdded, breakpointLocation);
  }

  uiLocationRemoved(breakpoint: Breakpoint, uiLocation: Workspace.UISourceCode.UILocation): void {
    const breakpoints = this.#breakpointsForUISourceCode.get(uiLocation.uiSourceCode);
    if (!breakpoints) {
      return;
    }
    const breakpointLocation = breakpoints.get(uiLocation.id()) || null;
    if (!breakpointLocation) {
      return;
    }
    breakpoints.delete(uiLocation.id());
    if (breakpoints.size === 0) {
      this.#breakpointsForUISourceCode.delete(uiLocation.uiSourceCode);
    }
    this.dispatchEventToListeners(Events.BreakpointRemoved, {breakpoint: breakpoint, uiLocation: uiLocation});
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  BreakpointAdded = 'breakpoint-added',
  BreakpointRemoved = 'breakpoint-removed',
}

export type EventTypes = {
  [Events.BreakpointAdded]: BreakpointLocation,
  [Events.BreakpointRemoved]: BreakpointLocation,
};

export class Breakpoint implements SDK.TargetManager.SDKModelObserver<SDK.DebuggerModel.DebuggerModel> {
  readonly breakpointManager: BreakpointManager;
  urlInternal: Platform.DevToolsPath.UrlString;
  readonly #lineNumberInternal: number;
  readonly #columnNumberInternal: number|undefined;
  readonly #uiLocations: Set<Workspace.UISourceCode.UILocation>;
  uiSourceCodes: Set<Workspace.UISourceCode.UISourceCode>;
  #conditionInternal!: string;
  #enabledInternal!: boolean;
  isRemoved!: boolean;
  currentState: Breakpoint.State|null;
  readonly #modelBreakpoints: Map<SDK.DebuggerModel.DebuggerModel, ModelBreakpoint>;

  constructor(
      breakpointManager: BreakpointManager, primaryUISourceCode: Workspace.UISourceCode.UISourceCode,
      url: Platform.DevToolsPath.UrlString, lineNumber: number, columnNumber: number|undefined, condition: string,
      enabled: boolean) {
    this.breakpointManager = breakpointManager;
    this.urlInternal = url;
    this.#lineNumberInternal = lineNumber;
    this.#columnNumberInternal = columnNumber;

    this.#uiLocations = new Set();   // Bound locations
    this.uiSourceCodes = new Set();  // All known UISourceCodes with this url

    this.currentState = null;

    this.#modelBreakpoints = new Map();
    this.updateState(condition, enabled);
    this.addUISourceCode(primaryUISourceCode);
    this.breakpointManager.targetManager.observeModels(SDK.DebuggerModel.DebuggerModel, this);
  }

  async refreshInDebugger(): Promise<void> {
    if (!this.isRemoved) {
      const breakpoints = Array.from(this.#modelBreakpoints.values());
      await Promise.all(breakpoints.map(breakpoint => breakpoint.refreshBreakpoint()));
    }
  }

  modelAdded(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    const debuggerWorkspaceBinding = this.breakpointManager.debuggerWorkspaceBinding;
    this.#modelBreakpoints.set(debuggerModel, new ModelBreakpoint(debuggerModel, this, debuggerWorkspaceBinding));
  }

  modelRemoved(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    const modelBreakpoint = this.#modelBreakpoints.get(debuggerModel);
    this.#modelBreakpoints.delete(debuggerModel);

    if (!modelBreakpoint) {
      return;
    }
    modelBreakpoint.cleanUpAfterDebuggerIsGone();
    modelBreakpoint.removeEventListeners();
  }

  modelBreakpoint(debuggerModel: SDK.DebuggerModel.DebuggerModel): ModelBreakpoint|undefined {
    return this.#modelBreakpoints.get(debuggerModel);
  }

  addUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (!this.uiSourceCodes.has(uiSourceCode)) {
      this.uiSourceCodes.add(uiSourceCode);
      if (!this.bound()) {
        this.breakpointManager.uiLocationAdded(this, this.defaultUILocation(uiSourceCode));
      }
    }
  }

  clearUISourceCodes(): void {
    if (!this.bound()) {
      this.removeAllUnboundLocations();
    }
    this.uiSourceCodes.clear();
  }

  removeUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (this.uiSourceCodes.has(uiSourceCode)) {
      this.uiSourceCodes.delete(uiSourceCode);
      if (!this.bound()) {
        this.breakpointManager.uiLocationRemoved(this, this.defaultUILocation(uiSourceCode));
      }
    }

    // Do we need to do this? Not sure if bound locations will leak...
    if (this.bound()) {
      for (const uiLocation of this.#uiLocations) {
        if (uiLocation.uiSourceCode === uiSourceCode) {
          this.#uiLocations.delete(uiLocation);
          this.breakpointManager.uiLocationRemoved(this, uiLocation);
        }
      }

      if (!this.bound() && !this.isRemoved) {
        // Switch to unbound locations
        this.addAllUnboundLocations();
      }
    }
  }

  url(): Platform.DevToolsPath.UrlString {
    return this.urlInternal;
  }

  lineNumber(): number {
    return this.#lineNumberInternal;
  }

  columnNumber(): number|undefined {
    return this.#columnNumberInternal;
  }

  uiLocationAdded(uiLocation: Workspace.UISourceCode.UILocation): void {
    if (this.isRemoved) {
      return;
    }
    if (!this.bound()) {
      // This is our first bound location; remove all unbound locations
      this.removeAllUnboundLocations();
    }
    this.#uiLocations.add(uiLocation);
    this.breakpointManager.uiLocationAdded(this, uiLocation);
  }

  uiLocationRemoved(uiLocation: Workspace.UISourceCode.UILocation): void {
    if (this.#uiLocations.has(uiLocation)) {
      this.#uiLocations.delete(uiLocation);
      this.breakpointManager.uiLocationRemoved(this, uiLocation);
      if (!this.bound() && !this.isRemoved) {
        this.addAllUnboundLocations();
      }
    }
  }

  enabled(): boolean {
    return this.#enabledInternal;
  }

  bound(): boolean {
    return this.#uiLocations.size !== 0;
  }

  hasBoundScript(): boolean {
    for (const uiSourceCode of this.uiSourceCodes) {
      if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network) {
        return true;
      }
    }
    return false;
  }

  setEnabled(enabled: boolean): void {
    this.updateState(this.#conditionInternal, enabled);
  }

  condition(): string {
    return this.#conditionInternal;
  }

  setCondition(condition: string): void {
    this.updateState(condition, this.#enabledInternal);
  }

  updateState(condition: string, enabled: boolean): void {
    if (this.#enabledInternal === enabled && this.#conditionInternal === condition) {
      return;
    }
    this.#enabledInternal = enabled;
    this.#conditionInternal = condition;
    this.breakpointManager.storage.updateBreakpoint(this);
    void this.updateBreakpoint();
  }

  async updateBreakpoint(): Promise<void> {
    if (!this.bound()) {
      this.removeAllUnboundLocations();
      if (!this.isRemoved) {
        this.addAllUnboundLocations();
      }
    }
    await Promise.all(
        Array.from(this.#modelBreakpoints.values()).map(modelBreakpoint => modelBreakpoint.scheduleUpdateInDebugger()));
  }

  async remove(keepInStorage: boolean): Promise<void> {
    this.isRemoved = true;
    const removeFromStorage = !keepInStorage;

    // Await removing for all targets.
    const updatePromises: Promise<void>[] = [];
    for (const modelBreakpoint of this.#modelBreakpoints.values()) {
      modelBreakpoint.removeEventListeners();
      updatePromises.push(modelBreakpoint.scheduleUpdateInDebugger());
    }
    await Promise.all(updatePromises);

    this.breakpointManager.removeBreakpoint(this, removeFromStorage);
    this.breakpointManager.targetManager.unobserveModels(SDK.DebuggerModel.DebuggerModel, this);
    this.clearUISourceCodes();
  }

  breakpointStorageId(): string {
    return BreakpointManager.breakpointStorageId(
        this.urlInternal, this.#lineNumberInternal, this.#columnNumberInternal);
  }

  private defaultUILocation(uiSourceCode: Workspace.UISourceCode.UISourceCode): Workspace.UISourceCode.UILocation {
    return uiSourceCode.uiLocation(this.#lineNumberInternal, this.#columnNumberInternal);
  }

  private removeAllUnboundLocations(): void {
    for (const uiSourceCode of this.uiSourceCodes) {
      this.breakpointManager.uiLocationRemoved(this, this.defaultUILocation(uiSourceCode));
    }
  }

  private addAllUnboundLocations(): void {
    for (const uiSourceCode of this.uiSourceCodes) {
      this.breakpointManager.uiLocationAdded(this, this.defaultUILocation(uiSourceCode));
    }
  }

  getUiSourceCodes(): Set<Workspace.UISourceCode.UISourceCode> {
    return this.uiSourceCodes;
  }

  getIsRemoved(): boolean {
    return this.isRemoved;
  }
}

export class ModelBreakpoint {
  #debuggerModel: SDK.DebuggerModel.DebuggerModel;
  #breakpoint: Breakpoint;
  readonly #debuggerWorkspaceBinding: DebuggerWorkspaceBinding;
  readonly #liveLocations: LiveLocationPool;
  readonly #uiLocations: Map<LiveLocation, Workspace.UISourceCode.UILocation>;
  #hasPendingUpdate: boolean;
  #updatePromise: Promise<void>|null;
  #cancelCallback: boolean;
  #currentState: Breakpoint.State|null;
  #breakpointIds: Protocol.Debugger.BreakpointId[];

  constructor(
      debuggerModel: SDK.DebuggerModel.DebuggerModel, breakpoint: Breakpoint,
      debuggerWorkspaceBinding: DebuggerWorkspaceBinding) {
    this.#debuggerModel = debuggerModel;
    this.#breakpoint = breakpoint;
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    this.#liveLocations = new LiveLocationPool();

    this.#uiLocations = new Map();
    this.#debuggerModel.addEventListener(
        SDK.DebuggerModel.Events.DebuggerWasDisabled, this.cleanUpAfterDebuggerIsGone, this);
    this.#debuggerModel.addEventListener(
        SDK.DebuggerModel.Events.DebuggerWasEnabled, this.scheduleUpdateInDebugger, this);
    this.#hasPendingUpdate = false;
    this.#updatePromise = null;
    this.#cancelCallback = false;
    this.#currentState = null;
    this.#breakpointIds = [];
    if (this.#debuggerModel.debuggerEnabled()) {
      void this.scheduleUpdateInDebugger();
    }
  }

  get currentState(): Breakpoint.State|null {
    return this.#currentState;
  }

  resetLocations(): void {
    for (const uiLocation of this.#uiLocations.values()) {
      this.#breakpoint.uiLocationRemoved(uiLocation);
    }

    this.#uiLocations.clear();
    this.#liveLocations.disposeAll();
  }

  scheduleUpdateInDebugger(): Promise<void> {
    this.#hasPendingUpdate = true;
    if (!this.#updatePromise) {
      this.#updatePromise = (async(): Promise<void> => {
        while (this.#hasPendingUpdate) {
          this.#hasPendingUpdate = false;
          await this.updateInDebugger();
        }
        this.#updatePromise = null;
      })();
    }
    return this.#updatePromise;
  }

  private scriptDiverged(): boolean {
    for (const uiSourceCode of this.#breakpoint.getUiSourceCodes()) {
      const scriptFile = this.#debuggerWorkspaceBinding.scriptFile(uiSourceCode, this.#debuggerModel);
      if (scriptFile && scriptFile.hasDivergedFromVM()) {
        return true;
      }
    }
    return false;
  }

  private async updateInDebugger(): Promise<void> {
    if (this.#debuggerModel.target().isDisposed()) {
      this.cleanUpAfterDebuggerIsGone();
      return;
    }

    const lineNumber = this.#breakpoint.lineNumber();
    const columnNumber = this.#breakpoint.columnNumber();
    const condition = this.#breakpoint.condition();

    let newState: Breakpoint.State|null = null;
    if (!this.#breakpoint.getIsRemoved() && this.#breakpoint.enabled() && !this.scriptDiverged()) {
      let debuggerLocations: SDK.DebuggerModel.Location[] = [];
      for (const uiSourceCode of this.#breakpoint.getUiSourceCodes()) {
        const locations =
            await DebuggerWorkspaceBinding.instance().uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber);
        debuggerLocations = locations.filter(location => location.debuggerModel === this.#debuggerModel);
        if (debuggerLocations.length) {
          break;
        }
      }
      if (debuggerLocations.length && debuggerLocations.every(loc => loc.script())) {
        const positions = debuggerLocations.map(loc => {
          const script = loc.script() as SDK.Script.Script;
          return {
            url: script.sourceURL,
            scriptId: script.scriptId,
            scriptHash: script.hash,
            lineNumber: loc.lineNumber,
            columnNumber: loc.columnNumber,
          };
        });
        newState = new Breakpoint.State(positions, condition);
      } else if (!Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS)) {
        // Use this fallback if we do not have instrumentation breakpoints enabled yet. This currently makes
        // sure that v8 knows about the breakpoint and is able to restore it whenever the script is parsed.
        if (this.#breakpoint.currentState) {
          newState = new Breakpoint.State(this.#breakpoint.currentState.positions, condition);
        } else {
          // TODO(bmeurer): This fallback doesn't make a whole lot of sense, we should
          // at least signal a warning to the developer that this #breakpoint wasn't
          // really resolved.
          const position = {
            url: this.#breakpoint.url(),
            scriptId: '' as Protocol.Runtime.ScriptId,
            scriptHash: '',
            lineNumber,
            columnNumber,
          };
          newState = new Breakpoint.State([position], condition);
        }
      }
    }

    if (this.#breakpointIds.length && Breakpoint.State.equals(newState, this.#currentState)) {
      return;
    }
    this.#breakpoint.currentState = newState;

    if (this.#breakpointIds.length) {
      await this.refreshBreakpoint();
      return;
    }

    if (!newState) {
      return;
    }

    const results = await Promise.all(newState.positions.map(pos => {
      if (pos.url) {
        return this.#debuggerModel.setBreakpointByURL(pos.url, pos.lineNumber, pos.columnNumber, condition);
      }
      return this.#debuggerModel.setBreakpointInAnonymousScript(
          pos.scriptId, pos.scriptHash as string, pos.lineNumber, pos.columnNumber, condition);
    }));
    const breakpointIds: Protocol.Debugger.BreakpointId[] = [];
    let locations: SDK.DebuggerModel.Location[] = [];
    let maybeRescheduleUpdate = false;
    for (const result of results) {
      if (result.breakpointId) {
        breakpointIds.push(result.breakpointId);
        locations = locations.concat(result.locations);
      } else if (this.#debuggerModel.debuggerEnabled() && !this.#debuggerModel.isReadyToPause()) {
        maybeRescheduleUpdate = true;
      }
    }

    if (!breakpointIds.length && maybeRescheduleUpdate) {
      // TODO(crbug.com/1229541): This is a quickfix to prevent #breakpoints from
      // disappearing if the Debugger is actually not enabled
      // yet. This quickfix should be removed as soon as we have a solution
      // to correctly synchronize the front-end with the inspector back-end.
      void this.scheduleUpdateInDebugger();
      return;
    }

    this.#currentState = newState;
    if (this.#cancelCallback) {
      this.#cancelCallback = false;
      return;
    }

    if (!breakpointIds.length) {
      // Do not await the remove, as we otherwise will create a circular
      // dependency. Removing breakpoints will call `scheduleUpdateInDebugger` again.
      // Calling it again would cause it to await this current run of `scheduleInDebugger`, which
      // will then deadlock.
      void this.#breakpoint.remove(true);
      return;
    }

    this.#breakpointIds = breakpointIds;
    this.#breakpointIds.forEach(
        breakpointId => this.#debuggerModel.addBreakpointListener(breakpointId, this.breakpointResolved, this));
    await Promise.all(locations.map(location => this.addResolvedLocation(location)));
  }

  async refreshBreakpoint(): Promise<void> {
    if (!this.#breakpointIds.length) {
      return;
    }
    this.resetLocations();
    await Promise.all(this.#breakpointIds.map(id => this.#debuggerModel.removeBreakpoint(id)));
    this.didRemoveFromDebugger();
    this.#currentState = null;
    void this.scheduleUpdateInDebugger();
  }

  private didRemoveFromDebugger(): void {
    if (this.#cancelCallback) {
      this.#cancelCallback = false;
      return;
    }

    this.resetLocations();
    this.#breakpointIds.forEach(
        breakpointId => this.#debuggerModel.removeBreakpointListener(breakpointId, this.breakpointResolved, this));
    this.#breakpointIds = [];
  }

  private async breakpointResolved({data: location}: Common.EventTarget.EventTargetEvent<SDK.DebuggerModel.Location>):
      Promise<void> {
    await this.addResolvedLocation(location);
  }

  private async locationUpdated(liveLocation: LiveLocation): Promise<void> {
    const oldUILocation = this.#uiLocations.get(liveLocation);
    const uiLocation = await liveLocation.uiLocation();

    if (oldUILocation) {
      this.#breakpoint.uiLocationRemoved(oldUILocation);
    }

    if (uiLocation) {
      this.#uiLocations.set(liveLocation, uiLocation);
      this.#breakpoint.uiLocationAdded(uiLocation);
    } else {
      this.#uiLocations.delete(liveLocation);
    }
  }

  private async addResolvedLocation(location: SDK.DebuggerModel.Location): Promise<void> {
    const uiLocation = await this.#debuggerWorkspaceBinding.rawLocationToUILocation(location);
    if (!uiLocation) {
      return;
    }
    const breakpointLocation = this.#breakpoint.breakpointManager.findBreakpoint(uiLocation);
    if (breakpointLocation && breakpointLocation.breakpoint !== this.#breakpoint) {
      // location clash
      await this.#breakpoint.remove(false /* keepInStorage */);
      return;
    }
    await this.#debuggerWorkspaceBinding.createLiveLocation(
        location, this.locationUpdated.bind(this), this.#liveLocations);
  }

  cleanUpAfterDebuggerIsGone(): void {
    if (this.#updatePromise) {
      this.#cancelCallback = true;
    }
    this.#hasPendingUpdate = false;
    this.resetLocations();
    this.#currentState = null;
    if (this.#breakpointIds.length) {
      this.didRemoveFromDebugger();
    }
  }

  removeEventListeners(): void {
    this.#debuggerModel.removeEventListener(
        SDK.DebuggerModel.Events.DebuggerWasDisabled, this.cleanUpAfterDebuggerIsGone, this);
    this.#debuggerModel.removeEventListener(
        SDK.DebuggerModel.Events.DebuggerWasEnabled, this.scheduleUpdateInDebugger, this);
  }
}

interface Position {
  url: Platform.DevToolsPath.UrlString;
  scriptId: Protocol.Runtime.ScriptId;
  scriptHash: string;
  lineNumber: number;
  columnNumber?: number;
}

export namespace Breakpoint {
  export class State {
    positions: Position[];
    condition: string;

    constructor(positions: Position[], condition: string) {
      this.positions = positions;
      this.condition = condition;
    }

    static equals(stateA?: State|null, stateB?: State|null): boolean {
      if (!stateA || !stateB) {
        return false;
      }
      if (stateA.condition !== stateB.condition) {
        return false;
      }
      if (stateA.positions.length !== stateB.positions.length) {
        return false;
      }
      for (let i = 0; i < stateA.positions.length; i++) {
        const positionA = stateA.positions[i];
        const positionB = stateB.positions[i];
        if (positionA.url !== positionB.url) {
          return false;
        }
        if (positionA.scriptId !== positionB.scriptId) {
          return false;
        }
        if (positionA.scriptHash !== positionB.scriptHash) {
          return false;
        }
        if (positionA.lineNumber !== positionB.lineNumber) {
          return false;
        }
        if (positionA.columnNumber !== positionB.columnNumber) {
          return false;
        }
      }
      return true;
    }
  }
}

class Storage {
  readonly #setting: Common.Settings.Setting<Storage.Item[]>;
  readonly #breakpoints: Map<string, Storage.Item>;
  #muted!: boolean|undefined;

  constructor() {
    this.#setting = Common.Settings.Settings.instance().createLocalSetting('breakpoints', []);
    this.#breakpoints = new Map();
    const items = (this.#setting.get() as Storage.Item[]);
    for (const item of items) {
      this.#breakpoints.set(BreakpointManager.breakpointStorageId(item.url, item.lineNumber, item.columnNumber), item);
    }
  }

  get setting(): Common.Settings.Setting<Storage.Item[]> {
    return this.#setting;
  }

  mute(): void {
    this.#muted = true;
  }

  unmute(): void {
    this.#muted = undefined;
  }

  breakpointItems(url: Platform.DevToolsPath.UrlString): Storage.Item[] {
    return Array.from(this.#breakpoints.values()).filter(item => item.url === url);
  }

  updateBreakpoint(breakpoint: Breakpoint): void {
    if (this.#muted || !breakpoint.breakpointStorageId()) {
      return;
    }
    this.#breakpoints.set(breakpoint.breakpointStorageId(), new Storage.Item(breakpoint));
    this.save();
  }

  removeBreakpoint(breakpoint: Breakpoint): void {
    if (!this.#muted) {
      this.#breakpoints.delete(breakpoint.breakpointStorageId());
      this.save();
    }
  }

  private save(): void {
    this.#setting.set(Array.from(this.#breakpoints.values()));
  }
}

namespace Storage {
  export class Item {
    url: Platform.DevToolsPath.UrlString;
    lineNumber: number;
    columnNumber?: number;
    condition: string;
    enabled: boolean;

    constructor(breakpoint: Breakpoint) {
      this.url = breakpoint.url();
      this.lineNumber = breakpoint.lineNumber();
      this.columnNumber = breakpoint.columnNumber();
      this.condition = breakpoint.condition();
      this.enabled = breakpoint.enabled();
    }
  }
}

export interface BreakpointLocation {
  breakpoint: Breakpoint;
  uiLocation: Workspace.UISourceCode.UILocation;
}
