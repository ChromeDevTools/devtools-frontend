// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { assertNotNullOrUndefined } from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
import { dispatchEvent, setMockConnectionResponseHandler, } from './MockConnection.js';
export class MockProtocolBackend {
    #scriptSources = new Map();
    #sourceMapContents = new Map();
    #objectProperties = new Map();
    #setBreakpointByUrlResponses = new Map();
    #removeBreakpointCallbacks = new Map();
    #nextObjectIndex = 0;
    #nextScriptIndex = 0;
    constructor() {
        // One time setup of the response handlers.
        setMockConnectionResponseHandler('Debugger.getScriptSource', this.#getScriptSourceHandler.bind(this));
        setMockConnectionResponseHandler('Runtime.getProperties', this.#getPropertiesHandler.bind(this));
        setMockConnectionResponseHandler('Debugger.setBreakpointByUrl', this.#setBreakpointByUrlHandler.bind(this));
        setMockConnectionResponseHandler('Storage.getStorageKey', () => ({ storageKey: 'test-key' }));
        setMockConnectionResponseHandler('Debugger.removeBreakpoint', this.#removeBreakpointHandler.bind(this));
        setMockConnectionResponseHandler('Debugger.resume', () => ({}));
        setMockConnectionResponseHandler('Debugger.enable', () => ({ debuggerId: 'DEBUGGER_ID' }));
        setMockConnectionResponseHandler('Debugger.setInstrumentationBreakpoint', () => ({}));
        SDK.PageResourceLoader.PageResourceLoader.instance({
            forceNew: true,
            loadOverride: async (url) => this.#loadSourceMap(url),
            maxConcurrentLoads: 1,
        });
    }
    dispatchDebuggerPause(script, reason, functionName = '', scopeChain = []) {
        const target = script.debuggerModel.target();
        if (reason === "instrumentation" /* Protocol.Debugger.PausedEventReason.Instrumentation */) {
            // Instrumentation pauses don't pass call frames, they only pass the script id in the 'data' field.
            dispatchEvent(target, 'Debugger.paused', {
                callFrames: [],
                reason,
                data: { scriptId: script.scriptId },
            });
        }
        else {
            const callFrames = [
                {
                    callFrameId: '1',
                    functionName,
                    url: script.sourceURL,
                    scopeChain,
                    location: {
                        scriptId: script.scriptId,
                        lineNumber: 0,
                    },
                    this: { type: 'object' },
                },
            ];
            dispatchEvent(target, 'Debugger.paused', {
                callFrames,
                reason,
            });
        }
    }
    dispatchDebuggerPauseWithNoCallFrames(target, reason) {
        dispatchEvent(target, 'Debugger.paused', {
            callFrames: [],
            reason,
        });
    }
    async addScript(target, scriptDescription, sourceMap) {
        const scriptId = 'SCRIPTID.' + this.#nextScriptIndex++;
        this.#scriptSources.set(scriptId, scriptDescription.content);
        const startLine = scriptDescription.startLine ?? 0;
        const startColumn = scriptDescription.startColumn ?? 0;
        const endLine = startLine + (scriptDescription.content.match(/^/gm)?.length ?? 1) - 1;
        let endColumn = scriptDescription.content.length - scriptDescription.content.lastIndexOf('\n') - 1;
        if (startLine === endLine) {
            endColumn += startColumn;
        }
        dispatchEvent(target, 'Debugger.scriptParsed', {
            scriptId: scriptId,
            url: scriptDescription.url,
            startLine,
            startColumn,
            endLine,
            endColumn,
            buildId: '',
            executionContextId: (scriptDescription?.executionContextId ?? 1),
            executionContextAuxData: { isDefault: !scriptDescription.isContentScript },
            hash: '',
            hasSourceURL: Boolean(scriptDescription.hasSourceURL),
            ...(sourceMap ? { sourceMapURL: sourceMap.url } : null),
            embedderName: scriptDescription.embedderName,
        });
        const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
        const scriptObject = debuggerModel.scriptForId(scriptId);
        assertNotNullOrUndefined(scriptObject);
        if (sourceMap) {
            let { content } = sourceMap;
            if (typeof content !== 'string') {
                content = JSON.stringify(content);
            }
            this.#sourceMapContents.set(sourceMap.url, content);
            // Wait until the source map loads.
            const loadedSourceMap = await debuggerModel.sourceMapManager().sourceMapForClientPromise(scriptObject);
            assert.strictEqual(loadedSourceMap?.url(), sourceMap.url);
        }
        return scriptObject;
    }
    #createProtocolLocation(scriptId, lineNumber, columnNumber) {
        return { scriptId: scriptId, lineNumber, columnNumber };
    }
    #createProtocolScope(type, object, scriptId, startLine, startColumn, endLine, endColumn) {
        return {
            type,
            object,
            startLocation: this.#createProtocolLocation(scriptId, startLine, startColumn),
            endLocation: this.#createProtocolLocation(scriptId, endLine, endColumn),
        };
    }
    createSimpleRemoteObject(properties) {
        const objectId = 'OBJECTID.' + this.#nextObjectIndex++;
        this.#objectProperties.set(objectId, properties);
        return { type: "object" /* Protocol.Runtime.RemoteObjectType.Object */, objectId: objectId };
    }
    // In the |scopeDescriptor|, '{' and '}' characters mark the positions of function
    // offset start and end, '<' and '>' mark the positions of the nested scope
    // start and end (if '<', '>' are missing then the nested scope is the function scope).
    // Other characters in |scopeDescriptor| are not significant (so that tests can use the other characters in
    // the descriptors to describe other assertions).
    async createCallFrame(target, script, scopeDescriptor, sourceMap, scopeObjects = []) {
        const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
        const scriptObject = await this.addScript(target, script, sourceMap);
        const parsedScopes = parseScopeChain(scopeDescriptor);
        const scopeChain = parsedScopes.map(s => this.#createProtocolScope(s.type, { type: "object" /* Protocol.Runtime.RemoteObjectType.Object */ }, scriptObject.scriptId, s.startLine, s.startColumn, s.endLine, s.endColumn));
        const innerScope = scopeChain[0];
        console.assert(scopeObjects.length < scopeChain.length);
        for (let i = 0; i < scopeObjects.length; ++i) {
            scopeChain[i].object = scopeObjects[i];
        }
        const payload = {
            callFrameId: '0',
            functionName: 'test',
            functionLocation: undefined,
            location: innerScope.startLocation,
            url: scriptObject.sourceURL,
            scopeChain,
            this: { type: 'object' },
            returnValue: undefined,
            canBeRestarted: false,
        };
        return new SDK.DebuggerModel.CallFrame(debuggerModel, scriptObject, payload, 0);
    }
    #getBreakpointKey(url, lineNumber) {
        return url + '@:' + lineNumber;
    }
    responderToBreakpointByUrlRequest(url, lineNumber) {
        let requestCallback = () => { };
        let responseCallback;
        const responsePromise = new Promise(resolve => {
            responseCallback = resolve;
        });
        const requestPromise = new Promise(resolve => {
            requestCallback = resolve;
        });
        const key = this.#getBreakpointKey(url, lineNumber);
        this.#setBreakpointByUrlResponses.set(key, { response: responsePromise, callback: requestCallback, isOneShot: true });
        return async (response) => {
            responseCallback(response);
            await requestPromise;
        };
    }
    setBreakpointByUrlToFail(url, lineNumber) {
        const key = this.#getBreakpointKey(url, lineNumber);
        const responsePromise = Promise.resolve({
            getError() {
                return 'Breakpoint error';
            },
        });
        this.#setBreakpointByUrlResponses.set(key, { response: responsePromise, callback: () => { }, isOneShot: false });
    }
    breakpointRemovedPromise(breakpointId) {
        return new Promise(resolve => this.#removeBreakpointCallbacks.set(breakpointId, resolve));
    }
    #getScriptSourceHandler(request) {
        const scriptSource = this.#scriptSources.get(request.scriptId);
        if (scriptSource) {
            return {
                scriptSource,
                getError() {
                    return undefined;
                },
            };
        }
        return {
            scriptSource: 'Unknown script',
            getError() {
                return 'Unknown script';
            },
        };
    }
    #setBreakpointByUrlHandler(request) {
        const key = this.#getBreakpointKey(request.url ?? '', request.lineNumber);
        const responseCallback = this.#setBreakpointByUrlResponses.get(key);
        if (responseCallback) {
            if (responseCallback.isOneShot) {
                this.#setBreakpointByUrlResponses.delete(key);
            }
            // Announce to the client that the breakpoint request arrived.
            responseCallback.callback();
            // Return the response promise.
            return responseCallback.response;
        }
        console.error('Unexpected setBreakpointByUrl request', request);
        const response = {
            breakpointId: 'INVALID',
            locations: [],
            getError() {
                return 'Unknown breakpoint';
            },
        };
        return Promise.resolve(response);
    }
    #removeBreakpointHandler(request) {
        const callback = this.#removeBreakpointCallbacks.get(request.breakpointId);
        if (callback) {
            callback();
        }
        return {};
    }
    #getPropertiesHandler(request) {
        const objectProperties = this.#objectProperties.get(request.objectId);
        if (!objectProperties) {
            return {
                result: [],
                getError() {
                    return 'Unknown object';
                },
            };
        }
        const result = [];
        for (const property of objectProperties) {
            result.push({
                name: property.name,
                value: {
                    type: "number" /* Protocol.Runtime.RemoteObjectType.Number */,
                    value: property.value,
                    description: `${property.value}`,
                },
                writable: true,
                configurable: true,
                enumerable: true,
                isOwn: true,
            });
        }
        return {
            result,
            getError() {
                return undefined;
            },
        };
    }
    #loadSourceMap(url) {
        const content = this.#sourceMapContents.get(url);
        if (!content) {
            return {
                success: false,
                content: '',
                errorDescription: { message: 'source map not found', statusCode: 123, netError: 0, netErrorName: '', urlValid: true },
            };
        }
        return {
            success: true,
            content,
            errorDescription: { message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true },
        };
    }
}
function scopePositionFromOffsets(descriptor, type, startOffset, endOffset) {
    return {
        type,
        startLine: descriptor.substring(0, startOffset).replace(/[^\n]/g, '').length,
        endLine: descriptor.substring(0, endOffset).replace(/[^\n]/g, '').length,
        startColumn: startOffset - descriptor.lastIndexOf('\n', startOffset - 1) - 1,
        endColumn: endOffset - descriptor.lastIndexOf('\n', endOffset - 1) - 1,
    };
}
export function parseScopeChain(scopeDescriptor) {
    // Identify function scope.
    const functionStart = scopeDescriptor.indexOf('{');
    if (functionStart < 0) {
        throw new Error('Test descriptor must contain "{"');
    }
    const functionEnd = scopeDescriptor.indexOf('}', functionStart);
    if (functionEnd < 0) {
        throw new Error('Test descriptor must contain "}"');
    }
    const scopeChain = [scopePositionFromOffsets(scopeDescriptor, "local" /* Protocol.Debugger.ScopeType.Local */, functionStart, functionEnd + 1)];
    // Find the block scope.
    const blockScopeStart = scopeDescriptor.indexOf('<');
    if (blockScopeStart >= 0) {
        const blockScopeEnd = scopeDescriptor.indexOf('>');
        if (blockScopeEnd < 0) {
            throw new Error('Test descriptor must contain matching "." for "<"');
        }
        scopeChain.unshift(scopePositionFromOffsets(scopeDescriptor, "block" /* Protocol.Debugger.ScopeType.Block */, blockScopeStart, blockScopeEnd + 1));
    }
    return scopeChain;
}
//# sourceMappingURL=MockScopeChain.js.map