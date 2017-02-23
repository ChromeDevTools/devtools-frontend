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
/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Resources.ResourcesPanel = class extends UI.PanelWithSidebar {
  constructor() {
    super('resources');
    this.registerRequiredCSS('resources/resourcesPanel.css');

    this._resourcesLastSelectedItemSetting = Common.settings.createSetting('resourcesLastSelectedItem', {});

    this._sidebarTree = new UI.TreeOutlineInShadow();
    this._sidebarTree.element.classList.add('resources-sidebar');
    this._sidebarTree.registerRequiredCSS('resources/resourcesSidebar.css');
    this._sidebarTree.element.classList.add('filter-all');
    this.panelSidebarElement().appendChild(this._sidebarTree.element);

    this._applicationTreeElement = this._addSidebarSection(Common.UIString('Application'));
    this._manifestTreeElement = new Resources.AppManifestTreeElement(this);
    this._applicationTreeElement.appendChild(this._manifestTreeElement);
    this.serviceWorkersTreeElement = new Resources.ServiceWorkersTreeElement(this);
    this._applicationTreeElement.appendChild(this.serviceWorkersTreeElement);
    var clearStorageTreeElement = new Resources.ClearStorageTreeElement(this);
    this._applicationTreeElement.appendChild(clearStorageTreeElement);

    var storageTreeElement = this._addSidebarSection(Common.UIString('Storage'));
    this.localStorageListTreeElement =
        new Resources.StorageCategoryTreeElement(this, Common.UIString('Local Storage'), 'LocalStorage');
    var localStorageIcon = UI.Icon.create('mediumicon-table', 'resource-tree-item');
    this.localStorageListTreeElement.setLeadingIcons([localStorageIcon]);

    storageTreeElement.appendChild(this.localStorageListTreeElement);
    this.sessionStorageListTreeElement =
        new Resources.StorageCategoryTreeElement(this, Common.UIString('Session Storage'), 'SessionStorage');
    var sessionStorageIcon = UI.Icon.create('mediumicon-table', 'resource-tree-item');
    this.sessionStorageListTreeElement.setLeadingIcons([sessionStorageIcon]);

    storageTreeElement.appendChild(this.sessionStorageListTreeElement);
    this.indexedDBListTreeElement = new Resources.IndexedDBTreeElement(this);
    storageTreeElement.appendChild(this.indexedDBListTreeElement);
    this.databasesListTreeElement =
        new Resources.StorageCategoryTreeElement(this, Common.UIString('Web SQL'), 'Databases');
    var databaseIcon = UI.Icon.create('mediumicon-database', 'resource-tree-item');
    this.databasesListTreeElement.setLeadingIcons([databaseIcon]);

    storageTreeElement.appendChild(this.databasesListTreeElement);
    this.cookieListTreeElement = new Resources.StorageCategoryTreeElement(this, Common.UIString('Cookies'), 'Cookies');
    var cookieIcon = UI.Icon.create('mediumicon-cookie', 'resource-tree-item');
    this.cookieListTreeElement.setLeadingIcons([cookieIcon]);
    storageTreeElement.appendChild(this.cookieListTreeElement);

    var cacheTreeElement = this._addSidebarSection(Common.UIString('Cache'));
    this.cacheStorageListTreeElement = new Resources.ServiceWorkerCacheTreeElement(this);
    cacheTreeElement.appendChild(this.cacheStorageListTreeElement);
    this.applicationCacheListTreeElement =
        new Resources.StorageCategoryTreeElement(this, Common.UIString('Application Cache'), 'ApplicationCache');
    var applicationCacheIcon = UI.Icon.create('mediumicon-table', 'resource-tree-item');
    this.applicationCacheListTreeElement.setLeadingIcons([applicationCacheIcon]);

    cacheTreeElement.appendChild(this.applicationCacheListTreeElement);

    this.resourcesListTreeElement = this._addSidebarSection(Common.UIString('Frames'));

    var mainContainer = new UI.VBox();
    this.storageViews = mainContainer.element.createChild('div', 'vbox flex-auto');
    this._storageViewToolbar = new UI.Toolbar('resources-toolbar', mainContainer.element);
    this.splitWidget().setMainWidget(mainContainer);

    /** @type {!Map.<!Resources.Database, !Object.<string, !Resources.DatabaseTableView>>} */
    this._databaseTableViews = new Map();
    /** @type {!Map.<!Resources.Database, !Resources.DatabaseQueryView>} */
    this._databaseQueryViews = new Map();
    /** @type {!Map.<!Resources.Database, !Resources.DatabaseTreeElement>} */
    this._databaseTreeElements = new Map();
    /** @type {!Map.<!Resources.DOMStorage, !Resources.DOMStorageTreeElement>} */
    this._domStorageTreeElements = new Map();
    /** @type {!Object.<string, boolean>} */
    this._domains = {};

    /** @type {?Resources.DOMStorageItemsView} */
    this._domStorageView = null;
    /** @type {?Resources.CookieItemsView} */
    this._cookieView = null;

    this.panelSidebarElement().addEventListener('mousemove', this._onmousemove.bind(this), false);
    this.panelSidebarElement().addEventListener('mouseleave', this._onmouseleave.bind(this), false);

    SDK.targetManager.observeTargets(this);
  }

  /**
   * @return {!Resources.ResourcesPanel}
   */
  static _instance() {
    return /** @type {!Resources.ResourcesPanel} */ (self.runtime.sharedInstance(Resources.ResourcesPanel));
  }

  /**
   * @param {string} title
   * @return {!UI.TreeElement}
   */
  _addSidebarSection(title) {
    var treeElement = new UI.TreeElement(title, true);
    treeElement.listItemElement.classList.add('storage-group-list-item');
    treeElement.setCollapsible(false);
    treeElement.selectable = false;
    this._sidebarTree.appendChild(treeElement);
    return treeElement;
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    if (this._target)
      return;
    this._target = target;
    this._databaseModel = Resources.DatabaseModel.fromTarget(target);

    this._databaseModel.on(Resources.DatabaseModel.DatabaseAddedEvent, this._databaseAdded, this);
    this._databaseModel.on(Resources.DatabaseModel.DatabasesRemovedEvent, this._resetWebSQL, this);

    var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(target);
    if (!resourceTreeModel)
      return;

    if (resourceTreeModel.cachedResourcesLoaded())
      this._initialize();

    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded, this._initialize, this);
    resourceTreeModel.addEventListener(
        SDK.ResourceTreeModel.Events.WillLoadCachedResources, this._resetWithFrames, this);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    if (target !== this._target)
      return;
    delete this._target;

    var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(target);
    if (resourceTreeModel) {
      resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded, this._initialize, this);
      resourceTreeModel.removeEventListener(
          SDK.ResourceTreeModel.Events.WillLoadCachedResources, this._resetWithFrames, this);
    }
    this._databaseModel.off(Resources.DatabaseModel.DatabaseAddedEvent, this._databaseAdded, this);
    this._databaseModel.off(Resources.DatabaseModel.DatabasesRemovedEvent, this._resetWebSQL, this);

    this._resetWithFrames();
  }

  /**
   * @override
   */
  focus() {
    this._sidebarTree.focus();
  }

  _initialize() {
    this._databaseModel.enable();

    var indexedDBModel = Resources.IndexedDBModel.fromTarget(this._target);
    if (indexedDBModel)
      indexedDBModel.enable();

    var cacheStorageModel = SDK.ServiceWorkerCacheModel.fromTarget(this._target);
    if (cacheStorageModel)
      cacheStorageModel.enable();
    var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(this._target);
    if (resourceTreeModel) {
      this._populateResourceTree(resourceTreeModel);
      this._populateApplicationCacheTree(resourceTreeModel);
    }
    var domStorageModel = Resources.DOMStorageModel.fromTarget(this._target);
    if (domStorageModel)
      this._populateDOMStorageTree(domStorageModel);
    this.indexedDBListTreeElement._initialize();
    this.cacheStorageListTreeElement._initialize();
    this._initDefaultSelection();
  }

  _initDefaultSelection() {
    var itemURL = this._resourcesLastSelectedItemSetting.get();
    if (itemURL) {
      var rootElement = this._sidebarTree.rootElement();
      for (var treeElement = rootElement.firstChild(); treeElement;
           treeElement = treeElement.traverseNextTreeElement(false, rootElement, true)) {
        if (treeElement.itemURL === itemURL) {
          treeElement.revealAndSelect(true);
          return;
        }
      }
    }
    this._manifestTreeElement.select();
  }

  _resetWithFrames() {
    this.resourcesListTreeElement.removeChildren();
    this._treeElementForFrameId = {};
    this._reset();
  }

  _resetWebSQL() {
    if (this.visibleView instanceof Resources.DatabaseQueryView ||
        this.visibleView instanceof Resources.DatabaseTableView) {
      this.visibleView.detach();
      delete this.visibleView;
    }

    var queryViews = this._databaseQueryViews.valuesArray();
    for (var i = 0; i < queryViews.length; ++i) {
      queryViews[i].removeEventListener(
          Resources.DatabaseQueryView.Events.SchemaUpdated, this._updateDatabaseTables, this);
    }
    this._databaseTableViews.clear();
    this._databaseQueryViews.clear();
    this._databaseTreeElements.clear();
    this.databasesListTreeElement.removeChildren();
    this.databasesListTreeElement.setExpandable(false);
  }

  _resetDOMStorage() {
    if (this.visibleView === this._domStorageView) {
      this.visibleView.detach();
      delete this.visibleView;
    }

    this._domStorageTreeElements.clear();
    this.localStorageListTreeElement.removeChildren();
    this.sessionStorageListTreeElement.removeChildren();
  }

  _resetCookies() {
    if (this.visibleView instanceof Resources.CookieItemsView) {
      this.visibleView.detach();
      delete this.visibleView;
    }
    this.cookieListTreeElement.removeChildren();
  }

  _resetCacheStorage() {
    if (this.visibleView instanceof Resources.ServiceWorkerCacheView) {
      this.visibleView.detach();
      delete this.visibleView;
    }
    this.cacheStorageListTreeElement.removeChildren();
    this.cacheStorageListTreeElement.setExpandable(false);
  }

  _resetAppCache() {
    for (var frameId of Object.keys(this._applicationCacheFrameElements))
      this._applicationCacheFrameManifestRemoved({data: frameId});
    this.applicationCacheListTreeElement.setExpandable(false);
  }

  _reset() {
    this._domains = {};
    this._resetWebSQL();
    this._resetDOMStorage();
    this._resetCookies();
    this._resetCacheStorage();
    // No need to this._resetAppCache.

    if ((this.visibleView instanceof SourceFrame.ResourceSourceFrame) ||
        (this.visibleView instanceof SourceFrame.ImageView) || (this.visibleView instanceof SourceFrame.FontView)) {
      this.visibleView.detach();
      delete this.visibleView;
    }

    this._storageViewToolbar.removeToolbarItems();

    if (this._sidebarTree.selectedTreeElement)
      this._sidebarTree.selectedTreeElement.deselect();
  }

  /**
   * @param {!SDK.ResourceTreeModel} resourceTreeModel
   */
  _populateResourceTree(resourceTreeModel) {
    this._treeElementForFrameId = {};
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameAdded, this._frameAdded, this);
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameNavigated, this._frameNavigated, this);
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameDetached, this._frameDetached, this);
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.ResourceAdded, this._resourceAdded, this);

    /**
     * @param {!SDK.ResourceTreeFrame} frame
     * @this {Resources.ResourcesPanel}
     */
    function populateFrame(frame) {
      this._frameAdded({data: frame});
      for (var i = 0; i < frame.childFrames.length; ++i)
        populateFrame.call(this, frame.childFrames[i]);

      var resources = frame.resources();
      for (var i = 0; i < resources.length; ++i)
        this._resourceAdded({data: resources[i]});
    }
    populateFrame.call(this, resourceTreeModel.mainFrame);
  }

  _frameAdded(event) {
    var frame = event.data;
    var parentFrame = frame.parentFrame;

    var parentTreeElement = parentFrame ? this._treeElementForFrameId[parentFrame.id] : this.resourcesListTreeElement;
    if (!parentTreeElement) {
      console.warn('No frame to route ' + frame.url + ' to.');
      return;
    }

    var frameTreeElement = new Resources.FrameTreeElement(this, frame);
    this._treeElementForFrameId[frame.id] = frameTreeElement;
    parentTreeElement.appendChild(frameTreeElement);
  }

  _frameDetached(event) {
    var frame = event.data;
    var frameTreeElement = this._treeElementForFrameId[frame.id];
    if (!frameTreeElement)
      return;

    delete this._treeElementForFrameId[frame.id];
    if (frameTreeElement.parent)
      frameTreeElement.parent.removeChild(frameTreeElement);
  }

  _resourceAdded(event) {
    var resource = event.data;
    var frameId = resource.frameId;

    if (resource.statusCode >= 301 && resource.statusCode <= 303)
      return;

    var frameTreeElement = this._treeElementForFrameId[frameId];
    if (!frameTreeElement) {
      // This is a frame's main resource, it will be retained
      // and re-added by the resource manager;
      return;
    }

    frameTreeElement.appendResource(resource);
  }

  _frameNavigated(event) {
    var frame = event.data;

    if (!frame.parentFrame)
      this._reset();

    var frameId = frame.id;
    var frameTreeElement = this._treeElementForFrameId[frameId];
    if (frameTreeElement)
      frameTreeElement.frameNavigated(frame);

    var applicationCacheFrameTreeElement = this._applicationCacheFrameElements[frameId];
    if (applicationCacheFrameTreeElement)
      applicationCacheFrameTreeElement.frameNavigated(frame);
  }

  /**
   * @param {!Resources.DatabaseModel.DatabaseAddedEvent} event
   */
  _databaseAdded(event) {
    var databaseTreeElement = new Resources.DatabaseTreeElement(this, event.database);
    this._databaseTreeElements.set(event.database, databaseTreeElement);
    this.databasesListTreeElement.appendChild(databaseTreeElement);
  }

  /**
   * @param {!SDK.ResourceTreeFrame} frame
   */
  addCookieDocument(frame) {
    var parsedURL = frame.url.asParsedURL();
    if (!parsedURL || (parsedURL.scheme !== 'http' && parsedURL.scheme !== 'https' && parsedURL.scheme !== 'file'))
      return;

    var domain = parsedURL.securityOrigin();
    if (!this._domains[domain]) {
      this._domains[domain] = true;
      var cookieDomainTreeElement = new Resources.CookieTreeElement(this, frame, domain);
      this.cookieListTreeElement.appendChild(cookieDomainTreeElement);
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _domStorageAdded(event) {
    var domStorage = /** @type {!Resources.DOMStorage} */ (event.data);
    this._addDOMStorage(domStorage);
  }

  /**
   * @param {!Resources.DOMStorage} domStorage
   */
  _addDOMStorage(domStorage) {
    console.assert(!this._domStorageTreeElements.get(domStorage));

    var domStorageTreeElement = new Resources.DOMStorageTreeElement(this, domStorage);
    this._domStorageTreeElements.set(domStorage, domStorageTreeElement);
    if (domStorage.isLocalStorage)
      this.localStorageListTreeElement.appendChild(domStorageTreeElement);
    else
      this.sessionStorageListTreeElement.appendChild(domStorageTreeElement);
  }

  /**
   * @param {!Common.Event} event
   */
  _domStorageRemoved(event) {
    var domStorage = /** @type {!Resources.DOMStorage} */ (event.data);
    this._removeDOMStorage(domStorage);
  }

  /**
   * @param {!Resources.DOMStorage} domStorage
   */
  _removeDOMStorage(domStorage) {
    var treeElement = this._domStorageTreeElements.get(domStorage);
    if (!treeElement)
      return;
    var wasSelected = treeElement.selected;
    var parentListTreeElement = treeElement.parent;
    parentListTreeElement.removeChild(treeElement);
    if (wasSelected)
      parentListTreeElement.select();
    this._domStorageTreeElements.remove(domStorage);
  }

  /**
   * @param {!Resources.Database} database
   */
  selectDatabase(database) {
    if (database) {
      this._showDatabase(database);
      this._databaseTreeElements.get(database).select();
    }
  }

  /**
   * @param {!Resources.DOMStorage} domStorage
   */
  selectDOMStorage(domStorage) {
    if (domStorage) {
      this._showDOMStorage(domStorage);
      this._domStorageTreeElements.get(domStorage).select();
    }
  }

  /**
   * @param {!SDK.Resource} resource
   * @param {number=} line
   * @param {number=} column
   * @return {boolean}
   */
  showResource(resource, line, column) {
    var resourceTreeElement = this._findTreeElementForResource(resource);
    if (resourceTreeElement)
      resourceTreeElement.revealAndSelect(true);

    if (typeof line === 'number') {
      var resourceSourceFrame = this._resourceSourceFrameViewForResource(resource);
      if (resourceSourceFrame)
        resourceSourceFrame.revealPosition(line, column, true);
    }
    return true;
  }

  _showResourceView(resource) {
    var view = this._resourceViewForResource(resource);
    if (!view) {
      this.visibleView.detach();
      return;
    }
    this._innerShowView(view);
  }

  /**
   * @param {!SDK.Resource} resource
   * @return {?UI.Widget}
   */
  _resourceViewForResource(resource) {
    if (resource.hasTextContent()) {
      var treeElement = this._findTreeElementForResource(resource);
      if (!treeElement)
        return null;
      return treeElement.sourceView();
    }

    switch (resource.resourceType()) {
      case Common.resourceTypes.Image:
        return new SourceFrame.ImageView(resource.mimeType, resource);
      case Common.resourceTypes.Font:
        return new SourceFrame.FontView(resource.mimeType, resource);
      default:
        return new UI.EmptyWidget(resource.url);
    }
  }

  /**
   * @param {!SDK.Resource} resource
   * @return {?SourceFrame.ResourceSourceFrame}
   */
  _resourceSourceFrameViewForResource(resource) {
    var resourceView = this._resourceViewForResource(resource);
    if (resourceView && resourceView instanceof SourceFrame.ResourceSourceFrame)
      return /** @type {!SourceFrame.ResourceSourceFrame} */ (resourceView);
    return null;
  }

  /**
   * @param {!Resources.Database} database
   * @param {string=} tableName
   */
  _showDatabase(database, tableName) {
    if (!database)
      return;

    var view;
    if (tableName) {
      var tableViews = this._databaseTableViews.get(database);
      if (!tableViews) {
        tableViews = /** @type {!Object.<string, !Resources.DatabaseTableView>} */ ({});
        this._databaseTableViews.set(database, tableViews);
      }
      view = tableViews[tableName];
      if (!view) {
        view = new Resources.DatabaseTableView(database, tableName);
        tableViews[tableName] = view;
      }
    } else {
      view = this._databaseQueryViews.get(database);
      if (!view) {
        view = new Resources.DatabaseQueryView(database);
        this._databaseQueryViews.set(database, view);
        view.addEventListener(Resources.DatabaseQueryView.Events.SchemaUpdated, this._updateDatabaseTables, this);
      }
    }

    this._innerShowView(view);
  }

  /**
   * @param {!Resources.DOMStorage} domStorage
   */
  _showDOMStorage(domStorage) {
    if (!domStorage)
      return;

    if (!this._domStorageView)
      this._domStorageView = new Resources.DOMStorageItemsView(domStorage);
    else
      this._domStorageView.setStorage(domStorage);
    this._innerShowView(this._domStorageView);
  }

  /**
   * @param {!Resources.CookieTreeElement} treeElement
   * @param {string} cookieDomain
   * @param {!SDK.Target} cookieFrameTarget
   */
  showCookies(treeElement, cookieDomain, cookieFrameTarget) {
    var model = SDK.CookieModel.fromTarget(cookieFrameTarget);
    if (!this._cookieView)
      this._cookieView = new Resources.CookieItemsView(treeElement, model, cookieDomain);
    else
      this._cookieView.setCookiesDomain(model, cookieDomain);
    this._innerShowView(this._cookieView);
  }

  /**
   * @param {!SDK.Target} target
   * @param {string} cookieDomain
   */
  _clearCookies(target, cookieDomain) {
    SDK.CookieModel.fromTarget(target).clear(cookieDomain, () => {
      if (this._cookieView)
        this._cookieView.refreshItems();
    });
  }

  showApplicationCache(frameId) {
    if (!this._applicationCacheViews[frameId]) {
      this._applicationCacheViews[frameId] =
          new Resources.ApplicationCacheItemsView(this._applicationCacheModel, frameId);
    }

    this._innerShowView(this._applicationCacheViews[frameId]);
  }

  /**
   *  @param {!UI.Widget} view
   */
  showFileSystem(view) {
    this._innerShowView(view);
  }

  showCategoryView(categoryName) {
    if (!this._categoryView)
      this._categoryView = new Resources.StorageCategoryView();
    this._categoryView.setText(categoryName);
    this._innerShowView(this._categoryView);
  }

  _innerShowView(view) {
    if (this.visibleView === view)
      return;

    if (this.visibleView)
      this.visibleView.detach();

    view.show(this.storageViews);
    this.visibleView = view;

    this._storageViewToolbar.removeToolbarItems();
    var toolbarItems = (view instanceof UI.SimpleView && view.syncToolbarItems()) || [];
    for (var i = 0; i < toolbarItems.length; ++i)
      this._storageViewToolbar.appendToolbarItem(toolbarItems[i]);
    this._storageViewToolbar.element.classList.toggle('hidden', !toolbarItems.length);
  }

  closeVisibleView() {
    if (!this.visibleView)
      return;
    this.visibleView.detach();
    delete this.visibleView;
  }

  _updateDatabaseTables(event) {
    var database = event.data;

    if (!database)
      return;

    var databasesTreeElement = this._databaseTreeElements.get(database);
    if (!databasesTreeElement)
      return;

    databasesTreeElement.invalidateChildren();
    var tableViews = this._databaseTableViews.get(database);

    if (!tableViews)
      return;

    var tableNamesHash = {};
    var self = this;
    function tableNamesCallback(tableNames) {
      var tableNamesLength = tableNames.length;
      for (var i = 0; i < tableNamesLength; ++i)
        tableNamesHash[tableNames[i]] = true;

      for (var tableName in tableViews) {
        if (!(tableName in tableNamesHash)) {
          if (self.visibleView === tableViews[tableName])
            self.closeVisibleView();
          delete tableViews[tableName];
        }
      }
    }
    database.getTableNames(tableNamesCallback);
  }

  /**
   * @param {!Resources.DOMStorageModel} domStorageModel
   */
  _populateDOMStorageTree(domStorageModel) {
    domStorageModel.enable();
    domStorageModel.storages().forEach(this._addDOMStorage.bind(this));
    domStorageModel.addEventListener(Resources.DOMStorageModel.Events.DOMStorageAdded, this._domStorageAdded, this);
    domStorageModel.addEventListener(Resources.DOMStorageModel.Events.DOMStorageRemoved, this._domStorageRemoved, this);
  }

  /**
   * @param {!SDK.ResourceTreeModel} resourceTreeModel
   */
  _populateApplicationCacheTree(resourceTreeModel) {
    this._applicationCacheModel = Resources.ApplicationCacheModel.fromTarget(this._target);

    this._applicationCacheViews = {};
    this._applicationCacheFrameElements = {};
    this._applicationCacheManifestElements = {};

    this._applicationCacheModel.addEventListener(
        Resources.ApplicationCacheModel.Events.FrameManifestAdded, this._applicationCacheFrameManifestAdded, this);
    this._applicationCacheModel.addEventListener(
        Resources.ApplicationCacheModel.Events.FrameManifestRemoved, this._applicationCacheFrameManifestRemoved, this);
    this._applicationCacheModel.addEventListener(
        Resources.ApplicationCacheModel.Events.FrameManifestsReset, this._resetAppCache, this);

    this._applicationCacheModel.addEventListener(
        Resources.ApplicationCacheModel.Events.FrameManifestStatusUpdated,
        this._applicationCacheFrameManifestStatusChanged, this);
    this._applicationCacheModel.addEventListener(
        Resources.ApplicationCacheModel.Events.NetworkStateChanged, this._applicationCacheNetworkStateChanged, this);
  }

  _applicationCacheFrameManifestAdded(event) {
    var frameId = event.data;
    var manifestURL = this._applicationCacheModel.frameManifestURL(frameId);

    var manifestTreeElement = this._applicationCacheManifestElements[manifestURL];
    if (!manifestTreeElement) {
      manifestTreeElement = new Resources.ApplicationCacheManifestTreeElement(this, manifestURL);
      this.applicationCacheListTreeElement.appendChild(manifestTreeElement);
      this._applicationCacheManifestElements[manifestURL] = manifestTreeElement;
    }

    var frameTreeElement = new Resources.ApplicationCacheFrameTreeElement(this, frameId, manifestURL);
    manifestTreeElement.appendChild(frameTreeElement);
    manifestTreeElement.expand();
    this._applicationCacheFrameElements[frameId] = frameTreeElement;
  }

  _applicationCacheFrameManifestRemoved(event) {
    var frameId = event.data;
    var frameTreeElement = this._applicationCacheFrameElements[frameId];
    if (!frameTreeElement)
      return;

    var manifestURL = frameTreeElement.manifestURL;
    delete this._applicationCacheFrameElements[frameId];
    delete this._applicationCacheViews[frameId];
    frameTreeElement.parent.removeChild(frameTreeElement);

    var manifestTreeElement = this._applicationCacheManifestElements[manifestURL];
    if (manifestTreeElement.childCount())
      return;

    delete this._applicationCacheManifestElements[manifestURL];
    manifestTreeElement.parent.removeChild(manifestTreeElement);
  }

  _applicationCacheFrameManifestStatusChanged(event) {
    var frameId = event.data;
    var status = this._applicationCacheModel.frameManifestStatus(frameId);

    if (this._applicationCacheViews[frameId])
      this._applicationCacheViews[frameId].updateStatus(status);
  }

  _applicationCacheNetworkStateChanged(event) {
    var isNowOnline = event.data;

    for (var manifestURL in this._applicationCacheViews)
      this._applicationCacheViews[manifestURL].updateNetworkState(isNowOnline);
  }

  _findTreeElementForResource(resource) {
    return resource[Resources.FrameResourceTreeElement._symbol];
  }

  showView(view) {
    if (view)
      this.showResource(view.resource);
  }

  _onmousemove(event) {
    var nodeUnderMouse = event.target;
    if (!nodeUnderMouse)
      return;

    var listNode = nodeUnderMouse.enclosingNodeOrSelfWithNodeName('li');
    if (!listNode)
      return;

    var element = listNode.treeElement;
    if (this._previousHoveredElement === element)
      return;

    if (this._previousHoveredElement) {
      this._previousHoveredElement.hovered = false;
      delete this._previousHoveredElement;
    }

    if (element instanceof Resources.FrameTreeElement) {
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
};

/**
 * @implements {Common.Revealer}
 * @unrestricted
 */
Resources.ResourcesPanel.ResourceRevealer = class {
  /**
   * @override
   * @param {!Object} resource
   * @return {!Promise}
   */
  reveal(resource) {
    if (!(resource instanceof SDK.Resource))
      return Promise.reject(new Error('Internal error: not a resource'));
    var panel = Resources.ResourcesPanel._instance();
    return UI.viewManager.showView('resources').then(panel.showResource.bind(panel, resource));
  }
};

/**
 * @unrestricted
 */
Resources.BaseStorageTreeElement = class extends UI.TreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   * @param {string} title
   * @param {boolean} expandable
   */
  constructor(storagePanel, title, expandable) {
    super(title, expandable);
    this._storagePanel = storagePanel;
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    if (!selectedByUser)
      return false;
    var itemURL = this.itemURL;
    if (itemURL)
      this._storagePanel._resourcesLastSelectedItemSetting.set(itemURL);
    return false;
  }
};

/**
 * @unrestricted
 */
Resources.StorageCategoryTreeElement = class extends Resources.BaseStorageTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   * @param {string} categoryName
   * @param {string} settingsKey
   */
  constructor(storagePanel, categoryName, settingsKey) {
    super(storagePanel, categoryName, false);
    this._expandedSetting =
        Common.settings.createSetting('resources' + settingsKey + 'Expanded', settingsKey === 'Frames');
    this._categoryName = categoryName;
  }

  /**
   * @return {!SDK.Target}
   */
  target() {
    return this._storagePanel._target;
  }

  get itemURL() {
    return 'category://' + this._categoryName;
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._storagePanel.showCategoryView(this._categoryName);
    return false;
  }

  /**
   * @override
   */
  onattach() {
    super.onattach();
    if (this._expandedSetting.get())
      this.expand();
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
};

/**
 * @unrestricted
 */
Resources.FrameTreeElement = class extends Resources.BaseStorageTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   * @param {!SDK.ResourceTreeFrame} frame
   */
  constructor(storagePanel, frame) {
    super(storagePanel, '', false);
    this._frame = frame;
    this.frameNavigated(frame);

    var icon = UI.Icon.create('largeicon-navigator-frame', 'navigator-tree-item');
    icon.classList.add('navigator-frame-tree-item');
    this.setLeadingIcons([icon]);
  }

  frameNavigated(frame) {
    this.removeChildren();
    this._frameId = frame.id;
    this.title = frame.displayName();
    this._categoryElements = {};
    this._treeElementForResource = {};

    this._storagePanel.addCookieDocument(frame);
  }

  get itemURL() {
    return 'frame://' + encodeURI(this.titleAsText());
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._storagePanel.showCategoryView(this.titleAsText());

    this.listItemElement.classList.remove('hovered');
    SDK.DOMModel.hideDOMNodeHighlight();
    return false;
  }

  set hovered(hovered) {
    if (hovered) {
      this.listItemElement.classList.add('hovered');
      var domModel = SDK.DOMModel.fromTarget(this._frame.target());
      if (domModel)
        domModel.highlightFrame(this._frameId);
    } else {
      this.listItemElement.classList.remove('hovered');
      SDK.DOMModel.hideDOMNodeHighlight();
    }
  }

  /**
   * @param {!SDK.Resource} resource
   */
  appendResource(resource) {
    var resourceType = resource.resourceType();
    var categoryName = resourceType.name();
    var categoryElement = resourceType === Common.resourceTypes.Document ? this : this._categoryElements[categoryName];
    if (!categoryElement) {
      categoryElement = new Resources.StorageCategoryTreeElement(
          this._storagePanel, resource.resourceType().category().title, categoryName);
      this._categoryElements[resourceType.name()] = categoryElement;
      this._insertInPresentationOrder(this, categoryElement);
    }
    var resourceTreeElement = new Resources.FrameResourceTreeElement(this._storagePanel, resource);
    this._insertInPresentationOrder(categoryElement, resourceTreeElement);
    this._treeElementForResource[resource.url] = resourceTreeElement;
  }

  /**
   * @param {string} url
   * @return {?SDK.Resource}
   */
  resourceByURL(url) {
    var treeElement = this._treeElementForResource[url];
    return treeElement ? treeElement._resource : null;
  }

  /**
   * @override
   */
  appendChild(treeElement) {
    this._insertInPresentationOrder(this, treeElement);
  }

  _insertInPresentationOrder(parentTreeElement, childTreeElement) {
    // Insert in the alphabetical order, first frames, then resources. Document resource goes last.
    function typeWeight(treeElement) {
      if (treeElement instanceof Resources.StorageCategoryTreeElement)
        return 2;
      if (treeElement instanceof Resources.FrameTreeElement)
        return 1;
      return 3;
    }

    function compare(treeElement1, treeElement2) {
      var typeWeight1 = typeWeight(treeElement1);
      var typeWeight2 = typeWeight(treeElement2);

      var result;
      if (typeWeight1 > typeWeight2)
        result = 1;
      else if (typeWeight1 < typeWeight2)
        result = -1;
      else
        result = treeElement1.titleAsText().localeCompare(treeElement2.titleAsText());
      return result;
    }

    var childCount = parentTreeElement.childCount();
    var i;
    for (i = 0; i < childCount; ++i) {
      if (compare(childTreeElement, parentTreeElement.childAt(i)) < 0)
        break;
    }
    parentTreeElement.insertChild(childTreeElement, i);
  }
};

/**
 * @unrestricted
 */
Resources.FrameResourceTreeElement = class extends Resources.BaseStorageTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   * @param {!SDK.Resource} resource
   */
  constructor(storagePanel, resource) {
    super(storagePanel, resource.displayName, false);
    /** @type {!SDK.Resource} */
    this._resource = resource;
    this.tooltip = resource.url;
    this._resource[Resources.FrameResourceTreeElement._symbol] = this;

    var icon = UI.Icon.create('largeicon-navigator-file', 'navigator-tree-item');
    icon.classList.add('navigator-file-tree-item');
    icon.classList.add('navigator-' + resource.resourceType().name() + '-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL() {
    return this._resource.url;
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._storagePanel._showResourceView(this._resource);
    return false;
  }

  /**
   * @override
   * @return {boolean}
   */
  ondblclick(event) {
    InspectorFrontendHost.openInNewTab(this._resource.url);
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
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendApplicableItems(this._resource);
    contextMenu.show();
  }

  /**
   * @return {!SourceFrame.ResourceSourceFrame}
   */
  sourceView() {
    if (!this._sourceView) {
      var sourceFrame = new SourceFrame.ResourceSourceFrame(this._resource);
      sourceFrame.setHighlighterType(this._resource.canonicalMimeType());
      this._sourceView = sourceFrame;
    }
    return this._sourceView;
  }
};

Resources.FrameResourceTreeElement._symbol = Symbol('treeElement');

/**
 * @unrestricted
 */
Resources.DatabaseTreeElement = class extends Resources.BaseStorageTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   * @param {!Resources.Database} database
   */
  constructor(storagePanel, database) {
    super(storagePanel, database.name, true);
    this._database = database;

    var icon = UI.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL() {
    return 'database://' + encodeURI(this._database.name);
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._storagePanel._showDatabase(this._database);
    return false;
  }

  /**
   * @override
   */
  onexpand() {
    this._updateChildren();
  }

  _updateChildren() {
    this.removeChildren();

    /**
     * @param {!Array.<string>} tableNames
     * @this {Resources.DatabaseTreeElement}
     */
    function tableNamesCallback(tableNames) {
      var tableNamesLength = tableNames.length;
      for (var i = 0; i < tableNamesLength; ++i)
        this.appendChild(new Resources.DatabaseTableTreeElement(this._storagePanel, this._database, tableNames[i]));
    }
    this._database.getTableNames(tableNamesCallback.bind(this));
  }
};

/**
 * @unrestricted
 */
Resources.DatabaseTableTreeElement = class extends Resources.BaseStorageTreeElement {
  constructor(storagePanel, database, tableName) {
    super(storagePanel, tableName, false);
    this._database = database;
    this._tableName = tableName;
    var icon = UI.Icon.create('mediumicon-table', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL() {
    return 'database://' + encodeURI(this._database.name) + '/' + encodeURI(this._tableName);
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._storagePanel._showDatabase(this._database, this._tableName);
    return false;
  }
};

/**
 * @unrestricted
 */
Resources.ServiceWorkerCacheTreeElement = class extends Resources.StorageCategoryTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   */
  constructor(storagePanel) {
    super(storagePanel, Common.UIString('Cache Storage'), 'CacheStorage');
    var icon = UI.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  _initialize() {
    /** @type {!Array.<!Resources.SWCacheTreeElement>} */
    this._swCacheTreeElements = [];
    var target = this._storagePanel._target;
    var model = target && SDK.ServiceWorkerCacheModel.fromTarget(target);
    if (model) {
      for (var cache of model.caches())
        this._addCache(model, cache);
    }
    SDK.targetManager.addModelListener(
        SDK.ServiceWorkerCacheModel, SDK.ServiceWorkerCacheModel.Events.CacheAdded, this._cacheAdded, this);
    SDK.targetManager.addModelListener(
        SDK.ServiceWorkerCacheModel, SDK.ServiceWorkerCacheModel.Events.CacheRemoved, this._cacheRemoved, this);
  }

  /**
   * @override
   */
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  _handleContextMenuEvent(event) {
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendItem(Common.UIString('Refresh Caches'), this._refreshCaches.bind(this));
    contextMenu.show();
  }

  _refreshCaches() {
    var target = this._storagePanel._target;
    if (target) {
      var model = SDK.ServiceWorkerCacheModel.fromTarget(target);
      if (!model)
        return;
      model.refreshCacheNames();
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _cacheAdded(event) {
    var cache = /** @type {!SDK.ServiceWorkerCacheModel.Cache} */ (event.data.cache);
    var model = /** @type {!SDK.ServiceWorkerCacheModel} */ (event.data.model);
    this._addCache(model, cache);
  }

  /**
   * @param {!SDK.ServiceWorkerCacheModel} model
   * @param {!SDK.ServiceWorkerCacheModel.Cache} cache
   */
  _addCache(model, cache) {
    var swCacheTreeElement = new Resources.SWCacheTreeElement(this._storagePanel, model, cache);
    this._swCacheTreeElements.push(swCacheTreeElement);
    this.appendChild(swCacheTreeElement);
  }

  /**
   * @param {!Common.Event} event
   */
  _cacheRemoved(event) {
    var cache = /** @type {!SDK.ServiceWorkerCacheModel.Cache} */ (event.data.cache);
    var model = /** @type {!SDK.ServiceWorkerCacheModel} */ (event.data.model);

    var swCacheTreeElement = this._cacheTreeElement(model, cache);
    if (!swCacheTreeElement)
      return;

    swCacheTreeElement.clear();
    this.removeChild(swCacheTreeElement);
    this._swCacheTreeElements.remove(swCacheTreeElement);
  }

  /**
   * @param {!SDK.ServiceWorkerCacheModel} model
   * @param {!SDK.ServiceWorkerCacheModel.Cache} cache
   * @return {?Resources.SWCacheTreeElement}
   */
  _cacheTreeElement(model, cache) {
    var index = -1;
    for (var i = 0; i < this._swCacheTreeElements.length; ++i) {
      if (this._swCacheTreeElements[i]._cache.equals(cache) && this._swCacheTreeElements[i]._model === model) {
        index = i;
        break;
      }
    }
    if (index !== -1)
      return this._swCacheTreeElements[i];
    return null;
  }
};

/**
 * @unrestricted
 */
Resources.SWCacheTreeElement = class extends Resources.BaseStorageTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   * @param {!SDK.ServiceWorkerCacheModel} model
   * @param {!SDK.ServiceWorkerCacheModel.Cache} cache
   */
  constructor(storagePanel, model, cache) {
    super(storagePanel, cache.cacheName + ' - ' + cache.securityOrigin, false);
    this._model = model;
    this._cache = cache;
    var icon = UI.Icon.create('mediumicon-table', 'resource-tree-item');
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
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendItem(Common.UIString('Delete'), this._clearCache.bind(this));
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
    if (this._view)
      this._view.update(cache);
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._view)
      this._view = new Resources.ServiceWorkerCacheView(this._model, this._cache);

    this._storagePanel._innerShowView(this._view);
    return false;
  }

  clear() {
    if (this._view)
      this._view.clear();
  }
};

/**
 * @unrestricted
 */
Resources.ServiceWorkersTreeElement = class extends Resources.BaseStorageTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   */
  constructor(storagePanel) {
    super(storagePanel, Common.UIString('Service Workers'), false);
    var icon = UI.Icon.create('mediumicon-service-worker', 'resource-tree-item');
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
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._view)
      this._view = new Resources.ServiceWorkersView();
    this._storagePanel._innerShowView(this._view);
    return false;
  }
};

/**
 * @unrestricted
 */
Resources.AppManifestTreeElement = class extends Resources.BaseStorageTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   */
  constructor(storagePanel) {
    super(storagePanel, Common.UIString('Manifest'), false);
    var icon = UI.Icon.create('mediumicon-manifest', 'resource-tree-item');
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
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._view)
      this._view = new Resources.AppManifestView();
    this._storagePanel._innerShowView(this._view);
    return false;
  }
};

