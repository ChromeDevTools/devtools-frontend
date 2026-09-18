// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import type * as ScopesCodec from '../../third_party/source-map-scopes-codec/source-map-scopes-codec.js';

import * as SDK from './sdk.js';

describe('SourceMapScopeRemoteObject', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;
  beforeEach(() => {
    universe = new TestUniverse();
  });
  let callFrame: sinon.SinonStubbedInstance<SDK.DebuggerModel.CallFrame>;

  beforeEach(() => {
    callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    const target = universe.createTarget();
    callFrame.debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel)!;
  });

  it('returns "value unavailable" for unavailable scope variables', async () => {
    const originalScope: ScopesCodec.OriginalScope = {
      start: {line: 0, column: 0},
      end: {line: 20, column: 0},
      isStackFrame: false,
      kind: 'global',
      variables: ['variable1', 'variable2'],
      children: [],
    };

    const entry = new SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry(
        callFrame, originalScope, undefined, false, undefined);
    const {properties} =
        await entry.object().getAllProperties(/* accessorPropertiesOnly */ false, /* generatePreview */ true);

    assert.isNotNull(properties);
    assert.lengthOf(properties, 2);
    assert.strictEqual(properties[0].name, 'variable1');
    assert.isUndefined(properties[0].value);
    assert.strictEqual(properties[1].name, 'variable2');
    assert.isUndefined(properties[1].value);
  });

  it('resolves variable values using binding expressions and evaluateOnCallFrame', async () => {
    const originalScope: ScopesCodec.OriginalScope = {
      start: {line: 0, column: 0},
      end: {line: 20, column: 0},
      isStackFrame: false,
      kind: 'global',
      variables: ['variable1'],
      children: [],
    };
    const range: ScopesCodec.GeneratedRange = {
      start: {line: 0, column: 0},
      end: {line: 0, column: 200},
      isStackFrame: false,
      isHidden: false,
      values: ['a'],
      children: [],
    };
    callFrame.location.returns(
        new SDK.DebuggerModel.Location(callFrame.debuggerModel, '0' as Protocol.Runtime.ScriptId, 0, 50));
    callFrame.evaluate.callsFake(({expression, generatePreview}) => {
      assert.strictEqual(expression, '({__proto__: null, ...(() => { try { return {0: (a)}; } catch {} })()})');
      assert.isFalse(generatePreview);
      return Promise.resolve({object: new SDK.RemoteObject.LocalJSONObject({0: 42})});
    });

    const entry =
        new SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry(callFrame, originalScope, range, false, undefined);
    const {properties} =
        await entry.object().getAllProperties(/* accessorPropertiesOnly */ false, /* generatePreview */ true);

    assert.isNotNull(properties);
    assert.lengthOf(properties, 1);
    assert.strictEqual(properties[0].name, 'variable1');
    assert.strictEqual(properties[0].value?.value, 42);
  });

  it('uses the right binding expression when resolving variable values when ranges are split', async () => {
    const originalScope: ScopesCodec.OriginalScope = {
      start: {line: 0, column: 0},
      end: {line: 20, column: 0},
      isStackFrame: false,
      kind: 'global',
      variables: ['variable1'],
      children: [],
    };
    const range: ScopesCodec.GeneratedRange = {
      start: {line: 0, column: 0},
      end: {line: 0, column: 200},
      isStackFrame: false,
      isHidden: false,
      values: [[
        {from: {line: 0, column: 0}, to: {line: 0, column: 50}, value: 'a'},     // From 0..50 available as 'a'.
        {from: {line: 0, column: 50}, to: {line: 0, column: 150}},               // From 50..150 unavailable.
        {from: {line: 0, column: 150}, to: {line: 0, column: 200}, value: 'b'},  // From 150..200 available as 'b'.

      ]],
      children: [],
    };

    // We simulate 3 pauses in the 3 sub-ranges.
    const pauseLocations = [
      new SDK.DebuggerModel.Location(callFrame.debuggerModel, '0' as Protocol.Runtime.ScriptId, 0, 25),
      new SDK.DebuggerModel.Location(callFrame.debuggerModel, '0' as Protocol.Runtime.ScriptId, 0, 100),
      new SDK.DebuggerModel.Location(callFrame.debuggerModel, '0' as Protocol.Runtime.ScriptId, 0, 175),
    ];
    const expectedExpressions = [
      '({__proto__: null, ...(() => { try { return {0: (a)}; } catch {} })()})',
      'does not matter since it must not be called',
      '({__proto__: null, ...(() => { try { return {0: (b)}; } catch {} })()})',
    ];
    const values = [{0: 42}, undefined, {0: 21}];

    for (let i = 0; i < 3; ++i) {
      callFrame.location.returns(pauseLocations[i]);
      callFrame.evaluate.callsFake(({expression}) => {
        assert.strictEqual(expression, expectedExpressions[i]);
        return Promise.resolve({object: new SDK.RemoteObject.LocalJSONObject(values[i])});
      });

      const entry =
          new SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry(callFrame, originalScope, range, false, undefined);
      const {properties} =
          await entry.object().getAllProperties(/* accessorPropertiesOnly */ false, /* generatePreview */ true);

      assert.isNotNull(properties);
      assert.lengthOf(properties, 1);
      assert.strictEqual(properties[0].name, 'variable1');
      assert.strictEqual(properties[0].value?.value, values[i]?.[0]);
    }
  });

  it('batches multiple variables and passes scopeNumber to evaluate', async () => {
    const originalScope: ScopesCodec.OriginalScope = {
      start: {line: 0, column: 0},
      end: {line: 20, column: 0},
      isStackFrame: true,
      kind: 'function',
      variables: ['var1', 'var2', 'var3'],
      children: [],
    };
    const range: ScopesCodec.GeneratedRange = {
      start: {line: 0, column: 0},
      end: {line: 0, column: 200},
      isStackFrame: false,
      isHidden: false,
      values: ['expr1', null, 'expr3'],
      children: [],
    };
    callFrame.location.returns(
        new SDK.DebuggerModel.Location(callFrame.debuggerModel, '0' as Protocol.Runtime.ScriptId, 0, 50));
    callFrame.evaluate.callsFake(options => {
      assert.strictEqual(
          options.expression,
          '({__proto__: null, ...(() => { try { return {0: (expr1)}; } catch {} })(), ...(() => { try { return {2: (expr3)}; } catch {} })()})');
      assert.strictEqual(options.scopeNumber, 2);
      assert.isFalse(options.generatePreview);
      return Promise.resolve({object: new SDK.RemoteObject.LocalJSONObject({0: 100, 2: 200})});
    });

    const entry = new SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry(callFrame, originalScope, range, true,
                                                                            undefined, /* scopeNumber */ 2);
    const {properties} =
        await entry.object().getAllProperties(/* accessorPropertiesOnly */ false, /* generatePreview */ true);

    assert.isNotNull(properties);
    assert.lengthOf(properties, 3);
    assert.strictEqual(properties[0].name, 'var1');
    assert.strictEqual(properties[0].value?.value, 100);
    assert.strictEqual(properties[1].name, 'var2');
    assert.isUndefined(properties[1].value);
    assert.strictEqual(properties[2].name, 'var3');
    assert.strictEqual(properties[2].value?.value, 200);
  });

  it('distinguishes between variables with value undefined and throwing expressions', async () => {
    const originalScope: ScopesCodec.OriginalScope = {
      start: {line: 0, column: 0},
      end: {line: 20, column: 0},
      isStackFrame: true,
      kind: 'function',
      variables: ['definedAsUndefined', 'throwsError'],
      children: [],
    };
    const range: ScopesCodec.GeneratedRange = {
      start: {line: 0, column: 0},
      end: {line: 0, column: 200},
      isStackFrame: false,
      isHidden: false,
      values: ['undefExpr', 'errorExpr'],
      children: [],
    };
    callFrame.location.returns(
        new SDK.DebuggerModel.Location(callFrame.debuggerModel, '0' as Protocol.Runtime.ScriptId, 0, 50));
    callFrame.evaluate.callsFake(() => {
      // Index 0 was evaluated to undefined, so property 0 is in the object.
      // Index 1 threw an error, so property 1 is NOT in the object.
      return Promise.resolve({object: new SDK.RemoteObject.LocalJSONObject({0: undefined})});
    });

    const entry =
        new SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry(callFrame, originalScope, range, true, undefined, 0);
    const {properties} =
        await entry.object().getAllProperties(/* accessorPropertiesOnly */ false, /* generatePreview */ true);

    assert.isNotNull(properties);
    assert.lengthOf(properties, 2);
    assert.strictEqual(properties[0].name, 'definedAsUndefined');
    assert.isDefined(properties[0].value);
    assert.strictEqual(properties[0].value?.type, 'undefined');
    assert.strictEqual(properties[1].name, 'throwsError');
    assert.isUndefined(properties[1].value);
  });

  it('generates previews for the values rather than the throw-away wrapper object', async () => {
    const originalScope: ScopesCodec.OriginalScope = {
      start: {line: 0, column: 0},
      end: {line: 20, column: 0},
      isStackFrame: true,
      kind: 'function',
      variables: ['var1'],
      children: [],
    };
    const range: ScopesCodec.GeneratedRange = {
      start: {line: 0, column: 0},
      end: {line: 0, column: 200},
      isStackFrame: false,
      isHidden: false,
      values: ['a'],
      children: [],
    };
    callFrame.location.returns(
        new SDK.DebuggerModel.Location(callFrame.debuggerModel, '0' as Protocol.Runtime.ScriptId, 0, 50));
    const wrapper = new SDK.RemoteObject.LocalJSONObject({0: 42});
    const getOwnProperties = sinon.spy(wrapper, 'getOwnProperties');
    callFrame.evaluate.resolves({object: wrapper});

    const entry =
        new SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry(callFrame, originalScope, range, true, undefined, 0);
    await entry.object().getAllProperties(/* accessorPropertiesOnly */ false, /* generatePreview */ true);

    sinon.assert.calledWithMatch(callFrame.evaluate, {generatePreview: false});
    sinon.assert.calledWith(getOwnProperties, true);
  });

  it('falls back to evaluating one by one when the batch fails as a whole', async () => {
    // A binding expression that doesn't parse takes out the whole object literal, so the other
    // variables must not be lost with it.
    const originalScope: ScopesCodec.OriginalScope = {
      start: {line: 0, column: 0},
      end: {line: 20, column: 0},
      isStackFrame: true,
      kind: 'function',
      variables: ['brokenSyntax', 'validVar'],
      children: [],
    };
    const range: ScopesCodec.GeneratedRange = {
      start: {line: 0, column: 0},
      end: {line: 0, column: 200},
      isStackFrame: false,
      isHidden: false,
      values: ['a)', 'b'],
      children: [],
    };
    callFrame.location.returns(
        new SDK.DebuggerModel.Location(callFrame.debuggerModel, '0' as Protocol.Runtime.ScriptId, 0, 50));
    const syntaxError = {
      object: new SDK.RemoteObject.LocalJSONObject(undefined),
      exceptionDetails: {text: 'Uncaught SyntaxError'} as Protocol.Runtime.ExceptionDetails,
    };
    callFrame.evaluate.callsFake(({expression}) => {
      if (expression === 'b') {
        return Promise.resolve({object: new SDK.RemoteObject.LocalJSONObject(42)});
      }
      // Both the batch and the individual evaluation of 'a)' hit the syntax error.
      return Promise.resolve(syntaxError);
    });

    const entry =
        new SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry(callFrame, originalScope, range, true, undefined, 0);
    const {properties} =
        await entry.object().getAllProperties(/* accessorPropertiesOnly */ false, /* generatePreview */ false);

    // The failed batch, plus one call per variable.
    sinon.assert.calledThrice(callFrame.evaluate);
    assert.isUndefined(properties?.[0].value);
    assert.strictEqual(properties?.[1].value?.value, 42);
  });
});

