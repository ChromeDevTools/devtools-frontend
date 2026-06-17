// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Logs from '../../logs/logs.js';
import { isOpaqueOrigin } from '../AiOrigins.js';
import { getRequestContextOrigin } from '../contexts/RequestContext.js';
const UIStringsNotTranslate = {
    listingNetworkRequests: 'Listing network requests',
};
const lockedString = i18n.i18n.lockedString;
/**
 * A tool that lists all network requests recorded by DevTools.
 * Filters the list by the conversation's established origin to prevent cross-origin data exposure.
 */
export class ListNetworkRequestsTool {
    name = "listNetworkRequests" /* ToolName.LIST_NETWORK_REQUESTS */;
    description = 'Gives a list of network requests including URL, status code, and duration.';
    parameters = {
        type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
        description: '',
        nullable: true,
        required: [],
        properties: {},
    };
    displayInfoFromArgs() {
        return {
            title: lockedString(UIStringsNotTranslate.listingNetworkRequests),
            action: 'listNetworkRequests()',
        };
    }
    /**
     * Handles the request to list network requests.
     * Returns requests matching the conversation's established origin, if set.
     */
    async handler(_params, context) {
        const requests = [];
        // A conversation is locked to an origin once the first query is made.
        // We only allow inspecting requests matching the conversation's established origin.
        const origin = context.getEstablishedOrigin();
        // Opaque origins are never allowed to be used as context.
        if (origin && isOpaqueOrigin(origin)) {
            return {
                error: 'Opaque origin not allowed',
            };
        }
        let hasCrossOriginRequest = false;
        const requestsToShow = [];
        for (const request of Logs.NetworkLog.NetworkLog.instance().requests()) {
            // To prevent cross-origin prompt injection attacks, HAR-imported requests
            // are assigned a virtual origin (e.g., `imported-har://${domain}`) rather than
            // sharing the origin of live pages.
            const requestOrigin = getRequestContextOrigin(request);
            // If the conversation is locked to an origin, skip requests from other origins.
            if (origin && requestOrigin !== origin) {
                hasCrossOriginRequest = true;
                continue;
            }
            requests.push({
                id: request.requestId(),
                url: request.url(),
                statusCode: request.statusCode,
                duration: i18n.TimeUtilities.secondsToString(request.duration),
                transferSize: i18n.ByteUtilities.formatBytesToKb(request.transferSize),
            });
            requestsToShow.push(request);
        }
        if (requests.length === 0) {
            return {
                // If there were requests but they were filtered out due to the origin lock,
                // we ask the user to start a new chat so they can select a request from the other origin.
                error: hasCrossOriginRequest ? `No requests showing with origin ${origin}. Tell the user to start a new chat` :
                    'No requests recorded by DevTools',
            };
        }
        return {
            result: JSON.stringify(requests),
            widgets: [{
                    name: 'NETWORK_REQUESTS_LIST',
                    data: {
                        requests: requestsToShow,
                    },
                }],
        };
    }
}
//# sourceMappingURL=ListNetworkRequests.js.map