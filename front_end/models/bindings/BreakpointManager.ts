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
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';

import type * as Protocol from '../../generated/protocol.js';
import type * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import {DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';

import {LiveLocationPool, type LiveLocation} from './LiveLocation.js';
import {DefaultScriptMapping} from './DefaultScriptMapping.js';
import {assertNotNullOrUndefined} from '../../core/platform/platform.js';

let breakpointManagerInstance: BreakpointManager;

export class BreakpointManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    SDK.TargetManager.SDKModelObserver<SDK.DebuggerModel.DebuggerModel> {
  readonly storage: Storage;
  readonly #workspace: Workspace.Workspace.WorkspaceImpl;
  readonly targetManager: SDK.TargetManager.TargetManager;
  readonly debuggerWorkspaceBinding: DebuggerWorkspaceBinding;
  // For each source code, we remember the list or breakpoints that refer to that UI source code as
  // their home UI source code. This is necessary to correctly remove the UI source code from
  // breakpoints upon receiving the UISourceCodeRemoved event.
  readonly #breakpointsForHomeUISourceCode: Map<Workspace.UISourceCode.UISourceCode, Set<Breakpoint>>;
  // Mapping of UI source codes to all the current breakpoint UI locations. For bound breakpoints,
  // this is all the locations where the breakpoints was bound. For the unbound breakpoints,
  // this is the default locations in the home UI source codes.
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
    this.#breakpointsForHomeUISourceCode = new Map();
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
      await this.setBreakpoint(
          toSourceCode, item.lineNumber, item.columnNumber, item.condition, item.enabled, BreakpointOrigin.OTHER);
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

    const uiSourceCode = await this.getUISourceCodeWithUpdatedBreakpointInfo(script);
    if (this.#hasBreakpointsForUrl(script.sourceURL)) {
      await this.#restoreBreakpointsForUrl(uiSourceCode);
    }

    const debuggerModel = script.debuggerModel;
    // Handle source maps and the original sources.
    const sourceMap = await debuggerModel.sourceMapManager().sourceMapForClientPromise(script);
    if (sourceMap) {
      for (const sourceURL of sourceMap.sourceURLs()) {
        if (this.#hasBreakpointsForUrl(sourceURL)) {
          const uiSourceCode = await this.debuggerWorkspaceBinding.uiSourceCodeForSourceMapSourceURLPromise(
              debuggerModel, sourceURL, script.isContentScript());
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
                await this.debuggerWorkspaceBinding.uiSourceCodeForDebuggerLanguagePluginSourceURLPromise(
                    debuggerModel, sourceURL);
            assertNotNullOrUndefined(uiSourceCode);
            await this.#restoreBreakpointsForUrl(uiSourceCode);
          }
        }
      }
    }
  }

  async getUISourceCodeWithUpdatedBreakpointInfo(script: SDK.Script.Script):
      Promise<Workspace.UISourceCode.UISourceCode> {
    const uiSourceCode = this.debuggerWorkspaceBinding.uiSourceCodeForScript(script);
    assertNotNullOrUndefined(uiSourceCode);
    await this.#updateBindings(uiSourceCode);
    return uiSourceCode;
  }

  async #updateBindings(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
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

  static getScriptForInlineUiSourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): SDK.Script.Script|null {
    const script = DefaultScriptMapping.scriptForUISourceCode(uiSourceCode);
    if (script && script.isInlineScript() && !script.hasSourceURL) {
      return script;
    }
    return null;
  }

  // For inline scripts, this function translates the line-column coordinates into the coordinates
  // of the ebedding document. For other scripts, it just returns unchanged line-column.
  static breakpointLocationFromUiLocation(uiLocation: Workspace.UISourceCode.UILocation):
      {lineNumber: number, columnNumber: number|undefined} {
    const uiSourceCode = uiLocation.uiSourceCode;
    const script = BreakpointManager.getScriptForInlineUiSourceCode(uiSourceCode);
    const {lineNumber, columnNumber} = script ? script.relativeLocationToRawLocation(uiLocation) : uiLocation;
    return {lineNumber, columnNumber};
  }

  // For inline scripts, this function translates the line-column coordinates of the embedding
  // document into the coordinates of the script. Other UI source code coordinated are not
  // affected.
  static uiLocationFromBreakpointLocation(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, lineNumber: number,
      columnNumber: number|undefined): Workspace.UISourceCode.UILocation {
    const script = BreakpointManager.getScriptForInlineUiSourceCode(uiSourceCode);
    if (script) {
      ({lineNumber, columnNumber} = script.rawLocationToRelativeLocation({lineNumber, columnNumber}));
    }
    return uiSourceCode.uiLocation(lineNumber, columnNumber);
  }

  // Returns true for if the given (raw) position is within the script or if the script
  // is null. This is used to filter breakpoints if a script is known.
  static isValidPositionInScript(lineNumber: number, columnNumber: number|undefined, script: SDK.Script.Script|null):
      boolean {
    if (!script) {
      return true;
    }
    if (lineNumber < script.lineOffset || lineNumber > script.endLine) {
      return false;
    }
    if (lineNumber === script.lineOffset && columnNumber && columnNumber < script.columnOffset) {
      return false;
    }
    if (lineNumber === script.endLine && (!columnNumber || columnNumber >= script.endColumn)) {
      return false;
    }
    return true;
  }

  private restoreBreakpoints(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const script = BreakpointManager.getScriptForInlineUiSourceCode(uiSourceCode);
    const url = script?.sourceURL ?? uiSourceCode.url();
    if (!url) {
      return;
    }

    this.storage.mute();
    const breakpointItems = this.storage.breakpointItems(url);
    for (const item of breakpointItems) {
      const lineNumber = item.lineNumber;
      const columnNumber = item.columnNumber;
      if (!BreakpointManager.isValidPositionInScript(lineNumber, columnNumber, script)) {
        continue;
      }
      this.innerSetBreakpoint(
          uiSourceCode, lineNumber, columnNumber, item.condition, item.enabled, BreakpointOrigin.OTHER);
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
    const breakpoints = this.#getAllBreakpointsForUISourceCode(uiSourceCode);
    breakpoints.forEach(bp => bp.removeUISourceCode(uiSourceCode));
  }

  async setBreakpoint(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, lineNumber: number, columnNumber: number|undefined,
      condition: string, enabled: boolean, origin: BreakpointOrigin): Promise<Breakpoint> {
    let uiLocation: Workspace.UISourceCode.UILocation =
        new Workspace.UISourceCode.UILocation(uiSourceCode, lineNumber, columnNumber);
    const normalizedLocation = await this.debuggerWorkspaceBinding.normalizeUILocation(uiLocation);
    if (normalizedLocation.id() !== uiLocation.id()) {
      void Common.Revealer.reveal(normalizedLocation);
      uiLocation = normalizedLocation;
    }
    const breakpointLocation = BreakpointManager.breakpointLocationFromUiLocation(uiLocation);
    return this.innerSetBreakpoint(
        uiLocation.uiSourceCode, breakpointLocation.lineNumber, breakpointLocation.columnNumber, condition, enabled,
        origin);
  }

  private innerSetBreakpoint(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, lineNumber: number, columnNumber: number|undefined,
      condition: string, enabled: boolean, origin: BreakpointOrigin): Breakpoint {
    const url = BreakpointManager.getScriptForInlineUiSourceCode(uiSourceCode)?.sourceURL ?? uiSourceCode.url();
    const itemId = BreakpointManager.breakpointStorageId(url, lineNumber, columnNumber);
    let breakpoint = this.#breakpointByStorageId.get(itemId);
    if (breakpoint) {
      breakpoint.updateState({...breakpoint.storageState, condition, enabled});
      breakpoint.addUISourceCode(uiSourceCode);
      void breakpoint.updateBreakpoint();
      return breakpoint;
    }
    breakpoint = new Breakpoint(this, uiSourceCode, url, lineNumber, columnNumber, condition, enabled, origin);
    this.#breakpointByStorageId.set(itemId, breakpoint);
    return breakpoint;
  }

  findBreakpoint(uiLocation: Workspace.UISourceCode.UILocation): BreakpointLocation|null {
    const breakpoints = this.#breakpointsForUISourceCode.get(uiLocation.uiSourceCode);
    return breakpoints ? (breakpoints.get(uiLocation.id())) || null : null;
  }

  addHomeUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode, breakpoint: Breakpoint): void {
    let breakpoints = this.#breakpointsForHomeUISourceCode.get(uiSourceCode);
    if (!breakpoints) {
      breakpoints = new Set();
      this.#breakpointsForHomeUISourceCode.set(uiSourceCode, breakpoints);
    }
    breakpoints.add(breakpoint);
  }

  removeHomeUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode, breakpoint: Breakpoint): void {
    const breakpoints = this.#breakpointsForHomeUISourceCode.get(uiSourceCode);
    if (!breakpoints) {
      return;
    }
    breakpoints.delete(breakpoint);
    if (breakpoints.size === 0) {
      this.#breakpointsForHomeUISourceCode.delete(uiSourceCode);
    }
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
    const startLocationsPromise = this.debuggerWorkspaceBinding.uiLocationToRawLocations(
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

  #getAllBreakpointsForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): Breakpoint[] {
    const uiBreakpoints = this.breakpointLocationsForUISourceCode(uiSourceCode).map(b => b.breakpoint);
    return uiBreakpoints.concat(Array.from(this.#breakpointsForHomeUISourceCode.get(uiSourceCode) ?? []));
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
    const breakpointLocation = new BreakpointLocation(breakpoint, uiLocation);
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
    this.dispatchEventToListeners(Events.BreakpointRemoved, breakpointLocation);
  }

  supportsConditionalBreakpoints(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return this.debuggerWorkspaceBinding.supportsConditionalBreakpoints(uiSourceCode);
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

export const enum DebuggerUpdateResult {
  OK = 'OK',
  ERROR_BREAKPOINT_CLASH = 'ERROR_BREAKPOINT_CLASH',
  ERROR_BACKEND = 'ERROR_BACKEND',

  // PENDING implies that the current update requires another re-run.
  PENDING = 'PENDING',
}

export type ScheduleUpdateResult =
    DebuggerUpdateResult.OK|DebuggerUpdateResult.ERROR_BACKEND|DebuggerUpdateResult.ERROR_BREAKPOINT_CLASH;

const enum ResolveLocationResult {
  OK = 'OK',
  ERROR = 'ERROR',
}

export class Breakpoint implements SDK.TargetManager.SDKModelObserver<SDK.DebuggerModel.DebuggerModel> {
  readonly breakpointManager: BreakpointManager;
  readonly #uiLocations: Set<Workspace.UISourceCode.UILocation>;
  uiSourceCodes: Set<Workspace.UISourceCode.UISourceCode>;
  #storageState!: BreakpointStorageState;
  #origin: BreakpointOrigin;
  isRemoved = false;
  currentState: Breakpoint.State|null;
  readonly #modelBreakpoints: Map<SDK.DebuggerModel.DebuggerModel, ModelBreakpoint>;

  constructor(
      breakpointManager: BreakpointManager, primaryUISourceCode: Workspace.UISourceCode.UISourceCode,
      url: Platform.DevToolsPath.UrlString, lineNumber: number, columnNumber: number|undefined, condition: string,
      enabled: boolean, origin: BreakpointOrigin) {
    this.breakpointManager = breakpointManager;
    this.#origin = origin;

    this.#uiLocations = new Set();   // Bound locations
    this.uiSourceCodes = new Set();  // All known UISourceCodes with this url. This also includes uiSourceCodes
                                     // for the inline scripts embedded in a resource with this URL.

    this.currentState = null;

    this.#modelBreakpoints = new Map();
    this.updateState({url, lineNumber, columnNumber, condition, enabled});
    this.addUISourceCode(primaryUISourceCode);
    this.breakpointManager.targetManager.observeModels(SDK.DebuggerModel.DebuggerModel, this);
  }

  get origin(): BreakpointOrigin {
    return this.#origin;
  }

  async refreshInDebugger(): Promise<void> {
    if (!this.isRemoved) {
      const modelBreakpoints = Array.from(this.#modelBreakpoints.values());
      await Promise.all(modelBreakpoints.map(async modelBreakpoint => {
        await modelBreakpoint.resetBreakpoint();
        return this.#updateModel(modelBreakpoint);
      }));
    }
  }

  modelAdded(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    const debuggerWorkspaceBinding = this.breakpointManager.debuggerWorkspaceBinding;
    const modelBreakpoint = new ModelBreakpoint(debuggerModel, this, debuggerWorkspaceBinding);
    this.#modelBreakpoints.set(debuggerModel, modelBreakpoint);
    void this.#updateModel(modelBreakpoint);

    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerWasEnabled, this.#onDebuggerEnabled, this);
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerWasDisabled, this.#onDebuggerDisabled, this);
  }

  modelRemoved(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    const modelBreakpoint = this.#modelBreakpoints.get(debuggerModel);
    modelBreakpoint?.cleanUpAfterDebuggerIsGone();
    this.#modelBreakpoints.delete(debuggerModel);

    this.#removeDebuggerModelListeners(debuggerModel);
  }

  #removeDebuggerModelListeners(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.DebuggerWasEnabled, this.#onDebuggerEnabled, this);
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.DebuggerWasDisabled, this.#onDebuggerDisabled, this);
  }

  #onDebuggerEnabled(event: Common.EventTarget.EventTargetEvent<SDK.DebuggerModel.DebuggerModel>): void {
    const debuggerModel = event.data;
    const model = this.#modelBreakpoints.get(debuggerModel);
    if (model) {
      void this.#updateModel(model);
    }
  }

  #onDebuggerDisabled(event: Common.EventTarget.EventTargetEvent<SDK.DebuggerModel.DebuggerModel>): void {
    const debuggerModel = event.data;
    const model = this.#modelBreakpoints.get(debuggerModel);
    model?.cleanUpAfterDebuggerIsGone();
  }

  modelBreakpoint(debuggerModel: SDK.DebuggerModel.DebuggerModel): ModelBreakpoint|undefined {
    return this.#modelBreakpoints.get(debuggerModel);
  }

  addUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (!this.uiSourceCodes.has(uiSourceCode)) {
      this.uiSourceCodes.add(uiSourceCode);
      this.breakpointManager.addHomeUISourceCode(uiSourceCode, this);
      if (!this.bound()) {
        this.breakpointManager.uiLocationAdded(this, this.defaultUILocation(uiSourceCode));
      }
    }
  }

  clearUISourceCodes(): void {
    if (!this.bound()) {
      this.removeAllUnboundLocations();
    }
    for (const uiSourceCode of this.uiSourceCodes) {
      this.removeUISourceCode(uiSourceCode);
    }
  }

  removeUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (this.uiSourceCodes.has(uiSourceCode)) {
      this.uiSourceCodes.delete(uiSourceCode);
      this.breakpointManager.removeHomeUISourceCode(uiSourceCode, this);
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
    return this.#storageState.url;
  }

  lineNumber(): number {
    return this.#storageState.lineNumber;
  }

  columnNumber(): number|undefined {
    return this.#storageState.columnNumber;
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
    return this.#storageState.enabled;
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
    this.updateState({...this.#storageState, enabled});
  }

  condition(): string {
    return this.#storageState.condition;
  }

  setCondition(condition: string): void {
    this.updateState({...this.#storageState, condition});
  }

  get storageState(): BreakpointStorageState {
    return this.#storageState;
  }

  updateState(newState: BreakpointStorageState): void {
    // Only 'enabled' and 'condition' can change (except during initialization).
    Platform.DCHECK(
        () => !this.#storageState ||
            (this.#storageState.url === newState.url && this.#storageState.lineNumber === newState.lineNumber &&
             this.#storageState.columnNumber === newState.columnNumber));
    if (this.#storageState?.enabled === newState.enabled && this.#storageState?.condition === newState.condition) {
      return;
    }
    this.#storageState = newState;
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
    return this.#updateModels();
  }

  async remove(keepInStorage: boolean): Promise<void> {
    if (this.getIsRemoved()) {
      return;
    }
    this.isRemoved = true;
    const removeFromStorage = !keepInStorage;

    for (const debuggerModel of this.#modelBreakpoints.keys()) {
      this.#removeDebuggerModelListeners(debuggerModel);
    }
    await this.#updateModels();

    this.breakpointManager.removeBreakpoint(this, removeFromStorage);
    this.breakpointManager.targetManager.unobserveModels(SDK.DebuggerModel.DebuggerModel, this);
    this.clearUISourceCodes();
  }

  breakpointStorageId(): string {
    return BreakpointManager.breakpointStorageId(
        this.#storageState.url, this.#storageState.lineNumber, this.#storageState.columnNumber);
  }

  private defaultUILocation(uiSourceCode: Workspace.UISourceCode.UISourceCode): Workspace.UISourceCode.UILocation {
    return BreakpointManager.uiLocationFromBreakpointLocation(
        uiSourceCode, this.#storageState.lineNumber, this.#storageState.columnNumber);
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

  async #updateModels(): Promise<void> {
    await Promise.all(Array.from(this.#modelBreakpoints.values()).map(model => this.#updateModel(model)));
  }

  async #updateModel(model: ModelBreakpoint): Promise<void> {
    const result = await model.scheduleUpdateInDebugger();
    if (result === DebuggerUpdateResult.ERROR_BACKEND) {
      await this.remove(true /* keepInStorage */);
    } else if (result === DebuggerUpdateResult.ERROR_BREAKPOINT_CLASH) {
      await this.remove(false /* keepInStorage */);
    }
  }
}

export class ModelBreakpoint {
  #debuggerModel: SDK.DebuggerModel.DebuggerModel;
  #breakpoint: Breakpoint;
  readonly #debuggerWorkspaceBinding: DebuggerWorkspaceBinding;
  readonly #liveLocations: LiveLocationPool;
  readonly #uiLocations: Map<LiveLocation, Workspace.UISourceCode.UILocation>;
  #updateMutex = new Common.Mutex.Mutex();
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
    this.#cancelCallback = false;
    this.#currentState = null;
    this.#breakpointIds = [];
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

  async scheduleUpdateInDebugger(): Promise<ScheduleUpdateResult> {
    if (!this.#debuggerModel.debuggerEnabled()) {
      return DebuggerUpdateResult.OK;
    }

    const release = await this.#updateMutex.acquire();
    let result = DebuggerUpdateResult.PENDING;
    while (result === DebuggerUpdateResult.PENDING) {
      result = await this.#updateInDebugger();
    }
    release();
    return result;
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

  async #updateInDebugger(): Promise<DebuggerUpdateResult> {
    if (this.#debuggerModel.target().isDisposed()) {
      this.cleanUpAfterDebuggerIsGone();
      return DebuggerUpdateResult.OK;
    }
    const lineNumber = this.#breakpoint.lineNumber();
    const columnNumber = this.#breakpoint.columnNumber();
    const condition = this.#breakpoint.condition();

    // Calculate the new state.
    let newState: Breakpoint.State|null = null;
    if (!this.#breakpoint.getIsRemoved() && this.#breakpoint.enabled() && !this.scriptDiverged()) {
      let debuggerLocations: SDK.DebuggerModel.Location[] = [];
      for (const uiSourceCode of this.#breakpoint.getUiSourceCodes()) {
        const {lineNumber: uiLineNumber, columnNumber: uiColumnNumber} =
            BreakpointManager.uiLocationFromBreakpointLocation(uiSourceCode, lineNumber, columnNumber);
        const locations = await DebuggerWorkspaceBinding.instance().uiLocationToRawLocations(
            uiSourceCode, uiLineNumber, uiColumnNumber);
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
            scriptHash: '',
            lineNumber,
            columnNumber,
          };
          newState = new Breakpoint.State([position], condition);
        }
      }
    }
    const hasBackendState = this.#breakpointIds.length;

    // Case 1: State hasn't changed, and back-end is up to date and has information
    // on some breakpoints.
    if (hasBackendState && Breakpoint.State.equals(newState, this.#currentState)) {
      return DebuggerUpdateResult.OK;
    }

    this.#breakpoint.currentState = newState;

    // Case 2: State has changed, and the back-end has outdated information on old
    // breakpoints.
    if (hasBackendState) {
      // Reset the current state.
      await this.resetBreakpoint();
      // Schedule another run of updates, to finally update to the new state.
      return DebuggerUpdateResult.PENDING;
    }

    // Case 3: State is null (no breakpoints to set), and back-end is up to date
    // (no info on breakpoints).
    if (!newState) {
      return DebuggerUpdateResult.OK;
    }

    // Case 4: State is not null, so we have breakpoints to set and the back-end
    // has no information on breakpoints yet. Set the breakpoints.
    const {breakpointIds, locations, serverError} = await this.#setBreakpointOnBackend(newState);

    const maybeRescheduleUpdate =
        serverError && this.#debuggerModel.debuggerEnabled() && !this.#debuggerModel.isReadyToPause();
    if (!breakpointIds.length && maybeRescheduleUpdate) {
      // TODO(crbug.com/1229541): This is a quickfix to prevent #breakpoints from
      // disappearing if the Debugger is actually not enabled
      // yet. This quickfix should be removed as soon as we have a solution
      // to correctly synchronize the front-end with the inspector back-end.
      return DebuggerUpdateResult.PENDING;
    }

    this.#currentState = newState;
    if (this.#cancelCallback) {
      this.#cancelCallback = false;
      return DebuggerUpdateResult.OK;
    }

    // Something went wrong: we expect to have a non-null state, but have not received any
    // breakpointIds from the back-end.
    if (!breakpointIds.length) {
      return DebuggerUpdateResult.ERROR_BACKEND;
    }

    this.#breakpointIds = breakpointIds;
    this.#breakpointIds.forEach(
        breakpointId => this.#debuggerModel.addBreakpointListener(breakpointId, this.breakpointResolved, this));
    const resolvedResults = await Promise.all(locations.map(location => this.addResolvedLocation(location)));

    // Breakpoint clash: the resolved location resolves to a different breakpoint, report an error.
    if (resolvedResults.includes(ResolveLocationResult.ERROR)) {
      return DebuggerUpdateResult.ERROR_BREAKPOINT_CLASH;
    }
    return DebuggerUpdateResult.OK;
  }

  async #setBreakpointOnBackend(newState: Breakpoint.State): Promise<{
    breakpointIds: Protocol.Debugger.BreakpointId[],
    locations: SDK.DebuggerModel.Location[],
    serverError: boolean,
  }> {
    const condition = this.#breakpoint.condition();
    const results = await Promise.all(newState.positions.map(pos => {
      if (pos.url) {
        return this.#debuggerModel.setBreakpointByURL(pos.url, pos.lineNumber, pos.columnNumber, condition);
      }
      return this.#debuggerModel.setBreakpointInAnonymousScript(
          pos.scriptHash as string, pos.lineNumber, pos.columnNumber, condition);
    }));
    const breakpointIds: Protocol.Debugger.BreakpointId[] = [];
    let locations: SDK.DebuggerModel.Location[] = [];
    let serverError = false;
    for (const result of results) {
      if (result.breakpointId) {
        breakpointIds.push(result.breakpointId);
        locations = locations.concat(result.locations);
      } else {
        serverError = true;
      }
    }
    return {breakpointIds, locations, serverError};
  }

  async resetBreakpoint(): Promise<void> {
    if (!this.#breakpointIds.length) {
      return;
    }
    this.resetLocations();
    await Promise.all(this.#breakpointIds.map(id => this.#debuggerModel.removeBreakpoint(id)));
    this.didRemoveFromDebugger();
    this.#currentState = null;
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
    const result = await this.addResolvedLocation(location);
    if (result === ResolveLocationResult.ERROR) {
      await this.#breakpoint.remove(false /* keepInStorage */);
    }
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

  private async addResolvedLocation(location: SDK.DebuggerModel.Location): Promise<ResolveLocationResult> {
    const uiLocation = await this.#debuggerWorkspaceBinding.rawLocationToUILocation(location);
    if (!uiLocation) {
      return ResolveLocationResult.OK;
    }
    const breakpointLocation = this.#breakpoint.breakpointManager.findBreakpoint(uiLocation);
    if (breakpointLocation && breakpointLocation.breakpoint !== this.#breakpoint) {
      // location clash
      return ResolveLocationResult.ERROR;
    }
    await this.#debuggerWorkspaceBinding.createLiveLocation(
        location, this.locationUpdated.bind(this), this.#liveLocations);
    return ResolveLocationResult.OK;
  }

  cleanUpAfterDebuggerIsGone(): void {
    this.#cancelCallback = true;
    this.resetLocations();
    this.#currentState = null;
    if (this.#breakpointIds.length) {
      this.didRemoveFromDebugger();
    }
  }
}

interface Position {
  url: Platform.DevToolsPath.UrlString;
  scriptHash: string;
  lineNumber: number;
  columnNumber?: number;
}

export const enum BreakpointOrigin {
  USER_ACTION = 'USER_ACTION',
  OTHER = 'RESTORED',
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
  readonly #setting: Common.Settings.Setting<BreakpointStorageState[]>;
  readonly #breakpoints: Map<string, BreakpointStorageState>;
  #muted!: boolean|undefined;

  constructor() {
    this.#setting = Common.Settings.Settings.instance().createLocalSetting('breakpoints', []);
    this.#breakpoints = new Map();
    for (const item of this.#setting.get()) {
      this.#breakpoints.set(BreakpointManager.breakpointStorageId(item.url, item.lineNumber, item.columnNumber), item);
    }
  }

  get setting(): Common.Settings.Setting<BreakpointStorageState[]> {
    return this.#setting;
  }

  mute(): void {
    this.#muted = true;
  }

  unmute(): void {
    this.#muted = undefined;
  }

  breakpointItems(url: Platform.DevToolsPath.UrlString): BreakpointStorageState[] {
    return Array.from(this.#breakpoints.values()).filter(item => item.url === url);
  }

  updateBreakpoint(breakpoint: Breakpoint): void {
    if (this.#muted || !breakpoint.breakpointStorageId()) {
      return;
    }
    this.#breakpoints.set(breakpoint.breakpointStorageId(), breakpoint.storageState);
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

/**
 * All the data for a single `Breakpoint` thats stored in the settings.
 * Whenever any of these change, we need to update the settings.
 */
interface BreakpointStorageState {
  readonly url: Platform.DevToolsPath.UrlString;
  readonly lineNumber: number;
  readonly columnNumber?: number;
  readonly condition: string;
  readonly enabled: boolean;
}

export class BreakpointLocation {
  readonly breakpoint: Breakpoint;
  readonly uiLocation: Workspace.UISourceCode.UILocation;

  constructor(breakpoint: Breakpoint, uiLocation: Workspace.UISourceCode.UILocation) {
    this.breakpoint = breakpoint;
    this.uiLocation = uiLocation;
  }
}
