// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Protocol from '../generated/protocol.js';

import {
  dispatchEvent,
  setMockConnectionResponseHandler,
} from './MockConnection.js';
import type {LoadResult} from './SourceMapHelpers.js';

interface ScriptDescription {
  url: string;
  content: string;
  hasSourceURL?: boolean;
  startLine?: number;
  startColumn?: number;
  isContentScript?: boolean;
  embedderName?: string;
  executionContextId?: number;
}

interface SetBreakpointByUrlResponse {
  response: Promise<Omit<Protocol.Debugger.SetBreakpointByUrlResponse, 'getError'>|{getError(): string}>;
  callback: () => void;
  isOneShot: boolean;
}

export class MockProtocolBackend {
  #scriptSources = new Map<string, string>();
  #sourceMapContents = new Map<string, string>();
  #objectProperties = new Map<string, {name: string, value?: number}[]>();
  #setBreakpointByUrlResponses = new Map<string, SetBreakpointByUrlResponse>();
  #removeBreakpointCallbacks = new Map<Protocol.Debugger.BreakpointId, () => void>();
  #nextObjectIndex = 0;
  #nextScriptIndex = 0;

  constructor() {
    // One time setup of the response handlers.
    setMockConnectionResponseHandler('Debugger.getScriptSource', this.#getScriptSourceHandler.bind(this));
    setMockConnectionResponseHandler('Runtime.getProperties', this.#getPropertiesHandler.bind(this));
    setMockConnectionResponseHandler('Debugger.setBreakpointByUrl', this.#setBreakpointByUrlHandler.bind(this));
    setMockConnectionResponseHandler('Storage.getStorageKeyForFrame', () => ({storageKey: 'test-key'}));
    setMockConnectionResponseHandler('Debugger.removeBreakpoint', this.#removeBreakpointHandler.bind(this));
    setMockConnectionResponseHandler('Debugger.resume', () => ({}));
    setMockConnectionResponseHandler('Debugger.enable', () => ({debuggerId: 'DEBUGGER_ID'}));

    SDK.PageResourceLoader.PageResourceLoader.instance({
      forceNew: true,
      loadOverride: async (url: string) => this.#loadSourceMap(url),
      maxConcurrentLoads: 1,
    });
  }

  dispatchDebuggerPause(
      script: SDK.Script.Script, reason: Protocol.Debugger.PausedEventReason, functionName: string = '',
      scopeChain: Protocol.Debugger.Scope[] = []): void {
    const target = script.debuggerModel.target();
    if (reason === Protocol.Debugger.PausedEventReason.Instrumentation) {
      // Instrumentation pauses don't pass call frames, they only pass the script id in the 'data' field.
      dispatchEvent(
          target,
          'Debugger.paused',
          {
            callFrames: [],
            reason,
            data: {scriptId: script.scriptId},
          },
      );
    } else {
      const callFrames: Protocol.Debugger.CallFrame[] = [
        {
          callFrameId: '1' as Protocol.Debugger.CallFrameId,
          functionName,
          url: script.sourceURL,
          scopeChain,
          location: {
            scriptId: script.scriptId,
            lineNumber: 0,
          },
          this: {type: 'object'} as Protocol.Runtime.RemoteObject,
        },

      ];
      dispatchEvent(
          target,
          'Debugger.paused',
          {
            callFrames,
            reason,
          },
      );
    }
  }

  dispatchDebuggerPauseWithNoCallFrames(target: SDK.Target.Target, reason: Protocol.Debugger.PausedEventReason): void {
    dispatchEvent(
        target,
        'Debugger.paused',
        {
          callFrames: [],
          reason,
        },
    );
  }

  async addScript(target: SDK.Target.Target, scriptDescription: ScriptDescription, sourceMap: {
    url: string,
    content: string|SDK.SourceMap.SourceMapV3,
  }|null): Promise<SDK.Script.Script> {
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
      scriptId,
      url: scriptDescription.url,
      startLine,
      startColumn,
      endLine,
      endColumn,
      executionContextId: scriptDescription?.executionContextId ?? 1,
      executionContextAuxData: {isDefault: !scriptDescription.isContentScript},
      hash: '',
      hasSourceURL: Boolean(scriptDescription.hasSourceURL),
      ...(sourceMap ? {sourceMapURL: sourceMap.url} : null),
      embedderName: scriptDescription.embedderName,
    });

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
    const scriptObject = debuggerModel.scriptForId(scriptId);
    assertNotNullOrUndefined(scriptObject);
    if (sourceMap) {
      let {content} = sourceMap;
      if (typeof content !== 'string') {
        content = JSON.stringify(content);
      }
      this.#sourceMapContents.set(sourceMap.url, content);

      // Wait until the source map loads.
      const loadedSourceMap = await debuggerModel.sourceMapManager().sourceMapForClientPromise(scriptObject);
      assert.strictEqual(loadedSourceMap?.url() as string, sourceMap.url);
    }
    return scriptObject;
  }

  #createProtocolLocation(scriptId: string, lineNumber: number, columnNumber: number): Protocol.Debugger.Location {
    return {scriptId: scriptId as Protocol.Runtime.ScriptId, lineNumber, columnNumber};
  }

  #createProtocolScope(
      type: Protocol.Debugger.ScopeType, object: Protocol.Runtime.RemoteObject, scriptId: string, startLine: number,
      startColumn: number, endLine: number, endColumn: number) {
    return {
      type,
      object,
      startLocation: this.#createProtocolLocation(scriptId, startLine, startColumn),
      endLocation: this.#createProtocolLocation(scriptId, endLine, endColumn),
    };
  }

