type IEventEmitter = {
    /**
     * Registers a listener for the specified event.
     *
     * @param eventName - The name (or symbol) of the event to listen for.
     * @param listener - A callback function that will be invoked when the event is emitted.
     * @returns The current instance of EventEmitter for method chaining.
     *
     * @example
     * emitter.on('data', (message) => {
     *   console.log(message);
     * });
     */
    on(eventName: string | symbol, listener: (...arguments_: any[]) => void): IEventEmitter;
    /**
     * Alias for `on`. Registers a listener for the specified event.
     *
     * @param eventName - The name (or symbol) of the event to listen for.
     * @param listener - A callback function that will be invoked when the event is emitted.
     * @returns The current instance of EventEmitter for method chaining.
     */
    addListener(eventName: string | symbol, listener: (...arguments_: any[]) => void): IEventEmitter;
    /**
     * Registers a one-time listener for the specified event. The listener is removed after it is called once.
     *
     * @param eventName - The name (or symbol) of the event to listen for.
     * @param listener - A callback function that will be invoked once when the event is emitted.
     * @returns The current instance of EventEmitter for method chaining.
     *
     * @example
     * emitter.once('close', () => {
     *   console.log('The connection was closed.');
     * });
     */
    once(eventName: string | symbol, listener: (...arguments_: any[]) => void): IEventEmitter;
    /**
     * Removes a previously registered listener for the specified event.
     *
     * @param eventName - The name (or symbol) of the event to stop listening for.
     * @param listener - The specific callback function to remove.
     * @returns The current instance of EventEmitter for method chaining.
     *
     * @example
     * emitter.off('data', myListener);
     */
    off(eventName: string | symbol, listener: (...arguments_: any[]) => void): IEventEmitter;
    /**
     * Alias for `off`. Removes a previously registered listener for the specified event.
     *
     * @param eventName - The name (or symbol) of the event to stop listening for.
     * @param listener - The specific callback function to remove.
     * @returns The current instance of EventEmitter for method chaining.
     */
    removeListener(eventName: string | symbol, listener: (...arguments_: any[]) => void): IEventEmitter;
    /**
     * Emits the specified event, invoking all registered listeners with the provided arguments.
     *
     * @param eventName - The name (or symbol) of the event to emit.
     * @param args - Arguments passed to each listener.
     * @returns `true` if the event had listeners, `false` otherwise.
     *
     * @example
     * emitter.emit('data', 'Hello World');
     */
    emit(eventName: string | symbol, ...arguments_: any[]): boolean;
    /**
     * Returns the number of listeners registered for the specified event.
     *
     * @param eventName - The name (or symbol) of the event.
     * @returns The number of registered listeners.
     *
     * @example
     * const count = emitter.listenerCount('data');
     * console.log(count); // e.g., 2
     */
    listenerCount(eventName: string | symbol): number;
    /**
     * Removes all listeners for the specified event. If no event is specified, it removes all listeners for all events.
     *
     * @param eventName - (Optional) The name (or symbol) of the event.
     * @returns The current instance of EventEmitter for method chaining.
     *
     * @example
     * emitter.removeAllListeners('data');
     */
    removeAllListeners(eventName?: string | symbol): IEventEmitter;
    /**
     * Returns an array of event names for which listeners have been registered.
     *
     * @returns An array of event names (or symbols).
     *
     * @example
     * const events = emitter.eventNames();
     * console.log(events); // e.g., ['data', 'close']
     */
    eventNames(): Array<string | symbol>;
    /**
     * Returns an array of listeners registered for the specified event.
     *
     * @param eventName - The name (or symbol) of the event.
     * @returns An array of listener functions.
     *
     * @example
     * const listeners = emitter.listeners('data');
     * console.log(listeners.length); // e.g., 2
     */
    listeners(eventName: string | symbol): Array<(...arguments_: any[]) => void>;
    /**
     * Returns an array of raw listeners for the specified event. This includes listeners wrapped by internal mechanisms (e.g., once-only listeners).
     *
     * @param eventName - The name (or symbol) of the event.
     * @returns An array of raw listener functions.
     *
     * @example
     * const rawListeners = emitter.rawListeners('data');
     */
    rawListeners(eventName: string | symbol): Array<(...arguments_: any[]) => void>;
    /**
     * Adds a listener to the beginning of the listeners array for the specified event.
     *
     * @param eventName - The name (or symbol) of the event to listen for.
     * @param listener - A callback function that will be invoked when the event is emitted.
     * @returns The current instance of EventEmitter for method chaining.
     *
     * @example
     * emitter.prependListener('data', (message) => {
     *   console.log('This will run first.');
     * });
     */
    prependListener(eventName: string | symbol, listener: (...arguments_: any[]) => void): IEventEmitter;
    /**
     * Adds a one-time listener to the beginning of the listeners array for the specified event.
     *
     * @param eventName - The name (or symbol) of the event to listen for.
     * @param listener - A callback function that will be invoked once when the event is emitted.
     * @returns The current instance of EventEmitter for method chaining.
     *
     * @example
     * emitter.prependOnceListener('data', (message) => {
     *   console.log('This will run first and only once.');
     * });
     */
    prependOnceListener(eventName: string | symbol, listener: (...arguments_: any[]) => void): IEventEmitter;
};
type EventListener = (...arguments_: any[]) => void;
declare class Eventified implements IEventEmitter {
    _eventListeners: Map<string | symbol, EventListener[]>;
    _maxListeners: number;
    constructor();
    /**
     * Adds a handler function for a specific event that will run only once
     * @param {string | symbol} eventName
     * @param {EventListener} listener
     * @returns {IEventEmitter} returns the instance of the class for chaining
     */
    once(eventName: string | symbol, listener: EventListener): IEventEmitter;
    /**
     * Gets the number of listeners for a specific event. If no event is provided, it returns the total number of listeners
     * @param {string} eventName The event name. Not required
     * @returns {number} The number of listeners
     */
    listenerCount(eventName?: string | symbol): number;
    /**
     * Gets an array of event names
     * @returns {Array<string | symbol>} An array of event names
     */
    eventNames(): Array<string | symbol>;
    /**
     * Gets an array of listeners for a specific event. If no event is provided, it returns all listeners
     * @param {string} [event] (Optional) The event name
     * @returns {EventListener[]} An array of listeners
     */
    rawListeners(event?: string | symbol): EventListener[];
    /**
     * Prepends a listener to the beginning of the listeners array for the specified event
     * @param {string | symbol} eventName
     * @param {EventListener} listener
     * @returns {IEventEmitter} returns the instance of the class for chaining
     */
    prependListener(eventName: string | symbol, listener: EventListener): IEventEmitter;
    /**
     * Prepends a one-time listener to the beginning of the listeners array for the specified event
     * @param {string | symbol} eventName
     * @param {EventListener} listener
     * @returns {IEventEmitter} returns the instance of the class for chaining
     */
    prependOnceListener(eventName: string | symbol, listener: EventListener): IEventEmitter;
    /**
     * Gets the maximum number of listeners that can be added for a single event
     * @returns {number} The maximum number of listeners
     */
    maxListeners(): number;
    /**
     * Adds a listener for a specific event. It is an alias for the on() method
     * @param {string | symbol} event
     * @param {EventListener} listener
     * @returns {IEventEmitter} returns the instance of the class for chaining
     */
    addListener(event: string | symbol, listener: EventListener): IEventEmitter;
    /**
     * Adds a listener for a specific event
     * @param {string | symbol} event
     * @param {EventListener} listener
     * @returns {IEventEmitter} returns the instance of the class for chaining
     */
    on(event: string | symbol, listener: EventListener): IEventEmitter;
    /**
     * Removes a listener for a specific event. It is an alias for the off() method
     * @param {string | symbol} event
     * @param {EventListener} listener
     * @returns {IEventEmitter} returns the instance of the class for chaining
     */
    removeListener(event: string, listener: EventListener): IEventEmitter;
    /**
     * Removes a listener for a specific event
     * @param {string | symbol} event
     * @param {EventListener} listener
     * @returns {IEventEmitter} returns the instance of the class for chaining
     */
    off(event: string | symbol, listener: EventListener): IEventEmitter;
    /**
     * Calls all listeners for a specific event
     * @param {string | symbol} event
     * @param arguments_ The arguments to pass to the listeners
     * @returns {boolean} Returns true if the event had listeners, false otherwise
     */
    emit(event: string | symbol, ...arguments_: any[]): boolean;
    /**
     * Gets all listeners for a specific event. If no event is provided, it returns all listeners
     * @param {string} [event] (Optional) The event name
     * @returns {EventListener[]} An array of listeners
     */
    listeners(event: string): EventListener[];
    /**
     * Removes all listeners for a specific event. If no event is provided, it removes all listeners
     * @param {string} [event] (Optional) The event name
     * @returns {IEventEmitter} returns the instance of the class for chaining
     */
    removeAllListeners(event?: string): IEventEmitter;
    /**
     * Sets the maximum number of listeners that can be added for a single event
     * @param {number} n The maximum number of listeners
     * @returns {void}
     */
    setMaxListeners(n: number): void;
    /**
     * Gets all listeners
     * @returns {EventListener[]} An array of listeners
     */
    getAllListeners(): EventListener[];
}

