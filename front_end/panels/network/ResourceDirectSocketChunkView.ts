// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {BinaryResourceView} from './BinaryResourceView.js';
import {DataGridItem, defaultHeaderTemplate, ResourceChunkView} from './ResourceChunkView.js';

const {
  html,
} = Lit;

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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/ResourceDirectSocketChunkView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

// clang-format off
function udpBoundHeaderTemplate(): Lit.TemplateResult {
  return html`
    <tr>
      <th id="data" weight="63">${i18nLazyString(UIStrings.data)}</th>
          <th id="address" align="right" weight="15">${i18nLazyString(UIStrings.address)}</th>
          <th id="port" align="right" weight="10">${i18nLazyString(UIStrings.port)}</th>
          <th id="length" align="right" weight="5">${i18nLazyString(UIStrings.length)}</th>
          <th id="time" sortable sort="ascending" weight="7">${i18nLazyString(UIStrings.time)}</th>
    </tr>`;
}
// clang-format on

export class ResourceDirectSocketChunkView extends ResourceChunkView<SDK.NetworkRequest.DirectSocketChunk> {
  override get headerTemplate(): Lit.TemplateResult {
    if (this.request.directSocketInfo?.type === SDK.NetworkRequest.DirectSocketType.UDP_BOUND) {
      return udpBoundHeaderTemplate();
    }
    return defaultHeaderTemplate();
  }

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super(
        request, 'network-direct-socket-chunk-filter', 'resource-direct-socket-chunk-split-view-state',
        i18nString(UIStrings.directSocketChunk), i18nString(UIStrings.filterUsingRegex));
    this.element.setAttribute('jslog', `${VisualLogging.pane('direct-socket-messages').track({resize: true})}`);
  }

  override getRequestChunks(): SDK.NetworkRequest.DirectSocketChunk[] {
    return this.request.directSocketChunks();
  }
  override chunkFilter(chunk: SDK.NetworkRequest.DirectSocketChunk): boolean {
    if (this.filterType && chunk.type !== this.filterType) {
      return false;
    }
    return !this.filterRegex || this.filterRegex.test(chunk.data);
  }

  override createGridItem(chunk: SDK.NetworkRequest.DirectSocketChunk): DataGridItem {
    return new ResourceChunkNode(
        chunk, this.request.directSocketInfo?.type === SDK.NetworkRequest.DirectSocketType.UDP_BOUND);
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
    this.request.addEventListener(
        SDK.NetworkRequest.Events.DIRECTSOCKET_CHUNK_ADDED, this.onDirectSocketChunkAdded, this);
  }

  override willHide(): void {
    super.willHide();
    this.request.removeEventListener(
        SDK.NetworkRequest.Events.DIRECTSOCKET_CHUNK_ADDED, this.onDirectSocketChunkAdded, this);
  }

  private onDirectSocketChunkAdded(event: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.DirectSocketChunk>):
      void {
    this.chunkAdded(event.data);
  }

  override getColumns(): DataGrid.DataGrid.ColumnDescriptor[] {
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
          align: DataGrid.DataGrid.Align.RIGHT,
          weight: 15,
        },
        {
          id: 'port',
          title: i18nString(UIStrings.port),
          sortable: false,
          align: DataGrid.DataGrid.Align.RIGHT,
          weight: 10,
        },
        {
          id: 'length',
          title: i18nString(UIStrings.length),
          sortable: false,
          align: DataGrid.DataGrid.Align.RIGHT,
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
  #binaryView: BinaryResourceView|null = null;
  readonly chunk: SDK.NetworkRequest.DirectSocketChunk;
  override readonly isTextFrame = false;
  override readonly data: Record<string, string|HTMLElement>;
  override readonly cssClass: string;

  constructor(chunk: SDK.NetworkRequest.DirectSocketChunk, boundSocket: boolean) {
    super();

    let description: string;
    const length = i18n.ByteUtilities.bytesToString(Platform.StringUtilities.base64ToSize(chunk.data));
    const maxDisplayLen = 30;
    if (chunk.data.length > maxDisplayLen) {
      description = chunk.data.substring(0, maxDisplayLen) + '…';
    } else {
      description = chunk.data;
    }

    if (boundSocket) {
      this.data = {
        data: description,
        address: chunk.remoteAddress ?? '',
        port: chunk.remotePort?.toString() ?? '',
        length,
      };
    } else {
      this.data = {
        data: description,
        length,
      };
    }

    let cssClass = '';
    if (chunk.type === SDK.NetworkRequest.DirectSocketChunkType.SEND) {
      cssClass = 'resource-chunk-view-row-send';
    } else if (chunk.type === SDK.NetworkRequest.DirectSocketChunkType.RECEIVE) {
      cssClass = 'resource-chunk-view-row-receive';
    }
    this.cssClass = cssClass;
    this.chunk = chunk;
  }

  override dataText(): string {
    return this.chunk.data;
  }

  override binaryView(): BinaryResourceView|null {
    if (!this.#binaryView) {
      if (this.dataText().length > 0) {
        this.#binaryView = new BinaryResourceView(
            TextUtils.StreamingContentData.StreamingContentData.from(
                new TextUtils.ContentData.ContentData(this.dataText(), true, 'application/octet-stream')),
            Platform.DevToolsPath.EmptyUrlString, Common.ResourceType.resourceTypes.DirectSocket);
      }
    }
    return this.#binaryView;
  }

  override getTime(): number {
    return this.chunk.timestamp;
  }
}
