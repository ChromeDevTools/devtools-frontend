// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import type {EventDescriptor, EventTarget, EventTargetEvent} from './EventTarget.js';

interface ListenerCallbackTuple {
  thisObject?: Object;
  listener: (arg0: EventTargetEvent) => void;
  disposed?: boolean;
}

export class ObjectWrapper implements EventTarget {
  listeners?: Map<string|symbol, Set<ListenerCallbackTuple>>;

  addEventListener(eventType: string|symbol, listener: (arg0: EventTargetEvent) => void, thisObject?: Object):
      EventDescriptor {
    if (!this.listeners) {
      this.listeners = new Map();
    }

    let listenersForEventType = this.listeners.get(eventType);
    if (!listenersForEventType) {
      listenersForEventType = new Set();
      this.listeners.set(eventType, listenersForEventType);
    }
    listenersForEventType.add({thisObject, listener});
    return {eventTarget: this, eventType, thisObject, listener};
  }

  once(eventType: string|symbol): Promise<unknown> {
    return new Promise(resolve => {
      const descriptor = this.addEventListener(eventType, event => {
        this.removeEventListener(eventType, descriptor.listener);
        resolve(event.data);
      });
    });
  }

  removeEventListener(eventType: string|symbol, listener: (arg0: EventTargetEvent) => void, thisObject?: Object): void {
    const listeners = this.listeners?.get(eventType);
    if (!listeners) {
      return;
    }
    for (const listenerTuple of listeners) {
      if (listenerTuple.listener === listener && listenerTuple.thisObject === thisObject) {
        listenerTuple.disposed = true;
        listeners.delete(listenerTuple);
      }
    }

    if (!listeners.size) {
      this.listeners?.delete(eventType);
    }
  }

  hasEventListeners(eventType: string|symbol): boolean {
    return Boolean(this.listeners && this.listeners.has(eventType));
  }

  dispatchEventToListeners(eventType: string|symbol, eventData?: unknown): void {
    const listeners = this.listeners?.get(eventType);
    if (!listeners) {
      return;
    }
    const event = {data: eventData};
    // Work on a snapshot of the current listeners, callbacks might remove/add
    // new listeners.
    for (const listener of [...listeners]) {
      if (!listener.disposed) {
        listener.listener.call(listener.thisObject, event);
      }
    }
  }
}
