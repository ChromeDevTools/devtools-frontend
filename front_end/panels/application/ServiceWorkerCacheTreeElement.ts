// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Host from '../../core/host/host.js';

import {ApplicationPanelTreeElement, ExpandableApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import {type ResourcesPanel} from './ResourcesPanel.js';
import {ServiceWorkerCacheView} from './ServiceWorkerCacheViews.js';

const UIStrings = {
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  cacheStorage: 'Cache Storage',
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

  constructor(resourcesPanel: ResourcesPanel) {
    super(resourcesPanel, i18nString(UIStrings.cacheStorage), 'CacheStorage');
    const icon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLink(
        'https://developer.chrome.com/docs/devtools/storage/cache/?utm_source=devtools' as
        Platform.DevToolsPath.UrlString);
    this.setLeadingIcons([icon]);
    this.swCacheModels = new Set();
    this.swCacheTreeElements = new Set();
  }

  initialize(): void {
    this.swCacheModels.clear();
    this.swCacheTreeElements.clear();
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel, {
      modelAdded: (model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel): void =>
          this.serviceWorkerCacheModelAdded(model),
      modelRemoved: (model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel): void =>
          this.serviceWorkerCacheModelRemoved(model),
    });
  }

  onattach(): void {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);
  }

  private handleContextMenuEvent(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.refreshCaches), this.refreshCaches.bind(this));
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
    model.addEventListener(SDK.ServiceWorkerCacheModel.Events.CacheAdded, this.cacheAdded, this);
    model.addEventListener(SDK.ServiceWorkerCacheModel.Events.CacheRemoved, this.cacheRemoved, this);
  }

  private serviceWorkerCacheModelRemoved(model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel): void {
    for (const cache of model.caches()) {
      this.removeCache(model, cache);
    }
    model.removeEventListener(SDK.ServiceWorkerCacheModel.Events.CacheAdded, this.cacheAdded, this);
    model.removeEventListener(SDK.ServiceWorkerCacheModel.Events.CacheRemoved, this.cacheRemoved, this);
    this.swCacheModels.delete(model);
  }

  private cacheAdded(event: Common.EventTarget.EventTargetEvent<SDK.ServiceWorkerCacheModel.CacheEvent>): void {
    const {model, cache} = event.data;
    this.addCache(model, cache);
  }

  private addCache(
      model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel, cache: SDK.ServiceWorkerCacheModel.Cache): void {
    const swCacheTreeElement = new SWCacheTreeElement(this.resourcesPanel, model, cache);
    this.swCacheTreeElements.add(swCacheTreeElement);
    this.appendChild(swCacheTreeElement);
  }

  private cacheRemoved(event: Common.EventTarget.EventTargetEvent<SDK.ServiceWorkerCacheModel.CacheEvent>): void {
    const {model, cache} = event.data;
    this.removeCache(model, cache);
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
      cache: SDK.ServiceWorkerCacheModel.Cache) {
    super(resourcesPanel, cache.cacheName + ' - ' + cache.storageKey, false);
    this.model = model;
    this.cache = cache;
    this.view = null;
    const icon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL(): Platform.DevToolsPath.UrlString {
    // I don't think this will work at all.
    return 'cache://' + this.cache.cacheId as Platform.DevToolsPath.UrlString;
  }

  onattach(): void {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);
  }

  private handleContextMenuEvent(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.delete), this.clearCache.bind(this));
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

  onselect(selectedByUser: boolean|undefined): boolean {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new ServiceWorkerCacheView(this.model, this.cache);
    }

    this.showView(this.view);
    Host.userMetrics.panelShown(Host.UserMetrics.PanelCodes[Host.UserMetrics.PanelCodes.service_worker_cache]);
    return false;
  }

  hasModelAndCache(
      model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel, cache: SDK.ServiceWorkerCacheModel.Cache): boolean {
    return this.cache.equals(cache) && this.model === model;
  }
}
