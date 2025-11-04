import * as Common from '../../core/common/common.js';
import * as Trace from '../../models/trace/trace.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { TimelineModeViewDelegate } from './TimelinePanel.js';
import { type TimelineSelection } from './TimelineSelection.js';
import { TimelineTreeView } from './TimelineTreeView.js';
export declare class EventsTimelineTreeView extends TimelineTreeView {
    private readonly filtersControl;
    private readonly delegate;
    private currentTree;
    constructor(delegate: TimelineModeViewDelegate);
    filters(): Trace.Extras.TraceFilter.TraceFilter[];
    updateContents(selection: TimelineSelection): void;
    buildTree(): Trace.Extras.TraceTree.Node;
    private onFilterChanged;
    private selectEvent;
    populateColumns(columns: DataGrid.DataGrid.ColumnDescriptor[]): void;
    populateToolbar(toolbar: UI.Toolbar.Toolbar): void;
    showDetailsForNode(node: Trace.Extras.TraceTree.Node): boolean;
    onHover(node: Trace.Extras.TraceTree.Node | null): void;
}
export declare class Filters extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    private readonly categoryFilter;
    private readonly durationFilter;
    constructor();
    filters(): Trace.Extras.TraceFilter.TraceFilter[];
    populateToolbar(toolbar: UI.Toolbar.Toolbar): void;
    private notifyFiltersChanged;
    private static readonly durationFilterPresetsMs;
}
declare const enum Events {
    FILTER_CHANGED = "FilterChanged"
}
interface EventTypes {
    [Events.FILTER_CHANGED]: void;
}
export {};
