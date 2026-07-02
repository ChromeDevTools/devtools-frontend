// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as ProtocolClient from '../core/protocol_client/protocol_client.js';
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
//# sourceMappingURL=MockConnection.js.map