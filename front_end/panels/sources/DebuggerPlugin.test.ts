// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import {createTarget, deinitializeGlobalVars, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockDebuggerBackend, parseScopeChain} from '../../testing/MockScopeChain.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';

import * as Sources from './sources.js';

const {urlString} = Platform.DevToolsPath;

describe('Inline variable view scope helpers', () => {
  setupSettingsHooks();

  const URL = urlString`file:///tmp/example.js`;
  let target: SDK.Target.Target;
  let backend: MockDebuggerBackend;

  beforeEach(() => {
    backend = new MockDebuggerBackend();
    target = backend.createTarget();
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(backend.universe.debuggerWorkspaceBinding);
  });

  afterEach(async () => {
    sinon.restore();
    await deinitializeGlobalVars();
  });

  async function toOffsetWithSourceMap(
      sourceMap: SDK.SourceMap.SourceMap|undefined, location: SDK.DebuggerModel.Location|null) {
    if (!location || !sourceMap) {
      return null;
    }
    const entry = sourceMap.findEntry(location.lineNumber, location.columnNumber);
    if (!entry?.sourceURL) {
      return null;
    }
    const content = sourceMap.embeddedContentByURL(entry.sourceURL);
    if (!content) {
      return null;
    }
    const text = new TextUtils.Text.Text(content);
    return text.offsetFromPosition(entry.sourceLineNumber, entry.sourceColumnNumber);
  }

  async function toOffset(source: string|null, location: SDK.DebuggerModel.Location|null) {
    if (!location || !source) {
      return null;
    }
    const text = new TextUtils.Text.Text(source);
    return text.offsetFromPosition(location.lineNumber, location.columnNumber);
  }

  it('can resolve single scope mappings with source map', async () => {
    const sourceMapUrl = 'file:///tmp/example.js.min.map';
    // This example was minified with terser v5.7.0 with following command.
    // 'terser index.js -m --toplevel -o example.min.js --source-map "url=example.min.js.map,includeSources"'
    const source = `function o(o,n){console.log(o,n)}o(1,2);\n//# sourceMappingURL=${sourceMapUrl}`;
    const scopes = '          {                     }';

    // The original scopes below have to match with how the source map translates the scope, so it
    // does not align perfectly with the source language scopes. In principle, this test could only
    // assert that the tests are approximately correct; currently, we assert an exact match.
    const originalSource = 'function unminified(par1, par2) {\n  console.log(par1, par2);\n}\nunminified(1, 2);\n';
    const originalScopes = '         {                       \n                          \n }';
    const expectedOffsets = parseScopeChain(originalScopes);

    const sourceMapContent = {
      version: 3,
      names: ['unminified', 'par1', 'par2', 'console', 'log'],
      sources: ['index.js'],
      sourcesContent: [originalSource],
      mappings: 'AAAA,SAASA,EAAWC,EAAMC,GACxBC,QAAQC,IAAIH,EAAMC,EACpB,CACAF,EAAW,EAAG',
    };
    const sourceMapJson = JSON.stringify(sourceMapContent);

    const scopeObject = backend.createSimpleRemoteObject([{name: 'o', value: 42}, {name: 'n', value: 1}]);
    const callFrame = await backend.createCallFrame(
        target, {url: URL, content: source}, scopes, {url: sourceMapUrl, content: sourceMapJson}, [scopeObject]);

    // Get source map for mapping locations to 'editor' offsets.
    const sourceMap = await callFrame.debuggerModel.sourceMapManager().sourceMapForClientPromise(callFrame.script);

    const scopeMappings =
        await Sources.DebuggerPlugin.computeScopeMappings(callFrame, l => toOffsetWithSourceMap(sourceMap, l));

    const text = new TextUtils.Text.Text(originalSource);
    assert.lengthOf(scopeMappings, 1);
    assert.strictEqual(
        scopeMappings[0].scopeStart,
        text.offsetFromPosition(expectedOffsets[0].startLine, expectedOffsets[0].startColumn));
    assert.strictEqual(
        scopeMappings[0].scopeEnd, text.offsetFromPosition(expectedOffsets[0].endLine, expectedOffsets[0].endColumn));
    assert.strictEqual(scopeMappings[0].variableMap.get('par1')?.value, 42);
    assert.strictEqual(scopeMappings[0].variableMap.get('par2')?.value, 1);
  });

  it('can resolve nested scope mappings with source map', async () => {
    const sourceMapUrl = 'file:///tmp/example.js.min.map';
    // This example was minified with terser v5.7.0 with following command.
    // 'terser index.js -m --toplevel -o example.min.js --source-map "url=example.min.js.map,includeSources"'
    const source =
        `function o(o){const n=console.log.bind(console);for(let c=0;c<o;c++)n(c)}o(10);\n//# sourceMappingURL=${
            sourceMapUrl}`;
    const scopes =
        '          {                                        <                   >}                          ';

    const originalSource =
        'function f(n) {\n  const c = console.log.bind(console);\n  for (let i = 0; i < n; i++) c(i);\n}\nf(10);\n';
    const originalScopes =
        '         {     \n                                      \n  <                                >\n }';
    const expectedOffsets = parseScopeChain(originalScopes);

    const sourceMapContent = {
      version: 3,
      names: ['f', 'n', 'c', 'console', 'log', 'bind', 'i'],
      sources: ['index.js'],
      sourcesContent: [originalSource],
      mappings:
          'AAAA,SAASA,EAAEC,GACT,MAAMC,EAAIC,QAAQC,IAAIC,KAAKF,SAC3B,IAAK,IAAIG,EAAI,EAAGA,EAAIL,EAAGK,IAAKJ,EAAEI,EAChC,CACAN,EAAE',
    };
    const sourceMapJson = JSON.stringify(sourceMapContent);

    const functionScopeObject = backend.createSimpleRemoteObject([{name: 'o', value: 10}, {name: 'n', value: 1234}]);
    const forScopeObject = backend.createSimpleRemoteObject([{name: 'c', value: 5}]);

    const callFrame = await backend.createCallFrame(
        target, {url: URL, content: source}, scopes, {url: sourceMapUrl, content: sourceMapJson},
        [forScopeObject, functionScopeObject]);

    // Get source map for mapping locations to 'editor' offsets.
    const sourceMap = await callFrame.debuggerModel.sourceMapManager().sourceMapForClientPromise(callFrame.script);

    const scopeMappings =
        await Sources.DebuggerPlugin.computeScopeMappings(callFrame, l => toOffsetWithSourceMap(sourceMap, l));

    const text = new TextUtils.Text.Text(originalSource);
    assert.lengthOf(scopeMappings, 2);
    assert.strictEqual(
        scopeMappings[0].scopeStart,
        text.offsetFromPosition(expectedOffsets[0].startLine, expectedOffsets[0].startColumn));
    assert.strictEqual(
        scopeMappings[0].scopeEnd, text.offsetFromPosition(expectedOffsets[0].endLine, expectedOffsets[0].endColumn));
    assert.strictEqual(scopeMappings[0].variableMap.get('i')?.value, 5);
    assert.strictEqual(scopeMappings[0].variableMap.size, 1);
    assert.strictEqual(
        scopeMappings[1].scopeStart,
        text.offsetFromPosition(expectedOffsets[1].startLine, expectedOffsets[1].startColumn));
    assert.strictEqual(
        scopeMappings[1].scopeEnd, text.offsetFromPosition(expectedOffsets[1].endLine, expectedOffsets[1].endColumn));
    assert.strictEqual(scopeMappings[1].variableMap.get('n')?.value, 10);
    assert.strictEqual(scopeMappings[1].variableMap.get('c')?.value, 1234);
    assert.strictEqual(scopeMappings[1].variableMap.size, 2);
  });

  it('can resolve simple scope mappings', async () => {
    const source = 'function f(a) { debugger } f(1)';
    const scopes = '          {              }';
    const expectedOffsets = parseScopeChain(scopes);

    const functionScopeObject = backend.createSimpleRemoteObject([{name: 'a', value: 1}]);

    const callFrame =
        await backend.createCallFrame(target, {url: URL, content: source}, scopes, null, [functionScopeObject]);

    const scopeMappings = await Sources.DebuggerPlugin.computeScopeMappings(callFrame, l => toOffset(source, l));

    assert.lengthOf(scopeMappings, 1);
    assert.strictEqual(scopeMappings[0].scopeStart, expectedOffsets[0].startColumn);
    assert.strictEqual(scopeMappings[0].scopeEnd, expectedOffsets[0].endColumn);
    assert.strictEqual(scopeMappings[0].variableMap.get('a')?.value, 1);
    assert.strictEqual(scopeMappings[0].variableMap.size, 1);
  });

  it('can resolve nested scope mappings for block with no variables', async () => {
    const source = 'function f() { let a = 1; { debugger } } f()';
    const scopes = '          {               <          > }';
    const expectedOffsets = parseScopeChain(scopes);

    const functionScopeObject = backend.createSimpleRemoteObject([{name: 'a', value: 1}]);
    const blockScopeObject = backend.createSimpleRemoteObject([]);

    const callFrame = await backend.createCallFrame(
        target, {url: URL, content: source}, scopes, null, [blockScopeObject, functionScopeObject]);

    const scopeMappings = await Sources.DebuggerPlugin.computeScopeMappings(callFrame, l => toOffset(source, l));

    assert.lengthOf(scopeMappings, 2);
    assert.strictEqual(scopeMappings[0].scopeStart, expectedOffsets[0].startColumn);
    assert.strictEqual(scopeMappings[0].scopeEnd, expectedOffsets[0].endColumn);
    assert.strictEqual(scopeMappings[0].variableMap.size, 0);
    assert.strictEqual(scopeMappings[1].scopeStart, expectedOffsets[1].startColumn);
    assert.strictEqual(scopeMappings[1].scopeEnd, expectedOffsets[1].endColumn);
    assert.strictEqual(scopeMappings[1].variableMap.get('a')?.value, 1);
    assert.strictEqual(scopeMappings[1].variableMap.size, 1);
  });

  it('can resolve nested scope mappings for function with no variables', async () => {
    const source = 'function f() { console.log("Hi"); { let a = 1; debugger } } f()';
    const scopes = '          {                       <                     > }';
    const expectedOffsets = parseScopeChain(scopes);

    const functionScopeObject = backend.createSimpleRemoteObject([]);
    const blockScopeObject = backend.createSimpleRemoteObject([{name: 'a', value: 1}]);

    const callFrame = await backend.createCallFrame(
        target, {url: URL, content: source}, scopes, null, [blockScopeObject, functionScopeObject]);

    const scopeMappings = await Sources.DebuggerPlugin.computeScopeMappings(callFrame, l => toOffset(source, l));

    assert.lengthOf(scopeMappings, 2);
    assert.strictEqual(scopeMappings[0].scopeStart, expectedOffsets[0].startColumn);
    assert.strictEqual(scopeMappings[0].scopeEnd, expectedOffsets[0].endColumn);
    assert.strictEqual(scopeMappings[0].variableMap.size, 1);
    assert.strictEqual(scopeMappings[0].variableMap.get('a')?.value, 1);
    assert.strictEqual(scopeMappings[1].scopeStart, expectedOffsets[1].startColumn);
    assert.strictEqual(scopeMappings[1].scopeEnd, expectedOffsets[1].endColumn);
    assert.strictEqual(scopeMappings[1].variableMap.size, 0);
  });
});

