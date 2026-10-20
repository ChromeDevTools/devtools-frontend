// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/legacy.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Geometry from '../../ui/geometry/geometry.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Network from '../network/network.js';
import * as ApplicationComponents from './components/components.js';
import serviceWorkerCacheViewsStyles from './serviceWorkerCacheViews.css.js';
const { widget } = UI.Widget;
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
};
const str_ = i18n.i18n.registerUIStrings('panels/application/ServiceWorkerCacheViews.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <devtools-toolbar class="data-view-toolbar" jslog=${VisualLogging.toolbar()}>
      <devtools-button
        title=${i18nString(UIStrings.refresh)}
        aria-label=${i18nString(UIStrings.refresh)}
        .iconName=${'refresh'}
        .disabled=${!input.refreshEnabled}
        .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
        .jslogContext=${'cache-storage.refresh'}
        @click=${input.onRefresh}>
      </devtools-button>
      <devtools-button
        title=${i18nString(UIStrings.deleteSelected)}
        aria-label=${i18nString(UIStrings.deleteSelected)}
        .iconName=${'cross'}
        .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
        .jslogContext=${'cache-storage.delete-selected'}
        @click=${input.onDeleteSelected}>
      </devtools-button>
      <devtools-toolbar-input
        type="filter"
        placeholder=${i18nString(UIStrings.filterByPath)}
        style="flex-grow:1"
        @change=${(e) => input.onFilterChanged(e.detail)}>
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
      <devtools-widget slot="sidebar" ${widget(UI.Widget.VBox, { minimumSize: new Geometry.Size(0, 100) })}>
        <devtools-data-grid
          striped
          deletable
          class="flex-auto"
          name=${i18nString(UIStrings.serviceWorkerCache)}
          @refresh=${input.onRefresh}
          @deselect=${() => input.onSelect(null)}>
          <table>
            <tr>
              <th id="number" width="3px">${'#'}</th>
              <th id="name" weight="4" sortable>${i18nString(UIStrings.name)}</th>
              <th id="response-type" weight="1" align="right" sortable>${i18n.i18n.lockedString('Response-Type')}</th>
              <th id="content-type" weight="1" sortable>${i18n.i18n.lockedString('Content-Type')}</th>
              <th id="content-length" weight="1" align="right" type="numeric" sortable>${i18n.i18n.lockedString('Content-Length')}</th>
              <th id="response-time" width="12em" weight="1" align="right" type="numeric" sortable>${i18nString(UIStrings.timeCached)}</th>
              <th id="vary-header" weight="1" sortable>${i18n.i18n.lockedString('Vary Header')}</th>
            </tr>
            ${input.entries.map((item, index) => {
        const requestUrl = item.request.url();
        const parsed = new Common.ParsedURL.ParsedURL(requestUrl);
        const name = parsed.isValid ? Platform.StringUtilities.trimURL(requestUrl, parsed.domain()) : requestUrl;
        const responseType = item.entry.responseType === 'opaqueResponse' ? 'opaque' :
            item.entry.responseType === 'opaqueRedirect' ? 'opaqueredirect' :
                item.entry.responseType;
        const varyHeader = item.request.responseHeaders.find(header => header.name.toLowerCase() === 'vary')?.value || '';
        return html `
                <tr
                  ?selected=${input.selectedRequest === item.request}
                  @select=${() => input.onSelect(item.request)}
                  @delete=${() => input.onDelete(item.request)}>
                  <td>${index}</td>
                  <td class="name-column" title=${requestUrl}>${name}</td>
                  <td class="response-type-column" title=${requestUrl}>${responseType}</td>
                  <td class="content-type-column" title=${requestUrl}>${item.request.mimeType}</td>
                  <td class="content-length-column" title=${requestUrl} data-value=${item.request.resourceSize}>${(item.request.resourceSize | 0).toLocaleString('en-US')}</td>
                  <td class="response-time-column" title=${requestUrl} data-value=${item.request.endTime}>${new Date(item.request.endTime * 1000).toLocaleString()}</td>
                  <td class="vary-header-column" title=${varyHeader ? i18nString(UIStrings.varyHeaderWarning) : requestUrl}>${varyHeader}</td>
                </tr>
              `;
    })}
          </table>
        </devtools-data-grid>
      </devtools-widget>
      <devtools-widget slot="main" ${widget(UI.Widget.VBox)}>
        <div class="cache-preview-panel-resizer"></div>
        ${input.selectedRequest ? widget(RequestView, { request: input.selectedRequest }) :
        widget(UI.EmptyWidget.EmptyWidget, {
            header: i18nString(UIStrings.noCacheEntrySelected),
            text: i18nString(UIStrings.selectACacheEntryAboveToPreview),
        })}
      </devtools-widget>
    </devtools-split-view>
    ${input.returnCount !== null ? html `
      <div class="cache-storage-summary-bar">
        <span>${input.entryPathFilter ?
        i18nString(UIStrings.matchingEntriesS, { PH1: String(input.returnCount) }) :
        i18nString(UIStrings.totalEntriesS, { PH1: String(input.returnCount) })}</span>
      </div>
    ` : nothing}
  `, target, { container: { classes: ['service-worker-cache-data-view', 'storage-view'] } });
    // clang-format on
};
export class ServiceWorkerCacheView extends UI.View.SimpleView {
    #view;
    model;
    entriesForTest = null;
    #entries = [];
    #selectedRequest = null;
    cache;
    #refreshThrottler = new Common.Throttler.Throttler(300);
    #entryPathFilterThrottler = new Common.Throttler.Throttler(300);
    #refreshEnabled = true;
    entryPathFilter = '';
    returnCount = null;
    #loadingPromise = null;
    constructor(model, cache, view = DEFAULT_VIEW) {
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
    wasShown() {
        super.wasShown();
        this.model.addEventListener("CacheStorageContentUpdated" /* SDK.ServiceWorkerCacheModel.Events.CACHE_STORAGE_CONTENT_UPDATED */, this.#cacheContentUpdated, this);
        void this.updateData(true);
    }
    willHide() {
        super.willHide();
        this.model.removeEventListener("CacheStorageContentUpdated" /* SDK.ServiceWorkerCacheModel.Events.CACHE_STORAGE_CONTENT_UPDATED */, this.#cacheContentUpdated, this);
    }
    async #deleteButtonClicked(request = this.#selectedRequest) {
        if (!request) {
            return;
        }
        await this.model.deleteCacheEntry(this.cache, request.url());
        this.#entries = this.#entries.filter(item => item.request !== request);
        if (this.#selectedRequest === request) {
            this.#selectedRequest = null;
        }
        this.performUpdate();
    }
    update(cache = null) {
        if (!cache) {
            return;
        }
        this.cache = cache;
        this.#entries = [];
        this.#selectedRequest = null;
        void this.updateData(true);
    }
    performUpdate() {
        const bucketInfo = this.model.target()
            .model(SDK.StorageBucketsModel.StorageBucketsModel)
            ?.getBucketByName(this.cache.storageBucket.storageKey, this.cache.storageBucket.name);
        this.#view({
            entries: this.#entries,
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
                void this.#deleteButtonClicked();
            },
            onFilterChanged: (filter) => {
                void this.#entryPathFilterThrottler.schedule(() => {
                    this.entryPathFilter = filter;
                    return this.updateData(true);
                });
            },
            onSelect: (request) => {
                this.#selectedRequest = request;
                this.performUpdate();
            },
            onDelete: (request) => {
                void this.#deleteButtonClicked(request);
            },
        }, undefined, this.contentElement);
    }
    updateDataCallback(entries, returnCount) {
        const selectedUrl = this.#selectedRequest?.url();
        this.#refreshEnabled = true;
        this.entriesForTest = entries;
        this.returnCount = returnCount;
        const oldEntries = new Map();
        for (const item of this.#entries) {
            oldEntries.set(item.entry.requestURL, item);
        }
        let selectedRequest = null;
        this.#entries = entries.map(entry => {
            const existing = oldEntries.get(entry.requestURL);
            const item = existing && existing.entry.responseTime === entry.responseTime ?
                existing :
                { entry, request: this.createRequest(entry) };
            if (entry.requestURL === selectedUrl) {
                selectedRequest = item.request;
            }
            return item;
        });
        this.#selectedRequest = selectedRequest;
        this.performUpdate();
        this.updatedForTest();
    }
    async updateData(force) {
        if (!force && this.#loadingPromise) {
            return await this.#loadingPromise;
        }
        this.#refreshEnabled = false;
        this.performUpdate();
        if (this.#loadingPromise) {
            return await this.#loadingPromise;
        }
        this.#loadingPromise = new Promise(resolve => {
            this.model.loadAllCacheData(this.cache, this.entryPathFilter, (entries, returnCount) => {
                resolve({ entries, returnCount });
            });
        });
        const { entries, returnCount } = await this.#loadingPromise;
        this.updateDataCallback(entries, returnCount);
        this.#loadingPromise = null;
        return;
    }
    #cacheContentUpdated(event) {
        const { cacheName, storageBucket } = event.data;
        if ((!this.cache.inBucket(storageBucket) || this.cache.cacheName !== cacheName)) {
            return;
        }
        void this.#refreshThrottler.schedule(() => Promise.resolve(this.updateData(true)), "AsSoonAsPossible" /* Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE */);
    }
    createRequest(entry) {
        const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest('cache-storage-' + entry.requestURL, entry.requestURL, Platform.DevToolsPath.EmptyUrlString, null);
        request.requestMethod = entry.requestMethod;
        request.setRequestHeaders(entry.requestHeaders);
        request.statusCode = entry.responseStatus;
        request.statusText = entry.responseStatusText;
        request.protocol = new Common.ParsedURL.ParsedURL(entry.requestURL).scheme;
        request.responseHeaders = entry.responseHeaders;
        request.setRequestHeadersText('');
        request.endTime = entry.responseTime;
        let header = entry.responseHeaders.find(header => header.name.toLowerCase() === 'content-type');
        let mimeType = "text/plain" /* Platform.MimeType.MimeType.PLAIN */;
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
    async requestContent(request) {
        const response = await this.cache.requestCachedResponse(request.url(), request.requestHeaders());
        if (!response) {
            return { error: 'No cached response found' };
        }
        return new TextUtils.ContentData.ContentData(response.body, /* isBase64=*/ true, request.mimeType, request.charset() ?? undefined);
    }
    updatedForTest() {
    }
}
export const REQUEST_VIEW_DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <devtools-tabbed-pane
      jslog=${VisualLogging.section('network-item-preview')}
      @select=${(event) => input.onTabSelected(event.detail.tabId, Boolean(event.detail.isUserGesture))}>
      <devtools-widget
        id="headers"
        label=${i18nString(UIStrings.headers)}
        ?selected=${input.selectedTabId !== 'preview'}
        ${widget(Network.RequestHeadersView.RequestHeadersView, { request: input.request })}>
      </devtools-widget>
      <devtools-widget
        id="preview"
        label=${i18nString(UIStrings.preview)}
        ?selected=${input.selectedTabId === 'preview'}
        ${widget(Network.RequestPreviewView.RequestPreviewView, { request: input.request })}>
      </devtools-widget>
    </devtools-tabbed-pane>
  `, target);
    // clang-format on
};
export class RequestView extends UI.Widget.VBox {
    #view;
    #request;
    #resourceViewTabSetting;
    constructor(requestOrElement, view = REQUEST_VIEW_DEFAULT_VIEW) {
        super(requestOrElement instanceof HTMLElement ? requestOrElement : undefined);
        this.#view = view;
        this.#resourceViewTabSetting =
            Common.Settings.Settings.instance().createSetting('cache-storage-view-tab', 'preview');
        if (requestOrElement && !(requestOrElement instanceof HTMLElement)) {
            this.request = requestOrElement;
        }
    }
    set request(request) {
        if (this.#request === request) {
            return;
        }
        this.#request = request;
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    performUpdate() {
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
        }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=ServiceWorkerCacheViews.js.map