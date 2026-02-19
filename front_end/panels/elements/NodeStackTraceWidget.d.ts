import type * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    stackTrace?: StackTrace.StackTrace.StackTrace;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class NodeStackTraceWidget extends UI.Widget.VBox {
    #private;
    constructor(view?: View);
    wasShown(): void;
    willHide(): void;
    performUpdate(): Promise<void>;
}
export {};
