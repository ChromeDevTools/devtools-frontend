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
/**
 * @implements {Common.EventTarget}
 * @unrestricted
 */
Common.Object = class {
  constructor() {
    /** @type {(!Map<(symbol|!Common.Emittable), !Array<!Common.Object._listenerCallbackTuple>>|undefined)} */
    this._listeners;
  }
  /**
   * @override
   * @param {symbol} eventType
   * @param {function(!Common.Event)} listener
   * @param {!Object=} thisObject
   * @return {!Common.EventTarget.EventDescriptor}
   */
  addEventListener(eventType, listener, thisObject) {
    if (!listener)
      console.assert(false);

    if (!this._listeners)
      this._listeners = new Map();

    if (!this._listeners.has(eventType))
      this._listeners.set(eventType, []);
    this._listeners.get(eventType).push({thisObject: thisObject, listener: listener});
    return new Common.EventTarget.EventDescriptor(this, eventType, thisObject, listener);
  }

  /**
   * @override
   * @param {symbol} eventType
   * @param {function(!Common.Event)} listener
   * @param {!Object=} thisObject
   */
  removeEventListener(eventType, listener, thisObject) {
    console.assert(listener);

    if (!this._listeners || !this._listeners.has(eventType))
      return;
    var listeners = this._listeners.get(eventType);
    for (var i = 0; i < listeners.length; ++i) {
      if (listeners[i].listener === listener && listeners[i].thisObject === thisObject)
        listeners.splice(i--, 1);
    }

    if (!listeners.length)
      this._listeners.delete(eventType);
  }

  /**
   * @override
   * @param {symbol} eventType
   * @return {boolean}
   */
  hasEventListeners(eventType) {
    return !!(this._listeners && this._listeners.has(eventType));
  }

  /**
   * @override
   * @param {symbol} eventType
   * @param {*=} eventData
   */
  dispatchEventToListeners(eventType, eventData) {
    if (!this._listeners || !this._listeners.has(eventType))
      return;

    var event = new Common.Event(eventData);
    var listeners = this._listeners.get(eventType).slice(0);
    for (var i = 0; i < listeners.length; ++i)
      listeners[i].listener.call(listeners[i].thisObject, event);
  }

  /**
   * @override
   * @param {function(new:T, ...)} eventType
   * @param {function(!T)} listener
   * @param {!Object=} thisObject
   * @return {!Common.EventTarget.TypedEventDescriptor}
   * @template T
   */
  on(eventType, listener, thisObject) {
    if (!this._listeners)
      this._listeners = new Map();
    if (!this._listeners.has(eventType))
      this._listeners.set(eventType, []);
    this._listeners.get(eventType).push({thisObject: thisObject, listener: listener});
    return new Common.EventTarget.TypedEventDescriptor(this, eventType, thisObject, listener);
  }

  /**
   * @override
   * @param {function(new:T, ...)} eventType
   * @param {function(!T)} listener
   * @param {!Object=} thisObject
   * @template T
   */
  off(eventType, listener, thisObject) {
    if (!this._listeners || !this._listeners.has(eventType))
      return;
    var listeners = this._listeners.get(eventType);
    for (var i = 0; i < listeners.length; ++i) {
      if (listeners[i].listener === listener && listeners[i].thisObject === thisObject)
        listeners.splice(i--, 1);
    }
    if (!listeners.length)
      this._listeners.delete(eventType);
  }

  /**
   * @override
   * @param {!Common.Emittable} event
   */
  emit(event) {
    var eventType = event.constructor;
    if (!this._listeners || !this._listeners.has(eventType))
      return;
    var listeners = this._listeners.get(eventType).slice(0);
    for (var i = 0; i < listeners.length; ++i)
      listeners[i].listener.call(listeners[i].thisObject, event);
  }
};

/**
 * @interface
 */
Common.Emittable = function() {};

/**
 * @typedef {!{thisObject: (!Object|undefined), listener: function(!Common.Emittable)}}
 */
Common.Object._listenerCallbackTuple;

