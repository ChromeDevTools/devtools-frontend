// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';

/** @type {?FrameManager} */
let frameManagerInstance = null;

/**
 * The FrameManager is a central storage for all frames. It collects frames from all
 * ResourceTreeModel-instances (one per target), so that frames can be found by id
 * without needing to know their target.
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.ResourceTreeModel.ResourceTreeModel>}
 */
export class FrameManager extends Common.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();
    /** @type {!WeakMap<!SDK.ResourceTreeModel.ResourceTreeModel, !Array<!Common.EventTarget.EventDescriptor>>} */
    this._eventListeners = new WeakMap();
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.ResourceTreeModel.ResourceTreeModel, this);

    // Maps frameIds to frames and a count of how many ResourceTreeModels contain this frame.
    // (OOPIFs are first attached to a new target and then detached from their old target,
    // therefore being contained in 2 models for a short period of time.)
    /** @type {!Map<string, {frame: !SDK.ResourceTreeModel.ResourceTreeFrame, count: number}>} */
    this._frames = new Map();

    // Maps targetIds to a set of frameIds.
    /** @type {!Map<string, !Set<string>>} */
    this._framesForTarget = new Map();
  }

  /**
   * @param {{forceNew: boolean}} opts
   * @return {!FrameManager}
   */
  static instance({forceNew} = {forceNew: false}) {
    if (!frameManagerInstance || forceNew) {
      frameManagerInstance = new FrameManager();
    }
    return frameManagerInstance;
  }

  /**
   * @override
   * @param {!SDK.ResourceTreeModel.ResourceTreeModel} resourceTreeModel
   */
  modelAdded(resourceTreeModel) {
    const addListener =
        resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameAdded, this._frameAdded, this);
    const detachListener =
        resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameDetached, this._frameDetached, this);
    this._eventListeners.set(resourceTreeModel, [addListener, detachListener]);
    this._framesForTarget.set(resourceTreeModel.target().id(), new Set());
  }

  /**
   * @override
   * @param {!SDK.ResourceTreeModel.ResourceTreeModel} resourceTreeModel
   */
  modelRemoved(resourceTreeModel) {
    const listeners = this._eventListeners.get(resourceTreeModel);
    if (listeners) {
      Common.EventTarget.EventTarget.removeEventListeners(listeners);
    }

    // Iterate over this model's frames and decrease their count or remove them.
    // (The ResourceTreeModel does not send FrameDetached events when a model
    // is removed.)
    const frameSet = this._framesForTarget.get(resourceTreeModel.target().id());
    if (frameSet) {
      for (const frameId of frameSet) {
        this.decreaseOrRemoveFrame(frameId);
      }
    }
    this._framesForTarget.delete(resourceTreeModel.target().id());
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _frameAdded(event) {
    const frame = /** @type {!SDK.ResourceTreeModel.ResourceTreeFrame} */ (event.data);
    const frameData = this._frames.get(frame.id);
    // If the frame is already in the map, increase its count, otherwise add it to the map.
    if (frameData) {
      this._frames.set(frame.id, {frame, count: frameData.count + 1});
    } else {
      this._frames.set(frame.id, {frame, count: 1});
    }

    // Add the frameId to the the targetId's set of frameIds.
    const frameSet = this._framesForTarget.get(frame.resourceTreeModel().target().id());
    if (frameSet) {
      frameSet.add(frame.id);
    }

    this.dispatchEventToListeners(Events.FrameAddedToTarget, {frame});
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _frameDetached(event) {
    const frame = /** @type {!SDK.ResourceTreeModel.ResourceTreeFrame} */ (event.data);
    // Decrease the frame's count or remove it entirely from the map.
    this.decreaseOrRemoveFrame(frame.id);

    // Remove the frameId from the target's set of frameIds.
    const frameSet = this._framesForTarget.get(frame.resourceTreeModel().target().id());
    if (frameSet) {
      frameSet.delete(frame.id);
    }
  }

  /**
   * @param {string} frameId
   */
  decreaseOrRemoveFrame(frameId) {
    const frameData = this._frames.get(frameId);
    if (frameData) {
      if (frameData.count === 1) {
        this._frames.delete(frameId);
        this.dispatchEventToListeners(Events.FrameRemoved, {frameId});
      } else {
        frameData.count--;
      }
    }
  }

  /**
   * Returns the ResourceTreeFrame with a given frameId.
   * When a frame is being detached a new ResourceTreeFrame but with the same
   * frameId is created. Consequently getFrame() will return a different
   * ResourceTreeFrame after detachment. Callers of getFrame() should therefore
   * immediately use the function return value and not store it for later use.
   * @param {string} frameId
   * @return {?SDK.ResourceTreeModel.ResourceTreeFrame}
   */
  getFrame(frameId) {
    const frameData = this._frames.get(frameId);
    if (frameData) {
      return frameData.frame;
    }
    return null;
  }
}

/** @enum {symbol} */
export const Events = {
  // The FrameAddedToTarget event is sent whenever a frame is added to a target.
  // This means that for OOPIFs it is sent twice: once when it's added to a
  // parent frame and a second time when it's added to its own frame.
  FrameAddedToTarget: Symbol('FrameAddedToTarget'),
  // The FrameRemoved event is only sent when a frame has been detached from
  // all targets.
  FrameRemoved: Symbol('FrameRemoved'),
};