function makeState(doc: string, extensions: CodeMirror.Extension = []) {
  return CodeMirror.EditorState.create({
    doc,
    extensions: [
      extensions,
      TextEditor.Config.baseConfiguration(doc),
      TextEditor.Config.autocompletion.instance(),
    ],
  });
}

describeWithEnvironment('Inline variable view parser', () => {
  it('parses simple identifier', () => {
    const state = makeState('c', CodeMirror.javascript.javascriptLanguage);
    const variables = Sources.DebuggerPlugin.getVariableNamesByLine(state, 0, 1, 1);
    assert.deepEqual(variables, [{line: 0, from: 0, id: 'c'}]);
  });

  it('parses simple function', () => {
    const code = `function f(o) {
      let a = 1;
      debugger;
    }`;
    const state = makeState(code, CodeMirror.javascript.javascriptLanguage);
    const variables = Sources.DebuggerPlugin.getVariableNamesByLine(state, 10, code.length, code.indexOf('debugger'));
    assert.deepEqual(variables, [{line: 0, from: 11, id: 'o'}, {line: 1, from: 26, id: 'a'}]);
  });

  it('parses patterns', () => {
    const code = `function f(o) {
      let {x: a, y: [b, c]} = {x: o, y: [1, 2]};
      console.log(a + b + c);
      debugger;
    }`;
    const state = makeState(code, CodeMirror.javascript.javascriptLanguage);
    const variables = Sources.DebuggerPlugin.getVariableNamesByLine(state, 10, code.length, code.indexOf('debugger'));
    assert.deepEqual(variables, [
      {line: 0, from: 11, id: 'o'},
      {line: 1, from: 30, id: 'a'},
      {line: 1, from: 37, id: 'b'},
      {line: 1, from: 40, id: 'c'},
      {line: 1, from: 50, id: 'o'},
      {line: 2, from: 71, id: 'console'},
      {line: 2, from: 83, id: 'a'},
      {line: 2, from: 87, id: 'b'},
      {line: 2, from: 91, id: 'c'},
    ]);
  });

  it('parses function with nested block', () => {
    const code = `function f(o) {
      let a = 1;
      {
        let a = 2;
        debugger;
      }
    }`;
    const state = makeState(code, CodeMirror.javascript.javascriptLanguage);
    const variables = Sources.DebuggerPlugin.getVariableNamesByLine(state, 10, code.length, code.indexOf('debugger'));
    assert.deepEqual(
        variables, [{line: 0, from: 11, id: 'o'}, {line: 1, from: 26, id: 'a'}, {line: 3, from: 53, id: 'a'}]);
  });

  it('parses function variable, ignores shadowing let in sibling block', () => {
    const code = `function f(o) {
      let a = 1;
      {
        let a = 2;
        console.log(a);
      }
      debugger;
    }`;
    const state = makeState(code, CodeMirror.javascript.javascriptLanguage);
    const variables = Sources.DebuggerPlugin.getVariableNamesByLine(state, 10, code.length, code.indexOf('debugger'));
    assert.deepEqual(
        variables, [{line: 0, from: 11, id: 'o'}, {line: 1, from: 26, id: 'a'}, {line: 4, from: 68, id: 'console'}]);
  });

  it('parses function variable, ignores shadowing const in sibling block', () => {
    const code = `function f(o) {
      let a = 1;
      {
        const a = 2;
        console.log(a);
      }
      debugger;
    }`;
    const state = makeState(code, CodeMirror.javascript.javascriptLanguage);
    const variables = Sources.DebuggerPlugin.getVariableNamesByLine(state, 10, code.length, code.indexOf('debugger'));
    assert.deepEqual(
        variables, [{line: 0, from: 11, id: 'o'}, {line: 1, from: 26, id: 'a'}, {line: 4, from: 70, id: 'console'}]);
  });

  it('parses function variable, ignores shadowing typed const in sibling block', () => {
    const code = `function f(o) {
      let a: number = 1;
      {
        const a: number = 2;
        console.log(a);
      }
      debugger;
    }`;
    const state = makeState(code, CodeMirror.javascript.javascriptLanguage);
    const variables = Sources.DebuggerPlugin.getVariableNamesByLine(state, 10, code.length, code.indexOf('debugger'));
    assert.deepEqual(
        variables, [{line: 0, from: 11, id: 'o'}, {line: 1, from: 26, id: 'a'}, {line: 4, from: 86, id: 'console'}]);
  });

  it('parses function variable, reports all vars', () => {
    const code = `function f(o) {
      var a = 1;
      {
        var a = 2;
        console.log(a);
      }
      debugger;
    }`;
    const state = makeState(code, CodeMirror.javascript.javascriptLanguage);
    const variables = Sources.DebuggerPlugin.getVariableNamesByLine(state, 10, code.length, code.indexOf('debugger'));
    assert.deepEqual(variables, [
      {line: 0, from: 11, id: 'o'},
      {line: 1, from: 26, id: 'a'},
      {line: 3, from: 53, id: 'a'},
      {line: 4, from: 68, id: 'console'},
      {line: 4, from: 80, id: 'a'},
    ]);
  });

  it('parses function variable, handles shadowing in doubly nested scopes', () => {
    const code = `function f() {
      let a = 1;
      let b = 2;
      let c = 3;
      {
        let b;
        {
          const c = 4;
          b = 5;
          console.log(c);
        }
        console.log(c);
      }
      debugger;
    }`;
    const state = makeState(code, CodeMirror.javascript.javascriptLanguage);
    const variables = Sources.DebuggerPlugin.getVariableNamesByLine(state, 10, code.length, code.indexOf('debugger'));
    assert.deepEqual(variables, [
      {line: 1, from: 25, id: 'a'},
      {line: 2, from: 42, id: 'b'},
      {line: 3, from: 59, id: 'c'},
      {line: 9, from: 149, id: 'console'},
      {line: 11, from: 183, id: 'console'},
      {line: 11, from: 195, id: 'c'},
    ]);
  });

  it('parses function variable, handles shadowing with object pattern', () => {
    const code = `function f() {
      let a = 1;
      {
        let {x: b, y: a} = {x: 1, y: 2};
        console.log(a + b);
      }
      console.log(a);
      debugger;
    }`;
    const state = makeState(code, CodeMirror.javascript.javascriptLanguage);
    const variables = Sources.DebuggerPlugin.getVariableNamesByLine(state, 10, code.length, code.indexOf('debugger'));
    assert.deepEqual(variables, [
      {line: 1, from: 25, id: 'a'},
      {line: 4, from: 89, id: 'console'},
      {line: 6, from: 123, id: 'console'},
      {line: 6, from: 135, id: 'a'},
    ]);
  });

  it('parses function variable, handles shadowing with array pattern', () => {
    const code = `function f() {
      let a = 1;
      {
        const [b, a] = [1, 2];
        console.log(a + b);
      }
      console.log(a);
      debugger;
    }`;
    const state = makeState(code, CodeMirror.javascript.javascriptLanguage);
    const variables = Sources.DebuggerPlugin.getVariableNamesByLine(state, 10, code.length, code.indexOf('debugger'));
    assert.deepEqual(variables, [
      {line: 1, from: 25, id: 'a'},
      {line: 4, from: 79, id: 'console'},
      {line: 6, from: 113, id: 'console'},
      {line: 6, from: 125, id: 'a'},
    ]);
  });

  it('extracts variable identifiers across C++, Java, and StreamLanguage (Go) while excluding member fields',
     async () => {
       const cppCode = `int compute(int input) {
  int localVal = input + obj.memberField;
  return localVal;
}`;
       const {cppLanguage} = await CodeMirror.cpp();
       const cppState = makeState(cppCode, cppLanguage);
       const cppVars = Sources.DebuggerPlugin.getVariableNamesByLine(cppState, 0, cppCode.length, cppCode.length,
                                                                     /* useOriginalScopes */ true);
       assert.deepEqual(cppVars.map(v => v.id), ['input', 'localVal', 'input', 'obj', 'localVal']);

       const javaCode = `int compute(int input) {
  int localVal = input + obj.memberField + helper();
  return localVal;
}`;
       const {javaLanguage} = await CodeMirror.java();
       const javaState = makeState(javaCode, javaLanguage);
       const javaVars = Sources.DebuggerPlugin.getVariableNamesByLine(javaState, 0, javaCode.length, javaCode.length,
                                                                      /* useOriginalScopes */ true);
       assert.deepEqual(javaVars.map(v => v.id), ['input', 'localVal', 'input', 'obj', 'localVal']);

       const goCode = `func compute(input int) int {
  localVal := input + obj.memberField
  return localVal
}`;
       const goLanguage = await CodeMirror.go();
       const goState = makeState(goCode, goLanguage);
       const goVars = Sources.DebuggerPlugin.getVariableNamesByLine(goState, 0, goCode.length, goCode.length,
                                                                    /* useOriginalScopes */ true);
       assert.includeMembers(goVars.map(v => v.id), ['input', 'localVal', 'obj']);
       assert.notInclude(goVars.map(v => v.id), 'memberField');
     });
});

