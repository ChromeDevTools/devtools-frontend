import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
export declare class RuleSetView {
    readonly ruleSetId: Protocol.Preload.RuleSetId | null;
    constructor(ruleSetId: Protocol.Preload.RuleSetId | null);
}
export declare class AttemptViewWithFilter {
    readonly ruleSetId: Protocol.Preload.RuleSetId | null;
    constructor(ruleSetId: Protocol.Preload.RuleSetId | null);
}
/**
 * Retrieves the HTTP status code for a preloading attempt.
 */
export declare function preloadStatusCode(attempt: SDK.PreloadingModel.PreloadingAttempt): number | undefined;
