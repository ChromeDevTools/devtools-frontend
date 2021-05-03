// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Common from '../../../../../front_end/core/common/common.js';

class MockResourceTreeModel extends Common.ObjectWrapper.ObjectWrapper {
  private targetId: string;

  constructor(id: string) {
    super();
    this.targetId = id;
  }

  target() {
    return {
      id: () => this.targetId,
      parentTarget: () => null,
    };
  }
}

class MockResourceTreeFrame {
  private targetId: string;
  id: string;
  getCreationStackTraceData = () => {};

  constructor(frameId: string, targetId: string) {
    this.id = frameId;
    this.targetId = targetId;
  }

  resourceTreeModel = () => ({
    target: () => ({
      id: () => this.targetId,
    }),
  });

  isMainFrame = () => true;
  isTopFrame = () => true;
  setCreationStackTrace = () => {};
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
      frameManager.addEventListener(event, e => dispatchedEvents.push({type: event || '', data: e.data}));
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
    mockModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.FrameDetached, {frame: mockChildFrame, isSwap: false});

    const expectation = [
      {type: 'FrameAddedToTarget', data: {frame: {id: 'parent-frame-id', targetId: 'target-id'}}},
      {type: 'FrameAddedToTarget', data: {frame: {id: 'child-frame-id', targetId: 'target-id'}}},
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
      {type: 'FrameAddedToTarget', data: {frame: {id: 'parent-frame-id', targetId: 'target-id'}}},
      {type: 'FrameAddedToTarget', data: {frame: {id: 'child-frame-id', targetId: 'target-id'}}},
      {type: 'FrameRemoved', data: {frameId: 'parent-frame-id'}},
      {type: 'FrameRemoved', data: {frameId: 'child-frame-id'}},
    ];
    assert.strictEqual(JSON.stringify(dispatchedEvents), JSON.stringify(expectation));
    let frameFromId = frameManager.getFrame('parent-frame-id');
    assert.strictEqual(frameFromId, null);
    frameFromId = frameManager.getFrame('child-frame-id');
    assert.strictEqual(frameFromId, null);
  });

  it('handles a frame transferring to a different target', () => {
    const frameManager = new SDK.FrameManager.FrameManager();
    const dispatchedEvents = setupEventSink(frameManager, [Events.FrameAddedToTarget, Events.FrameRemoved]);

    const mockParentModel = attachMockModel(frameManager, 'parent-target-id');
    addMockFrame(mockParentModel, 'parent-frame-id');

    const mockChildModel = attachMockModel(frameManager, 'child-target-id');
    const mockChildFrameParentTarget = addMockFrame(mockParentModel, 'child-frame-id');
    addMockFrame(mockChildModel, 'child-frame-id');
    mockParentModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.FrameDetached, {frame: mockChildFrameParentTarget, isSwap: true});

    const expectation = [
      {type: 'FrameAddedToTarget', data: {frame: {id: 'parent-frame-id', targetId: 'parent-target-id'}}},
      {type: 'FrameAddedToTarget', data: {frame: {id: 'child-frame-id', targetId: 'parent-target-id'}}},
      {type: 'FrameAddedToTarget', data: {frame: {id: 'child-frame-id', targetId: 'child-target-id'}}},
    ];
    assert.strictEqual(JSON.stringify(dispatchedEvents), JSON.stringify(expectation));
    let frameFromId = frameManager.getFrame('parent-frame-id');
    assert.strictEqual(frameFromId?.id, 'parent-frame-id');
    assert.strictEqual(frameFromId?.resourceTreeModel().target().id(), 'parent-target-id');
    frameFromId = frameManager.getFrame('child-frame-id');
    assert.strictEqual(frameFromId?.id, 'child-frame-id');
    assert.strictEqual(frameFromId?.resourceTreeModel().target().id(), 'child-target-id');
  });

  it('transfers frame creation stack traces during OOPIF transfer (case 1)', () => {
    const frameManager = new SDK.FrameManager.FrameManager();
    const mockParentModel = attachMockModel(frameManager, 'parent-target-id');
    const mockChildModel = attachMockModel(frameManager, 'child-target-id');
    const trace = {
      callFrames: [
        {
          functionName: 'function1',
          url: 'http://www.example.com/script1.js',
          lineNumber: 15,
          columnNumber: 10,
          scriptId: 'someScriptId',
        },
        {
          functionName: 'function2',
          url: 'http://www.example.com/script2.js',
          lineNumber: 20,
          columnNumber: 5,
          scriptId: 'someScriptId',
        },
      ],
    };

    // step 1) frame added to existing target
    const frameOldTarget = new SDK.ResourceTreeModel.ResourceTreeFrame(mockParentModel, null, 'frame-id', null, trace);
    mockParentModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, frameOldTarget);

    // step 2) frame added to new target
    const frameNewTarget = new SDK.ResourceTreeModel.ResourceTreeFrame(mockChildModel, null, 'frame-id', null, null);
    mockChildModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, frameNewTarget);

    // step 3) frame removed from existing target
    mockParentModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.FrameDetached, {frame: frameOldTarget, isSwap: true});

    const frame = frameManager.getFrame('frame-id');
    assert.isNotNull(frame);
    if (frame) {
      const {creationStackTrace, creationStackTraceTarget} = frame.getCreationStackTraceData();
      assert.deepEqual(creationStackTrace, trace);
      assert.strictEqual(creationStackTraceTarget.id(), 'parent-target-id');
    }
  });

  it('transfers frame creation stack traces during OOPIF transfer (case 2)', () => {
    const frameManager = new SDK.FrameManager.FrameManager();
    const mockParentModel = attachMockModel(frameManager, 'parent-target-id');
    const mockChildModel = attachMockModel(frameManager, 'child-target-id');
    const trace = {
      callFrames: [
        {
          functionName: 'function1',
          url: 'http://www.example.com/script1.js',
          lineNumber: 15,
          columnNumber: 10,
          scriptId: 'someScriptId',
        },
        {
          functionName: 'function2',
          url: 'http://www.example.com/script2.js',
          lineNumber: 20,
          columnNumber: 5,
          scriptId: 'someScriptId',
        },
      ],
    };

    // step 1) frame added to existing target
    const frameOldTarget = new SDK.ResourceTreeModel.ResourceTreeFrame(mockParentModel, null, 'frame-id', null, trace);
    mockParentModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, frameOldTarget);

    // step 2) frame removed from existing target
    mockParentModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.FrameDetached, {frame: frameOldTarget, isSwap: true});

    // step 3) frame added to new target
    const frameNewTarget = new SDK.ResourceTreeModel.ResourceTreeFrame(mockChildModel, null, 'frame-id', null, null);
    mockChildModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, frameNewTarget);

    const frame = frameManager.getFrame('frame-id');
    assert.isNotNull(frame);
    if (frame) {
      const {creationStackTrace, creationStackTraceTarget} = frame.getCreationStackTraceData();
      assert.deepEqual(creationStackTrace, trace);
      assert.strictEqual(creationStackTraceTarget.id(), 'parent-target-id');
    }
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
