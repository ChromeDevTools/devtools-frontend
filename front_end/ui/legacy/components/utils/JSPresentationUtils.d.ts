import * as StackTrace from '../../../../models/stack_trace/stack_trace.js';
import * as UI from '../../legacy.js';
export interface ViewInput {
    stackTrace?: StackTrace.StackTrace.StackTrace;
    tabStops?: boolean;
    widthConstrained?: boolean;
    showColumnNumber?: boolean;
    expandable?: boolean;
    expanded?: boolean;
    showIgnoreListed?: boolean;
    onExpand: () => void;
    onShowMore: () => void;
    onShowLess: () => void;
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export interface Options {
    tabStops?: boolean;
    widthConstrained?: boolean;
    showColumnNumber?: boolean;
    expandable?: boolean;
}
export declare class StackTracePreviewContent extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    hasContent(): boolean;
    performUpdate(): void;
    get linkElements(): readonly HTMLElement[];
    set options(options: Options);
    set stackTrace(stackTrace: StackTrace.StackTrace.StackTrace);
}
