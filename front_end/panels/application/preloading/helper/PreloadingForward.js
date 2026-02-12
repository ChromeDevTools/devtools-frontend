// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
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
 * Retrieves the HTTP status code for a prefetch attempt by looking up its
 * network request in the network log.
 */
export function prefetchStatusCode(requestId) {
    const networkLog = Logs.NetworkLog.NetworkLog.instance();
    const requests = networkLog.requestsForId(requestId);
    if (requests.length > 0) {
        return requests[requests.length - 1].statusCode;
    }
    return undefined;
}
//# sourceMappingURL=PreloadingForward.js.map