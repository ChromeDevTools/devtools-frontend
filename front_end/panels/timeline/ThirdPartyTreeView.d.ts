import * as Trace from '../../models/trace/trace.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as TimelineTreeView from './TimelineTreeView.js';
export declare class ThirdPartyTreeViewWidget extends TimelineTreeView.TimelineTreeView {
    #private;
    protected autoSelectFirstChildOnRefresh: boolean;
    constructor(element?: HTMLElement);
    isThirdPartyTreeView(): boolean;
    wasShown(): void;
    set model(model: {
        selectedEvents: Trace.Types.Events.Event[] | null;
        parsedTrace: Trace.TraceModel.ParsedTrace | null;
        entityMapper: Trace.EntityMapper.EntityMapper | null;
    });
    buildTree(): Trace.Extras.TraceTree.Node;
    /**
     * Third party tree view doesn't require the select feature, as this expands the node.
     */
    selectProfileNode(): void;
    private groupingFunction;
    populateColumns(columns: DataGrid.DataGrid.ColumnDescriptor[]): void;
    populateToolbar(): void;
    private compareTransferSize;
    sortingChanged(): void;
    onHover(node: Trace.Extras.TraceTree.Node | null): void;
    onClick(node: Trace.Extras.TraceTree.Node | null): void;
    displayInfoForGroupNode(node: Trace.Extras.TraceTree.Node): {
        name: string;
        color: string;
        icon?: Element;
    };
    nodeIsFirstParty(node: Trace.Extras.TraceTree.Node): boolean;
    nodeIsExtension(node: Trace.Extras.TraceTree.Node): boolean;
    get maxRows(): number | undefined;
    set maxRows(maxRows: number);
    set onRowHovered(callback: (node: Trace.Extras.TraceTree.Node | null, events?: Trace.Types.Events.Event[]) => void);
    set onBottomUpButtonClicked(callback: (node: Trace.Extras.TraceTree.Node | null) => void);
    set onRowClicked(callback: (node: Trace.Extras.TraceTree.Node | null, events?: Trace.Types.Events.Event[]) => void);
}
