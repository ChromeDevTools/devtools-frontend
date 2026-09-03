import '../../../ui/legacy/components/data_grid/data_grid.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as TextUtils from '../../../core/text_utils/text_utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare const i18nString: i18n.LocalizeString;
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
