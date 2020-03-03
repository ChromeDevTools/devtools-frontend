// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @typedef {!{eventTarget: !EventTarget, eventType: (string|symbol), thisObject: (!Object|undefined), listener: function(!EventTargetEvent):void}}
 */
// @ts-ignore TS can't pick up that EventDescriptor is of this type
export let EventDescriptor;

/**
 * @param {!Array<!EventDescriptor>} eventList
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
export class EventTarget {
  /**
   * @param {symbol} eventType
   * @param {function(!EventTargetEvent):void} listener
   * @param {!Object=} thisObject
   * @return {!EventDescriptor}
   */
  addEventListener(eventType, listener, thisObject) {
    throw new Error('not implemented');
  }

  /**
   * @param {string|symbol} eventType
   * @return {!Promise<*>}
   */
  once(eventType) {
    throw new Error('not implemented');
  }

  /**
   * @param {string|symbol} eventType
   * @param {function(!EventTargetEvent):void} listener
   * @param {!Object=} thisObject
   */
  removeEventListener(eventType, listener, thisObject) {
    throw new Error('not implemented');
  }

  /**
   * @param {symbol} eventType
   * @return {boolean}
   */
  hasEventListeners(eventType) {
    throw new Error('not implemented');
  }

  /**
   * @param {symbol} eventType
   * @param {*=} eventData
   */
  dispatchEventToListeners(eventType, eventData) {
  }
}

EventTarget.removeEventListeners = removeEventListeners;

/**
 * @param {string} name
 * @param {*} detail
 * @param {!HTMLElement | !Window} target
 */
export function fireEvent(name, detail = {}, target = window) {
  const evt = new CustomEvent(name, {bubbles: true, cancelable: true, detail});
  target.dispatchEvent(evt);
}

/**
 * @typedef {!{data: *}}
 */
// @ts-ignore TS can't pick up that EventTargetEvent is of this type
export let EventTargetEvent;
