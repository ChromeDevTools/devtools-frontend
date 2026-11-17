import '../../ui/components/linkifier/linkifier.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as Trace from '../../models/trace/trace.js';
import type * as Linkifier from '../../ui/components/linkifier/linkifier.js';
import * as UI from '../../ui/legacy/legacy.js';
type SelectorTiming = Trace.Types.Events.SelectorTiming & {
    locations: Linkifier.Linkifier.LinkifierData[] | undefined | null;
};
interface ViewInput {
    timings: SelectorTiming[];
    onContextMenu: (event: CustomEvent<{
        menu: UI.ContextMenu.ContextMenu;
        element: HTMLElement;
    }>) => void;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare class TimelineSelectorStatsView extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, parsedTrace?: Trace.TraceModel.ParsedTrace | null, view?: View);
    set parsedTrace(parsedTrace: Trace.TraceModel.ParsedTrace | null);
    wasShown(): void;
    performUpdate(): void;
    setAggregatedEvents(events: Trace.Types.Events.RecalcStyle[]): void;
}
export {};