  createSimpleRemoteObject(properties: {name: string, value?: number}[]): Protocol.Runtime.RemoteObject {
    const objectId = 'OBJECTID.' + this.#nextObjectIndex++;
    this.#objectProperties.set(objectId, properties);

    return {type: Protocol.Runtime.RemoteObjectType.Object, objectId: objectId as Protocol.Runtime.RemoteObjectId};
  }

  // In the |scopeDescriptor|, '{' and '}' characters mark the positions of function
  // offset start and end, '<' and '>' mark the positions of the nested scope
  // start and end (if '<', '>' are missing then the nested scope is the function scope).
  // Other characters in |scopeDescriptor| are not significant (so that tests can use the other characters in
  // the descriptors to describe other assertions).
  async createCallFrame(
      target: SDK.Target.Target, script: {url: string, content: string}, scopeDescriptor: string,
      sourceMap: {url: string, content: string}|null,
      scopeObjects: Protocol.Runtime.RemoteObject[] = []): Promise<SDK.DebuggerModel.CallFrame> {
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
    const scriptObject = await this.addScript(target, script, sourceMap);

    const parsedScopes = parseScopeChain(scopeDescriptor);
    const scopeChain = parsedScopes.map(
        s => this.#createProtocolScope(
            s.type, {type: Protocol.Runtime.RemoteObjectType.Object}, scriptObject.scriptId, s.startLine, s.startColumn,
            s.endLine, s.endColumn));

    const innerScope = scopeChain[0];
    console.assert(scopeObjects.length < scopeChain.length);
    for (let i = 0; i < scopeObjects.length; ++i) {
      scopeChain[i].object = scopeObjects[i];
    }

    const payload: Protocol.Debugger.CallFrame = {
      callFrameId: '0' as Protocol.Debugger.CallFrameId,
      functionName: 'test',
      functionLocation: undefined,
      location: innerScope.startLocation,
      url: scriptObject.sourceURL,
      scopeChain,
      this: {type: 'object'} as Protocol.Runtime.RemoteObject,
      returnValue: undefined,
      canBeRestarted: false,
    };

