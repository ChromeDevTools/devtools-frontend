// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';

import serviceWorkerCacheViewsStyles from './serviceWorkerCacheViews.css.js';

import type * as Protocol from '../../generated/protocol.js';
import * as Network from '../network/network.js';

const UIStrings = {
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  cache: 'Cache',
  /**
   *@description Text to refresh the page
   */
  refresh: 'Refresh',
  /**
   *@description Tooltip text that appears when hovering over the largeicon delete button in the Service Worker Cache Views of the Application panel
   */
  deleteSelected: 'Delete Selected',
  /**
   *@description Text in Service Worker Cache Views of the Application panel
   */
  filterByPath: 'Filter by Path',
  /**
   *@description Text in Service Worker Cache Views of the Application panel
   */
  selectACacheEntryAboveToPreview: 'Select a cache entry above to preview',
  /**
   *@description Text for the name of something
   */
  name: 'Name',
  /**
   *@description Text in Service Worker Cache Views of the Application panel
   */
  timeCached: 'Time Cached',
  /**
   * @description Tooltip text that appears when hovering over the vary header column in the Service Worker Cache Views of the Application panel
   */
  varyHeaderWarning: '⚠️ Set ignoreVary to true when matching this entry',
  /**
   *@description Text used to show that data was retrieved from ServiceWorker Cache
   */
  serviceWorkerCache: '`Service Worker` Cache',
  /**
   *@description Span text content in Service Worker Cache Views of the Application panel
   *@example {2} PH1
   */
  matchingEntriesS: 'Matching entries: {PH1}',
  /**
   *@description Span text content in Indexed DBViews of the Application panel
   *@example {2} PH1
   */
  totalEntriesS: 'Total entries: {PH1}',
  /**
   *@description Text for network request headers
   */
  headers: 'Headers',
  /**
   *@description Text for previewing items
   */
  preview: 'Preview',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/ServiceWorkerCacheViews.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ServiceWorkerCacheView extends UI.View.SimpleView {
  private model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel;
  private entriesForTest: Protocol.CacheStorage.DataEntry[]|null;
  private readonly splitWidget: UI.SplitWidget.SplitWidget;
  private readonly previewPanel: UI.Widget.VBox;
  private preview: UI.Widget.Widget|null;
  private cache: SDK.ServiceWorkerCacheModel.Cache;
  private dataGrid: DataGrid.DataGrid.DataGridImpl<DataGridNode>|null;
  private readonly refreshThrottler: Common.Throttler.Throttler;
  private readonly refreshButton: UI.Toolbar.ToolbarButton;
  private readonly deleteSelectedButton: UI.Toolbar.ToolbarButton;
  private entryPathFilter: string;
  private returnCount: number|null;
  private summaryBarElement: Element|null;
  private loadingPromise: Promise<{
    entries: Array<Protocol.CacheStorage.DataEntry>,
    returnCount: number,
  }>|null;
  constructor(model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel, cache: SDK.ServiceWorkerCacheModel.Cache) {
    super(i18nString(UIStrings.cache));

    this.model = model;
    this.entriesForTest = null;

    this.element.classList.add('service-worker-cache-data-view');
    this.element.classList.add('storage-view');

    const editorToolbar = new UI.Toolbar.Toolbar('data-view-toolbar', this.element);
    this.splitWidget = new UI.SplitWidget.SplitWidget(false, false);
    this.splitWidget.show(this.element);

    this.previewPanel = new UI.Widget.VBox();
    const resizer = this.previewPanel.element.createChild('div', 'cache-preview-panel-resizer');
    this.splitWidget.setMainWidget(this.previewPanel);
    this.splitWidget.installResizer(resizer);

    this.preview = null;

    this.cache = cache;
    this.dataGrid = null;
    this.refreshThrottler = new Common.Throttler.Throttler(300);
    this.refreshButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.refresh), 'largeicon-refresh');
    this.refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.refreshButtonClicked, this);
    editorToolbar.appendToolbarItem(this.refreshButton);

    this.deleteSelectedButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.deleteSelected), 'largeicon-delete');
    this.deleteSelectedButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, _event => {
      void this.deleteButtonClicked(null);
    });
    editorToolbar.appendToolbarItem(this.deleteSelectedButton);

    const entryPathFilterBox = new UI.Toolbar.ToolbarInput(i18nString(UIStrings.filterByPath), '', 1);
    editorToolbar.appendToolbarItem(entryPathFilterBox);
    const entryPathFilterThrottler = new Common.Throttler.Throttler(300);
    this.entryPathFilter = '';
    entryPathFilterBox.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, () => {
      void entryPathFilterThrottler.schedule(() => {
        this.entryPathFilter = entryPathFilterBox.value();
        return this.updateData(true);
      });
    });
    this.returnCount = (null as number | null);
    this.summaryBarElement = (null as Element | null);
    this.loadingPromise = null;

    this.update(cache);
  }

  private resetDataGrid(): void {
    if (this.dataGrid) {
      this.dataGrid.asWidget().detach();
    }
    this.dataGrid = this.createDataGrid();
    const dataGridWidget = this.dataGrid.asWidget();
    this.splitWidget.setSidebarWidget(dataGridWidget);
    dataGridWidget.setMinimumSize(0, 250);
  }

  wasShown(): void {
    this.model.addEventListener(
        SDK.ServiceWorkerCacheModel.Events.CacheStorageContentUpdated, this.cacheContentUpdated, this);
    this.registerCSSFiles([serviceWorkerCacheViewsStyles]);
    void this.updateData(true);
  }

  willHide(): void {
    this.model.removeEventListener(
        SDK.ServiceWorkerCacheModel.Events.CacheStorageContentUpdated, this.cacheContentUpdated, this);
  }

  private showPreview(preview: UI.Widget.Widget|null): void {
    if (preview && this.preview === preview) {
      return;
    }
    if (this.preview) {
      this.preview.detach();
    }
    if (!preview) {
      preview = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.selectACacheEntryAboveToPreview));
    }
    this.preview = preview;
    this.preview.show(this.previewPanel.element);
  }

  private createDataGrid(): DataGrid.DataGrid.DataGridImpl<DataGridNode> {
    const columns = ([
      {id: 'number', title: '#', sortable: false, width: '3px'},
      {id: 'name', title: i18nString(UIStrings.name), weight: 4, sortable: true},
      {
        id: 'responseType',
        title: i18n.i18n.lockedString('Response-Type'),
        weight: 1,
        align: DataGrid.DataGrid.Align.Right,
        sortable: true,
      },
      {id: 'contentType', title: i18n.i18n.lockedString('Content-Type'), weight: 1, sortable: true},
      {
        id: 'contentLength',
        title: i18n.i18n.lockedString('Content-Length'),
        weight: 1,
        align: DataGrid.DataGrid.Align.Right,
        sortable: true,
      },
      {
        id: 'responseTime',
        title: i18nString(UIStrings.timeCached),
        width: '12em',
        weight: 1,
        align: DataGrid.DataGrid.Align.Right,
        sortable: true,
      },
      {id: 'varyHeader', title: i18n.i18n.lockedString('Vary Header'), weight: 1, sortable: true},
    ] as DataGrid.DataGrid.ColumnDescriptor[]);
    const dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: i18nString(UIStrings.serviceWorkerCache),
      columns,
      deleteCallback: this.deleteButtonClicked.bind(this),
      refreshCallback: this.updateData.bind(this, true),
      editCallback: undefined,
    });

    dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this.sortingChanged, this);

    dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, event => {
      void this.previewCachedResponse(event.data.data as SDK.NetworkRequest.NetworkRequest);
    }, this);
    dataGrid.setStriped(true);
    return dataGrid;
  }

  private sortingChanged(): void {
    if (!this.dataGrid) {
      return;
    }

    const dataGrid = this.dataGrid;

    const accending = dataGrid.isSortOrderAscending();
    const columnId = dataGrid.sortColumnId();
    let comparator: (arg0: DataGridNode, arg1: DataGridNode) => number;
    if (columnId === 'name') {
      comparator = (a: DataGridNode, b: DataGridNode): number => a.name.localeCompare(b.name);
    } else if (columnId === 'contentType') {
      comparator = (a: DataGridNode, b: DataGridNode): number => a.data.mimeType.localeCompare(b.data.mimeType);
    } else if (columnId === 'contentLength') {
      comparator = (a: DataGridNode, b: DataGridNode): number => a.data.resourceSize - b.data.resourceSize;
    } else if (columnId === 'responseTime') {
      comparator = (a: DataGridNode, b: DataGridNode): number => a.data.endTime - b.data.endTime;
    } else if (columnId === 'responseType') {
      comparator = (a: DataGridNode, b: DataGridNode): number => a.responseType.localeCompare(b.responseType);
    } else if (columnId === 'varyHeader') {
      comparator = (a: DataGridNode, b: DataGridNode): number => a.varyHeader.localeCompare(b.varyHeader);
    }

    const children = dataGrid.rootNode().children.slice();
    dataGrid.rootNode().removeChildren();
    children.sort((a, b) => {
      const result = comparator((a as DataGridNode), (b as DataGridNode));
      return accending ? result : -result;
    });
    children.forEach(child => dataGrid.rootNode().appendChild(child));
  }

  private async deleteButtonClicked(node: DataGrid.DataGrid.DataGridNode<DataGridNode>|null): Promise<void> {
    if (!node) {
      node = this.dataGrid && this.dataGrid.selectedNode;
      if (!node) {
        return;
      }
    }
    await this.model.deleteCacheEntry(this.cache, (node.data.url() as string));
    node.remove();
  }

  update(cache: SDK.ServiceWorkerCacheModel.Cache): void {
    this.cache = cache;
    this.resetDataGrid();
    void this.updateData(true);
  }

  private updateSummaryBar(): void {
    if (!this.summaryBarElement) {
      this.summaryBarElement = this.element.createChild('div', 'cache-storage-summary-bar');
    }
    this.summaryBarElement.removeChildren();

    const span = this.summaryBarElement.createChild('span');
    if (this.entryPathFilter) {
      span.textContent = i18nString(UIStrings.matchingEntriesS, {PH1: String(this.returnCount)});
    } else {
      span.textContent = i18nString(UIStrings.totalEntriesS, {PH1: String(this.returnCount)});
    }
  }

  private updateDataCallback(
      this: ServiceWorkerCacheView, skipCount: number, entries: Protocol.CacheStorage.DataEntry[],
      returnCount: number): void {
    if (!this.dataGrid) {
      return;
    }
    const selected = this.dataGrid.selectedNode && this.dataGrid.selectedNode.data.url();
    this.refreshButton.setEnabled(true);
    this.entriesForTest = entries;
    this.returnCount = returnCount;
    this.updateSummaryBar();

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
      this.showPreview(null);
    } else {
      selectedNode.revealAndSelect();
    }
    this.updatedForTest();
  }

  private async updateData(force: boolean): Promise<{
    entries: Protocol.CacheStorage.DataEntry[],
    returnCount: number,
  }|undefined> {
    if (!force && this.loadingPromise) {
      return this.loadingPromise;
    }
    this.refreshButton.setEnabled(false);

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise(resolve => {
      this.model.loadAllCacheData(
          this.cache, this.entryPathFilter, (entries: Protocol.CacheStorage.DataEntry[], returnCount: number) => {
            resolve({entries, returnCount});
          });
    });

    const {entries, returnCount} = await this.loadingPromise;
    this.updateDataCallback(0, entries, returnCount);
    this.loadingPromise = null;
    return;
  }

  private refreshButtonClicked(): void {
    void this.updateData(true);
  }

  private cacheContentUpdated(
      event: Common.EventTarget.EventTargetEvent<SDK.ServiceWorkerCacheModel.CacheStorageContentUpdatedEvent>): void {
    const {cacheName, storageKey} = event.data;
    if ((this.cache.storageKey !== storageKey || this.cache.cacheName !== cacheName)) {
      return;
    }
    void this.refreshThrottler.schedule(() => Promise.resolve(this.updateData(true)), true);
  }

  private async previewCachedResponse(request: SDK.NetworkRequest.NetworkRequest): Promise<void> {
    let preview = networkRequestToPreview.get(request);
    if (!preview) {
      preview = new RequestView(request);
      networkRequestToPreview.set(request, preview);
    }

    // It is possible that table selection changes before the preview opens.
    if (this.dataGrid && this.dataGrid.selectedNode && request === this.dataGrid.selectedNode.data) {
      this.showPreview(preview);
    }
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
    const contentType = header ? header.value : SDK.NetworkRequest.MIME_TYPE.PLAIN;
    request.mimeType = contentType as SDK.NetworkRequest.MIME_TYPE;

    header = entry.responseHeaders.find(header => header.name.toLowerCase() === 'content-length');
    request.resourceSize = (header && Number(header.value)) || 0;

    let resourceType = Common.ResourceType.ResourceType.fromMimeType(contentType);
    if (!resourceType) {
      resourceType =
          Common.ResourceType.ResourceType.fromURL(entry.requestURL) || Common.ResourceType.resourceTypes.Other;
    }
    request.setResourceType(resourceType);
    request.setContentDataProvider(this.requestContent.bind(this, request));
    return request;
  }

  private async requestContent(request: SDK.NetworkRequest.NetworkRequest): Promise<SDK.NetworkRequest.ContentData> {
    const isText = request.resourceType().isTextType();
    const contentData: SDK.NetworkRequest.ContentData = {error: null, content: null, encoded: !isText};
    const response = await this.cache.requestCachedResponse(request.url(), request.requestHeaders());
    if (response) {
      contentData.content = isText ? window.atob(response.body) : response.body;
    }
    return contentData;
  }

  private updatedForTest(): void {
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly previewSymbol = Symbol('preview');
}

