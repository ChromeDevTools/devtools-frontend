// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as Host from '../../../../../front_end/core/host/host.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SourceMapScopes from '../../../../../front_end/models/source_map_scopes/source_map_scopes.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
  setMockConnectionResponseHandler,
} from '../../helpers/MockConnection.js';

interface LoadResult {
  success: boolean;
  content: string;
  errorDescription: Host.ResourceLoader.LoadErrorDescription;
}

class MockProtocolBackend {
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

  async addScript(target: SDK.Target.Target, script: {url: string, content: string}, sourceMap: {
    url: string,
    content: string,
  }): Promise<SDK.Script.Script> {
    const scriptId = 'SCRIPTID.' + this.#nextScriptIndex++;
    this.#scriptSources.set(scriptId, script.content);
    this.#sourceMapContents.set(sourceMap.url, sourceMap.content);
    dispatchEvent(target, 'Debugger.scriptParsed', {
      scriptId,
      url: script.url,
      startLine: 0,
      startColumn: 0,
      endLine: (script.content.match(/^/gm)?.length ?? 1) - 1,
      endColumn: script.content.length - script.content.lastIndexOf('\n') - 1,
      executionContextId: 1,
      hash: '',
      hasSourceURL: false,
      sourceMapURL: sourceMap.url,
    });

    // Wait until the source map loads.
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
    const scriptObject = debuggerModel.scriptForId(scriptId);
    assertNotNullOrUndefined(scriptObject);
    const loadedSourceMap = await debuggerModel.sourceMapManager().sourceMapForClientPromise(scriptObject);

    assert.strictEqual(loadedSourceMap?.url() as string, sourceMap.url);
    return scriptObject;
  }

  createProtocolLocation(scriptId: string, lineNumber: number, columnNumber: number): Protocol.Debugger.Location {
    return {scriptId: scriptId as Protocol.Runtime.ScriptId, lineNumber, columnNumber};
  }

  createProtocolScope(
      type: Protocol.Debugger.ScopeType, object: Protocol.Runtime.RemoteObject, scriptId: string, startColumn: number,
      endColumn: number) {
    return {
      type,
      object,
      startLocation: this.createProtocolLocation(scriptId, 0, startColumn),
      endLocation: this.createProtocolLocation(scriptId, 0, endColumn),
    };
  }

