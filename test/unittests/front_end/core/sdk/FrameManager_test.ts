// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Common from '../../../../../front_end/core/common/common.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';

class MockResourceTreeModel extends Common.ObjectWrapper.ObjectWrapper<SDK.ResourceTreeModel.EventTypes> {
  private targetId: Protocol.Target.TargetID|'main';

  constructor(id: Protocol.Target.TargetID|'main') {
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
  targetId: Protocol.Target.TargetID|'main';
  id: string;
  getCreationStackTraceData = () => {};

  constructor(frameId: Protocol.Page.FrameId, targetId: Protocol.Target.TargetID|'main') {
    this.id = frameId;
    this.targetId = targetId;
  }

  resourceTreeModel = () => ({
    target: () => ({
      id: () => this.targetId,
    }),
  });

  isMainFrame = () => true;
  isOutermostFrame = () => true;
  setCreationStackTrace = () => {};
  getAdScriptId = () => null;
  setAdScriptId = () => {};
  getDebuggerId = () => null;
  setDebuggerId = () => {};
}

function mockFrameToObjectForAssertion(mockFrame: MockResourceTreeFrame):
    {targetId: Protocol.Target.TargetID|'main', id: string} {
  return {
    targetId: mockFrame.targetId,
    id: mockFrame.id,
  };
}

const fakeScriptId = '1' as Protocol.Runtime.ScriptId;

describe('FrameManager', () => {
  type FrameManager = SDK.FrameManager.FrameManager;
  type ResourceTreeModel = SDK.ResourceTreeModel.ResourceTreeModel;
  const Events = SDK.FrameManager.Events;

  function attachMockModel(frameManager: FrameManager, targetId: Protocol.Target.TargetID): ResourceTreeModel {
    const mockModel = new MockResourceTreeModel(targetId) as unknown as ResourceTreeModel;
    frameManager.modelAdded(mockModel);
    return mockModel;
  }

  function addMockFrame(
      model: ResourceTreeModel, frameId: Protocol.Page.FrameId): SDK.ResourceTreeModel.ResourceTreeFrame {
    const targetId = model.target().id();
    const mockFrame =
        new MockResourceTreeFrame(frameId, targetId) as unknown as SDK.ResourceTreeModel.ResourceTreeFrame;
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

  const frameId = 'frame-id' as Protocol.Page.FrameId;
  const parentFrameId = 'parent-frame-id' as Protocol.Page.FrameId;
  const childFrameId = 'child-frame-id' as Protocol.Page.FrameId;
  const targetId = 'target-id' as Protocol.Target.TargetID;
  const parentTargetId = 'parent-frame-id' as Protocol.Target.TargetID;
  const childTargetId = 'child-frame-id' as Protocol.Target.TargetID;

  it('collects frames from a ResourceTreeModel', () => {
    const frameManager = new SDK.FrameManager.FrameManager();
    const dispatchedEvents = setupEventSink(frameManager, [Events.FrameAddedToTarget]);

    const mockModel = attachMockModel(frameManager, targetId);
    addMockFrame(mockModel, frameId);

    const frameIds = dispatchedEvents.map(event => event.data.frame.id);
    assert.deepStrictEqual(frameIds, [frameId]);
    const frameFromId = frameManager.getFrame(frameId);
    assert.strictEqual(frameFromId?.id, frameId);
  });

  it('handles attachment and detachment of frames', () => {
    const frameManager = new SDK.FrameManager.FrameManager();
    const dispatchedEvents = setupEventSink(frameManager, [Events.FrameAddedToTarget, Events.FrameRemoved]);

    const mockModel = attachMockModel(frameManager, targetId);
    addMockFrame(mockModel, parentFrameId);
    const mockChildFrame = addMockFrame(mockModel, childFrameId);
    mockModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.FrameDetached, {frame: mockChildFrame, isSwap: false});

    assert.strictEqual(dispatchedEvents[0].type, 'FrameAddedToTarget');
    assert.deepEqual(mockFrameToObjectForAssertion(dispatchedEvents[0].data.frame), {
      targetId: targetId,
      id: parentFrameId,
    });
    assert.strictEqual(dispatchedEvents[1].type, 'FrameAddedToTarget');
    assert.deepEqual(mockFrameToObjectForAssertion(dispatchedEvents[1].data.frame), {
      targetId: targetId,
      id: childFrameId,
    });
    assert.strictEqual(dispatchedEvents[2].type, 'FrameRemoved');
    assert.deepEqual(dispatchedEvents[2].data, {frameId: childFrameId});
    let frameFromId = frameManager.getFrame(parentFrameId);
    assert.strictEqual(frameFromId?.id, parentFrameId);
    assert.strictEqual(frameFromId?.resourceTreeModel().target().id(), targetId as Protocol.Target.TargetID);
    frameFromId = frameManager.getFrame(childFrameId);
    assert.strictEqual(frameFromId, null);
  });

  it('handles removal of target', () => {
    const frameManager = new SDK.FrameManager.FrameManager();
    const dispatchedEvents = setupEventSink(frameManager, [Events.FrameAddedToTarget, Events.FrameRemoved]);

    const mockModel = attachMockModel(frameManager, targetId);
    addMockFrame(mockModel, parentFrameId);
    addMockFrame(mockModel, childFrameId);
    frameManager.modelRemoved(mockModel);

    assert.strictEqual(dispatchedEvents[0].type, 'FrameAddedToTarget');
    assert.deepEqual(mockFrameToObjectForAssertion(dispatchedEvents[0].data.frame), {
      targetId: targetId,
      id: parentFrameId,
    });
    assert.strictEqual(dispatchedEvents[1].type, 'FrameAddedToTarget');
    assert.deepEqual(mockFrameToObjectForAssertion(dispatchedEvents[1].data.frame), {
      targetId: targetId,
      id: childFrameId,
    });
    assert.strictEqual(dispatchedEvents[2].type, 'FrameRemoved');
    assert.deepEqual(dispatchedEvents[2].data, {frameId: parentFrameId});
    assert.strictEqual(dispatchedEvents[3].type, 'FrameRemoved');
    assert.deepEqual(dispatchedEvents[3].data, {frameId: childFrameId});

    let frameFromId = frameManager.getFrame(parentFrameId);
    assert.strictEqual(frameFromId, null);
    frameFromId = frameManager.getFrame(childFrameId);
    assert.strictEqual(frameFromId, null);
  });

  it('handles a frame transferring to a different target', () => {
    const frameManager = new SDK.FrameManager.FrameManager();
    const dispatchedEvents = setupEventSink(frameManager, [Events.FrameAddedToTarget, Events.FrameRemoved]);

    const mockParentModel = attachMockModel(frameManager, parentTargetId);
    addMockFrame(mockParentModel, parentFrameId);

    const mockChildModel = attachMockModel(frameManager, childTargetId);
    const mockChildFrameParentTarget = addMockFrame(mockParentModel, childFrameId);
    addMockFrame(mockChildModel, childFrameId);
    mockParentModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.FrameDetached, {frame: mockChildFrameParentTarget, isSwap: true});

    assert.strictEqual(dispatchedEvents[0].type, 'FrameAddedToTarget');
    assert.deepEqual(mockFrameToObjectForAssertion(dispatchedEvents[0].data.frame), {
      targetId: parentTargetId,
      id: parentFrameId,
    });
    assert.strictEqual(dispatchedEvents[1].type, 'FrameAddedToTarget');
    assert.deepEqual(mockFrameToObjectForAssertion(dispatchedEvents[1].data.frame), {
      targetId: parentTargetId,
      id: childFrameId,
    });
    assert.strictEqual(dispatchedEvents[2].type, 'FrameAddedToTarget');
    assert.deepEqual(mockFrameToObjectForAssertion(dispatchedEvents[2].data.frame), {
      targetId: childTargetId,
      id: childFrameId,
    });
    let frameFromId = frameManager.getFrame(parentFrameId);
    assert.strictEqual(frameFromId?.id, parentFrameId);
    assert.strictEqual(frameFromId?.resourceTreeModel().target().id(), parentTargetId as Protocol.Target.TargetID);
    frameFromId = frameManager.getFrame(childFrameId);
    assert.strictEqual(frameFromId?.id, childFrameId);
    assert.strictEqual(frameFromId?.resourceTreeModel().target().id(), childTargetId as Protocol.Target.TargetID);
  });

  it('transfers frame creation stack traces during OOPIF transfer (case 1)', () => {
    const frameManager = new SDK.FrameManager.FrameManager();
    const mockParentModel = attachMockModel(frameManager, parentTargetId);
    const mockChildModel = attachMockModel(frameManager, childTargetId);
    const trace = {
      callFrames: [
        {
          functionName: 'function1',
          url: 'http://www.example.com/script1.js',
          lineNumber: 15,
          columnNumber: 10,
          scriptId: fakeScriptId,
        },
        {
          functionName: 'function2',
          url: 'http://www.example.com/script2.js',
          lineNumber: 20,
          columnNumber: 5,
          scriptId: fakeScriptId,
        },
      ],
    };

    // step 1) frame added to existing target
    const frameOldTarget = new SDK.ResourceTreeModel.ResourceTreeFrame(mockParentModel, null, frameId, null, trace);
    mockParentModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, frameOldTarget);

    // step 2) frame added to new target
    const frameNewTarget = new SDK.ResourceTreeModel.ResourceTreeFrame(mockChildModel, null, frameId, null, null);
    mockChildModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, frameNewTarget);

    // step 3) frame removed from existing target
    mockParentModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.FrameDetached, {frame: frameOldTarget, isSwap: true});

