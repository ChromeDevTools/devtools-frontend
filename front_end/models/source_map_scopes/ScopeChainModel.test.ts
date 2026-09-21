// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import {deinitializeGlobalVars} from '../../testing/EnvironmentHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as SourceMapScopes from './source_map_scopes.js';

describe('ScopeChainModel', () => {
  let universe: TestUniverse;
  let clock: sinon.SinonFakeTimers;
  let stubPluginManager: sinon.SinonStubbedInstance<Bindings.DebuggerLanguagePlugins.DebuggerLanguagePluginManager>;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    universe = new TestUniverse();

    stubPluginManager = sinon.createStubInstance(
        Bindings.DebuggerLanguagePlugins.DebuggerLanguagePluginManager, {resolveScopeChain: Promise.resolve(null)});
    sinon.stub(universe.debuggerWorkspaceBinding, 'pluginManager').value(stubPluginManager);
  });

  afterEach(async () => {
    clock.restore();
    await deinitializeGlobalVars();
    sinon.restore();
  });

  it('emits an event after it was constructed with the scope chain', async () => {
    const target = universe.createTarget();
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel)!;
    const fakeFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    fakeFrame.debuggerModel = debuggerModel;
    // @ts-expect-error readonly for test.
    fakeFrame.script = sinon.createStubInstance(SDK.Script.Script, {isWasm: false});
    fakeFrame.scopeChain.returns([]);

    const scopeChainModel =
        new SourceMapScopes.ScopeChainModel.ScopeChainModel(fakeFrame, universe.debuggerWorkspaceBinding);
    const listenerStub = sinon.stub();
    scopeChainModel.addEventListener(SourceMapScopes.ScopeChainModel.Events.SCOPE_CHAIN_UPDATED, listenerStub);

    await clock.tickAsync(10);

    sinon.assert.calledOnce(listenerStub);
  });

  it('does not emit an event after it was disposed even with an update still in-flight', async () => {
    // Stub out the pluginManagers `resolveScopeChain` with a promise that we control.
    const {promise, resolve} = Promise.withResolvers<null>();
    stubPluginManager.resolveScopeChain.returns(promise);

    const target = universe.createTarget();
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel)!;
    const fakeFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    fakeFrame.debuggerModel = debuggerModel;
    // @ts-expect-error readonly for test.
    fakeFrame.script = sinon.createStubInstance(SDK.Script.Script, {isWasm: false});

    fakeFrame.scopeChain.returns([]);

    const scopeChainModel =
        new SourceMapScopes.ScopeChainModel.ScopeChainModel(fakeFrame, universe.debuggerWorkspaceBinding);
    const listenerStub = sinon.stub();
    scopeChainModel.addEventListener(SourceMapScopes.ScopeChainModel.Events.SCOPE_CHAIN_UPDATED, listenerStub);

    await clock.tickAsync(10);

    sinon.assert.calledOnce(stubPluginManager.resolveScopeChain);
    assert.isFalse(listenerStub.calledOnce);

    scopeChainModel.dispose();
    resolve(null);
    await clock.tickAsync(10);

    assert.isFalse(listenerStub.calledOnce);
  });

  it('emits an event when a source map is attached or detached for the call frame script', async () => {
    const target = universe.createTarget();
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel)!;
    const fakeFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    fakeFrame.debuggerModel = debuggerModel;
    const script = sinon.createStubInstance(SDK.Script.Script, {isWasm: false});
    // @ts-expect-error readonly for test.
    fakeFrame.script = script;
    fakeFrame.scopeChain.returns([]);

    const scopeChainModel =
        new SourceMapScopes.ScopeChainModel.ScopeChainModel(fakeFrame, universe.debuggerWorkspaceBinding);
    const listenerStub = sinon.stub();
    scopeChainModel.addEventListener(SourceMapScopes.ScopeChainModel.Events.SCOPE_CHAIN_UPDATED, listenerStub);

    await clock.tickAsync(10);
    sinon.assert.calledOnce(listenerStub);

    const sourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
    debuggerModel.sourceMapManager().dispatchEventToListeners(SDK.SourceMapManager.Events.SourceMapAttached,
                                                              {client: script, sourceMap});
    await clock.tickAsync(10);
    sinon.assert.calledTwice(listenerStub);

    debuggerModel.sourceMapManager().dispatchEventToListeners(SDK.SourceMapManager.Events.SourceMapDetached,
                                                              {client: script, sourceMap});
    await clock.tickAsync(10);
    sinon.assert.calledThrice(listenerStub);

    scopeChainModel.dispose();
  });

  it('reuses the exact same ScopeChainEntry and RemoteObject instances across consumers and invalidates on DebugInfoAttached',
     async () => {
       const target = universe.createTarget();
       const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel)!;
       const fakeFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
       fakeFrame.debuggerModel = debuggerModel;
       const script = sinon.createStubInstance(SDK.Script.Script, {isWasm: false});
       // @ts-expect-error readonly for test.
       fakeFrame.script = script;

       const localScope = sinon.createStubInstance(SDK.DebuggerModel.Scope, {
         callFrame: fakeFrame,
         type: Protocol.Debugger.ScopeType.Local,
         empty: false,
       });
       localScope.object.callsFake(() => new SDK.RemoteObject.LocalJSONObject({x: 42}));
       fakeFrame.scopeChain.returns([localScope]);

       const model1 = new SourceMapScopes.ScopeChainModel.ScopeChainModel(fakeFrame, universe.debuggerWorkspaceBinding);
       const listenerStub = sinon.stub();
       model1.addEventListener(SourceMapScopes.ScopeChainModel.Events.SCOPE_CHAIN_UPDATED, listenerStub);
       await clock.tickAsync(10);

       sinon.assert.calledOnce(listenerStub);
       const chainFromEvent: SDK.DebuggerModel.ScopeChainEntry[] = listenerStub.firstCall.args[0].data.scopeChain;

       const model2 = new SourceMapScopes.ScopeChainModel.ScopeChainModel(fakeFrame, universe.debuggerWorkspaceBinding);
       const chainFromSecondModel = await model2.resolveScopeChain();

       sinon.assert.calledOnce(stubPluginManager.resolveScopeChain);
       assert.lengthOf(chainFromEvent, 1);
       assert.strictEqual(chainFromEvent, chainFromSecondModel);
       assert.strictEqual(chainFromEvent[0], chainFromSecondModel[0]);
       assert.strictEqual(chainFromEvent[0].object(), chainFromSecondModel[0].object());
       sinon.assert.calledOnce(localScope.object);

       debuggerModel.dispatchEventToListeners(SDK.DebuggerModel.Events.DebugInfoAttached, script);
       await clock.tickAsync(10);
       sinon.assert.calledTwice(listenerStub);
       const refreshedChain: SDK.DebuggerModel.ScopeChainEntry[] = listenerStub.secondCall.args[0].data.scopeChain;
       assert.notStrictEqual(refreshedChain, chainFromEvent);
       assert.notStrictEqual(refreshedChain[0], chainFromEvent[0]);

       model1.dispose();
       model2.dispose();
     });
});
