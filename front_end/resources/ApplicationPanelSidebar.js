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
import * as SDK from '../sdk/sdk.js';
import * as SourceFrame from '../source_frame/source_frame.js';
import * as UI from '../ui/ui.js';

import {ApplicationCacheItemsView} from './ApplicationCacheItemsView.js';
import {ApplicationCacheModel, Events as ApplicationCacheModelEvents} from './ApplicationCacheModel.js';
import {AppManifestView} from './AppManifestView.js';
import {BackgroundServiceModel} from './BackgroundServiceModel.js';
import {BackgroundServiceView} from './BackgroundServiceView.js';
import {ClearStorageView} from './ClearStorageView.js';
import {Database as DatabaseModelDatabase, DatabaseModel, Events as DatabaseModelEvents} from './DatabaseModel.js';  // eslint-disable-line no-unused-vars
import {DatabaseQueryView, Events as DatabaseQueryViewEvents} from './DatabaseQueryView.js';
import {DatabaseTableView} from './DatabaseTableView.js';
import {DOMStorage, DOMStorageModel, Events as DOMStorageModelEvents} from './DOMStorageModel.js';  // eslint-disable-line no-unused-vars
import {Database as IndexedDBModelDatabase, DatabaseId, Events as IndexedDBModelEvents, Index, IndexedDBModel, ObjectStore} from './IndexedDBModel.js';  // eslint-disable-line no-unused-vars
import {IDBDatabaseView, IDBDataView} from './IndexedDBViews.js';
import {ServiceWorkerCacheView} from './ServiceWorkerCacheViews.js';
import {ServiceWorkersView} from './ServiceWorkersView.js';

/**
 * @implements {SDK.SDKModel.Observer}
 * @unrestricted
 */
