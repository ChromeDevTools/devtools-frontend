// src/eventified.ts
var Eventified = class {
  _eventListeners;
  _maxListeners;
  constructor() {
    this._eventListeners = /* @__PURE__ */ new Map();
    this._maxListeners = 100;
  }
  /**
   * Adds a handler function for a specific event that will run only once
   * @param {string | symbol} eventName
   * @param {EventListener} listener
   * @returns {IEventEmitter} returns the instance of the class for chaining
   */
  once(eventName, listener) {
    const onceListener = (...arguments_) => {
      this.off(eventName, onceListener);
      listener(...arguments_);
    };
    this.on(eventName, onceListener);
    return this;
  }
  /**
   * Gets the number of listeners for a specific event. If no event is provided, it returns the total number of listeners
   * @param {string} eventName The event name. Not required
   * @returns {number} The number of listeners
   */
  listenerCount(eventName) {
    if (!eventName) {
      return this.getAllListeners().length;
    }
    const listeners = this._eventListeners.get(eventName);
    return listeners ? listeners.length : 0;
  }
  /**
   * Gets an array of event names
   * @returns {Array<string | symbol>} An array of event names
   */
  eventNames() {
    return Array.from(this._eventListeners.keys());
  }
  /**
   * Gets an array of listeners for a specific event. If no event is provided, it returns all listeners
   * @param {string} [event] (Optional) The event name
   * @returns {EventListener[]} An array of listeners
   */
  rawListeners(event) {
    if (!event) {
      return this.getAllListeners();
    }
    return this._eventListeners.get(event) ?? [];
  }
  /**
   * Prepends a listener to the beginning of the listeners array for the specified event
   * @param {string | symbol} eventName
   * @param {EventListener} listener
   * @returns {IEventEmitter} returns the instance of the class for chaining
   */
  prependListener(eventName, listener) {
    const listeners = this._eventListeners.get(eventName) ?? [];
    listeners.unshift(listener);
    this._eventListeners.set(eventName, listeners);
    return this;
  }
  /**
   * Prepends a one-time listener to the beginning of the listeners array for the specified event
   * @param {string | symbol} eventName
   * @param {EventListener} listener
   * @returns {IEventEmitter} returns the instance of the class for chaining
   */
  prependOnceListener(eventName, listener) {
    const onceListener = (...arguments_) => {
      this.off(eventName, onceListener);
      listener(...arguments_);
    };
    this.prependListener(eventName, onceListener);
    return this;
  }
  /**
   * Gets the maximum number of listeners that can be added for a single event
   * @returns {number} The maximum number of listeners
   */
  maxListeners() {
    return this._maxListeners;
  }
  /**
   * Adds a listener for a specific event. It is an alias for the on() method
   * @param {string | symbol} event
   * @param {EventListener} listener
   * @returns {IEventEmitter} returns the instance of the class for chaining
   */
  addListener(event, listener) {
    this.on(event, listener);
    return this;
  }
  /**
   * Adds a listener for a specific event
   * @param {string | symbol} event
   * @param {EventListener} listener
   * @returns {IEventEmitter} returns the instance of the class for chaining
   */
  on(event, listener) {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, []);
    }
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      if (listeners.length >= this._maxListeners) {
        console.warn(`MaxListenersExceededWarning: Possible event memory leak detected. ${listeners.length + 1} ${event} listeners added. Use setMaxListeners() to increase limit.`);
      }
      listeners.push(listener);
    }
    return this;
  }
  /**
   * Removes a listener for a specific event. It is an alias for the off() method
   * @param {string | symbol} event
   * @param {EventListener} listener
   * @returns {IEventEmitter} returns the instance of the class for chaining
   */
  removeListener(event, listener) {
    this.off(event, listener);
    return this;
  }
  /**
   * Removes a listener for a specific event
   * @param {string | symbol} event
   * @param {EventListener} listener
   * @returns {IEventEmitter} returns the instance of the class for chaining
   */
  off(event, listener) {
    const listeners = this._eventListeners.get(event) ?? [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    if (listeners.length === 0) {
      this._eventListeners.delete(event);
    }
    return this;
  }
  /**
   * Calls all listeners for a specific event
   * @param {string | symbol} event
   * @param arguments_ The arguments to pass to the listeners
   * @returns {boolean} Returns true if the event had listeners, false otherwise
   */
  emit(event, ...arguments_) {
    let result = false;
    const listeners = this._eventListeners.get(event);
    if (listeners && listeners.length > 0) {
      for (const listener of listeners) {
        listener(...arguments_);
        result = true;
      }
    }
    return result;
  }
  /**
   * Gets all listeners for a specific event. If no event is provided, it returns all listeners
   * @param {string} [event] (Optional) The event name
   * @returns {EventListener[]} An array of listeners
   */
  listeners(event) {
    return this._eventListeners.get(event) ?? [];
  }
  /**
   * Removes all listeners for a specific event. If no event is provided, it removes all listeners
   * @param {string} [event] (Optional) The event name
   * @returns {IEventEmitter} returns the instance of the class for chaining
   */
  removeAllListeners(event) {
    if (event) {
      this._eventListeners.delete(event);
    } else {
      this._eventListeners.clear();
    }
    return this;
  }
  /**
   * Sets the maximum number of listeners that can be added for a single event
   * @param {number} n The maximum number of listeners
   * @returns {void}
   */
  setMaxListeners(n) {
    this._maxListeners = n;
    for (const listeners of this._eventListeners.values()) {
      if (listeners.length > n) {
        listeners.splice(n);
      }
    }
  }
  /**
   * Gets all listeners
   * @returns {EventListener[]} An array of listeners
   */
  getAllListeners() {
    let result = new Array();
    for (const listeners of this._eventListeners.values()) {
      result = result.concat(listeners);
    }
    return result;
  }
};

