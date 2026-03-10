// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as ProtocolClient from '../core/protocol_client/protocol_client.js';
import * as SDK from '../core/sdk/sdk.js';
import { MockCDPConnection } from './MockCDPConnection.js';
let uniqueTargetId = 0;
export function createTarget({ id, name, type = SDK.Target.Type.FRAME, parentTarget, subtype, url = 'http://example.com', connection, targetManager = SDK.TargetManager.TargetManager.instance(), } = {}) {
    if (!id) {
        if (!uniqueTargetId++) {
            id = 'test';
        }
        else {
            id = ('test' + uniqueTargetId);
        }
    }
    if (!ProtocolClient.ConnectionTransport.ConnectionTransport.getFactory()) {
        // We are not running with `describeWithMockConnection` so create a fresh mock connection.
        // Because child targets inherit the SessionRouter/CDPConnection from the parent, we'll throw if a
        // connection is passed together with a parent target as it would have no effect.
        if (parentTarget && connection) {
            throw new Error('Can\'t create child targets with it\'s own connection. Child targets share the connection with their parent.');
        }
        if (!connection && !parentTarget) {
            connection = new MockCDPConnection([]);
        }
    }
    return targetManager.createTarget(id, name ?? id, type, parentTarget ? parentTarget : null, /* sessionId=*/ parentTarget ? id : undefined, 
    /* suspended=*/ false, connection, { targetId: id, url, subtype });
}
//# sourceMappingURL=TargetHelpers.js.map