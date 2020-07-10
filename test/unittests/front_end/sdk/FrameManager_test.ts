// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../front_end/sdk/sdk.js';
import * as Common from '../../../../front_end/common/common.js';

class MockResourceTreeModel extends Common.ObjectWrapper.ObjectWrapper {
  private _targetId: string;

  constructor(id: string) {
    super();
    this._targetId = id;
  }

  target() {
    return {id: () => this._targetId};
  }
}

class MockResourceTreeFrame {
  private _targetId: string;
  id: string;

  constructor(frameId: string, targetId: string) {
    this.id = frameId;
    this._targetId = targetId;
  }

  resourceTreeModel = () => ({
    target: () => ({
      id: () => this._targetId,
    }),
  });

  isMainFrame = () => true;
}

describe('FrameManager', () => {
  it('collects frames from a ResourceTreeModel', () => {
    const mockModel = new MockResourceTreeModel('target-id');
    const mockFrame = new MockResourceTreeFrame('frame-id', 'target-id');

    const frameManager = new SDK.FrameManager.FrameManager();
    frameManager.modelAdded((mockModel as any) as SDK.ResourceTreeModel.ResourceTreeModel);
    const dispatchedEvents: any[] = [];
    frameManager.addEventListener(
        SDK.FrameManager.Events.FrameAddedToTarget, event => dispatchedEvents.push(event.data));

    mockModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, mockFrame);

    const frameIds = dispatchedEvents.map(event => event.frame.id);
    assert.deepStrictEqual(frameIds, ['frame-id']);
    const frameFromId = frameManager.getFrame('frame-id');
    assert.strictEqual(frameFromId?.id, 'frame-id');
  });

  it('handles attachment and detachment of frames', () => {
    const mockModel = new MockResourceTreeModel('target-id');
    const mockParentFrame = new MockResourceTreeFrame('parent-frame-id', 'target-id');
    const mockChildFrame = new MockResourceTreeFrame('child-frame-id', 'target-id');

    const frameManager = new SDK.FrameManager.FrameManager();
    frameManager.modelAdded((mockModel as any) as SDK.ResourceTreeModel.ResourceTreeModel);
    const dispatchedEvents: any[] = [];
    frameManager.addEventListener(
        SDK.FrameManager.Events.FrameAddedToTarget,
        event => dispatchedEvents.push({type: 'FrameAddedToTarget', data: event.data}));
    frameManager.addEventListener(
        SDK.FrameManager.Events.FrameRemoved, event => dispatchedEvents.push({type: 'FrameRemoved', data: event.data}));

    mockModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, mockParentFrame);
    mockModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, mockChildFrame);
    mockModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameDetached, mockChildFrame);

    const expectation = [
      {type: 'FrameAddedToTarget', data: {frame: {id: 'parent-frame-id', _targetId: 'target-id'}}},
      {type: 'FrameAddedToTarget', data: {frame: {id: 'child-frame-id', _targetId: 'target-id'}}},
      {type: 'FrameRemoved', data: {frameId: 'child-frame-id'}},
    ];
    assert.strictEqual(JSON.stringify(dispatchedEvents), JSON.stringify(expectation));
    let frameFromId = frameManager.getFrame('parent-frame-id');
    assert.strictEqual(frameFromId?.id, 'parent-frame-id');
    assert.strictEqual(frameFromId?.resourceTreeModel().target().id(), 'target-id');
    frameFromId = frameManager.getFrame('child-frame-id');
    assert.strictEqual(frameFromId, null);
  });

  it('handles removal of target', () => {
    const mockModel = new MockResourceTreeModel('target-id');
    const mockParentFrame = new MockResourceTreeFrame('parent-frame-id', 'target-id');
    const mockChildFrame = new MockResourceTreeFrame('child-frame-id', 'target-id');

    const frameManager = new SDK.FrameManager.FrameManager();
    frameManager.modelAdded((mockModel as any) as SDK.ResourceTreeModel.ResourceTreeModel);
    const dispatchedEvents: any[] = [];
    frameManager.addEventListener(
        SDK.FrameManager.Events.FrameAddedToTarget,
        event => dispatchedEvents.push({type: 'FrameAddedToTarget', data: event.data}));
    frameManager.addEventListener(
        SDK.FrameManager.Events.FrameRemoved, event => dispatchedEvents.push({type: 'FrameRemoved', data: event.data}));

    mockModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, mockParentFrame);
    mockModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, mockChildFrame);
    frameManager.modelRemoved((mockModel as any) as SDK.ResourceTreeModel.ResourceTreeModel);

    const expectation = [
      {type: 'FrameAddedToTarget', data: {frame: {id: 'parent-frame-id', _targetId: 'target-id'}}},
      {type: 'FrameAddedToTarget', data: {frame: {id: 'child-frame-id', _targetId: 'target-id'}}},
      {type: 'FrameRemoved', data: {frameId: 'parent-frame-id'}},
      {type: 'FrameRemoved', data: {frameId: 'child-frame-id'}},
    ];
    assert.strictEqual(JSON.stringify(dispatchedEvents), JSON.stringify(expectation));
    let frameFromId = frameManager.getFrame('parent-frame-id');
    assert.strictEqual(frameFromId, null);
    frameFromId = frameManager.getFrame('child-frame-id');
    assert.strictEqual(frameFromId, null);
  });

  it('a frame transferring to a different target', () => {
    const mockParentModel = new MockResourceTreeModel('parent-target-id');
    const mockChildModel = new MockResourceTreeModel('child-target-id');
    const mockParentFrame = new MockResourceTreeFrame('parent-frame-id', 'parent-target-id');
    const mockChildFrameParentTarget = new MockResourceTreeFrame('child-frame-id', 'parent-target-id');
    const mockChildFrameOwnTarget = new MockResourceTreeFrame('child-frame-id', 'child-target-id');

    const frameManager = new SDK.FrameManager.FrameManager();
    frameManager.modelAdded((mockParentModel as any) as SDK.ResourceTreeModel.ResourceTreeModel);
    const dispatchedEvents: any[] = [];
    frameManager.addEventListener(
        SDK.FrameManager.Events.FrameAddedToTarget,
        event => dispatchedEvents.push({type: 'FrameAddedToTarget', data: event.data}));
    frameManager.addEventListener(
        SDK.FrameManager.Events.FrameRemoved, event => dispatchedEvents.push({type: 'FrameRemoved', data: event.data}));

    mockParentModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, mockParentFrame);
    frameManager.modelAdded((mockChildModel as any) as SDK.ResourceTreeModel.ResourceTreeModel);
    mockParentModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, mockChildFrameParentTarget);
    mockChildModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, mockChildFrameOwnTarget);
    mockParentModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameDetached, mockChildFrameParentTarget);

    const expectation = [
      {type: 'FrameAddedToTarget', data: {frame: {id: 'parent-frame-id', _targetId: 'parent-target-id'}}},
      {type: 'FrameAddedToTarget', data: {frame: {id: 'child-frame-id', _targetId: 'parent-target-id'}}},
      {type: 'FrameAddedToTarget', data: {frame: {id: 'child-frame-id', _targetId: 'child-target-id'}}},
    ];
    assert.strictEqual(JSON.stringify(dispatchedEvents), JSON.stringify(expectation));
    let frameFromId = frameManager.getFrame('parent-frame-id');
    assert.strictEqual(frameFromId?.id, 'parent-frame-id');
    assert.strictEqual(frameFromId?.resourceTreeModel().target().id(), 'parent-target-id');
    frameFromId = frameManager.getFrame('child-frame-id');
    assert.strictEqual(frameFromId?.id, 'child-frame-id');
    assert.strictEqual(frameFromId?.resourceTreeModel().target().id(), 'child-target-id');
  });
});