/**
 * @unrestricted
 */
Resources.ClearStorageTreeElement = class extends Resources.BaseStorageTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   */
  constructor(storagePanel) {
    super(storagePanel, Common.UIString('Clear storage'), false);
    var icon = UI.Icon.create('mediumicon-clear-storage', 'resource-tree-item');
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
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._view)
      this._view = new Resources.ClearStorageView(this._storagePanel);
    this._storagePanel._innerShowView(this._view);
    return false;
  }
};

/**
 * @unrestricted
 */
Resources.IndexedDBTreeElement = class extends Resources.StorageCategoryTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   */
  constructor(storagePanel) {
    super(storagePanel, Common.UIString('IndexedDB'), 'IndexedDB');
    var icon = UI.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  _initialize() {
    SDK.targetManager.addModelListener(
        Resources.IndexedDBModel, Resources.IndexedDBModel.Events.DatabaseAdded, this._indexedDBAdded, this);
    SDK.targetManager.addModelListener(
        Resources.IndexedDBModel, Resources.IndexedDBModel.Events.DatabaseRemoved, this._indexedDBRemoved, this);
    SDK.targetManager.addModelListener(
        Resources.IndexedDBModel, Resources.IndexedDBModel.Events.DatabaseLoaded, this._indexedDBLoaded, this);
    /** @type {!Array.<!Resources.IDBDatabaseTreeElement>} */
    this._idbDatabaseTreeElements = [];

    var targets = SDK.targetManager.targets(SDK.Target.Capability.Browser);
    for (var i = 0; i < targets.length; ++i) {
      var indexedDBModel = Resources.IndexedDBModel.fromTarget(targets[i]);
      var databases = indexedDBModel.databases();
      for (var j = 0; j < databases.length; ++j)
        this._addIndexedDB(indexedDBModel, databases[j]);
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
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendItem(Common.UIString('Refresh IndexedDB'), this.refreshIndexedDB.bind(this));
    contextMenu.show();
  }

  refreshIndexedDB() {
    var targets = SDK.targetManager.targets(SDK.Target.Capability.Browser);
    for (var i = 0; i < targets.length; ++i)
      Resources.IndexedDBModel.fromTarget(targets[i]).refreshDatabaseNames();
  }

  /**
   * @param {!Common.Event} event
   */
  _indexedDBAdded(event) {
    var databaseId = /** @type {!Resources.IndexedDBModel.DatabaseId} */ (event.data.databaseId);
    var model = /** @type {!Resources.IndexedDBModel} */ (event.data.model);
    this._addIndexedDB(model, databaseId);
  }

  /**
   * @param {!Resources.IndexedDBModel} model
   * @param {!Resources.IndexedDBModel.DatabaseId} databaseId
   */
  _addIndexedDB(model, databaseId) {
    var idbDatabaseTreeElement = new Resources.IDBDatabaseTreeElement(this._storagePanel, model, databaseId);
    this._idbDatabaseTreeElements.push(idbDatabaseTreeElement);
    this.appendChild(idbDatabaseTreeElement);
    model.refreshDatabase(databaseId);
  }

  /**
   * @param {!Common.Event} event
   */
  _indexedDBRemoved(event) {
    var databaseId = /** @type {!Resources.IndexedDBModel.DatabaseId} */ (event.data.databaseId);
    var model = /** @type {!Resources.IndexedDBModel} */ (event.data.model);

    var idbDatabaseTreeElement = this._idbDatabaseTreeElement(model, databaseId);
    if (!idbDatabaseTreeElement)
      return;

    idbDatabaseTreeElement.clear();
    this.removeChild(idbDatabaseTreeElement);
    this._idbDatabaseTreeElements.remove(idbDatabaseTreeElement);
  }

  /**
   * @param {!Common.Event} event
   */
  _indexedDBLoaded(event) {
    var database = /** @type {!Resources.IndexedDBModel.Database} */ (event.data.database);
    var model = /** @type {!Resources.IndexedDBModel} */ (event.data.model);

    var idbDatabaseTreeElement = this._idbDatabaseTreeElement(model, database.databaseId);
    if (!idbDatabaseTreeElement)
      return;

    idbDatabaseTreeElement.update(database);
  }

  /**
   * @param {!Resources.IndexedDBModel.DatabaseId} databaseId
   * @param {!Resources.IndexedDBModel} model
   * @return {?Resources.IDBDatabaseTreeElement}
   */
  _idbDatabaseTreeElement(model, databaseId) {
    var index = -1;
    for (var i = 0; i < this._idbDatabaseTreeElements.length; ++i) {
      if (this._idbDatabaseTreeElements[i]._databaseId.equals(databaseId) &&
          this._idbDatabaseTreeElements[i]._model === model) {
        index = i;
        break;
      }
    }
    if (index !== -1)
      return this._idbDatabaseTreeElements[i];
    return null;
  }
};

/**
 * @unrestricted
 */
Resources.IDBDatabaseTreeElement = class extends Resources.BaseStorageTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   * @param {!Resources.IndexedDBModel} model
   * @param {!Resources.IndexedDBModel.DatabaseId} databaseId
   */
  constructor(storagePanel, model, databaseId) {
    super(storagePanel, databaseId.name + ' - ' + databaseId.securityOrigin, false);
    this._model = model;
    this._databaseId = databaseId;
    this._idbObjectStoreTreeElements = {};
    var icon = UI.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
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
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendItem(Common.UIString('Refresh IndexedDB'), this._refreshIndexedDB.bind(this));
    contextMenu.show();
  }

  _refreshIndexedDB() {
    this._model.refreshDatabaseNames();
  }

  /**
   * @param {!Resources.IndexedDBModel.Database} database
   */
  update(database) {
    this._database = database;
    var objectStoreNames = {};
    for (var objectStoreName in this._database.objectStores) {
      var objectStore = this._database.objectStores[objectStoreName];
      objectStoreNames[objectStore.name] = true;
      if (!this._idbObjectStoreTreeElements[objectStore.name]) {
        var idbObjectStoreTreeElement =
            new Resources.IDBObjectStoreTreeElement(this._storagePanel, this._model, this._databaseId, objectStore);
        this._idbObjectStoreTreeElements[objectStore.name] = idbObjectStoreTreeElement;
        this.appendChild(idbObjectStoreTreeElement);
      }
      this._idbObjectStoreTreeElements[objectStore.name].update(objectStore);
    }
    for (var objectStoreName in this._idbObjectStoreTreeElements) {
      if (!objectStoreNames[objectStoreName])
        this._objectStoreRemoved(objectStoreName);
    }

    if (this._view)
      this._view.update(database);

    this._updateTooltip();
  }

  _updateTooltip() {
    this.tooltip = Common.UIString('Version') + ': ' + this._database.version;
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._view)
      this._view = new Resources.IDBDatabaseView(this._model, this._database);

    this._storagePanel._innerShowView(this._view);
    return false;
  }

  /**
   * @param {string} objectStoreName
   */
  _objectStoreRemoved(objectStoreName) {
    var objectStoreTreeElement = this._idbObjectStoreTreeElements[objectStoreName];
    objectStoreTreeElement.clear();
    this.removeChild(objectStoreTreeElement);
    delete this._idbObjectStoreTreeElements[objectStoreName];
  }

  clear() {
    for (var objectStoreName in this._idbObjectStoreTreeElements)
      this._objectStoreRemoved(objectStoreName);
  }
};

