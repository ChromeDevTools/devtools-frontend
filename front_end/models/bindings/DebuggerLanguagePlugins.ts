// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type Chrome} from '../../../extension-api/ExtensionAPI.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import {ContentProviderBasedProject} from './ContentProviderBasedProject.js';
import {type DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';
import {NetworkProject} from './NetworkProject.js';

const UIStrings = {
  /**
   *@description Error message that is displayed in the Console when language #plugins report errors
   *@example {File not found} PH1
   */
  errorInDebuggerLanguagePlugin: 'Error in debugger language plugin: {PH1}',
  /**
   *@description Status message that is shown in the Console when debugging information is being
   *loaded. The 2nd and 3rd placeholders are URLs.
   *@example {C/C++ DevTools Support (DWARF)} PH1
   *@example {http://web.dev/file.wasm} PH2
   *@example {http://web.dev/file.wasm.debug.wasm} PH3
   */
  loadingDebugSymbolsForVia: '[{PH1}] Loading debug symbols for {PH2} (via {PH3})...',
  /**
   *@description Status message that is shown in the Console when debugging information is being loaded
   *@example {C/C++ DevTools Support (DWARF)} PH1
   *@example {http://web.dev/file.wasm} PH2
   */
  loadingDebugSymbolsFor: '[{PH1}] Loading debug symbols for {PH2}...',
  /**
   *@description Warning message that is displayed in the Console when debugging information was loaded, but no source files were found
   *@example {C/C++ DevTools Support (DWARF)} PH1
   *@example {http://web.dev/file.wasm} PH2
   */
  loadedDebugSymbolsForButDidnt: '[{PH1}] Loaded debug symbols for {PH2}, but didn\'t find any source files',
  /**
   *@description Status message that is shown in the Console when debugging information is successfully loaded
   *@example {C/C++ DevTools Support (DWARF)} PH1
   *@example {http://web.dev/file.wasm} PH2
   *@example {42} PH3
   */
  loadedDebugSymbolsForFound: '[{PH1}] Loaded debug symbols for {PH2}, found {PH3} source file(s)',
  /**
   *@description Error message that is displayed in the Console when debugging information cannot be loaded
   *@example {C/C++ DevTools Support (DWARF)} PH1
   *@example {http://web.dev/file.wasm} PH2
   *@example {File not found} PH3
   */
  failedToLoadDebugSymbolsFor: '[{PH1}] Failed to load debug symbols for {PH2} ({PH3})',
  /**
   *@description Error message that is displayed in UI debugging information cannot be found for a call frame
   *@example {main} PH1
   */
  failedToLoadDebugSymbolsForFunction: 'No debug information for function "{PH1}"',
  /**
   *@description Error message that is displayed in UI when a file needed for debugging information for a call frame is missing
   *@example {mainp.debug.wasm.dwp} PH1
   */
  debugSymbolsIncomplete: 'The debug information for function {PH1} is incomplete',
};
const str_ = i18n.i18n.registerUIStrings('models/bindings/DebuggerLanguagePlugins.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * Generates the raw module ID for a script, which is used
 * to uniquely identify the debugging data for a script on
 * the responsible language #plugin.
 *
 * @param script the unique raw module ID for the script.
 */
function rawModuleIdForScript(script: SDK.Script.Script): string {
  return `${script.sourceURL}@${script.hash}`;
}

function getRawLocation(callFrame: SDK.DebuggerModel.CallFrame): Chrome.DevTools.RawLocation {
  const {script} = callFrame;
  return {
    rawModuleId: rawModuleIdForScript(script),
    codeOffset: callFrame.location().columnNumber - (script.codeOffset() || 0),
    inlineFrameIndex: callFrame.inlineFrameIndex,
  };
}

class FormattingError extends Error {
  exception: SDK.RemoteObject.RemoteObject;
  exceptionDetails: Protocol.Runtime.ExceptionDetails;
  constructor(exception: SDK.RemoteObject.RemoteObject, exceptionDetails: Protocol.Runtime.ExceptionDetails) {
    const {description} = exceptionDetails.exception || {};
    super(description || exceptionDetails.text);
    this.exception = exception;
    this.exceptionDetails = exceptionDetails;
  }

  static makeLocal(callFrame: SDK.DebuggerModel.CallFrame, message: string): FormattingError {
    const exception: Protocol.Runtime.RemoteObject = {
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: message,
    };
    const exceptionDetails: Protocol.Runtime
        .ExceptionDetails = {text: 'Uncaught', exceptionId: -1, columnNumber: 0, lineNumber: 0, exception};
    const errorObject = callFrame.debuggerModel.runtimeModel().createRemoteObject(exception);
    return new FormattingError(errorObject, exceptionDetails);
  }
}

class NamespaceObject extends SDK.RemoteObject.LocalJSONObject {
  constructor(value: typeof SDK.RemoteObject.LocalJSONObject.prototype.value) {
    super(value);
  }

  override get description(): string {
    return this.type;
  }

  override get type(): string {
    return 'namespace';
  }
}

async function getRemoteObject(callFrame: SDK.DebuggerModel.CallFrame, object: Chrome.DevTools.ForeignObject):
    Promise<Protocol.Runtime.RemoteObject> {
  if (!/^(local|global|operand)$/.test(object.valueClass)) {
    return {type: Protocol.Runtime.RemoteObjectType.Undefined};
  }
  const index = Number(object.index);
  const expression = `${object.valueClass}s[${index}]`;
  const response = await callFrame.debuggerModel.agent.invoke_evaluateOnCallFrame({
    callFrameId: callFrame.id,
    expression,
    silent: true,
    generatePreview: true,
    throwOnSideEffect: true,
  });
  if (response.getError() || response.exceptionDetails) {
    return {type: Protocol.Runtime.RemoteObjectType.Undefined};
  }
  return response.result;
}

async function wrapRemoteObject(
    callFrame: SDK.DebuggerModel.CallFrame, object: Chrome.DevTools.RemoteObject|Chrome.DevTools.ForeignObject,
    plugin: DebuggerLanguagePlugin): Promise<SDK.RemoteObject.RemoteObject> {
  if (object.type === 'reftype') {
    const obj = await getRemoteObject(callFrame, object);
    return callFrame.debuggerModel.runtimeModel().createRemoteObject(obj);
  }
  return new ExtensionRemoteObject(callFrame, object, plugin);
}

class SourceScopeRemoteObject extends SDK.RemoteObject.RemoteObjectImpl {
  variables: Chrome.DevTools.Variable[];
  #callFrame: SDK.DebuggerModel.CallFrame;
  #plugin: DebuggerLanguagePlugin;
  stopId: StopId;

  constructor(callFrame: SDK.DebuggerModel.CallFrame, stopId: StopId, plugin: DebuggerLanguagePlugin) {
    super(callFrame.debuggerModel.runtimeModel(), undefined, 'object', undefined, null);
    this.variables = [];
    this.#callFrame = callFrame;
    this.#plugin = plugin;
    this.stopId = stopId;
  }

  override async doGetProperties(ownProperties: boolean, accessorPropertiesOnly: boolean, _generatePreview: boolean):
      Promise<SDK.RemoteObject.GetPropertiesResult> {
    if (accessorPropertiesOnly) {
      return {properties: [], internalProperties: []} as SDK.RemoteObject.GetPropertiesResult;
    }

    const properties = [];
    const namespaces: {
      [x: string]: SDK.RemoteObject.RemoteObject,
    } = {};

    function makeProperty(name: string, obj: SDK.RemoteObject.RemoteObject): SDK.RemoteObject.RemoteObjectProperty {
      return new SDK.RemoteObject.RemoteObjectProperty(
          name, obj,
          /* enumerable=*/ false, /* writable=*/ false, /* isOwn=*/ true, /* wasThrown=*/ false);
    }

    for (const variable of this.variables) {
      let sourceVar: SDK.RemoteObject.RemoteObject|undefined;
      try {
        const evalResult = await this.#plugin.evaluate(variable.name, getRawLocation(this.#callFrame), this.stopId);
        sourceVar = evalResult ? await wrapRemoteObject(this.#callFrame, evalResult, this.#plugin) :
                                 new SDK.RemoteObject.LocalJSONObject(undefined);
      } catch (e) {
        console.warn(e);
        sourceVar = new SDK.RemoteObject.LocalJSONObject(undefined);
      }
      if (variable.nestedName && variable.nestedName.length > 1) {
        let parent: {
          [x: string]: SDK.RemoteObject.RemoteObject,
        } = namespaces;
        for (let index = 0; index < variable.nestedName.length - 1; index++) {
          const nestedName = variable.nestedName[index];
          let child: NamespaceObject|SDK.RemoteObject.RemoteObject = parent[nestedName];
          if (!child) {
            child = new NamespaceObject({});
            parent[nestedName] = child;
          }
          parent = child.value;
        }
        const name = variable.nestedName[variable.nestedName.length - 1];
        parent[name] = sourceVar;
      } else {
        properties.push(makeProperty(variable.name, sourceVar));
      }
    }

    for (const namespace in namespaces) {
      properties.push(makeProperty(namespace, (namespaces[namespace] as SDK.RemoteObject.RemoteObject)));
    }

    return {properties, internalProperties: []};
  }
}

export class SourceScope implements SDK.DebuggerModel.ScopeChainEntry {
  readonly #callFrameInternal: SDK.DebuggerModel.CallFrame;
  readonly #typeInternal: string;
  readonly #typeNameInternal: string;
  readonly #iconInternal: string|undefined;
  readonly #objectInternal: SourceScopeRemoteObject;
  constructor(
      callFrame: SDK.DebuggerModel.CallFrame, stopId: StopId, type: string, typeName: string, icon: string|undefined,
      plugin: DebuggerLanguagePlugin) {
    if (icon && new URL(icon).protocol !== 'data:') {
      throw new Error('The icon must be a data:-URL');
    }
    this.#callFrameInternal = callFrame;
    this.#typeInternal = type;
    this.#typeNameInternal = typeName;
    this.#iconInternal = icon;
    this.#objectInternal = new SourceScopeRemoteObject(callFrame, stopId, plugin);
  }

  async getVariableValue(name: string): Promise<SDK.RemoteObject.RemoteObject|null> {
    for (let v = 0; v < this.#objectInternal.variables.length; ++v) {
      if (this.#objectInternal.variables[v].name !== name) {
        continue;
      }
      const properties = await this.#objectInternal.getAllProperties(false, false);
      if (!properties.properties) {
        continue;
      }
      const {value} = properties.properties[v];
      if (value) {
        return value;
      }
    }
    return null;
  }

  callFrame(): SDK.DebuggerModel.CallFrame {
    return this.#callFrameInternal;
  }

  type(): string {
    return this.#typeInternal;
  }

  typeName(): string {
    return this.#typeNameInternal;
  }

  name(): string|undefined {
    return undefined;
  }

  range(): null {
    return null;
  }

  object(): SourceScopeRemoteObject {
    return this.#objectInternal;
  }

  description(): string {
    return '';
  }

  icon(): string|undefined {
    return this.#iconInternal;
  }

  extraProperties(): SDK.RemoteObject.RemoteObjectProperty[] {
    return [];
  }
}

export class ExtensionRemoteObject extends SDK.RemoteObject.RemoteObject {
  private readonly extensionObject: Chrome.DevTools.RemoteObject;
  private readonly plugin: DebuggerLanguagePlugin;
  readonly callFrame: SDK.DebuggerModel.CallFrame;
  constructor(
      callFrame: SDK.DebuggerModel.CallFrame, extensionObject: Chrome.DevTools.RemoteObject,
      plugin: DebuggerLanguagePlugin) {
    super();
    this.extensionObject = extensionObject;
    this.plugin = plugin;
    this.callFrame = callFrame;
  }

  get linearMemoryAddress(): number|undefined {
    return this.extensionObject.linearMemoryAddress;
  }

  get linearMemorySize(): number|undefined {
    return this.extensionObject.linearMemorySize;
  }

  override get objectId(): Protocol.Runtime.RemoteObjectId|undefined {
    return this.extensionObject.objectId as Protocol.Runtime.RemoteObjectId;
  }

  override get type(): string {
    if (this.extensionObject.type === 'array' || this.extensionObject.type === 'null') {
      return 'object';
    }
    return this.extensionObject.type;
  }

  override get subtype(): string|undefined {
    if (this.extensionObject.type === 'array' || this.extensionObject.type === 'null') {
      return this.extensionObject.type;
    }
    return undefined;
  }

  override get value(): unknown {
    return this.extensionObject.value;
  }

  override unserializableValue(): string|undefined {
    return undefined;
  }

  override get description(): string|undefined {
    return this.extensionObject.description;
  }

  override set description(description: string|undefined) {
  }

  override get hasChildren(): boolean {
    return this.extensionObject.hasChildren;
  }

  override get preview(): Protocol.Runtime.ObjectPreview|undefined {
    return undefined;
  }

  override get className(): string|null {
    return this.extensionObject.className ?? null;
  }

  override arrayLength(): number {
    return 0;
  }

  override arrayBufferByteLength(): number {
    return 0;
  }

  override getOwnProperties(_generatePreview: boolean, _nonIndexedPropertiesOnly?: boolean):
      Promise<SDK.RemoteObject.GetPropertiesResult> {
    return this.getAllProperties(false, _generatePreview, _nonIndexedPropertiesOnly);
  }

  override async getAllProperties(
      _accessorPropertiesOnly: boolean, _generatePreview: boolean,
      _nonIndexedPropertiesOnly?: boolean): Promise<SDK.RemoteObject.GetPropertiesResult> {
    const {objectId} = this.extensionObject;
    if (objectId) {
      assertNotNullOrUndefined(this.plugin.getProperties);
      const extensionObjectProperties = await this.plugin.getProperties(objectId);
      const properties = await Promise.all(extensionObjectProperties.map(
          async p => new SDK.RemoteObject.RemoteObjectProperty(
              p.name, await wrapRemoteObject(this.callFrame, p.value, this.plugin))));
      return {properties, internalProperties: null};
    }

    return {properties: null, internalProperties: null};
  }

  override release(): void {
    const {objectId} = this.extensionObject;
    if (objectId) {
      assertNotNullOrUndefined(this.plugin.releaseObject);
      void this.plugin.releaseObject(objectId);
    }
  }

  override debuggerModel(): SDK.DebuggerModel.DebuggerModel {
    return this.callFrame.debuggerModel;
  }

  override runtimeModel(): SDK.RuntimeModel.RuntimeModel {
    return this.callFrame.debuggerModel.runtimeModel();
  }

  override isLinearMemoryInspectable(): boolean {
    return this.extensionObject.linearMemoryAddress !== undefined;
  }
}

export type StopId = bigint;
export class DebuggerLanguagePluginManager implements
    SDK.TargetManager.SDKModelObserver<SDK.DebuggerModel.DebuggerModel> {
  readonly #workspace: Workspace.Workspace.WorkspaceImpl;
  readonly #debuggerWorkspaceBinding: DebuggerWorkspaceBinding;
  #plugins: DebuggerLanguagePlugin[];
  readonly #debuggerModelToData: Map<SDK.DebuggerModel.DebuggerModel, ModelData>;
  readonly #rawModuleHandles: Map<string, {
    rawModuleId: string,
    plugin: DebuggerLanguagePlugin,
    scripts: Array<SDK.Script.Script>,
    addRawModulePromise:
        Promise<Array<Platform.DevToolsPath.UrlString>|{missingSymbolFiles: SDK.DebuggerModel.MissingDebugFiles[]}>,
  }>;
  private readonly callFrameByStopId: Map<StopId, SDK.DebuggerModel.CallFrame> = new Map();
  private readonly stopIdByCallFrame: Map<SDK.DebuggerModel.CallFrame, StopId> = new Map();
  private nextStopId: StopId = 0n;

  constructor(
      targetManager: SDK.TargetManager.TargetManager, workspace: Workspace.Workspace.WorkspaceImpl,
      debuggerWorkspaceBinding: DebuggerWorkspaceBinding) {
    this.#workspace = workspace;
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    this.#plugins = [];

    this.#debuggerModelToData = new Map();
    targetManager.observeModels(SDK.DebuggerModel.DebuggerModel, this);

    this.#rawModuleHandles = new Map();
  }

  private async evaluateOnCallFrame(
      callFrame: SDK.DebuggerModel.CallFrame, options: SDK.RuntimeModel.EvaluationOptions): Promise<{
    object: SDK.RemoteObject.RemoteObject,
    exceptionDetails: Protocol.Runtime.ExceptionDetails|undefined,
  }|{
    error: string,
  }|null> {
    const {script} = callFrame;
    const {expression, returnByValue, throwOnSideEffect} = options;
    const {plugin} = await this.rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return null;
    }
    const location = getRawLocation(callFrame);
    const sourceLocations = await plugin.rawLocationToSourceLocation(location);
    if (sourceLocations.length === 0) {
      return null;
    }

    if (returnByValue) {
      return {error: 'Cannot return by value'};
    }
    if (throwOnSideEffect) {
      return {error: 'Cannot guarantee side-effect freedom'};
    }

    try {
      const object = await plugin.evaluate(expression, location, this.stopIdForCallFrame(callFrame));
      if (object) {
        return {object: await wrapRemoteObject(callFrame, object, plugin), exceptionDetails: undefined};
      }
      return {object: new SDK.RemoteObject.LocalJSONObject(undefined), exceptionDetails: undefined};
    } catch (error) {
      if (error instanceof FormattingError) {
        const {exception: object, exceptionDetails} = error;
        return {object, exceptionDetails};
      }
      const {exception: object, exceptionDetails} = FormattingError.makeLocal(callFrame, error.message);
      return {object, exceptionDetails};
    }
  }

  stopIdForCallFrame(callFrame: SDK.DebuggerModel.CallFrame): StopId {
    let stopId = this.stopIdByCallFrame.get(callFrame);
    if (stopId !== undefined) {
      return stopId;
    }

    stopId = this.nextStopId++;
    this.stopIdByCallFrame.set(callFrame, stopId);
    this.callFrameByStopId.set(stopId, callFrame);
    return stopId;
  }

  callFrameForStopId(stopId: StopId): SDK.DebuggerModel.CallFrame|undefined {
    return this.callFrameByStopId.get(stopId);
  }

  private expandCallFrames(callFrames: SDK.DebuggerModel.CallFrame[]): Promise<SDK.DebuggerModel.CallFrame[]> {
    return Promise
        .all(callFrames.map(async callFrame => {
          const functionInfo = await this.getFunctionInfo(callFrame.script, callFrame.location());
          if (functionInfo) {
            if ('frames' in functionInfo && functionInfo.frames.length) {
              return functionInfo.frames.map(({name}, index) => callFrame.createVirtualCallFrame(index, name));
            }
            if ('missingSymbolFiles' in functionInfo && functionInfo.missingSymbolFiles.length) {
              const resources = functionInfo.missingSymbolFiles;
              const details = i18nString(UIStrings.debugSymbolsIncomplete, {PH1: callFrame.functionName});
              callFrame.missingDebugInfoDetails = {details, resources};
            } else {
              callFrame.missingDebugInfoDetails = {
                details: i18nString(UIStrings.failedToLoadDebugSymbolsForFunction, {PH1: callFrame.functionName}),
                resources: [],
              };
            }
          }
          return callFrame;
        }))
        .then(callFrames => callFrames.flat());
  }

  modelAdded(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    this.#debuggerModelToData.set(debuggerModel, new ModelData(debuggerModel, this.#workspace));
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared, this.globalObjectCleared, this);
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.ParsedScriptSource, this.parsedScriptSource, this);
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerResumed, this.debuggerResumed, this);
    debuggerModel.setEvaluateOnCallFrameCallback(this.evaluateOnCallFrame.bind(this));
    debuggerModel.setExpandCallFramesCallback(this.expandCallFrames.bind(this));
  }

  modelRemoved(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared, this.globalObjectCleared, this);
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.ParsedScriptSource, this.parsedScriptSource, this);
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.DebuggerResumed, this.debuggerResumed, this);
    debuggerModel.setEvaluateOnCallFrameCallback(null);
    debuggerModel.setExpandCallFramesCallback(null);
    const modelData = this.#debuggerModelToData.get(debuggerModel);
    if (modelData) {
      modelData.dispose();
      this.#debuggerModelToData.delete(debuggerModel);
    }
    this.#rawModuleHandles.forEach((rawModuleHandle, rawModuleId) => {
      const scripts = rawModuleHandle.scripts.filter(script => script.debuggerModel !== debuggerModel);
      if (scripts.length === 0) {
        rawModuleHandle.plugin.removeRawModule(rawModuleId).catch(error => {
          Common.Console.Console.instance().error(
              i18nString(UIStrings.errorInDebuggerLanguagePlugin, {PH1: error.message}), /* show=*/ false);
        });
        this.#rawModuleHandles.delete(rawModuleId);
      } else {
        rawModuleHandle.scripts = scripts;
      }
    });
  }

  private globalObjectCleared(event: Common.EventTarget.EventTargetEvent<SDK.DebuggerModel.DebuggerModel>): void {
    const debuggerModel = event.data;
    this.modelRemoved(debuggerModel);
    this.modelAdded(debuggerModel);
  }

  addPlugin(plugin: DebuggerLanguagePlugin): void {
    this.#plugins.push(plugin);
    for (const debuggerModel of this.#debuggerModelToData.keys()) {
      for (const script of debuggerModel.scripts()) {
        if (this.hasPluginForScript(script)) {
          continue;
        }
        this.parsedScriptSource({data: script});
      }
    }
  }

  removePlugin(plugin: DebuggerLanguagePlugin): void {
    this.#plugins = this.#plugins.filter(p => p !== plugin);
    const scripts = new Set<SDK.Script.Script>();
    this.#rawModuleHandles.forEach((rawModuleHandle, rawModuleId) => {
      if (rawModuleHandle.plugin !== plugin) {
        return;
      }
      rawModuleHandle.scripts.forEach(script => scripts.add(script));
      this.#rawModuleHandles.delete(rawModuleId);
    });
    for (const script of scripts) {
      const modelData = (this.#debuggerModelToData.get(script.debuggerModel) as ModelData);
      modelData.removeScript(script);

      // Let's see if we have another #plugin that's happy to
      // take this orphaned script now. This is important to
      // get right, since the same #plugin might race during
      // unregister/register and we might already have the
      // new instance of the #plugin added before we remove
      // the previous instance.
      this.parsedScriptSource({data: script});
    }
  }

  hasPluginForScript(script: SDK.Script.Script): boolean {
    const rawModuleId = rawModuleIdForScript(script);
    const rawModuleHandle = this.#rawModuleHandles.get(rawModuleId);
    return rawModuleHandle !== undefined && rawModuleHandle.scripts.includes(script);
  }

  /**
   * Returns the responsible language #plugin and the raw module ID for a script.
   *
   * This ensures that the `addRawModule` call finishes first such that the
   * caller can immediately issue calls to the returned #plugin without the
   * risk of racing with the `addRawModule` call. The returned #plugin will be
   * set to undefined to indicate that there's no #plugin for the script.
   */
  private async rawModuleIdAndPluginForScript(script: SDK.Script.Script): Promise<{
    rawModuleId: string,
    plugin: DebuggerLanguagePlugin|null,
  }> {
    const rawModuleId = rawModuleIdForScript(script);
    const rawModuleHandle = this.#rawModuleHandles.get(rawModuleId);
    if (rawModuleHandle) {
      await rawModuleHandle.addRawModulePromise;
      if (rawModuleHandle === this.#rawModuleHandles.get(rawModuleId)) {
        return {rawModuleId, plugin: rawModuleHandle.plugin};
      }
    }
    return {rawModuleId, plugin: null};
  }

  uiSourceCodeForURL(debuggerModel: SDK.DebuggerModel.DebuggerModel, url: Platform.DevToolsPath.UrlString):
      Workspace.UISourceCode.UISourceCode|null {
    const modelData = this.#debuggerModelToData.get(debuggerModel);
    if (modelData) {
      return modelData.getProject().uiSourceCodeForURL(url);
    }
    return null;
  }

  async rawLocationToUILocation(rawLocation: SDK.DebuggerModel.Location):
      Promise<Workspace.UISourceCode.UILocation|null> {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }
    const {rawModuleId, plugin} = await this.rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return null;
    }

    const pluginLocation = {
      rawModuleId,
      // RawLocation.#columnNumber is the byte offset in the full raw wasm module. Plugins expect the offset in the code
      // section, so subtract the offset of the code section in the module here.
      codeOffset: rawLocation.columnNumber - (script.codeOffset() || 0),
      inlineFrameIndex: rawLocation.inlineFrameIndex,
    };

    try {
      const sourceLocations = await plugin.rawLocationToSourceLocation(pluginLocation);
      for (const sourceLocation of sourceLocations) {
        const uiSourceCode = this.uiSourceCodeForURL(
            script.debuggerModel, sourceLocation.sourceFileURL as Platform.DevToolsPath.UrlString);
        if (!uiSourceCode) {
          continue;
        }
        // Absence of column information is indicated by the value `-1` in talking to language #plugins.
        return uiSourceCode.uiLocation(
            sourceLocation.lineNumber, sourceLocation.columnNumber >= 0 ? sourceLocation.columnNumber : undefined);
      }
    } catch (error) {
      Common.Console.Console.instance().error(
          i18nString(UIStrings.errorInDebuggerLanguagePlugin, {PH1: error.message}), /* show=*/ false);
    }
    return null;
  }

  uiLocationToRawLocationRanges(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, lineNumber: number,
      columnNumber: number|undefined = -1): Promise<{
    start: SDK.DebuggerModel.Location,
    end: SDK.DebuggerModel.Location,
  }[]|null> {
    const locationPromises: Promise<{
      start: SDK.DebuggerModel.Location,
      end: SDK.DebuggerModel.Location,
    }[]>[] = [];
    this.scriptsForUISourceCode(uiSourceCode).forEach(script => {
      const rawModuleId = rawModuleIdForScript(script);
      const rawModuleHandle = this.#rawModuleHandles.get(rawModuleId);
      if (!rawModuleHandle) {
        return;
      }
      const {plugin} = rawModuleHandle;
      locationPromises.push(getLocations(rawModuleId, plugin, script));
    });
    if (locationPromises.length === 0) {
      return Promise.resolve(null);
    }

    return Promise.all(locationPromises).then(locations => locations.flat()).catch(error => {
      Common.Console.Console.instance().error(
          i18nString(UIStrings.errorInDebuggerLanguagePlugin, {PH1: error.message}), /* show=*/ false);
      return null;
    });

    async function getLocations(
        rawModuleId: string, plugin: DebuggerLanguagePlugin, script: SDK.Script.Script): Promise<{
      start: SDK.DebuggerModel.Location,
      end: SDK.DebuggerModel.Location,
    }[]> {
      const pluginLocation = {rawModuleId, sourceFileURL: uiSourceCode.url(), lineNumber, columnNumber};

      const rawLocations = await plugin.sourceLocationToRawLocation(pluginLocation);
      if (!rawLocations) {
        return [];
      }
      return rawLocations.map(
          m => ({
            start: new SDK.DebuggerModel.Location(
                script.debuggerModel, script.scriptId, 0, Number(m.startOffset) + (script.codeOffset() || 0)),
            end: new SDK.DebuggerModel.Location(
                script.debuggerModel, script.scriptId, 0, Number(m.endOffset) + (script.codeOffset() || 0)),
          }));
    }
  }

  async uiLocationToRawLocations(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, lineNumber: number,
      columnNumber?: number): Promise<SDK.DebuggerModel.Location[]|null> {
    const locationRanges = await this.uiLocationToRawLocationRanges(uiSourceCode, lineNumber, columnNumber);
    if (!locationRanges) {
      return null;
    }
    return locationRanges.map(({start}) => start);
  }

  async uiLocationRangeToRawLocationRanges(
      uiSourceCode: Workspace.UISourceCode.UISourceCode,
      textRange: TextUtils.TextRange.TextRange): Promise<SDK.DebuggerModel.LocationRange[]|null> {
    const locationRangesPromises = [];
    for (let line = textRange.startLine; line <= textRange.endLine; ++line) {
      locationRangesPromises.push(this.uiLocationToRawLocationRanges(uiSourceCode, line));
    }
    const ranges = [];
    for (const locationRanges of await Promise.all(locationRangesPromises)) {
      if (locationRanges === null) {
        return null;
      }
      for (const range of locationRanges) {
        const [startLocation, endLocation] = await Promise.all([
          this.rawLocationToUILocation(range.start),
          this.rawLocationToUILocation(range.end),
        ]);
        if (startLocation === null || endLocation === null) {
          continue;
        }
        // Report all ranges that somehow intersect with the `textRange`. It's the
        // responsibility of the caller to filter / clamp these ranges appropriately.
        const overlap = textRange.intersection(new TextUtils.TextRange.TextRange(
            startLocation.lineNumber, startLocation.columnNumber ?? 0, endLocation.lineNumber,
            endLocation.columnNumber ?? Infinity));
        if (!overlap.isEmpty()) {
          ranges.push(range);
        }
      }
    }
    return ranges;
  }

  scriptsForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): SDK.Script.Script[] {
    for (const modelData of this.#debuggerModelToData.values()) {
      const scripts = modelData.uiSourceCodeToScripts.get(uiSourceCode);
      if (scripts) {
        return scripts;
      }
    }
    return [];
  }

  setDebugInfoURL(script: SDK.Script.Script, externalURL: Platform.DevToolsPath.UrlString): void {
    if (this.hasPluginForScript(script)) {
      return;
    }
    script.debugSymbols = {type: Protocol.Debugger.DebugSymbolsType.ExternalDWARF, externalURL};
    this.parsedScriptSource({data: script});
    void script.debuggerModel.setDebugInfoURL(script, externalURL);
  }

  private parsedScriptSource(event: Common.EventTarget.EventTargetEvent<SDK.Script.Script>): void {
    const script = event.data;
    if (!script.sourceURL) {
      return;
    }

    for (const plugin of this.#plugins) {
      if (!plugin.handleScript(script)) {
        continue;
      }
      const rawModuleId = rawModuleIdForScript(script);
      let rawModuleHandle = this.#rawModuleHandles.get(rawModuleId);
      if (!rawModuleHandle) {
        const sourceFileURLsPromise = (async () => {
          const console = Common.Console.Console.instance();
          const url = script.sourceURL;
          const symbolsUrl = (script.debugSymbols && script.debugSymbols.externalURL) || '';
          if (symbolsUrl) {
            console.log(i18nString(UIStrings.loadingDebugSymbolsForVia, {PH1: plugin.name, PH2: url, PH3: symbolsUrl}));
          } else {
            console.log(i18nString(UIStrings.loadingDebugSymbolsFor, {PH1: plugin.name, PH2: url}));
          }
          try {
            const code =
                (!symbolsUrl && Common.ParsedURL.schemeIs(url, 'wasm:')) ? await script.getWasmBytecode() : undefined;
            const addModuleResult = await plugin.addRawModule(rawModuleId, symbolsUrl, {url, code});
            // Check that the handle isn't stale by now. This works because the code that assigns to
            // `rawModuleHandle` below will run before this code because of the `await` in the preceding
            // line. This is primarily to avoid logging the message below, which would give the developer
            // the misleading information that we're done, while in reality it was a stale call that finished.
            if (rawModuleHandle !== this.#rawModuleHandles.get(rawModuleId)) {
              return [];
            }
            if ('missingSymbolFiles' in addModuleResult) {
              const initiator = plugin.createPageResourceLoadInitiator();
              const missingSymbolFiles = addModuleResult.missingSymbolFiles.map(resource => {
                const resourceUrl = resource as Platform.DevToolsPath.UrlString;
                return {resourceUrl, initiator};
              });
              return {missingSymbolFiles};
            }
            const sourceFileURLs = addModuleResult as Platform.DevToolsPath.UrlString[];
            if (sourceFileURLs.length === 0) {
              console.warn(i18nString(UIStrings.loadedDebugSymbolsForButDidnt, {PH1: plugin.name, PH2: url}));
            } else {
              console.log(i18nString(
                  UIStrings.loadedDebugSymbolsForFound, {PH1: plugin.name, PH2: url, PH3: sourceFileURLs.length}));
            }
            return sourceFileURLs;
          } catch (error) {
            console.error(
                i18nString(UIStrings.failedToLoadDebugSymbolsFor, {PH1: plugin.name, PH2: url, PH3: error.message}),
                /* show=*/ false);
            this.#rawModuleHandles.delete(rawModuleId);
            return [];
          }
        })();
        rawModuleHandle = {rawModuleId, plugin, scripts: [script], addRawModulePromise: sourceFileURLsPromise};
        this.#rawModuleHandles.set(rawModuleId, rawModuleHandle);
      } else {
        rawModuleHandle.scripts.push(script);
      }

      // Wait for the addRawModule call to finish and
      // update the #project. It's important to check
      // for the DebuggerModel again, which may disappear
      // in the meantime...
      void rawModuleHandle.addRawModulePromise.then(sourceFileURLs => {
        if (!('missingSymbolFiles' in sourceFileURLs)) {
          // The script might have disappeared meanwhile...
          if (script.debuggerModel.scriptForId(script.scriptId) === script) {
            const modelData = this.#debuggerModelToData.get(script.debuggerModel);
            if (modelData) {  // The DebuggerModel could have disappeared meanwhile...
              modelData.addSourceFiles(script, sourceFileURLs);
              void this.#debuggerWorkspaceBinding.updateLocations(script);
            }
          }
        }
      });
      return;
    }
  }

  private debuggerResumed(event: Common.EventTarget.EventTargetEvent<SDK.DebuggerModel.DebuggerModel>): void {
    const resumedFrames =
        Array.from(this.callFrameByStopId.values()).filter(callFrame => callFrame.debuggerModel === event.data);
    for (const callFrame of resumedFrames) {
      const stopId = this.stopIdByCallFrame.get(callFrame);
      assertNotNullOrUndefined(stopId);
      this.stopIdByCallFrame.delete(callFrame);
      this.callFrameByStopId.delete(stopId);
    }
  }

  getSourcesForScript(script: SDK.Script.Script):
      Promise<Array<Platform.DevToolsPath.UrlString>|{missingSymbolFiles: SDK.DebuggerModel.MissingDebugFiles[]}|
              undefined> {
    const rawModuleId = rawModuleIdForScript(script);
    const rawModuleHandle = this.#rawModuleHandles.get(rawModuleId);
    if (rawModuleHandle) {
      return rawModuleHandle.addRawModulePromise;
    }
    return Promise.resolve(undefined);
  }

  async resolveScopeChain(callFrame: SDK.DebuggerModel.CallFrame): Promise<SourceScope[]|null> {
    const script = callFrame.script;
    const {rawModuleId, plugin} = await this.rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return null;
    }

    const location = {
      rawModuleId,
      codeOffset: callFrame.location().columnNumber - (script.codeOffset() || 0),
      inlineFrameIndex: callFrame.inlineFrameIndex,
    };

    const stopId = this.stopIdForCallFrame(callFrame);

    try {
      const sourceMapping = await plugin.rawLocationToSourceLocation(location);
      if (sourceMapping.length === 0) {
        return null;
      }
      const scopes = new Map<string, SourceScope>();
      const variables = await plugin.listVariablesInScope(location);
      for (const variable of variables || []) {
        let scope = scopes.get(variable.scope);
        if (!scope) {
          const {type, typeName, icon} = await plugin.getScopeInfo(variable.scope);
          scope = new SourceScope(callFrame, stopId, type, typeName, icon, plugin);
          scopes.set(variable.scope, scope);
        }
        scope.object().variables.push(variable);
      }
      return Array.from(scopes.values());
    } catch (error) {
      Common.Console.Console.instance().error(
          i18nString(UIStrings.errorInDebuggerLanguagePlugin, {PH1: error.message}), /* show=*/ false);
      return null;
    }
  }

  async getFunctionInfo(script: SDK.Script.Script, location: SDK.DebuggerModel.Location):
      Promise<{frames: Array<Chrome.DevTools.FunctionInfo>, missingSymbolFiles: SDK.DebuggerModel.MissingDebugFiles[]}|
              {frames: Array<Chrome.DevTools.FunctionInfo>}|{missingSymbolFiles: SDK.DebuggerModel.MissingDebugFiles[]}|
              null> {
    const {rawModuleId, plugin} = await this.rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return null;
    }

    const rawLocation: Chrome.DevTools.RawLocation = {
      rawModuleId,
      codeOffset: location.columnNumber - (script.codeOffset() || 0),
      inlineFrameIndex: 0,
    };

    try {
      const functionInfo = await plugin.getFunctionInfo(rawLocation);
      if ('missingSymbolFiles' in functionInfo) {
        const initiator = plugin.createPageResourceLoadInitiator();
        const missingSymbolFiles = functionInfo.missingSymbolFiles.map(resource => {
          const resourceUrl = resource as Platform.DevToolsPath.UrlString;
          return {resourceUrl, initiator};
        });
        return {missingSymbolFiles, ...('frames' in functionInfo && {frames: functionInfo.frames})};
      }
      return functionInfo;
    } catch (error) {
      Common.Console.Console.instance().warn(i18nString(UIStrings.errorInDebuggerLanguagePlugin, {PH1: error.message}));
      return {frames: []};
    }
  }

  async getInlinedFunctionRanges(rawLocation: SDK.DebuggerModel.Location): Promise<{
    start: SDK.DebuggerModel.Location,
    end: SDK.DebuggerModel.Location,
  }[]> {
    const script = rawLocation.script();
    if (!script) {
      return [];
    }
    const {rawModuleId, plugin} = await this.rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return [];
    }

    const pluginLocation = {
      rawModuleId,
      // RawLocation.#columnNumber is the byte offset in the full raw wasm module. Plugins expect the offset in the code
      // section, so subtract the offset of the code section in the module here.
      codeOffset: rawLocation.columnNumber - (script.codeOffset() || 0),
    };

    try {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // @ts-ignore
      const locations = await plugin.getInlinedFunctionRanges(pluginLocation);
      return locations.map(
          m => ({
            start: new SDK.DebuggerModel.Location(
                script.debuggerModel, script.scriptId, 0, Number(m.startOffset) + (script.codeOffset() || 0)),
            end: new SDK.DebuggerModel.Location(
                script.debuggerModel, script.scriptId, 0, Number(m.endOffset) + (script.codeOffset() || 0)),
          }));
    } catch (error) {
      Common.Console.Console.instance().warn(i18nString(UIStrings.errorInDebuggerLanguagePlugin, {PH1: error.message}));
      return [];
    }
  }

  async getInlinedCalleesRanges(rawLocation: SDK.DebuggerModel.Location): Promise<{
    start: SDK.DebuggerModel.Location,
    end: SDK.DebuggerModel.Location,
  }[]> {
    const script = rawLocation.script();
    if (!script) {
      return [];
    }
    const {rawModuleId, plugin} = await this.rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return [];
    }

    const pluginLocation = {
      rawModuleId,
      // RawLocation.#columnNumber is the byte offset in the full raw wasm module. Plugins expect the offset in the code
      // section, so subtract the offset of the code section in the module here.
      codeOffset: rawLocation.columnNumber - (script.codeOffset() || 0),
    };

    try {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // @ts-ignore
      const locations = await plugin.getInlinedCalleesRanges(pluginLocation);
      return locations.map(
          m => ({
            start: new SDK.DebuggerModel.Location(
                script.debuggerModel, script.scriptId, 0, Number(m.startOffset) + (script.codeOffset() || 0)),
            end: new SDK.DebuggerModel.Location(
                script.debuggerModel, script.scriptId, 0, Number(m.endOffset) + (script.codeOffset() || 0)),
          }));
    } catch (error) {
      Common.Console.Console.instance().warn(i18nString(UIStrings.errorInDebuggerLanguagePlugin, {PH1: error.message}));
      return [];
    }
  }

  async getMappedLines(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<Set<number>|null> {
    const rawModuleIds =
        await Promise.all(this.scriptsForUISourceCode(uiSourceCode).map(s => this.rawModuleIdAndPluginForScript(s)));

    let mappedLines: Set<number>|null = null;
    for (const {rawModuleId, plugin} of rawModuleIds) {
      if (!plugin) {
        continue;
      }
      const lines = await plugin.getMappedLines(rawModuleId, uiSourceCode.url());

      if (lines === undefined) {
        continue;
      }
      if (mappedLines === null) {
        mappedLines = new Set(lines);
      } else {
        lines.forEach(l => (mappedLines as Set<number>).add(l));
      }
    }
    return mappedLines;
  }
}

