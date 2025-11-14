import '../../../../ui/components/icon_button/icon_button.js';
import '../../../../ui/components/report_view/report_view.js';
import './PreloadingMismatchedHeadersGrid.js';
import './MismatchedPreloadingGrid.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import type * as UI from '../../../../ui/legacy/legacy.js';
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
/**
 * TODO(kenoss): Rename this class and file once https://crrev.com/c/4933567 landed.
 * This also shows summary of speculations initiated by this page.
 **/
export declare class UsedPreloadingView extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {
    #private;
    set data(data: UsedPreloadingViewData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-resources-used-preloading-view': UsedPreloadingView;
    }
}
