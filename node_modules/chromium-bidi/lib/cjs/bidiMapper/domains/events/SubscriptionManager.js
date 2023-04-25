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
exports.SubscriptionManager = exports.unrollEvents = exports.cartesianProduct = void 0;
const protocol_js_1 = require("../../../protocol/protocol.js");
/**
 * Returns the cartesian product of the given arrays.
 *
 * Example:
 *   cartesian([1, 2], ['a', 'b']); => [[1, 'a'], [1, 'b'], [2, 'a'], [2, 'b']]
 */
function cartesianProduct(...a) {
    return a.reduce((a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())));
}
exports.cartesianProduct = cartesianProduct;
/** Expands "AllEvents" events into atomic events. */
function unrollEvents(events) {
    const allEvents = [];
    for (const event of events) {
        switch (event) {
            case protocol_js_1.BrowsingContext.AllEvents:
                allEvents.push(...Object.values(protocol_js_1.BrowsingContext.EventNames));
                break;
            case protocol_js_1.CDP.AllEvents:
                allEvents.push(...Object.values(protocol_js_1.CDP.EventNames));
                break;
            case protocol_js_1.Log.AllEvents:
                allEvents.push(...Object.values(protocol_js_1.Log.EventNames));
                break;
            case protocol_js_1.Network.AllEvents:
                allEvents.push(...Object.values(protocol_js_1.Network.EventNames));
                break;
            case protocol_js_1.Script.AllEvents:
                allEvents.push(...Object.values(protocol_js_1.Script.EventNames));
                break;
            default:
                allEvents.push(event);
        }
    }
    return allEvents;
}
exports.unrollEvents = unrollEvents;
class SubscriptionManager {
    #subscriptionPriority = 0;
    // BrowsingContext `null` means the event has subscription across all the
    // browsing contexts.
    // Channel `null` means no `channel` should be added.
    #channelToContextToEventMap = new Map();
    #browsingContextStorage;
    constructor(browsingContextStorage) {
        this.#browsingContextStorage = browsingContextStorage;
    }
    getChannelsSubscribedToEvent(eventMethod, contextId) {
        const prioritiesAndChannels = Array.from(this.#channelToContextToEventMap.keys())
            .map((channel) => ({
            priority: this.#getEventSubscriptionPriorityForChannel(eventMethod, contextId, channel),
            channel,
        }))
            .filter(({ priority }) => priority !== null);
        // Sort channels by priority.
        return prioritiesAndChannels
            .sort((a, b) => a.priority - b.priority)
            .map(({ channel }) => channel);
    }
    #getEventSubscriptionPriorityForChannel(eventMethod, contextId, channel) {
        const contextToEventMap = this.#channelToContextToEventMap.get(channel);
        if (contextToEventMap === undefined) {
            return null;
        }
        const maybeTopLevelContextId = this.#browsingContextStorage.findTopLevelContextId(contextId);
        // `null` covers global subscription.
        const relevantContexts = [...new Set([null, maybeTopLevelContextId])];
        // Get all the subscription priorities.
        const priorities = relevantContexts
            .map((c) => contextToEventMap.get(c)?.get(eventMethod))
            .filter((p) => p !== undefined);
        if (priorities.length === 0) {
            // Not subscribed, return null.
            return null;
        }
        // Return minimal priority.
        return Math.min(...priorities);
    }
    subscribe(event, contextId, channel) {
        // All the subscriptions are handled on the top-level contexts.
        contextId = this.#browsingContextStorage.findTopLevelContextId(contextId);
        if (event === protocol_js_1.BrowsingContext.AllEvents) {
            Object.values(protocol_js_1.BrowsingContext.EventNames).map((specificEvent) => this.subscribe(specificEvent, contextId, channel));
            return;
        }
        if (event === protocol_js_1.CDP.AllEvents) {
            Object.values(protocol_js_1.CDP.EventNames).map((specificEvent) => this.subscribe(specificEvent, contextId, channel));
            return;
        }
        if (event === protocol_js_1.Log.AllEvents) {
            Object.values(protocol_js_1.Log.EventNames).map((specificEvent) => this.subscribe(specificEvent, contextId, channel));
            return;
        }
        if (event === protocol_js_1.Network.AllEvents) {
            Object.values(protocol_js_1.Network.EventNames).map((specificEvent) => this.subscribe(specificEvent, contextId, channel));
            return;
        }
        if (event === protocol_js_1.Script.AllEvents) {
            Object.values(protocol_js_1.Script.EventNames).map((specificEvent) => this.subscribe(specificEvent, contextId, channel));
            return;
        }
        if (!this.#channelToContextToEventMap.has(channel)) {
            this.#channelToContextToEventMap.set(channel, new Map());
        }
        const contextToEventMap = this.#channelToContextToEventMap.get(channel);
        if (!contextToEventMap.has(contextId)) {
            contextToEventMap.set(contextId, new Map());
        }
        const eventMap = contextToEventMap.get(contextId);
        // Do not re-subscribe to events to keep the priority.
        if (eventMap.has(event)) {
            return;
        }
        eventMap.set(event, this.#subscriptionPriority++);
    }
    /**
     * Unsubscribes atomically from all events in the given contexts and channel.
     */
    unsubscribeAll(events, contextIds, channel) {
        // Assert all contexts are known.
        for (const contextId of contextIds) {
            if (contextId !== null) {
                this.#browsingContextStorage.getContext(contextId);
            }
        }
        const eventContextPairs = cartesianProduct(unrollEvents(events), contextIds);
        // Assert all unsubscriptions are valid.
        // If any of the unsubscriptions are invalid, do not unsubscribe from anything.
        eventContextPairs
            .map(([event, contextId]) => this.#checkUnsubscribe(event, contextId, channel))
            .forEach((unsubscribe) => unsubscribe());
    }
    /**
     * Unsubscribes from the event in the given context and channel.
     * Syntactic sugar for "unsubscribeAll".
     */
    unsubscribe(eventName, contextId, channel) {
        this.unsubscribeAll([eventName], [contextId], channel);
    }
    #checkUnsubscribe(event, contextId, channel) {
        // All the subscriptions are handled on the top-level contexts.
        contextId = this.#browsingContextStorage.findTopLevelContextId(contextId);
        if (!this.#channelToContextToEventMap.has(channel)) {
            throw new protocol_js_1.Message.InvalidArgumentException(`Cannot unsubscribe from ${event}, ${contextId === null ? 'null' : contextId}. No subscription found.`);
        }
        const contextToEventMap = this.#channelToContextToEventMap.get(channel);
        if (!contextToEventMap.has(contextId)) {
            throw new protocol_js_1.Message.InvalidArgumentException(`Cannot unsubscribe from ${event}, ${contextId === null ? 'null' : contextId}. No subscription found.`);
        }
        const eventMap = contextToEventMap.get(contextId);
        if (!eventMap.has(event)) {
            throw new protocol_js_1.Message.InvalidArgumentException(`Cannot unsubscribe from ${event}, ${contextId === null ? 'null' : contextId}. No subscription found.`);
        }
        return () => {
            eventMap.delete(event);
            // Clean up maps if empty.
            if (eventMap.size === 0) {
                contextToEventMap.delete(event);
            }
            if (contextToEventMap.size === 0) {
                this.#channelToContextToEventMap.delete(channel);
            }
        };
    }
}
exports.SubscriptionManager = SubscriptionManager;
//# sourceMappingURL=SubscriptionManager.js.map