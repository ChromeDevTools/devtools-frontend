// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';

// TODO(crbug.com/1228674) Remove defaults for generic type parameters once
//                         all event emitters and sinks have been migrated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface EventDescriptor<Events = any, T extends EventType<Events> = any> {
  eventTarget: EventTarget<Events>;
  eventType: T;
  thisObject?: Object;
  listener: EventListener<Events, T>;
}

export function removeEventListeners(eventList: EventDescriptor[]): void {
  for (const eventInfo of eventList) {
    eventInfo.eventTarget.removeEventListener(eventInfo.eventType, eventInfo.listener, eventInfo.thisObject);
  }
  // Do not hold references on unused event descriptors.
  eventList.splice(0);
}

export type EventType<Events> = Events extends Object ? keyof Events : Events extends void ? never : string|symbol;
export type EventPayload<Events, T> = T extends keyof Events ? Events[T] : unknown;
export type EventPayloadToRestParameters<T> = T extends void ? [] : [T];

export type EventListener<Events, T> = (arg0: EventTargetEvent<EventPayload<Events, T>>) => void;

export interface EventTarget<Events> {
  addEventListener<T extends EventType<Events>>(eventType: T, listener: EventListener<Events, T>, thisObject?: Object):
      EventDescriptor<Events, T>;
  once<T extends EventType<Events>>(eventType: T): Promise<EventPayload<Events, T>>;
  removeEventListener<T extends EventType<Events>>(
      eventType: T, listener: EventListener<Events, T>, thisObject?: Object): void;
  hasEventListeners(eventType: EventType<Events>): boolean;
  dispatchEventToListeners<T extends EventType<Events>>(
      eventType: Platform.TypeScriptUtilities.NoUnion<T>,
      ...[eventData]: EventPayloadToRestParameters<EventPayload<Events, T>>): void;
}

export function fireEvent(name: string, detail: unknown = {}, target: HTMLElement|Window = window): void {
  const evt = new CustomEvent(name, {bubbles: true, cancelable: true, detail});
  target.dispatchEvent(evt);
}

export interface EventTargetEvent<T> {
  data: T;
}