    const frame = frameManager.getFrame(frameId);
    assert.isNotNull(frame);
    if (frame) {
      const {creationStackTrace, creationStackTraceTarget} = frame.getCreationStackTraceData();
      assert.deepEqual(creationStackTrace, trace);
      assert.strictEqual(creationStackTraceTarget.id(), parentTargetId);
    }
  });

  it('transfers frame creation stack traces during OOPIF transfer (case 2)', () => {
    const frameManager = new SDK.FrameManager.FrameManager();
    const mockParentModel = attachMockModel(frameManager, parentTargetId);
    const mockChildModel = attachMockModel(frameManager, childTargetId);
    const trace = {
      callFrames: [
        {
          functionName: 'function1',
          url: 'http://www.example.com/script1.js',
          lineNumber: 15,
          columnNumber: 10,
          scriptId: fakeScriptId,
        },
        {
          functionName: 'function2',
          url: 'http://www.example.com/script2.js',
          lineNumber: 20,
          columnNumber: 5,
          scriptId: fakeScriptId,
        },
      ],
    };

    // step 1) frame added to existing target
    const frameOldTarget = new SDK.ResourceTreeModel.ResourceTreeFrame(mockParentModel, null, frameId, null, trace);
    mockParentModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, frameOldTarget);

    // step 2) frame removed from existing target
    mockParentModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.FrameDetached, {frame: frameOldTarget, isSwap: true});

    // step 3) frame added to new target
    const frameNewTarget = new SDK.ResourceTreeModel.ResourceTreeFrame(mockChildModel, null, frameId, null, null);
    mockChildModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, frameNewTarget);

    const frame = frameManager.getFrame(frameId);
    assert.isNotNull(frame);
    if (frame) {
      const {creationStackTrace, creationStackTraceTarget} = frame.getCreationStackTraceData();
      assert.deepEqual(creationStackTrace, trace);
      assert.strictEqual(creationStackTraceTarget.id(), parentTargetId);
    }
  });

  describe('getOutermostFrame', () => {
    it('returns null when no frames are attached', () => {
      const frameManager = new SDK.FrameManager.FrameManager();
      assert.isNull(frameManager.getOutermostFrame());
    });

    it('returns the top main frame', () => {
      const frameManager = new SDK.FrameManager.FrameManager();

      const mockModel = attachMockModel(frameManager, targetId);
      addMockFrame(mockModel, frameId);

      assert.strictEqual(frameManager.getOutermostFrame()?.id, frameId);
    });
  });
});