describeWithEnvironment('Inline variable view scope value resolution', () => {
  it('resolves single variable in single scope', () => {
    const value42 = {type: Protocol.Runtime.RemoteObjectType.Number, value: 42} as SDK.RemoteObject.RemoteObject;
    const scopeMappings = [{scopeStart: 0, scopeEnd: 10, variableMap: new Map([['a', value42]])}];
    const variableNames = [{line: 3, from: 5, id: 'a'}];
    const valuesByLine = Sources.DebuggerPlugin.getVariableValuesByLine(scopeMappings, variableNames);

    assert.strictEqual(valuesByLine?.size, 1);
    assert.strictEqual(valuesByLine?.get(3)?.size, 1);
    assert.strictEqual(valuesByLine?.get(3)?.get('a')?.value, 42);
  });

  it('resolves shadowed variables', () => {
    const value1 = {type: Protocol.Runtime.RemoteObjectType.Number, value: 1} as SDK.RemoteObject.RemoteObject;
    const value2 = {type: Protocol.Runtime.RemoteObjectType.Number, value: 2} as SDK.RemoteObject.RemoteObject;
    const scopeMappings = [
      {scopeStart: 10, scopeEnd: 20, variableMap: new Map([['a', value1]])},
      {scopeStart: 0, scopeEnd: 30, variableMap: new Map([['a', value2]])},
    ];
    const variableNames = [
      {line: 0, from: 5, id: 'a'},    // Falls into the outer scope.
      {line: 10, from: 15, id: 'a'},  // Inner scope.
      {line: 20, from: 25, id: 'a'},  // Outer scope.
      {line: 30, from: 35, id: 'a'},  // Outside of any scope.
    ];
    const valuesByLine = Sources.DebuggerPlugin.getVariableValuesByLine(scopeMappings, variableNames);

    assert.strictEqual(valuesByLine?.size, 3);
    assert.strictEqual(valuesByLine?.get(0)?.size, 1);
    assert.strictEqual(valuesByLine?.get(0)?.get('a')?.value, 2);
    assert.strictEqual(valuesByLine?.get(10)?.size, 1);
    assert.strictEqual(valuesByLine?.get(10)?.get('a')?.value, 1);
    assert.strictEqual(valuesByLine?.get(20)?.size, 1);
    assert.strictEqual(valuesByLine?.get(20)?.get('a')?.value, 2);
  });

  it('resolves multiple variables on the same line', () => {
    const value1 = {type: Protocol.Runtime.RemoteObjectType.Number, value: 1} as SDK.RemoteObject.RemoteObject;
    const value2 = {type: Protocol.Runtime.RemoteObjectType.Number, value: 2} as SDK.RemoteObject.RemoteObject;
    const scopeMappings = [{scopeStart: 10, scopeEnd: 20, variableMap: new Map([['a', value1], ['b', value2]])}];
    const variableNames = [
      {line: 10, from: 11, id: 'a'},
      {line: 10, from: 13, id: 'b'},
      {line: 10, from: 15, id: 'a'},
    ];
    const valuesByLine = Sources.DebuggerPlugin.getVariableValuesByLine(scopeMappings, variableNames);

    assert.strictEqual(valuesByLine?.size, 1);
    assert.strictEqual(valuesByLine?.get(10)?.size, 2);
    assert.strictEqual(valuesByLine?.get(10)?.get('a')?.value, 1);
    assert.strictEqual(valuesByLine?.get(10)?.get('b')?.value, 2);
  });

  it('shadows outer variables when an inner or inactive sibling scope maps a variable to null', async () => {
    const callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    const target = createTarget();
    callFrame.debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel)!;
    callFrame.location.returns(
        new SDK.DebuggerModel.Location(callFrame.debuggerModel, '0' as Protocol.Runtime.ScriptId, 0, 50));
    callFrame.evaluate.resolves({object: new SDK.RemoteObject.LocalJSONObject({0: 42})});

    const inactiveBlockScope = {
      start: {line: 2, column: 0},
      end: {line: 4, column: 0},
      isStackFrame: false,
      kind: 'block',
      variables: ['x'],
      children: [],
    };
    const functionScope = {
      start: {line: 0, column: 0},
      end: {line: 10, column: 0},
      isStackFrame: true,
      kind: 'function',
      variables: ['x'],
      children: [inactiveBlockScope],
    };
    const generatedRange = {
      start: {line: 0, column: 0},
      end: {line: 0, column: 200},
      isStackFrame: true,
      isHidden: false,
      values: ['a'],
      children: [],
    };
    const entry = new SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry(callFrame, functionScope, generatedRange,
                                                                            true, undefined);

    const scopeMappings = await Sources.DebuggerPlugin.computeScopeMappings(
        callFrame,
        async () => null,
        (line, col) => line * 10 + col,
        [entry],
    );
    const valuesByLine = Sources.DebuggerPlugin.getVariableValuesByLine(scopeMappings, [
      {line: 1, from: 15, id: 'x'},  // In functionScope (outside inactive block): resolves to 42.
      {line: 3, from: 30, id: 'x'},  // Inside inactiveBlockScope (20..40): shadowed by null!
      {line: 6, from: 60, id: 'x'},  // After inactiveBlockScope: resolves to 42.
    ]);

    assert.strictEqual(valuesByLine?.get(1)?.get('x')?.value, 42);
    assert.isUndefined(valuesByLine?.get(3)?.get('x'));
    assert.strictEqual(valuesByLine?.get(6)?.get('x')?.value, 42);
  });

  it('includes outer Closure and Global SourceMapScopeChainEntry scopes beyond the Local scope', async () => {
    const callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    const target = createTarget();
    callFrame.debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel)!;
    callFrame.location.returns(
        new SDK.DebuggerModel.Location(callFrame.debuggerModel, '0' as Protocol.Runtime.ScriptId, 0, 20));
    callFrame.evaluate.callsFake(
        async ({expression}) => ({
          object: new SDK.RemoteObject.LocalJSONObject({0: expression.includes('localCompiled') ? 10 : 20}),
        }));

    const innerFunctionScope = {
      start: {line: 2, column: 0},
      end: {line: 5, column: 0},
      isStackFrame: true,
      kind: 'function',
      variables: ['localVar'],
      children: [],
    };
    const outerClosureScope = {
      start: {line: 0, column: 0},
      end: {line: 10, column: 0},
      isStackFrame: true,
      kind: 'function',
      variables: ['closureVar'],
      children: [innerFunctionScope],
    };

    const innerEntry =
        new SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry(callFrame, innerFunctionScope, {
          start: {line: 0, column: 10},
          end: {line: 0, column: 50},
          isStackFrame: true,
          isHidden: false,
          values: ['localCompiled'],
          children: [],
        },
                                                                  /* isInnerMostFunction */ true, undefined);
    const outerEntry =
        new SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry(callFrame, outerClosureScope, {
          start: {line: 0, column: 0},
          end: {line: 0, column: 100},
          isStackFrame: true,
          isHidden: false,
          values: ['closureCompiled'],
          children: [],
        },
                                                                  /* isInnerMostFunction */ false, undefined);

    const scopeMappings = await Sources.DebuggerPlugin.computeScopeMappings(
        callFrame,
        async () => null,
        (line, col) => line * 10 + col,
        [innerEntry, outerEntry],
    );

    assert.strictEqual(Sources.DebuggerPlugin.findVariableInScopeMappings('localVar', 30, scopeMappings).value?.value,
                       10);
    assert.strictEqual(Sources.DebuggerPlugin.findVariableInScopeMappings('closureVar', 30, scopeMappings).value?.value,
                       20);
  });
});

