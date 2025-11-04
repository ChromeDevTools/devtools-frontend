import '../../../../ui/legacy/components/data_grid/data_grid.js';
import type * as SDK from '../../../../core/sdk/sdk.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import type * as UI from '../../../../ui/legacy/legacy.js';
export declare const i18nString: (id: string, values?: import("../../../../core/i18n/i18nTypes.js").Values | undefined) => import("../../../../core/platform/UIString.js").LocalizedString;
export declare class PreloadingMismatchedHeadersGrid extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {
    #private;
    connectedCallback(): void;
    set data(data: SDK.PreloadingModel.PrerenderAttempt | SDK.PreloadingModel.PrerenderUntilScriptAttempt);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-resources-preloading-mismatched-headers-grid': PreloadingMismatchedHeadersGrid;
    }
}