type Hook = (...arguments_: any[]) => Promise<void> | void;
type HookifiedOptions = {
    throwHookErrors?: boolean;
};
declare class Hookified extends Eventified {
    _hooks: Map<string, Hook[]>;
    _throwHookErrors: boolean;
    constructor(options?: HookifiedOptions);
    /**
     * Gets all hooks
     * @returns {Map<string, Hook[]>}
     */
    get hooks(): Map<string, Hook[]>;
    /**
     * Gets whether an error should be thrown when a hook throws an error. Default is false and only emits an error event.
     * @returns {boolean}
     */
    get throwHookErrors(): boolean;
    /**
     * Sets whether an error should be thrown when a hook throws an error. Default is false and only emits an error event.
     * @param {boolean} value
     */
    set throwHookErrors(value: boolean);
    /**
     * Adds a handler function for a specific event
     * @param {string} event
     * @param {Hook} handler - this can be async or sync
     * @returns {void}
     */
    onHook(event: string, handler: Hook): void;
    /**
     * Adds a handler function for a specific event that runs before all other handlers
     * @param {string} event
     * @param {Hook} handler - this can be async or sync
     * @returns {void}
     */
    prependHook(event: string, handler: Hook): void;
    /**
     * Adds a handler that only executes once for a specific event before all other handlers
     * @param event
     * @param handler
     */
    prependOnceHook(event: string, handler: Hook): void;
    /**
     * Adds a handler that only executes once for a specific event
     * @param event
     * @param handler
     */
    onceHook(event: string, handler: Hook): void;
    /**
     * Removes a handler function for a specific event
     * @param {string} event
     * @param {Hook} handler
     * @returns {void}
     */
    removeHook(event: string, handler: Hook): void;
    /**
     * Calls all handlers for a specific event
     * @param {string} event
     * @param {T[]} arguments_
     * @returns {Promise<void>}
     */
    hook<T>(event: string, ...arguments_: T[]): Promise<void>;
    /**
     * Gets all hooks for a specific event
     * @param {string} event
     * @returns {Hook[]}
     */
    getHooks(event: string): Hook[] | undefined;
    /**
     * Removes all hooks
     * @returns {void}
     */
    clearHooks(): void;
}

export { type EventListener, Eventified, type Hook, Hookified, type HookifiedOptions };
