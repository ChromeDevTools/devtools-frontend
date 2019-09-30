// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {!Array<!Common.EventTarget.EventDescriptor>} eventList
 */
export function removeEventListeners(eventList) {
  for (const eventInfo of eventList) {
    eventInfo.eventTarget.removeEventListener(eventInfo.eventType, eventInfo.listener, eventInfo.thisObject);
  }
  // Do not hold references on unused event descriptors.
  eventList.splice(0);
}

/**
 * @interface
 */
export default class EventTarget {
  /**
   * @param {symbol} eventType
   * @param {function(!Common.Event)} listener
   * @param {!Object=} thisObject
   * @return {!Common.EventTarget.EventDescriptor}
   */
  addEventListener(eventType, listener, thisObject) {
  }

  /**
   * @param {symbol} eventType
   * @return {!Promise<*>}
   */
  once(eventType) {
  }

  /**
   * @param {string|symbol} eventType
   * @param {function(!Common.Event)} listener
   * @param {!Object=} thisObject
   */
  removeEventListener(eventType, listener, thisObject) {
  }

  /**
   * @param {symbol} eventType
   * @return {boolean}
   */
  hasEventListeners(eventType) {
  }

  /**
   * @param {symbol} eventType
   * @param {*=} eventData
   */
  dispatchEventToListeners(eventType, eventData) {
  }
}

/* Legacy exported object */
self.Common = self.Common || {};
Common = Common || {};

/**
 * @typedef {!{data: *}}
 */
Common.Event;

/**
 * @interface
 */
Common.EventTarget = EventTarget;

EventTarget.removeEventListeners = removeEventListeners;

/**
 * @typedef {!{eventTarget: !Common.EventTarget, eventType: (string|symbol), thisObject: (!Object|undefined), listener: function(!Common.Event)}}
 */
Common.EventTarget.EventDescriptor;
