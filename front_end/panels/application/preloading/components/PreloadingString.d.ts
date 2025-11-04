import type * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
export declare const PrefetchReasonDescription: Record<string, {
    name: () => Platform.UIString.LocalizedString;
}>;
/** Decoding PrefetchFinalStatus prefetchAttempt to failure description. **/
export declare function prefetchFailureReason({ prefetchStatus }: SDK.PreloadingModel.PrefetchAttempt): string | null;
/** Detailed failure reason for PrerenderFinalStatus. **/
export declare function prerenderFailureReason(attempt: SDK.PreloadingModel.PrerenderAttempt | SDK.PreloadingModel.PrerenderUntilScriptAttempt): string | null;
export declare function ruleSetLocationShort(ruleSet: Protocol.Preload.RuleSet, pageURL: Platform.DevToolsPath.UrlString): string;
export declare function ruleSetTagOrLocationShort(ruleSet: Protocol.Preload.RuleSet, pageURL: Platform.DevToolsPath.UrlString): string;
export declare function capitalizedAction(action: Protocol.Preload.SpeculationAction): Common.UIString.LocalizedString;
export declare function sortOrder(attempt: SDK.PreloadingModel.PreloadingAttempt): number;
export declare function status(status: SDK.PreloadingModel.PreloadingStatus): string;
export declare function composedStatus(attempt: SDK.PreloadingModel.PreloadingAttempt): string;