/**
 * @unrestricted
 */
Resources.IDBObjectStoreTreeElement = class extends Resources.BaseStorageTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   * @param {!Resources.IndexedDBModel} model
   * @param {!Resources.IndexedDBModel.DatabaseId} databaseId
   * @param {!Resources.IndexedDBModel.ObjectStore} objectStore
   */
  constructor(storagePanel, model, databaseId, objectStore) {
    super(storagePanel, objectStore.name, false);
    this._model = model;
    this._databaseId = databaseId;
    this._idbIndexTreeElements = {};
    var icon = UI.Icon.create('mediumicon-table', 'resource-tree-item');
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

  _handleContextMenuEvent(event) {
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendItem(Common.UIString('Clear'), this._clearObjectStore.bind(this));
    contextMenu.show();
  }

  _clearObjectStore() {
    /**
     * @this {Resources.IDBObjectStoreTreeElement}
     */
    function callback() {
      this.update(this._objectStore);
    }
    this._model.clearObjectStore(this._databaseId, this._objectStore.name, callback.bind(this));
  }

  /**
   * @param {!Resources.IndexedDBModel.ObjectStore} objectStore
   */
  update(objectStore) {
    this._objectStore = objectStore;

    var indexNames = {};
    for (var indexName in this._objectStore.indexes) {
      var index = this._objectStore.indexes[indexName];
      indexNames[index.name] = true;
      if (!this._idbIndexTreeElements[index.name]) {
        var idbIndexTreeElement = new Resources.IDBIndexTreeElement(
            this._storagePanel, this._model, this._databaseId, this._objectStore, index);
        this._idbIndexTreeElements[index.name] = idbIndexTreeElement;
        this.appendChild(idbIndexTreeElement);
      }
      this._idbIndexTreeElements[index.name].update(index);
    }
    for (var indexName in this._idbIndexTreeElements) {
      if (!indexNames[indexName])
        this._indexRemoved(indexName);
    }
    for (var indexName in this._idbIndexTreeElements) {
      if (!indexNames[indexName]) {
        this.removeChild(this._idbIndexTreeElements[indexName]);
        delete this._idbIndexTreeElements[indexName];
      }
    }

    if (this.childCount())
      this.expand();

    if (this._view)
      this._view.update(this._objectStore);

    this._updateTooltip();
  }

  _updateTooltip() {
    var keyPathString = this._objectStore.keyPathString;
    var tooltipString = keyPathString !== null ? (Common.UIString('Key path: ') + keyPathString) : '';
    if (this._objectStore.autoIncrement)
      tooltipString += '\n' + Common.UIString('autoIncrement');
    this.tooltip = tooltipString;
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._view)
      this._view = new Resources.IDBDataView(this._model, this._databaseId, this._objectStore, null);

    this._storagePanel._innerShowView(this._view);
    return false;
  }

  /**
   * @param {string} indexName
   */
  _indexRemoved(indexName) {
    var indexTreeElement = this._idbIndexTreeElements[indexName];
    indexTreeElement.clear();
    this.removeChild(indexTreeElement);
    delete this._idbIndexTreeElements[indexName];
  }

  clear() {
    for (var indexName in this._idbIndexTreeElements)
      this._indexRemoved(indexName);
    if (this._view)
      this._view.clear();
  }
};

