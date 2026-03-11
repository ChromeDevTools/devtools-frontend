import type * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
export interface ActiveInsight {
    model: Trace.Insights.Types.InsightModel;
    insightSetKey: string;
}
export declare class RemoveAnnotation extends Event {
    removedAnnotation: Trace.Types.File.Annotation;
    static readonly eventName = "removeannotation";
    constructor(removedAnnotation: Trace.Types.File.Annotation);
}
export declare class RevealAnnotation extends Event {
    annotation: Trace.Types.File.Annotation;
    static readonly eventName = "revealannotation";
    constructor(annotation: Trace.Types.File.Annotation);
}
export declare class HoverAnnotation extends Event {
    annotation: Trace.Types.File.Annotation;
    static readonly eventName = "hoverannotation";
    constructor(annotation: Trace.Types.File.Annotation);
}
export declare class AnnotationHoverOut extends Event {
    static readonly eventName = "annotationhoverout";
    constructor();
}
declare global {
    interface GlobalEventHandlersEventMap {
        [RevealAnnotation.eventName]: RevealAnnotation;
        [HoverAnnotation.eventName]: HoverAnnotation;
        [AnnotationHoverOut.eventName]: AnnotationHoverOut;
    }
}
export declare const enum SidebarTabs {
    INSIGHTS = "insights",
    ANNOTATIONS = "annotations"
}
export declare const DEFAULT_SIDEBAR_TAB = SidebarTabs.INSIGHTS;
export declare const DEFAULT_SIDEBAR_WIDTH_PX = 240;
export declare class SidebarWidget extends UI.Widget.VBox {
    #private;
    constructor();
    wasShown(): void;
    willHide(): void;
    setAnnotations(updatedAnnotations: Trace.Types.File.Annotation[], annotationEntryToColorMap: Map<Trace.Types.Events.Event, string>): void;
    setParsedTrace(parsedTrace: Trace.TraceModel.ParsedTrace | null): void;
    setActiveInsight(activeInsight: ActiveInsight | null, opts: {
        highlight: boolean;
    }): void;
    openInsightsTab(): void;
    setActiveInsightSet(insightSetKey: string): void;
    /**
     * True if the sidebar has been visible at least one time. This is persisted
     * to the user settings so it persists across sessions. This is used because
     * we do not force the RPP sidebar open by default; if a user has seen it &
     * then closed it, we will not re-open it automatically. But if a user
     * has never seen it, we want them to see it once to know it exists.
     */
    sidebarHasBeenOpened(): boolean;
}
