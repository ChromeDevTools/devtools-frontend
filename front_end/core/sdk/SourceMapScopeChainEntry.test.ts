// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Protocol from '../../generated/protocol.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import type * as ScopesCodec from '../../third_party/source-map-scopes-codec/source-map-scopes-codec.js';

import * as SDK from './sdk.js';

describeWithEnvironment('SourceMapScopeRemoteObject', () => {
  let callFrame: sinon.SinonStubbedInstance<SDK.DebuggerModel.CallFrame>;

  beforeEach(() => {
    callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    const target = createTarget();
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
    callFrame.evaluate.callsFake(({expression}) => {
      assert.strictEqual(expression, 'a');
      return Promise.resolve({object: new SDK.RemoteObject.LocalJSONObject(42)});
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
    const expectedExpressions = ['a', 'does not matter since it must not be called', 'b'];
    const values = [42, undefined, 21];

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
      assert.strictEqual(properties[0].value?.value, values[i]);
    }
  });

  it('evaluates binding expressions in the V8 scope matching the range', async () => {
    const originalScope: ScopesCodec.OriginalScope = {
      start: {line: 0, column: 0},
      end: {line: 20, column: 0},
      isStackFrame: true,
      kind: 'function',
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
    callFrame.evaluate.resolves({object: new SDK.RemoteObject.LocalJSONObject(42)});

    const entry = new SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry(callFrame, originalScope, range, false,
                                                                            undefined, /* scopeNumber */ 2);
    await entry.object().getAllProperties(/* accessorPropertiesOnly */ false, /* generatePreview */ true);

    sinon.assert.calledOnceWithMatch(callFrame.evaluate, {expression: 'a', scopeNumber: 2, generatePreview: true});
  });

  it('lets the backend pick the inner-most scope when no scope number was resolved', async () => {
    const originalScope: ScopesCodec.OriginalScope = {
      start: {line: 0, column: 0},
      end: {line: 20, column: 0},
      isStackFrame: true,
      kind: 'function',
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
    callFrame.evaluate.resolves({object: new SDK.RemoteObject.LocalJSONObject(42)});

    const entry =
        new SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry(callFrame, originalScope, range, false, undefined);
    await entry.object().getAllProperties(/* accessorPropertiesOnly */ false, /* generatePreview */ false);

    sinon.assert.calledOnceWithMatch(callFrame.evaluate,
                                     {expression: 'a', scopeNumber: undefined, generatePreview: false});
  });
});

describeWithEnvironment('SourceMapScopeChainEntry', () => {
  let callFrame: sinon.SinonStubbedInstance<SDK.DebuggerModel.CallFrame>;

  beforeEach(() => {
    callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    callFrame.debuggerModel = createTarget().model(SDK.DebuggerModel.DebuggerModel)!;
  });

  function entry(scope: Partial<ScopesCodec.OriginalScope>, isInnerMostFunction = false) {
    const originalScope: ScopesCodec.OriginalScope = {
      start: {line: 0, column: 0},
      end: {line: 20, column: 0},
      isStackFrame: false,
      variables: [],
      children: [],
      ...scope,
    };
    return new SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry(callFrame, originalScope, undefined,
                                                                     isInnerMostFunction, undefined);
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
});
