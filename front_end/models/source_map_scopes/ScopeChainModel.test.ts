// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as SourceMapScopes from './source_map_scopes.js';

describeWithMockConnection('ScopeChainModel', () => {
  let clock: sinon.SinonFakeTimers;
  let stubPluginManager: sinon.SinonStubbedInstance<Bindings.DebuggerLanguagePlugins.DebuggerLanguagePluginManager>;

  beforeEach(() => {
    clock = sinon.useFakeTimers();

    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: true, debuggerWorkspaceBinding});

    stubPluginManager = sinon.createStubInstance(
        Bindings.DebuggerLanguagePlugins.DebuggerLanguagePluginManager, {resolveScopeChain: Promise.resolve(null)});
    sinon.stub(debuggerWorkspaceBinding, 'pluginManager').value(stubPluginManager);
  });

  afterEach(() => {
    clock.restore();
  });

  it('emits an event after it was constructed with the scope chain', async () => {
    const target = createTarget();
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel)!;
    const fakeFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    fakeFrame.debuggerModel = debuggerModel;
    // @ts-ignore readonly for test.
    fakeFrame.script = sinon.createStubInstance(SDK.Script.Script, {isWasm: false});
    fakeFrame.scopeChain.returns([]);

    const scopeChainModel = new SourceMapScopes.ScopeChainModel.ScopeChainModel(fakeFrame);
    const listenerStub = sinon.stub();
    scopeChainModel.addEventListener(SourceMapScopes.ScopeChainModel.Events.SCOPE_CHAIN_UPDATED, listenerStub);

    await clock.tickAsync(10);

    assert.isTrue(listenerStub.calledOnce);
  });

  it('does not emit an event after it was disposed even with an update still in-flight', async () => {
    // Stub out the pluginManagers `resolveScopeChain` with a promise that we control.
    const {promise, resolve} = Promise.withResolvers<null>();
    stubPluginManager.resolveScopeChain.returns(promise);

    const target = createTarget();
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel)!;
    const fakeFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    fakeFrame.debuggerModel = debuggerModel;
    // @ts-ignore readonly for test.
    fakeFrame.script = sinon.createStubInstance(SDK.Script.Script, {isWasm: false});

    fakeFrame.scopeChain.returns([]);

    const scopeChainModel = new SourceMapScopes.ScopeChainModel.ScopeChainModel(fakeFrame);
    const listenerStub = sinon.stub();
    scopeChainModel.addEventListener(SourceMapScopes.ScopeChainModel.Events.SCOPE_CHAIN_UPDATED, listenerStub);

    await clock.tickAsync(10);

    assert.isTrue(stubPluginManager.resolveScopeChain.calledOnce);
    assert.isFalse(listenerStub.calledOnce);

    scopeChainModel.dispose();
    resolve(null);
    await clock.tickAsync(10);

    assert.isFalse(listenerStub.calledOnce);
  });
});
