// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ResourcesModule from './resources.js';

self.Resources = self.Resources || {};
Resources = Resources || {};

/** @constructor */
Resources.AppManifestView = ResourcesModule.AppManifestView.AppManifestView;

/** @constructor */
Resources.ApplicationCacheItemsView = ResourcesModule.ApplicationCacheItemsView.ApplicationCacheItemsView;

/** @constructor */
Resources.ApplicationCacheModel = ResourcesModule.ApplicationCacheModel.ApplicationCacheModel;

/** @enum {symbol} */
Resources.ApplicationCacheModel.Events = ResourcesModule.ApplicationCacheModel.Events;

Resources.ApplicationCacheModel.UNCACHED = ResourcesModule.ApplicationCacheModel.UNCACHED;
Resources.ApplicationCacheModel.IDLE = ResourcesModule.ApplicationCacheModel.IDLE;
Resources.ApplicationCacheModel.CHECKING = ResourcesModule.ApplicationCacheModel.CHECKING;
Resources.ApplicationCacheModel.DOWNLOADING = ResourcesModule.ApplicationCacheModel.DOWNLOADING;
Resources.ApplicationCacheModel.UPDATEREADY = ResourcesModule.ApplicationCacheModel.UPDATEREADY;
Resources.ApplicationCacheModel.OBSOLETE = ResourcesModule.ApplicationCacheModel.OBSOLETE;

/** @constructor */
Resources.ApplicationCacheDispatcher = ResourcesModule.ApplicationCacheModel.ApplicationCacheDispatcher;

/** @constructor */
Resources.ApplicationPanelSidebar = ResourcesModule.ApplicationPanelSidebar.ApplicationPanelSidebar;

/** @constructor */
Resources.BaseStorageTreeElement = ResourcesModule.ApplicationPanelSidebar.BaseStorageTreeElement;

/** @constructor */
Resources.StorageCategoryTreeElement = ResourcesModule.ApplicationPanelSidebar.StorageCategoryTreeElement;

/** @constructor */
Resources.BackgroundServiceTreeElement = ResourcesModule.ApplicationPanelSidebar.BackgroundServiceTreeElement;

/** @constructor */
Resources.DatabaseTreeElement = ResourcesModule.ApplicationPanelSidebar.DatabaseTreeElement;

/** @constructor */
Resources.DatabaseTableTreeElement = ResourcesModule.ApplicationPanelSidebar.DatabaseTableTreeElement;

/** @constructor */
Resources.ServiceWorkerCacheTreeElement = ResourcesModule.ApplicationPanelSidebar.ServiceWorkerCacheTreeElement;

/** @constructor */
Resources.SWCacheTreeElement = ResourcesModule.ApplicationPanelSidebar.SWCacheTreeElement;

/** @constructor */
Resources.ServiceWorkersTreeElement = ResourcesModule.ApplicationPanelSidebar.ServiceWorkersTreeElement;

/** @constructor */
Resources.AppManifestTreeElement = ResourcesModule.ApplicationPanelSidebar.AppManifestTreeElement;

/** @constructor */
Resources.ClearStorageTreeElement = ResourcesModule.ApplicationPanelSidebar.ClearStorageTreeElement;

/** @constructor */
Resources.IndexedDBTreeElement = ResourcesModule.ApplicationPanelSidebar.IndexedDBTreeElement;

/** @constructor */
Resources.IDBDatabaseTreeElement = ResourcesModule.ApplicationPanelSidebar.IDBDatabaseTreeElement;

/** @constructor */
Resources.IDBObjectStoreTreeElement = ResourcesModule.ApplicationPanelSidebar.IDBObjectStoreTreeElement;

/** @constructor */
Resources.IDBIndexTreeElement = ResourcesModule.ApplicationPanelSidebar.IDBIndexTreeElement;

/** @constructor */
Resources.DOMStorageTreeElement = ResourcesModule.ApplicationPanelSidebar.DOMStorageTreeElement;

/** @constructor */
Resources.CookieTreeElement = ResourcesModule.ApplicationPanelSidebar.CookieTreeElement;

/** @constructor */
Resources.ApplicationCacheManifestTreeElement =
    ResourcesModule.ApplicationPanelSidebar.ApplicationCacheManifestTreeElement;

/** @constructor */
Resources.ApplicationCacheFrameTreeElement = ResourcesModule.ApplicationPanelSidebar.ApplicationCacheFrameTreeElement;

/** @constructor */
Resources.StorageCategoryView = ResourcesModule.ApplicationPanelSidebar.StorageCategoryView;

/** @constructor */
Resources.BackgroundServiceModel = ResourcesModule.BackgroundServiceModel.BackgroundServiceModel;

/** @enum {symbol} */
Resources.BackgroundServiceModel.Events = ResourcesModule.BackgroundServiceModel.Events;

/** @constructor */
Resources.BackgroundServiceView = ResourcesModule.BackgroundServiceView.BackgroundServiceView;

/** @constructor */
Resources.BackgroundServiceView.EventDataNode = ResourcesModule.BackgroundServiceView.EventDataNode;

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
Resources.DOMStorageItemsView = ResourcesModule.DOMStorageItemsView.DOMStorageItemsView;

