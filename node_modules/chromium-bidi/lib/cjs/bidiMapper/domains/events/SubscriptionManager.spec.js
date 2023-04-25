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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon = __importStar(require("sinon"));
const protocol_js_1 = require("../../../protocol/protocol.js");
const browsingContextStorage_js_1 = require("../context/browsingContextStorage.js");
const SubscriptionManager_js_1 = require("./SubscriptionManager.js");
const ALL_EVENTS = protocol_js_1.BrowsingContext.AllEvents;
const SOME_EVENT = protocol_js_1.BrowsingContext.EventNames.LoadEvent;
const ANOTHER_EVENT = protocol_js_1.BrowsingContext.EventNames.ContextCreatedEvent;
const YET_ANOTHER_EVENT = protocol_js_1.BrowsingContext.EventNames.DomContentLoadedEvent;
const SOME_CONTEXT = 'SOME_CONTEXT';
const SOME_NESTED_CONTEXT = 'SOME_NESTED_CONTEXT';
const ANOTHER_CONTEXT = 'ANOTHER_CONTEXT';
const ANOTHER_NESTED_CONTEXT = 'ANOTHER_NESTED_CONTEXT';
const SOME_CHANNEL = 'SOME_CHANNEL';
const ANOTHER_CHANNEL = 'ANOTHER_CHANNEL';
describe('SubscriptionManager', () => {
    let subscriptionManager;
    beforeEach(() => {
        const browsingContextStorage = sinon.createStubInstance(browsingContextStorage_js_1.BrowsingContextStorage);
        browsingContextStorage.findTopLevelContextId = sinon
            .stub()
            .callsFake((contextId) => {
            if (contextId === SOME_NESTED_CONTEXT) {
                return SOME_CONTEXT;
            }
            if (contextId === SOME_CONTEXT) {
                return SOME_CONTEXT;
            }
            if (contextId === ANOTHER_NESTED_CONTEXT) {
                return ANOTHER_CONTEXT;
            }
            if (contextId === ANOTHER_CONTEXT) {
                return ANOTHER_CONTEXT;
            }
            return null;
        });
        subscriptionManager = new SubscriptionManager_js_1.SubscriptionManager(browsingContextStorage);
    });
    it('should subscribe twice to global and specific event in proper order', () => {
        subscriptionManager.subscribe(SOME_EVENT, null, SOME_CHANNEL);
        subscriptionManager.subscribe(SOME_EVENT, null, ANOTHER_CHANNEL);
        subscriptionManager.subscribe(ANOTHER_EVENT, null, ANOTHER_CHANNEL);
        subscriptionManager.subscribe(ALL_EVENTS, null, SOME_CHANNEL);
        subscriptionManager.subscribe(ALL_EVENTS, null, SOME_CHANNEL);
        subscriptionManager.subscribe(YET_ANOTHER_EVENT, null, ANOTHER_CHANNEL);
        // `SOME_EVENT` was fist subscribed in `SOME_CHANNEL`.
        (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([SOME_CHANNEL, ANOTHER_CHANNEL]);
        // `ANOTHER_EVENT` was fist subscribed in `ANOTHER_CHANNEL`.
        (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(ANOTHER_EVENT, SOME_CONTEXT)).to.deep.equal([ANOTHER_CHANNEL, SOME_CHANNEL]);
        // `YET_ANOTHER_EVENT` was first subscribed in `SOME_CHANNEL` via
        // `ALL_EVENTS`.
        (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(YET_ANOTHER_EVENT, SOME_CONTEXT)).to.deep.equal([SOME_CHANNEL, ANOTHER_CHANNEL]);
    });
    describe('with null context', () => {
        it('should send proper event in any context', () => {
            subscriptionManager.subscribe(SOME_EVENT, null, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([SOME_CHANNEL]);
        });
        it('should not send wrong event', () => {
            subscriptionManager.subscribe(SOME_EVENT, null, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(ANOTHER_EVENT, SOME_CONTEXT)).to.deep.equal([]);
        });
        it('should unsubscribe', () => {
            subscriptionManager.subscribe(SOME_EVENT, null, SOME_CHANNEL);
            subscriptionManager.unsubscribe(SOME_EVENT, null, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([]);
        });
        describe('unsubscribe all', () => {
            it('atomicity: does not unsubscribe when there is no subscription', () => {
                subscriptionManager.subscribe(SOME_EVENT, null, SOME_CHANNEL);
                (0, chai_1.expect)(() => subscriptionManager.unsubscribeAll([SOME_EVENT, ANOTHER_EVENT], [null], SOME_CHANNEL)).to.throw('No subscription found');
                (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([SOME_CHANNEL]);
            });
            it('happy path', () => {
                subscriptionManager.subscribe(SOME_EVENT, null, SOME_CHANNEL);
                subscriptionManager.subscribe(ANOTHER_EVENT, null, SOME_CHANNEL);
                subscriptionManager.unsubscribeAll([SOME_EVENT, ANOTHER_EVENT], [null], SOME_CHANNEL);
                (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([]);
                (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(ANOTHER_EVENT, SOME_CONTEXT)).to.deep.equal([]);
            });
        });
        it('should not unsubscribe specific context subscription', () => {
            subscriptionManager.subscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            subscriptionManager.subscribe(SOME_EVENT, null, SOME_CHANNEL);
            subscriptionManager.unsubscribe(SOME_EVENT, null, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([SOME_CHANNEL]);
        });
        it('should subscribe in proper order', () => {
            subscriptionManager.subscribe(SOME_EVENT, null, SOME_CHANNEL);
            subscriptionManager.subscribe(SOME_EVENT, null, ANOTHER_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([SOME_CHANNEL, ANOTHER_CHANNEL]);
        });
        it('should re-subscribe in proper order', () => {
            subscriptionManager.subscribe(SOME_EVENT, null, SOME_CHANNEL);
            subscriptionManager.subscribe(SOME_EVENT, null, ANOTHER_CHANNEL);
            subscriptionManager.unsubscribe(SOME_EVENT, null, SOME_CHANNEL);
            subscriptionManager.subscribe(SOME_EVENT, null, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([ANOTHER_CHANNEL, SOME_CHANNEL]);
        });
        it('should re-subscribe global and specific context in proper order', () => {
            subscriptionManager.subscribe(SOME_EVENT, null, SOME_CHANNEL);
            subscriptionManager.subscribe(SOME_EVENT, null, ANOTHER_CHANNEL);
            subscriptionManager.subscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([SOME_CHANNEL, ANOTHER_CHANNEL]);
        });
    });
    describe('with some context', () => {
        it('should send proper event in proper context', () => {
            subscriptionManager.subscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([SOME_CHANNEL]);
        });
        it('should not send proper event in wrong context', () => {
            subscriptionManager.subscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, ANOTHER_CONTEXT)).to.deep.equal([]);
        });
        it('should not send wrong event in proper context', () => {
            subscriptionManager.subscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(ANOTHER_EVENT, SOME_CONTEXT)).to.deep.equal([]);
        });
        it('should unsubscribe', () => {
            subscriptionManager.subscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            subscriptionManager.unsubscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([]);
        });
        it('should unsubscribe the domain', () => {
            subscriptionManager.subscribe(ALL_EVENTS, SOME_CONTEXT, SOME_CHANNEL);
            subscriptionManager.unsubscribe(ALL_EVENTS, SOME_CONTEXT, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([]);
        });
        it('should not unsubscribe the domain if not subscribed', () => {
            subscriptionManager.subscribe(ALL_EVENTS, SOME_CONTEXT, SOME_CHANNEL);
            subscriptionManager.unsubscribe(ALL_EVENTS, SOME_CONTEXT, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([]);
        });
        it('should not unsubscribe global subscription', () => {
            subscriptionManager.subscribe(SOME_EVENT, null, SOME_CHANNEL);
            subscriptionManager.subscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            subscriptionManager.unsubscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([SOME_CHANNEL]);
        });
        it('should subscribe in proper order', () => {
            subscriptionManager.subscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            subscriptionManager.subscribe(SOME_EVENT, SOME_CONTEXT, ANOTHER_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([SOME_CHANNEL, ANOTHER_CHANNEL]);
        });
        it('should re-subscribe in proper order', () => {
            subscriptionManager.subscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            subscriptionManager.subscribe(SOME_EVENT, SOME_CONTEXT, ANOTHER_CHANNEL);
            subscriptionManager.unsubscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            subscriptionManager.subscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([ANOTHER_CHANNEL, SOME_CHANNEL]);
        });
        it('should re-subscribe global and specific context in proper order', () => {
            subscriptionManager.subscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            subscriptionManager.subscribe(SOME_EVENT, null, ANOTHER_CHANNEL);
            subscriptionManager.subscribe(SOME_EVENT, null, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([SOME_CHANNEL, ANOTHER_CHANNEL]);
        });
    });
    describe('with nested contexts', () => {
        it('should subscribe to top-level context when subscribed to nested context', () => {
            subscriptionManager.subscribe(SOME_EVENT, SOME_NESTED_CONTEXT, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([SOME_CHANNEL]);
        });
        it('should not subscribe to top-level context when subscribed to nested context of another context', () => {
            subscriptionManager.subscribe(SOME_EVENT, ANOTHER_NESTED_CONTEXT, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([]);
        });
        it('should unsubscribe from top-level context when unsubscribed from nested context', () => {
            subscriptionManager.subscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            subscriptionManager.unsubscribe(SOME_EVENT, SOME_NESTED_CONTEXT, SOME_CHANNEL);
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([]);
        });
        it('should not unsubscribe from top-level context when unsubscribed from nested context in different channel', () => {
            subscriptionManager.subscribe(SOME_EVENT, SOME_CONTEXT, SOME_CHANNEL);
            (0, chai_1.expect)(() => {
                subscriptionManager.unsubscribe(SOME_EVENT, SOME_NESTED_CONTEXT, ANOTHER_CHANNEL);
            }).to.throw('No subscription found');
            (0, chai_1.expect)(subscriptionManager.getChannelsSubscribedToEvent(SOME_EVENT, SOME_CONTEXT)).to.deep.equal([SOME_CHANNEL]);
        });
    });
});
describe('cartesian product', () => {
    it('should return empty array for empty array', () => {
        (0, chai_1.expect)((0, SubscriptionManager_js_1.cartesianProduct)([], [])).to.deep.equal([]);
    });
    it('works with a single input', () => {
        (0, chai_1.expect)((0, SubscriptionManager_js_1.cartesianProduct)([1n, 2n])).to.deep.equal([1n, 2n]);
    });
    it('works with multiple inputs', () => {
        (0, chai_1.expect)((0, SubscriptionManager_js_1.cartesianProduct)([1], [2], [3])).to.deep.equal([[1, 2, 3]]);
    });
    it('happy path', () => {
        (0, chai_1.expect)((0, SubscriptionManager_js_1.cartesianProduct)([1, 2], ['A', 'B'])).to.deep.equal([
            [1, 'A'],
            [1, 'B'],
            [2, 'A'],
            [2, 'B'],
        ]);
    });
});
describe('unroll events', () => {
    it('all Browsing Context events', () => {
        (0, chai_1.expect)((0, SubscriptionManager_js_1.unrollEvents)([protocol_js_1.BrowsingContext.AllEvents])).to.deep.equal([
            protocol_js_1.BrowsingContext.EventNames.LoadEvent,
            protocol_js_1.BrowsingContext.EventNames.DomContentLoadedEvent,
            protocol_js_1.BrowsingContext.EventNames.ContextCreatedEvent,
            protocol_js_1.BrowsingContext.EventNames.ContextDestroyedEvent,
        ]);
    });
    it('all CDP events', () => {
        (0, chai_1.expect)((0, SubscriptionManager_js_1.unrollEvents)([protocol_js_1.CDP.AllEvents])).to.deep.equal([
            protocol_js_1.CDP.EventNames.EventReceivedEvent,
        ]);
    });
    it('all Log events', () => {
        (0, chai_1.expect)((0, SubscriptionManager_js_1.unrollEvents)([protocol_js_1.Log.AllEvents])).to.deep.equal([
            protocol_js_1.Log.EventNames.LogEntryAddedEvent,
        ]);
    });
    it('all Network events', () => {
        (0, chai_1.expect)((0, SubscriptionManager_js_1.unrollEvents)([protocol_js_1.Network.AllEvents])).to.deep.equal([
            protocol_js_1.Network.EventNames.BeforeRequestSentEvent,
            protocol_js_1.Network.EventNames.ResponseCompletedEvent,
            protocol_js_1.Network.EventNames.FetchErrorEvent,
        ]);
    });
    it('all Script events', () => {
        (0, chai_1.expect)((0, SubscriptionManager_js_1.unrollEvents)([protocol_js_1.Script.AllEvents])).to.deep.equal([
            protocol_js_1.Script.EventNames.MessageEvent,
        ]);
    });
    it('discrete events', () => {
        (0, chai_1.expect)((0, SubscriptionManager_js_1.unrollEvents)([
            protocol_js_1.CDP.EventNames.EventReceivedEvent,
            protocol_js_1.Log.EventNames.LogEntryAddedEvent,
        ])).to.deep.equal([
            protocol_js_1.CDP.EventNames.EventReceivedEvent,
            protocol_js_1.Log.EventNames.LogEntryAddedEvent,
        ]);
    });
    it('all and discrete events', () => {
        (0, chai_1.expect)((0, SubscriptionManager_js_1.unrollEvents)([
            protocol_js_1.CDP.AllEvents,
            protocol_js_1.CDP.EventNames.EventReceivedEvent,
            protocol_js_1.Log.EventNames.LogEntryAddedEvent,
        ])).to.deep.equal([
            protocol_js_1.CDP.EventNames.EventReceivedEvent,
            protocol_js_1.CDP.EventNames.EventReceivedEvent,
            protocol_js_1.Log.EventNames.LogEntryAddedEvent,
        ]);
    });
});
//# sourceMappingURL=SubscriptionManager.spec.js.map