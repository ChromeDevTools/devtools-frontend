import * as StackTrace from '../../../../models/stack_trace/stack_trace.js';
import * as UI from '../../legacy.js';
export interface Options {
    tabStops?: boolean;
    widthConstrained?: boolean;
    showColumnNumber?: boolean;
    expandable?: boolean;
}
export declare class StackTracePreviewContent extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement);
    hasContent(): boolean;
    performUpdate(): void;
    get linkElements(): readonly HTMLElement[];
    set options(options: Options);
    set stackTrace(stackTrace: StackTrace.StackTrace.StackTrace);
}