export class ApplicationPanelSidebar extends UI.Widget.VBox {
  /**
   * @param {!UI.Panel.PanelWithSidebar} panel
   */
  constructor(panel) {
    super();

    this._panel = panel;

    this._sidebarTree = new UI.TreeOutline.TreeOutlineInShadow();
    this._sidebarTree.element.classList.add('resources-sidebar');
    this._sidebarTree.registerRequiredCSS('resources/resourcesSidebar.css');
    this._sidebarTree.element.classList.add('filter-all');
    // Listener needs to have been set up before the elements are added
    this._sidebarTree.addEventListener(UI.TreeOutline.Events.ElementAttached, this._treeElementAdded, this);

    this.contentElement.appendChild(this._sidebarTree.element);
    this._applicationTreeElement = this._addSidebarSection(Common.UIString.UIString('Application'));
    const manifestTreeElement = new AppManifestTreeElement(panel);
    this._applicationTreeElement.appendChild(manifestTreeElement);
    this.serviceWorkersTreeElement = new ServiceWorkersTreeElement(panel);
    this._applicationTreeElement.appendChild(this.serviceWorkersTreeElement);
    const clearStorageTreeElement = new ClearStorageTreeElement(panel);
    this._applicationTreeElement.appendChild(clearStorageTreeElement);

    const storageTreeElement = this._addSidebarSection(Common.UIString.UIString('Storage'));
    this.localStorageListTreeElement =
        new StorageCategoryTreeElement(panel, Common.UIString.UIString('Local Storage'), 'LocalStorage');
    this.localStorageListTreeElement.setLink(
        'https://developers.google.com/web/tools/chrome-devtools/storage/localstorage?utm_source=devtools');
    const localStorageIcon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.localStorageListTreeElement.setLeadingIcons([localStorageIcon]);

    storageTreeElement.appendChild(this.localStorageListTreeElement);
    this.sessionStorageListTreeElement =
        new StorageCategoryTreeElement(panel, Common.UIString.UIString('Session Storage'), 'SessionStorage');
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
        new StorageCategoryTreeElement(panel, Common.UIString.UIString('Web SQL'), 'Databases');
    this.databasesListTreeElement.setLink(
        'https://developers.google.com/web/tools/chrome-devtools/storage/websql?utm_source=devtools');
    const databaseIcon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.databasesListTreeElement.setLeadingIcons([databaseIcon]);

    storageTreeElement.appendChild(this.databasesListTreeElement);
    this.cookieListTreeElement = new StorageCategoryTreeElement(panel, Common.UIString.UIString('Cookies'), 'Cookies');
    this.cookieListTreeElement.setLink(
        'https://developers.google.com/web/tools/chrome-devtools/storage/cookies?utm_source=devtools');
    const cookieIcon = UI.Icon.Icon.create('mediumicon-cookie', 'resource-tree-item');
    this.cookieListTreeElement.setLeadingIcons([cookieIcon]);
    storageTreeElement.appendChild(this.cookieListTreeElement);

    const cacheTreeElement = this._addSidebarSection(Common.UIString.UIString('Cache'));
    this.cacheStorageListTreeElement = new ServiceWorkerCacheTreeElement(panel);
    cacheTreeElement.appendChild(this.cacheStorageListTreeElement);
    this.applicationCacheListTreeElement =
        new StorageCategoryTreeElement(panel, Common.UIString.UIString('Application Cache'), 'ApplicationCache');
    this.applicationCacheListTreeElement.setLink(
        'https://developers.google.com/web/tools/chrome-devtools/storage/applicationcache?utm_source=devtools');
    const applicationCacheIcon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.applicationCacheListTreeElement.setLeadingIcons([applicationCacheIcon]);

    cacheTreeElement.appendChild(this.applicationCacheListTreeElement);

    if (Root.Runtime.experiments.isEnabled('backgroundServices')) {
      const backgroundServiceTreeElement = this._addSidebarSection(ls`Background Services`);

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

    this._resourcesSection = new ResourcesSection(panel, this._addSidebarSection(Common.UIString.UIString('Frames')));

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

    const cacheStorageModel = this._target.model(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel);
    if (cacheStorageModel) {
      cacheStorageModel.enable();
    }
    const resourceTreeModel = this._target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel) {
      this._populateApplicationCacheTree(resourceTreeModel);
    }
    SDK.SDKModel.TargetManager.instance().observeModels(
        DOMStorageModel, /** @type {!SDK.SDKModel.SDKModelObserver} */ ({
          modelAdded: model => this._domStorageModelAdded(model),
          modelRemoved: model => this._domStorageModelRemoved(model)
        }));
    this.indexedDBListTreeElement._initialize();
    SDK.SDKModel.TargetManager.instance().observeModels(
        IndexedDBModel, /** @type {!SDK.SDKModel.SDKModelObserver} */ ({
          modelAdded: model => model.enable(),
          modelRemoved: model => this.indexedDBListTreeElement.removeIndexedDBForModel(model)
        }));
    const serviceWorkerCacheModel = this._target.model(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel);
    this.cacheStorageListTreeElement._initialize(serviceWorkerCacheModel);
    const backgroundServiceModel = this._target.model(BackgroundServiceModel);
    if (Root.Runtime.experiments.isEnabled('backgroundServices')) {
      this.backgroundFetchTreeElement._initialize(backgroundServiceModel);
      this.backgroundSyncTreeElement._initialize(backgroundServiceModel);
      if (Root.Runtime.experiments.isEnabled('backgroundServicesNotifications')) {
        this.notificationsTreeElement._initialize(backgroundServiceModel);
      }
      if (Root.Runtime.experiments.isEnabled('backgroundServicesPaymentHandler')) {
        this.paymentHandlerTreeElement._initialize(backgroundServiceModel);
      }
      this.periodicBackgroundSyncTreeElement._initialize(backgroundServiceModel);
      if (Root.Runtime.experiments.isEnabled('backgroundServicesPushMessaging')) {
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
    for (const frameId of Object.keys(this._applicationCacheFrameElements)) {
      this._applicationCacheFrameManifestRemoved({data: frameId});
    }
    this.applicationCacheListTreeElement.setExpandable(false);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _treeElementAdded(event) {
    const selection = this._panel.lastSelectedItemPath();
    if (!selection.length) {
      return;
    }
    const element = event.data;
    const index = selection.indexOf(element.itemURL);
    if (index < 0) {
      return;
    }
    for (let parent = element.parent; parent; parent = parent.parent) {
      parent.expand();
    }
    if (index > 0) {
      element.expand();
    }
    element.select();
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

    const applicationCacheFrameTreeElement = this._applicationCacheFrameElements[frame.id];
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
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(frame.url);
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
    parentListTreeElement.removeChild(treeElement);
    if (wasSelected) {
      parentListTreeElement.select();
    }
    this._domStorageTreeElements.delete(domStorage);
  }

  /**
   * @param {!DatabaseModelDatabase} database
   */
  selectDatabase(database) {
    if (database) {
      this._showDatabase(database);
      this._databaseTreeElements.get(database).select();
    }
  }

  /**
   * @param {!SDK.Resource.Resource} resource
   * @param {number=} line
   * @param {number=} column
   * @return {!Promise}
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

  _showApplicationCache(frameId) {
    if (!this._applicationCacheViews[frameId]) {
      this._applicationCacheViews[frameId] = new ApplicationCacheItemsView(this._applicationCacheModel, frameId);
    }

    this._innerShowView(this._applicationCacheViews[frameId]);
  }

  /**
   *  @param {!UI.Widget.Widget} view
   */
  showFileSystem(view) {
    this._innerShowView(view);
  }

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

    const tableNamesHash = {};
    const panel = this._panel;
    const tableNames = await database.tableNames();
    const tableNamesLength = tableNames.length;

    for (let i = 0; i < tableNamesLength; ++i) {
      tableNamesHash[tableNames[i]] = true;
    }

    for (const tableName in tableViews) {
      if (!(tableName in tableNamesHash)) {
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
    this._applicationCacheModel = this._target.model(ApplicationCacheModel);

    this._applicationCacheViews = {};
    this._applicationCacheFrameElements = {};
    this._applicationCacheManifestElements = {};

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

  _applicationCacheFrameManifestAdded(event) {
    const frameId = event.data;
    const manifestURL = this._applicationCacheModel.frameManifestURL(frameId);

    let manifestTreeElement = this._applicationCacheManifestElements[manifestURL];
    if (!manifestTreeElement) {
      manifestTreeElement = new ApplicationCacheManifestTreeElement(this._panel, manifestURL);
      this.applicationCacheListTreeElement.appendChild(manifestTreeElement);
      this._applicationCacheManifestElements[manifestURL] = manifestTreeElement;
    }

    const model = this._target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const frameTreeElement = new ApplicationCacheFrameTreeElement(this, model.frameForId(frameId), manifestURL);
    manifestTreeElement.appendChild(frameTreeElement);
    manifestTreeElement.expand();
    this._applicationCacheFrameElements[frameId] = frameTreeElement;
  }

  _applicationCacheFrameManifestRemoved(event) {
    const frameId = event.data;
    const frameTreeElement = this._applicationCacheFrameElements[frameId];
    if (!frameTreeElement) {
      return;
    }

    const manifestURL = frameTreeElement.manifestURL;
    delete this._applicationCacheFrameElements[frameId];
    delete this._applicationCacheViews[frameId];
    frameTreeElement.parent.removeChild(frameTreeElement);

    const manifestTreeElement = this._applicationCacheManifestElements[manifestURL];
    if (manifestTreeElement.childCount()) {
      return;
    }

    delete this._applicationCacheManifestElements[manifestURL];
    manifestTreeElement.parent.removeChild(manifestTreeElement);
  }

  _applicationCacheFrameManifestStatusChanged(event) {
    const frameId = event.data;
    const status = this._applicationCacheModel.frameManifestStatus(frameId);

    if (this._applicationCacheViews[frameId]) {
      this._applicationCacheViews[frameId].updateStatus(status);
    }
  }

  _applicationCacheNetworkStateChanged(event) {
    const isNowOnline = event.data;

    for (const manifestURL in this._applicationCacheViews) {
      this._applicationCacheViews[manifestURL].updateNetworkState(isNowOnline);
    }
  }

  showView(view) {
    if (view) {
      this.showResource(view.resource);
    }
  }

  _onmousemove(event) {
    const nodeUnderMouse = event.target;
    if (!nodeUnderMouse) {
      return;
    }

    const listNode = nodeUnderMouse.enclosingNodeOrSelfWithNodeName('li');
    if (!listNode) {
      return;
    }

    const element = listNode.treeElement;
    if (this._previousHoveredElement === element) {
      return;
    }

    if (this._previousHoveredElement) {
      this._previousHoveredElement.hovered = false;
      delete this._previousHoveredElement;
    }

    if (element instanceof FrameTreeElement) {
      this._previousHoveredElement = element;
      element.hovered = true;
    }
  }

  _onmouseleave(event) {
    if (this._previousHoveredElement) {
      this._previousHoveredElement.hovered = false;
      delete this._previousHoveredElement;
    }
  }
}

/**
 * @unrestricted
 */
export class BaseStorageTreeElement extends UI.TreeOutline.TreeElement {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
   * @param {string} title
   * @param {boolean} expandable
   */
  constructor(storagePanel, title, expandable) {
    super(title, expandable);
    this._storagePanel = storagePanel;
    UI.ARIAUtils.setAccessibleName(this.listItemElement, title);
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    if (!selectedByUser) {
      return false;
    }

    const path = [];
    for (let el = this; el; el = el.parent) {
      const url = el.itemURL;
      if (!url) {
        break;
      }
      path.push(url);
    }
    this._storagePanel.setLastSelectedItemPath(path);

    return false;
  }

  /**
   * @protected
   * @param {?UI.Widget.Widget} view
   */
  showView(view) {
    this._storagePanel.showView(view);
  }
}

export class StorageCategoryTreeElement extends BaseStorageTreeElement {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
   * @param {string} categoryName
   * @param {string} settingsKey
   */
  constructor(storagePanel, categoryName, settingsKey) {
    super(storagePanel, categoryName, false);
    this._expandedSetting = Common.Settings.Settings.instance().createSetting(
        'resources' + settingsKey + 'Expanded', settingsKey === 'Frames');
    this._categoryName = categoryName;
    this._categoryLink = null;
  }

  get itemURL() {
    return 'category://' + this._categoryName;
  }

  /**
   * @param {string} link
   */
  setLink(link) {
    this._categoryLink = link;
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._storagePanel.showCategoryView(this._categoryName, this._categoryLink);
    return false;
  }

  /**
   * @override
   */
  onattach() {
    super.onattach();
    if (this._expandedSetting.get()) {
      this.expand();
    }
  }

  /**
   * @override
   */
  onexpand() {
    this._expandedSetting.set(true);
  }

  /**
   * @override
   */
  oncollapse() {
    this._expandedSetting.set(false);
  }
}

export class BackgroundServiceTreeElement extends BaseStorageTreeElement {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
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
    self.UI.context.setFlavor(BackgroundServiceView, this._view);
    return false;
  }
}

/**
 * @unrestricted
 */
export class DatabaseTreeElement extends BaseStorageTreeElement {
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

/**
 * @unrestricted
 */
export class DatabaseTableTreeElement extends BaseStorageTreeElement {
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

/**
 * @unrestricted
 */
export class ServiceWorkerCacheTreeElement extends StorageCategoryTreeElement {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
   */
  constructor(storagePanel) {
    super(storagePanel, Common.UIString.UIString('Cache Storage'), 'CacheStorage');
    const icon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
    /** @type {?SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel} */
    this._swCacheModel = null;
  }

  /**
   * @param {?SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel} model
   */
  _initialize(model) {
    /** @type {!Set.<!SWCacheTreeElement>} */
    this._swCacheTreeElements = new Set();
    this._swCacheModel = model;
    if (model) {
      for (const cache of model.caches()) {
        this._addCache(model, cache);
      }
    }
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel, SDK.ServiceWorkerCacheModel.Events.CacheAdded,
        this._cacheAdded, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel, SDK.ServiceWorkerCacheModel.Events.CacheRemoved,
        this._cacheRemoved, this);
  }

  /**
   * @override
   */
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  _handleContextMenuEvent(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(Common.UIString.UIString('Refresh Caches'), this._refreshCaches.bind(this));
    contextMenu.show();
  }

  _refreshCaches() {
    if (this._swCacheModel) {
      this._swCacheModel.refreshCacheNames();
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _cacheAdded(event) {
    const cache = /** @type {!SDK.ServiceWorkerCacheModel.Cache} */ (event.data.cache);
    const model = /** @type {!SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel} */ (event.data.model);
    this._addCache(model, cache);
  }

  /**
   * @param {!SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel} model
   * @param {!SDK.ServiceWorkerCacheModel.Cache} cache
   */
  _addCache(model, cache) {
    const swCacheTreeElement = new SWCacheTreeElement(this._storagePanel, model, cache);
    this._swCacheTreeElements.add(swCacheTreeElement);
    this.appendChild(swCacheTreeElement);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _cacheRemoved(event) {
    const cache = /** @type {!SDK.ServiceWorkerCacheModel.Cache} */ (event.data.cache);
    const model = /** @type {!SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel} */ (event.data.model);

    const swCacheTreeElement = this._cacheTreeElement(model, cache);
    if (!swCacheTreeElement) {
      return;
    }

    this.removeChild(swCacheTreeElement);
    this._swCacheTreeElements.delete(swCacheTreeElement);
    this.setExpandable(this.childCount() > 0);
  }

  /**
   * @param {!SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel} model
   * @param {!SDK.ServiceWorkerCacheModel.Cache} cache
   * @return {?SWCacheTreeElement}
   */
  _cacheTreeElement(model, cache) {
    for (const cacheTreeElement of this._swCacheTreeElements) {
      if (cacheTreeElement._cache.equals(cache) && cacheTreeElement._model === model) {
        return cacheTreeElement;
      }
    }
    return null;
  }
}

export class SWCacheTreeElement extends BaseStorageTreeElement {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
   * @param {!SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel} model
   * @param {!SDK.ServiceWorkerCacheModel.Cache} cache
   */
  constructor(storagePanel, model, cache) {
    super(storagePanel, cache.cacheName + ' - ' + cache.securityOrigin, false);
    this._model = model;
    this._cache = cache;
    /** @type {?ServiceWorkerCacheView} */
    this._view = null;
    const icon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL() {
    // I don't think this will work at all.
    return 'cache://' + this._cache.cacheId;
  }

  /**
   * @override
   */
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  _handleContextMenuEvent(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(Common.UIString.UIString('Delete'), this._clearCache.bind(this));
    contextMenu.show();
  }

  _clearCache() {
    this._model.deleteCache(this._cache);
  }

  /**
   * @param {!SDK.ServiceWorkerCacheModel.Cache} cache
   */
  update(cache) {
    this._cache = cache;
    if (this._view) {
      this._view.update(cache);
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
      this._view = new ServiceWorkerCacheView(this._model, this._cache);
    }

    this.showView(this._view);
    return false;
  }
}

/**
 * @unrestricted
 */
export class ServiceWorkersTreeElement extends BaseStorageTreeElement {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
   */
  constructor(storagePanel) {
    super(storagePanel, Common.UIString.UIString('Service Workers'), false);
    const icon = UI.Icon.Icon.create('mediumicon-service-worker', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
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

/**
 * @unrestricted
 */
export class AppManifestTreeElement extends BaseStorageTreeElement {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
   */
  constructor(storagePanel) {
    super(storagePanel, Common.UIString.UIString('Manifest'), false);
    const icon = UI.Icon.Icon.create('mediumicon-manifest', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
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

/**
 * @unrestricted
 */
export class ClearStorageTreeElement extends BaseStorageTreeElement {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
   */
  constructor(storagePanel) {
    super(storagePanel, Common.UIString.UIString('Clear storage'), false);
    const icon = UI.Icon.Icon.create('mediumicon-clear-storage', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
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

/**
 * @unrestricted
 */
export class IndexedDBTreeElement extends StorageCategoryTreeElement {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
   */
  constructor(storagePanel) {
    super(storagePanel, Common.UIString.UIString('IndexedDB'), 'IndexedDB');
    const icon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
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
    /** @type {!Array.<!IDBDatabaseTreeElement>} */
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
    const idbDatabaseTreeElement = new IDBDatabaseTreeElement(this._storagePanel, model, databaseId);
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

/**
 * @unrestricted
 */
export class IDBDatabaseTreeElement extends BaseStorageTreeElement {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
   * @param {!IndexedDBModel} model
   * @param {!DatabaseId} databaseId
   */
  constructor(storagePanel, model, databaseId) {
    super(storagePanel, databaseId.name + ' - ' + databaseId.securityOrigin, false);
    this._model = model;
    this._databaseId = databaseId;
    this._idbObjectStoreTreeElements = {};
    const icon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
    this._model.addEventListener(IndexedDBModelEvents.DatabaseNamesRefreshed, this._refreshIndexedDB, this);
  }

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
    if (this._idbObjectStoreTreeElements[objectStoreName]) {
      this._idbObjectStoreTreeElements[objectStoreName].markNeedsRefresh();
    }
  }

  /**
   * @param {!IndexedDBModelDatabase} database
   * @param {boolean} entriesUpdated
   */
  update(database, entriesUpdated) {
    this._database = database;
    const objectStoreNames = {};
    const objectStoreNamesSorted = Object.keys(this._database.objectStores).sort();
    for (const objectStoreName of objectStoreNamesSorted) {
      const objectStore = this._database.objectStores[objectStoreName];
      objectStoreNames[objectStore.name] = true;
      if (!this._idbObjectStoreTreeElements[objectStore.name]) {
        const idbObjectStoreTreeElement =
            new IDBObjectStoreTreeElement(this._storagePanel, this._model, this._databaseId, objectStore);
        this._idbObjectStoreTreeElements[objectStore.name] = idbObjectStoreTreeElement;
        this.appendChild(idbObjectStoreTreeElement);
      }
      this._idbObjectStoreTreeElements[objectStore.name].update(objectStore, entriesUpdated);
    }
    for (const objectStoreName in this._idbObjectStoreTreeElements) {
      if (!objectStoreNames[objectStoreName]) {
        this._objectStoreRemoved(objectStoreName);
      }
    }

    if (this._view) {
      this._view.update(database);
    }

    this._updateTooltip();
  }

  _updateTooltip() {
    if (Object.keys(this._idbObjectStoreTreeElements).length === 0) {
      this.tooltip = ls`Version: ${this._database.version} (empty)`;
    } else {
      this.tooltip = ls`Version: ${this._database.version}`;
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
      this._view = new IDBDatabaseView(this._model, this._database);
    }

    this.showView(this._view);
    return false;
  }

  /**
   * @param {string} objectStoreName
   */
  _objectStoreRemoved(objectStoreName) {
    const objectStoreTreeElement = this._idbObjectStoreTreeElements[objectStoreName];
    objectStoreTreeElement.clear();
    this.removeChild(objectStoreTreeElement);
    delete this._idbObjectStoreTreeElements[objectStoreName];
    this._updateTooltip();
  }

  clear() {
    for (const objectStoreName in this._idbObjectStoreTreeElements) {
      this._objectStoreRemoved(objectStoreName);
    }
  }
}

export class IDBObjectStoreTreeElement extends BaseStorageTreeElement {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
   * @param {!IndexedDBModel} model
   * @param {!DatabaseId} databaseId
   * @param {!ObjectStore} objectStore
   */
  constructor(storagePanel, model, databaseId, objectStore) {
    super(storagePanel, objectStore.name, false);
    this._model = model;
    this._databaseId = databaseId;
    this._idbIndexTreeElements = {};
    this._objectStore = objectStore;
    /** @type {?IDBDataView} */
    this._view = null;
    const icon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

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
    for (const indexName in this._idbIndexTreeElements) {
      this._idbIndexTreeElements[indexName].markNeedsRefresh();
    }
  }

  _handleContextMenuEvent(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(Common.UIString.UIString('Clear'), this._clearObjectStore.bind(this));
    contextMenu.show();
  }

  _refreshObjectStore() {
    if (this._view) {
      this._view.refreshData();
    }
    for (const indexName in this._idbIndexTreeElements) {
      this._idbIndexTreeElements[indexName].refreshIndex();
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

    const indexNames = {};
    for (const indexName in this._objectStore.indexes) {
      const index = this._objectStore.indexes[indexName];
      indexNames[index.name] = true;
      if (!this._idbIndexTreeElements[index.name]) {
        const idbIndexTreeElement = new IDBIndexTreeElement(
            this._storagePanel, this._model, this._databaseId, this._objectStore, index,
            this._refreshObjectStore.bind(this));
        this._idbIndexTreeElements[index.name] = idbIndexTreeElement;
        this.appendChild(idbIndexTreeElement);
      }
      this._idbIndexTreeElements[index.name].update(this._objectStore, index, entriesUpdated);
    }
    for (const indexName in this._idbIndexTreeElements) {
      if (!indexNames[indexName]) {
        this._indexRemoved(indexName);
      }
    }
    for (const indexName in this._idbIndexTreeElements) {
      if (!indexNames[indexName]) {
        this.removeChild(this._idbIndexTreeElements[indexName]);
        delete this._idbIndexTreeElements[indexName];
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
    const indexTreeElement = this._idbIndexTreeElements[indexName];
    indexTreeElement.clear();
    this.removeChild(indexTreeElement);
    delete this._idbIndexTreeElements[indexName];
  }

  clear() {
    for (const indexName in this._idbIndexTreeElements) {
      this._indexRemoved(indexName);
    }
    if (this._view) {
      this._view.clear();
    }
  }
}

/**
 * @unrestricted
 */
export class IDBIndexTreeElement extends BaseStorageTreeElement {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
   * @param {!IndexedDBModel} model
   * @param {!DatabaseId} databaseId
   * @param {!ObjectStore} objectStore
   * @param {!Index} index
   * @param {function()} refreshObjectStore
   */
  constructor(storagePanel, model, databaseId, objectStore, index, refreshObjectStore) {
    super(storagePanel, index.name, false);
    this._model = model;
    this._databaseId = databaseId;
    this._objectStore = objectStore;
    this._index = index;
    this._refreshObjectStore = refreshObjectStore;
  }

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

/**
 * @unrestricted
 */
export class DOMStorageTreeElement extends BaseStorageTreeElement {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
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
    this._storagePanel.showDOMStorage(this._domStorage);
    return false;
  }

  /**
   * @override
   */
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  _handleContextMenuEvent(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(Common.UIString.UIString('Clear'), () => this._domStorage.clear());
    contextMenu.show();
  }
}

export class CookieTreeElement extends BaseStorageTreeElement {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
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

  get itemURL() {
    return 'cookies://' + this._cookieDomain;
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
        Common.UIString.UIString('Clear'), () => this._storagePanel.clearCookies(this._target, this._cookieDomain));
    contextMenu.show();
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._storagePanel.showCookies(this._target, this._cookieDomain);
    return false;
  }
}

/**
 * @unrestricted
 */
export class ApplicationCacheManifestTreeElement extends BaseStorageTreeElement {
  constructor(storagePanel, manifestURL) {
    const title = new Common.ParsedURL.ParsedURL(manifestURL).displayName;
    super(storagePanel, title, false);
    this.tooltip = manifestURL;
    this._manifestURL = manifestURL;
  }

  get itemURL() {
    return 'appcache://' + this._manifestURL;
  }

  get manifestURL() {
    return this._manifestURL;
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._storagePanel.showCategoryView(this._manifestURL, null);
    return false;
  }
}

/**
 * @unrestricted
 */
export class ApplicationCacheFrameTreeElement extends BaseStorageTreeElement {
  /**
   * @param {!ApplicationPanelSidebar} sidebar
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   * @param {string} manifestURL
   */
  constructor(sidebar, frame, manifestURL) {
    super(sidebar._panel, '', false);
    this._sidebar = sidebar;
    this._frameId = frame.id;
    this._manifestURL = manifestURL;
    this._refreshTitles(frame);

    const icon = UI.Icon.Icon.create('largeicon-navigator-folder', 'navigator-tree-item');
    icon.classList.add('navigator-folder-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL() {
    return 'appcache://' + this._manifestURL + '/' + encodeURI(this.titleAsText());
  }

  get frameId() {
    return this._frameId;
  }

  get manifestURL() {
    return this._manifestURL;
  }

  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   */
  _refreshTitles(frame) {
    this.title = frame.displayName();
  }

  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   */
  frameNavigated(frame) {
    this._refreshTitles(frame);
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._sidebar._showApplicationCache(this._frameId);
    return false;
  }
}

/**
 * @unrestricted
 */
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

export class ResourcesSection {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
   * @param {!UI.TreeOutline.TreeElement} treeElement
   */
  constructor(storagePanel, treeElement) {
    this._panel = storagePanel;
    this._treeElement = treeElement;
    /** @type {!Map<string, !FrameTreeElement>} */
    this._treeElementForFrameId = new Map();

    function addListener(eventType, handler, target) {
      SDK.SDKModel.TargetManager.instance().addModelListener(
          SDK.ResourceTreeModel.ResourceTreeModel, eventType, event => handler.call(target, event.data));
    }
    addListener(SDK.ResourceTreeModel.Events.FrameAdded, this._frameAdded, this);
    addListener(SDK.ResourceTreeModel.Events.FrameNavigated, this._frameNavigated, this);
    addListener(SDK.ResourceTreeModel.Events.FrameDetached, this._frameDetached, this);
    addListener(SDK.ResourceTreeModel.Events.ResourceAdded, this._resourceAdded, this);

    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    const resourceTreeModel = mainTarget && mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const mainFrame = resourceTreeModel && resourceTreeModel.mainFrame;
    if (mainFrame) {
      this._frameAdded(mainFrame);
    }
  }

  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   * @returns {?SDK.ResourceTreeModel.ResourceTreeFrame}
   */
  static _getParentFrame(frame) {
    const parentFrame = frame.parentFrame;
    if (parentFrame) {
      return parentFrame;
    }
    const parentTarget = frame.resourceTreeModel().target().parentTarget();
    if (!parentTarget) {
      return null;
    }
    return parentTarget.model(SDK.ResourceTreeModel.ResourceTreeModel).mainFrame;
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
    if (!treeElement && !this._expandFrame(ResourcesSection._getParentFrame(frame))) {
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
   * @return {!Promise}
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
    const parentFrame = ResourcesSection._getParentFrame(frame);
    const parentTreeElement = parentFrame ? this._treeElementForFrameId.get(parentFrame.id) : this._treeElement;
    if (!parentTreeElement) {
      return;
    }
    const frameTreeElement = new FrameTreeElement(this, frame);
    this._treeElementForFrameId.set(frame.id, frameTreeElement);
    parentTreeElement.appendChild(frameTreeElement);
  }

  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   */
  _frameDetached(frame) {
    const frameTreeElement = this._treeElementForFrameId.get(frame.id);
    if (!frameTreeElement) {
      return;
    }

    this._treeElementForFrameId.delete(frame.id);
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

  reset() {
    this._treeElement.removeChildren();
    this._treeElementForFrameId.clear();
  }
}

export class FrameTreeElement extends BaseStorageTreeElement {
  /**
   * @param {!ResourcesSection} section
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   */
  constructor(section, frame) {
    super(section._panel, '', false);
    this._populated = false;
    this._section = section;
    this._frame = frame;
    this._frameId = frame.id;
    this._categoryElements = {};
    this._treeElementForResource = {};
    this.setExpandable(true);
    this.frameNavigated(frame);

    const icon = UI.Icon.Icon.create('largeicon-navigator-frame', 'navigator-tree-item');
    icon.classList.add('navigator-frame-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   */
  frameNavigated(frame) {
    this.invalidateChildren();
    this._frameId = frame.id;
    this.title = frame.displayName();
    this._categoryElements = {};
    this._treeElementForResource = {};
  }

  get itemURL() {
    return 'frame://' + encodeURI(this.titleAsText());
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._section._panel.showCategoryView(this.titleAsText(), null);

    this.listItemElement.classList.remove('hovered');
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    return false;
  }

  set hovered(hovered) {
    if (hovered) {
      this.listItemElement.classList.add('hovered');
      this._frame.resourceTreeModel().domModel().overlayModel().highlightFrame(this._frameId);
    } else {
      this.listItemElement.classList.remove('hovered');
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
  }

  /**
   * @param {!SDK.Resource.Resource} resource
   */
  appendResource(resource) {
    if (!this._populated) {
      return;
    }
    const statusCode = resource['statusCode'];
    if (statusCode >= 301 && statusCode <= 303) {
      return;
    }

    const resourceType = resource.resourceType();
    const categoryName = resourceType.name();
    let categoryElement =
        resourceType === Common.ResourceType.resourceTypes.Document ? this : this._categoryElements[categoryName];
    if (!categoryElement) {
      categoryElement =
          new StorageCategoryTreeElement(this._section._panel, resource.resourceType().category().title, categoryName);
      this._categoryElements[resourceType.name()] = categoryElement;
      this._insertInPresentationOrder(this, categoryElement);
    }
    const resourceTreeElement = new FrameResourceTreeElement(this._section._panel, resource);
    this._insertInPresentationOrder(categoryElement, resourceTreeElement);
    this._treeElementForResource[resource.url] = resourceTreeElement;
  }

  /**
   * @param {string} url
   * @return {?SDK.Resource.Resource}
   */
  resourceByURL(url) {
    const treeElement = this._treeElementForResource[url];
    return treeElement ? treeElement._resource : null;
  }

  /**
   * @override
   * @param {!UI.TreeOutline.TreeElement} treeElement
   */
  appendChild(treeElement) {
    if (!this._populated) {
      return;
    }
    this._insertInPresentationOrder(this, treeElement);
  }

  _insertInPresentationOrder(parentTreeElement, childTreeElement) {
    // Insert in the alphabetical order, first frames, then resources. Document resource goes last.
    function typeWeight(treeElement) {
      if (treeElement instanceof StorageCategoryTreeElement) {
        return 2;
      }
      if (treeElement instanceof FrameTreeElement) {
        return 1;
      }
      return 3;
    }

    function compare(treeElement1, treeElement2) {
      const typeWeight1 = typeWeight(treeElement1);
      const typeWeight2 = typeWeight(treeElement2);

      let result;
      if (typeWeight1 > typeWeight2) {
        result = 1;
      } else if (typeWeight1 < typeWeight2) {
        result = -1;
      } else {
        result = treeElement1.titleAsText().localeCompare(treeElement2.titleAsText());
      }
      return result;
    }

    const childCount = parentTreeElement.childCount();
    let i;
    for (i = 0; i < childCount; ++i) {
      if (compare(childTreeElement, parentTreeElement.childAt(i)) < 0) {
        break;
      }
    }
    parentTreeElement.insertChild(childTreeElement, i);
  }

  /**
   * @override
   * @returns {!Promise}
   */
  async onpopulate() {
    this._populated = true;
    for (const child of this._frame.childFrames) {
      this._section._frameAdded(child);
    }
    for (const resource of this._frame.resources()) {
      this.appendResource(resource);
    }
  }
}

export class FrameResourceTreeElement extends BaseStorageTreeElement {
  /**
   * @param {!UI.Panel.PanelWithSidebar} storagePanel
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
    this._resource[FrameResourceTreeElement._symbol] = this;

    const icon = UI.Icon.Icon.create('largeicon-navigator-file', 'navigator-tree-item');
    icon.classList.add('navigator-file-tree-item');
    icon.classList.add('navigator-' + resource.resourceType().name() + '-tree-item');
    this.setLeadingIcons([icon]);
  }

  /**
   * @param {!SDK.Resource.Resource} resource
   */
  static forResource(resource) {
    return resource[FrameResourceTreeElement._symbol];
  }

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
   * @param {!MouseEvent} event
   * @return {boolean}
   */
  _ondragstart(event) {
    event.dataTransfer.setData('text/plain', this._resource.content || '');
    event.dataTransfer.effectAllowed = 'copy';
    return true;
  }

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

FrameResourceTreeElement._symbol = Symbol('treeElement');
