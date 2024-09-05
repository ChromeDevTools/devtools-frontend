// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as SDK from './sdk.js';

describeWithMockConnection('SourceMapScopeRemoteObject', () => {
  let callFrame: sinon.SinonStubbedInstance<SDK.DebuggerModel.CallFrame>;

  beforeEach(() => {
    callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    const target = createTarget();
    callFrame.debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel)!;
  });

  it('returns "value unavailable" for unavailable scope variables', async () => {
    const originalScope: SDK.SourceMapScopes.OriginalScope = {
      start: {line: 0, column: 0},
      end: {line: 20, column: 0},
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
    const originalScope: SDK.SourceMapScopes.OriginalScope = {
      start: {line: 0, column: 0},
      end: {line: 20, column: 0},
      kind: 'global',
      variables: ['variable1'],
      children: [],
    };
    const range: SDK.SourceMapScopes.GeneratedRange = {
      start: {line: 0, column: 0},
      end: {line: 0, column: 200},
      isFunctionScope: false,
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
    const originalScope: SDK.SourceMapScopes.OriginalScope = {
      start: {line: 0, column: 0},
      end: {line: 20, column: 0},
      kind: 'global',
      variables: ['variable1'],
      children: [],
    };
    const range: SDK.SourceMapScopes.GeneratedRange = {
      start: {line: 0, column: 0},
      end: {line: 0, column: 200},
      isFunctionScope: false,
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
});
