// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface EventDescriptor {
  eventTarget: EventTarget;
  eventType: string|symbol;
  thisObject?: Object;
  listener: (arg0: EventTargetEvent) => void;
}

export function removeEventListeners(eventList: EventDescriptor[]): void {
  for (const eventInfo of eventList) {
    eventInfo.eventTarget.removeEventListener(eventInfo.eventType, eventInfo.listener, eventInfo.thisObject);
  }
  // Do not hold references on unused event descriptors.
  eventList.splice(0);
}

export interface EventTarget {
  addEventListener(eventType: string|symbol, listener: (arg0: EventTargetEvent) => void, thisObject?: Object):
      EventDescriptor;
  once(eventType: string|symbol): Promise<unknown>;
  removeEventListener(eventType: string|symbol, listener: (arg0: EventTargetEvent) => void, thisObject?: Object): void;
  hasEventListeners(eventType: string|symbol): boolean;
  dispatchEventToListeners(eventType: string|symbol, eventData?: unknown): void;
}

export function fireEvent(name: string, detail: unknown = {}, target: HTMLElement|Window = window): void {
  const evt = new CustomEvent(name, {bubbles: true, cancelable: true, detail});
  target.dispatchEvent(evt);
}
// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface EventTargetEvent<T = any> {
  data: T;
}