const networkRequestToPreview = new WeakMap<SDK.NetworkRequest.NetworkRequest, RequestView>();

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

  createCell(columnId: string): HTMLElement {
    const cell = this.createTD(columnId);
    let value;
    let tooltip = this.request.url() as string;
    if (columnId === 'number') {
      value = String(this.number);
    } else if (columnId === 'name') {
      value = this.name;
    } else if (columnId === 'responseType') {
      if (this.responseType === 'opaqueResponse') {
        value = 'opaque';
      } else if (this.responseType === 'opaqueRedirect') {
        value = 'opaqueredirect';
      } else {
        value = this.responseType;
      }
    } else if (columnId === 'contentType') {
      value = this.request.mimeType;
    } else if (columnId === 'contentLength') {
      value = (this.request.resourceSize | 0).toLocaleString('en-US');
    } else if (columnId === 'responseTime') {
      value = new Date(this.request.endTime * 1000).toLocaleString();
    } else if (columnId === 'varyHeader') {
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

export class RequestView extends UI.Widget.VBox {
  private tabbedPane: UI.TabbedPane.TabbedPane;
  private resourceViewTabSetting: Common.Settings.Setting<string>;

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();

    this.tabbedPane = new UI.TabbedPane.TabbedPane();
    this.tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, this.tabSelected, this);
    this.resourceViewTabSetting = Common.Settings.Settings.instance().createSetting('cacheStorageViewTab', 'preview');

    this.tabbedPane.appendTab(
        'headers', i18nString(UIStrings.headers), new Network.RequestHeadersView.RequestHeadersView(request));
    this.tabbedPane.appendTab(
        'preview', i18nString(UIStrings.preview), new Network.RequestPreviewView.RequestPreviewView(request));
    this.tabbedPane.show(this.element);
  }

  wasShown(): void {
    super.wasShown();
    this.selectTab();
  }

  private selectTab(tabId?: string): void {
    if (!tabId) {
      tabId = this.resourceViewTabSetting.get();
    }
    if (tabId && !this.tabbedPane.selectTab(tabId)) {
      this.tabbedPane.selectTab('headers');
    }
  }

  private tabSelected(event: Common.EventTarget.EventTargetEvent<UI.TabbedPane.EventData>): void {
    if (!event.data.isUserGesture) {
      return;
    }
    this.resourceViewTabSetting.set(event.data.tabId);
  }
}
