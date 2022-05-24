// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SourceMapScopes from '../../../../../front_end/models/source_map_scopes/source_map_scopes.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import type * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

class ScriptWithContent extends SDK.Script.Script {
  readonly content: string;

  constructor(
      debuggerModel: SDK.DebuggerModel.DebuggerModel, scriptId: Protocol.Runtime.ScriptId,
      url: Platform.DevToolsPath.UrlString, mapUrl: Platform.DevToolsPath.UrlString, content: string) {
    super(
        debuggerModel, scriptId, url, 0, 0, 0, 0, 0, '', false, false, mapUrl, false, 0, null, null, null, null, null,
        null);
    this.content = content;
  }

  requestContent(): Promise<TextUtils.ContentProvider.DeferredContent> {
    return Promise.resolve({content: this.content, isEncoded: false});
  }
}

class TestDebuggerModel extends SDK.DebuggerModel.DebuggerModel {
  readonly #scriptIdToScript = new Map<Protocol.Runtime.ScriptId, SDK.Script.Script>();

  constructor(target: SDK.Target.Target) {
    super(target);
  }

  scriptForId(scriptId: string): SDK.Script.Script|null {
    return this.#scriptIdToScript.get(scriptId as Protocol.Runtime.ScriptId) ?? null;
  }

  addScript(scriptId: string, url: string, mapUrl: string, content: string): ScriptWithContent {
    const brandedScriptId = scriptId as Protocol.Runtime.ScriptId;
    const brandedUrl = url as Platform.DevToolsPath.UrlString;
    const brandedMapUrl = mapUrl as Platform.DevToolsPath.UrlString;
    const script = new ScriptWithContent(this, brandedScriptId, brandedUrl, brandedMapUrl, content);
    this.#scriptIdToScript.set(brandedScriptId, script);
    return script;
  }
}

