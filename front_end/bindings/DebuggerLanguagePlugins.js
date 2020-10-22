// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';

import {ContentProviderBasedProject} from './ContentProviderBasedProject.js';
import {DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';  // eslint-disable-line no-unused-vars
import {NetworkProject} from './NetworkProject.js';

/** @type {!WeakMap<!Workspace.UISourceCode.UISourceCode, !SDK.Script.Script>} */
const uiSourceCodeToScriptMap = new WeakMap();

class SourceType {
  /**
   * @param {!TypeInfo} typeInfo
   * @param {!Array<!SourceType>} members
   */
  constructor(typeInfo, members) {
    /** @type {!TypeInfo} */
    this.typeInfo = typeInfo;
    /** @type {!Array<!SourceType>} */
    this.members = members;
  }

  /** Create a type graph
   * @param {!Array<!TypeInfo>} typeInfos
   * @return {?SourceType}
   */
  static create(typeInfos) {
    if (typeInfos.length === 0) {
      return null;
    }
    /** @type Map<*, !SourceType> */
    const typeMap = new Map();
    for (const typeInfo of typeInfos) {
      typeMap.set(typeInfo.typeId, new SourceType(typeInfo, []));
    }

    for (const sourceType of typeMap.values()) {
      sourceType.members = sourceType.typeInfo.members.map(({typeId}) => {
        const memberType = typeMap.get(typeId);
        if (!memberType) {
          throw new Error(`Incomplete type information for type ${typeInfos[0].typeNames[0] || '<anonymous>'}`);
        }
        return memberType;
      });
    }

    return typeMap.get(typeInfos[0].typeId) || null;
  }
}

/**
 * @param {!SDK.DebuggerModel.CallFrame} callFrame
 * @return {!RawLocation}
 */
function getRawLocation(callFrame) {
  const script = callFrame.script;
  return {
    'rawModuleId': script.sourceURL,
    'codeOffset': callFrame.location().columnNumber - (script.codeOffset() || 0),
    'inlineFrameIndex': callFrame.inlineFrameIndex
  };
}

class EvalNode extends SDK.RemoteObject.RemoteObjectImpl {
  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {!DebuggerLanguagePlugin} plugin
   * @param {!EvalBase} base
   * @param {!Array<!FieldInfo>} field
   * @return {!Promise<!SDK.RemoteObject.RemoteObject>}
   */
  static async evaluate(callFrame, plugin, base, field) {
    const location = getRawLocation(callFrame);

    let evalCode = await plugin.getFormatter({base, field}, location);
    if (!evalCode) {
      evalCode = {js: ''};
    }
    const response = await callFrame.debuggerModel.target().debuggerAgent().invoke_evaluateOnCallFrame({
      callFrameId: callFrame.id,
      expression: evalCode.js,
      generatePreview: true,
      includeCommandLineAPI: true,
      objectGroup: 'console',
      returnByValue: false,
      silent: false
    });

    return callFrame.debuggerModel.runtimeModel().createRemoteObject(response.result);
  }

  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {!DebuggerLanguagePlugin} plugin
   * @param {string} expression
   * @return {!Promise<!SDK.RemoteObject.RemoteObject>}
   */
  static async get(callFrame, plugin, expression) {
    const location = getRawLocation(callFrame);

    const typeInfo = await plugin.getTypeInfo(expression, location);
    if (!typeInfo) {
      return new SDK.RemoteObject.LocalJSONObject(undefined);
    }
    const {base, typeInfos} = typeInfo;
    const sourceType = SourceType.create(typeInfos);
    if (!sourceType) {
      return new SDK.RemoteObject.LocalJSONObject(undefined);
    }
    if (sourceType.typeInfo.hasValue && !sourceType.typeInfo.canExpand && base) {
      return EvalNode.evaluate(callFrame, plugin, base, []);
    }

    return new EvalNode(callFrame, plugin, sourceType, base, []);
  }

  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {!DebuggerLanguagePlugin} plugin
   * @param {!SourceType} sourceType
   * @param {?EvalBase} base
   * @param {!Array<!FieldInfo>} fieldChain
   */
  constructor(callFrame, plugin, sourceType, base, fieldChain) {
    const typeName = sourceType.typeInfo.typeNames[0] || '<anonymous>';
    const variableType = 'object';
    super(
        callFrame.debuggerModel.runtimeModel(), /* objectId=*/ undefined,
        /* type=*/ variableType,
        /* subtype=*/ undefined, /* value=*/ null, /* unserializableValue=*/ undefined,
        /* description=*/ typeName);
    this._variableType = variableType;
    this._callFrame = callFrame;
    this._plugin = plugin;
    /** @type {!SourceType} */
    this._sourceType = sourceType;
    this._base = base;
    this._fieldChain = fieldChain;
    this._hasChildren = true;  // FIXME for top-level stuff with a value
  }

  /**
   * @override
   * @return {string}
   */
  get type() {
    return this._variableType;
  }

  /**
   * @param {!SourceType} sourceType
   * @param {!FieldInfo} fieldInfo
   * @return {!Promise<!SDK.RemoteObject.RemoteObject>}
   */
  async _expandMember(sourceType, fieldInfo) {
    if (sourceType.typeInfo.hasValue && !sourceType.typeInfo.canExpand && this._base) {
      return EvalNode.evaluate(this._callFrame, this._plugin, this._base, this._fieldChain.concat(fieldInfo));
    }
    return new EvalNode(this._callFrame, this._plugin, sourceType, this._base, this._fieldChain.concat(fieldInfo));
  }

  /**
   * @override
   * @param {boolean} ownProperties
   * @param {boolean} accessorPropertiesOnly
   * @param {boolean} generatePreview
   * @return {!Promise<!SDK.RemoteObject.GetPropertiesResult>}
   */
  async doGetProperties(ownProperties, accessorPropertiesOnly, generatePreview) {
    const {typeInfo} = this._sourceType;
    if (accessorPropertiesOnly || !typeInfo.canExpand) {
      return /** @type {!SDK.RemoteObject.GetPropertiesResult} */ ({properties: [], internalProperties: []});
    }

    if (typeInfo.members.length > 0) {
      if (typeInfo.arraySize > 0) {
        const {typeId} = this._sourceType.typeInfo.members[0];
        /** @type {!Array<!SDK.RemoteObject.RemoteObjectProperty>} */
        const properties = [];
        const elementTypeInfo = this._sourceType.members[0];
        for (let i = 0; i < typeInfo.arraySize; ++i) {
          const name = `${i}`;
          const elementField = {name, typeId, offset: elementTypeInfo.typeInfo.size * i};
          properties.push(new SDK.RemoteObject.RemoteObjectProperty(
              name, await this._expandMember(elementTypeInfo, elementField), /* enumerable=*/ false,
              /* writable=*/ false,
              /* isOwn=*/ true,
              /* wasThrown=*/ false));
        }
        return /** @type {!SDK.RemoteObject.GetPropertiesResult} */ ({properties, internalProperties: []});
      }

      // The node is expanded, just make remote objects for its members
      const members = Promise.all(this._sourceType.members.map(async (memberTypeInfo, idx) => {
        const fieldInfo = this._sourceType.typeInfo.members[idx];
        const propertyObject = await this._expandMember(memberTypeInfo, fieldInfo);
        const name = fieldInfo.name || '';
        return new SDK.RemoteObject.RemoteObjectProperty(
            name, propertyObject, /* enumerable=*/ false, /* writable=*/ false, /* isOwn=*/ true,
            /* wasThrown=*/ false);
      }));
      return /** @type {!SDK.RemoteObject.GetPropertiesResult} */ ({properties: await members, internalProperties: []});
    }


    return /** @type {!SDK.RemoteObject.GetPropertiesResult} */ ({properties: [], internalProperties: []});
  }
}

class NamespaceObject extends SDK.RemoteObject.LocalJSONObject {
  /**
   * @param {*} value
   */
  constructor(value) {
    super(value);
  }

  /**
   * @override
   * @return {string}
   */
  get description() {
    return this.type;
  }

  /**
   * @override
   * @return {string}
   */
  get type() {
    return 'namespace';
  }
}

class SourceScopeRemoteObject extends SDK.RemoteObject.RemoteObjectImpl {
  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {!DebuggerLanguagePlugin} plugin
   * @param {!RawLocation} location
   */
  constructor(callFrame, plugin, location) {
    super(callFrame.debuggerModel.runtimeModel(), undefined, 'object', undefined, null);
    /** @type {!Array<!Variable>} */
    this.variables = [];
    this._callFrame = callFrame;
    this._plugin = plugin;
    this._location = location;
  }

  /**
   * @override
   * @param {boolean} ownProperties
   * @param {boolean} accessorPropertiesOnly
   * @param {boolean} generatePreview
   * @return {!Promise<!SDK.RemoteObject.GetPropertiesResult>}
   */
  async doGetProperties(ownProperties, accessorPropertiesOnly, generatePreview) {
    if (accessorPropertiesOnly) {
      return /** @type {!SDK.RemoteObject.GetPropertiesResult} */ ({properties: [], internalProperties: []});
    }

    const properties = [];
    /** @type {!Object<string, !SDK.RemoteObject.RemoteObject>} */
    const namespaces = {};

    /**
     * @param {string} name
     * @param {!SDK.RemoteObject.RemoteObject} obj
     */
    function makeProperty(name, obj) {
      return new SDK.RemoteObject.RemoteObjectProperty(
          name, obj,
          /* enumerable=*/ false, /* writable=*/ false, /* isOwn=*/ true, /* wasThrown=*/ false);
    }

    for (const variable of this.variables) {
      const sourceVar = await EvalNode.get(this._callFrame, this._plugin, variable.name);
      if (variable.nestedName && variable.nestedName.length > 1) {
        let parent = namespaces;
        for (let index = 0; index < variable.nestedName.length - 1; index++) {
          const nestedName = variable.nestedName[index];
          let child = parent[nestedName];
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
      properties.push(makeProperty(namespace, /** @type {!SDK.RemoteObject.RemoteObject} */ (namespaces[namespace])));
    }

    return /** @type {!SDK.RemoteObject.GetPropertiesResult} */ ({properties: properties, internalProperties: []});
  }
}

/**
 * @implements {SDK.DebuggerModel.ScopeChainEntry}
 */
export class SourceScope {
  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {string} type
   * @param {string} typeName
   * @param {string|undefined} icon
   * @param {!DebuggerLanguagePlugin} plugin
   * @param {!RawLocation} location
   */
  constructor(callFrame, type, typeName, icon, plugin, location) {
    this._callFrame = callFrame;
    this._type = type;
    this._typeName = typeName;
    this._icon = icon;
    this._object = new SourceScopeRemoteObject(callFrame, plugin, location);
    this._name = type;
    /** @type {?SDK.DebuggerModel.Location} */
    this._startLocation = null;
    /** @type {?SDK.DebuggerModel.Location} */
    this._endLocation = null;
  }

  /**
   * @param {string} name
   * @return {!Promise<?SDK.RemoteObject.RemoteObject>}
   */
  async getVariableValue(name) {
    for (let v = 0; v < this._object.variables.length; ++v) {
      if (this._object.variables[v].name !== name) {
        continue;
      }
      const properties = await this._object.getAllProperties(false, false);
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

  /**
   * @override
   * @return {!SDK.DebuggerModel.CallFrame}
   */
  callFrame() {
    return this._callFrame;
  }

  /**
   * @override
   * @return {string}
   */
  type() {
    return this._type;
  }

  /**
   * @override
   * @return {string}
   */
  typeName() {
    return this._typeName;
  }

  /**
   * @override
   * @return {string|undefined}
   */
  name() {
    return undefined;
  }

  /**
   * @override
   * @return {?SDK.DebuggerModel.Location}
   */
  startLocation() {
    return this._startLocation;
  }

  /**
   * @override
   * @return {?SDK.DebuggerModel.Location}
   */
  endLocation() {
    return this._endLocation;
  }

  /**
   * @override
   * @return {!SourceScopeRemoteObject}
   */
  object() {
    return this._object;
  }

  /**
   * @override
   * @return {string}
   */
  description() {
    return '';
  }

  /**
   * @override
   */
  icon() {
    return this._icon;
  }
}

/**
 * @unrestricted
 */
export class DebuggerLanguagePluginManager {
  /**
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @param {!Workspace.Workspace.WorkspaceImpl} workspace
   * @param {!DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   */
  constructor(debuggerModel, workspace, debuggerWorkspaceBinding) {
    this._sourceMapManager = debuggerModel.sourceMapManager();
    this._debuggerModel = debuggerModel;
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    /** @type {!Array<!DebuggerLanguagePlugin>} */
    this._plugins = [];
    // TODO(crbug.com/1122000): Break cycle between bindings and extensions
    // @ts-expect-error
    for (const extension of self.Extensions.extensionServer.languageExtensionEndpoints) {
      this._plugins.push(extension);
    }

    /** @type {!Map<!Workspace.UISourceCode.UISourceCode, !Array<!{sourceFileURL: string, script: !SDK.Script.Script}>>} */
    this._uiSourceCodes = new Map();
    /** @type {!Map<string, !Promise<?DebuggerLanguagePlugin>>} */
    this._pluginForScriptId = new Map();

    /** @type {!Set<!SDK.Script.Script>} */
    this._unhandledScripts = new Set();

    const target = this._debuggerModel.target();
    this._project = new ContentProviderBasedProject(
        workspace, 'language_plugins::' + target.id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    NetworkProject.setTargetForProject(this._project, target);


    this._eventHandlers = [
      this._debuggerModel.addEventListener(
          SDK.DebuggerModel.Events.ParsedScriptSource, this._newScriptSourceListener, this),
      // TODO(crbug.com/1122000): Break cycle between bindings and extensions
      // @ts-expect-error
      self.Extensions.extensionServer.addEventListener(
          // @ts-expect-error
          Extensions.ExtensionServer.Events.LanguageExtensionEndpointAdded, this._languageExtensionPluginAdded, this)
    ];
  }

  clearPlugins() {
    this._plugins = [];
  }

  /**
   * @param {!DebuggerLanguagePlugin} plugin
   */
  addPlugin(plugin) {
    this._plugins.push(plugin);
    const scripts = [];
    for (const script of this._unhandledScripts) {
      if (plugin.handleScript(script)) {
        scripts.push(script);
        this._unhandledScripts.delete(script);
      }
    }
    scripts.forEach(script => this._pluginForScriptId.set(script.scriptId, this._loadScript(plugin, script)));
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _languageExtensionPluginAdded(event) {
    this.addPlugin(/** @type {!DebuggerLanguagePlugin} */ (event.data));
  }

  /**
   * @param {!SDK.Script.Script} script
   * @return {boolean}
   */
  hasPluginForScript(script) {
    return this._pluginForScriptId.has(script.scriptId);
  }

  /**
   * @param {!SDK.Script.Script} script
   * @return {!Promise<?DebuggerLanguagePlugin>}
   */
  _getPluginForScript(script) {
    return Promise.resolve(this._pluginForScriptId.get(script.scriptId) || null);
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {!Promise<?Workspace.UISourceCode.UILocation>}
   */
  async rawLocationToUILocation(rawLocation) {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }
    const plugin = await this._getPluginForScript(script);
    if (!plugin) {
      return null;
    }

    const pluginLocation = {
      rawModuleId: script.sourceURL,
      // RawLocation.columnNumber is the byte offset in the full raw wasm module. Plugins expect the offset in the code
      // section, so subtract the offset of the code section in the module here.
      codeOffset: rawLocation.columnNumber - (script.codeOffset() || 0),
      inlineFrameIndex: rawLocation.inlineFrameIndex
    };

    let sourceLocations;
    try {
      sourceLocations = await plugin.rawLocationToSourceLocation(pluginLocation);
    } catch (error) {
      Common.Console.Console.instance().error(ls`Error in debugger language plugin: ${error.message}`);
      return null;
    }

    if (!sourceLocations || sourceLocations.length === 0) {
      return null;
    }

    // TODO(chromium:1044536) Support multiple UI locations.
    const sourceLocation = sourceLocations[0];

    const uiSourceCode = this._project.uiSourceCodeForURL(sourceLocation.sourceFileURL);
    if (!uiSourceCode) {
      return null;
    }
    return uiSourceCode.uiLocation(
        sourceLocation.lineNumber, sourceLocation.columnNumber >= 0 ? sourceLocation.columnNumber : undefined);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Promise<?Array<!{start: !SDK.DebuggerModel.Location, end: !SDK.DebuggerModel.Location}>>} Returns null if this manager does not have a plugin for it.
   */
  async uiLocationToRawLocationRanges(uiSourceCode, lineNumber, columnNumber) {
    const mappedSourceFiles = this._uiSourceCodes.get(uiSourceCode);
    if (!mappedSourceFiles) {
      return null;
    }

    const locationPromises = [];
    for (const {sourceFileURL, script} of mappedSourceFiles) {
      const plugin = await this._getPluginForScript(script);
      if (plugin) {
        locationPromises.push(getLocations(this._debuggerModel, plugin, sourceFileURL, script));
      }
    }

    if (locationPromises.length === 0) {
      return null;
    }

    try {
      return (await Promise.all(locationPromises)).flat();
    } catch (error) {
      Common.Console.Console.instance().error(ls`Error in debugger language plugin: ${error.message}`);
      return null;
    }

    /**
       * @return {!Promise<!Array<!{start: !SDK.DebuggerModel.Location, end: !SDK.DebuggerModel.Location}>>}
       * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
       * @param {!DebuggerLanguagePlugin} plugin
       * @param {string} sourceFileURL
       * @param {!SDK.Script.Script} script
       */
    async function getLocations(debuggerModel, plugin, sourceFileURL, script) {
      const pluginLocation = {rawModuleId: script.sourceURL, sourceFileURL, lineNumber, columnNumber};

      const rawLocations = await plugin.sourceLocationToRawLocation(pluginLocation);
      if (!rawLocations || rawLocations.length === 0) {
        return [];
      }

      return rawLocations.map(
          m => ({
            start: new SDK.DebuggerModel.Location(
                debuggerModel, script.scriptId, 0, Number(m.startOffset) + (script.codeOffset() || 0)),
            end: new SDK.DebuggerModel.Location(
                debuggerModel, script.scriptId, 0, Number(m.endOffset) + (script.codeOffset() || 0))
          }));
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Promise<?Array<!SDK.DebuggerModel.Location>>} Returns null if this manager does not have a plugin for it.
   */
  async uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    const locationRanges = await this.uiLocationToRawLocationRanges(uiSourceCode, lineNumber, columnNumber);
    if (!locationRanges) {
      return null;
    }
    return locationRanges.map(({start}) => start);
  }

  /**
     * @param {!SDK.Script.Script} script
     * @return {!Promise<?RawModule>}
     */
  async _getRawModule(script) {
    if (!script.sourceURL.startsWith('wasm://')) {
      return {url: script.sourceURL, code: undefined};
    }
    if (script.sourceMapURL === SDK.SourceMap.WasmSourceMap.FAKE_URL) {
      return {code: await script.getWasmBytecode(), url: script.sourceURL};
    }
    return null;
  }

  /**
   * @param {string} sourceFileURL
   * @param {!SDK.Script.Script} script
   * @return {!Workspace.UISourceCode.UISourceCode}
   */
  _getOrCreateUISourceCode(sourceFileURL, script) {
    let uiSourceCode = this._project.uiSourceCodeForURL(sourceFileURL);
    if (uiSourceCode) {
      return uiSourceCode;
    }

    uiSourceCode = this._project.createUISourceCode(sourceFileURL, Common.ResourceType.resourceTypes.SourceMapScript);
    NetworkProject.setInitialFrameAttribution(uiSourceCode, script.frameId);
    const contentProvider = new SDK.CompilerSourceMappingContentProvider.CompilerSourceMappingContentProvider(
        sourceFileURL, Common.ResourceType.resourceTypes.SourceMapScript, script.createPageResourceLoadInitiator());
    this._bindUISourceCode(uiSourceCode, script, sourceFileURL);

    const mimeType = Common.ResourceType.ResourceType.mimeFromURL(sourceFileURL) || 'text/javascript';
    this._project.addUISourceCodeWithProvider(uiSourceCode, contentProvider, null, mimeType);
    return uiSourceCode;
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {!SDK.Script.Script} script
   * @param {string} sourceFileURL
   */
  _bindUISourceCode(uiSourceCode, script, sourceFileURL) {
    const entries = this._uiSourceCodes.get(uiSourceCode);
    if (entries) {
      entries.push({sourceFileURL, script});
    } else {
      this._uiSourceCodes.set(uiSourceCode, [{sourceFileURL, script}]);
    }
    uiSourceCodeToScriptMap.set(uiSourceCode, script);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {!SDK.Script.Script} deletedScript
   */
  _unbindUISourceCode(uiSourceCode, deletedScript) {
    uiSourceCodeToScriptMap.delete(uiSourceCode);
    const entry = this._uiSourceCodes.get(uiSourceCode);
    if (!entry) {
      return;
    }
    const remainingEntries = entry.filter(({script}) => script !== deletedScript);
    this._uiSourceCodes.set(uiSourceCode, remainingEntries);
    if (remainingEntries.length === 0) {
      this._project.removeFile(uiSourceCode.url());
      this._uiSourceCodes.delete(uiSourceCode);
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {?SDK.Script.Script}
   */
  static uiSourceCodeOriginScript(uiSourceCode) {
    return uiSourceCodeToScriptMap.get(uiSourceCode) || null;
  }

  /**
   * @param {!DebuggerLanguagePlugin} plugin
   * @param {!SDK.Script.Script} script
   */
  async _loadScript(plugin, script) {
    const rawModule = await this._getRawModule(script);
    if (!rawModule) {
      return null;
    }
    const symbolsUrl = (!script.debugSymbols ? script.sourceMapURL : script.debugSymbols.externalURL) || '';
    try {
      const sourceFileURLs = await plugin.addRawModule(script.sourceURL, symbolsUrl, rawModule);
      for (const sourceFileURL of sourceFileURLs) {
        this._getOrCreateUISourceCode(sourceFileURL, script);
      }
      this._debuggerWorkspaceBinding.updateLocations(script);
      return plugin;
    } catch (error) {
      Common.Console.Console.instance().error(ls`Error in debugger language plugin: ${error.message}`);
      return null;
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _newScriptSourceListener(event) {
    const script = /** @type {!SDK.Script.Script} */ (event.data);

    // TODO(bmeurer): Limit ourselves to WebAssembly for now, so that we don't
    // accidentally mess up JavaScript source mapping while we're stabilizing.
    if (!script.isWasm() || !script.sourceURL) {
      return;
    }

    for (const plugin of this._plugins) {
      if (plugin.handleScript(script)) {
        this._pluginForScriptId.set(script.scriptId, this._loadScript(plugin, script));
        return;
      }
    }

    this._unhandledScripts.add(script);
  }

  dispose() {
    this._project.dispose();
    for (const plugin of this._plugins) {
      if (plugin.dispose) {
        plugin.dispose();
      }
    }
    this._pluginForScriptId.clear();
    this._uiSourceCodes.clear();
  }

  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @return {!Promise<?Array<!SourceScope>>}
   */
  async resolveScopeChain(callFrame) {
    if (!callFrame) {
      return null;
    }
    const script = callFrame.script;
    const plugin = await this._getPluginForScript(script);
    if (!plugin) {
      return null;
    }
    /** @type {!Map<string, !SourceScope>} */
    const scopes = new Map();
    const location = getRawLocation(callFrame);

    try {
      const variables = await plugin.listVariablesInScope(location);
      for (const variable of variables || []) {
        let scope = scopes.get(variable.scope);
        if (!scope) {
          const {type, typeName, icon} = await plugin.getScopeInfo(variable.scope);
          scope = new SourceScope(callFrame, type, typeName, icon, plugin, location);
          scopes.set(variable.scope, scope);
        }
        scope.object().variables.push(variable);
      }
      return Array.from(scopes.values());
    } catch (error) {
      Common.Console.Console.instance().error(ls`Error in debugger language plugin: ${error.message}`);
      return null;
    }
  }

  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @return {!Promise<!{frames: !Array<!FunctionInfo>}>}
   */
  async getFunctionInfo(callFrame) {
    const noDwarfInfo = {frames: []};
    if (!callFrame) {
      return noDwarfInfo;
    }
    const script = callFrame.script;
    const plugin = await this._getPluginForScript(script);
    if (!plugin) {
      return noDwarfInfo;
    }
    /** @type {!RawLocation}} */
    const location = {
      'rawModuleId': script.sourceURL,
      'codeOffset': callFrame.location().columnNumber - (script.codeOffset() || 0),
      // TODO(crbug.com/1134110): Once closure->typescript migration is complete, delete this and
      // change type definition to show that this field is optional.
      'inlineFrameIndex': undefined
    };

    try {
      return await plugin.getFunctionInfo(location);
    } catch (error) {
      Common.Console.Console.instance().warn(ls`Error in debugger language plugin: ${error.message}`);
      return noDwarfInfo;
    }
  }

  /**
   * @param {string} expression
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @returns {!Promise<?SDK.RuntimeModel.EvaluationResult>}
   */
  async evaluateExpression(expression, callFrame) {
    const script = callFrame.script;
    const plugin = await this._getPluginForScript(script);
    if (!plugin) {
      return null;
    }

    try {
      return {object: await EvalNode.get(callFrame, plugin, expression), exceptionDetails: undefined};
    } catch (error) {
      return {error: error.message};
    }
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {!Promise<!Array<!{start: !SDK.DebuggerModel.Location, end: !SDK.DebuggerModel.Location}>>} Returns an empty list if this manager does not have a plugin for it.
   */
  async getInlinedFunctionRanges(rawLocation) {
    const script = rawLocation.script();
    if (!script) {
      return [];
    }
    const plugin = await this._getPluginForScript(script);
    if (!plugin) {
      return [];
    }

    const pluginLocation = {
      rawModuleId: script.sourceURL,
      // RawLocation.columnNumber is the byte offset in the full raw wasm module. Plugins expect the offset in the code
      // section, so subtract the offset of the code section in the module here.
      codeOffset: rawLocation.columnNumber - (script.codeOffset() || 0),
      // TODO(crbug.com/1134110): Once closure->typescript migration is complete, delete this and
      // change type definition to show that this field is optional.
      'inlineFrameIndex': undefined
    };

    try {
      const locations = await plugin.getInlinedFunctionRanges(pluginLocation);
      return locations.map(
          m => ({
            start: new SDK.DebuggerModel.Location(
                this._debuggerModel, script.scriptId, 0, Number(m.startOffset) + (script.codeOffset() || 0)),
            end: new SDK.DebuggerModel.Location(
                this._debuggerModel, script.scriptId, 0, Number(m.endOffset) + (script.codeOffset() || 0))
          }));
    } catch (error) {
      Common.Console.Console.instance().warn(ls`Error in debugger language plugin: ${error.message}`);
      return [];
    }
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {!Promise<!Array<!{start: !SDK.DebuggerModel.Location, end: !SDK.DebuggerModel.Location}>>} Returns an empty list if this manager does not have a plugin for it.
   */
  async getInlinedCalleesRanges(rawLocation) {
    const script = rawLocation.script();
    if (!script) {
      return [];
    }
    const plugin = await this._getPluginForScript(script);
    if (!plugin) {
      return [];
    }

    const pluginLocation = {
      rawModuleId: script.sourceURL,
      // RawLocation.columnNumber is the byte offset in the full raw wasm module. Plugins expect the offset in the code
      // section, so subtract the offset of the code section in the module here.
      codeOffset: rawLocation.columnNumber - (script.codeOffset() || 0),
      // TODO(crbug.com/1134110): Once closure->typescript migration is complete, delete this and
      // change type definition to show that this field is optional.
      'inlineFrameIndex': undefined
    };

    try {
      const locations = await plugin.getInlinedCalleesRanges(pluginLocation);
      return locations.map(
          m => ({
            start: new SDK.DebuggerModel.Location(
                this._debuggerModel, script.scriptId, 0, Number(m.startOffset) + (script.codeOffset() || 0)),
            end: new SDK.DebuggerModel.Location(
                this._debuggerModel, script.scriptId, 0, Number(m.endOffset) + (script.codeOffset() || 0))
          }));
    } catch (error) {
      Common.Console.Console.instance().warn(ls`Error in debugger language plugin: ${error.message}`);
      return [];
    }
  }

  /**
   * @param {!SDK.Script.Script} script
   * @return {!Promise<void>}
   */
  async removeScript(script) {
    const pluginPromise = this._pluginForScriptId.get(script.scriptId);
    if (!pluginPromise) {
      return;
    }
    this._pluginForScriptId.delete(script.scriptId);
    const plugin = await pluginPromise;
    if (!plugin) {
      return;
    }

    try {
      await plugin.removeRawModule(script.sourceURL);
    } catch (error) {
      Common.Console.Console.instance().error(ls`Error in debugger language plugin: ${error.message}`);
    }
    for (const uiSourceCode of this._uiSourceCodes.keys()) {
      this._unbindUISourceCode(uiSourceCode, script);
    }
  }
}

/** Raw modules represent compiled JavaScript Scripts or Wasm Modules
 * @typedef {{
 *            url: string,
 *            code: (ArrayBuffer|undefined)
 *          }}
 */
// @ts-ignore typedef
export let RawModule;

/** Code ranges in raw modules
 * @typedef {{
 *            rawModuleId:string,
 *            startOffset:number,
 *            endOffset:number
 *          }}
 */
// @ts-ignore typedef
export let RawLocationRange;

/** Offsets in raw modules
 * @typedef {{
 *            rawModuleId: string,
 *            codeOffset: number,
 *            inlineFrameIndex: (number|undefined)
 *          }}
 */
// @ts-ignore typedef
export let RawLocation;

/** Locations in source files
 * @typedef {{
 *            rawModuleId: string,
 *            sourceFileURL: string,
 *            lineNumber: number,
 *            columnNumber: number
 *          }}
 */
// @ts-ignore typedef
export let SourceLocation;

/** A source language variable
 * @typedef {{
 *            scope: string,
 *            name: string,
 *            type: string,
 *            nestedName: ?Array<string>
 *          }}
 */
// @ts-ignore typedef
export let Variable;

/** The value of a source language variable
 * @typedef {{
 *            value: (string|!Array<!VariableValue>),
 *            js_type: string,
 *            type: string,
 *            name: string
 *          }}
 */
// @ts-ignore typedef
export let VariableValue;


/** Either the code of an evaluator module or a constant representation of a variable
 * @typedef {{
 *            code: (!ArrayBuffer|undefined),
 *            constantValue: (!VariableValue|undefined)
 *          }}
 */
// @ts-ignore typedef
export let EvaluatorModule;

/** Description of a scope
 * @typedef {{
 *            type: string,
 *            typeName: string,
 *            icon: (string|undefined)
 *          }}
 */
// @ts-ignore typedef
export let ScopeInfo;

/** Either the code of an evaluator module or a constant representation of a variable
 * @typedef {{
 *            name: string
 *          }}
 */
// @ts-ignore typedef
export let FunctionInfo;

/**
 * @typedef {{
 *            name: (string|undefined),
 *            offset: number,
 *            typeId: *
 *}}
 */
// @ts-ignore typedef
export let FieldInfo;
/**
 * @typedef {{
 *            typeNames: !Array<string>,
 *            typeId: *,
 *            members: !Array<!FieldInfo>,
 *            alignment: number,
 *            arraySize: number,
 *            size: number,
 *            canExpand: boolean,
 *            hasValue: boolean
 *          }}
 */
// @ts-ignore typedef
export let TypeInfo;

/**
 * @typedef {{
 *            rootType: TypeInfo,
 *            payload: *
 *}}
*/
// @ts-ignore typedef
export let EvalBase;

/**
 * @interface
 */
export class DebuggerLanguagePlugin {
  /**
   * @param {!SDK.Script.Script} script
   * @return {boolean} True if this plugin should handle this script
   */
  handleScript(script) {
    throw new Error('Not implemented yet');
  }

  dispose() {
  }

  /** Notify the plugin about a new script
   * @param {string} rawModuleId
   * @param {string} symbolsURL - URL of a file providing the debug symbols for this module
   * @param {!RawModule} rawModule
   * @return {!Promise<!Array<string>>} - An array of URLs for the source files for the raw module
  */
  async addRawModule(rawModuleId, symbolsURL, rawModule) {
    throw new Error('Not implemented yet');
  }

  /** Find locations in raw modules from a location in a source file
   * @param {!SourceLocation} sourceLocation
   * @return {!Promise<!Array<!RawLocationRange>>}
  */
  async sourceLocationToRawLocation(sourceLocation) {
    throw new Error('Not implemented yet');
  }

  /** Find locations in source files from a location in a raw module
   * @param {!RawLocation} rawLocation
   * @return {!Promise<!Array<!SourceLocation>>}
  */
  async rawLocationToSourceLocation(rawLocation) {
    throw new Error('Not implemented yet');
  }

  /** Return detailed information about a scope
   * @param {string} type
   * @return {!Promise<!ScopeInfo>}
   */
  async getScopeInfo(type) {
    throw new Error('Not implemented yet');
  }

  /** List all variables in lexical scope at a given location in a raw module
   * @param {!RawLocation} rawLocation
   * @return {!Promise<!Array<!Variable>>}
  */
  async listVariablesInScope(rawLocation) {
    throw new Error('Not implemented yet');
  }

  /** Evaluate the content of a variable in a given lexical scope
   * @param {string} name
   * @param {!RawLocation} location
   * @return {!Promise<?EvaluatorModule>}
  */
  async evaluateVariable(name, location) {
    throw new Error('Not implemented yet');
  }

  /**
   * Notifies the plugin that a script is removed.
   * @param {string} rawModuleId
   * @return {!Promise<void>}
   */
  removeRawModule(rawModuleId) {
    throw new Error('Not implemented yet');
  }

  /**
   * @param {string} expression
   * @param {!RawLocation} context
   * @return {!Promise<?{typeInfos: !Array<!TypeInfo>, base: !EvalBase}>}
   */
  getTypeInfo(expression, context) {
    throw new Error('Not implemented yet');
  }

  /**
   * @param {string|!{base: !EvalBase, field: !Array<!FieldInfo>}} expressionOrField
   * @param {!RawLocation} context
   * @return {!Promise<?{js:string}>}
   */
  getFormatter(expressionOrField, context) {
    throw new Error('Not implemented yet');
  }

  /** Find locations in source files from a location in a raw module
   * @param {!RawLocation} rawLocation
   * @return {!Promise<!{frames: !Array<!FunctionInfo>}>}
  */
  async getFunctionInfo(rawLocation) {
    throw new Error('Not implemented yet');
  }

  /** Find locations in raw modules corresponding to the inline function
   *  that rawLocation is in. Used for stepping out of an inline function.
   * @param {!RawLocation} rawLocation
   * @return {!Promise<!Array<!RawLocationRange>>}
  */
  async getInlinedFunctionRanges(rawLocation) {
    throw new Error('Not implemented yet');
  }

  /** Find locations in raw modules corresponding to inline functions
   *  called by the function or inline frame that rawLocation is in.
   *  Used for stepping over inline functions.
   * @param {!RawLocation} rawLocation
   * @return {!Promise<!Array<!RawLocationRange>>}
  */
  async getInlinedCalleesRanges(rawLocation) {
    throw new Error('Not implemented yet');
  }
}
