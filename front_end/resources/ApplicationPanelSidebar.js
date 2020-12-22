/*
 * Copyright (C) 2007, 2008, 2010 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 * Copyright (C) 2013 Samsung Electronics. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as SDK from '../sdk/sdk.js';
import * as SourceFrame from '../source_frame/source_frame.js';
import * as UI from '../ui/ui.js';

import {ApplicationCacheItemsView} from './ApplicationCacheItemsView.js';
import {ApplicationCacheModel, Events as ApplicationCacheModelEvents} from './ApplicationCacheModel.js';
import {ApplicationCacheFrameTreeElement, ApplicationCacheManifestTreeElement, ServiceWorkerCacheTreeElement} from './ApplicationPanelCacheSection.js';
import {ApplicationPanelTreeElement, ExpandableApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import {AppManifestView} from './AppManifestView.js';
import {BackgroundServiceModel} from './BackgroundServiceModel.js';
import {BackgroundServiceView} from './BackgroundServiceView.js';
import {ClearStorageView} from './ClearStorageView.js';
import {Database as DatabaseModelDatabase, DatabaseModel, Events as DatabaseModelEvents} from './DatabaseModel.js';  // eslint-disable-line no-unused-vars
import {DatabaseQueryView, Events as DatabaseQueryViewEvents} from './DatabaseQueryView.js';
import {DatabaseTableView} from './DatabaseTableView.js';
import {DOMStorage, DOMStorageModel, Events as DOMStorageModelEvents} from './DOMStorageModel.js';  // eslint-disable-line no-unused-vars
import {FrameDetailsView} from './FrameDetailsView.js';
import {Database as IndexedDBModelDatabase, DatabaseId, Events as IndexedDBModelEvents, Index, IndexedDBModel, ObjectStore} from './IndexedDBModel.js';  // eslint-disable-line no-unused-vars
import {IDBDatabaseView, IDBDataView} from './IndexedDBViews.js';
import {OpenedWindowDetailsView, WorkerDetailsView} from './OpenedWindowDetailsView.js';
import {ResourcesPanel} from './ResourcesPanel.js';  // eslint-disable-line no-unused-vars
import {ServiceWorkersView} from './ServiceWorkersView.js';
import {TrustTokensTreeElement} from './TrustTokensView.js';

/**
 * @implements {SDK.SDKModel.Observer}
 */
export class ApplicationPanelSidebar extends UI.Widget.VBox {
  /**
   * @param {!ResourcesPanel} panel
   */
  constructor(panel) {
    super();

    this._panel = panel;

    /** @type {!Map<!Protocol.Page.FrameId, !ApplicationCacheItemsView>} */
    this._applicationCacheViews = new Map();
    /** @type {!Map<!Protocol.Page.FrameId, !ApplicationCacheFrameTreeElement>} */
    this._applicationCacheFrameElements = new Map();
    /** @type {!Map<!Protocol.Page.FrameId, !ApplicationCacheManifestTreeElement>} */
    this._applicationCacheManifestElements = new Map();

    this._sidebarTree = new UI.TreeOutline.TreeOutlineInShadow();
    this._sidebarTree.element.classList.add('resources-sidebar');
    this._sidebarTree.registerRequiredCSS('resources/resourcesSidebar.css', {enableLegacyPatching: true});
    this._sidebarTree.element.classList.add('filter-all');
    // Listener needs to have been set up before the elements are added
    this._sidebarTree.addEventListener(UI.TreeOutline.Events.ElementAttached, this._treeElementAdded, this);

    this.contentElement.appendChild(this._sidebarTree.element);

    const applicationSectionTitle = ls`Application`;
    this._applicationTreeElement = this._addSidebarSection(applicationSectionTitle);
    const manifestTreeElement = new AppManifestTreeElement(panel);
    this._applicationTreeElement.appendChild(manifestTreeElement);
    this.serviceWorkersTreeElement = new ServiceWorkersTreeElement(panel);
    this._applicationTreeElement.appendChild(this.serviceWorkersTreeElement);
    const clearStorageTreeElement = new ClearStorageTreeElement(panel);
    this._applicationTreeElement.appendChild(clearStorageTreeElement);

    const storageSectionTitle = ls`Storage`;
    const storageTreeElement = this._addSidebarSection(storageSectionTitle);
    this.localStorageListTreeElement =
        new ExpandableApplicationPanelTreeElement(panel, Common.UIString.UIString('Local Storage'), 'LocalStorage');
    this.localStorageListTreeElement.setLink(
        'https://developers.google.com/web/tools/chrome-devtools/storage/localstorage?utm_source=devtools');
    const localStorageIcon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.localStorageListTreeElement.setLeadingIcons([localStorageIcon]);

    storageTreeElement.appendChild(this.localStorageListTreeElement);
    this.sessionStorageListTreeElement =
        new ExpandableApplicationPanelTreeElement(panel, Common.UIString.UIString('Session Storage'), 'SessionStorage');
    this.sessionStorageListTreeElement.setLink(
        'https://developers.google.com/web/tools/chrome-devtools/storage/sessionstorage?utm_source=devtools');
    const sessionStorageIcon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.sessionStorageListTreeElement.setLeadingIcons([sessionStorageIcon]);

    storageTreeElement.appendChild(this.sessionStorageListTreeElement);
    this.indexedDBListTreeElement = new IndexedDBTreeElement(panel);
    this.indexedDBListTreeElement.setLink(
        'https://developers.google.com/web/tools/chrome-devtools/storage/indexeddb?utm_source=devtools');
    storageTreeElement.appendChild(this.indexedDBListTreeElement);
    this.databasesListTreeElement =
        new ExpandableApplicationPanelTreeElement(panel, Common.UIString.UIString('Web SQL'), 'Databases');
    this.databasesListTreeElement.setLink(
        'https://developers.google.com/web/tools/chrome-devtools/storage/websql?utm_source=devtools');
    const databaseIcon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.databasesListTreeElement.setLeadingIcons([databaseIcon]);

    storageTreeElement.appendChild(this.databasesListTreeElement);
    this.cookieListTreeElement =
        new ExpandableApplicationPanelTreeElement(panel, Common.UIString.UIString('Cookies'), 'Cookies');
    this.cookieListTreeElement.setLink(
        'https://developers.google.com/web/tools/chrome-devtools/storage/cookies?utm_source=devtools');
    const cookieIcon = UI.Icon.Icon.create('mediumicon-cookie', 'resource-tree-item');
    this.cookieListTreeElement.setLeadingIcons([cookieIcon]);
    storageTreeElement.appendChild(this.cookieListTreeElement);

    this.trustTokensTreeElement = new TrustTokensTreeElement(panel);
    storageTreeElement.appendChild(this.trustTokensTreeElement);

    const cacheSectionTitle = ls`Cache`;
    const cacheTreeElement = this._addSidebarSection(cacheSectionTitle);
    this.cacheStorageListTreeElement = new ServiceWorkerCacheTreeElement(panel);
    cacheTreeElement.appendChild(this.cacheStorageListTreeElement);
    this.applicationCacheListTreeElement = new ExpandableApplicationPanelTreeElement(
        panel, Common.UIString.UIString('Application Cache'), 'ApplicationCache');
    this.applicationCacheListTreeElement.setLink(
        'https://developers.google.com/web/tools/chrome-devtools/storage/applicationcache?utm_source=devtools');
    const applicationCacheIcon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.applicationCacheListTreeElement.setLeadingIcons([applicationCacheIcon]);

    cacheTreeElement.appendChild(this.applicationCacheListTreeElement);

    if (Root.Runtime.experiments.isEnabled('backgroundServices')) {
      const backgroundServiceSectionTitle = ls`Background Services`;
      const backgroundServiceTreeElement = this._addSidebarSection(backgroundServiceSectionTitle);

      this.backgroundFetchTreeElement =
          new BackgroundServiceTreeElement(panel, Protocol.BackgroundService.ServiceName.BackgroundFetch);
      backgroundServiceTreeElement.appendChild(this.backgroundFetchTreeElement);
      this.backgroundSyncTreeElement =
          new BackgroundServiceTreeElement(panel, Protocol.BackgroundService.ServiceName.BackgroundSync);
      backgroundServiceTreeElement.appendChild(this.backgroundSyncTreeElement);

      if (Root.Runtime.experiments.isEnabled('backgroundServicesNotifications')) {
        this.notificationsTreeElement =
            new BackgroundServiceTreeElement(panel, Protocol.BackgroundService.ServiceName.Notifications);
        backgroundServiceTreeElement.appendChild(this.notificationsTreeElement);
      }
      if (Root.Runtime.experiments.isEnabled('backgroundServicesPaymentHandler')) {
        this.paymentHandlerTreeElement =
            new BackgroundServiceTreeElement(panel, Protocol.BackgroundService.ServiceName.PaymentHandler);
        backgroundServiceTreeElement.appendChild(this.paymentHandlerTreeElement);
      }
      this.periodicBackgroundSyncTreeElement =
          new BackgroundServiceTreeElement(panel, Protocol.BackgroundService.ServiceName.PeriodicBackgroundSync);
      backgroundServiceTreeElement.appendChild(this.periodicBackgroundSyncTreeElement);
      if (Root.Runtime.experiments.isEnabled('backgroundServicesPushMessaging')) {
        this.pushMessagingTreeElement =
            new BackgroundServiceTreeElement(panel, Protocol.BackgroundService.ServiceName.PushMessaging);
        backgroundServiceTreeElement.appendChild(this.pushMessagingTreeElement);
      }
    }
    const resourcesSectionTitle = ls`Frames`;
    const resourcesTreeElement = this._addSidebarSection(resourcesSectionTitle);
    this._resourcesSection = new ResourcesSection(panel, resourcesTreeElement);

    /** @type {!Map.<!DatabaseModelDatabase, !Object.<string, !DatabaseTableView>>} */
    this._databaseTableViews = new Map();
    /** @type {!Map.<!DatabaseModelDatabase, !DatabaseQueryView>} */
    this._databaseQueryViews = new Map();
    /** @type {!Map.<!DatabaseModelDatabase, !DatabaseTreeElement>} */
    this._databaseTreeElements = new Map();
    /** @type {!Map.<!DOMStorage, !DOMStorageTreeElement>} */
    this._domStorageTreeElements = new Map();
    /** @type {!Object.<string, boolean>} */
    this._domains = {};

    this._sidebarTree.contentElement.addEventListener('mousemove', this._onmousemove.bind(this), false);
    this._sidebarTree.contentElement.addEventListener('mouseleave', this._onmouseleave.bind(this), false);

    SDK.SDKModel.TargetManager.instance().observeTargets(this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this._frameNavigated,
        this);

    const selection = this._panel.lastSelectedItemPath();
    if (!selection.length) {
      manifestTreeElement.select();
    }
  }

