// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

export class InputModel extends SDK.SDKModel.SDKModel<void> {
  private readonly inputAgent: ProtocolProxyApi.InputApi;
  private eventDispatchTimer: number;
  private dispatchEventDataList: EventData[];
  private finishCallback: (() => void)|null;
  private dispatchingIndex!: number;
  private lastEventTime?: number|null;
  private replayPaused?: boolean;

  constructor(target: SDK.Target.Target) {
    super(target);
    this.inputAgent = target.inputAgent();
    this.eventDispatchTimer = 0;
    this.dispatchEventDataList = [];
    this.finishCallback = null;

    this.reset();
  }

  private reset(): void {
    this.lastEventTime = null;
    this.replayPaused = false;
    this.dispatchingIndex = 0;
    window.clearTimeout(this.eventDispatchTimer);
  }

  setEvents(tracingModel: SDK.TracingModel.TracingModel): void {
    this.dispatchEventDataList = [];
    for (const process of tracingModel.sortedProcesses()) {
      for (const thread of process.sortedThreads()) {
        this.processThreadEvents(tracingModel, thread);
      }
    }
    function compareTimestamp(a: EventData, b: EventData): number {
      return a.timestamp - b.timestamp;
    }
    this.dispatchEventDataList.sort(compareTimestamp);
  }

  startReplay(finishCallback: (() => void)|null): void {
    this.reset();
    this.finishCallback = finishCallback;
    if (this.dispatchEventDataList.length) {
      this.dispatchNextEvent();
    } else {
      this.replayStopped();
    }
  }

  pause(): void {
    window.clearTimeout(this.eventDispatchTimer);
    if (this.dispatchingIndex >= this.dispatchEventDataList.length) {
      this.replayStopped();
    } else {
      this.replayPaused = true;
    }
  }

  resume(): void {
    this.replayPaused = false;
    if (this.dispatchingIndex < this.dispatchEventDataList.length) {
      this.dispatchNextEvent();
    }
  }

  private processThreadEvents(_tracingModel: SDK.TracingModel.TracingModel, thread: SDK.TracingModel.Thread): void {
    for (const event of thread.events()) {
      if (event.name === 'EventDispatch' && this.isValidInputEvent(event.args.data)) {
        this.dispatchEventDataList.push(event.args.data);
      }
    }
  }

  private isValidInputEvent(eventData: EventData): boolean {
    return this.isMouseEvent(eventData as MouseEventData) || this.isKeyboardEvent(eventData as KeyboardEventData);
  }

  private isMouseEvent(eventData: MouseEventData): boolean {
    if (!MOUSE_EVENT_TYPE_TO_REQUEST_TYPE.has(eventData.type)) {
      return false;
    }
    if (!('x' in eventData && 'y' in eventData)) {
      return false;
    }
    return true;
  }

  private isKeyboardEvent(eventData: KeyboardEventData): boolean {
    if (!KEYBOARD_EVENT_TYPE_TO_REQUEST_TYPE.has(eventData.type)) {
      return false;
    }
    if (!('code' in eventData && 'key' in eventData)) {
      return false;
    }
    return true;
  }

  private dispatchNextEvent(): void {
    const eventData = this.dispatchEventDataList[this.dispatchingIndex];
    this.lastEventTime = eventData.timestamp;
    if (MOUSE_EVENT_TYPE_TO_REQUEST_TYPE.has(eventData.type)) {
      void this.dispatchMouseEvent(eventData as MouseEventData);
    } else if (KEYBOARD_EVENT_TYPE_TO_REQUEST_TYPE.has(eventData.type)) {
      void this.dispatchKeyEvent(eventData as KeyboardEventData);
    }

    ++this.dispatchingIndex;
    if (this.dispatchingIndex < this.dispatchEventDataList.length) {
      const waitTime = (this.dispatchEventDataList[this.dispatchingIndex].timestamp - this.lastEventTime) / 1000;
      this.eventDispatchTimer = window.setTimeout(this.dispatchNextEvent.bind(this), waitTime);
    } else {
      this.replayStopped();
    }
  }

  private async dispatchMouseEvent(eventData: MouseEventData): Promise<void> {
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
      deltaY: eventData.deltaY,
    };
    await this.inputAgent.invoke_dispatchMouseEvent(params);
  }

  private async dispatchKeyEvent(eventData: KeyboardEventData): Promise<void> {
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
      key: eventData.key,
    };
    await this.inputAgent.invoke_dispatchKeyEvent(params);
  }

  private replayStopped(): void {
    window.clearTimeout(this.eventDispatchTimer);
    this.reset();
    if (this.finishCallback) {
      this.finishCallback();
    }
  }
}

const MOUSE_EVENT_TYPE_TO_REQUEST_TYPE = new Map<string, Protocol.Input.DispatchMouseEventRequestType>([
  ['mousedown', Protocol.Input.DispatchMouseEventRequestType.MousePressed],
  ['mouseup', Protocol.Input.DispatchMouseEventRequestType.MouseReleased],
  ['mousemove', Protocol.Input.DispatchMouseEventRequestType.MouseMoved],
  ['wheel', Protocol.Input.DispatchMouseEventRequestType.MouseWheel],
]);

const KEYBOARD_EVENT_TYPE_TO_REQUEST_TYPE = new Map<string, Protocol.Input.DispatchKeyEventRequestType>([
  ['keydown', Protocol.Input.DispatchKeyEventRequestType.KeyDown],
  ['keyup', Protocol.Input.DispatchKeyEventRequestType.KeyUp],
  ['keypress', Protocol.Input.DispatchKeyEventRequestType.Char],
]);

const BUTTONID_TO_ACTION_NAME = new Map<number, Protocol.Input.MouseButton>([
  [0, Protocol.Input.MouseButton.Left],
  [1, Protocol.Input.MouseButton.Middle],
  [2, Protocol.Input.MouseButton.Right],
  [3, Protocol.Input.MouseButton.Back],
  [4, Protocol.Input.MouseButton.Forward],
]);

SDK.SDKModel.SDKModel.register(InputModel, {capabilities: SDK.Target.Capability.Input, autostart: false});
export interface MouseEventData {
  type: string;
  modifiers: number;
  timestamp: number;
  x: number;
  y: number;
  button: number;
  buttons: number;
  clickCount: number;
  deltaX: number;
  deltaY: number;
}
export interface KeyboardEventData {
  type: string;
  modifiers: number;
  timestamp: number;
  code: string;
  key: string;
}

export type EventData = MouseEventData|KeyboardEventData;
