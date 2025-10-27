"use strict";
export class ObjectWrapper {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listeners;
  addEventListener(eventType, listener, thisObject) {
    if (!this.listeners) {
      this.listeners = /* @__PURE__ */ new Map();
    }
    let listenersForEventType = this.listeners.get(eventType);
    if (!listenersForEventType) {
      listenersForEventType = /* @__PURE__ */ new Set();
      this.listeners.set(eventType, listenersForEventType);
    }
    listenersForEventType.add({ thisObject, listener });
    return { eventTarget: this, eventType, thisObject, listener };
  }
  once(eventType) {
    return new Promise((resolve) => {
      const descriptor = this.addEventListener(eventType, (event) => {
        this.removeEventListener(eventType, descriptor.listener);
        resolve(event.data);
      });
    });
  }
  removeEventListener(eventType, listener, thisObject) {
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
  hasEventListeners(eventType) {
    return Boolean(this.listeners?.has(eventType));
  }
  dispatchEventToListeners(eventType, ...[eventData]) {
    const listeners = this.listeners?.get(eventType);
    if (!listeners) {
      return;
    }
    const event = { data: eventData, source: this };
    for (const listener of [...listeners]) {
      if (!listener.disposed) {
        listener.listener.call(listener.thisObject, event);
      }
    }
  }
}
export function eventMixin(base) {
  console.assert(base !== HTMLElement);
  return class EventHandling extends base {
    #events = new ObjectWrapper();
    addEventListener(eventType, listener, thisObject) {
      return this.#events.addEventListener(eventType, listener, thisObject);
    }
    once(eventType) {
      return this.#events.once(eventType);
    }
    removeEventListener(eventType, listener, thisObject) {
      this.#events.removeEventListener(eventType, listener, thisObject);
    }
    hasEventListeners(eventType) {
      return this.#events.hasEventListeners(eventType);
    }
    dispatchEventToListeners(eventType, ...eventData) {
      this.#events.dispatchEventToListeners(eventType, ...eventData);
    }
  };
}
//# sourceMappingURL=Object.js.map
