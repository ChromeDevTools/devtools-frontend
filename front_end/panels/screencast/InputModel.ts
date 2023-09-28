// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

const BUTTONS = [
  Protocol.Input.MouseButton.Left,
  Protocol.Input.MouseButton.Middle,
  Protocol.Input.MouseButton.Right,
  Protocol.Input.MouseButton.Back,
  Protocol.Input.MouseButton.Forward,
];
const MOUSE_EVENT_TYPES: {[key: string]: Protocol.Input.DispatchMouseEventRequestType} = {
  mousedown: Protocol.Input.DispatchMouseEventRequestType.MousePressed,
  mouseup: Protocol.Input.DispatchMouseEventRequestType.MouseReleased,
  mousemove: Protocol.Input.DispatchMouseEventRequestType.MouseMoved,
};

export class InputModel extends SDK.SDKModel.SDKModel<void> {
  private readonly inputAgent: ProtocolProxyApi.InputApi;
  private activeMouseOffsetTop: number|null;

  constructor(target: SDK.Target.Target) {
    super(target);
    this.inputAgent = target.inputAgent();
    this.activeMouseOffsetTop = null;
  }

  emitKeyEvent(event: KeyboardEvent): void {
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
    const text = event.type === 'keypress' ? String.fromCharCode(event.charCode) : undefined;
    void this.inputAgent.invoke_dispatchKeyEvent({
      type: type,
      modifiers: this.modifiersForEvent(event),
      text: text,
      unmodifiedText: text ? text.toLowerCase() : undefined,
      keyIdentifier: (event as {keyIdentifier?: string}).keyIdentifier,
      code: event.code,
      key: event.key,
      windowsVirtualKeyCode: event.keyCode,
      nativeVirtualKeyCode: event.keyCode,
      autoRepeat: event.repeat,
      isKeypad: event.location === 3,
      isSystemKey: false,
      location: event.location !== 3 ? event.location : undefined,
    });
  }

  emitMouseEvent(event: MouseEvent, offsetTop: number, zoom: number): void {
    if (!(event.type in MOUSE_EVENT_TYPES)) {
      return;
    }
    if (event.type === 'mousedown' || this.activeMouseOffsetTop === null) {
      this.activeMouseOffsetTop = offsetTop;
    }
    void this.inputAgent.invoke_dispatchMouseEvent({
      type: MOUSE_EVENT_TYPES[event.type],
      x: Math.round(event.offsetX / zoom),
      y: Math.round(event.offsetY / zoom - this.activeMouseOffsetTop),
      modifiers: this.modifiersForEvent(event),
      button: BUTTONS[event.button],
      clickCount: event.detail,
    });
    if (event.type === 'mouseup') {
      this.activeMouseOffsetTop = null;
    }
  }

  emitWheelEvent(event: WheelEvent, offsetTop: number, zoom: number): void {
    if (this.activeMouseOffsetTop === null) {
      this.activeMouseOffsetTop = offsetTop;
    }
    void this.inputAgent.invoke_dispatchMouseEvent({
      type: Protocol.Input.DispatchMouseEventRequestType.MouseWheel,
      x: Math.round(event.offsetX / zoom),
      y: Math.round(event.offsetY / zoom - this.activeMouseOffsetTop),
      modifiers: this.modifiersForEvent(event),
      button: BUTTONS[event.button],
      clickCount: event.detail,
      deltaX: event.deltaX / zoom,
      deltaY: event.deltaY / zoom,
    });
  }

  private modifiersForEvent(event: KeyboardEvent|MouseEvent): number {
    return Number(event.getModifierState('Alt')) | (Number(event.getModifierState('Control')) << 1) |
        (Number(event.getModifierState('Meta')) << 2) | (Number(event.getModifierState('Shift')) << 3);
  }
}

SDK.SDKModel.SDKModel.register(InputModel, {
  capabilities: SDK.Target.Capability.Input,
  autostart: false,
});
