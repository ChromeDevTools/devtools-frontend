"use strict";
/**
 * Copyright 2022 Google LLC.
 * Copyright (c) Microsoft Corporation.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventManager = void 0;
const protocol_js_1 = require("../../../protocol/protocol.js");
const buffer_js_1 = require("../../../utils/buffer.js");
const idWrapper_js_1 = require("../../../utils/idWrapper.js");
const OutgoingBidiMessage_js_1 = require("../../OutgoingBidiMessage.js");
const DefaultMap_js_1 = require("../../../utils/DefaultMap.js");
const SubscriptionManager_js_1 = require("./SubscriptionManager.js");
class EventWrapper {
    #idWrapper;
    #contextId;
    #event;
    constructor(event, contextId) {
        this.#idWrapper = new idWrapper_js_1.IdWrapper();
        this.#contextId = contextId;
        this.#event = event;
    }
    get id() {
        return this.#idWrapper.id;
    }
    get contextId() {
        return this.#contextId;
    }
    get event() {
        return this.#event;
    }
}
/**
 * Maps event name to a desired buffer length.
 */
const eventBufferLength = new Map([
    [protocol_js_1.Log.EventNames.LogEntryAddedEvent, 100],
]);
class EventManager {
    static #NETWORK_DOMAIN_PREFIX = 'network';
    /**
     * Maps event name to a set of contexts where this event already happened.
     * Needed for getting buffered events from all the contexts in case of
     * subscripting to all contexts.
     */
    #eventToContextsMap = new DefaultMap_js_1.DefaultMap(() => new Set());
    /**
     * Maps `eventName` + `browsingContext` to buffer. Used to get buffered events
     * during subscription. Channel-agnostic.
     */
    #eventBuffers = new Map();
    /**
     * Maps `eventName` + `browsingContext` + `channel` to last sent event id.
     * Used to avoid sending duplicated events when user
     * subscribes -> unsubscribes -> subscribes.
     */
    #lastMessageSent = new Map();
    #subscriptionManager;
    #bidiServer;
    #isNetworkDomainEnabled;
    constructor(bidiServer) {
        this.#bidiServer = bidiServer;
        this.#subscriptionManager = new SubscriptionManager_js_1.SubscriptionManager(bidiServer.getBrowsingContextStorage());
        this.#isNetworkDomainEnabled = false;
    }
    get isNetworkDomainEnabled() {
        return this.#isNetworkDomainEnabled;
    }
    /**
     * Returns consistent key to be used to access value maps.
     */
    static #getMapKey(eventName, browsingContext, channel) {
        return JSON.stringify({ eventName, browsingContext, channel });
    }
    registerEvent(event, contextId) {
        this.registerPromiseEvent(Promise.resolve(event), contextId, event.method);
    }
    registerPromiseEvent(event, contextId, eventName) {
        const eventWrapper = new EventWrapper(event, contextId);
        const sortedChannels = this.#subscriptionManager.getChannelsSubscribedToEvent(eventName, contextId);
        this.#bufferEvent(eventWrapper, eventName);
        // Send events to channels in the subscription priority.
        for (const channel of sortedChannels) {
            this.#bidiServer.emitOutgoingMessage(OutgoingBidiMessage_js_1.OutgoingBidiMessage.createFromPromise(event, channel));
            this.#markEventSent(eventWrapper, channel, eventName);
        }
    }
    async subscribe(eventNames, contextIds, channel) {
        // First check if all the contexts are known.
        for (const contextId of contextIds) {
            if (contextId !== null) {
                // Assert the context is known. Throw exception otherwise.
                this.#bidiServer.getBrowsingContextStorage().getContext(contextId);
            }
        }
        for (const eventName of eventNames) {
            for (const contextId of contextIds) {
                await this.#handleDomains(eventName, contextId);
                this.#subscriptionManager.subscribe(eventName, contextId, channel);
                for (const eventWrapper of this.#getBufferedEvents(eventName, contextId, channel)) {
                    // The order of the events is important.
                    this.#bidiServer.emitOutgoingMessage(OutgoingBidiMessage_js_1.OutgoingBidiMessage.createFromPromise(eventWrapper.event, channel));
                    this.#markEventSent(eventWrapper, channel, eventName);
                }
            }
        }
    }
    /**
     * Enables domains for the subscribed event in the required contexts or
     * globally.
     */
    async #handleDomains(eventName, contextId) {
        // Enable network domain if user subscribed to any of network events.
        if (eventName.startsWith(EventManager.#NETWORK_DOMAIN_PREFIX)) {
            // Enable for all the contexts.
            if (contextId === null) {
                this.#isNetworkDomainEnabled = true;
                await Promise.all(this.#bidiServer
                    .getBrowsingContextStorage()
                    .getAllContexts()
                    .map((context) => context.cdpTarget.enableNetworkDomain()));
            }
            else {
                await this.#bidiServer
                    .getBrowsingContextStorage()
                    .getContext(contextId)
                    .cdpTarget.enableNetworkDomain();
            }
        }
    }
    unsubscribe(eventNames, contextIds, channel) {
        this.#subscriptionManager.unsubscribeAll(eventNames, contextIds, channel);
    }
    /**
     * If the event is buffer-able, put it in the buffer.
     */
    #bufferEvent(eventWrapper, eventName) {
        if (!eventBufferLength.has(eventName)) {
            // Do nothing if the event is no buffer-able.
            return;
        }
        const bufferMapKey = EventManager.#getMapKey(eventName, eventWrapper.contextId);
        if (!this.#eventBuffers.has(bufferMapKey)) {
            this.#eventBuffers.set(bufferMapKey, new buffer_js_1.Buffer(eventBufferLength.get(eventName)));
        }
        this.#eventBuffers.get(bufferMapKey).add(eventWrapper);
        // Add the context to the list of contexts having `eventName` events.
        this.#eventToContextsMap.get(eventName).add(eventWrapper.contextId);
    }
    /**
     * If the event is buffer-able, mark it as sent to the given contextId and channel.
     */
    #markEventSent(eventWrapper, channel, eventName) {
        if (!eventBufferLength.has(eventName)) {
            // Do nothing if the event is no buffer-able.
            return;
        }
        const lastSentMapKey = EventManager.#getMapKey(eventName, eventWrapper.contextId, channel);
        this.#lastMessageSent.set(lastSentMapKey, Math.max(this.#lastMessageSent.get(lastSentMapKey) ?? 0, eventWrapper.id));
    }
    /**
     * Returns events which are buffered and not yet sent to the given channel events.
     */
    #getBufferedEvents(eventName, contextId, channel) {
        const bufferMapKey = EventManager.#getMapKey(eventName, contextId);
        const lastSentMapKey = EventManager.#getMapKey(eventName, contextId, channel);
        const lastSentMessageId = this.#lastMessageSent.get(lastSentMapKey) ?? -Infinity;
        const result = this.#eventBuffers
            .get(bufferMapKey)
            ?.get()
            .filter((wrapper) => wrapper.id > lastSentMessageId) ?? [];
        if (contextId === null) {
            // For global subscriptions, events buffered in each context should be sent back.
            Array.from(this.#eventToContextsMap.get(eventName).keys())
                .filter((_contextId) => 
            // Events without context are already in the result.
            _contextId !== null &&
                // Events from deleted contexts should not be sent.
                this.#bidiServer.getBrowsingContextStorage().hasContext(_contextId))
                .map((_contextId) => this.#getBufferedEvents(eventName, _contextId, channel))
                .forEach((events) => result.push(...events));
        }
        return result.sort((e1, e2) => e1.id - e2.id);
    }
}
exports.EventManager = EventManager;
//# sourceMappingURL=EventManager.js.map