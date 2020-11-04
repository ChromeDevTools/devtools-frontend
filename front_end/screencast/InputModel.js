// Copyright 2017 The Chromium Authors. All rights reserved.
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
    this._activeTouchOffsetTop = null;
    this._activeTouchParams = null;
  }

  /**
   * @param {!Event} event
   */
  emitKeyEvent(event) {
    /** @type {!Protocol.Input.DispatchKeyEventRequestType} */
    let type;
    switch (event.type) {
      case 'keydown':
        type = Protocol.Input.DispatchKeyEventRequestType.KeyDown;
        break;
      case 'keyup':
        type = Protocol.Input.DispatchKeyEventRequestType.KeyUp;
        break;
      case 'keypress':
        type = Protocol.Input.DispatchKeyEventRequestType.Char;
        break;
      default:
        return;
    }
    const keyboardEvent = /** @type {!KeyboardEvent} */ (event);
    const text = event.type === 'keypress' ? String.fromCharCode(keyboardEvent.charCode) : undefined;
    this._inputAgent.invoke_dispatchKeyEvent({
      type: type,
      modifiers: this._modifiersForEvent(keyboardEvent),
      text: text,
      unmodifiedText: text ? text.toLowerCase() : undefined,
      // TODO: keyIdentifier is non-standard deprecated event property https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyIdentifier.
      keyIdentifier: /** @type {*} */ (keyboardEvent).keyIdentifier,
      code: keyboardEvent.code,
      key: keyboardEvent.key,
      windowsVirtualKeyCode: keyboardEvent.keyCode,
      nativeVirtualKeyCode: keyboardEvent.keyCode,
      autoRepeat: false,
      isKeypad: false,
      isSystemKey: false
    });
  }

  /**
   * @param {!Event} event
   * @param {number} offsetTop
   * @param {number} zoom
   */
  emitTouchFromMouseEvent(event, offsetTop, zoom) {
    const buttons = /** @type {!Array<!Protocol.Input.MouseButton>} */ (['none', 'left', 'middle', 'right']);
    const types = /** @type {*} */
        ({
          mousedown: 'mousePressed',
          mouseup: 'mouseReleased',
          mousemove: 'mouseMoved',
          mousewheel: 'mouseWheel',
        });
    const eventType = /** @type {string} */ (event.type);
    if (!(eventType in types)) {
      return;
    }

    const mouseEvent = /** @type {!MouseEvent} */ (event);

    if (!(mouseEvent.which in buttons)) {
      return;
    }
    if (eventType !== 'mousewheel' && buttons[mouseEvent.which] === 'none') {
      return;
    }

    if (eventType === 'mousedown' || this._activeTouchOffsetTop === null) {
      this._activeTouchOffsetTop = offsetTop;
    }

    const x = Math.round(mouseEvent.offsetX / zoom);
    let y = Math.round(mouseEvent.offsetY / zoom);
    y = Math.round(y - this._activeTouchOffsetTop);
    /** @type {!Protocol.Input.EmulateTouchFromMouseEventRequest} */
    const params = {
      type: types[eventType],
      x: x,
      y: y,
      modifiers: 0,
      button: buttons[mouseEvent.which],
      clickCount: 0,
    };
    if (event.type === 'mousewheel') {
      // TODO(crbug.com/1145518) Remove usage of MouseWheelEvent.
      const mouseWheelEvent = /** @type {*} */ (mouseEvent);
      params.deltaX = mouseWheelEvent.wheelDeltaX / zoom;
      params.deltaY = mouseWheelEvent.wheelDeltaY / zoom;
    } else {
      this._activeTouchParams = params;
    }
    if (event.type === 'mouseup') {
      this._activeTouchOffsetTop = null;
    }
    this._inputAgent.invoke_emulateTouchFromMouseEvent(params);
  }

  cancelTouch() {
    if (this._activeTouchParams !== null) {
      const params = this._activeTouchParams;
      this._activeTouchParams = null;
      params.type = /** @type {!Protocol.Input.EmulateTouchFromMouseEventRequestType} */ ('mouseReleased');
      this._inputAgent.invoke_emulateTouchFromMouseEvent(params);
    }
  }

  /**
   * @param {!KeyboardEvent} event
   * @return {number}
   */
  _modifiersForEvent(event) {
    return (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0);
  }
}

SDK.SDKModel.SDKModel.register(InputModel, SDK.SDKModel.Capability.Input, false);
