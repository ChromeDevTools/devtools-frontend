// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as ProtocolClient from '../core/protocol_client/protocol_client.js';
/**
 * This class fulfills a similar role as `describeWithMockConnection` with the main difference
 * being that it doesn't operate global.
 *
 * The right usage is to create a `MockCDPConnection` instance with your handlers, and then pass
 * it along to {@link createTarget}.
 *
 * This means a `MockCDPConnection` only affects the targets explicitly created with it and doesn't
 * leak anywhere else.
 */
export class MockCDPConnection {
    #observers = new Set();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    #handlers;
    constructor(handlers = []) {
        this.#handlers = new Map(handlers);
    }
    /**
     * Sets the provided handler or clears an existing handler when passing `null`.
     *
     * Throws if a set would overwrite an existing handler.
     *
     * If the handler only ever returns a success result, consider using {@link setSuccessHandler}.
     * If the handler only ever returns a failure, consider using {@link setFailureHandler}.
     */
    setHandler(method, handler) {
        if (handler && this.#handlers.has(method)) {
            throw new Error(`MockCDPConnection already has a handler for ${method}`);
        }
        if (handler) {
            this.#handlers.set(method, handler);
        }
        else {
            this.#handlers.delete(method);
        }
    }
    /**
     * A more ergonomic version of {@link setHandler} for handlers that only return
     * a successful result.
     */
    setSuccessHandler(method, handler) {
        const wrappedHandler = (params, sessionId) => {
            const result = handler(params, sessionId);
            if (result && typeof result === 'object' && 'then' in result) {
                return result.then(result => ({ result }));
            }
            return { result };
        };
        this.setHandler(method, wrappedHandler);
    }
    /**
     * A more ergonomic version of {@link setHandler} for handlers that only return
     * a failure.
     */
    setFailureHandler(method, handler) {
        const wrappedHandler = (params, sessionId) => {
            const error = handler(params, sessionId);
            if (error && typeof error === 'object' && 'then' in error) {
                return error.then(error => ({ error }));
            }
            return { error };
        };
        this.setHandler(method, wrappedHandler);
    }
    send(method, params, sessionId) {
        const handler = this.#handlers.get(method);
        if (!handler) {
            return Promise.resolve({
                error: {
                    message: `Method ${method} is not stubbed in MockCDPConnection`,
                    code: ProtocolClient.CDPConnection.CDPErrorStatus.DEVTOOLS_STUB_ERROR,
                }
            });
        }
        return Promise.resolve(handler(params, sessionId));
    }
    dispatchEvent(event, params, sessionId) {
        this.#observers.forEach(observer => observer.onEvent({
            sessionId,
            method: event,
            params,
        }));
    }
    observe(observer) {
        this.#observers.add(observer);
    }
    unobserve(observer) {
        this.#observers.delete(observer);
    }
}
//# sourceMappingURL=MockCDPConnection.js.map