  createSimpleRemoteObject(properties: {name: string, value: number}[]): Protocol.Runtime.RemoteObject {
    const objectId = 'OBJECTID.' + this.#nextObjectIndex++;
    this.#objectProperties.set(objectId, properties);

    return {type: Protocol.Runtime.RemoteObjectType.Object, objectId: objectId as Protocol.Runtime.RemoteObjectId};
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

describeWithMockConnection('NameResolver', () => {
  const URL = 'file:///tmp/example.js' as Platform.DevToolsPath.UrlString;
  let target: SDK.Target.Target;
  let backend: MockProtocolBackend;

  beforeEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      targetManager,
      workspace,
    });
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: true, debuggerWorkspaceBinding});
    target = createTarget();
    backend = new MockProtocolBackend();
  });

  function parseScopeChain(scopeDescriptor: string):
      {type: Protocol.Debugger.ScopeType, startColumn: number, endColumn: number}[] {
    const scopeChain = [];

    // Identify function scope.
    const functionStart = scopeDescriptor.indexOf('{');
    if (functionStart < 0) {
      throw new Error('Test descriptor must contain "{"');
    }
    const functionEnd = scopeDescriptor.indexOf('}', functionStart);
    if (functionEnd < 0) {
      throw new Error('Test descriptor must contain "}"');
    }

    scopeChain.push({type: Protocol.Debugger.ScopeType.Local, startColumn: functionStart, endColumn: functionEnd + 1});

    // Find the block scope.
    const blockScopeStart = scopeDescriptor.indexOf('<');
    if (blockScopeStart >= 0) {
      const blockScopeEnd = scopeDescriptor.indexOf('>');
      if (blockScopeEnd < 0) {
        throw new Error('Test descriptor must contain matching "." for "<"');
      }
      scopeChain.push(
          {type: Protocol.Debugger.ScopeType.Block, startColumn: blockScopeStart, endColumn: blockScopeEnd + 1});
    }

    return scopeChain;
  }

  async function initializeModelAndScopes(
      script: {url: string, content: string}, scopeDescriptor: string, sourceMap: {url: string, content: string},
      scopeObject: Protocol.Runtime.RemoteObject|null =
          null): Promise<{functionScope: SDK.DebuggerModel.ScopeChainEntry, scope: SDK.DebuggerModel.ScopeChainEntry}> {
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
    const scriptObject = await backend.addScript(target, script, sourceMap);

    const parsedScopes = parseScopeChain(scopeDescriptor);
    const scopeChain = parsedScopes.map(
        s => backend.createProtocolScope(
            s.type, {type: Protocol.Runtime.RemoteObjectType.Object}, scriptObject.scriptId, s.startColumn,
            s.endColumn));

    const innerScope = scopeChain[scopeChain.length - 1];
    if (scopeObject) {
      innerScope.object = scopeObject;
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

    const callFrame = new SDK.DebuggerModel.CallFrame(debuggerModel, scriptObject, payload, 0);
    return {functionScope: callFrame.scopeChain()[0], scope: callFrame.scopeChain()[callFrame.scopeChain().length - 1]};
  }

  function getIdentifiersFromScopeDescriptor(source: string, scopeDescriptor: string): {
    bound: SourceMapScopes.NamesResolver.IdentifierPositions[],
    free: SourceMapScopes.NamesResolver.IdentifierPositions[],
  } {
    const bound = new Map<string, SourceMapScopes.NamesResolver.IdentifierPositions>();
    const free = new Map<string, SourceMapScopes.NamesResolver.IdentifierPositions>();
    let current = 0;

    while (current < scopeDescriptor.length) {
      while (current < scopeDescriptor.length) {
        if (scopeDescriptor[current] === 'B' || scopeDescriptor[current] === 'F') {
          break;
        }
        current++;
      }
      if (current >= scopeDescriptor.length) {
        break;
      }

      const kind = scopeDescriptor[current];
      const start = current;
      let end = start + 1;
      while (end < scopeDescriptor.length && scopeDescriptor[end] === kind) {
        end++;
      }
      if (kind === 'B') {
        addPosition(bound, start, end);
      } else {
        console.assert(kind === 'F');
        addPosition(free, start, end);
      }
      current = end + 1;
    }

    return {bound: [...bound.values()], free: [...free.values()]};

    function addPosition(
        collection: Map<string, SourceMapScopes.NamesResolver.IdentifierPositions>, start: number, end: number) {
      const name = source.substring(start, end);
      let id = collection.get(name);
      if (!id) {
        id = new SourceMapScopes.NamesResolver.IdentifierPositions(name);
        collection.set(name, id);
      }
      id.addPosition(0, start);
    }
  }

  // Given a function scope <fn-start>,<fn-end> and a nested scope <start>,<end>,
  // we expect the scope parser to return a list of identifiers of the form [{name, offset}]
  // for the nested scope. (The nested scope may be the same as the function scope.)
  //
  // For example, say we want to assert that the block scope '{let a = x, return a}'
  // in function 'function f(x) { g(x); {let a = x, return a} }'
  //   - defines and uses variable 'a' at the correct offsets, and
  //   - uses free variable 'x'.
  // Such assertions could be expressed roughly as follows:
  //
  // expect.that(
  //  scopeIdentifiers(functionScope: {start: 10, end: 45}, scope:{start: 21, end: 43}).bound)
  //   .equals([Identifier(name: a, offsets: [27, 41])]).
  // expect.that(
  //  scopeIdentifiers(functionScope: {start: 10, end: 45}, scope:{start: 21, end: 43}).free)
  //   .equals([Identifier(name: x, offsets: [31])]).
  //
  // This is not ideal because the explicit offsets are hard to read and maintain.
  // To avoid typing the exact offset we encode the offsets in a scope assertion string
  // that can be easily aligned with the source code. For example, the assertion above
  // will be written as
  // source: 'function f(x) { g(x); {let a = x, return a} }'
  // scopes: '          {            <   B   F         B> }'
  //
  // In the assertion string, '{' and '}' characters mark the positions of function
  // offset start and end, '<' and '>' mark the positions of the nested scope
  // start and end (if '<', '>' are missing then the nested scope is the function scope),
  // the character 'B', 'F' mark the positions of bound and free identifiers that
  // we expect to be returned by the scopeIdentifiers function.

  it('test helper parses identifiers from test descriptor', () => {
    const source = 'function f(x) { g(x); {let a = x, return a} }';
    const scopes = '          {           <    B   F         B> }';
    const identifiers = getIdentifiersFromScopeDescriptor(source, scopes);
    assert.deepEqual(identifiers.bound, [
      new SourceMapScopes.NamesResolver.IdentifierPositions(
          'a', [{lineNumber: 0, columnNumber: 27}, {lineNumber: 0, columnNumber: 41}]),
    ]);
    assert.deepEqual(identifiers.free, [
      new SourceMapScopes.NamesResolver.IdentifierPositions('x', [{lineNumber: 0, columnNumber: 31}]),
    ]);
  });

  it('test helper parses scopes from test descriptor', () => {
    //    source = 'function f(x) { g(x); {let a = x, return a} }';
    const scopes = '          {           <    B             B> }';
    const [functionScope, scope] = parseScopeChain(scopes);
    assert.strictEqual(functionScope.startColumn, 10);
    assert.strictEqual(functionScope.endColumn, 45);
    assert.strictEqual(scope.startColumn, 22);
    assert.strictEqual(scope.endColumn, 43);
  });

  it('test helper parses function scope from test descriptor', () => {
    //    source = 'function f(x) { g(x); {let a = x, return a} }';
    const scopes = '          {B      B            B            }';
    const [functionScope] = parseScopeChain(scopes);
    assert.strictEqual(functionScope.startColumn, 10);
    assert.strictEqual(functionScope.endColumn, 45);
  });

  const tests = [
    {
      name: 'computes identifiers for a simple function',
      source: 'function f(x) { return x }',
      scopes: '          {B           B }',
    },
    {
      name: 'computes identifiers for a function with a let local',
      source: 'function f(x) { let a = 42; return a; }',
      scopes: '          {B        B              B  }',
    },
    {
      name: 'computes identifiers for a nested scope',
      source: 'function f(x) { let outer = x; { let inner = outer; return inner } }',
      scopes: '          {                    <     BBBBB   FFFFF         BBBBB > }',
    },
    {
      name: 'computes identifiers for second nested scope',
      source: 'function f(x) { { let a = 1; } { let b = x; return b } }',
      scopes: '          {                    <     B   F         B > }',
    },
    {
      name: 'computes identifiers with nested scopes',
      source: 'function f(x) { let outer = x; { let a = outer; } { let b = x; return b } }',
      scopes: '          {B        BBBBB   B            BBBBB              B             }',
    },
    {
      name: 'computes identifiers with nested scopes, var lifting',
      source: 'function f(x) { let outer = x; { var b = x; return b } }',
      scopes: '          {B        BBBBB   B        B   B         B   }',
    },
    {
      name: 'computes identifiers with nested scopes, var lifting',
      source: 'function f(x) { let outer = x; { var b = x; return b } }',
      scopes: '          {B        BBBBB   B        B   B         B   }',
    },
    {
      name: 'computes identifiers in catch clause',
      source: 'function f(x) { try { } catch (e) { let a = e + x; } }',
      scopes: '          {                   <B            B   F  > }',
    },
    {
      name: 'computes identifiers in catch clause',
      source: 'function f(x) { try { } catch (e) { let a = e; return a; } }',
      scopes: '          {                       <     B   F         B  > }',
    },
    {
      name: 'computes identifiers in for-let',
      source: 'function f(x) { for (let i = 0; i < 10; i++) { let j = i; console.log(j)} }',
      scopes: '          {         <    B      B       B              B  FFFFFFF       > }',
    },
    {
      name: 'computes identifiers in for-let body',
      source: 'function f(x) { for (let i = 0; i < 10; i++) { let j = i; console.log(j)} }',
      scopes: '          {                                  <     B   F  FFFFFFF     B > }',
    },
    {
      name: 'computes identifiers in for-var function',
      source: 'function f(x) { for (var i = 0; i < 10; i++) { let j = i; console.log(j)} }',
      scopes: '          {B             B      B       B              B  FFFFFFF         }',
    },
    {
      name: 'computes identifiers in for-let-of',
      source: 'function f(x) { for (let i of x) { console.log(i)} }',
      scopes: '          {         <    B    F    FFFFFFF     B > }',
    },
    {
      name: 'computes identifiers in nested arrow function',
      source: 'function f(x) { return (i) => { let j = i; return j } }',
      scopes: '          {            <B           B   B         B > }',
    },
    {
      name: 'computes identifiers in arrow function',
      source: 'const f = (x) => { let i = 1; return x + i; }',
      scopes: '          {B           B             B   B  }',
    },
    {
      name: 'computes identifiers in an arrow function\'s nested scope',
      source: 'const f = (x) => { let i = 1; { let j = i + x; return j; } }',
      scopes: '          {                   <     B   F   F         B  > }',
    },
    {
      name: 'returns empty identifier list for scope with syntax error',
      source: 'function f(x) xx { return (i) => { let j = i; return j } }',
      scopes: '          {                                              }',
    },
  ];

  const dummyMapContent = JSON.stringify({
    'version': 3,
    'sources': [],
  });

  for (const test of tests) {
    it(test.name, async () => {
      const {functionScope, scope} = await initializeModelAndScopes(
          {url: URL, content: test.source}, test.scopes, {url: 'file:///dummy.map', content: dummyMapContent});
      const identifiers = await SourceMapScopes.NamesResolver.scopeIdentifiers(functionScope, scope);
      const boundIdentifiers = identifiers?.boundVariables ?? [];
      const freeIdentifiers = identifiers?.freeVariables ?? [];
      boundIdentifiers.sort(
          (l, r) => l.positions[0].lineNumber - r.positions[0].lineNumber ||
              l.positions[0].columnNumber - r.positions[0].columnNumber);
      freeIdentifiers.sort(
          (l, r) => l.positions[0].lineNumber - r.positions[0].lineNumber ||
              l.positions[0].columnNumber - r.positions[0].columnNumber);
      assert.deepEqual(boundIdentifiers, getIdentifiersFromScopeDescriptor(test.source, test.scopes).bound);
      assert.deepEqual(freeIdentifiers, getIdentifiersFromScopeDescriptor(test.source, test.scopes).free);
    });
  }

  // TODO(crbug.com/1335338): This is in preparation for handling the identifiers merged with punctuation correctly.
  it.skip('[crbug.com/1335338]: resolves name tokens with punctuation', async () => {
    const sourceMapUrl = 'file:///tmp/example.js.min.map';
    // This was minified with 'esbuild --sourcemap=linked --minify' v0.14.31.
    const sourceMapContent = JSON.stringify({
      'version': 3,
      'sources': ['index.js'],
      'sourcesContent': ['function f(par1, par2) {\n  console.log(par1, par2);\n}\nf(1, 2);\n'],
      'mappings': 'AAAA,WAAW,EAAM,EAAM,CACrB,QAAQ,IAAI,EAAM,CAAI,CACxB,CACA,EAAE,EAAG,CAAC',
      'names': [],
    });

    const source = `function f(o,n){console.log(o,n)}f(1,2);\n//# sourceMappingURL=${sourceMapUrl}`;
    const scopes = '          {                     }';

    const scopeObject = backend.createSimpleRemoteObject([{name: 'o', value: 1}, {name: 'n', value: 2}]);
    const {scope} = await initializeModelAndScopes(
        {url: URL, content: source}, scopes, {url: sourceMapUrl, content: sourceMapContent}, scopeObject);

    const resolvedScopeObject = await SourceMapScopes.NamesResolver.resolveScopeInObject(scope);
    const properties = await resolvedScopeObject.getAllProperties(false, false);
    const namesAndValues = properties.properties?.map(p => ({name: p.name, value: p.value?.value})) ?? [];

    assert.sameDeepMembers(namesAndValues, [{name: 'par1', value: 1}, {name: 'par2', value: 2}]);
  });

  it('resolves name tokens with source map names', async () => {
    const sourceMapUrl = 'file:///tmp/example.js.min.map';
    // This was minified with 'terser -m -o example.min.js --source-map "includeSources;url=example.min.js.map" --toplevel' v5.7.0.
    const sourceMapContent = JSON.stringify({
      'version': 3,
      'names': ['f', 'par1', 'par2', 'console', 'log'],
      'sources': ['index.js'],
      'sourcesContent': ['function f(par1, par2) {\n  console.log(par1, par2);\n}\nf(1, 2);\n'],
      'mappings': 'AAAA,SAASA,EAAEC,EAAMC,GACfC,QAAQC,IAAIH,EAAMC,GAEpBF,EAAE,EAAG',
    });

    const source = `function o(o,n){console.log(o,n)}o(1,2);\n//# sourceMappingURL=${sourceMapUrl}`;
    const scopes = '          {                     }';

    const scopeObject = backend.createSimpleRemoteObject([{name: 'o', value: 1}, {name: 'n', value: 2}]);
    const {scope} = await initializeModelAndScopes(
        {url: URL, content: source}, scopes, {url: sourceMapUrl, content: sourceMapContent}, scopeObject);

    const resolvedScopeObject = await SourceMapScopes.NamesResolver.resolveScopeInObject(scope);
    const properties = await resolvedScopeObject.getAllProperties(false, false);
    const namesAndValues = properties.properties?.map(p => ({name: p.name, value: p.value?.value})) ?? [];

    assert.sameDeepMembers(namesAndValues, [{name: 'par1', value: 1}, {name: 'par2', value: 2}]);
  });

  // TODO(crbug.com/1335825): Scope view name resolution fails on super calls.
  it.skip('[crbug.com/1335825]: resolves names in constructors with super call', async () => {
    const sourceMapUrl = 'file:///tmp/example.js.min.map';
    // This was minified with 'terser -m -o example.min.js --source-map "includeSources;url=example.min.js.map"' v5.7.0.
    const sourceMapContent = JSON.stringify({
      'version': 3,
      'names': ['C', 'B', 'constructor', 'par1', 'super', 'console', 'log'],
      'sources': ['index.js'],
      'mappings': 'AAAA,MAAMA,UAAUC,EACdC,YAAYC,GACVC,MAAMD,GACNE,QAAQC,IAAIH',
    });

    const source = `class C extends B{constructor(s){super(s),console.log(s)}}\n//# sourceMappingURL=${sourceMapUrl}`;
    const scopes = '                             {                          }';

    const scopeObject = backend.createSimpleRemoteObject([{name: 's', value: 42}]);
    const {scope} = await initializeModelAndScopes(
        {url: URL, content: source}, scopes, {url: sourceMapUrl, content: sourceMapContent}, scopeObject);

    const resolvedScopeObject = await SourceMapScopes.NamesResolver.resolveScopeInObject(scope);
    const properties = await resolvedScopeObject.getAllProperties(false, false);
    const namesAndValues = properties.properties?.map(p => ({name: p.name, value: p.value?.value})) ?? [];

    assert.sameDeepMembers(namesAndValues, [{name: 'par1', value: 42}]);
  });
});
