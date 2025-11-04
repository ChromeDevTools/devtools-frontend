import * as SDK from '../../core/sdk/sdk.js';
import { DataGridItem, ResourceChunkView } from './ResourceChunkView.js';
export declare class ResourceWebSocketFrameView extends ResourceChunkView<SDK.NetworkRequest.WebSocketFrame> {
    constructor(request: SDK.NetworkRequest.NetworkRequest);
    getRequestChunks(): SDK.NetworkRequest.WebSocketFrame[];
    createGridItem(frame: SDK.NetworkRequest.WebSocketFrame): DataGridItem;
    chunkFilter(frame: SDK.NetworkRequest.WebSocketFrame): boolean;
    wasShown(): void;
    willHide(): void;
    private onWebSocketFrameAdded;
    static opCodeDescription(opCode: number, mask: boolean): string;
}
