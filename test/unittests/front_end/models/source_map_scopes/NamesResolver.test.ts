// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SourceMapScopes from '../../../../../front_end/models/source_map_scopes/source_map_scopes.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {MockProtocolBackend} from '../../helpers/MockScopeChain.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';

describeWithMockConnection('NameResolver', () => {
  const URL = 'file:///tmp/example.js' as Platform.DevToolsPath.UrlString;
  let target: SDK.Target.Target;
  let backend: MockProtocolBackend;

  beforeEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: true, debuggerWorkspaceBinding});
    target = createTarget();
    backend = new MockProtocolBackend();
  });

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
      name: 'computes identifiers in an async arrow function\'s nested scope',
      source: 'const f = async (x) => { let i = 1; { let j = i + await x; return j; } }',
      scopes: '                {                   <     B   F         F         B  > }',
    },
    {
      name: 'computes identifiers in a function with yield and await',
      source: 'async function* f(x) { return yield x + await p; }',
      scopes: '                 {B                 B         F  }',
    },
    {
      name: 'computes identifiers in a function with yield*',
      source: 'function* f(x) { return yield* g(x) + 2; }',
      scopes: '           {B                  F B       }',
    },
  ];

  const dummyMapContent = JSON.stringify({
    'version': 3,
    'sources': [],
  });

  for (const test of tests) {
    it(test.name, async () => {
      const callFrame = await backend.createCallFrame(
          target, {url: URL, content: test.source}, test.scopes, {url: 'file:///dummy.map', content: dummyMapContent});
      const parsedScopeChain =
          await SourceMapScopes.NamesResolver.findScopeChainForDebuggerScope(callFrame.scopeChain()[0]);
      const scope = parsedScopeChain.pop();
      assertNotNullOrUndefined(scope);
      const identifiers =
          await SourceMapScopes.NamesResolver.scopeIdentifiers(callFrame.script, scope, parsedScopeChain);
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

  it('resolves name tokens merged with commas (without source map names)', async () => {
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
    const callFrame = await backend.createCallFrame(
        target, {url: URL, content: source}, scopes, {url: sourceMapUrl, content: sourceMapContent}, [scopeObject]);

    const resolvedScopeObject = await SourceMapScopes.NamesResolver.resolveScopeInObject(callFrame.scopeChain()[0]);
    const properties = await resolvedScopeObject.getAllProperties(false, false);
    const namesAndValues = properties.properties?.map(p => ({name: p.name, value: p.value?.value})) ?? [];

    assert.sameDeepMembers(namesAndValues, [{name: 'par1', value: 1}, {name: 'par2', value: 2}]);
  });

  it('resolves name tokens merged with equals (without source map names)', async () => {
    const sourceMapUrl = 'file:///tmp/example.js.min.map';
    // This was minified with 'esbuild --sourcemap=linked --minify' v0.14.31.
    const sourceMapContent = JSON.stringify({
      'version': 3,
      'sources': ['index.js'],
      'sourcesContent': ['function f(n) {\n  for (let i = 0; i < n; i++) {\n    console.log("hi");\n  }\n}\nf(10);\n'],
      'mappings': 'AAAA,WAAW,EAAG,CACZ,OAAS,GAAI,EAAG,EAAI,EAAG,IACrB,QAAQ,IAAI,IAAI,CAEpB,CACA,EAAE,EAAE',
      'names': [],
    });

    const source = `function f(i){for(let o=0;o<i;o++)console.log("hi")}f(10);\n//# sourceMappingURL=${sourceMapUrl}`;
    const scopes = '          {      <                                >}';

    const scopeObject = backend.createSimpleRemoteObject([{name: 'o', value: 4}]);
    const callFrame = await backend.createCallFrame(
        target, {url: URL, content: source}, scopes, {url: sourceMapUrl, content: sourceMapContent}, [scopeObject]);

    const resolvedScopeObject = await SourceMapScopes.NamesResolver.resolveScopeInObject(callFrame.scopeChain()[0]);
    const properties = await resolvedScopeObject.getAllProperties(false, false);
    const namesAndValues = properties.properties?.map(p => ({name: p.name, value: p.value?.value})) ?? [];

    assert.sameDeepMembers(namesAndValues, [{name: 'i', value: 4}]);
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
    const callFrame = await backend.createCallFrame(
        target, {url: URL, content: source}, scopes, {url: sourceMapUrl, content: sourceMapContent}, [scopeObject]);

    const resolvedScopeObject = await SourceMapScopes.NamesResolver.resolveScopeInObject(callFrame.scopeChain()[0]);
    const properties = await resolvedScopeObject.getAllProperties(false, false);
    const namesAndValues = properties.properties?.map(p => ({name: p.name, value: p.value?.value})) ?? [];

    assert.sameDeepMembers(namesAndValues, [{name: 'par1', value: 1}, {name: 'par2', value: 2}]);
  });

  it('resolves names in constructors with super call', async () => {
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
    const callFrame = await backend.createCallFrame(
        target, {url: URL, content: source}, scopes, {url: sourceMapUrl, content: sourceMapContent}, [scopeObject]);

    const resolvedScopeObject = await SourceMapScopes.NamesResolver.resolveScopeInObject(callFrame.scopeChain()[0]);
    const properties = await resolvedScopeObject.getAllProperties(false, false);
    const namesAndValues = properties.properties?.map(p => ({name: p.name, value: p.value?.value})) ?? [];

    assert.sameDeepMembers(namesAndValues, [{name: 'par1', value: 42}]);
  });

  it('resolves names for variables in TDZ', async () => {
    const sourceMapUrl = 'file:///tmp/example.js.min.map';
    // This was minified with 'terser -m -o example.min.js --source-map "includeSources;url=example.min.js.map" v5.7.0.
    const sourceMapContent = JSON.stringify({
      'version': 3,
      'names': ['adder', 'arg1', 'arg2', 'console', 'log', 'result'],
      'sources': ['index.js'],
      'sourcesContent': [
        'function adder(arg1, arg2) {\n  console.log(arg1, arg2);\n  const result = arg1 + arg2;\n  return result;\n}\n',
      ],
      'mappings': 'AAAA,SAASA,MAAMC,EAAMC,GACnBC,QAAQC,IAAIH,EAAMC,GAClB,MAAMG,EAASJ,EAAOC,EACtB,OAAOG,CACT',
    });

    const source = `function adder(n,o){console.log(n,o);const c=n+o;return c}\n//# sourceMappingURL=${sourceMapUrl}`;
    const scopes = '              {                                          }';

    const scopeObject = backend.createSimpleRemoteObject([{name: 'n', value: 42}, {name: 'o', value: 5}, {name: 'c'}]);
    const callFrame = await backend.createCallFrame(
        target, {url: URL, content: source}, scopes, {url: sourceMapUrl, content: sourceMapContent}, [scopeObject]);

    const resolvedScopeObject = await SourceMapScopes.NamesResolver.resolveScopeInObject(callFrame.scopeChain()[0]);
    const properties = await resolvedScopeObject.getAllProperties(false, false);
    const namesAndValues = properties.properties?.map(p => ({name: p.name, value: p.value?.value})) ?? [];

    assert.sameDeepMembers(
        namesAndValues, [{name: 'arg1', value: 42}, {name: 'arg2', value: 5}, {name: 'result', value: undefined}]);
  });

  it('resolves inner scope clashing names from let -> var transpilation', async () => {
    // This tests the  behavior where the TypeScript compiler renames a variable when transforming let-variables
    // to var-variables to avoid clash, and DevTools then (somewhat questionably) deobfuscates the var variables
    // back to the original names in the function scope (as opposed to the original block scopes). Ideally, DevTools
    // would do some scoping inference rather than relying on the pruned scope chain from V8.
    const sourceMapUrl = 'file:///tmp/index.js.map';
    // The source map was obtained with 'tsc --target es5 --sourceMap --inlineSources index.ts'.
    const sourceMapContent = JSON.stringify({
      'version': 3,
      'file': 'index.js',
      'sourceRoot': '',
      'sources': ['index.ts'],
      'names': [],
      'mappings': 'AAAA,SAAS,CAAC;IACR,IAAI,GAAG,GAAG,EAAE,CAAC;' +
          'IACb,KAAK,IAAI,KAAG,GAAG,CAAC,EAAE,KAAG,GAAG,CAAC,EAAE,KAAG,EAAE,EAAE;' +
          'QAChC,OAAO,CAAC,GAAG,CAAC,KAAG,CAAC,CAAC;KAClB;' +
          'AACH,CAAC;' +
          'AACD,CAAC,EAAE,CAAC',
      'sourcesContent': [
        'function f() {\n  let pos = 10;\n  for (let pos = 0; pos < 5; pos++) {\n    console.log(pos);\n  }\n}\nf();\n',
      ],
    });

    const source: string[] = [];
    const scopes: string[] = [];
    source[0] = 'function f() {';
    scopes[0] = '          {';  // Mark for scope start.
    source[1] = '    var pos = 10;';
    source[2] = '    for (var pos_1 = 0; pos_1 < 5; pos_1++) {';
    source[3] = '        console.log(pos_1);';
    source[4] = '    }';
    source[5] = '}';
    scopes[5] = '}';  // Mark for scope end.
    source[6] = 'f();';
    source[7] = `//# sourceMappingURL=${sourceMapUrl}`;

    for (let i = 0; i < source.length; i++) {
      scopes[i] ??= '';
    }

    const scopeObject = backend.createSimpleRemoteObject([{name: 'pos', value: 10}, {name: 'pos_1', value: 4}]);
    const callFrame = await backend.createCallFrame(
        target, {url: URL, content: source.join('\n')}, scopes.join('\n'),
        {url: sourceMapUrl, content: sourceMapContent}, [scopeObject]);

    const resolvedScopeObject = await SourceMapScopes.NamesResolver.resolveScopeInObject(callFrame.scopeChain()[0]);
    const properties = await resolvedScopeObject.getAllProperties(false, false);
    const namesAndValues = properties.properties?.map(p => ({name: p.name, value: p.value?.value})) ?? [];

    assert.deepEqual(namesAndValues, [{name: 'pos', value: 10}, {name: 'pos', value: 4}]);
  });

  describe('Function name resolving', () => {
    let callFrame: SDK.DebuggerModel.CallFrame;

    beforeEach(async () => {
      const sourceMapUrl = 'file:///tmp/example.js.min.map';
      // This was minified with 'terser -m -o example.min.js --source-map "includeSources;url=example.min.js.map"' v5.7.0.
      const sourceMapContent = JSON.stringify({
        'version': 3,
        'names': ['unminified', 'par1', 'par2', 'console', 'log'],
        'sources': ['index.js'],
        'sourcesContent': ['function unminified(par1, par2) {\n  console.log(par1, par2);\n}\n'],
        'mappings': 'AAAA,SAASA,EAAWC,EAAMC,GACxBC,QAAQC,IAAIH,EAAMC',
      });

      const source = `function o(o,n){console.log(o,n)}o(1,2);\n//# sourceMappingURL=${sourceMapUrl}`;
      const scopes = '          {                     }';

      const scopeObject = backend.createSimpleRemoteObject([{name: 's', value: 42}]);
      callFrame = await backend.createCallFrame(
          target, {url: URL, content: source}, scopes, {url: sourceMapUrl, content: sourceMapContent}, [scopeObject]);
    });

    it('resolves function names at scope start for a debugger frame', async () => {
      const functionName = await SourceMapScopes.NamesResolver.resolveDebuggerFrameFunctionName(callFrame);
      assert.strictEqual(functionName, 'unminified');
    });

    it('resolves function names at scope start for a profiler frame', async () => {
      const scopeLocation = callFrame.location();
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      const script = debuggerModel?.scripts()[0];
      const scriptId = script?.scriptId;
      if (scriptId === undefined) {
        assert.fail('Script id not found');
        return;
      }
      const {lineNumber, columnNumber} = scopeLocation;
      await script?.requestContent();
      const functionName = await SourceMapScopes.NamesResolver.resolveProfileFrameFunctionName(
          {scriptId, columnNumber, lineNumber}, target);
      assert.strictEqual(functionName, 'unminified');
    });
  });

  describe('Function name resolving from scopes', () => {
    it('resolves function scope name at scope start for a debugger frame', async () => {
      Root.Runtime.experiments.enableForTest('useSourceMapScopes');

      const sourceMapUrl = 'file:///tmp/example.js.min.map';
      const sourceMapContent = JSON.stringify({
        'version': 3,
        'names': [
          '<toplevel>',
          '<anonymous>',
          'log',
          'main',
        ],
        'sources': ['main.js'],
        'sourcesContent': [
          '(function () {\n  function log(m) {\n    console.log(m);\n  }\n\n  function main() {\n\t  log("hello");\n\t  log("world");\n  }\n  \n  main();\n})();',
        ],
        'mappings': 'CAAA,WACE,SAAS,EAAI,GACX,QAAQ,IAAI,EACd,CAEA,SAAS,IACR,EAAI,SACJ,EAAI,QACL,CAEA,GACD,EAXD',
        'x_com_bloomberg_sourcesFunctionMappings': ['AAAWK,CACAJ,CCCRE,CIAKA'],
      });

      const source = '(function(){function o(o){console.log(o)}function n(){o("hello");o("world")}n()})();\n';
      const scopes = '                                                   {                       }';

      const callFrame = await backend.createCallFrame(
          target, {url: URL, content: source + `//# sourceMappingURL=${sourceMapUrl}`}, scopes,
          {url: sourceMapUrl, content: sourceMapContent});

      const functionName = await SourceMapScopes.NamesResolver.resolveDebuggerFrameFunctionName(callFrame);
      assert.strictEqual(functionName, 'main');
      Root.Runtime.experiments.disableForTest('useSourceMapScopes');
    });
  });

  it('ignores the argument name during arrow function name resolution', async () => {
    const sourceMapUrl = 'file:///tmp/example.js.min.map';
    // This was minified with 'terser -m -o example.min.js --source-map "includeSources;url=example.min.js.map"' v5.7.0.
    const sourceMapContent = JSON.stringify({
      'version': 3,
      'names': ['unminified', 'par1', 'console', 'log'],
      'sources': ['index.js'],
      'sourcesContent': ['const unminified = par1 => {\n  console.log(par1);\n}\n'],
      'mappings': 'AAAA,MAAMA,EAAaC,IACjBC,QAAQC,IAAIF',
    });

    const source = `const o=o=>{console.log(o)};\n//# sourceMappingURL=${sourceMapUrl}`;
    const scopes = '        {                 }';

    const scopeObject = backend.createSimpleRemoteObject([{name: 'o', value: 42}]);
    const callFrame = await backend.createCallFrame(
        target, {url: URL, content: source}, scopes, {url: sourceMapUrl, content: sourceMapContent}, [scopeObject]);

    assert.isNull(await SourceMapScopes.NamesResolver.resolveDebuggerFrameFunctionName(callFrame));
  });

  describe('allVariablesAtPosition', () => {
    let script: SDK.Script.Script;

    beforeEach(async () => {
      const originalContent = `
function mulWithOffset(param1, param2, offset) {
  const intermediate = param1 * param2;
  const result = intermediate;
  if (offset !== undefined) {
    const intermediate = result + offset;
    return intermediate;
  }
  return result;
}
`;
      const sourceMapUrl = 'file:///tmp/example.js.min.map';
      // This was minified with 'terser -m -o example.min.js --source-map "includeSources;url=example.min.js.map"' v5.7.0.
      const sourceMapContent = JSON.stringify({
        version: 3,
        names: ['mulWithOffset', 'param1', 'param2', 'offset', 'intermediate', 'result', 'undefined'],
        sources: ['example.js'],
        sourcesContent: [originalContent],
        mappings:
            'AACA,SAASA,cAAcC,EAAQC,EAAQC,GACrC,MAAMC,EAAeH,EAASC,EAC9B,MAAMG,EAASD,EACf,GAAID,IAAWG,UAAW,CACxB,MAAMF,EAAeC,EAASF,EAC9B,OAAOC,CACT,CACA,OAAOC,CACT',
      });

      const scriptContent =
          'function mulWithOffset(n,t,e){const f=n*t;const u=f;if(e!==undefined){const n=u+e;return n}return u}';
      script = await backend.addScript(
          target, {url: 'file:///tmp/bundle.js', content: scriptContent},
          {url: sourceMapUrl, content: sourceMapContent});
    });

    it('has the right mapping on a function scope without shadowing', async () => {
      const location = script.rawLocation(0, 30);  // Beginning of function scope.
      assertNotNullOrUndefined(location);

      const mapping = await SourceMapScopes.NamesResolver.allVariablesAtPosition(location);

      assert.strictEqual(mapping.get('param1'), 'n');
      assert.strictEqual(mapping.get('param2'), 't');
      assert.strictEqual(mapping.get('offset'), 'e');
      assert.strictEqual(mapping.get('intermediate'), 'f');
      assert.strictEqual(mapping.get('result'), 'u');
    });

    it('has the right mapping in a block scope with shadowing in the authored code', async () => {
      const location = script.rawLocation(0, 70);  // Beginning of block scope.
      assertNotNullOrUndefined(location);

      const mapping = await SourceMapScopes.NamesResolver.allVariablesAtPosition(location);

      // Block scope {intermediate} shadows function scope {intermediate}.
      assert.strictEqual(mapping.get('intermediate'), 'n');
    });

    it('has the right mapping in a block scope with shadowing in the compiled code', async () => {
      const location = script.rawLocation(0, 70);  // Beginning of block scope.
      assertNotNullOrUndefined(location);

      const mapping = await SourceMapScopes.NamesResolver.allVariablesAtPosition(location);

      assert.isNull(mapping.get('param1'));
    });
  });
});

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
