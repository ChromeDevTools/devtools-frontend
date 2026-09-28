// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as SourceMapScopes from './source_map_scopes.js';

describe('ScopeChainResolver', () => {
  let universe: TestUniverse;
  let stubPluginManager: sinon.SinonStubbedInstance<Bindings.DebuggerLanguagePlugins.DebuggerLanguagePluginManager>;

  beforeEach(() => {
    universe = new TestUniverse();

    stubPluginManager = sinon.createStubInstance(Bindings.DebuggerLanguagePlugins.DebuggerLanguagePluginManager,
                                                 {resolveScopeChain: Promise.resolve(null)});
    sinon.stub(universe.debuggerWorkspaceBinding, 'pluginManager').value(stubPluginManager);
  });

  afterEach(() => {
    universe.dispose();
    sinon.restore();
  });

  function createFakeCallFrame(debuggerModel: SDK.DebuggerModel.DebuggerModel,
                               script = sinon.createStubInstance(SDK.Script.Script, {isWasm: false})):
      sinon.SinonStubbedInstance<SDK.DebuggerModel.CallFrame> {
    const fakeFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
    fakeFrame.debuggerModel = debuggerModel;
    // @ts-expect-error readonly for test.
    fakeFrame.script = script;
    fakeFrame.scopeChain.returns([]);
    return fakeFrame;
  }

  it('returns the same scope chain promise for repeated calls with the same call frame', async () => {
    const debuggerModel = universe.createTarget().model(SDK.DebuggerModel.DebuggerModel)!;
    const fakeFrame = createFakeCallFrame(debuggerModel);
    const resolver = universe.scopeChainResolver;

    const promise1 = resolver.resolveScopeChain(fakeFrame);
    const promise2 = resolver.resolveScopeChain(fakeFrame);

    assert.strictEqual(promise1, promise2);
    assert.strictEqual(await promise1, await promise2);
    sinon.assert.calledOnce(stubPluginManager.resolveScopeChain);
  });

  it('resolves call frames of the same script separately', async () => {
    const debuggerModel = universe.createTarget().model(SDK.DebuggerModel.DebuggerModel)!;
    const script = sinon.createStubInstance(SDK.Script.Script, {isWasm: false});
    const fakeFrame1 = createFakeCallFrame(debuggerModel, script);
    const fakeFrame2 = createFakeCallFrame(debuggerModel, script);
    const resolver = universe.scopeChainResolver;

    const promise1 = resolver.resolveScopeChain(fakeFrame1);
    const promise2 = resolver.resolveScopeChain(fakeFrame2);

    assert.notStrictEqual(promise1, promise2);
    await Promise.all([promise1, promise2]);
    sinon.assert.calledTwice(stubPluginManager.resolveScopeChain);
  });

  describe('invalidates the cache for a script', () => {
    it('when a source map is attached', () => {
      const debuggerModel = universe.createTarget().model(SDK.DebuggerModel.DebuggerModel)!;
      const fakeFrame = createFakeCallFrame(debuggerModel);
      const resolver = universe.scopeChainResolver;
      const promise1 = resolver.resolveScopeChain(fakeFrame);

      const sourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
      debuggerModel.sourceMapManager().dispatchEventToListeners(SDK.SourceMapManager.Events.SourceMapAttached,
                                                                {client: fakeFrame.script, sourceMap});

      assert.notStrictEqual(resolver.resolveScopeChain(fakeFrame), promise1);
    });

    it('when a source map is detached', () => {
      const debuggerModel = universe.createTarget().model(SDK.DebuggerModel.DebuggerModel)!;
      const fakeFrame = createFakeCallFrame(debuggerModel);
      const resolver = universe.scopeChainResolver;
      const promise1 = resolver.resolveScopeChain(fakeFrame);

      const sourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
      debuggerModel.sourceMapManager().dispatchEventToListeners(SDK.SourceMapManager.Events.SourceMapDetached,
                                                                {client: fakeFrame.script, sourceMap});

      assert.notStrictEqual(resolver.resolveScopeChain(fakeFrame), promise1);
    });

    it('when debug info is attached', () => {
      const debuggerModel = universe.createTarget().model(SDK.DebuggerModel.DebuggerModel)!;
      const fakeFrame = createFakeCallFrame(debuggerModel);
      const resolver = universe.scopeChainResolver;
      const promise1 = resolver.resolveScopeChain(fakeFrame);

      debuggerModel.dispatchEventToListeners(SDK.DebuggerModel.Events.DebugInfoAttached, fakeFrame.script);

      assert.notStrictEqual(resolver.resolveScopeChain(fakeFrame), promise1);
    });

    it('for targets that were created before the resolver', () => {
      const debuggerModel = universe.createTarget().model(SDK.DebuggerModel.DebuggerModel)!;
      const resolver = universe.scopeChainResolver;
      const fakeFrame = createFakeCallFrame(debuggerModel);
      const promise1 = resolver.resolveScopeChain(fakeFrame);

      debuggerModel.dispatchEventToListeners(SDK.DebuggerModel.Events.DebugInfoAttached, fakeFrame.script);

      assert.notStrictEqual(resolver.resolveScopeChain(fakeFrame), promise1);
    });

    it('for targets that were created after the resolver', () => {
      const resolver = universe.scopeChainResolver;
      const debuggerModel = universe.createTarget().model(SDK.DebuggerModel.DebuggerModel)!;
      const fakeFrame = createFakeCallFrame(debuggerModel);
      const promise1 = resolver.resolveScopeChain(fakeFrame);

      debuggerModel.dispatchEventToListeners(SDK.DebuggerModel.Events.DebugInfoAttached, fakeFrame.script);

      assert.notStrictEqual(resolver.resolveScopeChain(fakeFrame), promise1);
    });
  });

  it('does not invalidate the cache of unrelated scripts', () => {
    const debuggerModel = universe.createTarget().model(SDK.DebuggerModel.DebuggerModel)!;
    const fakeFrame = createFakeCallFrame(debuggerModel);
    const resolver = universe.scopeChainResolver;
    const promise1 = resolver.resolveScopeChain(fakeFrame);

    const otherScript = sinon.createStubInstance(SDK.Script.Script);
    debuggerModel.dispatchEventToListeners(SDK.DebuggerModel.Events.DebugInfoAttached, otherScript);

    assert.strictEqual(resolver.resolveScopeChain(fakeFrame), promise1);
  });

  it('dispatches SCOPE_CHAIN_INVALIDATED with the affected script', () => {
    const debuggerModel = universe.createTarget().model(SDK.DebuggerModel.DebuggerModel)!;
    const script = sinon.createStubInstance(SDK.Script.Script);
    const resolver = universe.scopeChainResolver;
    const listenerStub = sinon.stub();
    resolver.addEventListener(SourceMapScopes.ScopeChainResolver.Events.SCOPE_CHAIN_INVALIDATED, listenerStub);

    const sourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
    debuggerModel.sourceMapManager().dispatchEventToListeners(SDK.SourceMapManager.Events.SourceMapAttached,
                                                              {client: script, sourceMap});
    debuggerModel.sourceMapManager().dispatchEventToListeners(SDK.SourceMapManager.Events.SourceMapDetached,
                                                              {client: script, sourceMap});
    debuggerModel.dispatchEventToListeners(SDK.DebuggerModel.Events.DebugInfoAttached, script);

    sinon.assert.calledThrice(listenerStub);
    for (const call of listenerStub.getCalls()) {
      assert.strictEqual(call.args[0].data, script);
    }
  });

  it('stops listening to debugger models that are removed', () => {
    const target = universe.createTarget();
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel)!;
    const resolver = universe.scopeChainResolver;
    const listenerStub = sinon.stub();
    resolver.addEventListener(SourceMapScopes.ScopeChainResolver.Events.SCOPE_CHAIN_INVALIDATED, listenerStub);

    universe.targetManager.removeTarget(target);
    debuggerModel.dispatchEventToListeners(SDK.DebuggerModel.Events.DebugInfoAttached,
                                           sinon.createStubInstance(SDK.Script.Script));

    sinon.assert.notCalled(listenerStub);
  });
});