/**
 * @unrestricted
 */
Resources.IDBIndexTreeElement = class extends Resources.BaseStorageTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   * @param {!Resources.IndexedDBModel} model
   * @param {!Resources.IndexedDBModel.DatabaseId} databaseId
   * @param {!Resources.IndexedDBModel.ObjectStore} objectStore
   * @param {!Resources.IndexedDBModel.Index} index
   */
  constructor(storagePanel, model, databaseId, objectStore, index) {
    super(storagePanel, index.name, false);
    this._model = model;
    this._databaseId = databaseId;
    this._objectStore = objectStore;
    this._index = index;
  }

  get itemURL() {
    return 'indexedDB://' + this._databaseId.securityOrigin + '/' + this._databaseId.name + '/' +
        this._objectStore.name + '/' + this._index.name;
  }

  /**
   * @param {!Resources.IndexedDBModel.Index} index
   */
  update(index) {
    this._index = index;

    if (this._view)
      this._view.update(this._index);

    this._updateTooltip();
  }

  _updateTooltip() {
    var tooltipLines = [];
    var keyPathString = this._index.keyPathString;
    tooltipLines.push(Common.UIString('Key path: ') + keyPathString);
    if (this._index.unique)
      tooltipLines.push(Common.UIString('unique'));
    if (this._index.multiEntry)
      tooltipLines.push(Common.UIString('multiEntry'));
    this.tooltip = tooltipLines.join('\n');
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this._view)
      this._view = new Resources.IDBDataView(this._model, this._databaseId, this._objectStore, this._index);

    this._storagePanel._innerShowView(this._view);
    return false;
  }

  clear() {
    if (this._view)
      this._view.clear();
  }
};

