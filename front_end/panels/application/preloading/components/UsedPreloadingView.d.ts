import '../../../../ui/kit/kit.js';
import '../../../../ui/components/report_view/report_view.js';
import './MismatchedPreloadingGrid.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import { type MismatchedPreloadingGridData } from './MismatchedPreloadingGrid.js';
export interface UsedPreloadingViewData {
    pageURL: Platform.DevToolsPath.UrlString;
    previousAttempts: SDK.PreloadingModel.PreloadingAttempt[];
    currentAttempts: SDK.PreloadingModel.PreloadingAttempt[];
}
export declare const enum UsedKind {
    DOWNGRADED_PRERENDER_TO_PREFETCH_AND_USED = "DowngradedPrerenderToPrefetchAndUsed",
    PREFETCH_USED = "PrefetchUsed",
    PRERENDER_USED = "PrerenderUsed",
    PREFETCH_FAILED = "PrefetchFailed",
    PRERENDER_FAILED = "PrerenderFailed",
    NO_PRELOADS = "NoPreloads"
}
type Badge = {
    type: 'success';
    count?: number;
} | {
    type: 'failure';
    count?: number;
} | {
    type: 'neutral';
    message: string;
};
interface MismatchedData {
    pageURL: Platform.DevToolsPath.UrlString;
    rows: MismatchedPreloadingGridData['rows'];
}
type AttemptWithMismatchedHeaders = SDK.PreloadingModel.PrerenderAttempt | SDK.PreloadingModel.PrerenderUntilScriptAttempt;
interface SpeculativeLoadingStatusForThisPageData {
    kind: UsedKind;
    prefetch: SDK.PreloadingModel.PreloadingAttempt | undefined;
    prerenderLike: SDK.PreloadingModel.PreloadingAttempt | undefined;
    mismatchedData: MismatchedData | undefined;
    attemptWithMismatchedHeaders: AttemptWithMismatchedHeaders | undefined;
}
interface SpeculationsInitiatedByThisPageSummaryData {
    badges: Badge[];
    revealRuleSetView: () => void;
    revealAttemptViewWithFilter: () => void;
}
interface ViewInput {
    speculativeLoadingStatusData: SpeculativeLoadingStatusForThisPageData;
    speculationsInitiatedSummaryData: SpeculationsInitiatedByThisPageSummaryData;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement | ShadowRoot) => void;
/**
 * TODO(kenoss): Rename this class and file once https://crrev.com/c/4933567 landed.
 * This also shows summary of speculations initiated by this page.
 **/
export declare class UsedPreloadingView extends UI.Widget.VBox {
    #private;
    constructor(view?: View);
    set data(data: UsedPreloadingViewData);
    performUpdate(): void;
}
export {};
