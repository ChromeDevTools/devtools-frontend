// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as SDK from '../sdk/sdk.js';

export class InputModel extends SDK.SDKModel.SDKModel {
  _inputAgent: ProtocolProxyApi.InputApi;
  _activeTouchOffsetTop: number|null;
  _activeTouchParams: Protocol.Input.EmulateTouchFromMouseEventRequest|null;

  constructor(target: SDK.SDKModel.Target) {
    super(target);
    this._inputAgent = target.inputAgent();
    this._activeTouchOffsetTop = null;
    this._activeTouchParams = null;
  }

  emitKeyEvent(event: Event): void {
    let type: Protocol.Input.DispatchKeyEventRequestType;
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
    const keyboardEvent = event as KeyboardEvent;
    const text = event.type === 'keypress' ? String.fromCharCode(keyboardEvent.charCode) : undefined;
    this._inputAgent.invoke_dispatchKeyEvent({
      type: type,
      modifiers: this._modifiersForEvent(keyboardEvent),
      text: text,
      unmodifiedText: text ? text.toLowerCase() : undefined,
      keyIdentifier: (keyboardEvent as {keyIdentifier?: string}).keyIdentifier,
      code: keyboardEvent.code,
      key: keyboardEvent.key,
      windowsVirtualKeyCode: keyboardEvent.keyCode,
      nativeVirtualKeyCode: keyboardEvent.keyCode,
      autoRepeat: false,
      isKeypad: false,
      isSystemKey: false,
    });
  }

  emitTouchFromMouseEvent(event: Event, offsetTop: number, zoom: number): void {
    const buttons = ['none', 'left', 'middle', 'right'] as Protocol.Input.MouseButton[];
    const types: {[key: string]: Protocol.Input.EmulateTouchFromMouseEventRequestType} = {
      mousedown: Protocol.Input.EmulateTouchFromMouseEventRequestType.MousePressed,
      mouseup: Protocol.Input.EmulateTouchFromMouseEventRequestType.MouseReleased,
      mousemove: Protocol.Input.EmulateTouchFromMouseEventRequestType.MouseMoved,
      mousewheel: Protocol.Input.EmulateTouchFromMouseEventRequestType.MouseWheel,
    };

    const eventType = event.type as string;
    if (!(eventType in types)) {
      return;
    }

    const mouseEvent = event as MouseEvent;

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
    const params: Protocol.Input.EmulateTouchFromMouseEventRequest = {
      type: types[eventType],
      x: x,
      y: y,
      modifiers: 0,
      button: buttons[mouseEvent.which],
      clickCount: 0,
    };
    if (event.type === 'mousewheel') {
      const wheelEvent = mouseEvent as WheelEvent;
      params.deltaX = wheelEvent.deltaX / zoom;
      params.deltaY = -wheelEvent.deltaY / zoom;
    } else {
      this._activeTouchParams = params;
    }
    if (event.type === 'mouseup') {
      this._activeTouchOffsetTop = null;
    }
    this._inputAgent.invoke_emulateTouchFromMouseEvent(params);
  }

  cancelTouch(): void {
    if (this._activeTouchParams !== null) {
      const params = this._activeTouchParams;
      this._activeTouchParams = null;
      params.type = 'mouseReleased' as Protocol.Input.EmulateTouchFromMouseEventRequestType;
      this._inputAgent.invoke_emulateTouchFromMouseEvent(params);
    }
  }

  _modifiersForEvent(event: KeyboardEvent): number {
    return (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0);
  }
}

SDK.SDKModel.SDKModel.register(InputModel, SDK.SDKModel.Capability.Input, false);
