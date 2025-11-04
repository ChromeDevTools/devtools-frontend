// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as ProtocolClient from '../core/protocol_client/protocol_client.js';
import { raf } from './DOMHelpers.js';
import { cleanTestDOM } from './DOMHooks.js';
import { deinitializeGlobalVars, initializeGlobalVars } from './EnvironmentHelpers.js';
import { setMockResourceTree } from './ResourceTreeHelpers.js';
// Note that we can't set the Function to the correct handler on the basis
// that we don't know which ProtocolCommand will be stored.
const responseMap = new Map();
const outgoingMessageListenerEntryMap = new Map();
export function setMockConnectionResponseHandler(command, handler) {
    if (responseMap.get(command)) {
        throw new Error(`Response handler already set for ${command}`);
    }
    responseMap.set(command, handler);
}
export function clearMockConnectionResponseHandler(method) {
    responseMap.delete(method);
}
export function clearAllMockConnectionResponseHandlers() {
    responseMap.clear();
}
export function registerListenerOnOutgoingMessage(method) {
    let outgoingMessageListenerEntry = outgoingMessageListenerEntryMap.get(method);
    if (!outgoingMessageListenerEntry) {
        const { resolve, promise } = Promise.withResolvers();
        outgoingMessageListenerEntry = { promise, resolve };
        outgoingMessageListenerEntryMap.set(method, outgoingMessageListenerEntry);
    }
    return outgoingMessageListenerEntry.promise;
}
export function dispatchEvent(target, eventName, ...payload) {
    const event = eventName;
    const [domain] = ProtocolClient.InspectorBackend.splitQualifiedName(event);
    const registeredEvents = ProtocolClient.InspectorBackend.inspectorBackend.getOrCreateEventParameterNamesForDomainForTesting(domain);
    const eventParameterNames = registeredEvents.get(event);
    if (!eventParameterNames) {
        // The event is not registered, fake-register with empty parameters.
        registeredEvents.set(event, []);
    }
    target.dispatch({ method: event, params: payload[0] });
}
async function enable({ reset = true } = {}) {
    if (reset) {
        responseMap.clear();
    }
    // The DevTools frontend code expects certain things to be in place
    // before it can run. This function will ensure those things are
    // minimally there.
    await initializeGlobalVars({ reset });
    setMockResourceTree(true);
    ProtocolClient.ConnectionTransport.ConnectionTransport.setFactory(() => new MockTransport());
}
class MockTransport extends ProtocolClient.ConnectionTransport.ConnectionTransport {
    messageCallback;
    setOnMessage(callback) {
        this.messageCallback = callback;
    }
    sendRawMessage(message) {
        void (async () => {
            const outgoingMessage = JSON.parse(message);
            const entry = outgoingMessageListenerEntryMap.get(outgoingMessage.method);
            if (entry) {
                outgoingMessageListenerEntryMap.delete(outgoingMessage.method);
                entry.resolve();
            }
            const handler = responseMap.get(outgoingMessage.method);
            if (!handler) {
                this.messageCallback?.call(undefined, {
                    id: outgoingMessage.id,
                    sessionId: outgoingMessage.sessionId,
                    error: {
                        message: `Method ${outgoingMessage.method} is not stubbed in MockConnection`,
                        code: ProtocolClient.CDPConnection.CDPErrorStatus.DEVTOOLS_STUB_ERROR,
                    }
                });
                return;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let result = handler.call(undefined, outgoingMessage.params) || {};
            if ('then' in result) {
                result = await result;
            }
            const errorMessage = ('getError' in result) ? result.getError() : undefined;
            const error = errorMessage ? { message: errorMessage, code: -32000 } : undefined;
            this.messageCallback?.call(undefined, {
                id: outgoingMessage.id,
                method: outgoingMessage.method,
                result,
                error,
                sessionId: outgoingMessage.sessionId,
            });
        })();
    }
    setOnDisconnect() {
        // Do nothing
    }
    async disconnect() {
        // Do nothing
    }
}
async function disable() {
    if (outgoingMessageListenerEntryMap.size > 0) {
        throw new Error('MockConnection still has pending listeners. All promises should be awaited.');
    }
    // Some Widgets rely on Global vars to be there so they
    // can properly remove state once they detach.
    cleanTestDOM();
    await raf();
    await deinitializeGlobalVars();
    // @ts-expect-error Setting back to undefined as a hard reset.
    ProtocolClient.ConnectionTransport.ConnectionTransport.setFactory(undefined);
}
export function describeWithMockConnection(title, fn, opts = {
    reset: true,
}) {
    return describe(title, function () {
        beforeEach(async () => await enable(opts));
        fn.call(this);
        afterEach(disable);
    });
}
describeWithMockConnection.only = function (title, fn, opts = {
    reset: true,
}) {
    // eslint-disable-next-line mocha/no-exclusive-tests
    return describe.only(title, function () {
        beforeEach(async () => await enable(opts));
        fn.call(this);
        afterEach(disable);
    });
};
//# sourceMappingURL=MockConnection.js.map