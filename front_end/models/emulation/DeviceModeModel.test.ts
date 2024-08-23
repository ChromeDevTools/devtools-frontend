// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {getMainFrame, navigate} from '../../testing/ResourceTreeHelpers.js';
import * as EmulationModel from '../emulation/emulation.js';

describe('Insets', () => {
  it('can be instantiated without issues', () => {
    const insets = new EmulationModel.DeviceModeModel.Insets(1, 2, 3, 4);
    assert.strictEqual(insets.left, 1, 'left value was not set correctly');
    assert.strictEqual(insets.top, 2, 'top value was not set correctly');
    assert.strictEqual(insets.right, 3, 'right value was not set correctly');
    assert.strictEqual(insets.bottom, 4, 'bottom value was not set correctly');
  });

  it('is able to check if it is equal to another Insets', () => {
    const insets1 = new EmulationModel.DeviceModeModel.Insets(1, 2, 3, 4);
    const insets2 = new EmulationModel.DeviceModeModel.Insets(5, 6, 7, 7);
    const insets3 = new EmulationModel.DeviceModeModel.Insets(1, 2, 3, 4);
    const result1 = insets1.isEqual(insets2);
    const result2 = insets1.isEqual(insets3);
    assert.isFalse(result1, 'insets2 was considered equal');
    assert.isTrue(result2, 'insets3 was not considered equal');
  });
});

describe('Rect', () => {
  it('can be instantiated without issues', () => {
    const rect = new EmulationModel.DeviceModeModel.Rect(1, 2, 3, 4);
    assert.strictEqual(rect.left, 1, 'left value was not set correctly');
    assert.strictEqual(rect.top, 2, 'top value was not set correctly');
    assert.strictEqual(rect.width, 3, 'width value was not set correctly');
    assert.strictEqual(rect.height, 4, 'height value was not set correctly');
  });

  it('is able to check if it is equal to another Rect', () => {
    const rect1 = new EmulationModel.DeviceModeModel.Rect(1, 2, 3, 4);
    const rect2 = new EmulationModel.DeviceModeModel.Rect(5, 6, 7, 7);
    const rect3 = new EmulationModel.DeviceModeModel.Rect(1, 2, 3, 4);
    const result1 = rect1.isEqual(rect2);
    const result2 = rect1.isEqual(rect3);
    assert.isFalse(result1, 'rect2 was considered equal');
    assert.isTrue(result2, 'rect3 was not considered equal');
  });

  it('is able to be scaled to a certain value', () => {
    const rect = new EmulationModel.DeviceModeModel.Rect(1, 2, 3, 4);
    const resultRect = rect.scale(2);
    assert.strictEqual(resultRect.left, 2, 'left value was not set correctly');
    assert.strictEqual(resultRect.top, 4, 'top value was not set correctly');
    assert.strictEqual(resultRect.width, 6, 'width value was not set correctly');
    assert.strictEqual(resultRect.height, 8, 'height value was not set correctly');
  });

  it('is able to return a rectangle relative to an origin', () => {
    const rect = new EmulationModel.DeviceModeModel.Rect(5, 6, 7, 8);
    const origin = new EmulationModel.DeviceModeModel.Rect(1, 2, 3, 4);
    const result = rect.relativeTo(origin);
    assert.strictEqual(result.left, 4, 'left value was not set correctly');
    assert.strictEqual(result.top, 4, 'top value was not set correctly');
    assert.strictEqual(result.width, 7, 'width value was not set correctly');
    assert.strictEqual(result.height, 8, 'height value was not set correctly');
  });

  it('is able to return a rectangle rebased to an origin', () => {
    const rect = new EmulationModel.DeviceModeModel.Rect(5, 6, 7, 8);
    const origin = new EmulationModel.DeviceModeModel.Rect(1, 2, 3, 4);
    const result = rect.rebaseTo(origin);
    assert.strictEqual(result.left, 6, 'left value was not set correctly');
    assert.strictEqual(result.top, 8, 'top value was not set correctly');
    assert.strictEqual(result.width, 7, 'width value was not set correctly');
    assert.strictEqual(result.height, 8, 'height value was not set correctly');
  });
});

describeWithMockConnection('DeviceModeModel', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    stubNoopSettings();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
  });

  it('shows hinge on main frame resize', () => {
    EmulationModel.DeviceModeModel.DeviceModeModel.instance({forceNew: true});
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const setShowHinge = sinon.spy(target.overlayAgent(), 'invoke_setShowHinge');
    resourceTreeModel!.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameResized);
    assert.isTrue(setShowHinge.calledOnce);
  });

  it('shows hinge on main frame navigation', () => {
    EmulationModel.DeviceModeModel.DeviceModeModel.instance({forceNew: true});
    const setShowHinge = sinon.spy(target.overlayAgent(), 'invoke_setShowHinge');
    navigate(getMainFrame(target));
    assert.isTrue(setShowHinge.calledOnce);
  });
});
