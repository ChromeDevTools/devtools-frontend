// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Geometry from '../../ui/geometry/geometry.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Network from '../network/network.js';

import * as ApplicationComponents from './components/components.js';
import serviceWorkerCacheViewsStyles from './serviceWorkerCacheViews.css.js';

const {widget} = UI.Widget;

const UIStrings = {
  /**
   * @description Title of the cache storage view in the Application panel.
   */
  cache: 'Cache',
  /**
   * @description Tooltip text for the refresh button in the cache storage view of the Application panel.
   */
  refresh: 'Refresh',
  /**
   * @description Tooltip text for the delete selected button in the cache storage view of the Application panel.
   */
  deleteSelected: 'Delete selected',
  /**
   * @description Placeholder text for the filter input in the cache storage view of the Application panel.
   */
  filterByPath: 'Filter by path',
  /**
   * @description Empty state header in the cache storage view of the Application panel when no cache entry is selected.
   */
  noCacheEntrySelected: 'No cache entry selected',
  /**
   * @description Empty state text in the cache storage view of the Application panel when no cache entry is selected.
   */
  selectACacheEntryAboveToPreview: 'Select a cache entry above to preview',
  /**
   * @description Column header in the cache storage datagrid for the entry name.
   */
  name: 'Name',
  /**
   * @description Column header in the cache storage datagrid for the time the entry was cached.
   */
  timeCached: 'Time cached',
  /**
   * @description Tooltip text for the Vary header column in the cache storage datagrid of the Application panel.
   */
  varyHeaderWarning: '⚠️ Set ignoreVary to true when matching this entry',
  /**
   * @description Accessible name for the cache storage datagrid in the Application panel.
   */
  serviceWorkerCache: '`Service Worker` cache',
  /**
   * @description Status text in the cache storage view of the Application panel showing the number of matching entries.
   * @example {2} PH1
   */
  matchingEntriesS: 'Matching entries: {PH1}',
  /**
   * @description Status text in the cache storage view of the Application panel showing the total number of entries.
   * @example {2} PH1
   */
  totalEntriesS: 'Total entries: {PH1}',
  /**
   * @description Tab title for request headers in the cache storage entry preview of the Application panel.
   */
  headers: 'Headers',
  /**
   * @description Tab title for response preview in the cache storage entry preview of the Application panel.
   */
  preview: 'Preview',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/ServiceWorkerCacheViews.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  dataGridWidget: UI.Widget.Widget|null;
  selectedRequest: SDK.NetworkRequest.NetworkRequest|null;
  refreshEnabled: boolean;
  entryPathFilter: string;
  returnCount: number|null;
  bucketInfo?: Protocol.Storage.StorageBucketInfo|null;
  storageKey?: string;
  onRefresh: () => void;
  onDeleteSelected: () => void;
  onFilterChanged: (filter: string) => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <devtools-toolbar class="data-view-toolbar" jslog=${VisualLogging.toolbar()}>
      <devtools-button
        title=${i18nString(UIStrings.refresh)}
        aria-label=${i18nString(UIStrings.refresh)}
        .iconName=${'refresh'}
        .disabled=${!input.refreshEnabled}
        .variant=${Buttons.Button.Variant.TOOLBAR}
        .jslogContext=${'cache-storage.refresh'}
        @click=${input.onRefresh}>
      </devtools-button>
      <devtools-button
        title=${i18nString(UIStrings.deleteSelected)}
        aria-label=${i18nString(UIStrings.deleteSelected)}
        .iconName=${'cross'}
        .variant=${Buttons.Button.Variant.TOOLBAR}
        .jslogContext=${'cache-storage.delete-selected'}
        @click=${input.onDeleteSelected}>
      </devtools-button>
      <devtools-toolbar-input
        type="filter"
        placeholder=${i18nString(UIStrings.filterByPath)}
        style="flex-grow:1"
        @change=${(e: CustomEvent<string>) => input.onFilterChanged(e.detail)}>
      </devtools-toolbar-input>
    </devtools-toolbar>
    <devtools-widget
      class="storage-metadata-view"
      ${widget(ApplicationComponents.StorageMetadataView.StorageMetadataView, {
        showOnlyBucket: true,
        storageBucket: input.bucketInfo,
        storageKey: input.storageKey,
      })}>
    </devtools-widget>
    <devtools-split-view direction="row" sidebar-position="first">
      <devtools-widget slot="sidebar" ${widget(UI.Widget.VBox, {minimumSize: new Geometry.Size(0, 100)})}>
        <devtools-widget class="data-grid" ${widget(UI.Widget.WrapperWidget, {widget: input.dataGridWidget})}>
        </devtools-widget>
      </devtools-widget>
      <devtools-widget slot="main" ${widget(UI.Widget.VBox)}>
        <div class="cache-preview-panel-resizer"></div>
        ${input.selectedRequest ? widget(RequestView, {request: input.selectedRequest}) :
          widget(UI.EmptyWidget.EmptyWidget, {
            header: i18nString(UIStrings.noCacheEntrySelected),
            text: i18nString(UIStrings.selectACacheEntryAboveToPreview),
          })}
      </devtools-widget>
    </devtools-split-view>
    ${input.returnCount !== null ? html`
      <div class="cache-storage-summary-bar">
        <span>${input.entryPathFilter ?
          i18nString(UIStrings.matchingEntriesS, {PH1: String(input.returnCount)}) :
          i18nString(UIStrings.totalEntriesS, {PH1: String(input.returnCount)})}</span>
      </div>
    ` : nothing}
  `, target, {container: {classes: ['service-worker-cache-data-view', 'storage-view']}});
  // clang-format on
};

export class ServiceWorkerCacheView extends UI.View.SimpleView {
  readonly #view: View;
  private model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel;
  protected entriesForTest: Protocol.CacheStorage.DataEntry[]|null = null;
  #selectedRequest: SDK.NetworkRequest.NetworkRequest|null = null;
  private cache: SDK.ServiceWorkerCacheModel.Cache;
  private dataGrid: DataGrid.DataGrid.DataGridImpl<DataGridNode>|null = null;
  readonly #refreshThrottler = new Common.Throttler.Throttler(300);
  readonly #entryPathFilterThrottler = new Common.Throttler.Throttler(300);
  #refreshEnabled = true;
  private entryPathFilter = '';
  private returnCount: number|null = null;
  #loadingPromise: Promise<{
    entries: Protocol.CacheStorage.DataEntry[],
    returnCount: number,
  }>|null = null;

  constructor(
      model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel,
      cache: SDK.ServiceWorkerCacheModel.Cache,
      view: View = DEFAULT_VIEW,
  ) {
    super({
      title: i18nString(UIStrings.cache),
      viewId: 'cache',
      jslog: `${VisualLogging.pane('cache-storage-data')}`,
    });
    this.#view = view;
    this.registerRequiredCSS(serviceWorkerCacheViewsStyles);

    this.model = model;
    this.cache = cache;

    this.update(cache);
  }

  #resetDataGrid(): void {
    this.dataGrid = this.#createDataGrid();
    this.#selectedRequest = null;
    this.performUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.model.addEventListener(SDK.ServiceWorkerCacheModel.Events.CACHE_STORAGE_CONTENT_UPDATED,
                                this.#cacheContentUpdated, this);
    void this.updateData(true);
  }

  override willHide(): void {
    super.willHide();
    this.model.removeEventListener(SDK.ServiceWorkerCacheModel.Events.CACHE_STORAGE_CONTENT_UPDATED,
                                   this.#cacheContentUpdated, this);
  }

  #createDataGrid(): DataGrid.DataGrid.DataGridImpl<DataGridNode> {
    const columns: DataGrid.DataGrid.ColumnDescriptor[] = [
      {id: 'number', title: '#' as Common.UIString.LocalizedString, sortable: false, width: '3px'},
      {id: 'name', title: i18nString(UIStrings.name), weight: 4, sortable: true},
      {
        id: 'response-type',
        title: i18n.i18n.lockedString('Response-Type'),
        weight: 1,
        align: DataGrid.DataGrid.Align.RIGHT,
        sortable: true,
      },
      {id: 'content-type', title: i18n.i18n.lockedString('Content-Type'), weight: 1, sortable: true},
      {
        id: 'content-length',
        title: i18n.i18n.lockedString('Content-Length'),
        weight: 1,
        align: DataGrid.DataGrid.Align.RIGHT,
        sortable: true,
      },
      {
        id: 'response-time',
        title: i18nString(UIStrings.timeCached),
        width: '12em',
        weight: 1,
        align: DataGrid.DataGrid.Align.RIGHT,
        sortable: true,
      },
      {id: 'vary-header', title: i18n.i18n.lockedString('Vary Header'), weight: 1, sortable: true},
    ];
    const dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: i18nString(UIStrings.serviceWorkerCache),
      columns,
      deleteCallback: this.#deleteButtonClicked.bind(this),
      refreshCallback: this.updateData.bind(this, true),
    });

    dataGrid.addEventListener(DataGrid.DataGrid.Events.SORTING_CHANGED, this.#sortingChanged, this);

    dataGrid.addEventListener(DataGrid.DataGrid.Events.SELECTED_NODE, event => {
      this.#selectedRequest = event.data.data as SDK.NetworkRequest.NetworkRequest;
      this.performUpdate();
    }, this);
    dataGrid.setStriped(true);
    return dataGrid;
  }

  #sortingChanged(): void {
    if (!this.dataGrid) {
      return;
    }

    const dataGrid = this.dataGrid;

    const accending = dataGrid.isSortOrderAscending();
    const columnId = dataGrid.sortColumnId();
    let comparator: (arg0: DataGridNode, arg1: DataGridNode) => number;
    if (columnId === 'name') {
      comparator = (a: DataGridNode, b: DataGridNode) => a.name.localeCompare(b.name);
    } else if (columnId === 'content-type') {
      comparator = (a: DataGridNode, b: DataGridNode) => a.data.mimeType.localeCompare(b.data.mimeType);
    } else if (columnId === 'content-length') {
      comparator = (a: DataGridNode, b: DataGridNode) => a.data.resourceSize - b.data.resourceSize;
    } else if (columnId === 'response-time') {
      comparator = (a: DataGridNode, b: DataGridNode) => a.data.endTime - b.data.endTime;
    } else if (columnId === 'response-type') {
      comparator = (a: DataGridNode, b: DataGridNode) => a.responseType.localeCompare(b.responseType);
    } else if (columnId === 'vary-header') {
      comparator = (a: DataGridNode, b: DataGridNode) => a.varyHeader.localeCompare(b.varyHeader);
    }

    const children = dataGrid.rootNode().children.slice();
    dataGrid.rootNode().removeChildren();
    children.sort((a, b) => {
      const result = comparator((a as DataGridNode), (b as DataGridNode));
      return accending ? result : -result;
    });
    children.forEach(child => dataGrid.rootNode().appendChild(child));
  }

  async #deleteButtonClicked(node: DataGrid.DataGrid.DataGridNode<DataGridNode>|null): Promise<void> {
    if (!node) {
      node = this.dataGrid?.selectedNode ?? null;
      if (!node) {
        return;
      }
    }
    await this.model.deleteCacheEntry(this.cache, (node.data.url() as string));
    node.remove();
  }

  update(cache: SDK.ServiceWorkerCacheModel.Cache|null = null): void {
    if (!cache) {
      return;
    }
    this.cache = cache;
    this.#resetDataGrid();
    void this.updateData(true);
  }

  override performUpdate(): void {
    const bucketInfo = this.model.target()
                           .model(SDK.StorageBucketsModel.StorageBucketsModel)
                           ?.getBucketByName(this.cache.storageBucket.storageKey, this.cache.storageBucket.name);
    this.#view({
      dataGridWidget: this.dataGrid ? this.dataGrid.asWidget() : null,
      selectedRequest: this.#selectedRequest,
      refreshEnabled: this.#refreshEnabled,
      entryPathFilter: this.entryPathFilter,
      returnCount: this.returnCount,
      bucketInfo,
      storageKey: this.cache.storageKey,
      onRefresh: () => {
        void this.updateData(true);
      },
      onDeleteSelected: () => {
        void this.#deleteButtonClicked(null);
      },
      onFilterChanged: (filter: string) => {
        void this.#entryPathFilterThrottler.schedule(() => {
          this.entryPathFilter = filter;
          return this.updateData(true);
        });
      },
    },
               undefined, this.contentElement);
  }

  private updateDataCallback(entries: Protocol.CacheStorage.DataEntry[], returnCount: number): void {
    if (!this.dataGrid) {
      return;
    }
    const selected = this.dataGrid.selectedNode?.data.url();
    this.#refreshEnabled = true;
    this.entriesForTest = entries;
    this.returnCount = returnCount;
    this.performUpdate();

    const oldEntries = new Map<string, DataGridNode>();
    const rootNode = this.dataGrid.rootNode();
    for (const node of rootNode.children) {
      oldEntries.set(node.data.url, (node as DataGridNode));
    }
    rootNode.removeChildren();
    let selectedNode: DataGridNode|null = null;
    for (let i = 0; i < entries.length; ++i) {
      const entry = entries[i];
      let node = oldEntries.get(entry.requestURL);
      if (!node || node.data.responseTime !== entry.responseTime) {
        node = new DataGridNode(i, this.createRequest(entry), entry.responseType);
        node.selectable = true;
      } else {
        node.data.number = i;
      }
      rootNode.appendChild(node);
      if (entry.requestURL === selected) {
        selectedNode = node;
      }
    }
    if (!selectedNode) {
      this.#selectedRequest = null;
      this.performUpdate();
    } else {
      selectedNode.revealAndSelect();
    }
    this.updatedForTest();
  }

  private async updateData(force: boolean): Promise<{
    entries: Protocol.CacheStorage.DataEntry[],
    returnCount: number,
  }|undefined> {
    if (!force && this.#loadingPromise) {
      return await this.#loadingPromise;
    }
    this.#refreshEnabled = false;
    this.performUpdate();

    if (this.#loadingPromise) {
      return await this.#loadingPromise;
    }

    this.#loadingPromise = new Promise(resolve => {
      this.model.loadAllCacheData(
          this.cache, this.entryPathFilter, (entries: Protocol.CacheStorage.DataEntry[], returnCount: number) => {
            resolve({entries, returnCount});
          });
    });

    const {entries, returnCount} = await this.#loadingPromise;
    this.updateDataCallback(entries, returnCount);
    this.#loadingPromise = null;
    return;
  }

  #cacheContentUpdated(
      event: Common.EventTarget.EventTargetEvent<SDK.ServiceWorkerCacheModel.CacheStorageContentUpdatedEvent>): void {
    const {cacheName, storageBucket} = event.data;
    if ((!this.cache.inBucket(storageBucket) || this.cache.cacheName !== cacheName)) {
      return;
    }
    void this.#refreshThrottler.schedule(() => Promise.resolve(this.updateData(true)),
                                         Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE);
  }

  private createRequest(entry: Protocol.CacheStorage.DataEntry): SDK.NetworkRequest.NetworkRequest {
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'cache-storage-' + entry.requestURL, entry.requestURL as Platform.DevToolsPath.UrlString,
        Platform.DevToolsPath.EmptyUrlString, null);
    request.requestMethod = entry.requestMethod;
    request.setRequestHeaders(entry.requestHeaders);
    request.statusCode = entry.responseStatus;
    request.statusText = entry.responseStatusText;
    request.protocol = new Common.ParsedURL.ParsedURL(entry.requestURL).scheme;
    request.responseHeaders = entry.responseHeaders;
    request.setRequestHeadersText('');
    request.endTime = entry.responseTime;

    let header = entry.responseHeaders.find(header => header.name.toLowerCase() === 'content-type');
    let mimeType: string = Platform.MimeType.MimeType.PLAIN;
    if (header) {
      const result = Platform.MimeType.parseContentType(header.value);
      if (result.mimeType) {
        mimeType = result.mimeType;
      }
    }
    request.mimeType = mimeType;

    header = entry.responseHeaders.find(header => header.name.toLowerCase() === 'content-length');
    request.resourceSize = (header && Number(header.value)) || 0;

    let resourceType = Common.ResourceType.ResourceType.fromMimeType(mimeType);
    if (!resourceType) {
      resourceType =
          Common.ResourceType.ResourceType.fromURL(entry.requestURL) || Common.ResourceType.resourceTypes.Other;
    }
    request.setResourceType(resourceType);
    request.setContentDataProvider(this.requestContent.bind(this, request));
    return request;
  }

  private async requestContent(request: SDK.NetworkRequest.NetworkRequest):
      Promise<TextUtils.ContentData.ContentDataOrError> {
    const response = await this.cache.requestCachedResponse(request.url(), request.requestHeaders());
    if (!response) {
      return {error: 'No cached response found'};
    }
    return new TextUtils.ContentData.ContentData(
        response.body, /* isBase64=*/ true, request.mimeType, request.charset() ?? undefined);
  }

  private updatedForTest(): void {
  }
}

export class DataGridNode extends DataGrid.DataGrid.DataGridNode<DataGridNode> {
  private number: number;
  name: string;
  private request: SDK.NetworkRequest.NetworkRequest;
  responseType: Protocol.CacheStorage.CachedResponseType;
  varyHeader: string;

  constructor(
      number: number, request: SDK.NetworkRequest.NetworkRequest,
      responseType: Protocol.CacheStorage.CachedResponseType) {
    super(request);
    this.number = number;
    const parsed = new Common.ParsedURL.ParsedURL(request.url());
    if (parsed.isValid) {
      this.name = Platform.StringUtilities.trimURL(request.url(), parsed.domain());
    } else {
      this.name = request.url();
    }
    this.request = request;
    this.responseType = responseType;
    this.varyHeader = request.responseHeaders.find(header => header.name.toLowerCase() === 'vary')?.value || '';
  }

  override createCell(columnId: string): HTMLElement {
    const cell = this.createTD(columnId);
    let value;
    let tooltip = this.request.url() as string;
    if (columnId === 'number') {
      value = String(this.number);
    } else if (columnId === 'name') {
      value = this.name;
    } else if (columnId === 'response-type') {
      if (this.responseType === 'opaqueResponse') {
        value = 'opaque';
      } else if (this.responseType === 'opaqueRedirect') {
        value = 'opaqueredirect';
      } else {
        value = this.responseType;
      }
    } else if (columnId === 'content-type') {
      value = this.request.mimeType;
    } else if (columnId === 'content-length') {
      value = (this.request.resourceSize | 0).toLocaleString('en-US');
    } else if (columnId === 'response-time') {
      value = new Date(this.request.endTime * 1000).toLocaleString();
    } else if (columnId === 'vary-header') {
      value = this.varyHeader;
      if (this.varyHeader) {
        tooltip = i18nString(UIStrings.varyHeaderWarning);
      }
    }
    const parentElement = cell.parentElement;
    let gridNode;
    if (parentElement && this.dataGrid) {
      gridNode = this.dataGrid.elementToDataGridNode.get(parentElement);
    }
    DataGrid.DataGrid.DataGridImpl.setElementText(cell, value || '', /* longText= */ true, gridNode);
    UI.Tooltip.Tooltip.install(cell, tooltip);
    return cell;
  }
}

export interface RequestViewInput {
  request: SDK.NetworkRequest.NetworkRequest;
  selectedTabId: string;
  onTabSelected: (tabId: string, isUserGesture: boolean) => void;
}

export type RequestViewFunction = (input: RequestViewInput, output: undefined, target: HTMLElement) => void;

export const REQUEST_VIEW_DEFAULT_VIEW: RequestViewFunction = (input, _output, target) => {
  // clang-format off
  render(html`
    <devtools-tabbed-pane
      jslog=${VisualLogging.section('network-item-preview')}
      @select=${(event: CustomEvent<{tabId: string, isUserGesture?: boolean}>) =>
        input.onTabSelected(event.detail.tabId, Boolean(event.detail.isUserGesture))}>
      <devtools-widget
        id="headers"
        label=${i18nString(UIStrings.headers)}
        ?selected=${input.selectedTabId !== 'preview'}
        ${widget(Network.RequestHeadersView.RequestHeadersView, {request: input.request})}>
      </devtools-widget>
      <devtools-widget
        id="preview"
        label=${i18nString(UIStrings.preview)}
        ?selected=${input.selectedTabId === 'preview'}
        ${widget(Network.RequestPreviewView.RequestPreviewView, {request: input.request})}>
      </devtools-widget>
    </devtools-tabbed-pane>
  `, target);
  // clang-format on
};

export class RequestView extends UI.Widget.VBox {
  readonly #view: RequestViewFunction;
  #request?: SDK.NetworkRequest.NetworkRequest;
  readonly #resourceViewTabSetting: Common.Settings.Setting<string>;

  constructor(
      requestOrElement?: SDK.NetworkRequest.NetworkRequest|HTMLElement,
      view: RequestViewFunction = REQUEST_VIEW_DEFAULT_VIEW,
  ) {
    super(requestOrElement instanceof HTMLElement ? requestOrElement : undefined);
    this.#view = view;
    this.#resourceViewTabSetting =
        Common.Settings.Settings.instance().createSetting('cache-storage-view-tab', 'preview');
    if (requestOrElement && !(requestOrElement instanceof HTMLElement)) {
      this.request = requestOrElement;
    }
  }

  set request(request: SDK.NetworkRequest.NetworkRequest) {
    if (this.#request === request) {
      return;
    }
    this.#request = request;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    if (!this.#request) {
      return;
    }
    this.#view({
      request: this.#request,
      selectedTabId: this.#resourceViewTabSetting.get(),
      onTabSelected: (tabId, isUserGesture) => {
        if (isUserGesture) {
          this.#resourceViewTabSetting.set(tabId);
        }
      },
    },
               undefined, this.contentElement);
  }
}
