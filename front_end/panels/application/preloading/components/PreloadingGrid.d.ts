import '../../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../../ui/kit/kit.js';
import * as Common from '../../../../core/common/common.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as UI from '../../../../ui/legacy/legacy.js';
export declare const i18nString: (id: string, values?: import("../../../../core/i18n/i18nTypes.js").Values | undefined) => Common.UIString.LocalizedString;
export interface PreloadingGridRow {
    id: string;
    pipeline: SDK.PreloadingModel.PreloadPipeline;
    ruleSets: Protocol.Preload.RuleSet[];
}
export interface ViewInput {
    rows?: PreloadingGridRow[];
    pageURL?: Platform.DevToolsPath.UrlString;
    onSelect?: ({ rowId }: {
        rowId: string;
    }) => void;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const PRELOADING_GRID_DEFAULT_VIEW: View;
/** Grid component to show prerendering attempts. **/
export declare class PreloadingGrid extends UI.Widget.VBox {
    #private;
    constructor(view?: View);
    set rows(rows: PreloadingGridRow[]);
    set pageURL(pageURL: Platform.DevToolsPath.UrlString);
    set onSelect(onSelect: ({ rowId }: {
        rowId: string;
    }) => void);
    performUpdate(): void;
}
export {};