describeWithMockConnection('NameResolver', () => {
  const URL = 'file:///tmp/example.js' as Platform.DevToolsPath.UrlString;
  const MAP_URL = 'file:///tmp/example.js.map' as Platform.DevToolsPath.UrlString;
  const SCRIPT_ID = 'SCRIPT_ID' as Protocol.Runtime.ScriptId;
  let target: SDK.Target.Target;

  beforeEach(() => {
    target = createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.Frame});
  });

  function createMockScopeEntry(
      debuggerModel: TestDebuggerModel, startColumn: number, endColumn: number): SDK.DebuggerModel.ScopeChainEntry {
    return {
      callFrame() {
        throw Error('not implemented for test');
      },
      type() {
        throw Error('not implemented for test');
      },
      typeName() {
        throw Error('not implemented for test');
      },
      name() {
        throw Error('not implemented for test');
      },
      startLocation() {
        return new SDK.DebuggerModel.Location(debuggerModel, SCRIPT_ID, 0, startColumn);
      },
      endLocation() {
        return new SDK.DebuggerModel.Location(debuggerModel, SCRIPT_ID, 0, endColumn);
      },
      object() {
        throw Error('not implemented for test');
      },
      description() {
        throw Error('not implemented for test');
      },
      icon() {
        throw Error('not implemented for test');
      },
    };
  }

  function initializeModelAndScopes(source: string, scopeDescriptor: string):
      {functionScope: SDK.DebuggerModel.ScopeChainEntry, scope: SDK.DebuggerModel.ScopeChainEntry} {
    const debuggerModel = new TestDebuggerModel(target);
    debuggerModel.addScript(SCRIPT_ID, URL, MAP_URL, source);

    // Identify function scope.
    const functionStart = scopeDescriptor.indexOf('{');
    if (functionStart < 0) {
      throw new Error('Test descriptor must contain "{"');
    }
    const functionEnd = scopeDescriptor.indexOf('}', functionStart);
    if (functionEnd < 0) {
      throw new Error('Test descriptor must contain "}"');
    }
    const functionScope = createMockScopeEntry(debuggerModel, functionStart, functionEnd + 1);

    // Find the block scope.
    const blockScopeStart = scopeDescriptor.indexOf('<');
    if (blockScopeStart < 0) {
      // If there is no block scope, use the function scope as the target scope.
      return {functionScope, scope: functionScope};
    }
    const blockScopeEnd = scopeDescriptor.indexOf('>');
    if (blockScopeEnd < 0) {
      throw new Error('Test descriptor must contain matching "." for "<"');
    }
    return {functionScope, scope: createMockScopeEntry(debuggerModel, blockScopeStart, blockScopeEnd + 1)};
  }

  function getIdentifiersFromScopeDescriptor(source: string, scopeDescriptor: string): {
    bound: SourceMapScopes.NamesResolver.Identifier[],
    free: SourceMapScopes.NamesResolver.Identifier[],
  } {
    const bound = [];
    const free = [];
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
      const id = new SourceMapScopes.NamesResolver.Identifier(source.substring(start, end), 0, start);
      if (kind === 'B') {
        bound.push(id);
      } else {
        console.assert(kind === 'F');
        free.push(id);
      }
      current = end + 1;
    }

    return {bound, free};
  }

  // The scope name resolver assertions are of the following form:
  //
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
  //   .equals([Identifier(name: a, offset: 27), Identifier(name: a, offset: 41)]).
  // expect.that(
  //  scopeIdentifiers(functionScope: {start: 10, end: 45}, scope:{start: 21, end: 43}).free)
  //   .equals([Identifier(name: x, offset: 31)]).
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
      new SourceMapScopes.NamesResolver.Identifier('a', 0, 27),
      new SourceMapScopes.NamesResolver.Identifier('a', 0, 41),
    ]);
    assert.deepEqual(identifiers.free, [
      new SourceMapScopes.NamesResolver.Identifier('x', 0, 31),
    ]);
  });

  it('test helper parses scopes from test descriptor', () => {
    const source = 'function f(x) { g(x); {let a = x, return a} }';
    const scopes = '          {           <    B             B> }';
    const {functionScope, scope} = initializeModelAndScopes(source, scopes);
    assert.strictEqual(functionScope.startLocation()?.columnNumber, 10);
    assert.strictEqual(functionScope.endLocation()?.columnNumber, 45);
    assert.strictEqual(scope.startLocation()?.columnNumber, 22);
    assert.strictEqual(scope.endLocation()?.columnNumber, 43);
  });

  it('test helper parses function scope from test descriptor', () => {
    const source = 'function f(x) { g(x); {let a = x, return a} }';
    const scopes = '          {B      B            B            }';
    const {functionScope, scope} = initializeModelAndScopes(source, scopes);
    assert.strictEqual(functionScope.startLocation()?.columnNumber, 10);
    assert.strictEqual(functionScope.endLocation()?.columnNumber, 45);
    assert.strictEqual(scope.startLocation()?.columnNumber, 10);
    assert.strictEqual(scope.endLocation()?.columnNumber, 45);
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
      name: 'computes identifiers in arrow function',
      source: 'function f(x) { return (i) => { let j = i; return j } }',
      scopes: '          {            <B           B   B         B > }',
    },
    {
      name: 'computes identifiers in arrow function',
      source: 'function f(x) { return (i) => { let j = i; return j } }',
      scopes: '          {            <B           B   B         B > }',
    },
    {
      name: 'returns empty identifier list for scope with syntax error',
      source: 'function f(x) xx { return (i) => { let j = i; return j } }',
      scopes: '          {                                              }',
    },
  ];

  for (const test of tests) {
    it(test.name, async () => {
      const {functionScope, scope} = initializeModelAndScopes(test.source, test.scopes);
      const identifiers = await SourceMapScopes.NamesResolver.scopeIdentifiers(functionScope, scope);
      const boundIdentifiers = identifiers?.boundVariables ?? [];
      const freeIdentifiers = identifiers?.freeVariables ?? [];
      boundIdentifiers.sort((l, r) => l.lineNumber - r.lineNumber || l.columnNumber - r.columnNumber);
      freeIdentifiers.sort((l, r) => l.lineNumber - r.lineNumber || l.columnNumber - r.columnNumber);
      assert.deepEqual(boundIdentifiers, getIdentifiersFromScopeDescriptor(test.source, test.scopes).bound);
      assert.deepEqual(freeIdentifiers, getIdentifiersFromScopeDescriptor(test.source, test.scopes).free);
    });
  }
});
