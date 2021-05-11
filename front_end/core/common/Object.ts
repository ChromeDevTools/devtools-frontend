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

/* eslint-disable rulesdir/no_underscored_properties */

import type {EventDescriptor, EventTarget, EventTargetEvent} from './EventTarget.js'; // eslint-disable-line no-unused-vars
// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
interface _listenerCallbackTuple {
  thisObject?: Object;
  listener: (arg0: EventTargetEvent) => void;
  disposed?: boolean;
}

export class ObjectWrapper implements EventTarget {
  _listeners!: Map<string|symbol, _listenerCallbackTuple[]>|undefined;

  constructor() {
  }

  addEventListener(eventType: string|symbol, listener: (arg0: EventTargetEvent) => void, thisObject?: Object):
      EventDescriptor {
    if (!listener) {
      console.assert(false);
    }

    if (!this._listeners) {
      this._listeners = new Map();
    }

    if (!this._listeners.has(eventType)) {
      this._listeners.set(eventType, []);
    }
    const listenerForEventType = this._listeners.get(eventType);
    if (listenerForEventType) {
      listenerForEventType.push({thisObject: thisObject, listener: listener, disposed: undefined});
    }
    return {eventTarget: this, eventType: eventType, thisObject: thisObject, listener: listener};
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once(eventType: string|symbol): Promise<any> {
    return new Promise(resolve => {
      const descriptor = this.addEventListener(eventType, event => {
        this.removeEventListener(eventType, descriptor.listener);
        resolve(event.data);
      });
    });
  }

  removeEventListener(eventType: string|symbol, listener: (arg0: EventTargetEvent) => void, thisObject?: Object): void {
    console.assert(Boolean(listener));

    if (!this._listeners || !this._listeners.has(eventType)) {
      return;
    }
    const listeners = this._listeners.get(eventType) || [];
    for (let i = 0; i < listeners.length; ++i) {
      if (listeners[i].listener === listener && listeners[i].thisObject === thisObject) {
        listeners[i].disposed = true;
        listeners.splice(i--, 1);
      }
    }

    if (!listeners.length) {
      this._listeners.delete(eventType);
    }
  }

  hasEventListeners(eventType: string|symbol): boolean {
    return Boolean(this._listeners && this._listeners.has(eventType));
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatchEventToListeners(eventType: string|symbol, eventData?: any): void {
    if (!this._listeners || !this._listeners.has(eventType)) {
      return;
    }

    const event = ({data: eventData} as EventTargetEvent);
    // @ts-ignore we do the check for undefined above
    const listeners = this._listeners.get(eventType).slice(0) || [];
    for (let i = 0; i < listeners.length; ++i) {
      if (!listeners[i].disposed) {
        listeners[i].listener.call(listeners[i].thisObject, event);
      }
    }
  }
}
