// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Logs from '../../../../models/logs/logs.js';
export class RuleSetView {
    ruleSetId;
    constructor(ruleSetId) {
        this.ruleSetId = ruleSetId;
    }
}
export class AttemptViewWithFilter {
    ruleSetId;
    constructor(ruleSetId) {
        this.ruleSetId = ruleSetId;
    }
}
/**
 * Retrieves the HTTP status code for a preloading attempt.
 */
export function preloadStatusCode(attempt) {
    switch (attempt.action) {
        case "Prefetch" /* Protocol.Preload.SpeculationAction.Prefetch */:
            return prefetchStatusCode(attempt.requestId);
        case "Prerender" /* Protocol.Preload.SpeculationAction.Prerender */:
        case "PrerenderUntilScript" /* Protocol.Preload.SpeculationAction.PrerenderUntilScript */:
            return prerenderStatusCode(attempt.key.loaderId);
    }
    return undefined;
}
/**
 * Retrieves the HTTP status code for a prefetch attempt by looking up its
 * network request in the network log.
 */
function prefetchStatusCode(requestId) {
    const networkLog = Logs.NetworkLog.NetworkLog.instance();
    const requests = networkLog.requestsForId(requestId);
    if (requests.length > 0) {
        return requests[requests.length - 1].statusCode;
    }
    return undefined;
}
/**
 * Retrieves the HTTP status code for a prerender attempt.
 */
function prerenderStatusCode(loaderId) {
    const frame = SDK.ResourceTreeModel.ResourceTreeModel.frames().find(f => f.loaderId === loaderId);
    if (!frame) {
        return undefined;
    }
    const networkManager = frame.resourceTreeModel().target().model(SDK.NetworkManager.NetworkManager);
    const request = networkManager?.requestForLoaderId(loaderId);
    return request?.statusCode === 0 ? undefined : request?.statusCode;
}
//# sourceMappingURL=PreloadingForward.js.map