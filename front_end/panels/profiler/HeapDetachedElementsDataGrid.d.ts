import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
export declare class HeapDetachedElementsDataGrid extends DataGrid.DataGrid.DataGridImpl<unknown> {
    constructor();
}
export declare class HeapDetachedElementsDataGridNode extends DataGrid.DataGrid.DataGridNode<unknown> {
    #private;
    private detachedElementInfo;
    domModel: SDK.DOMModel.DOMModel;
    retainedNodeIds: Set<number>;
    constructor(detachedElementInfo: Protocol.DOM.DetachedElementInfo, domModel: SDK.DOMModel.DOMModel);
    createCell(columnId: string): HTMLElement;
}
