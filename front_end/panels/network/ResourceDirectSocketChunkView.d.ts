import * as SDK from '../../core/sdk/sdk.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as Lit from '../../ui/lit/lit.js';
import { DataGridItem, ResourceChunkView } from './ResourceChunkView.js';
export declare class ResourceDirectSocketChunkView extends ResourceChunkView<SDK.NetworkRequest.DirectSocketChunk> {
    get headerTemplate(): Lit.TemplateResult;
    constructor(request: SDK.NetworkRequest.NetworkRequest);
    getRequestChunks(): SDK.NetworkRequest.DirectSocketChunk[];
    chunkFilter(chunk: SDK.NetworkRequest.DirectSocketChunk): boolean;
    createGridItem(chunk: SDK.NetworkRequest.DirectSocketChunk): DataGridItem;
    wasShown(): void;
    willHide(): void;
    private onDirectSocketChunkAdded;
    getColumns(): DataGrid.DataGrid.ColumnDescriptor[];
}