// src/index.ts
var Hookified = class extends Eventified {
  _hooks;
  _throwHookErrors = false;
  constructor(options) {
    super();
    this._hooks = /* @__PURE__ */ new Map();
    if (options?.throwHookErrors !== void 0) {
      this._throwHookErrors = options.throwHookErrors;
    }
  }
  /**
   * Gets all hooks
   * @returns {Map<string, Hook[]>}
   */
  get hooks() {
    return this._hooks;
  }
  /**
   * Gets whether an error should be thrown when a hook throws an error. Default is false and only emits an error event.
   * @returns {boolean}
   */
  get throwHookErrors() {
    return this._throwHookErrors;
  }
  /**
   * Sets whether an error should be thrown when a hook throws an error. Default is false and only emits an error event.
   * @param {boolean} value
   */
  set throwHookErrors(value) {
    this._throwHookErrors = value;
  }
  /**
   * Adds a handler function for a specific event
   * @param {string} event
   * @param {Hook} handler - this can be async or sync
   * @returns {void}
   */
  onHook(event, handler) {
    const eventHandlers = this._hooks.get(event);
    if (eventHandlers) {
      eventHandlers.push(handler);
    } else {
      this._hooks.set(event, [handler]);
    }
  }
  /**
   * Adds a handler function for a specific event that runs before all other handlers
   * @param {string} event
   * @param {Hook} handler - this can be async or sync
   * @returns {void}
   */
  prependHook(event, handler) {
    const eventHandlers = this._hooks.get(event);
    if (eventHandlers) {
      eventHandlers.unshift(handler);
    } else {
      this._hooks.set(event, [handler]);
    }
  }
  /**
   * Adds a handler that only executes once for a specific event before all other handlers
   * @param event
   * @param handler
   */
  prependOnceHook(event, handler) {
    const hook = async (...arguments_) => {
      this.removeHook(event, hook);
      return handler(...arguments_);
    };
    this.prependHook(event, hook);
  }
  /**
   * Adds a handler that only executes once for a specific event
   * @param event
   * @param handler
   */
  onceHook(event, handler) {
    const hook = async (...arguments_) => {
      this.removeHook(event, hook);
      return handler(...arguments_);
    };
    this.onHook(event, hook);
  }
  /**
   * Removes a handler function for a specific event
   * @param {string} event
   * @param {Hook} handler
   * @returns {void}
   */
  removeHook(event, handler) {
    const eventHandlers = this._hooks.get(event);
    if (eventHandlers) {
      const index = eventHandlers.indexOf(handler);
      if (index !== -1) {
        eventHandlers.splice(index, 1);
      }
    }
  }
  /**
   * Calls all handlers for a specific event
   * @param {string} event
   * @param {T[]} arguments_
   * @returns {Promise<void>}
   */
  async hook(event, ...arguments_) {
    const eventHandlers = this._hooks.get(event);
    if (eventHandlers) {
      for (const handler of eventHandlers) {
        try {
          await handler(...arguments_);
        } catch (error) {
          const message = `${event}: ${error.message}`;
          this.emit("error", new Error(message));
          if (this._throwHookErrors) {
            throw new Error(message);
          }
        }
      }
    }
  }
  /**
   * Gets all hooks for a specific event
   * @param {string} event
   * @returns {Hook[]}
   */
  getHooks(event) {
    return this._hooks.get(event);
  }
  /**
   * Removes all hooks
   * @returns {void}
   */
  clearHooks() {
    this._hooks.clear();
  }
};
export {
  Eventified,
  Hookified
};
