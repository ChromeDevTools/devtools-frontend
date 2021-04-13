// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties, @typescript-eslint/no-unused-vars */

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
export class EventTarget {
  addEventListener(eventType: string|symbol, listener: (arg0: EventTargetEvent) => void, thisObject?: Object):
      EventDescriptor {
    throw new Error('not implemented');
  }
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once(eventType: string|symbol): Promise<any> {
    throw new Error('not implemented');
  }
  removeEventListener(eventType: string|symbol, listener: (arg0: EventTargetEvent) => void, thisObject?: Object): void {
    throw new Error('not implemented');
  }
  hasEventListeners(eventType: string|symbol): boolean {
    throw new Error('not implemented');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatchEventToListeners(eventType: string|symbol, eventData?: any): void {
  }

  static removeEventListeners = removeEventListeners;
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fireEvent(name: string, detail: any = {}, target: HTMLElement|Window = window): void {
  const evt = new CustomEvent(name, {bubbles: true, cancelable: true, detail});
  target.dispatchEvent(evt);
}
// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface EventTargetEvent<T = any> {
  data: T;
}