class ModelData {
  project: ContentProviderBasedProject;
  readonly uiSourceCodeToScripts: Map<Workspace.UISourceCode.UISourceCode, SDK.Script.Script[]>;
  constructor(debuggerModel: SDK.DebuggerModel.DebuggerModel, workspace: Workspace.Workspace.WorkspaceImpl) {
    this.project = new ContentProviderBasedProject(
        workspace, 'language_plugins::' + debuggerModel.target().id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    NetworkProject.setTargetForProject(this.project, debuggerModel.target());

    this.uiSourceCodeToScripts = new Map();
  }

  addSourceFiles(script: SDK.Script.Script, urls: Platform.DevToolsPath.UrlString[]): void {
    const initiator = script.createPageResourceLoadInitiator();
    for (const url of urls) {
      let uiSourceCode = this.project.uiSourceCodeForURL(url);
      if (!uiSourceCode) {
        uiSourceCode = this.project.createUISourceCode(url, Common.ResourceType.resourceTypes.SourceMapScript);
        NetworkProject.setInitialFrameAttribution(uiSourceCode, script.frameId);

        // Bind the uiSourceCode to the script first before we add the
        // uiSourceCode to the #project and thereby notify the rest of
        // the system about the new source file.
        // https://crbug.com/1150295 is an example where the breakpoint
        // resolution logic kicks in right after adding the uiSourceCode
        // and at that point we already need to have the mapping in place
        // otherwise we will not get the breakpoint right.
        this.uiSourceCodeToScripts.set(uiSourceCode, [script]);

        const contentProvider = new SDK.CompilerSourceMappingContentProvider.CompilerSourceMappingContentProvider(
            url, Common.ResourceType.resourceTypes.SourceMapScript, initiator);
        const mimeType = Common.ResourceType.ResourceType.mimeFromURL(url) || 'text/javascript';
        this.project.addUISourceCodeWithProvider(uiSourceCode, contentProvider, null, mimeType);
      } else {
        // The same uiSourceCode can be provided by different scripts,
        // but we don't expect that to happen frequently.
        const scripts = (this.uiSourceCodeToScripts.get(uiSourceCode) as SDK.Script.Script[]);
        if (!scripts.includes(script)) {
          scripts.push(script);
        }
      }
    }
  }

  removeScript(script: SDK.Script.Script): void {
    this.uiSourceCodeToScripts.forEach((scripts, uiSourceCode) => {
      scripts = scripts.filter(s => s !== script);
      if (scripts.length === 0) {
        this.uiSourceCodeToScripts.delete(uiSourceCode);
        this.project.removeUISourceCode(uiSourceCode.url());
      } else {
        this.uiSourceCodeToScripts.set(uiSourceCode, scripts);
      }
    });
  }

  dispose(): void {
    this.project.dispose();
  }

  getProject(): ContentProviderBasedProject {
    return this.project;
  }
}

export interface DebuggerLanguagePlugin extends Chrome.DevTools.LanguageExtensionPlugin {
  name: string;
  handleScript(script: SDK.Script.Script): boolean;
  createPageResourceLoadInitiator(): SDK.PageResourceLoader.PageResourceLoadInitiator;
}
