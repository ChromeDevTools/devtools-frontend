// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { ExtensionEndpoint } from './ExtensionEndpoint.js';
const isObject = (value) => typeof value === 'object' && value !== null;
const isString = (value) => typeof value === 'string';
const isNumber = (value) => typeof value === 'number';
const isBoolean = (value) => typeof value === 'boolean';
const isStringArray = (value) => Array.isArray(value) && value.every(isString);
const isNumberArray = (value) => Array.isArray(value) && value.every(isNumber);
const isRawLocationRange = (value) => {
    return isObject(value) && isString(value.rawModuleId) && isNumber(value.startOffset) && isNumber(value.endOffset);
};
const isSourceLocation = (value) => {
    return isObject(value) && isString(value.rawModuleId) && isString(value.sourceFileURL) &&
        isNumber(value.lineNumber) && isNumber(value.columnNumber);
};
const isVariable = (value) => {
    return isObject(value) && isString(value.scope) && isString(value.name) && isString(value.type) &&
        (value.nestedName === undefined || isStringArray(value.nestedName));
};
const isScopeInfo = (value) => {
    return isObject(value) && isString(value.type) && isString(value.typeName) &&
        (value.icon === undefined || isString(value.icon));
};
const isFunctionInfo = (value) => {
    return isObject(value) && isString(value.name);
};
const isForeignObject = (value) => {
    return isObject(value) && value.type === 'reftype' &&
        (value.valueClass === 'local' || value.valueClass === 'global' || value.valueClass === 'operand') &&
        isNumber(value.index);
};
const isRemoteObject = (value) => {
    return isObject(value) &&
        (value.type === 'object' || value.type === 'undefined' || value.type === 'string' || value.type === 'number' ||
            value.type === 'boolean' || value.type === 'bigint' || value.type === 'array' || value.type === 'null') &&
        isBoolean(value.hasChildren) && (value.className === undefined || isString(value.className)) &&
        (value.description === undefined || isString(value.description)) &&
        (value.objectId === undefined || isString(value.objectId)) &&
        (value.linearMemoryAddress === undefined || isNumber(value.linearMemoryAddress)) &&
        (value.linearMemorySize === undefined || isNumber(value.linearMemorySize));
};
const isPropertyDescriptor = (value) => {
    return isObject(value) && isString(value.name) && (isRemoteObject(value.value) || isForeignObject(value.value));
};
const isAddRawModuleResult = (value) => {
    return isStringArray(value) || (isObject(value) && isStringArray(value.missingSymbolFiles));
};
const isGetFunctionInfoResult = (value) => {
    if (!isObject(value)) {
        return false;
    }
    if ('frames' in value && (!Array.isArray(value.frames) || !value.frames.every(isFunctionInfo))) {
        return false;
    }
    if ('missingSymbolFiles' in value && !isStringArray(value.missingSymbolFiles)) {
        return false;
    }
    return 'frames' in value || 'missingSymbolFiles' in value;
};
class LanguageExtensionEndpointImpl extends ExtensionEndpoint {
    plugin;
    #pluginManager;
    constructor(plugin, port, pluginManager) {
        super(port);
        this.plugin = plugin;
        this.#pluginManager = pluginManager;
    }
    handleEvent({ event }) {
        switch (event) {
            case "unregisteredLanguageExtensionPlugin" /* PrivateAPI.LanguageExtensionPluginEvents.UnregisteredLanguageExtensionPlugin */: {
                this.disconnect();
                this.#pluginManager.removePlugin(this.plugin);
                break;
            }
        }
    }
}
export class LanguageExtensionEndpoint {
    supportedScriptTypes;
    endpoint;
    extensionOrigin;
    allowFileAccess;
    name;
    constructor(allowFileAccess, extensionOrigin, name, supportedScriptTypes, port, pluginManager) {
        this.name = name;
        this.extensionOrigin = extensionOrigin;
        this.supportedScriptTypes = supportedScriptTypes;
        this.endpoint = new LanguageExtensionEndpointImpl(this, port, pluginManager);
        this.allowFileAccess = allowFileAccess;
    }
    canAccessURL(url) {
        try {
            return !url || this.allowFileAccess || new URL(url).protocol !== 'file:';
        }
        catch {
            // If the URL isn't valid, it also isn't a valid file url and it's safe to tell the extensions about it.
            return true;
        }
    }
    handleScript(script) {
        try {
            if (!this.canAccessURL(script.contentURL()) || (script.hasSourceURL && !this.canAccessURL(script.sourceURL)) ||
                (script.debugSymbols?.externalURL && !this.canAccessURL(script.debugSymbols.externalURL))) {
                return false;
            }
        }
        catch {
            return false;
        }
        const language = script.scriptLanguage();
        return language !== null && script.debugSymbols !== null && language === this.supportedScriptTypes.language &&
            this.supportedScriptTypes.symbol_types.includes(script.debugSymbols.type);
    }
    createPageResourceLoadInitiator() {
        return {
            target: null,
            frameId: null,
            extensionId: this.extensionOrigin,
            initiatorUrl: this.extensionOrigin,
        };
    }
    /**
     * Notify the plugin about a new script
     */
    addRawModule(rawModuleId, symbolsURL, rawModule) {
        if (!this.canAccessURL(symbolsURL) || !this.canAccessURL(rawModule.url)) {
            return Promise.resolve([]);
        }
        return this.endpoint.sendRequest("addRawModule" /* PrivateAPI.LanguageExtensionPluginCommands.AddRawModule */, { rawModuleId, symbolsURL, rawModule }, isAddRawModuleResult);
    }
    /**
     * Notifies the plugin that a script is removed.
     */
    removeRawModule(rawModuleId) {
        return this.endpoint.sendRequest("removeRawModule" /* PrivateAPI.LanguageExtensionPluginCommands.RemoveRawModule */, { rawModuleId });
    }
    /**
     * Find locations in raw modules from a location in a source file
     */
    sourceLocationToRawLocation(sourceLocation) {
        return this.endpoint.sendRequest("sourceLocationToRawLocation" /* PrivateAPI.LanguageExtensionPluginCommands.SourceLocationToRawLocation */, { sourceLocation }, (value) => Array.isArray(value) && value.every(isRawLocationRange));
    }
    /**
     * Find locations in source files from a location in a raw module
     */
    rawLocationToSourceLocation(rawLocation) {
        return this.endpoint.sendRequest("rawLocationToSourceLocation" /* PrivateAPI.LanguageExtensionPluginCommands.RawLocationToSourceLocation */, { rawLocation }, (value) => Array.isArray(value) && value.every(isSourceLocation));
    }
    getScopeInfo(type) {
        return this.endpoint.sendRequest("getScopeInfo" /* PrivateAPI.LanguageExtensionPluginCommands.GetScopeInfo */, { type }, isScopeInfo);
    }
    /**
     * List all variables in lexical scope at a given location in a raw module
     */
    listVariablesInScope(rawLocation) {
        return this.endpoint.sendRequest("listVariablesInScope" /* PrivateAPI.LanguageExtensionPluginCommands.ListVariablesInScope */, { rawLocation }, (value) => Array.isArray(value) && value.every(isVariable));
    }
    /**
     * List all function names (including inlined frames) at location
     */
    getFunctionInfo(rawLocation) {
        return this.endpoint.sendRequest("getFunctionInfo" /* PrivateAPI.LanguageExtensionPluginCommands.GetFunctionInfo */, { rawLocation }, isGetFunctionInfoResult);
    }
    /**
     * Find locations in raw modules corresponding to the inline function
     *  that rawLocation is in.
     */
    getInlinedFunctionRanges(rawLocation) {
        return this.endpoint.sendRequest("getInlinedFunctionRanges" /* PrivateAPI.LanguageExtensionPluginCommands.GetInlinedFunctionRanges */, { rawLocation }, (value) => Array.isArray(value) && value.every(isRawLocationRange));
    }
    /**
     * Find locations in raw modules corresponding to inline functions
     *  called by the function or inline frame that rawLocation is in.
     */
    getInlinedCalleesRanges(rawLocation) {
        return this.endpoint.sendRequest("getInlinedCalleesRanges" /* PrivateAPI.LanguageExtensionPluginCommands.GetInlinedCalleesRanges */, { rawLocation }, (value) => Array.isArray(value) && value.every(isRawLocationRange));
    }
    async getMappedLines(rawModuleId, sourceFileURL) {
        return await this.endpoint.sendRequest("getMappedLines" /* PrivateAPI.LanguageExtensionPluginCommands.GetMappedLines */, { rawModuleId, sourceFileURL }, (value) => value === undefined || isNumberArray(value));
    }
    async evaluate(expression, context, stopId) {
        return await this.endpoint.sendRequest("formatValue" /* PrivateAPI.LanguageExtensionPluginCommands.FormatValue */, { expression, context, stopId }, (value) => value === null || isRemoteObject(value) || isForeignObject(value));
    }
    getProperties(objectId) {
        return this.endpoint.sendRequest("getProperties" /* PrivateAPI.LanguageExtensionPluginCommands.GetProperties */, { objectId }, (value) => Array.isArray(value) && value.every(isPropertyDescriptor));
    }
    releaseObject(objectId) {
        return this.endpoint.sendRequest("releaseObject" /* PrivateAPI.LanguageExtensionPluginCommands.ReleaseObject */, { objectId });
    }
}
//# sourceMappingURL=LanguageExtensionEndpoint.js.map