/**
 * @implements {Common.Emittable}
 * @unrestricted
 */
Common.Event = class {
  /**
   * @param {*=} data
   */
  constructor(data) {
    this.data = data;
  }
};

/**
 * @interface
 */
Common.EventTarget = function() {};

/**
 * @record
 * @template T
 */
Common.EventTarget.EventDescriptorStruct = class {
  constructor() {
    /** @type {!Common.EventTarget} */
    this.eventTarget;
    /** @type {!T} */
    this.eventType;
    /** @type {(!Object|undefined)} */
    this.receiver;
    /** @type {function(!Common.Emittable)} */
    this.method;
  }
};

/**
 * @implements {Common.EventTarget.EventDescriptorStruct<symbol>}
 * @unrestricted
 */
Common.EventTarget.EventDescriptor = class {
  /**
   * @param {!Common.EventTarget} eventTarget
   * @param {symbol} eventType
   * @param {(!Object|undefined)} receiver
   * @param {function(!Common.Event)} method
   */
  constructor(eventTarget, eventType, receiver, method) {
    this.eventTarget = eventTarget;
    this.eventType = eventType;
    this.receiver = receiver;
    this.method = method;
  }
};

/**
 * @implements {Common.EventTarget.EventDescriptorStruct<function(new:Common.Emittable)>}
 * @unrestricted
 */
Common.EventTarget.TypedEventDescriptor = class {
  /**
   * @param {!Common.EventTarget} eventTarget
   * @param {function(new:Common.Emittable, ...)} eventType
   * @param {(!Object|undefined)} receiver
   * @param {function(!Common.Emittable)} method
   */
  constructor(eventTarget, eventType, receiver, method) {
    this.eventTarget = eventTarget;
    this.eventType = eventType;
    this.receiver = receiver;
    this.method = method;
  }
};

/**
 * @param {!Array<!Common.EventTarget.EventDescriptorStruct>} eventList
 */
Common.EventTarget.removeEventListeners = function(eventList) {
  for (var i = 0; i < eventList.length; ++i) {
    if (eventList[i] instanceof Common.EventTarget.EventDescriptor) {
      var eventInfo = /** @type {!Common.EventTarget.EventDescriptor} */ (eventList[i]);
      eventInfo.eventTarget.removeEventListener(eventInfo.eventType, eventInfo.method, eventInfo.receiver);
    } else {
      var eventInfo = /** @type {!Common.EventTarget.TypedEventDescriptor} */ (eventList[i]);
      eventInfo.eventTarget.off(eventInfo.eventType, eventInfo.method, eventInfo.receiver);
    }
  }
  // Do not hold references on unused event descriptors.
  eventList.splice(0, eventList.length);
};

Common.EventTarget.prototype = {
  /**
   * @param {symbol} eventType
   * @param {function(!Common.Event)} listener
   * @param {!Object=} thisObject
   * @return {!Common.EventTarget.EventDescriptor}
   */
  addEventListener(eventType, listener, thisObject) {},

  /**
   * @param {symbol} eventType
   * @param {function(!Common.Event)} listener
   * @param {!Object=} thisObject
   */
  removeEventListener(eventType, listener, thisObject) {},

  /**
   * @param {symbol} eventType
   * @return {boolean}
   */
  hasEventListeners(eventType) {},

  /**
   * @param {symbol} eventType
   * @param {*=} eventData
   */
  dispatchEventToListeners(eventType, eventData) {},

  /**
   * @param {function(new:T, ...)} eventType
   * @param {function(!T)} listener
   * @param {!Object=} thisObject
   * @return {!Common.EventTarget.TypedEventDescriptor}
   * @template T
   */
  on(eventType, listener, thisObject) {},

  /**
   * @param {function(new:T, ...)} eventType
   * @param {function(!T)} listener
   * @param {!Object=} thisObject
   * @template T
   */
  off(eventType, listener, thisObject) {},

  /**
   * @param {!Common.Emittable} event
   */
  emit(event) {},
};
