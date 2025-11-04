import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
export declare class EventReferenceClick extends Event {
    event: Trace.Types.Events.Event;
    static readonly eventName = "eventreferenceclick";
    constructor(event: Trace.Types.Events.Event);
}
declare class EventRef extends HTMLElement {
    #private;
    set text(text: string);
    set event(event: Trace.Types.Events.Event);
}
export declare function eventRef(event: Trace.Types.Events.Event, options?: {
    text?: string;
    title?: string;
}): Lit.TemplateResult;
declare class ImageRef extends HTMLElement {
    #private;
    set request(request: Trace.Types.Events.SyntheticNetworkRequest);
}
export declare function imageRef(request: Trace.Types.Events.SyntheticNetworkRequest): Lit.TemplateResult;
declare global {
    interface GlobalEventHandlersEventMap {
        [EventReferenceClick.eventName]: EventReferenceClick;
    }
    interface HTMLElementTagNameMap {
        'devtools-performance-event-ref': EventRef;
        'devtools-performance-image-ref': ImageRef;
    }
}
export {};
