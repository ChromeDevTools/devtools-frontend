// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ApplicationCacheItemsView} from './ApplicationCacheItemsView.js';
import {ApplicationCacheModel, Events as ApplicationCacheModelEvents} from './ApplicationCacheModel.js';
import {ApplicationCacheFrameTreeElement, ApplicationCacheManifestTreeElement, BackForwardCacheTreeElement, ServiceWorkerCacheTreeElement} from './ApplicationPanelCacheSection.js';
import {ApplicationPanelTreeElement, ExpandableApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import {AppManifestView} from './AppManifestView.js';
import {BackgroundServiceModel} from './BackgroundServiceModel.js';
import {BackgroundServiceView} from './BackgroundServiceView.js';
import * as ApplicationComponents from './components/components.js';

import type {Database as DatabaseModelDatabase} from './DatabaseModel.js';
import {DatabaseModel, Events as DatabaseModelEvents} from './DatabaseModel.js';
import {DatabaseQueryView, Events as DatabaseQueryViewEvents} from './DatabaseQueryView.js';
import {DatabaseTableView} from './DatabaseTableView.js';
import type {DOMStorage} from './DOMStorageModel.js';
import {DOMStorageModel, Events as DOMStorageModelEvents} from './DOMStorageModel.js';
import type {Database as IndexedDBModelDatabase, DatabaseId, Index, ObjectStore} from './IndexedDBModel.js';
import {Events as IndexedDBModelEvents, IndexedDBModel} from './IndexedDBModel.js';
import {IDBDatabaseView, IDBDataView} from './IndexedDBViews.js';
import {OpenedWindowDetailsView, WorkerDetailsView} from './OpenedWindowDetailsView.js';
import type {ResourcesPanel} from './ResourcesPanel.js';
import {ServiceWorkersView} from './ServiceWorkersView.js';
import {StorageView} from './StorageView.js';
import {TrustTokensTreeElement} from './TrustTokensTreeElement.js';

const UIStrings = {
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  */
  application: 'Application',
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  */
  storage: 'Storage',
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  */
  localStorage: 'Local Storage',
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  */
  sessionStorage: 'Session Storage',
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  */
  webSql: 'Web SQL',
  /**
  *@description Text for web cookies
  */
  cookies: 'Cookies',
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  */
  cache: 'Cache',
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  */
  applicationCache: 'Application Cache',
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  */
  backgroundServices: 'Background Services',
  /**
  *@description Text for rendering frames
  */
  frames: 'Frames',
  /**
  *@description Text that appears on a button for the manifest resource type filter.
  */
  manifest: 'Manifest',
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  */
  indexeddb: 'IndexedDB',
  /**
  *@description A context menu item in the Application Panel Sidebar of the Application panel
  */
  refreshIndexeddb: 'Refresh IndexedDB',
  /**
  *@description Tooltip in Application Panel Sidebar of the Application panel
  *@example {1.0} PH1
  */
  versionSEmpty: 'Version: {PH1} (empty)',
  /**
  *@description Tooltip in Application Panel Sidebar of the Application panel
  *@example {1.0} PH1
  */
  versionS: 'Version: {PH1}',
  /**
  *@description Text to clear content
  */
  clear: 'Clear',
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  *@example {"key path"} PH1
  */
  keyPathS: 'Key path: {PH1}',
  /**
  *@description Text in Application Panel Sidebar of the Application panel
  */
  localFiles: 'Local Files',
  /**
  *@description Tooltip in Application Panel Sidebar of the Application panel
  *@example {https://example.com} PH1
  */
  cookiesUsedByFramesFromS: 'Cookies used by frames from {PH1}',
  /**
  *@description Text in Frames View of the Application panel
  */
  openedWindows: 'Opened Windows',
  /**
  *@description Label for plural of worker type: web workers
  */
  webWorkers: 'Web Workers',
  /**
  *@description Label in frame tree for unavailable document
  */
  documentNotAvailable: 'Document not available',
  /**
  *@description Description of content of unavailable document in Application panel
  */
  theContentOfThisDocumentHasBeen:
      'The content of this document has been generated dynamically via \'document.write()\'.',
  /**
  *@description Text in Frames View of the Application panel
  */
  windowWithoutTitle: 'Window without title',
  /**
  *@description Default name for worker
  */
  worker: 'worker',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/ApplicationPanelSidebar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

function assertNotMainTarget(targetId: Protocol.Target.TargetID|'main'): asserts targetId is Protocol.Target.TargetID {
  if (targetId === 'main') {
    throw new Error('Unexpected main target id');
  }
}

export class ApplicationPanelSidebar extends UI.Widget.VBox implements SDK.TargetManager.Observer {
  _panel: ResourcesPanel;
  _applicationCacheViews: Map<string, ApplicationCacheItemsView>;
  _applicationCacheFrameElements: Map<string, ApplicationCacheFrameTreeElement>;
  _applicationCacheManifestElements: Map<string, ApplicationCacheManifestTreeElement>;
  _sidebarTree: UI.TreeOutline.TreeOutlineInShadow;
  _applicationTreeElement: UI.TreeOutline.TreeElement;
  serviceWorkersTreeElement: ServiceWorkersTreeElement;
  localStorageListTreeElement: ExpandableApplicationPanelTreeElement;
  sessionStorageListTreeElement: ExpandableApplicationPanelTreeElement;
  indexedDBListTreeElement: IndexedDBTreeElement;
  databasesListTreeElement: ExpandableApplicationPanelTreeElement;
  cookieListTreeElement: ExpandableApplicationPanelTreeElement;
  trustTokensTreeElement: TrustTokensTreeElement;
  cacheStorageListTreeElement: ServiceWorkerCacheTreeElement;
  applicationCacheListTreeElement: ExpandableApplicationPanelTreeElement;
  private backForwardCacheListTreeElement?: BackForwardCacheTreeElement;
  backgroundFetchTreeElement: BackgroundServiceTreeElement|undefined;
  backgroundSyncTreeElement: BackgroundServiceTreeElement|undefined;
  notificationsTreeElement: BackgroundServiceTreeElement|undefined;
  paymentHandlerTreeElement: BackgroundServiceTreeElement|undefined;
  periodicBackgroundSyncTreeElement: BackgroundServiceTreeElement|undefined;
  pushMessagingTreeElement: BackgroundServiceTreeElement|undefined;
  _resourcesSection: ResourcesSection;
  _databaseTableViews: Map<DatabaseModelDatabase, {
    [x: string]: DatabaseTableView,
  }>;
  _databaseQueryViews: Map<DatabaseModelDatabase, DatabaseQueryView>;
  _databaseTreeElements: Map<DatabaseModelDatabase, DatabaseTreeElement>;
  _domStorageTreeElements: Map<DOMStorage, DOMStorageTreeElement>;
  _domains: {
    [x: string]: boolean,
  };
  _target?: SDK.Target.Target;
  _databaseModel?: DatabaseModel|null;
  _applicationCacheModel?: ApplicationCacheModel|null;
  _previousHoveredElement?: FrameTreeElement;

  constructor(panel: ResourcesPanel) {
    super();

    this._panel = panel;

    this._applicationCacheViews = new Map();
    this._applicationCacheFrameElements = new Map();
    this._applicationCacheManifestElements = new Map();

    this._sidebarTree = new UI.TreeOutline.TreeOutlineInShadow();
    this._sidebarTree.element.classList.add('resources-sidebar');
    this._sidebarTree.registerRequiredCSS('panels/application/resourcesSidebar.css');
    this._sidebarTree.element.classList.add('filter-all');
    // Listener needs to have been set up before the elements are added
    this._sidebarTree.addEventListener(UI.TreeOutline.Events.ElementAttached, this._treeElementAdded, this);

    this.contentElement.appendChild(this._sidebarTree.element);

    const applicationSectionTitle = i18nString(UIStrings.application);
    this._applicationTreeElement = this._addSidebarSection(applicationSectionTitle);
    const manifestTreeElement = new AppManifestTreeElement(panel);
    this._applicationTreeElement.appendChild(manifestTreeElement);
    this.serviceWorkersTreeElement = new ServiceWorkersTreeElement(panel);
    this._applicationTreeElement.appendChild(this.serviceWorkersTreeElement);
    const clearStorageTreeElement = new ClearStorageTreeElement(panel);
    this._applicationTreeElement.appendChild(clearStorageTreeElement);

    const storageSectionTitle = i18nString(UIStrings.storage);
    const storageTreeElement = this._addSidebarSection(storageSectionTitle);
    this.localStorageListTreeElement =
        new ExpandableApplicationPanelTreeElement(panel, i18nString(UIStrings.localStorage), 'LocalStorage');
    this.localStorageListTreeElement.setLink(
        'https://developer.chrome.com/docs/devtools/storage/localstorage/?utm_source=devtools');
    const localStorageIcon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.localStorageListTreeElement.setLeadingIcons([localStorageIcon]);

    storageTreeElement.appendChild(this.localStorageListTreeElement);
    this.sessionStorageListTreeElement =
        new ExpandableApplicationPanelTreeElement(panel, i18nString(UIStrings.sessionStorage), 'SessionStorage');
    this.sessionStorageListTreeElement.setLink(
        'https://developer.chrome.com/docs/devtools/storage/sessionstorage/?utm_source=devtools');
    const sessionStorageIcon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.sessionStorageListTreeElement.setLeadingIcons([sessionStorageIcon]);

    storageTreeElement.appendChild(this.sessionStorageListTreeElement);
    this.indexedDBListTreeElement = new IndexedDBTreeElement(panel);
    this.indexedDBListTreeElement.setLink(
        'https://developer.chrome.com/docs/devtools/storage/indexeddb/?utm_source=devtools');
    storageTreeElement.appendChild(this.indexedDBListTreeElement);
    this.databasesListTreeElement =
        new ExpandableApplicationPanelTreeElement(panel, i18nString(UIStrings.webSql), 'Databases');
    this.databasesListTreeElement.setLink(
        'https://developer.chrome.com/docs/devtools/storage/websql/?utm_source=devtools');
    const databaseIcon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.databasesListTreeElement.setLeadingIcons([databaseIcon]);

    storageTreeElement.appendChild(this.databasesListTreeElement);
    this.cookieListTreeElement =
        new ExpandableApplicationPanelTreeElement(panel, i18nString(UIStrings.cookies), 'Cookies');
    this.cookieListTreeElement.setLink(
        'https://developer.chrome.com/docs/devtools/storage/cookies/?utm_source=devtools');
    const cookieIcon = UI.Icon.Icon.create('mediumicon-cookie', 'resource-tree-item');
    this.cookieListTreeElement.setLeadingIcons([cookieIcon]);
    storageTreeElement.appendChild(this.cookieListTreeElement);

    this.trustTokensTreeElement = new TrustTokensTreeElement(panel);
    storageTreeElement.appendChild(this.trustTokensTreeElement);

    const cacheSectionTitle = i18nString(UIStrings.cache);
    const cacheTreeElement = this._addSidebarSection(cacheSectionTitle);
    this.cacheStorageListTreeElement = new ServiceWorkerCacheTreeElement(panel);
    cacheTreeElement.appendChild(this.cacheStorageListTreeElement);
    this.applicationCacheListTreeElement =
        new ExpandableApplicationPanelTreeElement(panel, i18nString(UIStrings.applicationCache), 'ApplicationCache');
    this.applicationCacheListTreeElement.setLink(
        'https://developer.chrome.com/docs/devtools/storage/applicationcache/?utm_source=devtools');
    const applicationCacheIcon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.applicationCacheListTreeElement.setLeadingIcons([applicationCacheIcon]);
    cacheTreeElement.appendChild(this.applicationCacheListTreeElement);

    if (Root.Runtime.experiments.isEnabled('bfcacheDebugging')) {
      this.backForwardCacheListTreeElement = new BackForwardCacheTreeElement(panel);
      cacheTreeElement.appendChild(this.backForwardCacheListTreeElement);
    }

    if (Root.Runtime.experiments.isEnabled('backgroundServices')) {
      const backgroundServiceSectionTitle = i18nString(UIStrings.backgroundServices);
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
    const resourcesSectionTitle = i18nString(UIStrings.frames);
    const resourcesTreeElement = this._addSidebarSection(resourcesSectionTitle);
    this._resourcesSection = new ResourcesSection(panel, resourcesTreeElement);

    this._databaseTableViews = new Map();
    this._databaseQueryViews = new Map();
    this._databaseTreeElements = new Map();
    this._domStorageTreeElements = new Map();
    this._domains = {};

    this._sidebarTree.contentElement.addEventListener('mousemove', this._onmousemove.bind(this), false);
    this._sidebarTree.contentElement.addEventListener('mouseleave', this._onmouseleave.bind(this), false);

    SDK.TargetManager.TargetManager.instance().observeTargets(this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this._frameNavigated,
        this);

    const selection = this._panel.lastSelectedItemPath();
    if (!selection.length) {
      manifestTreeElement.select();
    }

    SDK.TargetManager.TargetManager.instance().observeModels(DOMStorageModel, {
      modelAdded: (model: DOMStorageModel): void => this._domStorageModelAdded(model),
      modelRemoved: (model: DOMStorageModel): void => this._domStorageModelRemoved(model),
    });
    SDK.TargetManager.TargetManager.instance().observeModels(IndexedDBModel, {
      modelAdded: (model: IndexedDBModel): void => model.enable(),
      modelRemoved: (model: IndexedDBModel): void => this.indexedDBListTreeElement.removeIndexedDBForModel(model),
    });

    // Work-around for crbug.com/1152713: Something is wrong with custom scrollbars and size containment.
    // @ts-ignore
    this.contentElement.style.contain = 'layout style';
  }

  _addSidebarSection(title: string): UI.TreeOutline.TreeElement {
    const treeElement = new UI.TreeOutline.TreeElement(title, true);
    treeElement.listItemElement.classList.add('storage-group-list-item');
    treeElement.setCollapsible(false);
    treeElement.selectable = false;
    this._sidebarTree.appendChild(treeElement);
    UI.ARIAUtils.setAccessibleName(treeElement.childrenListElement, title);
    return treeElement;
  }

  targetAdded(target: SDK.Target.Target): void {
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

  targetRemoved(target: SDK.Target.Target): void {
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

  focus(): void {
    this._sidebarTree.focus();
  }

  _initialize(): void {
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

  _domStorageModelAdded(model: DOMStorageModel): void {
    model.enable();
    model.storages().forEach(this._addDOMStorage.bind(this));
    model.addEventListener(DOMStorageModelEvents.DOMStorageAdded, this._domStorageAdded, this);
    model.addEventListener(DOMStorageModelEvents.DOMStorageRemoved, this._domStorageRemoved, this);
  }

  _domStorageModelRemoved(model: DOMStorageModel): void {
    model.storages().forEach(this._removeDOMStorage.bind(this));
    model.removeEventListener(DOMStorageModelEvents.DOMStorageAdded, this._domStorageAdded, this);
    model.removeEventListener(DOMStorageModelEvents.DOMStorageRemoved, this._domStorageRemoved, this);
  }

  _resetWithFrames(): void {
    this._resourcesSection.reset();
    this._reset();
  }

  _resetWebSQL(): void {
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

  _resetAppCache(): void {
    for (const frameId of this._applicationCacheFrameElements.keys()) {
      this._applicationCacheFrameManifestRemoved({data: frameId});
    }
    this.applicationCacheListTreeElement.setExpandable(false);
  }

  _treeElementAdded(event: Common.EventTarget.EventTargetEvent): void {
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

  _reset(): void {
    this._domains = {};
    this._resetWebSQL();
    this.cookieListTreeElement.removeChildren();
  }

  _frameNavigated(event: Common.EventTarget.EventTargetEvent<SDK.ResourceTreeModel.ResourceTreeFrame>): void {
    const frame = event.data;

    if (frame.isTopFrame()) {
      this._reset();
    }

    const applicationCacheFrameTreeElement = this._applicationCacheFrameElements.get(frame.id);
    if (applicationCacheFrameTreeElement) {
      applicationCacheFrameTreeElement.frameNavigated(frame);
    }
    this._addCookieDocument(frame);
  }

  _databaseAdded(event: Common.EventTarget.EventTargetEvent): void {
    const database = (event.data as DatabaseModelDatabase);
    const databaseTreeElement = new DatabaseTreeElement(this, database);
    this._databaseTreeElements.set(database, databaseTreeElement);
    this.databasesListTreeElement.appendChild(databaseTreeElement);
  }

  _addCookieDocument(frame: SDK.ResourceTreeModel.ResourceTreeFrame): void {
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

  _domStorageAdded(event: Common.EventTarget.EventTargetEvent): void {
    const domStorage = (event.data as DOMStorage);
    this._addDOMStorage(domStorage);
  }

  _addDOMStorage(domStorage: DOMStorage): void {
    console.assert(!this._domStorageTreeElements.get(domStorage));

    const domStorageTreeElement = new DOMStorageTreeElement(this._panel, domStorage);
    this._domStorageTreeElements.set(domStorage, domStorageTreeElement);
    if (domStorage.isLocalStorage) {
      this.localStorageListTreeElement.appendChild(domStorageTreeElement);
    } else {
      this.sessionStorageListTreeElement.appendChild(domStorageTreeElement);
    }
  }

  _domStorageRemoved(event: Common.EventTarget.EventTargetEvent): void {
    const domStorage = (event.data as DOMStorage);
    this._removeDOMStorage(domStorage);
  }

  _removeDOMStorage(domStorage: DOMStorage): void {
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

  selectDatabase(database: DatabaseModelDatabase): void {
    if (database) {
      this._showDatabase(database);
      const treeElement = this._databaseTreeElements.get(database);
      treeElement && treeElement.select();
    }
  }

  async showResource(resource: SDK.Resource.Resource, line?: number, column?: number): Promise<void> {
    await this._resourcesSection.revealResource(resource, line, column);
  }

  showFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame): void {
    this._resourcesSection.revealAndSelectFrame(frame);
  }

  _showDatabase(database: DatabaseModelDatabase, tableName?: string): void {
    if (!database) {
      return;
    }

    let view;
    if (tableName) {
      let tableViews = this._databaseTableViews.get(database);
      if (!tableViews) {
        tableViews = ({} as {
          [x: string]: DatabaseTableView,
        });
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

  _showApplicationCache(frameId: string): void {
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

  showFileSystem(view: UI.Widget.Widget): void {
    this._innerShowView(view);
  }

  _innerShowView(view: UI.Widget.Widget): void {
    this._panel.showView(view);
  }

  async _updateDatabaseTables(event: Common.EventTarget.EventTargetEvent): Promise<void> {
    const database = (event.data as DatabaseModelDatabase);

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

    const tableNamesHash = new Set<string>();
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

  _populateApplicationCacheTree(_resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel): void {
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

  _applicationCacheFrameManifestAdded(event: Common.EventTarget.EventTargetEvent): void {
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

  _applicationCacheFrameManifestRemoved(event: Common.EventTarget.EventTargetEvent): void {
    const frameId = (event.data as string);
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

  _applicationCacheFrameManifestStatusChanged(event: Common.EventTarget.EventTargetEvent): void {
    if (!this._applicationCacheModel) {
      return;
    }
    const frameId = (event.data as string);
    const status = this._applicationCacheModel.frameManifestStatus(frameId);

    const view = this._applicationCacheViews.get(frameId);
    if (view) {
      view.updateStatus(status);
    }
  }

  _applicationCacheNetworkStateChanged(event: Common.EventTarget.EventTargetEvent): void {
    const isNowOnline = (event.data as boolean);

    for (const view of this._applicationCacheViews.values()) {
      view.updateNetworkState(isNowOnline);
    }
  }

  _onmousemove(event: MouseEvent): void {
    const nodeUnderMouse = (event.target as Node);
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
      this._previousHoveredElement = element;
      element.hovered = true;
    }
  }

  _onmouseleave(_event: MouseEvent): void {
    if (this._previousHoveredElement) {
      this._previousHoveredElement.hovered = false;
      delete this._previousHoveredElement;
    }
  }
}

export class BackgroundServiceTreeElement extends ApplicationPanelTreeElement {
  _serviceName: Protocol.BackgroundService.ServiceName;
  _selected: boolean;
  _view: BackgroundServiceView|null;
  _model: BackgroundServiceModel|null;

  constructor(storagePanel: ResourcesPanel, serviceName: Protocol.BackgroundService.ServiceName) {
    super(storagePanel, BackgroundServiceView.getUIString(serviceName), false);

    this._serviceName = serviceName;

    /* Whether the element has been selected. */
    this._selected = false;

    this._view = null;

    this._model = null;

    const backgroundServiceIcon = UI.Icon.Icon.create(this._getIconType(), 'resource-tree-item');
    this.setLeadingIcons([backgroundServiceIcon]);
  }

  _getIconType(): string {
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

  _initialize(model: BackgroundServiceModel|null): void {
    this._model = model;
    // Show the view if the model was initialized after selection.
    if (this._selected && !this._view) {
      this.onselect(false);
    }
  }

  get itemURL(): string {
    return `background-service://${this._serviceName}`;
  }

  onselect(selectedByUser?: boolean): boolean {
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
  _sidebar: ApplicationPanelSidebar;
  _database: DatabaseModelDatabase;
  constructor(sidebar: ApplicationPanelSidebar, database: DatabaseModelDatabase) {
    super(sidebar._panel, database.name, true);
    this._sidebar = sidebar;
    this._database = database;

    const icon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL(): string {
    return 'database://' + encodeURI(this._database.name);
  }

  onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    this._sidebar._showDatabase(this._database);
    return false;
  }

  onexpand(): void {
    this.updateChildren();
  }

  async updateChildren(): Promise<void> {
    this.removeChildren();
    const tableNames = await this._database.tableNames();
    for (const tableName of tableNames) {
      this.appendChild(new DatabaseTableTreeElement(this._sidebar, this._database, tableName));
    }
  }
}

export class DatabaseTableTreeElement extends ApplicationPanelTreeElement {
  _sidebar: ApplicationPanelSidebar;
  _database: DatabaseModelDatabase;
  _tableName: string;

  constructor(sidebar: ApplicationPanelSidebar, database: DatabaseModelDatabase, tableName: string) {
    super(sidebar._panel, tableName, false);
    this._sidebar = sidebar;
    this._database = database;
    this._tableName = tableName;
    const icon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL(): string {
    return 'database://' + encodeURI(this._database.name) + '/' + encodeURI(this._tableName);
  }

  onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    this._sidebar._showDatabase(this._database, this._tableName);
    return false;
  }
}

export class ServiceWorkersTreeElement extends ApplicationPanelTreeElement {
  _view?: ServiceWorkersView;

  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, i18n.i18n.lockedString('Service Workers'), false);
    const icon = UI.Icon.Icon.create('mediumicon-service-worker', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL(): string {
    return 'service-workers://';
  }

  onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view = new ServiceWorkersView();
    }
    this.showView(this._view);
    return false;
  }
}

export class AppManifestTreeElement extends ApplicationPanelTreeElement {
  _view?: AppManifestView;
  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, i18nString(UIStrings.manifest), false);
    const icon = UI.Icon.Icon.create('mediumicon-manifest', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL(): string {
    return 'manifest://';
  }

  onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view = new AppManifestView();
    }
    this.showView(this._view);
    return false;
  }
}

export class ClearStorageTreeElement extends ApplicationPanelTreeElement {
  _view?: StorageView;
  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, i18nString(UIStrings.storage), false);
    const icon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL(): string {
    return 'clear-storage://';
  }

  onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view = new StorageView();
    }
    this.showView(this._view);
    return false;
  }
}

export class IndexedDBTreeElement extends ExpandableApplicationPanelTreeElement {
  _idbDatabaseTreeElements: IDBDatabaseTreeElement[];
  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, i18nString(UIStrings.indexeddb), 'IndexedDB');
    const icon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
    this._idbDatabaseTreeElements = [];
    this.initialize();
  }

  private initialize(): void {
    SDK.TargetManager.TargetManager.instance().addModelListener(
        IndexedDBModel, IndexedDBModelEvents.DatabaseAdded, this._indexedDBAdded, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        IndexedDBModel, IndexedDBModelEvents.DatabaseRemoved, this._indexedDBRemoved, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        IndexedDBModel, IndexedDBModelEvents.DatabaseLoaded, this._indexedDBLoaded, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        IndexedDBModel, IndexedDBModelEvents.IndexedDBContentUpdated, this._indexedDBContentUpdated, this);
    // TODO(szuend): Replace with a Set once two web tests no longer directly access this private
    //               variable (indexeddb/live-update-indexeddb-content.js, indexeddb/delete-entry.js).
    this._idbDatabaseTreeElements = [];

    for (const indexedDBModel of SDK.TargetManager.TargetManager.instance().models(IndexedDBModel)) {
      const databases = indexedDBModel.databases();
      for (let j = 0; j < databases.length; ++j) {
        this._addIndexedDB(indexedDBModel, databases[j]);
      }
    }
  }

  removeIndexedDBForModel(model: IndexedDBModel): void {
    const idbDatabaseTreeElements = this._idbDatabaseTreeElements.filter(element => element._model === model);
    for (const idbDatabaseTreeElement of idbDatabaseTreeElements) {
      this._removeIDBDatabaseTreeElement(idbDatabaseTreeElement);
    }
  }

  onattach(): void {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  _handleContextMenuEvent(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.refreshIndexeddb), this.refreshIndexedDB.bind(this));
    contextMenu.show();
  }

  refreshIndexedDB(): void {
    for (const indexedDBModel of SDK.TargetManager.TargetManager.instance().models(IndexedDBModel)) {
      indexedDBModel.refreshDatabaseNames();
    }
  }

  _indexedDBAdded(event: Common.EventTarget.EventTargetEvent): void {
    const databaseId = (event.data.databaseId as DatabaseId);
    const model = (event.data.model as IndexedDBModel);
    this._addIndexedDB(model, databaseId);
  }

  _addIndexedDB(model: IndexedDBModel, databaseId: DatabaseId): void {
    const idbDatabaseTreeElement = new IDBDatabaseTreeElement(this.resourcesPanel, model, databaseId);
    this._idbDatabaseTreeElements.push(idbDatabaseTreeElement);
    this.appendChild(idbDatabaseTreeElement);
    model.refreshDatabase(databaseId);
  }

  _indexedDBRemoved(event: Common.EventTarget.EventTargetEvent): void {
    const databaseId = (event.data.databaseId as DatabaseId);
    const model = (event.data.model as IndexedDBModel);

    const idbDatabaseTreeElement = this._idbDatabaseTreeElement(model, databaseId);
    if (!idbDatabaseTreeElement) {
      return;
    }
    this._removeIDBDatabaseTreeElement(idbDatabaseTreeElement);
  }

  _removeIDBDatabaseTreeElement(idbDatabaseTreeElement: IDBDatabaseTreeElement): void {
    idbDatabaseTreeElement.clear();
    this.removeChild(idbDatabaseTreeElement);
    Platform.ArrayUtilities.removeElement(this._idbDatabaseTreeElements, idbDatabaseTreeElement);
    this.setExpandable(this.childCount() > 0);
  }

  _indexedDBLoaded(event: Common.EventTarget.EventTargetEvent): void {
    const database = (event.data.database as IndexedDBModelDatabase);
    const model = (event.data.model as IndexedDBModel);
    const entriesUpdated = (event.data.entriesUpdated as boolean);

    const idbDatabaseTreeElement = this._idbDatabaseTreeElement(model, database.databaseId);
    if (!idbDatabaseTreeElement) {
      return;
    }
    idbDatabaseTreeElement.update(database, entriesUpdated);
    this._indexedDBLoadedForTest();
  }

  _indexedDBLoadedForTest(): void {
    // For sniffing in tests.
  }

  _indexedDBContentUpdated(event: Common.EventTarget.EventTargetEvent): void {
    const databaseId = (event.data.databaseId as DatabaseId);
    const objectStoreName = (event.data.objectStoreName as string);
    const model = (event.data.model as IndexedDBModel);

    const idbDatabaseTreeElement = this._idbDatabaseTreeElement(model, databaseId);
    if (!idbDatabaseTreeElement) {
      return;
    }
    idbDatabaseTreeElement.indexedDBContentUpdated(objectStoreName);
  }

  _idbDatabaseTreeElement(model: IndexedDBModel, databaseId: DatabaseId): IDBDatabaseTreeElement|null {
    return this._idbDatabaseTreeElements.find(x => x._databaseId.equals(databaseId) && x._model === model) || null;
  }
}

export class IDBDatabaseTreeElement extends ApplicationPanelTreeElement {
  _model: IndexedDBModel;
  _databaseId: DatabaseId;
  _idbObjectStoreTreeElements: Map<string, IDBObjectStoreTreeElement>;
  _database?: IndexedDBModelDatabase;
  _view?: IDBDatabaseView;

  constructor(storagePanel: ResourcesPanel, model: IndexedDBModel, databaseId: DatabaseId) {
    super(storagePanel, databaseId.name + ' - ' + databaseId.securityOrigin, false);
    this._model = model;
    this._databaseId = databaseId;
    this._idbObjectStoreTreeElements = new Map();
    const icon = UI.Icon.Icon.create('mediumicon-database', 'resource-tree-item');
    this.setLeadingIcons([icon]);
    this._model.addEventListener(IndexedDBModelEvents.DatabaseNamesRefreshed, this._refreshIndexedDB, this);
  }

  get itemURL(): string {
    return 'indexedDB://' + this._databaseId.securityOrigin + '/' + this._databaseId.name;
  }

  onattach(): void {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  _handleContextMenuEvent(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.refreshIndexeddb), this._refreshIndexedDB.bind(this));
    contextMenu.show();
  }

  _refreshIndexedDB(): void {
    this._model.refreshDatabase(this._databaseId);
  }

  indexedDBContentUpdated(objectStoreName: string): void {
    const treeElement = this._idbObjectStoreTreeElements.get(objectStoreName);
    if (treeElement) {
      treeElement.markNeedsRefresh();
    }
  }

  update(database: IndexedDBModelDatabase, entriesUpdated: boolean): void {
    this._database = database;
    const objectStoreNames = new Set<string>();
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

  _updateTooltip(): void {
    const version = this._database ? this._database.version : '-';
    if (Object.keys(this._idbObjectStoreTreeElements).length === 0) {
      this.tooltip = i18nString(UIStrings.versionSEmpty, {PH1: version});
    } else {
      this.tooltip = i18nString(UIStrings.versionS, {PH1: version});
    }
  }

  onselect(selectedByUser?: boolean): boolean {
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

  _objectStoreRemoved(objectStoreName: string): void {
    const objectStoreTreeElement = this._idbObjectStoreTreeElements.get(objectStoreName);
    if (objectStoreTreeElement) {
      objectStoreTreeElement.clear();
      this.removeChild(objectStoreTreeElement);
    }
    this._idbObjectStoreTreeElements.delete(objectStoreName);
    this._updateTooltip();
  }

  clear(): void {
    for (const objectStoreName of this._idbObjectStoreTreeElements.keys()) {
      this._objectStoreRemoved(objectStoreName);
    }
  }
}

export class IDBObjectStoreTreeElement extends ApplicationPanelTreeElement {
  _model: IndexedDBModel;
  _databaseId: DatabaseId;
  _idbIndexTreeElements: Map<string, IDBIndexTreeElement>;
  _objectStore: ObjectStore;
  _view: IDBDataView|null;

  constructor(storagePanel: ResourcesPanel, model: IndexedDBModel, databaseId: DatabaseId, objectStore: ObjectStore) {
    super(storagePanel, objectStore.name, false);
    this._model = model;
    this._databaseId = databaseId;
    this._idbIndexTreeElements = new Map();
    this._objectStore = objectStore;
    this._view = null;
    const icon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL(): string {
    return 'indexedDB://' + this._databaseId.securityOrigin + '/' + this._databaseId.name + '/' +
        this._objectStore.name;
  }

  onattach(): void {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  markNeedsRefresh(): void {
    if (this._view) {
      this._view.markNeedsRefresh();
    }
    for (const treeElement of this._idbIndexTreeElements.values()) {
      treeElement.markNeedsRefresh();
    }
  }

  _handleContextMenuEvent(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.clear), this._clearObjectStore.bind(this));
    contextMenu.show();
  }

  _refreshObjectStore(): void {
    if (this._view) {
      this._view.refreshData();
    }
    for (const treeElement of this._idbIndexTreeElements.values()) {
      treeElement.refreshIndex();
    }
  }

  async _clearObjectStore(): Promise<void> {
    await this._model.clearObjectStore(this._databaseId, this._objectStore.name);
    this.update(this._objectStore, true);
  }

  update(objectStore: ObjectStore, entriesUpdated: boolean): void {
    this._objectStore = objectStore;

    const indexNames = new Set<string>();
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
        this.removeChild((treeElement as IDBIndexTreeElement));
        this._idbIndexTreeElements.delete((indexName as string));
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

  _updateTooltip(): void {
    const keyPathString = this._objectStore.keyPathString;
    let tooltipString = keyPathString !== null ? i18nString(UIStrings.keyPathS, {PH1: keyPathString}) : '';
    if (this._objectStore.autoIncrement) {
      tooltipString += '\n' + i18n.i18n.lockedString('autoIncrement');
    }
    this.tooltip = tooltipString;
  }

  onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view =
          new IDBDataView(this._model, this._databaseId, this._objectStore, null, this._refreshObjectStore.bind(this));
    }

    this.showView(this._view);
    return false;
  }

  _indexRemoved(indexName: string): void {
    const indexTreeElement = this._idbIndexTreeElements.get(indexName);
    if (indexTreeElement) {
      indexTreeElement.clear();
      this.removeChild(indexTreeElement);
    }
    this._idbIndexTreeElements.delete(indexName);
  }

  clear(): void {
    for (const indexName of this._idbIndexTreeElements.keys()) {
      this._indexRemoved(indexName);
    }
    if (this._view) {
      this._view.clear();
    }
  }
}

export class IDBIndexTreeElement extends ApplicationPanelTreeElement {
  _model: IndexedDBModel;
  _databaseId: DatabaseId;
  _objectStore: ObjectStore;
  _index: Index;
  _refreshObjectStore: () => void;
  _view?: IDBDataView;

  constructor(
      storagePanel: ResourcesPanel, model: IndexedDBModel, databaseId: DatabaseId, objectStore: ObjectStore,
      index: Index, refreshObjectStore: () => void) {
    super(storagePanel, index.name, false);
    this._model = model;
    this._databaseId = databaseId;
    this._objectStore = objectStore;
    this._index = index;
    this._refreshObjectStore = refreshObjectStore;
  }

  get itemURL(): string {
    return 'indexedDB://' + this._databaseId.securityOrigin + '/' + this._databaseId.name + '/' +
        this._objectStore.name + '/' + this._index.name;
  }

  markNeedsRefresh(): void {
    if (this._view) {
      this._view.markNeedsRefresh();
    }
  }

  refreshIndex(): void {
    if (this._view) {
      this._view.refreshData();
    }
  }

  update(objectStore: ObjectStore, index: Index, entriesUpdated: boolean): void {
    this._objectStore = objectStore;
    this._index = index;

    if (this._view && entriesUpdated) {
      this._view.update(this._objectStore, this._index);
    }

    this._updateTooltip();
  }

  _updateTooltip(): void {
    const tooltipLines = [];
    const keyPathString = this._index.keyPathString;
    tooltipLines.push(i18nString(UIStrings.keyPathS, {PH1: keyPathString}));
    if (this._index.unique) {
      tooltipLines.push(i18n.i18n.lockedString('unique'));
    }
    if (this._index.multiEntry) {
      tooltipLines.push(i18n.i18n.lockedString('multiEntry'));
    }
    this.tooltip = tooltipLines.join('\n');
  }

  onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view =
          new IDBDataView(this._model, this._databaseId, this._objectStore, this._index, this._refreshObjectStore);
    }

    this.showView(this._view);
    return false;
  }

  clear(): void {
    if (this._view) {
      this._view.clear();
    }
  }
}

export class DOMStorageTreeElement extends ApplicationPanelTreeElement {
  _domStorage: DOMStorage;
  constructor(storagePanel: ResourcesPanel, domStorage: DOMStorage) {
    super(
        storagePanel, domStorage.securityOrigin ? domStorage.securityOrigin : i18nString(UIStrings.localFiles), false);
    this._domStorage = domStorage;
    const icon = UI.Icon.Icon.create('mediumicon-table', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL(): string {
    return 'storage://' + this._domStorage.securityOrigin + '/' +
        (this._domStorage.isLocalStorage ? 'local' : 'session');
  }

  onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    this.resourcesPanel.showDOMStorage(this._domStorage);
    return false;
  }

  onattach(): void {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  _handleContextMenuEvent(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString(UIStrings.clear), () => this._domStorage.clear());
    contextMenu.show();
  }
}

export class CookieTreeElement extends ApplicationPanelTreeElement {
  _target: SDK.Target.Target;
  _cookieDomain: string;

  constructor(storagePanel: ResourcesPanel, frame: SDK.ResourceTreeModel.ResourceTreeFrame, cookieDomain: string) {
    super(storagePanel, cookieDomain ? cookieDomain : i18nString(UIStrings.localFiles), false);
    this._target = frame.resourceTreeModel().target();
    this._cookieDomain = cookieDomain;
    this.tooltip = i18nString(UIStrings.cookiesUsedByFramesFromS, {PH1: cookieDomain});
    const icon = UI.Icon.Icon.create('mediumicon-cookie', 'resource-tree-item');
    this.setLeadingIcons([icon]);
  }

  get itemURL(): string {
    return 'cookies://' + this._cookieDomain;
  }

  cookieDomain(): string {
    return this._cookieDomain;
  }

  onattach(): void {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  _handleContextMenuEvent(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.clear), () => this.resourcesPanel.clearCookies(this._target, this._cookieDomain));
    contextMenu.show();
  }

  onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    this.resourcesPanel.showCookies(this._target, this._cookieDomain);
    return false;
  }
}

export class StorageCategoryView extends UI.Widget.VBox {
  _emptyWidget: UI.EmptyWidget.EmptyWidget;
  _linkElement: HTMLElement|null;

  constructor() {
    super();

    this.element.classList.add('storage-view');
    this._emptyWidget = new UI.EmptyWidget.EmptyWidget('');
    this._linkElement = null;
    this._emptyWidget.show(this.element);
  }

  setText(text: string): void {
    this._emptyWidget.text = text;
  }

  setLink(link: string|null): void {
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

export class ResourcesSection implements SDK.TargetManager.Observer {
  _panel: ResourcesPanel;
  _treeElement: UI.TreeOutline.TreeElement;
  _treeElementForFrameId: Map<string, FrameTreeElement>;
  _treeElementForTargetId: Map<string, FrameTreeElement>;

  constructor(storagePanel: ResourcesPanel, treeElement: UI.TreeOutline.TreeElement) {
    this._panel = storagePanel;
    this._treeElement = treeElement;
    UI.ARIAUtils.setAccessibleName(this._treeElement._listItemNode, 'Resources Section');
    this._treeElementForFrameId = new Map();
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

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ChildTargetManager.ChildTargetManager, SDK.ChildTargetManager.Events.TargetCreated, this._windowOpened,
        this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ChildTargetManager.ChildTargetManager, SDK.ChildTargetManager.Events.TargetInfoChanged, this._windowChanged,
        this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ChildTargetManager.ChildTargetManager, SDK.ChildTargetManager.Events.TargetDestroyed, this._windowDestroyed,
        this);

    SDK.TargetManager.TargetManager.instance().observeTargets(this);

    for (const frame of frameManager.getAllFrames()) {
      if (!this._treeElementForFrameId.get(frame.id)) {
        this._addFrameAndParents(frame);
      }
      const childTargetManager = frame.resourceTreeModel().target().model(SDK.ChildTargetManager.ChildTargetManager);
      if (childTargetManager) {
        for (const targetInfo of childTargetManager.targetInfos()) {
          this._windowOpened({data: targetInfo});
        }
      }
    }
  }

  targetAdded(target: SDK.Target.Target): void {
    if (target.type() === SDK.Target.Type.Worker || target.type() === SDK.Target.Type.ServiceWorker) {
      this._workerAdded(target);
    }
  }

  async _workerAdded(target: SDK.Target.Target): Promise<void> {
    const parentTarget = target.parentTarget();
    if (!parentTarget) {
      return;
    }
    const parentTargetId = parentTarget.id();
    const frameTreeElement = this._treeElementForTargetId.get(parentTargetId);
    const targetId = target.id();
    assertNotMainTarget(targetId);
    const {targetInfo} = await parentTarget.targetAgent().invoke_getTargetInfo({targetId});
    if (frameTreeElement && targetInfo) {
      frameTreeElement.workerCreated(targetInfo);
    }
  }

  targetRemoved(_target: SDK.Target.Target): void {
  }

  _addFrameAndParents(frame: SDK.ResourceTreeModel.ResourceTreeFrame): void {
    const parentFrame = frame.parentFrame();
    if (parentFrame && !this._treeElementForFrameId.get(parentFrame.id)) {
      this._addFrameAndParents(parentFrame);
    }
    this._frameAdded(frame);
  }

  _expandFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame|null): boolean {
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

  async revealResource(resource: SDK.Resource.Resource, line?: number, column?: number): Promise<void> {
    if (!this._expandFrame(resource.frame())) {
      return;
    }
    const resourceTreeElement = FrameResourceTreeElement.forResource(resource);
    if (resourceTreeElement) {
      await resourceTreeElement.revealResource(line, column);
    }
  }

  revealAndSelectFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame): void {
    const frameTreeElement = this._treeElementForFrameId.get(frame.id);
    frameTreeElement?.reveal();
    frameTreeElement?.select();
  }

  _frameAdded(frame: SDK.ResourceTreeModel.ResourceTreeFrame): void {
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

  _frameDetached(frameId: string): void {
    const frameTreeElement = this._treeElementForFrameId.get(frameId);
    if (!frameTreeElement) {
      return;
    }

    this._treeElementForFrameId.delete(frameId);
    if (frameTreeElement.parent) {
      frameTreeElement.parent.removeChild(frameTreeElement);
    }
  }

  _frameNavigated(frame: SDK.ResourceTreeModel.ResourceTreeFrame): void {
    const frameTreeElement = this._treeElementForFrameId.get(frame.id);
    if (frameTreeElement) {
      frameTreeElement.frameNavigated(frame);
    }
  }

  _resourceAdded(resource: SDK.Resource.Resource): void {
    const frameTreeElement = this._treeElementForFrameId.get(resource.frameId);
    if (!frameTreeElement) {
      // This is a frame's main resource, it will be retained
      // and re-added by the resource manager;
      return;
    }
    frameTreeElement.appendResource(resource);
  }

  _windowOpened(event: Common.EventTarget.EventTargetEvent<Protocol.Target.TargetInfo>): void {
    const targetInfo = event.data;
    // Events for DevTools windows are ignored because they do not have an openerId
    if (targetInfo.openerId && targetInfo.type === 'page') {
      const frameTreeElement = this._treeElementForFrameId.get(targetInfo.openerId);
      if (frameTreeElement) {
        this._treeElementForTargetId.set(targetInfo.targetId, frameTreeElement);
        frameTreeElement.windowOpened(targetInfo);
      }
    }
  }

  _windowDestroyed(event: Common.EventTarget.EventTargetEvent<Protocol.Target.TargetID>): void {
    const targetId = event.data;
    const frameTreeElement = this._treeElementForTargetId.get(targetId);
    if (frameTreeElement) {
      frameTreeElement.windowDestroyed(targetId);
      this._treeElementForTargetId.delete(targetId);
    }
  }

  _windowChanged(event: Common.EventTarget.EventTargetEvent<Protocol.Target.TargetInfo>): void {
    const targetInfo = event.data;
    // Events for DevTools windows are ignored because they do not have an openerId
    if (targetInfo.openerId && targetInfo.type === 'page') {
      const frameTreeElement = this._treeElementForFrameId.get(targetInfo.openerId);
      if (frameTreeElement) {
        frameTreeElement.windowChanged(targetInfo);
      }
    }
  }

  reset(): void {
    this._treeElement.removeChildren();
    this._treeElementForFrameId.clear();
    this._treeElementForTargetId.clear();
  }
}

export class FrameTreeElement extends ApplicationPanelTreeElement {
  _section: ResourcesSection;
  _frame: SDK.ResourceTreeModel.ResourceTreeFrame;
  _frameId: string;
  _categoryElements: Map<string, ExpandableApplicationPanelTreeElement>;
  _treeElementForResource: Map<string, FrameResourceTreeElement>;
  _treeElementForWindow: Map<string, FrameWindowTreeElement>;
  _treeElementForWorker: Map<string, WorkerTreeElement>;
  _view: ApplicationComponents.FrameDetailsView.FrameDetailsView|null;

  constructor(section: ResourcesSection, frame: SDK.ResourceTreeModel.ResourceTreeFrame) {
    super(section._panel, '', false);
    this._section = section;
    this._frame = frame;
    this._frameId = frame.id;
    this._categoryElements = new Map();
    this._treeElementForResource = new Map();
    this._treeElementForWindow = new Map();
    this._treeElementForWorker = new Map();
    this.frameNavigated(frame);
    this._view = null;
  }

  getIconTypeForFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame): 'mediumicon-frame-blocked'|'mediumicon-frame'|
      'mediumicon-frame-embedded-blocked'|'mediumicon-frame-embedded' {
    if (frame.isTopFrame()) {
      return frame.unreachableUrl() ? 'mediumicon-frame-blocked' : 'mediumicon-frame';
    }
    return frame.unreachableUrl() ? 'mediumicon-frame-embedded-blocked' : 'mediumicon-frame-embedded';
  }

  async frameNavigated(frame: SDK.ResourceTreeModel.ResourceTreeFrame): Promise<void> {
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
      this._view = new ApplicationComponents.FrameDetailsView.FrameDetailsView(this._frame);
      this.showView(this._view);
    } else {
      this._view = null;
    }

    // Service Workers' parent is always the top frame. We need to reconstruct
    // the service worker tree elements after those navigations which allow
    // the service workers to stay alive.
    if (frame.isTopFrame()) {
      const targets = SDK.TargetManager.TargetManager.instance().targets();
      for (const target of targets) {
        if (target.type() === SDK.Target.Type.ServiceWorker) {
          const targetId = target.id();
          assertNotMainTarget(targetId);
          const agent = frame.resourceTreeModel().target().targetAgent();
          const targetInfo = (await agent.invoke_getTargetInfo({targetId})).targetInfo;
          this.workerCreated(targetInfo);
        }
      }
    }
  }

  get itemURL(): string {
    // This is used to persist over reloads/navigation which frame was selected.
    // A frame's title can change on DevTools refresh, so we resort to using
    // the URL instead (even though it is not guaranteed to be unique).
    if (this._frame.isTopFrame()) {
      return 'frame://';
    }
    return 'frame://' + encodeURI(this._frame.url);
  }

  onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view = new ApplicationComponents.FrameDetailsView.FrameDetailsView(this._frame);
    } else {
      this._view.update();
    }
    this.showView(this._view);

    this.listItemElement.classList.remove('hovered');
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    return false;
  }

  set hovered(hovered: boolean) {
    if (hovered) {
      this.listItemElement.classList.add('hovered');
      this._frame.highlight();
    } else {
      this.listItemElement.classList.remove('hovered');
      SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
  }

  appendResource(resource: SDK.Resource.Resource): void {
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
          this._section._panel, resource.resourceType().category().title(), categoryName, categoryName === 'Frames');
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

  windowOpened(targetInfo: Protocol.Target.TargetInfo): void {
    const categoryKey = 'OpenedWindows';
    let categoryElement = this._categoryElements.get(categoryKey);
    if (!categoryElement) {
      categoryElement = new ExpandableApplicationPanelTreeElement(
          this._section._panel, i18nString(UIStrings.openedWindows), categoryKey);
      this._categoryElements.set(categoryKey, categoryElement);
      this.appendChild(categoryElement, FrameTreeElement._presentationOrderCompare);
    }
    if (!this._treeElementForWindow.get(targetInfo.targetId)) {
      const windowTreeElement = new FrameWindowTreeElement(this._section._panel, targetInfo);
      categoryElement.appendChild(windowTreeElement);
      this._treeElementForWindow.set(targetInfo.targetId, windowTreeElement);
    }
  }

  workerCreated(targetInfo: Protocol.Target.TargetInfo): void {
    const categoryKey = targetInfo.type === 'service_worker' ? 'Service Workers' : 'Web Workers';
    const categoryName = targetInfo.type === 'service_worker' ? i18n.i18n.lockedString('Service Workers') :
                                                                i18nString(UIStrings.webWorkers);
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

  windowChanged(targetInfo: Protocol.Target.TargetInfo): void {
    const windowTreeElement = this._treeElementForWindow.get(targetInfo.targetId);
    if (!windowTreeElement) {
      return;
    }
    if (windowTreeElement.title !== targetInfo.title) {
      windowTreeElement.title = targetInfo.title;
    }
    windowTreeElement.update(targetInfo);
  }

  windowDestroyed(targetId: string): void {
    const windowTreeElement = this._treeElementForWindow.get(targetId);
    if (windowTreeElement) {
      windowTreeElement.windowClosed();
    }
  }

  appendChild(
      treeElement: UI.TreeOutline.TreeElement,
      comparator: ((arg0: UI.TreeOutline.TreeElement, arg1: UI.TreeOutline.TreeElement) => number)|
      undefined = FrameTreeElement._presentationOrderCompare): void {
    super.appendChild(treeElement, comparator);
  }

  /**
   * Order elements by type (first frames, then resources, last Document resources)
   * and then each of these groups in the alphabetical order.
   */
  static _presentationOrderCompare(treeElement1: UI.TreeOutline.TreeElement, treeElement2: UI.TreeOutline.TreeElement):
      number {
    function typeWeight(treeElement: UI.TreeOutline.TreeElement): number {
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

const resourceToFrameResourceTreeElement = new WeakMap<SDK.Resource.Resource, FrameResourceTreeElement>();

export class FrameResourceTreeElement extends ApplicationPanelTreeElement {
  _panel: ResourcesPanel;
  _resource: SDK.Resource.Resource;
  _previewPromise: Promise<UI.Widget.Widget>|null;

  constructor(storagePanel: ResourcesPanel, resource: SDK.Resource.Resource) {
    super(
        storagePanel, resource.isGenerated ? i18nString(UIStrings.documentNotAvailable) : resource.displayName, false);
    this._panel = storagePanel;
    this._resource = resource;
    this._previewPromise = null;
    this.tooltip = resource.url;
    resourceToFrameResourceTreeElement.set(this._resource, this);

    const icon = UI.Icon.Icon.create('mediumicon-manifest', 'navigator-file-tree-item');
    icon.classList.add('navigator-' + resource.resourceType().name() + '-tree-item');
    this.setLeadingIcons([icon]);
  }

  static forResource(resource: SDK.Resource.Resource): FrameResourceTreeElement|undefined {
    return resourceToFrameResourceTreeElement.get(resource);
  }

  get itemURL(): string {
    return this._resource.url;
  }

  _preparePreview(): Promise<UI.Widget.Widget> {
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

  onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (this._resource.isGenerated) {
      this._panel.showCategoryView(i18nString(UIStrings.theContentOfThisDocumentHasBeen), null);
    } else {
      this._panel.scheduleShowView(this._preparePreview());
    }
    return false;
  }

  ondblclick(_event: Event): boolean {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(this._resource.url);
    return false;
  }

  onattach(): void {
    super.onattach();
    this.listItemElement.draggable = true;
    this.listItemElement.addEventListener('dragstart', this._ondragstart.bind(this), false);
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), true);
  }

  _ondragstart(event: DragEvent): boolean {
    if (!event.dataTransfer) {
      return false;
    }
    event.dataTransfer.setData('text/plain', this._resource.content || '');
    event.dataTransfer.effectAllowed = 'copy';
    return true;
  }

  _handleContextMenuEvent(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this._resource);
    contextMenu.show();
  }

  async revealResource(line?: number, column?: number): Promise<void> {
    this.revealAndSelect(true);
    const view = await this._panel.scheduleShowView(this._preparePreview());
    if (!(view instanceof SourceFrame.ResourceSourceFrame.ResourceSourceFrame) || typeof line !== 'number') {
      return;
    }
    view.revealPosition(line, column, true);
  }
}

class FrameWindowTreeElement extends ApplicationPanelTreeElement {
  _targetInfo: Protocol.Target.TargetInfo;
  _isWindowClosed: boolean;
  _view: OpenedWindowDetailsView|null;

  constructor(storagePanel: ResourcesPanel, targetInfo: Protocol.Target.TargetInfo) {
    super(storagePanel, targetInfo.title || i18nString(UIStrings.windowWithoutTitle), false);
    this._targetInfo = targetInfo;
    this._isWindowClosed = false;
    this._view = null;
    this.updateIcon(targetInfo.canAccessOpener);
  }

  updateIcon(canAccessOpener: boolean): void {
    const iconType = canAccessOpener ? 'mediumicon-frame-opened' : 'mediumicon-frame';
    const icon = UI.Icon.Icon.create(iconType);
    this.setLeadingIcons([icon]);
  }

  update(targetInfo: Protocol.Target.TargetInfo): void {
    if (targetInfo.canAccessOpener !== this._targetInfo.canAccessOpener) {
      this.updateIcon(targetInfo.canAccessOpener);
    }
    this._targetInfo = targetInfo;
    if (this._view) {
      this._view.setTargetInfo(targetInfo);
      this._view.update();
    }
  }

  windowClosed(): void {
    this.listItemElement.classList.add('window-closed');
    this._isWindowClosed = true;
    if (this._view) {
      this._view.setIsWindowClosed(true);
      this._view.update();
    }
  }

  onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view = new OpenedWindowDetailsView(this._targetInfo, this._isWindowClosed);
    } else {
      this._view.update();
    }
    this.showView(this._view);
    return false;
  }

  get itemURL(): string {
    return this._targetInfo.url;
  }
}

class WorkerTreeElement extends ApplicationPanelTreeElement {
  _targetInfo: Protocol.Target.TargetInfo;
  _view: WorkerDetailsView|null;

  constructor(storagePanel: ResourcesPanel, targetInfo: Protocol.Target.TargetInfo) {
    super(storagePanel, targetInfo.title || targetInfo.url || i18nString(UIStrings.worker), false);
    this._targetInfo = targetInfo;
    this._view = null;
    const icon = UI.Icon.Icon.create('mediumicon-service-worker', 'navigator-file-tree-item');
    this.setLeadingIcons([icon]);
  }

  onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this._view) {
      this._view = new WorkerDetailsView(this._targetInfo);
    } else {
      this._view.update();
    }
    this.showView(this._view);
    return false;
  }

  get itemURL(): string {
    return this._targetInfo.url;
  }
}
