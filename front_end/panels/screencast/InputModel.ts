// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

export class InputModel extends SDK.SDKModel.SDKModel<void> {
  private readonly inputAgent: ProtocolProxyApi.InputApi;
  private activeTouchOffsetTop: number|null;
  private activeTouchParams: Protocol.Input.EmulateTouchFromMouseEventRequest|null;

  constructor(target: SDK.Target.Target) {
    super(target);
    this.inputAgent = target.inputAgent();
    this.activeTouchOffsetTop = null;
    this.activeTouchParams = null;
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
    void this.inputAgent.invoke_dispatchKeyEvent({
      type: type,
      modifiers: this.modifiersForEvent(keyboardEvent),
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

    if (eventType === 'mousedown' || this.activeTouchOffsetTop === null) {
      this.activeTouchOffsetTop = offsetTop;
    }

    const x = Math.round(mouseEvent.offsetX / zoom);
    let y = Math.round(mouseEvent.offsetY / zoom);
    y = Math.round(y - this.activeTouchOffsetTop);
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
      this.activeTouchParams = params;
    }
    if (event.type === 'mouseup') {
      this.activeTouchOffsetTop = null;
    }
    void this.inputAgent.invoke_emulateTouchFromMouseEvent(params);
  }

  cancelTouch(): void {
    if (this.activeTouchParams !== null) {
      const params = this.activeTouchParams;
      this.activeTouchParams = null;
      params.type = 'mouseReleased' as Protocol.Input.EmulateTouchFromMouseEventRequestType;
      void this.inputAgent.invoke_emulateTouchFromMouseEvent(params);
    }
  }

  private modifiersForEvent(event: KeyboardEvent): number {
    return (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0);
  }
}

SDK.SDKModel.SDKModel.register(InputModel, {capabilities: SDK.Target.Capability.Input, autostart: false});