/**
 * @unrestricted
 */
Resources.DOMStorageTreeElement = class extends Resources.BaseStorageTreeElement {
  constructor(storagePanel, domStorage) {
    super(storagePanel, domStorage.securityOrigin ? domStorage.securityOrigin : Common.UIString('Local Files'), false);
    this._domStorage = domStorage;
    var icon = UI.Icon.create('mediumicon-table', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL() {
    return 'storage://' + this._domStorage.securityOrigin + '/' +
        (this._domStorage.isLocalStorage ? 'local' : 'session');
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._storagePanel._showDOMStorage(this._domStorage);
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
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendItem(Common.UIString('Clear'), () => this._domStorage.clear());
    contextMenu.show();
  }
};

Resources.CookieTreeElement = class extends Resources.BaseStorageTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   * @param {!SDK.ResourceTreeFrame} frame
   * @param {string} cookieDomain
   */
  constructor(storagePanel, frame, cookieDomain) {
    super(storagePanel, cookieDomain ? cookieDomain : Common.UIString('Local Files'), false);
    this._target = frame.target();
    this._cookieDomain = cookieDomain;
    var icon = UI.Icon.create('mediumicon-cookie', 'resource-tree-item');
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
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendItem(
        Common.UIString('Clear'), () => this._storagePanel._clearCookies(this._target, this._cookieDomain));
    contextMenu.show();
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._storagePanel.showCookies(this, this._cookieDomain, this._target);
    return false;
  }
};

/**
 * @unrestricted
 */
Resources.ApplicationCacheManifestTreeElement = class extends Resources.BaseStorageTreeElement {
  constructor(storagePanel, manifestURL) {
    var title = new Common.ParsedURL(manifestURL).displayName;
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
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._storagePanel.showCategoryView(this._manifestURL);
    return false;
  }
};

/**
 * @unrestricted
 */
Resources.ApplicationCacheFrameTreeElement = class extends Resources.BaseStorageTreeElement {
  /**
   * @param {!Resources.ResourcesPanel} storagePanel
   * @param {!Protocol.Page.FrameId} frameId
   * @param {string} manifestURL
   */
  constructor(storagePanel, frameId, manifestURL) {
    super(storagePanel, '', false);
    this._frameId = frameId;
    this._manifestURL = manifestURL;
    this._refreshTitles();

    var icon = UI.Icon.create('largeicon-navigator-folder', 'navigator-tree-item');
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

  _refreshTitles() {
    var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(this._storagePanel._target);
    var frame = resourceTreeModel.frameForId(this._frameId);
    this.title = frame.displayName();
  }

  frameNavigated() {
    this._refreshTitles();
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this._storagePanel.showApplicationCache(this._frameId);
    return false;
  }
};

/**
 * @unrestricted
 */
Resources.StorageCategoryView = class extends UI.VBox {
  constructor() {
    super();

    this.element.classList.add('storage-view');
    this._emptyWidget = new UI.EmptyWidget('');
    this._emptyWidget.show(this.element);
  }

  setText(text) {
    this._emptyWidget.text = text;
  }
};
