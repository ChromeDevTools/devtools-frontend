// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { BinaryResourceView } from './BinaryResourceView.js';
import { DataGridItem, ResourceChunkView } from './ResourceChunkView.js';
const UIStrings = {
    /**
     * @description Text in Event Source Messages View of the Network panel
     */
    data: 'Data',
    /**
     * @description Text in Messages View of the Network panel
     */
    length: 'Length',
    /**
     * @description Text that refers to the time
     */
    time: 'Time',
    /**
     * @description Text in Messages View of the Network panel
     */
    address: 'Address',
    /**
     * @description Text in Messages View of the Network panel
     */
    port: 'Port',
    /**
     * @description Data grid name for Direct Socket Chunk data grids
     */
    directSocketChunk: 'Direct Socket Chunk',
    /**
     * @description Example for placeholder text. Note: "(direct)?socket)" is an example code and should not be translated.
     */
    filterUsingRegex: 'Filter using regex (example: `(direct)?socket)`',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/ResourceDirectSocketChunkView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ResourceDirectSocketChunkView extends ResourceChunkView {
    constructor(request) {
        super(request, 'network-direct-socket-chunk-filter', 'resource-direct-socket-chunk-split-view-state', i18nString(UIStrings.directSocketChunk), i18nString(UIStrings.filterUsingRegex));
        this.element.setAttribute('jslog', `${VisualLogging.pane('direct-socket-messages').track({ resize: true })}`);
    }
    getRequestChunks() {
        return this.request.directSocketChunks();
    }
    chunkFilter(chunk) {
        if (this.filterType && chunk.type !== this.filterType) {
            return false;
        }
        return !this.filterRegex || this.filterRegex.test(chunk.data);
    }
    createGridItem(chunk) {
        return new ResourceChunkNode(chunk, this.request.directSocketInfo?.type === SDK.NetworkRequest.DirectSocketType.UDP_BOUND);
    }
    wasShown() {
        super.wasShown();
        this.refresh();
        this.request.addEventListener(SDK.NetworkRequest.Events.DIRECTSOCKET_CHUNK_ADDED, this.onDirectSocketChunkAdded, this);
    }
    willHide() {
        super.willHide();
        this.request.removeEventListener(SDK.NetworkRequest.Events.DIRECTSOCKET_CHUNK_ADDED, this.onDirectSocketChunkAdded, this);
    }
    onDirectSocketChunkAdded(event) {
        this.chunkAdded(event.data);
    }
    getColumns() {
        if (this.request.directSocketInfo?.type === SDK.NetworkRequest.DirectSocketType.UDP_BOUND) {
            return [
                {
                    id: 'data',
                    title: i18nString(UIStrings.data),
                    sortable: false,
                    weight: 63,
                },
                {
                    id: 'address',
                    title: i18nString(UIStrings.address),
                    sortable: false,
                    align: "right" /* DataGrid.DataGrid.Align.RIGHT */,
                    weight: 15,
                },
                {
                    id: 'port',
                    title: i18nString(UIStrings.port),
                    sortable: false,
                    align: "right" /* DataGrid.DataGrid.Align.RIGHT */,
                    weight: 10,
                },
                {
                    id: 'length',
                    title: i18nString(UIStrings.length),
                    sortable: false,
                    align: "right" /* DataGrid.DataGrid.Align.RIGHT */,
                    weight: 5,
                },
                {
                    id: 'time',
                    title: i18nString(UIStrings.time),
                    sortable: true,
                    weight: 7,
                },
            ];
        }
        return super.getColumns();
    }
}
class ResourceChunkNode extends DataGridItem {
    #binaryView = null;
    chunk;
    constructor(chunk, boundSocket) {
        const time = new Date(chunk.timestamp * 1000);
        const timeText = ('0' + time.getHours()).substr(-2) + ':' + ('0' + time.getMinutes()).substr(-2) + ':' +
            ('0' + time.getSeconds()).substr(-2) + '.' + ('00' + time.getMilliseconds()).substr(-3);
        const timeNode = document.createElement('div');
        UI.UIUtils.createTextChild(timeNode, timeText);
        UI.Tooltip.Tooltip.install(timeNode, time.toLocaleString());
        let description;
        const length = i18n.ByteUtilities.bytesToString(Platform.StringUtilities.base64ToSize(chunk.data));
        const maxDisplayLen = 30;
        if (chunk.data.length > maxDisplayLen) {
            description = chunk.data.substring(0, maxDisplayLen) + '…';
        }
        else {
            description = chunk.data;
        }
        if (boundSocket) {
            super({ data: description, address: chunk.remoteAddress, port: chunk.remotePort, length, time: timeNode });
        }
        else {
            super({ data: description, length, time: timeNode });
        }
        this.chunk = chunk;
    }
    createCells(element) {
        element.classList.toggle('resource-chunk-view-row-send', this.chunk.type === SDK.NetworkRequest.DirectSocketChunkType.SEND);
        element.classList.toggle('resource-chunk-view-row-receive', this.chunk.type === SDK.NetworkRequest.DirectSocketChunkType.RECEIVE);
        super.createCells(element);
    }
    nodeSelfHeight() {
        return 21;
    }
    dataText() {
        return this.chunk.data;
    }
    binaryView() {
        if (!this.#binaryView) {
            if (this.dataText().length > 0) {
                this.#binaryView = new BinaryResourceView(TextUtils.StreamingContentData.StreamingContentData.from(new TextUtils.ContentData.ContentData(this.dataText(), true, 'application/octet-stream')), Platform.DevToolsPath.EmptyUrlString, Common.ResourceType.resourceTypes.DirectSocket);
            }
        }
        return this.#binaryView;
    }
    getTime() {
        return this.chunk.timestamp;
    }
}
//# sourceMappingURL=ResourceDirectSocketChunkView.js.map