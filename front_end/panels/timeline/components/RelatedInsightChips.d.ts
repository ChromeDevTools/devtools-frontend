import type * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
export interface RelatedInsight {
    insightLabel: string;
    messages: string[];
    activateInsight: () => void;
}
export type EventToRelatedInsightsMap = Map<Trace.Types.Events.Event, RelatedInsight[]>;
export interface ViewInput {
    activeEvent: Trace.Types.Events.Event | null;
    eventToInsightsMap: EventToRelatedInsightsMap;
    onInsightClick: (insight: RelatedInsight) => void;
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export interface Data {
    eventToRelatedInsightsMap: EventToRelatedInsightsMap | null;
    activeEvent: Trace.Types.Events.Event | null;
}
export declare class RelatedInsightChips extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set activeEvent(event: Trace.Types.Events.Event | null);
    set eventToInsightsMap(map: EventToRelatedInsightsMap | null);
    performUpdate(): Promise<void> | void;
}
export declare const DEFAULT_VIEW: View;
