/**
 * @license
 * Copyright 2022 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import mitt from '../../third_party/mitt/mitt.js';
import { asyncDisposeSymbol, disposeSymbol } from '../util/disposable.js';
import { DEBUG_PREFIXES } from './Debug.js';
/**
 * The EventEmitter class that many Puppeteer classes extend.
 *
 * @remarks
 *
 * This allows you to listen to events that Puppeteer classes fire and act
 * accordingly. Therefore you'll mostly use {@link EventEmitter.on | on} and
 * {@link EventEmitter.off | off} to bind
 * and unbind to event listeners.
 *
 * @public
 */
export class EventEmitter {
    #emitter;
    #handlers = new Map();
    // Maps the handlers registered by `once` to the handlers passed to it.
    #onceHandlers = new WeakMap();
    #logger;
    /**
     * If you pass an emitter, the returned emitter will wrap the passed emitter.
     *
     * @internal
     */
    constructor(emitter = mitt(new Map()), logger) {
        this.#emitter = emitter;
        this.#logger = logger;
    }
    /**
     * Bind an event listener to fire when an event occurs.
     * @param type - the event type you'd like to listen to. Can be a string or symbol.
     * @param handler - the function to be called when the event occurs.
     * @returns `this` to enable you to chain method calls.
     */
    on(type, handler) {
        const handlers = this.#handlers.get(type);
        if (handlers === undefined) {
            this.#handlers.set(type, [handler]);
        }
        else {
            handlers.push(handler);
        }
        this.#emitter.on(type, handler);
        return this;
    }
    /**
     * Remove an event listener from firing.
     * @param type - the event type you'd like to stop listening to.
     * @param handler - the function that should be removed.
     * @returns `this` to enable you to chain method calls.
     */
    off(type, handler) {
        const handlers = this.#handlers.get(type) ?? [];
        if (handler === undefined) {
            for (const handler of handlers) {
                this.#emitter.off(type, handler);
            }
            this.#handlers.delete(type);
            return this;
        }
        let index = handlers.length - 1;
        while (index > -1 &&
            handlers[index] !== handler &&
            this.#onceHandlers.get(handlers[index]) !== handler) {
            index--;
        }
        if (index > -1) {
            this.#emitter.off(type, ...handlers.splice(index, 1));
        }
        return this;
    }
    /**
     * Emit an event and call any associated listeners.
     *
     * @param type - the event you'd like to emit
     * @param event - any data you'd like to emit with the event
     * @returns `true` if there are any listeners, `false` if there are not.
     */
    emit(type, event) {
        this.#emitter.emit(type, event);
        return this.listenerCount(type) > 0;
    }
    /**
     * Like `on` but the listener will only be fired once and then it will be removed.
     * @param type - the event you'd like to listen to
     * @param handler - the handler function to run when the event occurs
     * @returns `this` to enable you to chain method calls.
     */
    once(type, handler) {
        const onceHandler = (...args) => {
            handler(...args);
            this.off(type, onceHandler);
        };
        // Read the count from `#handlers` directly rather than `listenerCount()`,
        // which a subclass can override, so both sides of the check below come
        // from the same source.
        const handlerCount = this.#handlers.get(type)?.length ?? 0;
        this.on(type, onceHandler);
        // Subclasses can register a wrapper of `onceHandler` in `on`, so map the
        // handler that was registered last. Only do it if `on` added exactly one
        // handler, otherwise `off(type, handler)` could remove an unrelated one.
        const handlers = this.#handlers.get(type);
        if (handlers && handlers.length === handlerCount + 1) {
            this.#onceHandlers.set(handlers[handlers.length - 1], handler);
        }
        return this;
    }
    /**
     * Gets the number of listeners for a given event.
     *
     * @param type - the event to get the listener count for
     * @returns the number of listeners bound to the given event
     */
    listenerCount(type) {
        return this.#handlers.get(type)?.length || 0;
    }
    /**
     * Removes all listeners. If given an event argument, it will remove only
     * listeners for that event.
     *
     * @param type - the event to remove listeners for.
     * @returns `this` to enable you to chain method calls.
     */
    removeAllListeners(type) {
        if (type !== undefined) {
            return this.off(type);
        }
        this[disposeSymbol]();
        return this;
    }
    [disposeSymbol]() {
        return void this[asyncDisposeSymbol]().catch(error => {
            this.#logger?.(DEBUG_PREFIXES.error)?.(error);
        });
    }
    async [asyncDisposeSymbol]() {
        for (const [type, handlers] of this.#handlers) {
            for (const handler of handlers) {
                this.#emitter.off(type, handler);
            }
        }
        this.#handlers.clear();
    }
}
//# sourceMappingURL=EventEmitter.js.map