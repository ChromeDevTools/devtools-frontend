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
    #handlers;
    constructor(handlers) {
        this.#handlers = new Map(handlers);
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
    observe(observer) {
        this.#observers.add(observer);
    }
    unobserve(observer) {
        this.#observers.delete(observer);
    }
}
//# sourceMappingURL=MockCDPConnection.js.map