import type * as Protocol from '../../../../generated/protocol.js';
export declare class RuleSetView {
    readonly ruleSetId: Protocol.Preload.RuleSetId | null;
    constructor(ruleSetId: Protocol.Preload.RuleSetId | null);
}
export declare class AttemptViewWithFilter {
    readonly ruleSetId: Protocol.Preload.RuleSetId | null;
    constructor(ruleSetId: Protocol.Preload.RuleSetId | null);
}
/**
 * Retrieves the HTTP status code for a prefetch attempt by looking up its
 * network request in the network log.
 */
export declare function prefetchStatusCode(requestId: Protocol.Network.RequestId): number | undefined;
