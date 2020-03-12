// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';

export class InputModel extends SDK.SDKModel.SDKModel {
  /**
   * @param {!SDK.SDKModel.Target} target
   */
  constructor(target) {
    super(target);
    this._inputAgent = target.inputAgent();
    /** @type {?number} */
    this._eventDispatchTimer = null;
    /** @type {!Array<!EventData>}*/
    this._dispatchEventDataList = [];
    /** @type {?function()} */
    this._finishCallback = null;

    this._reset();
  }

  _reset() {
    /** @type {?number} */
    this._lastEventTime = null;
    /** @type {boolean} */
    this._replayPaused = false;
    /** @type {number} */
    this._dispatchingIndex = 0;
    clearTimeout(this._eventDispatchTimer);
  }

  /**
   * @param {!SDK.TracingModel.TracingModel} tracingModel
   */
  setEvents(tracingModel) {
    this._dispatchEventDataList = [];
    for (const process of tracingModel.sortedProcesses()) {
      for (const thread of process.sortedThreads()) {
        this._processThreadEvents(tracingModel, thread);
      }
    }
    function compareTimestamp(a, b) {
      return a.timestamp - b.timestamp;
    }
    this._dispatchEventDataList.sort(compareTimestamp);
  }

  /**
   * @param {?function()} finishCallback
   */
  startReplay(finishCallback) {
    this._reset();
    this._finishCallback = finishCallback;
    if (this._dispatchEventDataList.length) {
      this._dispatchNextEvent();
    } else {
      this._replayStopped();
    }
  }

  pause() {
    clearTimeout(this._eventDispatchTimer);
    if (this._dispatchingIndex >= this._dispatchEventDataList.length) {
      this._replayStopped();
    } else {
      this._replayPaused = true;
    }
  }

  resume() {
    this._replayPaused = false;
    if (this._dispatchingIndex < this._dispatchEventDataList.length) {
      this._dispatchNextEvent();
    }
  }

  /**
   * @param {!SDK.TracingModel.TracingModel} tracingModel
   * @param {!SDK.TracingModel.Thread} thread
   */
  _processThreadEvents(tracingModel, thread) {
    for (const event of thread.events()) {
      if (event.name === 'EventDispatch' && this._isValidInputEvent(event.args.data)) {
        this._dispatchEventDataList.push(event.args.data);
      }
    }
  }


  /**
   * @param {!EventData} eventData
   * @return {boolean}
   */
  _isValidInputEvent(eventData) {
    return this._isMouseEvent(/** @type {!MouseEventData} */ (eventData)) ||
        this._isKeyboardEvent(/** @type {!KeyboardEventData} */ (eventData));
  }

  /**
   * @param {!MouseEventData} eventData
   * @return {boolean}
   */
  _isMouseEvent(eventData) {
    if (!InputModel.MouseEventTypes.has(eventData.type)) {
      return false;
    }
    if (!('x' in eventData && 'y' in eventData)) {
      return false;
    }
    return true;
  }

  /**
   * @param {!KeyboardEventData} eventData
   * @return {boolean}
   */
  _isKeyboardEvent(eventData) {
    if (!InputModel.KeyboardEventTypes.has(eventData.type)) {
      return false;
    }
    if (!('code' in eventData && 'key' in eventData)) {
      return false;
    }
    return true;
  }

  _dispatchNextEvent() {
    const eventData = this._dispatchEventDataList[this._dispatchingIndex];
    this._lastEventTime = eventData.timestamp;
    if (InputModel.MouseEventTypes.has(eventData.type)) {
      this._dispatchMouseEvent(/** @type {!MouseEventData} */ (eventData));
    } else if (InputModel.KeyboardEventTypes.has(eventData.type)) {
      this._dispatchKeyEvent(/** @type {!KeyboardEventData} */ (eventData));
    }

    ++this._dispatchingIndex;
    if (this._dispatchingIndex < this._dispatchEventDataList.length) {
      const waitTime = (this._dispatchEventDataList[this._dispatchingIndex].timestamp - this._lastEventTime) / 1000;
      this._eventDispatchTimer = setTimeout(this._dispatchNextEvent.bind(this), waitTime);
    } else {
      this._replayStopped();
    }
  }

  /**
   * @param {!MouseEventData} eventData
   */
  async _dispatchMouseEvent(eventData) {
    console.assert(InputModel.MouseEventTypes.has(eventData.type));
    const buttons = {0: 'left', 1: 'middle', 2: 'right', 3: 'back', 4: 'forward'};
    const params = {
      type: InputModel.MouseEventTypes.get(eventData.type),
      x: eventData.x,
      y: eventData.y,
      modifiers: eventData.modifiers,
      button: (eventData.type === 'mousedown' || eventData.type === 'mouseup') ? buttons[eventData.button] : 'none',
      buttons: eventData.buttons,
      clickCount: eventData.clickCount,
      deltaX: eventData.deltaX,
      deltaY: eventData.deltaY
    };
    await this._inputAgent.invoke_dispatchMouseEvent(params);
  }

  /**
   * @param {!KeyboardEventData} eventData
   */
  async _dispatchKeyEvent(eventData) {
    console.assert(InputModel.KeyboardEventTypes.has(eventData.type));
    const text = eventData.type === 'keypress' ? eventData.key[0] : undefined;
    const params = {
      type: InputModel.KeyboardEventTypes.get(eventData.type),
      modifiers: eventData.modifiers,
      text: text,
      unmodifiedText: text ? text.toLowerCase() : undefined,
      code: eventData.code,
      key: eventData.key
    };
    await this._inputAgent.invoke_dispatchKeyEvent(params);
  }

  _replayStopped() {
    clearTimeout(this._eventDispatchTimer);
    this._reset();
    this._finishCallback();
  }
}

InputModel.MouseEventTypes = new Map([
  ['mousedown', 'mousePressed'], ['mouseup', 'mouseReleased'], ['mousemove', 'mouseMoved'], ['wheel', 'mouseWheel']
]);

InputModel.KeyboardEventTypes = new Map([['keydown', 'keyDown'], ['keyup', 'keyUp'], ['keypress', 'char']]);

SDK.SDKModel.SDKModel.register(InputModel, SDK.SDKModel.Capability.Input, false);

/** @typedef {{type: string, modifiers: number, timestamp: number}} */
export let EventData;

/** @typedef {{x: number, y: number, button: number, buttons: number, clickCount: number, deltaX: number, deltaY: number}} */
export let MouseEventData;

/** @typedef {{code: string, key: string, modifiers: number}} */
export let KeyboardEventData;
