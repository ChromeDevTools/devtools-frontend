// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../platform/platform.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface EventDescriptor<Events = any, T extends keyof Events = any> {
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

// This type can be used as the type parameter for `EventTarget`/`ObjectWrapper`
// when the set of events is not known at compile time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenericEvents = Record<string, any>;

export type EventPayloadToRestParameters<Events, T extends keyof Events> = Events[T] extends void ? [] : [Events[T]];
export type EventListener<Events, T extends keyof Events> = (arg0: EventTargetEvent<Events[T], Events>) => void;

export interface EventTarget<Events> {
  addEventListener<T extends keyof Events>(eventType: T, listener: EventListener<Events, T>, thisObject?: Object):
      EventDescriptor<Events, T>;
  once<T extends keyof Events>(eventType: T): Promise<Events[T]>;
  removeEventListener<T extends keyof Events>(eventType: T, listener: EventListener<Events, T>, thisObject?: Object):
      void;
  hasEventListeners(eventType: keyof Events): boolean;
  dispatchEventToListeners<T extends keyof Events>(
      eventType: Platform.TypeScriptUtilities.NoUnion<T>,
      ...[eventData]: EventPayloadToRestParameters<Events, T>): void;
}

export function fireEvent(name: string, detail: unknown = {}, target: HTMLElement|Window = window): void {
  const evt = new CustomEvent(name, {bubbles: true, cancelable: true, detail});
  target.dispatchEvent(evt);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface EventTargetEvent<T, Events = any> {
  data: T;
  source?: EventTarget<Events>;
}
