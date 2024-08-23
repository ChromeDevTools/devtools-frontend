// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ApplicationPanelTreeElement, ExpandableApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import {type ResourcesPanel} from './ResourcesPanel.js';
import {ServiceWorkerCacheView} from './ServiceWorkerCacheViews.js';

const UIStrings = {
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  cacheStorage: 'Cache storage',
  /**
   *@description A context menu item in the Application Panel Sidebar of the Application panel
   */
  refreshCaches: 'Refresh Caches',
  /**
   *@description Text to delete something
   */
  delete: 'Delete',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/ServiceWorkerCacheTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ServiceWorkerCacheTreeElement extends ExpandableApplicationPanelTreeElement {
  private swCacheModels: Set<SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel>;
  private swCacheTreeElements: Set<SWCacheTreeElement>;
  private storageBucket?: Protocol.Storage.StorageBucket;

  constructor(resourcesPanel: ResourcesPanel, storageBucket?: Protocol.Storage.StorageBucket) {
    super(resourcesPanel, i18nString(UIStrings.cacheStorage), 'cache-storage');
    const icon = IconButton.Icon.create('database');
    this.setLink(
        'https://developer.chrome.com/docs/devtools/storage/cache/?utm_source=devtools' as
        Platform.DevToolsPath.UrlString);
    this.setLeadingIcons([icon]);
    this.swCacheModels = new Set();
    this.swCacheTreeElements = new Set();
    this.storageBucket = storageBucket;
  }

  initialize(): void {
    this.swCacheModels.clear();
    this.swCacheTreeElements.clear();
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel, {
      modelAdded: (model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel) =>
          this.serviceWorkerCacheModelAdded(model),
      modelRemoved: (model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel) =>
          this.serviceWorkerCacheModelRemoved(model),
    });
  }

  override onattach(): void {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);
  }

  private handleContextMenuEvent(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.refreshCaches), this.refreshCaches.bind(this), {jslogContext: 'refresh-caches'});
    void contextMenu.show();
  }

  private refreshCaches(): void {
    for (const swCacheModel of this.swCacheModels) {
      swCacheModel.refreshCacheNames();
    }
  }

  private serviceWorkerCacheModelAdded(model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel): void {
    model.enable();
    this.swCacheModels.add(model);
    for (const cache of model.caches()) {
      this.addCache(model, cache);
    }
    model.addEventListener(SDK.ServiceWorkerCacheModel.Events.CACHE_ADDED, this.cacheAdded, this);
    model.addEventListener(SDK.ServiceWorkerCacheModel.Events.CACHE_REMOVED, this.cacheRemoved, this);
  }

  private serviceWorkerCacheModelRemoved(model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel): void {
    for (const cache of model.caches()) {
      this.removeCache(model, cache);
    }
    model.removeEventListener(SDK.ServiceWorkerCacheModel.Events.CACHE_ADDED, this.cacheAdded, this);
    model.removeEventListener(SDK.ServiceWorkerCacheModel.Events.CACHE_REMOVED, this.cacheRemoved, this);
    this.swCacheModels.delete(model);
  }

  private cacheAdded(event: Common.EventTarget.EventTargetEvent<SDK.ServiceWorkerCacheModel.CacheEvent>): void {
    const {model, cache} = event.data;
    this.addCache(model, cache);
  }

  private cacheInTree(cache: SDK.ServiceWorkerCacheModel.Cache): boolean {
    if (this.storageBucket) {
      return cache.inBucket(this.storageBucket);
    }
    return true;
  }

  private addCache(
      model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel, cache: SDK.ServiceWorkerCacheModel.Cache): void {
    if (this.cacheInTree(cache)) {
      const swCacheTreeElement =
          new SWCacheTreeElement(this.resourcesPanel, model, cache, this.storageBucket === undefined);
      this.swCacheTreeElements.add(swCacheTreeElement);
      this.appendChild(swCacheTreeElement);
    }
  }

  private cacheRemoved(event: Common.EventTarget.EventTargetEvent<SDK.ServiceWorkerCacheModel.CacheEvent>): void {
    const {model, cache} = event.data;
    if (this.cacheInTree(cache)) {
      this.removeCache(model, cache);
    }
  }

  private removeCache(
      model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel, cache: SDK.ServiceWorkerCacheModel.Cache): void {
    const swCacheTreeElement = this.cacheTreeElement(model, cache);
    if (!swCacheTreeElement) {
      return;
    }

    this.removeChild(swCacheTreeElement);
    this.swCacheTreeElements.delete(swCacheTreeElement);
    this.setExpandable(this.childCount() > 0);
  }

  private cacheTreeElement(
      model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel,
      cache: SDK.ServiceWorkerCacheModel.Cache): SWCacheTreeElement|null {
    for (const cacheTreeElement of this.swCacheTreeElements) {
      if (cacheTreeElement.hasModelAndCache(model, cache)) {
        return cacheTreeElement;
      }
    }
    return null;
  }
}

export class SWCacheTreeElement extends ApplicationPanelTreeElement {
  private readonly model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel;
  private cache: SDK.ServiceWorkerCacheModel.Cache;
  private view: ServiceWorkerCacheView|null;

  constructor(
      resourcesPanel: ResourcesPanel, model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel,
      cache: SDK.ServiceWorkerCacheModel.Cache, appendStorageKey: boolean) {
    let cacheName;
    if (appendStorageKey) {
      cacheName = cache.cacheName + ' - ' + cache.storageKey;
    } else {
      cacheName = cache.cacheName;
    }
    super(resourcesPanel, cacheName, false, 'cache-storage-instance');
    this.model = model;
    this.cache = cache;
    this.view = null;
    const icon = IconButton.Icon.create('table');
    this.setLeadingIcons([icon]);
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    // I don't think this will work at all.
    return 'cache://' + this.cache.cacheId as Platform.DevToolsPath.UrlString;
  }

  override onattach(): void {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);
  }

  private handleContextMenuEvent(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.delete), this.clearCache.bind(this), {jslogContext: 'delete'});
    void contextMenu.show();
  }

  private clearCache(): void {
    void this.model.deleteCache(this.cache);
  }

  update(cache: SDK.ServiceWorkerCacheModel.Cache): void {
    this.cache = cache;
    if (this.view) {
      this.view.update(cache);
    }
  }

  override onselect(selectedByUser: boolean|undefined): boolean {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new ServiceWorkerCacheView(this.model, this.cache);
    }

    this.showView(this.view);
    Host.userMetrics.panelShown('service-worker-cache');
    return false;
  }

  hasModelAndCache(
      model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel, cache: SDK.ServiceWorkerCacheModel.Cache): boolean {
    return this.cache.equals(cache) && this.model === model;
  }
}
