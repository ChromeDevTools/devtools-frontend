import '../../../../ui/legacy/components/data_grid/data_grid.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import type * as UI from '../../../../ui/legacy/legacy.js';
export declare const i18nString: (id: string, values?: import("../../../../core/i18n/i18nTypes.js").Values | undefined) => Platform.UIString.LocalizedString;
export interface MismatchedPreloadingGridRow {
    action: Protocol.Preload.SpeculationAction;
    url: string;
    status: SDK.PreloadingModel.PreloadingStatus;
}
export interface MismatchedPreloadingGridData {
    pageURL: Platform.DevToolsPath.UrlString;
    rows: MismatchedPreloadingGridRow[];
}
/** Grid component to show prerendering attempts. **/
export declare class MismatchedPreloadingGrid extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {
    #private;
    connectedCallback(): void;
    set data(data: MismatchedPreloadingGridData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-resources-mismatched-preloading-grid': MismatchedPreloadingGrid;
    }
}