  /**
   * @param {string} title
   * @return {!UI.TreeOutline.TreeElement}
   */
  _addSidebarSection(title) {
    const treeElement = new UI.TreeOutline.TreeElement(title, true);
    treeElement.listItemElement.classList.add('storage-group-list-item');
    treeElement.setCollapsible(false);
    treeElement.selectable = false;
    this._sidebarTree.appendChild(treeElement);
    UI.ARIAUtils.setAccessibleName(treeElement.childrenListElement, title);
    return treeElement;
  }

  /**
   * @override
   * @param {!SDK.SDKModel.Target} target
   */
  targetAdded(target) {
    if (this._target) {
      return;
    }
    this._target = target;
    this._databaseModel = target.model(DatabaseModel);
    if (this._databaseModel) {
      this._databaseModel.addEventListener(DatabaseModelEvents.DatabaseAdded, this._databaseAdded, this);
      this._databaseModel.addEventListener(DatabaseModelEvents.DatabasesRemoved, this._resetWebSQL, this);
    }

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      return;
    }

    if (resourceTreeModel.cachedResourcesLoaded()) {
      this._initialize();
    }

    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded, this._initialize, this);
    resourceTreeModel.addEventListener(
        SDK.ResourceTreeModel.Events.WillLoadCachedResources, this._resetWithFrames, this);
  }

  /**
   * @override
   * @param {!SDK.SDKModel.Target} target
   */
  targetRemoved(target) {
    if (target !== this._target) {
      return;
    }
    delete this._target;

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel) {
      resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded, this._initialize, this);
      resourceTreeModel.removeEventListener(
          SDK.ResourceTreeModel.Events.WillLoadCachedResources, this._resetWithFrames, this);
    }
    if (this._databaseModel) {
      this._databaseModel.removeEventListener(DatabaseModelEvents.DatabaseAdded, this._databaseAdded, this);
      this._databaseModel.removeEventListener(DatabaseModelEvents.DatabasesRemoved, this._resetWebSQL, this);
      this._databaseModel = null;
    }

    this._resetWithFrames();
  }

  /**
   * @override
   */
  focus() {
    this._sidebarTree.focus();
  }

  _initialize() {
    for (const frame of SDK.ResourceTreeModel.ResourceTreeModel.frames()) {
      this._addCookieDocument(frame);
    }
    if (this._databaseModel) {
      this._databaseModel.enable();
    }

    const cacheStorageModel = this._target && this._target.model(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel);
    if (cacheStorageModel) {
      cacheStorageModel.enable();
    }
    const resourceTreeModel = this._target && this._target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel) {
      this._populateApplicationCacheTree(resourceTreeModel);
    }
    SDK.SDKModel.TargetManager.instance().observeModels(
        DOMStorageModel, /** @type {!SDK.SDKModel.SDKModelObserver<!DOMStorageModel>} */ ({
          modelAdded: model => this._domStorageModelAdded(model),
          modelRemoved: model => this._domStorageModelRemoved(model)
        }));
    this.indexedDBListTreeElement._initialize();
    SDK.SDKModel.TargetManager.instance().observeModels(
        IndexedDBModel, /** @type {!SDK.SDKModel.SDKModelObserver<!IndexedDBModel>} */ ({
          modelAdded: model => model.enable(),
          modelRemoved: model => this.indexedDBListTreeElement.removeIndexedDBForModel(model)
        }));
    const serviceWorkerCacheModel =
        this._target && this._target.model(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel) || null;
    this.cacheStorageListTreeElement.initialize(serviceWorkerCacheModel);
    const backgroundServiceModel = this._target && this._target.model(BackgroundServiceModel) || null;
    if (Root.Runtime.experiments.isEnabled('backgroundServices')) {
      this.backgroundFetchTreeElement && this.backgroundFetchTreeElement._initialize(backgroundServiceModel);
      this.backgroundSyncTreeElement && this.backgroundSyncTreeElement._initialize(backgroundServiceModel);
      if (Root.Runtime.experiments.isEnabled('backgroundServicesNotifications') && this.notificationsTreeElement) {
        this.notificationsTreeElement._initialize(backgroundServiceModel);
      }
      if (Root.Runtime.experiments.isEnabled('backgroundServicesPaymentHandler') && this.paymentHandlerTreeElement) {
        this.paymentHandlerTreeElement._initialize(backgroundServiceModel);
      }
      this.periodicBackgroundSyncTreeElement &&
          this.periodicBackgroundSyncTreeElement._initialize(backgroundServiceModel);
      if (Root.Runtime.experiments.isEnabled('backgroundServicesPushMessaging') && this.pushMessagingTreeElement) {
        this.pushMessagingTreeElement._initialize(backgroundServiceModel);
      }
    }
  }

  /**
   * @param {!DOMStorageModel} model
   */
  _domStorageModelAdded(model) {
    model.enable();
    model.storages().forEach(this._addDOMStorage.bind(this));
    model.addEventListener(DOMStorageModelEvents.DOMStorageAdded, this._domStorageAdded, this);
    model.addEventListener(DOMStorageModelEvents.DOMStorageRemoved, this._domStorageRemoved, this);
  }

  /**
   * @param {!DOMStorageModel} model
   */
  _domStorageModelRemoved(model) {
    model.storages().forEach(this._removeDOMStorage.bind(this));
    model.removeEventListener(DOMStorageModelEvents.DOMStorageAdded, this._domStorageAdded, this);
    model.removeEventListener(DOMStorageModelEvents.DOMStorageRemoved, this._domStorageRemoved, this);
  }

  _resetWithFrames() {
    this._resourcesSection.reset();
    this._reset();
  }

  _resetWebSQL() {
    for (const queryView of this._databaseQueryViews.values()) {
      queryView.removeEventListener(DatabaseQueryViewEvents.SchemaUpdated, event => {
        this._updateDatabaseTables(event);
      }, this);
    }
    this._databaseTableViews.clear();
    this._databaseQueryViews.clear();
    this._databaseTreeElements.clear();
    this.databasesListTreeElement.removeChildren();
    this.databasesListTreeElement.setExpandable(false);
  }

  _resetAppCache() {
    for (const frameId of this._applicationCacheFrameElements.keys()) {
      this._applicationCacheFrameManifestRemoved({data: frameId});
    }
    this.applicationCacheListTreeElement.setExpandable(false);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _treeElementAdded(event) {
    // On tree item selection its itemURL and those of its parents are persisted.
    // On reload/navigation we check for matches starting from the root on the
    // path to the current element. Matching nodes are expanded until we hit a
    // mismatch. This way we ensure that the longest matching path starting from
    // the root is expanded, even if we cannot match the whole path.
    const selection = this._panel.lastSelectedItemPath();
    if (!selection.length) {
      return;
    }
    const element = event.data;
    const elementPath = [element];
    for (let parent = element.parent; parent && parent.itemURL; parent = parent.parent) {
      elementPath.push(parent);
    }

    let i = selection.length - 1;
    let j = elementPath.length - 1;
    while (i >= 0 && j >= 0 && selection[i] === elementPath[j].itemURL) {
      if (!elementPath[j].expanded) {
        if (i > 0) {
          elementPath[j].expand();
        }
        if (!elementPath[j].selected) {
          elementPath[j].select();
        }
      }
      i--;
      j--;
    }
  }

  _reset() {
    this._domains = {};
    this._resetWebSQL();
    this.cookieListTreeElement.removeChildren();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _frameNavigated(event) {
    const frame = /** @type {!SDK.ResourceTreeModel.ResourceTreeFrame} */ (event.data);

    if (frame.isTopFrame()) {
      this._reset();
    }

    const applicationCacheFrameTreeElement = this._applicationCacheFrameElements.get(frame.id);
    if (applicationCacheFrameTreeElement) {
      applicationCacheFrameTreeElement.frameNavigated(frame);
    }
    this._addCookieDocument(frame);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _databaseAdded(event) {
    const database = /** @type {!DatabaseModelDatabase} */ (event.data);
    const databaseTreeElement = new DatabaseTreeElement(this, database);
    this._databaseTreeElements.set(database, databaseTreeElement);
    this.databasesListTreeElement.appendChild(databaseTreeElement);
  }

  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   */
  _addCookieDocument(frame) {
    // In case the current frame was unreachable, show it's cookies
    // instead of the error interstitials because they might help to
    // debug why the frame was unreachable.
    const urlToParse = frame.unreachableUrl() || frame.url;
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(urlToParse);
    if (!parsedURL || (parsedURL.scheme !== 'http' && parsedURL.scheme !== 'https' && parsedURL.scheme !== 'file')) {
      return;
    }

    const domain = parsedURL.securityOrigin();
    if (!this._domains[domain]) {
      this._domains[domain] = true;
      const cookieDomainTreeElement = new CookieTreeElement(this._panel, frame, domain);
      this.cookieListTreeElement.appendChild(cookieDomainTreeElement);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _domStorageAdded(event) {
    const domStorage = /** @type {!DOMStorage} */ (event.data);
    this._addDOMStorage(domStorage);
  }

  /**
   * @param {!DOMStorage} domStorage
   */
  _addDOMStorage(domStorage) {
    console.assert(!this._domStorageTreeElements.get(domStorage));

    const domStorageTreeElement = new DOMStorageTreeElement(this._panel, domStorage);
    this._domStorageTreeElements.set(domStorage, domStorageTreeElement);
    if (domStorage.isLocalStorage) {
      this.localStorageListTreeElement.appendChild(domStorageTreeElement);
    } else {
      this.sessionStorageListTreeElement.appendChild(domStorageTreeElement);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _domStorageRemoved(event) {
    const domStorage = /** @type {!DOMStorage} */ (event.data);
    this._removeDOMStorage(domStorage);
  }

  /**
   * @param {!DOMStorage} domStorage
   */
  _removeDOMStorage(domStorage) {
    const treeElement = this._domStorageTreeElements.get(domStorage);
    if (!treeElement) {
      return;
    }
    const wasSelected = treeElement.selected;
    const parentListTreeElement = treeElement.parent;
    if (parentListTreeElement) {
      parentListTreeElement.removeChild(treeElement);
      if (wasSelected) {
        parentListTreeElement.select();
      }
    }
    this._domStorageTreeElements.delete(domStorage);
  }

  /**
   * @param {!DatabaseModelDatabase} database
   */
  selectDatabase(database) {
    if (database) {
      this._showDatabase(database);
      const treeElement = this._databaseTreeElements.get(database);
      treeElement && treeElement.select();
    }
  }

  /**
   * @param {!SDK.Resource.Resource} resource
   * @param {number=} line
   * @param {number=} column
   * @return {!Promise<void>}
   */
  async showResource(resource, line, column) {
    await this._resourcesSection.revealResource(resource, line, column);
  }

  /**
   * @param {!DatabaseModelDatabase} database
   * @param {string=} tableName
   */
  _showDatabase(database, tableName) {
    if (!database) {
      return;
    }

    let view;
    if (tableName) {
      let tableViews = this._databaseTableViews.get(database);
      if (!tableViews) {
        tableViews = /** @type {!Object.<string, !DatabaseTableView>} */ ({});
        this._databaseTableViews.set(database, tableViews);
      }
      view = tableViews[tableName];
      if (!view) {
        view = new DatabaseTableView(database, tableName);
        tableViews[tableName] = view;
      }
    } else {
      view = this._databaseQueryViews.get(database);
      if (!view) {
        view = new DatabaseQueryView(database);
        this._databaseQueryViews.set(database, view);
        view.addEventListener(DatabaseQueryViewEvents.SchemaUpdated, event => {
          this._updateDatabaseTables(event);
        }, this);
      }
    }

    this._innerShowView(view);
  }

  /**
   * @param {!Protocol.Page.FrameId} frameId
   */
  _showApplicationCache(frameId) {
    if (!this._applicationCacheModel) {
      return;
    }
    let view = this._applicationCacheViews.get(frameId);
    if (!view) {
      view = new ApplicationCacheItemsView(this._applicationCacheModel, frameId);
      this._applicationCacheViews.set(frameId, view);
    }
    this._innerShowView(view);
  }

  /**
   *  @param {!UI.Widget.Widget} view
   */
  showFileSystem(view) {
    this._innerShowView(view);
  }

  /**
   * @param {!UI.Widget.Widget} view
   */
  _innerShowView(view) {
    this._panel.showView(view);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _updateDatabaseTables(event) {
    const database = /** @type {!DatabaseModelDatabase} */ (event.data);

    if (!database) {
      return;
    }

    const databasesTreeElement = this._databaseTreeElements.get(database);
    if (!databasesTreeElement) {
      return;
    }

    databasesTreeElement.invalidateChildren();
    const tableViews = this._databaseTableViews.get(database);

    if (!tableViews) {
      return;
    }

    /** @type {!Set<string>} */
    const tableNamesHash = new Set();
    const panel = this._panel;
    const tableNames = await database.tableNames();

    for (const tableName of tableNames) {
      tableNamesHash.add(tableName);
    }

    for (const tableName in tableViews) {
      if (!(tableNamesHash.has(tableName))) {
        if (panel.visibleView === tableViews[tableName]) {
          panel.showView(null);
        }
        delete tableViews[tableName];
      }
    }

    await databasesTreeElement.updateChildren();
  }

  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeModel} resourceTreeModel
   */
  _populateApplicationCacheTree(resourceTreeModel) {
    if (!this._target) {
      return;
    }
    this._applicationCacheModel = this._target.model(ApplicationCacheModel);
    if (!this._applicationCacheModel) {
      return;
    }
    this._applicationCacheModel.addEventListener(
        ApplicationCacheModelEvents.FrameManifestAdded, this._applicationCacheFrameManifestAdded, this);
    this._applicationCacheModel.addEventListener(
        ApplicationCacheModelEvents.FrameManifestRemoved, this._applicationCacheFrameManifestRemoved, this);
    this._applicationCacheModel.addEventListener(
        ApplicationCacheModelEvents.FrameManifestsReset, this._resetAppCache, this);

    this._applicationCacheModel.addEventListener(
        ApplicationCacheModelEvents.FrameManifestStatusUpdated, this._applicationCacheFrameManifestStatusChanged, this);
    this._applicationCacheModel.addEventListener(
        ApplicationCacheModelEvents.NetworkStateChanged, this._applicationCacheNetworkStateChanged, this);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _applicationCacheFrameManifestAdded(event) {
    const frameId = event.data;
    if (!this._applicationCacheModel || !this._target || frameId !== 'string') {
      return;
    }
    const manifestURL = this._applicationCacheModel.frameManifestURL(frameId);

    let manifestTreeElement = this._applicationCacheManifestElements.get(manifestURL);
    if (!manifestTreeElement) {
      manifestTreeElement = new ApplicationCacheManifestTreeElement(this._panel, manifestURL);
      this.applicationCacheListTreeElement.appendChild(manifestTreeElement);
      this._applicationCacheManifestElements.set(manifestURL, manifestTreeElement);
    }

    const model = this._target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const frame = model && model.frameForId(frameId);
    if (model && frame) {
      const frameTreeElement = new ApplicationCacheFrameTreeElement(this, frame, manifestURL);
      manifestTreeElement.appendChild(frameTreeElement);
      manifestTreeElement.expand();
      this._applicationCacheFrameElements.set(frameId, frameTreeElement);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _applicationCacheFrameManifestRemoved(event) {
    const frameId = /** @type {!Protocol.Page.FrameId} */ (event.data);
    const frameTreeElement = this._applicationCacheFrameElements.get(frameId);
    if (!frameTreeElement) {
      return;
    }

    const manifestURL = frameTreeElement.manifestURL;
    this._applicationCacheFrameElements.delete(frameId);
    this._applicationCacheViews.delete(frameId);
    frameTreeElement.parent && frameTreeElement.parent.removeChild(frameTreeElement);

    const manifestTreeElement = this._applicationCacheManifestElements.get(manifestURL);
    if (!manifestTreeElement || manifestTreeElement.childCount()) {
      return;
    }

    this._applicationCacheManifestElements.delete(manifestURL);
    manifestTreeElement.parent && manifestTreeElement.parent.removeChild(manifestTreeElement);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _applicationCacheFrameManifestStatusChanged(event) {
    if (!this._applicationCacheModel) {
      return;
    }
    const frameId = /** @type {!Protocol.Page.FrameId} */ (event.data);
    const status = this._applicationCacheModel.frameManifestStatus(frameId);

    const view = this._applicationCacheViews.get(frameId);
    if (view) {
      view.updateStatus(status);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _applicationCacheNetworkStateChanged(event) {
    const isNowOnline = /** @type {boolean} */ (event.data);

    for (const view of this._applicationCacheViews.values()) {
      view.updateNetworkState(isNowOnline);
    }
  }

  /**
   *
   * @param {!MouseEvent} event
   */
  _onmousemove(event) {
    const nodeUnderMouse = /** @type {!Node} */ (event.target);
    if (!nodeUnderMouse) {
      return;
    }

    const listNode = UI.UIUtils.enclosingNodeOrSelfWithNodeName(nodeUnderMouse, 'li');
    if (!listNode) {
      return;
    }

    const element = UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(listNode);
    if (this._previousHoveredElement === element) {
      return;
    }

    if (this._previousHoveredElement) {
      this._previousHoveredElement.hovered = false;
      delete this._previousHoveredElement;
    }

    if (element instanceof FrameTreeElement) {
      /** @type {!FrameTreeElement} */
      this._previousHoveredElement = element;
      element.hovered = true;
    }
  }

  /**
   * @param {!MouseEvent} event
   */
  _onmouseleave(event) {
    if (this._previousHoveredElement) {
      this._previousHoveredElement.hovered = false;
      delete this._previousHoveredElement;
    }
  }
}

export class BackgroundServiceTreeElement extends ApplicationPanelTreeElement {
  /**
   * @param {!ResourcesPanel} storagePanel
   * @param {!Protocol.BackgroundService.ServiceName} serviceName
   */
  constructor(storagePanel, serviceName) {
    super(storagePanel, BackgroundServiceView.getUIString(serviceName), false);

    /** @const {!Protocol.BackgroundService.ServiceName} */
    this._serviceName = serviceName;

    /** @type {boolean} Whether the element has been selected. */
    this._selected = false;

    /** @type {?BackgroundServiceView} */
    this._view = null;

    /** @private {?BackgroundServiceModel} */
    this._model = null;

    const backgroundServiceIcon = UI.Icon.Icon.create(this._getIconType(), 'resource-tree-item');
    this.setLeadingIcons([backgroundServiceIcon]);
  }

  /**
   * @return {string}
   */
  _getIconType() {
    switch (this._serviceName) {
      case Protocol.BackgroundService.ServiceName.BackgroundFetch:
        return 'mediumicon-fetch';
      case Protocol.BackgroundService.ServiceName.BackgroundSync:
        return 'mediumicon-sync';
      case Protocol.BackgroundService.ServiceName.PushMessaging:
        return 'mediumicon-cloud';
      case Protocol.BackgroundService.ServiceName.Notifications:
        return 'mediumicon-bell';
      case Protocol.BackgroundService.ServiceName.PaymentHandler:
        return 'mediumicon-payment';
      case Protocol.BackgroundService.ServiceName.PeriodicBackgroundSync:
        return 'mediumicon-schedule';
      default:
        console.error(`Service ${this._serviceName} does not have a dedicated icon`);
        return 'mediumicon-table';
    }
  }

  /**
   * @param {?BackgroundServiceModel} model
   */
  _initialize(model) {
    this._model = model;
    // Show the view if the model was initialized after selection.
    if (this._selected && !this._view) {
      this.onselect(false);
    }
  }

  /**
   * @return {string}
   */
  /**
   * @override
   * @return {string}
   */
  get itemURL() {
    return `background-service://${this._serviceName}`;
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._selected = true;

    if (!this._model) {
      return false;
    }

    if (!this._view) {
      this._view = new BackgroundServiceView(this._serviceName, this._model);
    }
    this.showView(this._view);
    UI.Context.Context.instance().setFlavor(BackgroundServiceView, this._view);
    return false;
  }
}

export class DatabaseTreeElement extends ApplicationPanelTreeElement {
  /**
   * @param {!ApplicationPanelSidebar} sidebar
   * @param {!DatabaseModelDatabase} database
   */
  constructor(sidebar, database) {
    super(sidebar._panel, database.name, true);
    this._sidebar = sidebar;
    this._database = database;

    const icon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
   * @override
   * @return {string}
   */
  get itemURL() {
    return 'database://' + encodeURI(this._database.name);
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._sidebar._showDatabase(this._database);
    return false;
  }

  /**
   * @override
   */
  onexpand() {
    this.updateChildren();
  }

  async updateChildren() {
    this.removeChildren();
    const tableNames = await this._database.tableNames();
    for (const tableName of tableNames) {
      this.appendChild(new DatabaseTableTreeElement(this._sidebar, this._database, tableName));
    }
  }
}

export class DatabaseTableTreeElement extends ApplicationPanelTreeElement {
  /**
   * @param {!ApplicationPanelSidebar} sidebar
   * @param {!DatabaseModelDatabase} database
   * @param {string} tableName
   */
  constructor(sidebar, database, tableName) {
    super(sidebar._panel, tableName, false);
    this._sidebar = sidebar;
    this._database = database;
    this._tableName = tableName;
    const icon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
   * @override
   * @return {string}
   */
  get itemURL() {
    return 'database://' + encodeURI(this._database.name) + '/' + encodeURI(this._tableName);
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._sidebar._showDatabase(this._database, this._tableName);
    return false;
  }
}

export class ServiceWorkersTreeElement extends ApplicationPanelTreeElement {
  /**
   * @param {!ResourcesPanel} storagePanel
   */
  constructor(storagePanel) {
    super(storagePanel, Common.UIString.UIString('Service Workers'), false);
    const icon = UI.Icon.Icon.create('mediumicon-service-worker', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
   * @return {string}
   */
  /**
   * @override
   * @return {string}
   */
  get itemURL() {
    return 'service-workers://';
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view = new ServiceWorkersView();
    }
    this.showView(this._view);
    return false;
  }
}

export class AppManifestTreeElement extends ApplicationPanelTreeElement {
  /**
   * @param {!ResourcesPanel} storagePanel
   */
  constructor(storagePanel) {
    super(storagePanel, Common.UIString.UIString('Manifest'), false);
    const icon = UI.Icon.Icon.create('mediumicon-manifest', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
   * @return {string}
   */
  /**
   * @override
   * @return {string}
   */
  get itemURL() {
    return 'manifest://';
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view = new AppManifestView();
    }
    this.showView(this._view);
    return false;
  }
}

export class ClearStorageTreeElement extends ApplicationPanelTreeElement {
  /**
   * @param {!ResourcesPanel} storagePanel
   */
  constructor(storagePanel) {
    super(storagePanel, Common.UIString.UIString('Storage'), false);
    const icon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
   * @override
   * @return {string}
   */
  get itemURL() {
    return 'clear-storage://';
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view = new ClearStorageView();
    }
    this.showView(this._view);
    return false;
  }
}

export class IndexedDBTreeElement extends ExpandableApplicationPanelTreeElement {
  /**
   * @param {!ResourcesPanel} storagePanel
   */
  constructor(storagePanel) {
    super(storagePanel, Common.UIString.UIString('IndexedDB'), 'IndexedDB');
    const icon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
    /** @type {!Array.<!IDBDatabaseTreeElement>} */
    this._idbDatabaseTreeElements = [];
  }

  _initialize() {
    SDK.SDKModel.TargetManager.instance().addModelListener(
        IndexedDBModel, IndexedDBModelEvents.DatabaseAdded, this._indexedDBAdded, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        IndexedDBModel, IndexedDBModelEvents.DatabaseRemoved, this._indexedDBRemoved, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        IndexedDBModel, IndexedDBModelEvents.DatabaseLoaded, this._indexedDBLoaded, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        IndexedDBModel, IndexedDBModelEvents.IndexedDBContentUpdated, this._indexedDBContentUpdated, this);
    // TODO(szuend): Replace with a Set once two web tests no longer directly access this private
    //               variable (indexeddb/live-update-indexeddb-content.js, indexeddb/delete-entry.js).
    this._idbDatabaseTreeElements = [];

    for (const indexedDBModel of SDK.SDKModel.TargetManager.instance().models(IndexedDBModel)) {
      const databases = indexedDBModel.databases();
      for (let j = 0; j < databases.length; ++j) {
        this._addIndexedDB(indexedDBModel, databases[j]);
      }
    }
  }

  /**
   * @param {!IndexedDBModel} model
   */
  removeIndexedDBForModel(model) {
    const idbDatabaseTreeElements = this._idbDatabaseTreeElements.filter(element => element._model === model);
    for (const idbDatabaseTreeElement of idbDatabaseTreeElements) {
      this._removeIDBDatabaseTreeElement(idbDatabaseTreeElement);
    }
  }

  /**
   * @override
   */
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  /**
   * @param {!MouseEvent} event
   */
  _handleContextMenuEvent(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(
        Common.UIString.UIString('Refresh IndexedDB'), this.refreshIndexedDB.bind(this));
    contextMenu.show();
  }

  refreshIndexedDB() {
    for (const indexedDBModel of SDK.SDKModel.TargetManager.instance().models(IndexedDBModel)) {
      indexedDBModel.refreshDatabaseNames();
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _indexedDBAdded(event) {
    const databaseId = /** @type {!DatabaseId} */ (event.data.databaseId);
    const model = /** @type {!IndexedDBModel} */ (event.data.model);
    this._addIndexedDB(model, databaseId);
  }

  /**
   * @param {!IndexedDBModel} model
   * @param {!DatabaseId} databaseId
   */
  _addIndexedDB(model, databaseId) {
    const idbDatabaseTreeElement = new IDBDatabaseTreeElement(this.resourcesPanel, model, databaseId);
    this._idbDatabaseTreeElements.push(idbDatabaseTreeElement);
    this.appendChild(idbDatabaseTreeElement);
    model.refreshDatabase(databaseId);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _indexedDBRemoved(event) {
    const databaseId = /** @type {!DatabaseId} */ (event.data.databaseId);
    const model = /** @type {!IndexedDBModel} */ (event.data.model);

    const idbDatabaseTreeElement = this._idbDatabaseTreeElement(model, databaseId);
    if (!idbDatabaseTreeElement) {
      return;
    }
    this._removeIDBDatabaseTreeElement(idbDatabaseTreeElement);
  }

  /**
   * @param {!IDBDatabaseTreeElement} idbDatabaseTreeElement
   */
  _removeIDBDatabaseTreeElement(idbDatabaseTreeElement) {
    idbDatabaseTreeElement.clear();
    this.removeChild(idbDatabaseTreeElement);
    Platform.ArrayUtilities.removeElement(this._idbDatabaseTreeElements, idbDatabaseTreeElement);
    this.setExpandable(this.childCount() > 0);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _indexedDBLoaded(event) {
    const database = /** @type {!IndexedDBModelDatabase} */ (event.data.database);
    const model = /** @type {!IndexedDBModel} */ (event.data.model);
    const entriesUpdated = /** @type {boolean} */ (event.data.entriesUpdated);

    const idbDatabaseTreeElement = this._idbDatabaseTreeElement(model, database.databaseId);
    if (!idbDatabaseTreeElement) {
      return;
    }
    idbDatabaseTreeElement.update(database, entriesUpdated);
    this._indexedDBLoadedForTest();
  }

  _indexedDBLoadedForTest() {
    // For sniffing in tests.
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _indexedDBContentUpdated(event) {
    const databaseId = /** @type {!DatabaseId} */ (event.data.databaseId);
    const objectStoreName = /** @type {string} */ (event.data.objectStoreName);
    const model = /** @type {!IndexedDBModel} */ (event.data.model);

    const idbDatabaseTreeElement = this._idbDatabaseTreeElement(model, databaseId);
    if (!idbDatabaseTreeElement) {
      return;
    }
    idbDatabaseTreeElement.indexedDBContentUpdated(objectStoreName);
  }

  /**
   * @param {!IndexedDBModel} model
   * @param {!DatabaseId} databaseId
   * @return {?IDBDatabaseTreeElement}
   */
  _idbDatabaseTreeElement(model, databaseId) {
    return this._idbDatabaseTreeElements.find(x => x._databaseId.equals(databaseId) && x._model === model) || null;
  }
}

export class IDBDatabaseTreeElement extends ApplicationPanelTreeElement {
  /**
   * @param {!ResourcesPanel} storagePanel
   * @param {!IndexedDBModel} model
   * @param {!DatabaseId} databaseId
   */
  constructor(storagePanel, model, databaseId) {
    super(storagePanel, databaseId.name + ' - ' + databaseId.securityOrigin, false);
    this._model = model;
    this._databaseId = databaseId;
    /** @type {!Map<string, !IDBObjectStoreTreeElement>} */
    this._idbObjectStoreTreeElements = new Map();
    const icon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
    this._model.addEventListener(IndexedDBModelEvents.DatabaseNamesRefreshed, this._refreshIndexedDB, this);
  }

  /**
   * @override
   * @return {string}
   */
  get itemURL() {
    return 'indexedDB://' + this._databaseId.securityOrigin + '/' + this._databaseId.name;
  }

  /**
   * @override
   */
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  /**
   * @param {!MouseEvent} event
   */
  _handleContextMenuEvent(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(
        Common.UIString.UIString('Refresh IndexedDB'), this._refreshIndexedDB.bind(this));
    contextMenu.show();
  }

  _refreshIndexedDB() {
    this._model.refreshDatabase(this._databaseId);
  }

  /**
   * @param {string} objectStoreName
   */
  indexedDBContentUpdated(objectStoreName) {
    const treeElement = this._idbObjectStoreTreeElements.get(objectStoreName);
    if (treeElement) {
      treeElement.markNeedsRefresh();
    }
  }

  /**
   * @param {!IndexedDBModelDatabase} database
   * @param {boolean} entriesUpdated
   */
  update(database, entriesUpdated) {
    this._database = database;
    /** @type {!Set<string>} */
    const objectStoreNames = new Set();
    for (const objectStoreName of [...this._database.objectStores.keys()].sort()) {
      const objectStore = this._database.objectStores.get(objectStoreName);
      if (!objectStore) {
        continue;
      }
      objectStoreNames.add(objectStore.name);
      let treeElement = this._idbObjectStoreTreeElements.get(objectStore.name);
      if (!treeElement) {
        treeElement = new IDBObjectStoreTreeElement(this.resourcesPanel, this._model, this._databaseId, objectStore);
        this._idbObjectStoreTreeElements.set(objectStore.name, treeElement);
        this.appendChild(treeElement);
      }
      treeElement.update(objectStore, entriesUpdated);
    }
    for (const objectStoreName of this._idbObjectStoreTreeElements.keys()) {
      if (!objectStoreNames.has(objectStoreName)) {
        this._objectStoreRemoved(objectStoreName);
      }
    }

    if (this._view) {
      this._view.update(database);
    }

    this._updateTooltip();
  }

  _updateTooltip() {
    const version = this._database ? this._database.version : '-';
    if (Object.keys(this._idbObjectStoreTreeElements).length === 0) {
      this.tooltip = ls`Version: ${version} (empty)`;
    } else {
      this.tooltip = ls`Version: ${version}`;
    }
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._database) {
      return false;
    }
    if (!this._view) {
      this._view = new IDBDatabaseView(this._model, this._database);
    }

    this.showView(this._view);
    return false;
  }

  /**
   * @param {string} objectStoreName
   */
  _objectStoreRemoved(objectStoreName) {
    const objectStoreTreeElement = this._idbObjectStoreTreeElements.get(objectStoreName);
    if (objectStoreTreeElement) {
      objectStoreTreeElement.clear();
      this.removeChild(objectStoreTreeElement);
    }
    this._idbObjectStoreTreeElements.delete(objectStoreName);
    this._updateTooltip();
  }

  clear() {
    for (const objectStoreName of this._idbObjectStoreTreeElements.keys()) {
      this._objectStoreRemoved(objectStoreName);
    }
  }
}

export class IDBObjectStoreTreeElement extends ApplicationPanelTreeElement {
  /**
   * @param {!ResourcesPanel} storagePanel
   * @param {!IndexedDBModel} model
   * @param {!DatabaseId} databaseId
   * @param {!ObjectStore} objectStore
   */
  constructor(storagePanel, model, databaseId, objectStore) {
    super(storagePanel, objectStore.name, false);
    this._model = model;
    this._databaseId = databaseId;
    /** @type {!Map<string, !IDBIndexTreeElement>} */
    this._idbIndexTreeElements = new Map();
    this._objectStore = objectStore;
    /** @type {?IDBDataView} */
    this._view = null;
    const icon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
   * @override
   * @return {string}
   */
  get itemURL() {
    return 'indexedDB://' + this._databaseId.securityOrigin + '/' + this._databaseId.name + '/' +
        this._objectStore.name;
  }

  /**
   * @override
   */
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  markNeedsRefresh() {
    if (this._view) {
      this._view.markNeedsRefresh();
    }
    for (const treeElement of this._idbIndexTreeElements.values()) {
      treeElement.markNeedsRefresh();
    }
  }

  /**
   * @param {!MouseEvent} event
   */
  _handleContextMenuEvent(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(Common.UIString.UIString('Clear'), this._clearObjectStore.bind(this));
    contextMenu.show();
  }

  _refreshObjectStore() {
    if (this._view) {
      this._view.refreshData();
    }
    for (const treeElement of this._idbIndexTreeElements.values()) {
      treeElement.refreshIndex();
    }
  }

  async _clearObjectStore() {
    await this._model.clearObjectStore(this._databaseId, this._objectStore.name);
    this.update(this._objectStore, true);
  }

  /**
   * @param {!ObjectStore} objectStore
   * @param {boolean} entriesUpdated
   */
  update(objectStore, entriesUpdated) {
    this._objectStore = objectStore;

    const indexNames = new Set();
    for (const index of this._objectStore.indexes.values()) {
      indexNames.add(index.name);
      let treeElement = this._idbIndexTreeElements.get(index.name);
      if (!treeElement) {
        treeElement = new IDBIndexTreeElement(
            this.resourcesPanel, this._model, this._databaseId, this._objectStore, index,
            this._refreshObjectStore.bind(this));
        this._idbIndexTreeElements.set(index.name, treeElement);
        this.appendChild(treeElement);
      }
      treeElement.update(this._objectStore, index, entriesUpdated);
    }
    for (const indexName of this._idbIndexTreeElements.keys()) {
      if (!indexNames.has(indexName)) {
        this._indexRemoved(indexName);
      }
    }
    for (const [indexName, treeElement] of this._idbIndexTreeElements.entries()) {
      if (!indexNames.has(indexName)) {
        this.removeChild(/** @type {!IDBIndexTreeElement}*/ (treeElement));
        this._idbIndexTreeElements.delete(/** @type {string} */ (indexName));
      }
    }

    if (this.childCount()) {
      this.expand();
    }

    if (this._view && entriesUpdated) {
      this._view.update(this._objectStore, null);
    }

    this._updateTooltip();
  }

  _updateTooltip() {
    const keyPathString = this._objectStore.keyPathString;
    let tooltipString = keyPathString !== null ? ls`Key path: ${keyPathString}` : '';
    if (this._objectStore.autoIncrement) {
      tooltipString += '\n' + Common.UIString.UIString('autoIncrement');
    }
    this.tooltip = tooltipString;
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view =
          new IDBDataView(this._model, this._databaseId, this._objectStore, null, this._refreshObjectStore.bind(this));
    }

    this.showView(this._view);
    return false;
  }

  /**
   * @param {string} indexName
   */
  _indexRemoved(indexName) {
    const indexTreeElement = this._idbIndexTreeElements.get(indexName);
    if (indexTreeElement) {
      indexTreeElement.clear();
      this.removeChild(indexTreeElement);
    }
    this._idbIndexTreeElements.delete(indexName);
  }

  clear() {
    for (const indexName of this._idbIndexTreeElements.keys()) {
      this._indexRemoved(indexName);
    }
    if (this._view) {
      this._view.clear();
    }
  }
}

export class IDBIndexTreeElement extends ApplicationPanelTreeElement {
  /**
   * @param {!ResourcesPanel} storagePanel
   * @param {!IndexedDBModel} model
   * @param {!DatabaseId} databaseId
   * @param {!ObjectStore} objectStore
   * @param {!Index} index
   * @param {function():void} refreshObjectStore
   */
  constructor(storagePanel, model, databaseId, objectStore, index, refreshObjectStore) {
    super(storagePanel, index.name, false);
    this._model = model;
    this._databaseId = databaseId;
    this._objectStore = objectStore;
    this._index = index;
    this._refreshObjectStore = refreshObjectStore;
  }

  /**
   * @override
   * @return {string}
   */
  get itemURL() {
    return 'indexedDB://' + this._databaseId.securityOrigin + '/' + this._databaseId.name + '/' +
        this._objectStore.name + '/' + this._index.name;
  }

  markNeedsRefresh() {
    if (this._view) {
      this._view.markNeedsRefresh();
    }
  }

  refreshIndex() {
    if (this._view) {
      this._view.refreshData();
    }
  }

  /**
   * @param {!ObjectStore} objectStore
   * @param {!Index} index
   * @param {boolean} entriesUpdated
   */
  update(objectStore, index, entriesUpdated) {
    this._objectStore = objectStore;
    this._index = index;

    if (this._view && entriesUpdated) {
      this._view.update(this._objectStore, this._index);
    }

    this._updateTooltip();
  }

  _updateTooltip() {
    const tooltipLines = [];
    const keyPathString = this._index.keyPathString;
    tooltipLines.push(ls`Key path: ${keyPathString}`);
    if (this._index.unique) {
      tooltipLines.push(Common.UIString.UIString('unique'));
    }
    if (this._index.multiEntry) {
      tooltipLines.push(Common.UIString.UIString('multiEntry'));
    }
    this.tooltip = tooltipLines.join('\n');
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view =
          new IDBDataView(this._model, this._databaseId, this._objectStore, this._index, this._refreshObjectStore);
    }

    this.showView(this._view);
    return false;
  }

  clear() {
    if (this._view) {
      this._view.clear();
    }
  }
}

export class DOMStorageTreeElement extends ApplicationPanelTreeElement {
  /**
   * @param {!ResourcesPanel} storagePanel
   * @param {!DOMStorage} domStorage
   */
  constructor(storagePanel, domStorage) {
    super(
        storagePanel, domStorage.securityOrigin ? domStorage.securityOrigin : Common.UIString.UIString('Local Files'),
        false);
    this._domStorage = domStorage;
    const icon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
   * @override
   * @return {string}
   */
  get itemURL() {
    return 'storage://' + this._domStorage.securityOrigin + '/' +
        (this._domStorage.isLocalStorage ? 'local' : 'session');
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this.resourcesPanel.showDOMStorage(this._domStorage);
    return false;
  }

  /**
   * @override
   */
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  /**
   * @param {!MouseEvent} event
   */
  _handleContextMenuEvent(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(Common.UIString.UIString('Clear'), () => this._domStorage.clear());
    contextMenu.show();
  }
}

export class CookieTreeElement extends ApplicationPanelTreeElement {
  /**
   * @param {!ResourcesPanel} storagePanel
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   * @param {string} cookieDomain
   */
  constructor(storagePanel, frame, cookieDomain) {
    super(storagePanel, cookieDomain ? cookieDomain : Common.UIString.UIString('Local Files'), false);
    this._target = frame.resourceTreeModel().target();
    this._cookieDomain = cookieDomain;
    this.tooltip = ls`Cookies used by frames from ${cookieDomain}`;
    const icon = UI.Icon.Icon.create('mediumicon-cookie', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
   * @override
   * @return {string}
   */
  get itemURL() {
    return 'cookies://' + this._cookieDomain;
  }

  cookieDomain() {
    return this._cookieDomain;
  }

  /**
   * @override
   */
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  /**
   * @param {!Event} event
   */
  _handleContextMenuEvent(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(
        Common.UIString.UIString('Clear'), () => this.resourcesPanel.clearCookies(this._target, this._cookieDomain));
    contextMenu.show();
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this.resourcesPanel.showCookies(this._target, this._cookieDomain);
    return false;
  }
}

export class StorageCategoryView extends UI.Widget.VBox {
  constructor() {
    super();

    this.element.classList.add('storage-view');
    this._emptyWidget = new UI.EmptyWidget.EmptyWidget('');
    this._linkElement = null;
    this._emptyWidget.show(this.element);
  }

  /**
   * @param {string} text
   */
  setText(text) {
    this._emptyWidget.text = text;
  }

  /**
   * @param {?string} link
   */
  setLink(link) {
    if (link && !this._linkElement) {
      this._linkElement = this._emptyWidget.appendLink(link);
    }
    if (!link && this._linkElement) {
      this._linkElement.classList.add('hidden');
    }
    if (link && this._linkElement) {
      this._linkElement.setAttribute('href', link);
      this._linkElement.classList.remove('hidden');
    }
  }
}

/**
 * @implements {SDK.SDKModel.Observer}
 */
export class ResourcesSection {
  /**
   * @param {!ResourcesPanel} storagePanel
   * @param {!UI.TreeOutline.TreeElement} treeElement
   */
  constructor(storagePanel, treeElement) {
    this._panel = storagePanel;
    this._treeElement = treeElement;
    /** @type {!Map<string, !FrameTreeElement>} */
    this._treeElementForFrameId = new Map();
    /** @type {!Map<string, !FrameTreeElement>} */
    this._treeElementForTargetId = new Map();

    const frameManager = SDK.FrameManager.FrameManager.instance();
    frameManager.addEventListener(
        SDK.FrameManager.Events.FrameAddedToTarget, event => this._frameAdded(event.data.frame), this);
    frameManager.addEventListener(
        SDK.FrameManager.Events.FrameRemoved, event => this._frameDetached(event.data.frameId), this);
    frameManager.addEventListener(
        SDK.FrameManager.Events.FrameNavigated, event => this._frameNavigated(event.data.frame), this);
    frameManager.addEventListener(
        SDK.FrameManager.Events.ResourceAdded, event => this._resourceAdded(event.data.resource), this);

    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.ChildTargetManager.ChildTargetManager, SDK.ChildTargetManager.Events.TargetCreated, this._windowOpened,
        this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.ChildTargetManager.ChildTargetManager, SDK.ChildTargetManager.Events.TargetInfoChanged, this._windowChanged,
        this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.ChildTargetManager.ChildTargetManager, SDK.ChildTargetManager.Events.TargetDestroyed, this._windowDestroyed,
        this);

    SDK.SDKModel.TargetManager.instance().observeTargets(this);

    for (const frame of frameManager.getAllFrames()) {
      if (!this._treeElementForFrameId.get(frame.id)) {
        this._addFrameAndParents(frame);
      }
      const childTargetManager = frame.resourceTreeModel().target().model(SDK.ChildTargetManager.ChildTargetManager);
      if (childTargetManager) {
        for (const targetInfo of childTargetManager.targetInfos()) {
          this._windowOpened({data: {targetInfo}});
        }
      }
    }
  }

  /**
   * @override
   * @param {!SDK.SDKModel.Target} target
   */
  targetAdded(target) {
    if (target.type() === SDK.SDKModel.Type.Worker || target.type() === SDK.SDKModel.Type.ServiceWorker) {
      this._workerAdded(target);
    }
  }

  /**
   * @param {!SDK.SDKModel.Target} target
   * @return {!Promise<void>}
   */
  async _workerAdded(target) {
    const parentTarget = target.parentTarget();
    if (!parentTarget) {
      return;
    }
    const parentTargetId = parentTarget.id();
    const frameTreeElement = this._treeElementForTargetId.get(parentTargetId);
    const {targetInfo} = await parentTarget.targetAgent().invoke_getTargetInfo({targetId: target.id()});
    if (frameTreeElement && targetInfo) {
      frameTreeElement.workerCreated(targetInfo);
    }
  }

  /**
   * @override
   * @param {!SDK.SDKModel.Target} target
   */
  targetRemoved(target) {
  }

  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   */
  _addFrameAndParents(frame) {
    const parentFrame = frame.parentFrame();
    if (parentFrame && !this._treeElementForFrameId.get(parentFrame.id)) {
      this._addFrameAndParents(parentFrame);
    }
    this._frameAdded(frame);
  }

  /**
   * @param {?SDK.ResourceTreeModel.ResourceTreeFrame} frame
   * @return {boolean}
   */
  _expandFrame(frame) {
    if (!frame) {
      return false;
    }
    let treeElement = this._treeElementForFrameId.get(frame.id);
    if (!treeElement && !this._expandFrame(frame.parentFrame())) {
      return false;
    }
    treeElement = this._treeElementForFrameId.get(frame.id);
    if (!treeElement) {
      return false;
    }
    treeElement.expand();
    return true;
  }

  /**
   * @param {!SDK.Resource.Resource} resource
   * @param {number=} line
   * @param {number=} column
   * @return {!Promise<void>}
   */
  async revealResource(resource, line, column) {
    if (!this._expandFrame(resource.frame())) {
      return;
    }
    const resourceTreeElement = FrameResourceTreeElement.forResource(resource);
    if (resourceTreeElement) {
      await resourceTreeElement.revealResource(line, column);
    }
  }

  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   */
  _frameAdded(frame) {
    const parentFrame = frame.parentFrame();
    const parentTreeElement = parentFrame ? this._treeElementForFrameId.get(parentFrame.id) : this._treeElement;
    if (!parentTreeElement) {
      return;
    }

    const existingElement = this._treeElementForFrameId.get(frame.id);
    if (existingElement) {
      this._treeElementForFrameId.delete(frame.id);
      if (existingElement.parent) {
        existingElement.parent.removeChild(existingElement);
      }
    }

    const frameTreeElement = new FrameTreeElement(this, frame);
    this._treeElementForFrameId.set(frame.id, frameTreeElement);
    const targetId = frame.resourceTreeModel().target().id();
    if (!this._treeElementForTargetId.get(targetId)) {
      this._treeElementForTargetId.set(targetId, frameTreeElement);
    }
    parentTreeElement.appendChild(frameTreeElement);

    for (const resource of frame.resources()) {
      this._resourceAdded(resource);
    }
  }

  /**
   * @param {string} frameId
   */
  _frameDetached(frameId) {
    const frameTreeElement = this._treeElementForFrameId.get(frameId);
    if (!frameTreeElement) {
      return;
    }

    this._treeElementForFrameId.delete(frameId);
    if (frameTreeElement.parent) {
      frameTreeElement.parent.removeChild(frameTreeElement);
    }
  }

  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   */
  _frameNavigated(frame) {
    const frameTreeElement = this._treeElementForFrameId.get(frame.id);
    if (frameTreeElement) {
      frameTreeElement.frameNavigated(frame);
    }
  }

  /**
   * @param {!SDK.Resource.Resource} resource
   */
  _resourceAdded(resource) {
    const frameTreeElement = this._treeElementForFrameId.get(resource.frameId);
    if (!frameTreeElement) {
      // This is a frame's main resource, it will be retained
      // and re-added by the resource manager;
      return;
    }
    frameTreeElement.appendResource(resource);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _windowOpened(event) {
    const targetInfo = /** @type {!Protocol.Target.TargetInfo} */ (event.data);
    // Events for DevTools windows are ignored because they do not have an openerId
    if (targetInfo.openerId && targetInfo.type === 'page') {
      const frameTreeElement = this._treeElementForFrameId.get(targetInfo.openerId);
      if (frameTreeElement) {
        this._treeElementForTargetId.set(targetInfo.targetId, frameTreeElement);
        frameTreeElement.windowOpened(targetInfo);
      }
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _windowDestroyed(event) {
    const targetId = /** @type {string} */ (event.data);
    const frameTreeElement = this._treeElementForTargetId.get(targetId);
    if (frameTreeElement) {
      frameTreeElement.windowDestroyed(targetId);
      this._treeElementForTargetId.delete(targetId);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _windowChanged(event) {
    const targetInfo = /** @type {!Protocol.Target.TargetInfo} */ (event.data);
    // Events for DevTools windows are ignored because they do not have an openerId
    if (targetInfo.openerId && targetInfo.type === 'page') {
      const frameTreeElement = this._treeElementForFrameId.get(targetInfo.openerId);
      if (frameTreeElement) {
        frameTreeElement.windowChanged(targetInfo);
      }
    }
  }

  reset() {
    this._treeElement.removeChildren();
    this._treeElementForFrameId.clear();
    this._treeElementForTargetId.clear();
  }
}

export class FrameTreeElement extends ApplicationPanelTreeElement {
  /**
   * @param {!ResourcesSection} section
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   */
  constructor(section, frame) {
    super(section._panel, '', false);
    this._section = section;
    this._frame = frame;
    this._frameId = frame.id;
    /** @type {!Map<string, !ExpandableApplicationPanelTreeElement>} */
    this._categoryElements = new Map();
    /** @type {!Map<string, !FrameResourceTreeElement>} */
    this._treeElementForResource = new Map();
    /** @type {!Map<string, !FrameWindowTreeElement>} */
    this._treeElementForWindow = new Map();
    /** @type {!Map<string, !WorkerTreeElement>} */
    this._treeElementForWorker = new Map();
    this.frameNavigated(frame);
    /** @type {?FrameDetailsView} */
    this._view = null;
  }

  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   */
  getIconTypeForFrame(frame) {
    if (frame.isTopFrame()) {
      return frame.unreachableUrl() ? 'mediumicon-frame-blocked' : 'mediumicon-frame';
    }
    return frame.unreachableUrl() ? 'mediumicon-frame-embedded-blocked' : 'mediumicon-frame-embedded';
  }

  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   */
  async frameNavigated(frame) {
    const icon = UI.Icon.Icon.create(this.getIconTypeForFrame(frame));
    if (frame.unreachableUrl()) {
      icon.classList.add('red-icon');
    }
    this.setLeadingIcons([icon]);
    this.invalidateChildren();

    this._frameId = frame.id;
    if (this.title !== frame.displayName()) {
      this.title = frame.displayName();
      UI.ARIAUtils.setAccessibleName(this.listItemElement, this.title);
      if (this.parent) {
        const parent = this.parent;
        // Insert frame at new position to preserve correct alphabetical order
        parent.removeChild(this);
        parent.appendChild(this);
      }
    }
    this._categoryElements.clear();
    this._treeElementForResource.clear();
    this._treeElementForWorker.clear();

    if (this.selected) {
      this._view = new FrameDetailsView(this._frame);
      this.showView(this._view);
    } else {
      this._view = null;
    }

    // Service Workers' parent is always the top frame. We need to reconstruct
    // the service worker tree elements after those navigations which allow
    // the service workers to stay alive.
    if (frame.isTopFrame()) {
      const targets = SDK.SDKModel.TargetManager.instance().targets();
      for (const target of targets) {
        if (target.type() === SDK.SDKModel.Type.ServiceWorker) {
          const agent = frame.resourceTreeModel().target().targetAgent();
          const targetInfo = (await agent.invoke_getTargetInfo({targetId: target.id()})).targetInfo;
          this.workerCreated(targetInfo);
        }
      }
    }
  }

  /**
   * @override
   * @return {string}
   */
  get itemURL() {
    // This is used to persist over reloads/navigation which frame was selected.
    // A frame's title can change on DevTools refresh, so we resort to using
    // the URL instead (even though it is not guaranteed to be unique).
    if (this._frame.isTopFrame()) {
      return 'frame://';
    }
    return 'frame://' + encodeURI(this._frame.url);
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view = new FrameDetailsView(this._frame);
    } else {
      this._view.update();
    }
    this.showView(this._view);

    this.listItemElement.classList.remove('hovered');
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    return false;
  }

  /**
   * @param {boolean} hovered
   */
  set hovered(hovered) {
    if (hovered) {
      this.listItemElement.classList.add('hovered');
      this._frame.highlight();
    } else {
      this.listItemElement.classList.remove('hovered');
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
  }

  /**
   * @param {!SDK.Resource.Resource} resource
   */
  appendResource(resource) {
    const statusCode = resource.statusCode();
    if (statusCode >= 301 && statusCode <= 303) {
      return;
    }

    const resourceType = resource.resourceType();
    const categoryName = resourceType.name();
    let categoryElement =
        resourceType === Common.ResourceType.resourceTypes.Document ? this : this._categoryElements.get(categoryName);
    if (!categoryElement) {
      categoryElement = new ExpandableApplicationPanelTreeElement(
          this._section._panel, resource.resourceType().category().title, categoryName, categoryName === 'Frames');
      this._categoryElements.set(resourceType.name(), categoryElement);
      this.appendChild(categoryElement, FrameTreeElement._presentationOrderCompare);
    }
    const resourceTreeElement = new FrameResourceTreeElement(this._section._panel, resource);
    categoryElement.appendChild(resourceTreeElement, FrameTreeElement._presentationOrderCompare);
    this._treeElementForResource.set(resource.url, resourceTreeElement);

    if (this._view) {
      this._view.update();
    }
  }

  /**
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  windowOpened(targetInfo) {
    const categoryKey = 'OpenedWindows';
    let categoryElement = this._categoryElements.get(categoryKey);
    if (!categoryElement) {
      categoryElement =
          new ExpandableApplicationPanelTreeElement(this._section._panel, ls`Opened Windows`, categoryKey);
      this._categoryElements.set(categoryKey, categoryElement);
      this.appendChild(categoryElement, FrameTreeElement._presentationOrderCompare);
    }
    if (!this._treeElementForWindow.get(targetInfo.targetId)) {
      const windowTreeElement = new FrameWindowTreeElement(this._section._panel, targetInfo);
      categoryElement.appendChild(windowTreeElement);
      this._treeElementForWindow.set(targetInfo.targetId, windowTreeElement);
    }
  }

  /**
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  workerCreated(targetInfo) {
    const categoryKey = targetInfo.type === 'service_worker' ? 'Service Workers' : 'Web Workers';
    const categoryName = targetInfo.type === 'service_worker' ? ls`Service Workers` : ls`Web Workers`;
    let categoryElement = this._categoryElements.get(categoryKey);
    if (!categoryElement) {
      categoryElement = new ExpandableApplicationPanelTreeElement(this._section._panel, categoryName, categoryKey);
      this._categoryElements.set(categoryKey, categoryElement);
      this.appendChild(categoryElement, FrameTreeElement._presentationOrderCompare);
    }
    if (!this._treeElementForWorker.get(targetInfo.targetId)) {
      const workerTreeElement = new WorkerTreeElement(this._section._panel, targetInfo);
      categoryElement.appendChild(workerTreeElement);
      this._treeElementForWorker.set(targetInfo.targetId, workerTreeElement);
    }
  }

  /**
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  windowChanged(targetInfo) {
    const windowTreeElement = this._treeElementForWindow.get(targetInfo.targetId);
    if (!windowTreeElement) {
      return;
    }
    if (windowTreeElement.title !== targetInfo.title) {
      windowTreeElement.title = targetInfo.title;
    }
    windowTreeElement.update(targetInfo);
  }

  /**
   * @param {string} targetId
   */
  windowDestroyed(targetId) {
    const windowTreeElement = this._treeElementForWindow.get(targetId);
    if (windowTreeElement) {
      windowTreeElement.windowClosed();
    }
  }

  /**
   * @param {string} url
   * @return {?SDK.Resource.Resource}
   */
  resourceByURL(url) {
    const treeElement = this._treeElementForResource.get(url);
    return treeElement ? treeElement._resource : null;
  }

  /**
   * @override
   * @param {!UI.TreeOutline.TreeElement} treeElement
   * @param {(function(!UI.TreeOutline.TreeElement, !UI.TreeOutline.TreeElement):number)=} comparator
   */
  appendChild(treeElement, comparator = FrameTreeElement._presentationOrderCompare) {
    super.appendChild(treeElement, comparator);
  }

  /**
   * Order elements by type (first frames, then resources, last Document resources)
   * and then each of these groups in the alphabetical order.
   * @param {!UI.TreeOutline.TreeElement} treeElement1
   * @param {!UI.TreeOutline.TreeElement} treeElement2
   */
  static _presentationOrderCompare(treeElement1, treeElement2) {
    /**
     * @param {*} treeElement
     */
    function typeWeight(treeElement) {
      if (treeElement instanceof ExpandableApplicationPanelTreeElement) {
        return 2;
      }
      if (treeElement instanceof FrameTreeElement) {
        return 1;
      }
      return 3;
    }

    const typeWeight1 = typeWeight(treeElement1);
    const typeWeight2 = typeWeight(treeElement2);
    return typeWeight1 - typeWeight2 || treeElement1.titleAsText().localeCompare(treeElement2.titleAsText());
  }
}
/** @type {!WeakMap<!SDK.Resource.Resource, !FrameResourceTreeElement>} */
const resourceToFrameResourceTreeElement = new WeakMap();
export class FrameResourceTreeElement extends ApplicationPanelTreeElement {
  /**
   * @param {!ResourcesPanel} storagePanel
   * @param {!SDK.Resource.Resource} resource
   */
  constructor(storagePanel, resource) {
    super(storagePanel, resource.displayName, false);
    this._panel = storagePanel;
    /** @type {!SDK.Resource.Resource} */
    this._resource = resource;
    /** @type {?Promise<!UI.Widget.Widget>} */
    this._previewPromise = null;
    this.tooltip = resource.url;
    resourceToFrameResourceTreeElement.set(this._resource, this);

    const icon = UI.Icon.Icon.create('mediumicon-manifest', 'navigator-file-tree-item');
    icon.classList.add('navigator-' + resource.resourceType().name() + '-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
   * @param {!SDK.Resource.Resource} resource
   */
  static forResource(resource) {
    return resourceToFrameResourceTreeElement.get(resource);
  }

  /**
   * @override
   * @return {string}
   */
  get itemURL() {
    return this._resource.url;
  }

  /**
   * @return {!Promise<!UI.Widget.Widget>}
   */
  _preparePreview() {
    if (this._previewPromise) {
      return this._previewPromise;
    }
    const viewPromise =
        SourceFrame.PreviewFactory.PreviewFactory.createPreview(this._resource, this._resource.mimeType);
    this._previewPromise = viewPromise.then(view => {
      if (view) {
        return view;
      }
      return new UI.EmptyWidget.EmptyWidget(this._resource.url);
    });
    return this._previewPromise;
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._panel.scheduleShowView(this._preparePreview());
    return false;
  }

  /**
   * @override
   * @param {!Event} event
   * @return {boolean}
   */
  ondblclick(event) {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(this._resource.url);
    return false;
  }

  /**
   * @override
   */
  onattach() {
    super.onattach();
    this.listItemElement.draggable = true;
    this.listItemElement.addEventListener('dragstart', this._ondragstart.bind(this), false);
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  /**
   * @param {!DragEvent} event
   * @return {boolean}
   */
  _ondragstart(event) {
    if (!event.dataTransfer) {
      return false;
    }
    event.dataTransfer.setData('text/plain', this._resource.content || '');
    event.dataTransfer.effectAllowed = 'copy';
    return true;
  }

  /**
   *
   * @param {!MouseEvent} event
   */
  _handleContextMenuEvent(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this._resource);
    contextMenu.show();
  }

  /**
   * @param {number=} line
   * @param {number=} column
   */
  async revealResource(line, column) {
    this.revealAndSelect(true);
    const view = await this._panel.scheduleShowView(this._preparePreview());
    if (!(view instanceof SourceFrame.ResourceSourceFrame.ResourceSourceFrame) || typeof line !== 'number') {
      return;
    }
    view.revealPosition(line, column, true);
  }
}

class FrameWindowTreeElement extends ApplicationPanelTreeElement {
  /**
   * @param {!ResourcesPanel} storagePanel
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  constructor(storagePanel, targetInfo) {
    super(storagePanel, targetInfo.title || ls`Window without title`, false);
    this._targetInfo = targetInfo;
    this._isWindowClosed = false;
    this._view = null;
    this.updateIcon(targetInfo.canAccessOpener);
  }

  /**
   * @param {boolean} canAccessOpener
   */
  updateIcon(canAccessOpener) {
    const iconType = canAccessOpener ? 'mediumicon-frame-opened' : 'mediumicon-frame';
    const icon = UI.Icon.Icon.create(iconType);
    this.setLeadingIcons([icon]);
  }

  /**
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  update(targetInfo) {
    if (targetInfo.canAccessOpener !== this._targetInfo.canAccessOpener) {
      this.updateIcon(targetInfo.canAccessOpener);
    }
    this._targetInfo = targetInfo;
    if (this._view) {
      this._view.setTargetInfo(targetInfo);
      this._view.update();
    }
  }

  windowClosed() {
    this.listItemElement.classList.add('window-closed');
    this._isWindowClosed = true;
    if (this._view) {
      this._view.setIsWindowClosed(true);
      this._view.update();
    }
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view = new OpenedWindowDetailsView(this._targetInfo, this._isWindowClosed);
    } else {
      this._view.update();
    }
    this.showView(this._view);
    return false;
  }

  /**
   * @override
   * @return {string}
   */
  get itemURL() {
    return this._targetInfo.url;
  }
}

class WorkerTreeElement extends ApplicationPanelTreeElement {
  /**
   * @param {!ResourcesPanel} storagePanel
   * @param {!Protocol.Target.TargetInfo} targetInfo
   */
  constructor(storagePanel, targetInfo) {
    super(storagePanel, targetInfo.title || targetInfo.url || ls`worker`, false);
    this._targetInfo = targetInfo;
    this._view = null;
    const icon = UI.Icon.Icon.create('mediumicon-service-worker', 'navigator-file-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view = new WorkerDetailsView(this._targetInfo);
    } else {
      this._view.update();
    }
    this.showView(this._view);
    return false;
  }


  /**
   * @override
   * @return {string}
   */
  get itemURL() {
    return this._targetInfo.url;
  }
}
