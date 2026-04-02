import '../../../ui/legacy/components/data_grid/data_grid.js';
import type * as TextUtils from '../../../models/text_utils/text_utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare const i18nString: (id: string, values?: import("../../../core/i18n/i18nTypes.js").Values | undefined) => import("../../../core/platform/UIString.js").LocalizedString;
export interface CrashReportContextGridData {
    entries: Array<{
        key: string;
        value: string;
    }>;
    selectedKey?: string;
    filters?: TextUtils.TextUtils.ParsedFilter[];
}
export interface ViewInput {
    entries: Array<{
        key: string;
        value: string;
    }>;
    selectedKey?: string;
    onSelect: (key: string) => void;
    onContextMenu: (e: Event, key: string, value: string) => void;
}
export declare const DEFAULT_VIEW: (input: ViewInput, output: undefined, target: HTMLElement | ShadowRoot) => void;
type View = (input: ViewInput, output: undefined, target: HTMLElement | ShadowRoot) => void;
export declare class CrashReportContextGrid extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set data(data: CrashReportContextGridData);
    performUpdate(): void;
}
export {};