describe('SourceMapScopeChainEntry', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;
  beforeEach(() => {
    universe = new TestUniverse();
  });
  let callFrame: sinon.SinonStubbedInstance<SDK.DebuggerModel.CallFrame>;

  beforeEach(() => {
    callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    callFrame.debuggerModel = universe.createTarget().model(SDK.DebuggerModel.DebuggerModel)!;
  });

  function entry(scope: Partial<ScopesCodec.OriginalScope>, isInnerMostFunction = false,
                 returnValue?: SDK.RemoteObject.RemoteObject) {
    const originalScope: ScopesCodec.OriginalScope = {
      start: {line: 0, column: 0},
      end: {line: 20, column: 0},
      isStackFrame: false,
      variables: [],
      children: [],
      ...scope,
    };
    return new SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry(callFrame, originalScope, undefined,
                                                                     isInnerMostFunction, returnValue);
  }

  it('labels stack frames as Local or Closure independent of the kind label', () => {
    // The spec encourages capitalized kinds, and `kind` is optional, so neither may gate this.
    for (const kind of ['Function', 'function', undefined]) {
      assert.strictEqual(entry({kind, isStackFrame: true}, /* isInnerMostFunction */ true).type(),
                         Protocol.Debugger.ScopeType.Local, `kind: ${kind}`);
      assert.strictEqual(entry({kind, isStackFrame: true}).type(), Protocol.Debugger.ScopeType.Closure,
                         `kind: ${kind}`);
    }
  });

  it('matches the global and block kind labels case-insensitively', () => {
    assert.strictEqual(entry({kind: 'Global'}).type(), Protocol.Debugger.ScopeType.Global);
    assert.strictEqual(entry({kind: 'global'}).type(), Protocol.Debugger.ScopeType.Global);
    assert.strictEqual(entry({kind: 'Block'}).type(), Protocol.Debugger.ScopeType.Block);
    assert.strictEqual(entry({kind: 'block'}).type(), Protocol.Debugger.ScopeType.Block);
  });

  it('does not treat a non-stack-frame scope as a function', () => {
    // `kind` has no semantic significance, so a 'Function' label without `isStackFrame` is not a
    // function scope.
    const type = entry({kind: 'Function', isStackFrame: false}, /* isInnerMostFunction */ true).type();

    assert.notStrictEqual(type, Protocol.Debugger.ScopeType.Local);
    assert.notStrictEqual(type, Protocol.Debugger.ScopeType.Closure);
  });

  it('includes exception and editable returnValue in extraProperties for innermost function scope', () => {
    const exceptionObj = new SDK.RemoteObject.LocalJSONObject('boom');
    const returnObj = new SDK.RemoteObject.LocalJSONObject(42);
    Object.defineProperty(callFrame, 'exception', {value: exceptionObj, configurable: true});

    const innerEntry = entry({kind: 'function', isStackFrame: true}, /* isInnerMostFunction */ true, returnObj);
    const innerExtra = innerEntry.extraProperties();
    assert.lengthOf(innerExtra, 2);
    assert.strictEqual(innerExtra[0].name, 'Exception');
    assert.strictEqual(innerExtra[0].value, exceptionObj);
    assert.strictEqual(innerExtra[1].name, 'Return value');
    assert.strictEqual(innerExtra[1].value, returnObj);
    assert.isDefined(innerExtra[1].syntheticSetter);

    // Outer closure scope should not include exception even if callFrame.exception is set.
    const outerEntry = entry({kind: 'function', isStackFrame: true}, /* isInnerMostFunction */ false);
    assert.isEmpty(outerEntry.extraProperties());
  });
});
