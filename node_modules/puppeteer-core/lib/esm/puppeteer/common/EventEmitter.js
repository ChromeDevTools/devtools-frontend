/**
 * Copyright 2022 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import mitt from '../../third_party/mitt/index.js';
import { disposeSymbol } from '../util/disposable.js';
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
    /**
     * @internal
     */
    constructor() {
        this.#emitter = mitt(this.#handlers);
    }
    /**
     * Bind an event listener to fire when an event occurs.
     * @param type - the event type you'd like to listen to. Can be a string or symbol.
     * @param handler - the function to be called when the event occurs.
     * @returns `this` to enable you to chain method calls.
     */
    on(type, handler) {
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
        this.#emitter.off(type, handler);
        return this;
    }
    /**
     * Remove an event listener.
     *
     * @deprecated please use {@link EventEmitter.off} instead.
     */
    removeListener(type, handler) {
        this.off(type, handler);
        return this;
    }
    /**
     * Add an event listener.
     *
     * @deprecated please use {@link EventEmitter.on} instead.
     */
    addListener(type, handler) {
        this.on(type, handler);
        return this;
    }
    /**
     * Emit an event and call any associated listeners.
     *
     * @param type - the event you'd like to emit
     * @param eventData - any data you'd like to emit with the event
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
        const onceHandler = eventData => {
            handler(eventData);
            this.off(type, onceHandler);
        };
        return this.on(type, onceHandler);
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
        if (type === undefined || type === '*') {
            this.#handlers.clear();
        }
        else {
            this.#handlers.delete(type);
        }
        return this;
    }
}
/**
 * @internal
 */
export class EventSubscription {
    #target;
    #type;
    #handler;
    constructor(target, type, handler) {
        this.#target = target;
        this.#type = type;
        this.#handler = handler;
        this.#target.on(this.#type, this.#handler);
    }
    [disposeSymbol]() {
        this.#target.off(this.#type, this.#handler);
    }
}
//# sourceMappingURL=EventEmitter.js.map