import '../../ui/legacy/legacy.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface FrameContextData {
    url: string;
    frameId: string;
    displayName: string;
    entries: Protocol.CrashReportContext.CrashReportContextEntry[];
}
interface ViewInput {
    frames: FrameContextData[];
    selectedKey: string | null;
    onRowSelected: (key: string) => void;
    onRefresh: () => void;
    onFilterChanged: (e: CustomEvent<string>) => void;
    filters: TextUtils.TextUtils.ParsedFilter[];
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: (input: ViewInput, _output: undefined, target: HTMLElement) => void;
export declare class CrashReportContextView extends UI.Widget.VBox {
    #private;
    private selectedKey;
    constructor(view?: View);
    performUpdate(): Promise<void>;
}
export {};
