import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
export declare class EventReferenceClick extends Event {
    event: Trace.Types.Events.Event;
    static readonly eventName = "eventreferenceclick";
    constructor(event: Trace.Types.Events.Event);
}
interface ViewInput {
    text: string;
    event: Trace.Types.Events.Event;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare function eventRef(event: Trace.Types.Events.Event, options?: {
    text?: string;
    title?: string;
}): Lit.TemplateResult;
declare global {
    interface GlobalEventHandlersEventMap {
        [EventReferenceClick.eventName]: EventReferenceClick;
    }
}
export {};
