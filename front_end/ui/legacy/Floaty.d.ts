import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Trace from '../../models/trace/trace.js';
import { Widget } from './Widget.js';
export declare const enum FloatyContextTypes {
    ELEMENT_NODE_ID = "ELEMENT_NODE_ID",
    NETWORK_REQUEST = "NETWORK_REQUEST",
    PERFORMANCE_EVENT = "PERFORMANCE_EVENT",
    PERFORMANCE_INSIGHT = "PERFORMANCE_INSIGHT"
}
export type FloatyContextSelection = SDK.DOMModel.DOMNode | SDK.NetworkRequest.NetworkRequest | {
    event: Trace.Types.Events.Event;
    traceStartTime: Trace.Types.Timing.Micro;
} | {
    insight: Trace.Insights.Types.InsightModel;
    trace: Trace.TraceModel.ParsedTrace;
};
declare const enum State {
    READONLY = "readonly",
    INSPECT_MODE = "inspect"
}
export declare class FloatyFlavor {
    selectedContexts: FloatyContextSelection[];
    constructor(contexts: Set<FloatyContextSelection>);
}
export declare class Floaty {
    #private;
    static defaultVisibility: boolean;
    static exists(): boolean;
    static instance(opts?: {
        forceNew: boolean | null;
        document: Document | null;
    }): Floaty;
    private constructor();
    setDevToolsRect(rect: DOMRect): void;
    open(): void;
    registerClick(input: Readonly<FloatyClickInput>): void;
    inInspectMode(): boolean;
    deleteContext(context: FloatyContextSelection): void;
}
type FloatyClickInput = {
    type: FloatyContextTypes.ELEMENT_NODE_ID;
    data: {
        nodeId: Protocol.DOM.NodeId;
    };
} | {
    type: FloatyContextTypes.NETWORK_REQUEST;
    data: {
        requestId: string;
    };
} | {
    type: FloatyContextTypes.PERFORMANCE_EVENT;
    data: {
        event: Trace.Types.Events.Event;
        traceStartTime: Trace.Types.Timing.Micro;
    };
} | {
    type: FloatyContextTypes.PERFORMANCE_INSIGHT;
    data: {
        insight: Trace.Insights.Types.InsightModel;
        trace: Trace.TraceModel.ParsedTrace;
    };
};
export declare function onFloatyOpen(): void;
export declare function onFloatyContextDelete(context: FloatyContextSelection): void;
/**
 * Registers a click to the Floaty.
 * @returns true if the element was added to the floaty context, and false
 * otherwise. This lets callers determine if this should override the default
 * click behaviour.
 */
export declare function onFloatyClick(input: FloatyClickInput): boolean;
export declare class FloatyUI extends Widget {
    #private;
    constructor(element?: HTMLElement, view?: (input: ViewInput, _output: null, target: HTMLElement) => void);
    get devtoolsRect(): DOMRect | null;
    get state(): State;
    set state(x: State);
    set devtoolsRect(rect: DOMRect);
    addSelectedContext(context: FloatyContextSelection): void;
    removeSelectedContext(context: FloatyContextSelection): void;
    get open(): boolean;
    set open(open: boolean);
    wasShown(): void;
    performUpdate(): void;
}
interface ViewInput {
    onDragStart: (event: MouseEvent) => void;
    selectedContexts: ReadonlySet<FloatyContextSelection>;
    open: boolean;
    state: State;
    onInspectClick: () => void;
    onDialogClose: (e: PointerEvent) => void;
    onContextDelete: (item: FloatyContextSelection) => (e: MouseEvent) => void;
}
export {};
