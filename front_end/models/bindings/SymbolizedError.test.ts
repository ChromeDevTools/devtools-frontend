// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as StackTrace from '../stack_trace/stack_trace.js';

import * as Bindings from './bindings.js';

describe('SymbolizedError', () => {
  setupRuntimeHooks();
  setupSettingsHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  async function createSymbolizedErrorWithCause() {
    const target = universe.createTarget({});
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);

    const errorStack = 'Error: some error\n    at http://example.com/script.js:1:1';
    const causeStack = 'Error: cause error\n    at http://example.com/script.js:2:2';

    const causeRemoteObject = {
      subtype: 'error',
      description: causeStack,
      runtimeModel: () => runtimeModel,
      getAllProperties: async () => ({properties: [], internalProperties: []}),
    } as unknown as SDK.RemoteObject.RemoteObject;

    const errorRemoteObject = {
      subtype: 'error',
      description: errorStack,
      runtimeModel: () => runtimeModel,
      objectId: '1' as Protocol.Runtime.RemoteObjectId,
      getAllProperties: async () => ({
        properties: [{name: 'cause', value: causeRemoteObject} as SDK.RemoteObject.RemoteObjectProperty],
        internalProperties: [],
      }),
    } as unknown as SDK.RemoteObject.RemoteObject;

    return await universe.debuggerWorkspaceBinding.createSymbolizedError(errorRemoteObject);
  }

  it('can create a SymbolizedError from a RemoteObject', async () => {
    const symbolizedError = await createSymbolizedErrorWithCause();

    assert.exists(symbolizedError);
    assert.strictEqual(
        symbolizedError.remoteError.errorStack, 'Error: some error\n    at http://example.com/script.js:1:1');
    assert.strictEqual(symbolizedError.stackTrace.syncFragment.frames[0].url, 'http://example.com/script.js');

    assert.exists(symbolizedError.cause);
    assert.strictEqual(
        symbolizedError.cause.remoteError.errorStack, 'Error: cause error\n    at http://example.com/script.js:2:2');
    assert.strictEqual(symbolizedError.cause.stackTrace.syncFragment.frames[0].url, 'http://example.com/script.js');
    assert.strictEqual(symbolizedError.cause.stackTrace.syncFragment.frames[0].line, 1);  // 0-based in frames
  });

  it('emits UPDATED when stackTrace or cause updates', async () => {
    const symbolizedError = await createSymbolizedErrorWithCause();
    assert.exists(symbolizedError);

    const listener = sinon.stub();
    symbolizedError.addEventListener(Bindings.SymbolizedError.Events.UPDATED, listener);

    // Trigger update on the main error's stackTrace
    symbolizedError.stackTrace.dispatchEventToListeners(StackTrace.StackTrace.Events.UPDATED);
    sinon.assert.callCount(listener, 1);

    // Trigger update on the cause error's stackTrace
    symbolizedError.cause?.stackTrace.dispatchEventToListeners(StackTrace.StackTrace.Events.UPDATED);
    sinon.assert.callCount(listener, 2);

    // Trigger update on the cause error directly
    symbolizedError.cause?.dispatchEventToListeners(Bindings.SymbolizedError.Events.UPDATED);
    sinon.assert.callCount(listener, 3);
  });

  it('removes listeners when dispose is called', async () => {
    const symbolizedError = await createSymbolizedErrorWithCause();
    assert.exists(symbolizedError);

    const listener = sinon.stub();
    symbolizedError.addEventListener(Bindings.SymbolizedError.Events.UPDATED, listener);

    symbolizedError.dispose();

    // Trigger update on the main error's stackTrace
    symbolizedError.stackTrace.dispatchEventToListeners(StackTrace.StackTrace.Events.UPDATED);
    sinon.assert.notCalled(listener);

    // Trigger update on the cause error's stackTrace
    symbolizedError.cause?.stackTrace.dispatchEventToListeners(StackTrace.StackTrace.Events.UPDATED);
    sinon.assert.notCalled(listener);

    // Trigger update on the cause error directly
    symbolizedError.cause?.dispatchEventToListeners(Bindings.SymbolizedError.Events.UPDATED);
    sinon.assert.notCalled(listener);
  });
});
