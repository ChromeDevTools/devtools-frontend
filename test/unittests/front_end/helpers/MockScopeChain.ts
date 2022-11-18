// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Host from '../../../../front_end/core/host/host.js';
import {assertNotNullOrUndefined} from '../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../front_end/generated/protocol.js';
import {
  dispatchEvent,
  setMockConnectionResponseHandler,
} from './MockConnection.js';

interface LoadResult {
  success: boolean;
  content: string;
  errorDescription: Host.ResourceLoader.LoadErrorDescription;
}

interface ScriptDescription {
  url: string;
  content: string;
  hasSourceURL?: boolean;
  startLine?: number;
  startColumn?: number;
}

export class MockProtocolBackend {
  #scriptSources = new Map<string, string>();
  #sourceMapContents = new Map<string, string>();
  #objectProperties = new Map<string, {name: string, value: number}[]>();
  #nextObjectIndex = 0;
  #nextScriptIndex = 0;

  constructor() {
    // One time setup of the response handlers.
    setMockConnectionResponseHandler('Debugger.getScriptSource', this.#getScriptSourceHandler.bind(this));
    setMockConnectionResponseHandler('Runtime.getProperties', this.#getPropertiesHandler.bind(this));
    SDK.PageResourceLoader.PageResourceLoader.instance({
      forceNew: true,
      loadOverride: async (url: string) => this.#loadSourceMap(url),
      maxConcurrentLoads: 1,
      loadTimeout: 2000,
    });
  }

  async addScript(target: SDK.Target.Target, scriptDescription: ScriptDescription, sourceMap: {
    url: string,
    content: string,
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
      executionContextId: 1,
      hash: '',
      hasSourceURL: Boolean(scriptDescription.hasSourceURL),
      sourceMapURL: sourceMap?.url ?? '',
    });

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
    const scriptObject = debuggerModel.scriptForId(scriptId);
    assertNotNullOrUndefined(scriptObject);
    if (sourceMap) {
      this.#sourceMapContents.set(sourceMap.url, sourceMap.content);

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
      type: Protocol.Debugger.ScopeType, object: Protocol.Runtime.RemoteObject, scriptId: string, startColumn: number,
      endColumn: number) {
    return {
      type,
      object,
      startLocation: this.#createProtocolLocation(scriptId, 0, startColumn),
      endLocation: this.#createProtocolLocation(scriptId, 0, endColumn),
    };
  }

  createSimpleRemoteObject(properties: {name: string, value: number}[]): Protocol.Runtime.RemoteObject {
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
            s.type, {type: Protocol.Runtime.RemoteObjectType.Object}, scriptObject.scriptId, s.startColumn,
            s.endColumn));

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

export function parseScopeChain(scopeDescriptor: string):
    {type: Protocol.Debugger.ScopeType, startColumn: number, endColumn: number}[] {
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
      [{type: Protocol.Debugger.ScopeType.Local, startColumn: functionStart, endColumn: functionEnd + 1}];

  // Find the block scope.
  const blockScopeStart = scopeDescriptor.indexOf('<');
  if (blockScopeStart >= 0) {
    const blockScopeEnd = scopeDescriptor.indexOf('>');
    if (blockScopeEnd < 0) {
      throw new Error('Test descriptor must contain matching "." for "<"');
    }
    scopeChain.unshift(
        {type: Protocol.Debugger.ScopeType.Block, startColumn: blockScopeStart, endColumn: blockScopeEnd + 1});
  }

  return scopeChain;
}
