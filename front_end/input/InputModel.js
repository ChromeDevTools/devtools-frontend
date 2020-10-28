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
    /** @type {number} */
    this._eventDispatchTimer = 0;
    /** @type {!Array<!EventData>}*/
    this._dispatchEventDataList = [];
    /** @type {?function():void} */
    this._finishCallback = null;
    /** @type {number} */
    this._dispatchingIndex;

    this._reset();
  }

  _reset() {
    /** @type {?number} */
    this._lastEventTime = null;
    /** @type {boolean} */
    this._replayPaused = false;
    /** @type {number} */
    this._dispatchingIndex = 0;
    window.clearTimeout(this._eventDispatchTimer);
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
    /**
     * @param {!EventData} a
     * @param {!EventData} b
     */
    function compareTimestamp(a, b) {
      return a.timestamp - b.timestamp;
    }
    this._dispatchEventDataList.sort(compareTimestamp);
  }

  /**
   * @param {?function():void} finishCallback
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
    window.clearTimeout(this._eventDispatchTimer);
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
    if (!MOUSE_EVENT_TYPE_TO_REQUEST_TYPE.has(eventData.type)) {
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
    if (!KEYBOARD_EVENT_TYPE_TO_REQUEST_TYPE.has(eventData.type)) {
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
    if (MOUSE_EVENT_TYPE_TO_REQUEST_TYPE.has(eventData.type)) {
      this._dispatchMouseEvent(/** @type {!MouseEventData} */ (eventData));
    } else if (KEYBOARD_EVENT_TYPE_TO_REQUEST_TYPE.has(eventData.type)) {
      this._dispatchKeyEvent(/** @type {!KeyboardEventData} */ (eventData));
    }

    ++this._dispatchingIndex;
    if (this._dispatchingIndex < this._dispatchEventDataList.length) {
      const waitTime = (this._dispatchEventDataList[this._dispatchingIndex].timestamp - this._lastEventTime) / 1000;
      this._eventDispatchTimer = window.setTimeout(this._dispatchNextEvent.bind(this), waitTime);
    } else {
      this._replayStopped();
    }
  }

  /**
   * @param {!MouseEventData} eventData
   */
  async _dispatchMouseEvent(eventData) {
    const type = MOUSE_EVENT_TYPE_TO_REQUEST_TYPE.get(eventData.type);
    if (!type) {
      throw new Error(`Could not find mouse event type for eventData ${eventData.type}`);
    }
    const buttonActionName = BUTTONID_TO_ACTION_NAME.get(eventData.button);
    const params = {
      type,
      x: eventData.x,
      y: eventData.y,
      modifiers: eventData.modifiers,
      button: (eventData.type === 'mousedown' || eventData.type === 'mouseup') ? buttonActionName :
                                                                                 Protocol.Input.MouseButton.None,
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
    const type = KEYBOARD_EVENT_TYPE_TO_REQUEST_TYPE.get(eventData.type);
    if (!type) {
      throw new Error(`Could not find key event type for eventData ${eventData.type}`);
    }
    const text = eventData.type === 'keypress' ? eventData.key[0] : undefined;
    const params = {
      type,
      modifiers: eventData.modifiers,
      text: text,
      unmodifiedText: text ? text.toLowerCase() : undefined,
      code: eventData.code,
      key: eventData.key
    };
    await this._inputAgent.invoke_dispatchKeyEvent(params);
  }

  _replayStopped() {
    window.clearTimeout(this._eventDispatchTimer);
    this._reset();
    if (this._finishCallback) {
      this._finishCallback();
    }
  }
}

/** @type {!Map<string, !Protocol.Input.DispatchMouseEventRequestType>} */
const MOUSE_EVENT_TYPE_TO_REQUEST_TYPE = new Map([
  ['mousedown', Protocol.Input.DispatchMouseEventRequestType.MousePressed],
  ['mouseup', Protocol.Input.DispatchMouseEventRequestType.MouseReleased],
  ['mousemove', Protocol.Input.DispatchMouseEventRequestType.MouseMoved],
  ['wheel', Protocol.Input.DispatchMouseEventRequestType.MouseWheel],
]);

/** @type {!Map<string, !Protocol.Input.DispatchKeyEventRequestType>} */
const KEYBOARD_EVENT_TYPE_TO_REQUEST_TYPE = new Map([
  ['keydown', Protocol.Input.DispatchKeyEventRequestType.KeyDown],
  ['keyup', Protocol.Input.DispatchKeyEventRequestType.KeyUp],
  ['keypress', Protocol.Input.DispatchKeyEventRequestType.Char],
]);

/** @type {!Map<number, !Protocol.Input.MouseButton>} */
const BUTTONID_TO_ACTION_NAME = new Map([
  [0, Protocol.Input.MouseButton.Left], [1, Protocol.Input.MouseButton.Middle], [2, Protocol.Input.MouseButton.Right],
  [3, Protocol.Input.MouseButton.Back], [4, Protocol.Input.MouseButton.Forward]
]);

SDK.SDKModel.SDKModel.register(InputModel, SDK.SDKModel.Capability.Input, false);

/** @typedef {{type: string, modifiers: number, timestamp: number, x: number, y: number, button: number, buttons: number, clickCount: number, deltaX: number, deltaY: number}} */
// @ts-ignore typedef
export let MouseEventData;

/** @typedef {{type: string, modifiers: number, timestamp: number, code: string, key: string}} */
// @ts-ignore typedef
export let KeyboardEventData;

/** @typedef {(!MouseEventData|!KeyboardEventData)} */
// @ts-ignore typedef
export let EventData;
