import * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
export interface ViewInput {
    event: Trace.Types.Events.SyntheticLayoutShift | Trace.Types.Events.SyntheticLayoutShiftCluster | null;
    parsedTrace: Trace.TraceModel.ParsedTrace | null;
    isFreshRecording: boolean;
    togglePopover: (e: MouseEvent) => void;
    onEventClick: (event: Trace.Types.Events.Event) => void;
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare class LayoutShiftDetails extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set event(event: Trace.Types.Events.SyntheticLayoutShift | Trace.Types.Events.SyntheticLayoutShiftCluster);
    set parsedTrace(parsedTrace: Trace.TraceModel.ParsedTrace | null);
    set isFreshRecording(isFreshRecording: boolean);
    performUpdate(): Promise<void> | void;
}
export declare const DEFAULT_VIEW: View;
