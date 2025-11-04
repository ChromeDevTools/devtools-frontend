// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ApplicationPanelTreeElement, ExpandableApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import { ServiceWorkerCacheView } from './ServiceWorkerCacheViews.js';
const UIStrings = {
    /**
     * @description Text in Application Panel Sidebar of the Application panel
     */
    cacheStorage: 'Cache storage',
    /**
     * @description Text in Application Panel if no cache storage was detected.
     */
    noCacheStorage: 'No cache storage detected',
    /**
     * @description Description text in Application Panel describing the cache storage tab
     */
    cacheStorageDescription: 'On this page you can view and delete cache data.',
    /**
     * @description A context menu item in the Application Panel Sidebar of the Application panel
     */
    refreshCaches: 'Refresh Caches',
    /**
     * @description Text to delete something
     */
    delete: 'Delete',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/ServiceWorkerCacheTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ServiceWorkerCacheTreeElement extends ExpandableApplicationPanelTreeElement {
    swCacheModels;
    swCacheTreeElements;
    storageBucket;
    constructor(resourcesPanel, storageBucket) {
        super(resourcesPanel, i18nString(UIStrings.cacheStorage), i18nString(UIStrings.noCacheStorage), i18nString(UIStrings.cacheStorageDescription), 'cache-storage');
        const icon = IconButton.Icon.create('database');
        this.setLink('https://developer.chrome.com/docs/devtools/storage/cache/');
        this.setLeadingIcons([icon]);
        this.swCacheModels = new Set();
        this.swCacheTreeElements = new Set();
        this.storageBucket = storageBucket;
    }
    initialize() {
        this.swCacheModels.clear();
        this.swCacheTreeElements.clear();
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel, {
            modelAdded: (model) => this.serviceWorkerCacheModelAdded(model),
            modelRemoved: (model) => this.serviceWorkerCacheModelRemoved(model),
        });
    }
    onattach() {
        super.onattach();
        this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);
    }
    handleContextMenuEvent(event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.defaultSection().appendItem(i18nString(UIStrings.refreshCaches), this.refreshCaches.bind(this), { jslogContext: 'refresh-caches' });
        void contextMenu.show();
    }
    refreshCaches() {
        for (const swCacheModel of this.swCacheModels) {
            swCacheModel.refreshCacheNames();
        }
    }
    serviceWorkerCacheModelAdded(model) {
        model.enable();
        this.swCacheModels.add(model);
        for (const cache of model.caches()) {
            this.addCache(model, cache);
        }
        model.addEventListener("CacheAdded" /* SDK.ServiceWorkerCacheModel.Events.CACHE_ADDED */, this.cacheAdded, this);
        model.addEventListener("CacheRemoved" /* SDK.ServiceWorkerCacheModel.Events.CACHE_REMOVED */, this.cacheRemoved, this);
    }
    serviceWorkerCacheModelRemoved(model) {
        for (const cache of model.caches()) {
            this.removeCache(model, cache);
        }
        model.removeEventListener("CacheAdded" /* SDK.ServiceWorkerCacheModel.Events.CACHE_ADDED */, this.cacheAdded, this);
        model.removeEventListener("CacheRemoved" /* SDK.ServiceWorkerCacheModel.Events.CACHE_REMOVED */, this.cacheRemoved, this);
        this.swCacheModels.delete(model);
    }
    cacheAdded(event) {
        const { model, cache } = event.data;
        this.addCache(model, cache);
    }
    cacheInTree(cache) {
        if (this.storageBucket) {
            return cache.inBucket(this.storageBucket);
        }
        return true;
    }
    addCache(model, cache) {
        if (this.cacheInTree(cache)) {
            const swCacheTreeElement = new SWCacheTreeElement(this.resourcesPanel, model, cache, this.storageBucket === undefined);
            this.swCacheTreeElements.add(swCacheTreeElement);
            this.appendChild(swCacheTreeElement);
        }
    }
    cacheRemoved(event) {
        const { model, cache } = event.data;
        if (this.cacheInTree(cache)) {
            this.removeCache(model, cache);
        }
    }
    removeCache(model, cache) {
        const swCacheTreeElement = this.cacheTreeElement(model, cache);
        if (!swCacheTreeElement) {
            return;
        }
        this.removeChild(swCacheTreeElement);
        this.swCacheTreeElements.delete(swCacheTreeElement);
        this.setExpandable(this.childCount() > 0);
    }
    cacheTreeElement(model, cache) {
        for (const cacheTreeElement of this.swCacheTreeElements) {
            if (cacheTreeElement.hasModelAndCache(model, cache)) {
                return cacheTreeElement;
            }
        }
        return null;
    }
}
export class SWCacheTreeElement extends ApplicationPanelTreeElement {
    model;
    cache;
    view;
    constructor(resourcesPanel, model, cache, appendStorageKey) {
        let cacheName;
        if (appendStorageKey) {
            cacheName = cache.cacheName + ' - ' + cache.storageKey;
        }
        else {
            cacheName = cache.cacheName;
        }
        super(resourcesPanel, cacheName, false, 'cache-storage-instance');
        this.model = model;
        this.cache = cache;
        this.view = null;
        const icon = IconButton.Icon.create('table');
        this.setLeadingIcons([icon]);
    }
    get itemURL() {
        // I don't think this will work at all.
        return 'cache://' + this.cache.cacheId;
    }
    onattach() {
        super.onattach();
        this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);
    }
    handleContextMenuEvent(event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.defaultSection().appendItem(i18nString(UIStrings.delete), this.clearCache.bind(this), { jslogContext: 'delete' });
        void contextMenu.show();
    }
    clearCache() {
        void this.model.deleteCache(this.cache);
    }
    update(cache) {
        this.cache = cache;
        if (this.view) {
            this.view.update(cache);
        }
    }
    onselect(selectedByUser) {
        super.onselect(selectedByUser);
        if (!this.view) {
            this.view = new ServiceWorkerCacheView(this.model, this.cache);
        }
        this.showView(this.view);
        Host.userMetrics.panelShown('service-worker-cache');
        return false;
    }
    hasModelAndCache(model, cache) {
        return this.cache.equals(cache) && this.model === model;
    }
}
//# sourceMappingURL=ServiceWorkerCacheTreeElement.js.map