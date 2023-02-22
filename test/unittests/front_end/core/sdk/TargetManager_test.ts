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

describeWithMockConnection('TargetManager', () => {
  let targetManager: SDK.TargetManager.TargetManager;

  beforeEach(() => {
    targetManager = SDK.TargetManager.TargetManager.instance();
  });

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
    const model1 = target1.model(SDK.ResourceTreeModel.ResourceTreeModel) as SDK.ResourceTreeModel.ResourceTreeModel;
    targetManager.observeModels(SDK.ResourceTreeModel.ResourceTreeModel, observer);
    assert.isTrue(observer.modelAdded.calledOnceWith(model1));
    const target2 = createTarget();
    const model2 = target2.model(SDK.ResourceTreeModel.ResourceTreeModel) as SDK.ResourceTreeModel.ResourceTreeModel;
    assert.isTrue(observer.modelAdded.calledTwice);
    assert.isTrue(observer.modelAdded.calledWith(model2));
    target2.dispose('YOLO!');
    assert.isTrue(observer.modelRemoved.calledOnceWith(model2));

    targetManager.unobserveModels(SDK.ResourceTreeModel.ResourceTreeModel, observer);
    createTarget();
    assert.isTrue(observer.modelAdded.calledTwice);
  });

  it('allows listening to models', () => {
    const thisObject = {};
    const listener = sinon.spy();
    const target1 = createTarget();
    targetManager.addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.WillReloadPage, listener, thisObject);
    target1.model(SDK.ResourceTreeModel.ResourceTreeModel)
        ?.dispatchEventToListeners(SDK.ResourceTreeModel.Events.WillReloadPage);
    assert.isTrue(listener.calledOnce);
    assert.isTrue(listener.calledOn(thisObject));
    const target2 = createTarget();
    target2.model(SDK.ResourceTreeModel.ResourceTreeModel)
        ?.dispatchEventToListeners(SDK.ResourceTreeModel.Events.WillReloadPage);
    assert.isTrue(listener.calledTwice);
    assert.isTrue(listener.calledOn(thisObject));

    targetManager.removeModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.WillReloadPage, listener, thisObject);
    target1.model(SDK.ResourceTreeModel.ResourceTreeModel)
        ?.dispatchEventToListeners(SDK.ResourceTreeModel.Events.WillReloadPage);
    assert.isTrue(listener.calledTwice);
  });
});
