// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ResourcesModule from './resources.js';

self.Resources = self.Resources || {};
Resources = Resources || {};

/** @constructor */
Resources.ApplicationCacheModel = ResourcesModule.ApplicationCacheModel.ApplicationCacheModel;

/** @constructor */
Resources.ApplicationPanelSidebar = ResourcesModule.ApplicationPanelSidebar.ApplicationPanelSidebar;

/** @constructor */
Resources.IndexedDBTreeElement = ResourcesModule.ApplicationPanelSidebar.IndexedDBTreeElement;

/** @constructor */
Resources.IDBObjectStoreTreeElement = ResourcesModule.ApplicationPanelSidebar.IDBObjectStoreTreeElement;

/** @constructor */
Resources.IDBIndexTreeElement = ResourcesModule.ApplicationPanelSidebar.IDBIndexTreeElement;

/** @constructor */
Resources.BackgroundServiceModel = ResourcesModule.BackgroundServiceModel.BackgroundServiceModel;

/** @enum {symbol} */
Resources.BackgroundServiceModel.Events = ResourcesModule.BackgroundServiceModel.Events;

/** @constructor */
Resources.BackgroundServiceView = ResourcesModule.BackgroundServiceView.BackgroundServiceView;

/** @constructor */
Resources.BackgroundServiceView.ActionDelegate = ResourcesModule.BackgroundServiceView.ActionDelegate;

/** @constructor */
Resources.ClearStorageView = ResourcesModule.ClearStorageView.ClearStorageView;

Resources.ClearStorageView.AllStorageTypes = ResourcesModule.ClearStorageView.AllStorageTypes;

/** @constructor */
Resources.ClearStorageView.ActionDelegate = ResourcesModule.ClearStorageView.ActionDelegate;

/** @constructor */
Resources.CookieItemsView = ResourcesModule.CookieItemsView.CookieItemsView;

/** @constructor */
Resources.DOMStorageModel = ResourcesModule.DOMStorageModel.DOMStorageModel;

/** @constructor */
Resources.DOMStorage = ResourcesModule.DOMStorageModel.DOMStorage;

/** @constructor */
Resources.DatabaseModel = ResourcesModule.DatabaseModel.DatabaseModel;

/** @constructor */
Resources.Database = ResourcesModule.DatabaseModel.Database;

/** @constructor */
Resources.DatabaseQueryView = ResourcesModule.DatabaseQueryView.DatabaseQueryView;

/** @enum {symbol} */
Resources.DatabaseQueryView.Events = ResourcesModule.DatabaseQueryView.Events;

/** @constructor */
Resources.DatabaseTableView = ResourcesModule.DatabaseTableView.DatabaseTableView;

/** @constructor */
Resources.IndexedDBModel = ResourcesModule.IndexedDBModel.IndexedDBModel;

/** @enum {symbol} */
Resources.IndexedDBModel.Events = ResourcesModule.IndexedDBModel.Events;

/** @constructor */
Resources.IndexedDBModel.DatabaseId = ResourcesModule.IndexedDBModel.DatabaseId;

/** @constructor */
Resources.IndexedDBModel.Database = ResourcesModule.IndexedDBModel.Database;

/** @constructor */
Resources.IndexedDBModel.ObjectStore = ResourcesModule.IndexedDBModel.ObjectStore;

/** @constructor */
Resources.IDBDatabaseView = ResourcesModule.IndexedDBViews.IDBDatabaseView;

/** @constructor */
Resources.IDBDataView = ResourcesModule.IndexedDBViews.IDBDataView;

/** @constructor */
Resources.ResourcesPanel = ResourcesModule.ResourcesPanel.ResourcesPanel;

/** @constructor */
Resources.ResourcesPanel.ResourceRevealer = ResourcesModule.ResourcesPanel.ResourceRevealer;

/** @constructor */
Resources.ResourcesPanel.CookieReferenceRevealer = ResourcesModule.ResourcesPanel.CookieReferenceRevealer;

/** @constructor */
Resources.FrameTreeElement = ResourcesModule.ApplicationPanelSidebar.FrameTreeElement;

/** @constructor */
Resources.ServiceWorkerCacheView = ResourcesModule.ServiceWorkerCacheViews.ServiceWorkerCacheView;

/** @constructor */
Resources.ServiceWorkersView = ResourcesModule.ServiceWorkersView.ServiceWorkersView;