/** @constructor */
Resources.DOMStorageModel = ResourcesModule.DOMStorageModel.DOMStorageModel;

/** @enum {symbol} */
Resources.DOMStorageModel.Events = ResourcesModule.DOMStorageModel.Events;

/** @constructor */
Resources.DOMStorage = ResourcesModule.DOMStorageModel.DOMStorage;

/** @constructor */
Resources.DOMStorageDispatcher = ResourcesModule.DOMStorageModel.DOMStorageDispatcher;

/** @constructor */
Resources.DatabaseModel = ResourcesModule.DatabaseModel.DatabaseModel;

/** @enum {symbol} */
Resources.DatabaseModel.Events = ResourcesModule.DatabaseModel.Events;

/** @constructor */
Resources.Database = ResourcesModule.DatabaseModel.Database;

/** @constructor */
Resources.DatabaseDispatcher = ResourcesModule.DatabaseModel.DatabaseDispatcher;

/** @constructor */
Resources.DatabaseQueryView = ResourcesModule.DatabaseQueryView.DatabaseQueryView;

/** @enum {symbol} */
Resources.DatabaseQueryView.Events = ResourcesModule.DatabaseQueryView.Events;

Resources.DatabaseQueryView._SQL_BUILT_INS = ResourcesModule.DatabaseQueryView.SQL_BUILT_INS;

/** @constructor */
Resources.DatabaseTableView = ResourcesModule.DatabaseTableView.DatabaseTableView;

/** @constructor */
Resources.IndexedDBModel = ResourcesModule.IndexedDBModel.IndexedDBModel;

Resources.IndexedDBModel.KeyTypes = ResourcesModule.IndexedDBModel.KeyTypes;
Resources.IndexedDBModel.KeyPathTypes = ResourcesModule.IndexedDBModel.KeyPathTypes;

/** @enum {symbol} */
Resources.IndexedDBModel.Events = ResourcesModule.IndexedDBModel.Events;

/** @constructor */
Resources.IndexedDBModel.Entry = ResourcesModule.IndexedDBModel.Entry;

/** @constructor */
Resources.IndexedDBModel.DatabaseId = ResourcesModule.IndexedDBModel.DatabaseId;

/** @constructor */
Resources.IndexedDBModel.Database = ResourcesModule.IndexedDBModel.Database;

/** @constructor */
Resources.IndexedDBModel.ObjectStore = ResourcesModule.IndexedDBModel.ObjectStore;

/** @constructor */
Resources.IndexedDBModel.Index = ResourcesModule.IndexedDBModel.Index;

/** @constructor */
Resources.IDBDatabaseView = ResourcesModule.IndexedDBViews.IDBDatabaseView;

/** @constructor */
Resources.IDBDataView = ResourcesModule.IndexedDBViews.IDBDataView;

/** @constructor */
Resources.IDBDataGridNode = ResourcesModule.IndexedDBViews.IDBDataGridNode;

/** @constructor */
Resources.ResourcesPanel = ResourcesModule.ResourcesPanel.ResourcesPanel;

/** @constructor */
Resources.ResourcesPanel.ResourceRevealer = ResourcesModule.ResourcesPanel.ResourceRevealer;

/** @constructor */
Resources.ResourcesSection = ResourcesModule.ApplicationPanelSidebar.ResourcesSection;

/** @constructor */
Resources.FrameTreeElement = ResourcesModule.ApplicationPanelSidebar.FrameTreeElement;

/** @constructor */
Resources.FrameResourceTreeElement = ResourcesModule.ApplicationPanelSidebar.FrameResourceTreeElement;

/** @constructor */
Resources.ServiceWorkerCacheView = ResourcesModule.ServiceWorkerCacheViews.ServiceWorkerCacheView;

/** @constructor */
Resources.ServiceWorkerCacheView.DataGridNode = ResourcesModule.ServiceWorkerCacheViews.DataGridNode;

/** @constructor */
Resources.ServiceWorkerCacheView.RequestView = ResourcesModule.ServiceWorkerCacheViews.RequestView;

/** @constructor */
Resources.ServiceWorkersView = ResourcesModule.ServiceWorkersView.ServiceWorkersView;

/** @constructor */
Resources.ServiceWorkersView.Section = ResourcesModule.ServiceWorkersView.Section;

/** @constructor */
Resources.StorageItemsView = ResourcesModule.StorageItemsView.StorageItemsView;

/**
 * @typedef {!{isRecording: boolean, serviceName: !Protocol.BackgroundService.ServiceName}}
 */
Resources.BackgroundServiceModel.RecordingState;

/**
 * @typedef {{
  *    id: number,
  *    timestamp: string,
  *    origin: string,
  *    swScope: string,
  *    eventName: string,
  *    instanceId: string,
  * }}
  */
Resources.BackgroundServiceView.EventData;

/**
 * @typedef {{
  *      entriesCount: number,
  *      keyGeneratorValue: number
  * }}
  */
Resources.IndexedDBModel.ObjectStoreMetadata;