    return new SDK.DebuggerModel.CallFrame(debuggerModel, scriptObject, payload, 0);
  }

  #getBreakpointKey(url: string, lineNumber: number): string {
    return url + '@:' + lineNumber;
  }

  responderToBreakpointByUrlRequest(url: string, lineNumber: number):
      (response: Omit<Protocol.Debugger.SetBreakpointByUrlResponse, 'getError'>) => Promise<void> {
    let requestCallback: () => void = () => {};
    let responseCallback: (response: Omit<Protocol.Debugger.SetBreakpointByUrlResponse, 'getError'>) => void;
    const responsePromise = new Promise<Omit<Protocol.Debugger.SetBreakpointByUrlResponse, 'getError'>>(resolve => {
      responseCallback = resolve;
    });
    const requestPromise = new Promise<void>(resolve => {
      requestCallback = resolve;
    });
    const key = this.#getBreakpointKey(url, lineNumber);
    this.#setBreakpointByUrlResponses.set(key, {response: responsePromise, callback: requestCallback, isOneShot: true});
    return async (response: Omit<Protocol.Debugger.SetBreakpointByUrlResponse, 'getError'>) => {
      responseCallback(response);
      await requestPromise;
    };
  }

  setBreakpointByUrlToFail(url: string, lineNumber: number) {
    const key = this.#getBreakpointKey(url, lineNumber);
    const responsePromise = Promise.resolve({
      getError() {
        return 'Breakpoint error';
      },
    });
    this.#setBreakpointByUrlResponses.set(key, {response: responsePromise, callback: () => {}, isOneShot: false});
  }

  breakpointRemovedPromise(breakpointId: Protocol.Debugger.BreakpointId): Promise<void> {
    return new Promise<void>(resolve => this.#removeBreakpointCallbacks.set(breakpointId, resolve));
  }

  #getScriptSourceHandler(request: Protocol.Debugger.GetScriptSourceRequest):
      Protocol.Debugger.GetScriptSourceResponse {
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

  #setBreakpointByUrlHandler(request: Protocol.Debugger.SetBreakpointByUrlRequest):
      Promise<Omit<Protocol.Debugger.SetBreakpointByUrlResponse, 'getError'>|{getError(): string}> {
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
      breakpointId: 'INVALID' as Protocol.Debugger.BreakpointId,
      locations: [],
      getError() {
        return 'Unknown breakpoint';
      },
    };
    return Promise.resolve(response);
  }

  #removeBreakpointHandler(request: Protocol.Debugger.RemoveBreakpointRequest): {} {
    const callback = this.#removeBreakpointCallbacks.get(request.breakpointId);
    if (callback) {
      callback();
    }
    return {};
  }

  #getPropertiesHandler(request: Protocol.Runtime.GetPropertiesRequest): Protocol.Runtime.GetPropertiesResponse {
    const objectProperties = this.#objectProperties.get(request.objectId as string);
    if (!objectProperties) {
      return {
        result: [],
        getError() {
          return 'Unknown object';
        },
      };
    }

    const result: Protocol.Runtime.PropertyDescriptor[] = [];
    for (const property of objectProperties) {
      result.push({
        name: property.name,
        value: {
          type: Protocol.Runtime.RemoteObjectType.Number,
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

  #loadSourceMap(url: string): LoadResult {
    const content = this.#sourceMapContents.get(url);
    if (!content) {
      return {
        success: false,
        content: '',
        errorDescription:
            {message: 'source map not found', statusCode: 123, netError: 0, netErrorName: '', urlValid: true},
      };
    }
    return {
      success: true,
      content,
      errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
    };
  }
}

interface ScopePosition {
  type: Protocol.Debugger.ScopeType;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

function scopePositionFromOffsets(
    descriptor: string, type: Protocol.Debugger.ScopeType, startOffset: number, endOffset: number): ScopePosition {
  return {
    type,
    startLine: descriptor.substring(0, startOffset).replace(/[^\n]/g, '').length,
    endLine: descriptor.substring(0, endOffset).replace(/[^\n]/g, '').length,
    startColumn: startOffset - descriptor.lastIndexOf('\n', startOffset - 1) - 1,
    endColumn: endOffset - descriptor.lastIndexOf('\n', endOffset - 1) - 1,
  };
}

export function parseScopeChain(scopeDescriptor: string): ScopePosition[] {
  // Identify function scope.
  const functionStart = scopeDescriptor.indexOf('{');
  if (functionStart < 0) {
    throw new Error('Test descriptor must contain "{"');
  }
  const functionEnd = scopeDescriptor.indexOf('}', functionStart);
  if (functionEnd < 0) {
    throw new Error('Test descriptor must contain "}"');
  }

  const scopeChain =
      [scopePositionFromOffsets(scopeDescriptor, Protocol.Debugger.ScopeType.Local, functionStart, functionEnd + 1)];

  // Find the block scope.
  const blockScopeStart = scopeDescriptor.indexOf('<');
  if (blockScopeStart >= 0) {
    const blockScopeEnd = scopeDescriptor.indexOf('>');
    if (blockScopeEnd < 0) {
      throw new Error('Test descriptor must contain matching "." for "<"');
    }
    scopeChain.unshift(scopePositionFromOffsets(
        scopeDescriptor, Protocol.Debugger.ScopeType.Block, blockScopeStart, blockScopeEnd + 1));
  }

  return scopeChain;
}
