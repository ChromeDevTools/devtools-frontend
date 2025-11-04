import * as Common from '../../core/common/common.js';
import * as Trace from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as TimelineComponents from './components/components.js';
import { type TimelineEventOverview } from './TimelineEventOverview.js';
export interface OverviewData {
    parsedTrace: Trace.TraceModel.ParsedTrace;
    isCpuProfile?: boolean;
    settings: {
        showScreenshots: boolean;
        showMemory: boolean;
    };
}
declare const TimelineMiniMap_base: (new (...args: any[]) => {
    addEventListener<T extends keyof PerfUI.TimelineOverviewPane.EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<PerfUI.TimelineOverviewPane.EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<PerfUI.TimelineOverviewPane.EventTypes, T>;
    once<T extends keyof PerfUI.TimelineOverviewPane.EventTypes>(eventType: T): Promise<PerfUI.TimelineOverviewPane.EventTypes[T]>;
    removeEventListener<T extends keyof PerfUI.TimelineOverviewPane.EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<PerfUI.TimelineOverviewPane.EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: keyof PerfUI.TimelineOverviewPane.EventTypes): boolean;
    dispatchEventToListeners<T extends keyof PerfUI.TimelineOverviewPane.EventTypes>(eventType: import("../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<PerfUI.TimelineOverviewPane.EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
/**
 * This component wraps the generic PerfUI Overview component and configures it
 * specifically for the Performance Panel, including injecting the CSS we use
 * to customize how the components render within the Performance Panel.
 *
 * It is also responsible for listening to events from the OverviewPane to
 * update the visible trace window, and when this happens it will update the
 * TraceBounds service with the new values.
 */
export declare class TimelineMiniMap extends TimelineMiniMap_base {
    #private;
    breadcrumbs: TimelineComponents.Breadcrumbs.Breadcrumbs | null;
    constructor();
    addBreadcrumb({ startTime, endTime }: PerfUI.TimelineOverviewPane.OverviewPaneBreadcrumbAddedEvent): void;
    highlightBounds(bounds: Trace.Types.Timing.TraceWindowMicro, withBracket?: boolean): void;
    clearBoundsHighlight(): void;
    reset(): void;
    getControls(): TimelineEventOverview[];
    setData(data: OverviewData | null): void;
}
export {};
