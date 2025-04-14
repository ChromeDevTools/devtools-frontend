// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  createTarget,
} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('TargetManager', () => {
  let targetManager: SDK.TargetManager.TargetManager;

  beforeEach(() => {
    targetManager = SDK.TargetManager.TargetManager.instance();
  });

  function resourceTreeModel(target: SDK.Target.Target): SDK.ResourceTreeModel.ResourceTreeModel {
    const model = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(model);
    return model;
  }

  it('allows observing targets', () => {
    const observer = sinon.spy(new SDK.TargetManager.Observer());
    const target1 = createTarget();
    targetManager.observeTargets(observer);
    assert.isTrue(observer.targetAdded.calledOnceWith(target1));
    const target2 = createTarget();
    sinon.assert.calledTwice(observer.targetAdded);
    sinon.assert.calledWith(observer.targetAdded, target2);
    target2.dispose('YOLO!');
    assert.isTrue(observer.targetRemoved.calledOnceWith(target2));

    targetManager.unobserveTargets(observer);
    createTarget();
    sinon.assert.calledTwice(observer.targetAdded);
  });

  it('allows observing models', () => {
    const observer = sinon.spy(new SDK.TargetManager.SDKModelObserver<SDK.ResourceTreeModel.ResourceTreeModel>());
    const target1 = createTarget();
    targetManager.observeModels(SDK.ResourceTreeModel.ResourceTreeModel, observer);
    assert.isTrue(observer.modelAdded.calledOnceWith(resourceTreeModel(target1)));
    const target2 = createTarget();
    sinon.assert.calledTwice(observer.modelAdded);
    sinon.assert.calledWith(observer.modelAdded, resourceTreeModel(target2));
    target2.dispose('YOLO!');
    assert.isTrue(observer.modelRemoved.calledOnceWith(resourceTreeModel(target2)));

    targetManager.unobserveModels(SDK.ResourceTreeModel.ResourceTreeModel, observer);
    createTarget();
    sinon.assert.calledTwice(observer.modelAdded);
  });

  it('allows listening to models', () => {
    const WillReloadPage = SDK.ResourceTreeModel.Events.WillReloadPage;
    const thisObject = {};
    const listener = sinon.spy();
    const target1 = createTarget();

    targetManager.addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, WillReloadPage, listener, thisObject);

    resourceTreeModel(target1).dispatchEventToListeners(WillReloadPage);
    sinon.assert.calledOnce(listener);
    sinon.assert.calledOn(listener, thisObject);

    const target2 = createTarget();
    resourceTreeModel(target2).dispatchEventToListeners(WillReloadPage);
    sinon.assert.calledTwice(listener);
    sinon.assert.calledOn(listener, thisObject);

    targetManager.removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel, WillReloadPage, listener, thisObject);
    resourceTreeModel(target1).dispatchEventToListeners(WillReloadPage);
    sinon.assert.calledTwice(listener);
  });

  it('allows observing targets in scope', () => {
    const target1 = createTarget();
    const target2 = createTarget();
    targetManager.setScopeTarget(target1);
    const observer = sinon.spy(new SDK.TargetManager.Observer());

    targetManager.observeTargets(observer, {scoped: true});
    assert.isTrue(observer.targetAdded.calledOnceWith(target1));

    createTarget({parentTarget: target2});
    assert.isTrue(observer.targetAdded.calledOnceWith(target1));

    const subtarget1 = createTarget({parentTarget: target1});
    sinon.assert.calledTwice(observer.targetAdded);
    sinon.assert.calledWith(observer.targetAdded, subtarget1);
  });

  it('allows observing models in scope', () => {
    const target1 = createTarget();
    const target2 = createTarget();
    targetManager.setScopeTarget(target1);
    const observer = sinon.spy(new SDK.TargetManager.SDKModelObserver<SDK.ResourceTreeModel.ResourceTreeModel>());

    targetManager.observeModels(SDK.ResourceTreeModel.ResourceTreeModel, observer, {scoped: true});
    assert.isTrue(observer.modelAdded.calledOnceWith(resourceTreeModel(target1)));

    createTarget({parentTarget: target2});
    sinon.assert.calledOnce(observer.modelAdded);

    const subtarget1 = createTarget({parentTarget: target1});
    sinon.assert.calledTwice(observer.modelAdded);
    sinon.assert.calledWith(observer.modelAdded, resourceTreeModel(subtarget1));
  });

  it('calls second observers even if the first is changing the scope', () => {
    const target1 = createTarget();
    const target2 = createTarget();
    targetManager.setScopeTarget(target1);
    const observer1 = sinon.stub(new SDK.TargetManager.SDKModelObserver<SDK.ResourceTreeModel.ResourceTreeModel>());
    observer1.modelRemoved.callsFake(() => targetManager.setScopeTarget(target2));
    const observer2 = sinon.spy(new SDK.TargetManager.SDKModelObserver<SDK.RuntimeModel.RuntimeModel>());

    targetManager.observeModels(SDK.ResourceTreeModel.ResourceTreeModel, observer1, {scoped: true});
    targetManager.observeModels(SDK.RuntimeModel.RuntimeModel, observer2, {scoped: true});

    target1.dispose('YOLO!');
    sinon.assert.calledOnce(observer1.modelRemoved);
    sinon.assert.calledOnce(observer2.modelRemoved);
  });

  it('allows listening to models in scope', () => {
    const WillReloadPage = SDK.ResourceTreeModel.Events.WillReloadPage;
    const listener = sinon.spy();
    const target1 = createTarget();
    targetManager.setScopeTarget(target1);
    const thisObject = {};

    targetManager.addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, WillReloadPage, listener, thisObject, {scoped: true});

    resourceTreeModel(target1).dispatchEventToListeners(WillReloadPage);
    sinon.assert.calledOnce(listener);
    sinon.assert.calledOn(listener, thisObject);

    const target2 = createTarget();
    resourceTreeModel(target2).dispatchEventToListeners(WillReloadPage);
    sinon.assert.calledOnce(listener);

    const subtarget1 = createTarget({parentTarget: target1});
    resourceTreeModel(subtarget1).dispatchEventToListeners(WillReloadPage);
    sinon.assert.calledTwice(listener);

    targetManager.setScopeTarget(target2);
    resourceTreeModel(target1).dispatchEventToListeners(WillReloadPage);
    sinon.assert.calledTwice(listener);

    resourceTreeModel(target2).dispatchEventToListeners(WillReloadPage);
    sinon.assert.calledThrice(listener);
  });

  it('can transition between scopes', () => {
    const target1 = createTarget();
    const target2 = createTarget();
    const targetObserver = sinon.spy(new SDK.TargetManager.Observer());
    const modelObserver = sinon.spy(new SDK.TargetManager.SDKModelObserver<SDK.ResourceTreeModel.ResourceTreeModel>());
    const scopeChangeListener = sinon.spy();

    targetManager.observeTargets(targetObserver, {scoped: true});
    targetManager.observeModels(SDK.ResourceTreeModel.ResourceTreeModel, modelObserver, {scoped: true});
    targetManager.addScopeChangeListener(scopeChangeListener);

    assert.isTrue(targetObserver.targetAdded.calledOnceWith(target1));
    sinon.assert.calledOnce(modelObserver.modelAdded);
    sinon.assert.notCalled(targetObserver.targetRemoved);
    sinon.assert.notCalled(modelObserver.modelRemoved);
    sinon.assert.notCalled(scopeChangeListener);

    targetObserver.targetAdded.resetHistory();
    modelObserver.modelAdded.resetHistory();

    targetManager.setScopeTarget(target2);
    assert.isTrue(targetObserver.targetRemoved.calledOnceWith(target1));
    sinon.assert.calledOnce(modelObserver.modelRemoved);
    assert.isTrue(targetObserver.targetAdded.calledOnceWith(target2));
    sinon.assert.calledOnce(modelObserver.modelAdded);
    assert.isTrue(targetObserver.targetAdded.calledAfter(targetObserver.targetRemoved));
    assert.isTrue(modelObserver.modelAdded.calledAfter(modelObserver.modelRemoved));
    sinon.assert.called(scopeChangeListener);

    targetObserver.targetAdded.resetHistory();
    targetObserver.targetRemoved.resetHistory();
    modelObserver.modelAdded.resetHistory();
    modelObserver.modelRemoved.resetHistory();
    scopeChangeListener.resetHistory();

    targetManager.setScopeTarget(null);
    sinon.assert.notCalled(targetObserver.targetAdded);
    assert.isFalse(modelObserver.modelAdded.calledOnce);
    assert.isTrue(targetObserver.targetRemoved.calledOnceWith(target1));
    sinon.assert.called(modelObserver.modelRemoved);
    sinon.assert.called(scopeChangeListener);

    targetObserver.targetAdded.resetHistory();
    targetObserver.targetRemoved.resetHistory();
    modelObserver.modelAdded.resetHistory();
    modelObserver.modelRemoved.resetHistory();
    scopeChangeListener.resetHistory();

    const target3 = createTarget();
    sinon.assert.notCalled(targetObserver.targetAdded);
    sinon.assert.notCalled(modelObserver.modelAdded);
    sinon.assert.notCalled(scopeChangeListener);

    targetManager.setScopeTarget(target3);
    sinon.assert.called(targetObserver.targetAdded);
    sinon.assert.called(modelObserver.modelAdded);
    sinon.assert.called(scopeChangeListener);
  });

  it('short-cicuits setting the same scope target', () => {
    const target1 = createTarget();
    targetManager.setScopeTarget(target1);
    const targetObserver = sinon.spy(new SDK.TargetManager.Observer());
    const modelObserver = sinon.spy(new SDK.TargetManager.SDKModelObserver<SDK.ResourceTreeModel.ResourceTreeModel>());

    targetObserver.targetAdded.resetHistory();
    targetObserver.targetRemoved.resetHistory();
    modelObserver.modelAdded.resetHistory();
    modelObserver.modelRemoved.resetHistory();

    targetManager.setScopeTarget(target1);
    sinon.assert.notCalled(targetObserver.targetAdded);
    sinon.assert.notCalled(modelObserver.modelAdded);
    sinon.assert.notCalled(targetObserver.targetRemoved);
    sinon.assert.notCalled(modelObserver.modelRemoved);
  });

  it('notifies about inspected URL change', () => {
    const targets = [createTarget(), createTarget()];
    const inspectedURLChangedHostApi =
        sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'inspectedURLChanged');
    const inspectedURLChangedEventListener = sinon.spy();
    targetManager.addEventListener(SDK.TargetManager.Events.INSPECTED_URL_CHANGED, inspectedURLChangedEventListener);

    targetManager.setScopeTarget(null);
    assert.isTrue(inspectedURLChangedHostApi.notCalled && inspectedURLChangedEventListener.notCalled);

    targets.forEach(t => t.setInspectedURL(urlString`${`https://a.com/${t.id()}`}`));
    assert.isTrue(inspectedURLChangedHostApi.notCalled && inspectedURLChangedEventListener.notCalled);

    targetManager.setScopeTarget(targets[0]);
    assert.isTrue(inspectedURLChangedHostApi.calledOnce && inspectedURLChangedEventListener.calledOnce);
    assert.strictEqual(inspectedURLChangedHostApi.lastCall.firstArg, `https://a.com/${targets[0].id()}`);
    assert.strictEqual(inspectedURLChangedEventListener.lastCall.firstArg.data, targets[0]);

    targetManager.setScopeTarget(targets[0]);
    assert.isTrue(inspectedURLChangedHostApi.calledOnce && inspectedURLChangedEventListener.calledOnce);

    targets.forEach(t => t.setInspectedURL(urlString`${`https://b.com/${t.id()}`}`));
    assert.isTrue(inspectedURLChangedHostApi.calledTwice && inspectedURLChangedEventListener.calledTwice);
    assert.strictEqual(inspectedURLChangedHostApi.lastCall.firstArg, `https://b.com/${targets[0].id()}`);
    assert.strictEqual(inspectedURLChangedEventListener.lastCall.firstArg.data, targets[0]);

    targetManager.setScopeTarget(targets[1]);
    assert.isTrue(inspectedURLChangedHostApi.calledThrice && inspectedURLChangedEventListener.calledThrice);
    assert.strictEqual(inspectedURLChangedHostApi.lastCall.firstArg, `https://b.com/${targets[1].id()}`);
    assert.strictEqual(inspectedURLChangedEventListener.lastCall.firstArg.data, targets[1]);

    targets.forEach(t => t.setInspectedURL(urlString`${`https://c.com/${t.id()}`}`));
    sinon.assert.callCount(inspectedURLChangedHostApi, 4);
    sinon.assert.callCount(inspectedURLChangedEventListener, 4);
    assert.strictEqual(inspectedURLChangedHostApi.lastCall.firstArg, `https://c.com/${targets[1].id()}`);
    assert.strictEqual(inspectedURLChangedEventListener.lastCall.firstArg.data, targets[1]);
  });
});
