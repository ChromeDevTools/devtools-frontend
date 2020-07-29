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
  isTopFrame = () => true;
}

describe('FrameManager', () => {
  type FrameManager = SDK.FrameManager.FrameManager;
  type ResourceTreeModel = SDK.ResourceTreeModel.ResourceTreeModel;
  const Events = SDK.FrameManager.Events;

  function attachMockModel(frameManager: FrameManager, targetId: string): ResourceTreeModel {
    const mockModel = new MockResourceTreeModel(targetId) as unknown as ResourceTreeModel;
    frameManager.modelAdded(mockModel);
    return mockModel;
  }

  function addMockFrame(model: ResourceTreeModel, frameId: string): MockResourceTreeFrame {
    const targetId = model.target().id();
    const mockFrame = new MockResourceTreeFrame(frameId, targetId);
    model.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, mockFrame);
    return mockFrame;
  }

  function setupEventSink(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      frameManager: FrameManager, events: SDK.FrameManager.Events[]): Array<{type: string, data: any}> {
    const dispatchedEvents: Array<{type: string, data: {}}> = [];
    for (const event of events) {
      frameManager.addEventListener(event, e => dispatchedEvents.push({type: event.description || '', data: e.data}));
    }
    return dispatchedEvents;
  }

  it('collects frames from a ResourceTreeModel', () => {
    const frameManager = new SDK.FrameManager.FrameManager();
    const dispatchedEvents = setupEventSink(frameManager, [Events.FrameAddedToTarget]);

    const mockModel = attachMockModel(frameManager, 'target-id');
    addMockFrame(mockModel, 'frame-id');

    const frameIds = dispatchedEvents.map(event => event.data.frame.id);
    assert.deepStrictEqual(frameIds, ['frame-id']);
    const frameFromId = frameManager.getFrame('frame-id');
    assert.strictEqual(frameFromId?.id, 'frame-id');
  });

  it('handles attachment and detachment of frames', () => {
    const frameManager = new SDK.FrameManager.FrameManager();
    const dispatchedEvents = setupEventSink(frameManager, [Events.FrameAddedToTarget, Events.FrameRemoved]);

    const mockModel = attachMockModel(frameManager, 'target-id');
    addMockFrame(mockModel, 'parent-frame-id');
    const mockChildFrame = addMockFrame(mockModel, 'child-frame-id');
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
    const frameManager = new SDK.FrameManager.FrameManager();
    const dispatchedEvents = setupEventSink(frameManager, [Events.FrameAddedToTarget, Events.FrameRemoved]);

    const mockModel = attachMockModel(frameManager, 'target-id');
    addMockFrame(mockModel, 'parent-frame-id');
    addMockFrame(mockModel, 'child-frame-id');
    frameManager.modelRemoved(mockModel);

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
    const frameManager = new SDK.FrameManager.FrameManager();
    const dispatchedEvents = setupEventSink(frameManager, [Events.FrameAddedToTarget, Events.FrameRemoved]);

    const mockParentModel = attachMockModel(frameManager, 'parent-target-id');
    addMockFrame(mockParentModel, 'parent-frame-id');

    const mockChildModel = attachMockModel(frameManager, 'child-target-id');
    const mockChildFrameParentTarget = addMockFrame(mockParentModel, 'child-frame-id');
    addMockFrame(mockChildModel, 'child-frame-id');
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

  describe('getTopFrame', () => {
    it('returns null when no frames are attached', () => {
      const frameManager = new SDK.FrameManager.FrameManager();
      assert.isNull(frameManager.getTopFrame());
    });

    it('returns the top main frame', () => {
      const frameManager = new SDK.FrameManager.FrameManager();

      const mockModel = attachMockModel(frameManager, 'target-id');
      addMockFrame(mockModel, 'frame-id');

      assert.strictEqual(frameManager.getTopFrame()?.id, 'frame-id');
    });
  });
});
