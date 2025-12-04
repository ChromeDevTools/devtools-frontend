import '../../../../ui/legacy/components/data_grid/data_grid.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as UI from '../../../../ui/legacy/legacy.js';
export declare const i18nString: (id: string, values?: import("../../../../core/i18n/i18nTypes.js").Values | undefined) => Platform.UIString.LocalizedString;
export interface ViewInput {
    rows: MismatchedPreloadingGridRow[];
    pageURL: string;
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: Record<string, never>, target: HTMLElement) => void;
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
export declare class MismatchedPreloadingGrid extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: typeof DEFAULT_VIEW);
    wasShown(): void;
    set data(data: MismatchedPreloadingGridData);
    performUpdate(): void;
}