describe('DebuggerPlugin', () => {
  describe('computePopoverHighlightRange', () => {
    const {computePopoverHighlightRange} = Sources.DebuggerPlugin;

    it('correctly returns highlight range depending on cursor position and selection', () => {
      const doc = 'Hello World!';
      const selection = CodeMirror.EditorSelection.create([
        CodeMirror.EditorSelection.range(2, 5),
      ]);
      const state = CodeMirror.EditorState.create({doc, selection});
      assert.isNull(computePopoverHighlightRange(state, 'text/plain', 0));
      assert.deepInclude(computePopoverHighlightRange(state, 'text/plain', 2), {from: 2, to: 5});
      assert.deepInclude(computePopoverHighlightRange(state, 'text/plain', 5), {from: 2, to: 5});
      assert.isNull(computePopoverHighlightRange(state, 'text/plain', 10));
      assert.isNull(computePopoverHighlightRange(state, 'text/plain', doc.length - 1));
    });

    describe('in JavaScript files', () => {
      const extensions = [CodeMirror.javascript.javascript()];

      it('correctly returns highlight range for member assignments', () => {
        const doc = 'obj.foo = 42;';
        const state = CodeMirror.EditorState.create({doc, extensions});

        assert.deepInclude(computePopoverHighlightRange(state, 'text/javascript', 0), {from: 0, to: 3});
        assert.deepInclude(computePopoverHighlightRange(state, 'text/javascript', 4), {from: 0, to: 7});
      });

      it('correctly returns highlight range for member assignments involving `this`', () => {
        const doc = 'this.x = bar;';
        const state = CodeMirror.EditorState.create({doc, extensions});

        assert.deepInclude(computePopoverHighlightRange(state, 'text/javascript', 0), {from: 0, to: 4});
        assert.deepInclude(computePopoverHighlightRange(state, 'text/javascript', 5), {from: 0, to: 6});
      });

      it('correctly reports function calls as potentially side-effecting', () => {
        const doc = 'getRandomCoffee().name';
        const state = CodeMirror.EditorState.create({doc, extensions});

        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf('getRandomCoffee')),
            {containsSideEffects: false},
        );
        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.lastIndexOf('.')),
            {containsSideEffects: true},
        );
        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf('name')),
            {containsSideEffects: true},
        );
      });

      it('correctly reports method calls as potentially side-effecting', () => {
        const doc = 'utils.getRandomCoffee().name';
        const state = CodeMirror.EditorState.create({doc, extensions});

        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf('utils')),
            {containsSideEffects: false},
        );
        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf('getRandomCoffee')),
            {containsSideEffects: false},
        );
        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.lastIndexOf('.')),
            {containsSideEffects: true},
        );
        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf('name')),
            {containsSideEffects: true},
        );
      });

      it('correctly reports function calls in property accesses as potentially side-effecting', () => {
        const doc = 'bar[foo()]';
        const state = CodeMirror.EditorState.create({doc, extensions});

        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf('bar')),
            {containsSideEffects: false, from: 0, to: 'bar'.length},
        );
        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf('[')),
            {containsSideEffects: true, from: 0, to: doc.length},
        );
        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf(']')),
            {containsSideEffects: true, from: 0, to: doc.length},
        );
      });

      it('correct reports postfix increments in property accesses as potentially side-effecting', () => {
        const doc = 'a[i++]';
        const state = CodeMirror.EditorState.create({doc, extensions});

        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf('[')),
            {containsSideEffects: true, from: 0, to: doc.length},
        );
        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf(']')),
            {containsSideEffects: true, from: 0, to: doc.length},
        );
      });

      it('correctly reports postfix decrements in property accesses as potentially side-effecting', () => {
        const doc = 'a[i--]';
        const state = CodeMirror.EditorState.create({doc, extensions});

        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf('[')),
            {containsSideEffects: true, from: 0, to: doc.length},
        );
        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf(']')),
            {containsSideEffects: true, from: 0, to: doc.length},
        );
      });

      it('correctly reports prefix increments in property accesses as potentially side-effecting', () => {
        const doc = 'array[++index]';
        const state = CodeMirror.EditorState.create({doc, extensions});

        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf('[')),
            {containsSideEffects: true, from: 0, to: doc.length},
        );
        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf(']')),
            {containsSideEffects: true, from: 0, to: doc.length},
        );
      });

      it('correctly reports prefix decrements in property accesses as potentially side-effecting', () => {
        const doc = 'array[--index]';
        const state = CodeMirror.EditorState.create({doc, extensions});

        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf('[')),
            {containsSideEffects: true, from: 0, to: doc.length},
        );
        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf(']')),
            {containsSideEffects: true, from: 0, to: doc.length},
        );
      });

      it('correctly reports assignment expressions in property accesses as potentially side-effecting', () => {
        const doc = 'array[index *= 5]';
        const state = CodeMirror.EditorState.create({doc, extensions});

        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf('[')),
            {containsSideEffects: true, from: 0, to: doc.length},
        );
        assert.deepInclude(
            computePopoverHighlightRange(state, 'text/javascript', doc.indexOf(']')),
            {containsSideEffects: true, from: 0, to: doc.length},
        );
      });

      it('correctly reports potential side-effects within a larger script', () => {
        const doc = `var a = new Array();
var i = 0;
a[i++];
a[i--];
a[++i];
a[--i];
a[i *= 5];
a[foo()];`;
        const state = CodeMirror.EditorState.create({doc, extensions});

        for (let offset = 0; (offset = doc.indexOf('a[', offset) + 1) !== 0;) {
          assert.deepInclude(
              computePopoverHighlightRange(state, 'text/javascript', offset),
              {containsSideEffects: true},
          );
        }
      });

      it('correctly identifies side-effecting constructs (new, tagged template, import, delete)', () => {
        const {containsSideEffects} = Sources.DebuggerPlugin;

        const checkCode = (code: string) => {
          const state = CodeMirror.EditorState.create({doc: code, extensions});
          const tree = CodeMirror.ensureSyntaxTree(state, code.length, 5000);
          assert.exists(tree);
          return containsSideEffects(state.doc, tree.topNode);
        };

        assert.isTrue(checkCode('new Trap()'));
        assert.isTrue(checkCode('myTag`hello`'));
        assert.isTrue(checkCode('import("./mod.js")'));
        assert.isTrue(checkCode('delete obj.prop'));
        assert.isTrue(checkCode('x = 1'));
        assert.isTrue(checkCode('fn()'));
        assert.isFalse(checkCode('obj.prop'));
        assert.isFalse(checkCode('x'));
      });

      it('correctly reports new expressions, tagged templates, dynamic imports, and delete operators as side-effecting in popover range',
         () => {
           const checkHoverSideEffects = (doc: string, cursorOffset: number) => {
             const state = CodeMirror.EditorState.create({doc, extensions});
             const result = computePopoverHighlightRange(state, 'text/javascript', cursorOffset);
             return result?.containsSideEffects;
           };

           const code1 = 'let v = new Trap().status;';
           assert.isTrue(checkHoverSideEffects(code1, code1.indexOf('status')));

           const code2 = 'let v = myTag`test`.status;';
           assert.isTrue(checkHoverSideEffects(code2, code2.indexOf('status')));

           const code3 = 'let v = (import("./mod.js")).status;';
           assert.isTrue(checkHoverSideEffects(code3, code3.indexOf('status')));

           const code4 = 'let v = a[delete obj.prop];';
           assert.isTrue(checkHoverSideEffects(code4, code4.indexOf('[')));
         });
    });

    describe('in HTML files', () => {
      it('correctly returns highlight range for variables in inline <script>s', () => {
        const doc = `<!DOCTYPE html>
<script type="text/javascript">
globalThis.foo = bar + baz;
</script>`;
        const extensions = [CodeMirror.html.html()];
        const state = CodeMirror.EditorState.create({doc, extensions});
        for (const name of ['bar', 'baz']) {
          const from = doc.indexOf(name);
          const to = from + name.length;
          assert.deepInclude(
              computePopoverHighlightRange(state, 'text/html', from),
              {from, to},
              `did not correct highlight '${name}'`,
          );
        }
      });

      it('correctly returns highlight range for variables in inline event handlers', () => {
        const doc = `<!DOCTYPE html>
<button onclick="foo(bar, baz)">Click me!</button>`;
        const extensions = [CodeMirror.html.html()];
        const state = CodeMirror.EditorState.create({doc, extensions});
        for (const name of ['foo', 'bar', 'baz']) {
          const from = doc.indexOf(name);
          const to = from + name.length;
          assert.deepInclude(
              computePopoverHighlightRange(state, 'text/html', from),
              {from, to},
              `did not correct highlight '${name}'`,
          );
        }
      });
    });

    describe('in TSX files', () => {
      it('correctly returns highlight range for field accesses', () => {
        const doc = `function foo(obj: any): number {
  return obj.x + obj.y;
}`;
        const extensions = [CodeMirror.javascript.tsxLanguage];
        const state = CodeMirror.EditorState.create({doc, extensions});
        for (const name of ['x', 'y']) {
          const pos = doc.lastIndexOf(name);
          const from = pos - 4;
          const to = pos + name.length;
          assert.deepInclude(
              computePopoverHighlightRange(state, 'text/typescript-jsx', pos),
              {from, to},
              `did not correct highlight '${name}'`,
          );
        }
      });
    });

    describe('in non-JS languages with Lezer and StreamLanguage', () => {
      it('highlights variable identifiers and `this` while excluding `.` and `->` member fields', async () => {
        const cppDoc = 'int val = this->ptrField + obj.dotField + val;';
        const {cppLanguage} = await CodeMirror.cpp();
        const cppState = CodeMirror.EditorState.create({doc: cppDoc, extensions: [cppLanguage]});

        const valPos = cppDoc.indexOf('val');
        assert.deepEqual(
            computePopoverHighlightRange(cppState, 'text/x-c++src', valPos),
            {from: valPos, to: valPos + 3, containsSideEffects: false},
        );
        const thisPos = cppDoc.indexOf('this');
        assert.deepEqual(
            computePopoverHighlightRange(cppState, 'text/x-c++src', thisPos),
            {from: thisPos, to: thisPos + 4, containsSideEffects: false},
        );
        assert.isNull(computePopoverHighlightRange(cppState, 'text/x-c++src', cppDoc.indexOf('ptrField')));
        assert.isNull(computePopoverHighlightRange(cppState, 'text/x-c++src', cppDoc.indexOf('dotField')));
      });

      it('resolves hovered variables and shadowed null bindings via findVariableInScopeMappings', () => {
        const valueObj = {type: Protocol.Runtime.RemoteObjectType.Number, value: 99} as SDK.RemoteObject.RemoteObject;
        const scopeMappings: Sources.DebuggerPlugin.ScopeMapping[] = [
          {scopeStart: 20, scopeEnd: 40, variableMap: new Map([['x', null]])},
          {scopeStart: 0, scopeEnd: 100, variableMap: new Map([['x', valueObj]])},
        ];

        assert.deepEqual(
            Sources.DebuggerPlugin.findVariableInScopeMappings('x', 10, scopeMappings),
            {found: true, value: valueObj},
        );
        assert.deepEqual(
            Sources.DebuggerPlugin.findVariableInScopeMappings('x', 30, scopeMappings),
            {found: true, value: null},
        );
        assert.deepEqual(
            Sources.DebuggerPlugin.findVariableInScopeMappings('unknownVar', 10, scopeMappings),
            {found: false, value: null},
        );
      });
    });
  });
});
