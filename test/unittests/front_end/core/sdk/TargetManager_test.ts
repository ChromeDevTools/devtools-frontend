// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';

import {
  describeWithMockConnection,
} from '../../helpers/MockConnection.js';
import {
  createTarget,
} from '../../helpers/EnvironmentHelpers.js';

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';

describeWithMockConnection('TargetManager', () => {
  let targetManager: SDK.TargetManager.TargetManager;

  beforeEach(() => {
    targetManager = SDK.TargetManager.TargetManager.instance();
  });

  function resourceTreeModel(target: SDK.Target.Target): SDK.ResourceTreeModel.ResourceTreeModel {
    const model = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assertNotNullOrUndefined(model);
    return model;
  }

  it('allows observing targets', () => {
    const observer = sinon.spy(new SDK.TargetManager.Observer());
    const target1 = createTarget();
    targetManager.observeTargets(observer);
    assert.isTrue(observer.targetAdded.calledOnceWith(target1));
    const target2 = createTarget();
    assert.isTrue(observer.targetAdded.calledTwice);
    assert.isTrue(observer.targetAdded.calledWith(target2));
    target2.dispose('YOLO!');
    assert.isTrue(observer.targetRemoved.calledOnceWith(target2));

    targetManager.unobserveTargets(observer);
    createTarget();
    assert.isTrue(observer.targetAdded.calledTwice);
  });

  it('allows observing models', () => {
    const observer = sinon.spy(new SDK.TargetManager.SDKModelObserver<SDK.ResourceTreeModel.ResourceTreeModel>());
    const target1 = createTarget();
    targetManager.observeModels(SDK.ResourceTreeModel.ResourceTreeModel, observer);
    assert.isTrue(observer.modelAdded.calledOnceWith(resourceTreeModel(target1)));
    const target2 = createTarget();
    assert.isTrue(observer.modelAdded.calledTwice);
    assert.isTrue(observer.modelAdded.calledWith(resourceTreeModel(target2)));
    target2.dispose('YOLO!');
    assert.isTrue(observer.modelRemoved.calledOnceWith(resourceTreeModel(target2)));

    targetManager.unobserveModels(SDK.ResourceTreeModel.ResourceTreeModel, observer);
    createTarget();
    assert.isTrue(observer.modelAdded.calledTwice);
  });

  it('allows listening to models', () => {
    const WillReloadPage = SDK.ResourceTreeModel.Events.WillReloadPage;
    const thisObject = {};
    const listener = sinon.spy();
    const target1 = createTarget();

    targetManager.addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, WillReloadPage, listener, thisObject);

    resourceTreeModel(target1).dispatchEventToListeners(WillReloadPage);
    assert.isTrue(listener.calledOnce);
    assert.isTrue(listener.calledOn(thisObject));

    const target2 = createTarget();
    resourceTreeModel(target2).dispatchEventToListeners(WillReloadPage);
    assert.isTrue(listener.calledTwice);
    assert.isTrue(listener.calledOn(thisObject));

    targetManager.removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel, WillReloadPage, listener, thisObject);
    resourceTreeModel(target1).dispatchEventToListeners(WillReloadPage);
    assert.isTrue(listener.calledTwice);
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
    assert.isTrue(observer.targetAdded.calledTwice);
    assert.isTrue(observer.targetAdded.calledWith(subtarget1));
  });

  it('allows observing models in scope', () => {
    const target1 = createTarget();
    const target2 = createTarget();
    targetManager.setScopeTarget(target1);
    const observer = sinon.spy(new SDK.TargetManager.SDKModelObserver<SDK.ResourceTreeModel.ResourceTreeModel>());

    targetManager.observeModels(SDK.ResourceTreeModel.ResourceTreeModel, observer, {scoped: true});
    assert.isTrue(observer.modelAdded.calledOnceWith(resourceTreeModel(target1)));

    createTarget({parentTarget: target2});
    assert.isTrue(observer.modelAdded.calledOnce);

    const subtarget1 = createTarget({parentTarget: target1});
    assert.isTrue(observer.modelAdded.calledTwice);
    assert.isTrue(observer.modelAdded.calledWith(resourceTreeModel(subtarget1)));
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
    assert.isTrue(listener.calledOnce);
    assert.isTrue(listener.calledOn(thisObject));

    const target2 = createTarget();
    resourceTreeModel(target2).dispatchEventToListeners(WillReloadPage);
    assert.isTrue(listener.calledOnce);

    const subtarget1 = createTarget({parentTarget: target1});
    resourceTreeModel(subtarget1).dispatchEventToListeners(WillReloadPage);
    assert.isTrue(listener.calledTwice);

    targetManager.setScopeTarget(target2);
    resourceTreeModel(target1).dispatchEventToListeners(WillReloadPage);
    assert.isTrue(listener.calledTwice);

    resourceTreeModel(target2).dispatchEventToListeners(WillReloadPage);
    assert.isTrue(listener.calledThrice);
  });

  it('can transition between scopes', () => {
    const target1 = createTarget();
    const target2 = createTarget();
    const targetObserver = sinon.spy(new SDK.TargetManager.Observer());
    const modelObserver = sinon.spy(new SDK.TargetManager.SDKModelObserver<SDK.ResourceTreeModel.ResourceTreeModel>());

    targetManager.observeTargets(targetObserver, {scoped: true});
    targetManager.observeModels(SDK.ResourceTreeModel.ResourceTreeModel, modelObserver, {scoped: true});

    assert.isTrue(targetObserver.targetAdded.calledOnceWith(target1));
    assert.isTrue(modelObserver.modelAdded.calledOnce);
    assert.isFalse(targetObserver.targetRemoved.called);
    assert.isFalse(modelObserver.modelRemoved.called);

    targetObserver.targetAdded.resetHistory();
    modelObserver.modelAdded.resetHistory();

    targetManager.setScopeTarget(target2);
    assert.isTrue(targetObserver.targetRemoved.calledOnceWith(target1));
    assert.isTrue(modelObserver.modelRemoved.calledOnce);
    assert.isTrue(targetObserver.targetAdded.calledOnceWith(target2));
    assert.isTrue(modelObserver.modelAdded.calledOnce);
    assert.isTrue(targetObserver.targetAdded.calledAfter(targetObserver.targetRemoved));
    assert.isTrue(modelObserver.modelAdded.calledAfter(modelObserver.modelRemoved));

    targetObserver.targetAdded.resetHistory();
    targetObserver.targetRemoved.resetHistory();
    modelObserver.modelAdded.resetHistory();
    modelObserver.modelRemoved.resetHistory();

    targetManager.setScopeTarget(null);
    assert.isFalse(targetObserver.targetAdded.called);
    assert.isFalse(modelObserver.modelAdded.calledOnce);
    assert.isTrue(targetObserver.targetRemoved.calledOnceWith(target1));
    assert.isTrue(modelObserver.modelRemoved.called);

    targetObserver.targetAdded.resetHistory();
    targetObserver.targetRemoved.resetHistory();
    modelObserver.modelAdded.resetHistory();
    modelObserver.modelRemoved.resetHistory();

    const target3 = createTarget();
    assert.isFalse(targetObserver.targetAdded.called);
    assert.isFalse(modelObserver.modelAdded.called);

    targetManager.setScopeTarget(target3);
    assert.isTrue(targetObserver.targetAdded.called);
    assert.isTrue(modelObserver.modelAdded.called);
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
    assert.isFalse(targetObserver.targetAdded.called);
    assert.isFalse(modelObserver.modelAdded.called);
    assert.isFalse(targetObserver.targetRemoved.called);
    assert.isFalse(modelObserver.modelRemoved.called);
  });

});
