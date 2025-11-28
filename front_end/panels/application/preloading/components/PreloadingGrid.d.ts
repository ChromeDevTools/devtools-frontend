import '../../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../../ui/kit/kit.js';
import * as Common from '../../../../core/common/common.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import type * as UI from '../../../../ui/legacy/legacy.js';
export declare const i18nString: (id: string, values?: import("../../../../core/i18n/i18nTypes.js").Values | undefined) => Common.UIString.LocalizedString;
export interface PreloadingGridData {
    rows: PreloadingGridRow[];
    pageURL: Platform.DevToolsPath.UrlString;
}
export interface PreloadingGridRow {
    id: string;
    pipeline: SDK.PreloadingModel.PreloadPipeline;
    ruleSets: Protocol.Preload.RuleSet[];
}
/** Grid component to show prerendering attempts. **/
export declare class PreloadingGrid extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {
    #private;
    connectedCallback(): void;
    update(data: PreloadingGridData): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-resources-preloading-grid': PreloadingGrid;
    }
}
