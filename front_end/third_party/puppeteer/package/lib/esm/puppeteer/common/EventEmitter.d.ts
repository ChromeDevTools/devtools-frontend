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
import { type EventType } from '../../third_party/mitt/index.js';
import { disposeSymbol } from '../util/disposable.js';
export type { 
/**
 * @public
 */
EventType, } from '../../third_party/mitt/index.js';
/**
 * @public
 */
export type Handler<T = unknown> = (event: T) => void;
/**
 * @public
 */
export interface CommonEventEmitter<Events extends Record<EventType, unknown>> {
    on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): this;
    off<Key extends keyof Events>(type: Key, handler?: Handler<Events[Key]>): this;
    emit<Key extends keyof Events>(type: Key, event: Events[Key]): boolean;
    addListener<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): this;
    removeListener<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): this;
    once<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): this;
    listenerCount(event: keyof Events): number;
    removeAllListeners(event?: keyof Events): this;
}
/**
 * @public
 */
export type EventsWithWildcard<Events extends Record<EventType, unknown>> = Events & {
    '*': Events[keyof Events];
};
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
export declare class EventEmitter<Events extends Record<EventType, unknown>> implements CommonEventEmitter<EventsWithWildcard<Events>> {
    #private;
    /**
     * @internal
     */
    constructor();
    /**
     * Bind an event listener to fire when an event occurs.
     * @param type - the event type you'd like to listen to. Can be a string or symbol.
     * @param handler - the function to be called when the event occurs.
     * @returns `this` to enable you to chain method calls.
     */
    on<Key extends keyof EventsWithWildcard<Events>>(type: Key, handler: Handler<EventsWithWildcard<Events>[Key]>): this;
    /**
     * Remove an event listener from firing.
     * @param type - the event type you'd like to stop listening to.
     * @param handler - the function that should be removed.
     * @returns `this` to enable you to chain method calls.
     */
    off<Key extends keyof EventsWithWildcard<Events>>(type: Key, handler?: Handler<EventsWithWildcard<Events>[Key]>): this;
    /**
     * Remove an event listener.
     *
     * @deprecated please use {@link EventEmitter.off} instead.
     */
    removeListener<Key extends keyof EventsWithWildcard<Events>>(type: Key, handler: Handler<EventsWithWildcard<Events>[Key]>): this;
    /**
     * Add an event listener.
     *
     * @deprecated please use {@link EventEmitter.on} instead.
     */
    addListener<Key extends keyof EventsWithWildcard<Events>>(type: Key, handler: Handler<EventsWithWildcard<Events>[Key]>): this;
    /**
     * Emit an event and call any associated listeners.
     *
     * @param type - the event you'd like to emit
     * @param eventData - any data you'd like to emit with the event
     * @returns `true` if there are any listeners, `false` if there are not.
     */
    emit<Key extends keyof EventsWithWildcard<Events>>(type: Key, event: EventsWithWildcard<Events>[Key]): boolean;
    /**
     * Like `on` but the listener will only be fired once and then it will be removed.
     * @param type - the event you'd like to listen to
     * @param handler - the handler function to run when the event occurs
     * @returns `this` to enable you to chain method calls.
     */
    once<Key extends keyof EventsWithWildcard<Events>>(type: Key, handler: Handler<EventsWithWildcard<Events>[Key]>): this;
    /**
     * Gets the number of listeners for a given event.
     *
     * @param type - the event to get the listener count for
     * @returns the number of listeners bound to the given event
     */
    listenerCount(type: keyof EventsWithWildcard<Events>): number;
    /**
     * Removes all listeners. If given an event argument, it will remove only
     * listeners for that event.
     *
     * @param type - the event to remove listeners for.
     * @returns `this` to enable you to chain method calls.
     */
    removeAllListeners(type?: keyof EventsWithWildcard<Events>): this;
}
/**
 * @internal
 */
export declare class EventSubscription<Target extends CommonEventEmitter<Record<Type, Event>>, Type extends EventType = EventType, Event = unknown> {
    #private;
    constructor(target: Target, type: Type, handler: Handler<Event>);
    [disposeSymbol](): void;
}
//# sourceMappingURL=EventEmitter.d.ts.map