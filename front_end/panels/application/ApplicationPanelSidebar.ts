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

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ApplicationPanelTreeElement, ExpandableApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import {AppManifestView, Events as AppManifestViewEvents} from './AppManifestView.js';
import {BackForwardCacheTreeElement} from './BackForwardCacheTreeElement.js';
import {BackgroundServiceModel} from './BackgroundServiceModel.js';
import {BackgroundServiceView} from './BackgroundServiceView.js';
import {BounceTrackingMitigationsTreeElement} from './BounceTrackingMitigationsTreeElement.js';
import * as ApplicationComponents from './components/components.js';
import {type DOMStorage, DOMStorageModel, Events as DOMStorageModelEvents} from './DOMStorageModel.js';
import {
  Events as ExtensionStorageModelEvents,
  type ExtensionStorage,
  ExtensionStorageModel,
} from './ExtensionStorageModel.js';
import {
  type Database as IndexedDBModelDatabase,
  type DatabaseId,
  Events as IndexedDBModelEvents,
  type Index,
  IndexedDBModel,
  type ObjectStore,
} from './IndexedDBModel.js';
import {IDBDatabaseView, IDBDataView} from './IndexedDBViews.js';
import {Events as InterestGroupModelEvents, InterestGroupStorageModel} from './InterestGroupStorageModel.js';
import {InterestGroupTreeElement} from './InterestGroupTreeElement.js';
import {OpenedWindowDetailsView, WorkerDetailsView} from './OpenedWindowDetailsView.js';
import type * as PreloadingHelper from './preloading/helper/helper.js';
import {
  PreloadingSummaryTreeElement,
} from './PreloadingTreeElement.js';
import {ReportingApiTreeElement} from './ReportingApiTreeElement.js';
import type {ResourcesPanel} from './ResourcesPanel.js';
import resourcesSidebarStyles from './resourcesSidebar.css.js';
import {ServiceWorkerCacheTreeElement} from './ServiceWorkerCacheTreeElement.js';
import {ServiceWorkersView} from './ServiceWorkersView.js';
import {SharedStorageListTreeElement} from './SharedStorageListTreeElement.js';
import {
  Events as SharedStorageModelEvents,
  type SharedStorageForOrigin,
  SharedStorageModel,
} from './SharedStorageModel.js';
import {SharedStorageTreeElement} from './SharedStorageTreeElement.js';
import {StorageBucketsTreeParentElement} from './StorageBucketsTreeElement.js';
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
  localStorage: 'Local storage',
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  sessionStorage: 'Session storage',
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  extensionStorage: 'Extension storage',
  /**
   *@description Text for extension session storage in Application panel
   */
  extensionSessionStorage: 'Session',
  /**
   *@description Text for extension local storage in Application panel
   */
  extensionLocalStorage: 'Local',
  /**
   *@description Text for extension sync storage in Application panel
   */
  extensionSyncStorage: 'Sync',
  /**
   *@description Text for extension managed storage in Application panel
   */
  extensionManagedStorage: 'Managed',
  /**
   *@description Text for web cookies
   */
  cookies: 'Cookies',
  /**
   *@description Text in Application Panel Sidebar of the Application panel
   */
  backgroundServices: 'Background services',
  /**
   *@description Text for rendering frames
   */
  frames: 'Frames',
  /**
   *@description Text that appears on a button for the manifest resource type filter.
   */
  manifest: 'Manifest',
  /**
   *@description Text in App Manifest View of the Application panel
   */
  noManifestDetected: 'No manifest detected',
  /**
   *@description Text in App Manifest View of the Application panel
   */
  appManifest: 'App Manifest',
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
  /**
   * @description Aria text for screen reader to announce they can scroll to top of manifest if invoked
   */
  onInvokeManifestAlert: 'Manifest: Invoke to scroll to the top of manifest',
  /**
   * @description Aria text for screen reader to announce they can scroll to a section if invoked
   * @example {"Identity"} PH1
   */
  beforeInvokeAlert: '{PH1}: Invoke to scroll to this section in manifest',
  /**
   * @description Alert message for screen reader to announce which subsection is being scrolled to
   * @example {"Identity"} PH1
   */
  onInvokeAlert: 'Scrolled to {PH1}',
  /**
   * @description Application sidebar panel
   */
  applicationSidebarPanel: 'Application panel sidebar',
  /**
   *@description Tooltip in Application Panel Sidebar of the Application panel
   *@example {https://example.com} PH1
   */
  thirdPartyPhaseout: 'Cookies from {PH1} may have been blocked due to third-party cookie phaseout.',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/ApplicationPanelSidebar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

function assertNotMainTarget(targetId: Protocol.Target.TargetID|'main'): asserts targetId is Protocol.Target.TargetID {
  if (targetId === 'main') {
    throw new Error('Unexpected main target id');
  }
}

function nameForExtensionStorageArea(storageArea: Protocol.Extensions.StorageArea): string {
  switch (storageArea) {
    case Protocol.Extensions.StorageArea.Session:
      return i18nString(UIStrings.extensionSessionStorage);
    case Protocol.Extensions.StorageArea.Local:
      return i18nString(UIStrings.extensionLocalStorage);
    case Protocol.Extensions.StorageArea.Sync:
      return i18nString(UIStrings.extensionSyncStorage);
    case Protocol.Extensions.StorageArea.Managed:
      return i18nString(UIStrings.extensionManagedStorage);
    default:
      throw new Error(`Unrecognized storage type: ${storageArea}`);
  }
}

export namespace SharedStorageTreeElementDispatcher {
  export const enum Events {
    SHARED_STORAGE_TREE_ELEMENT_ADDED = 'SharedStorageTreeElementAdded',
  }

  export interface SharedStorageTreeElementAddedEvent {
    origin: string;
  }

  export type EventTypes = {
    [Events.SHARED_STORAGE_TREE_ELEMENT_ADDED]: SharedStorageTreeElementAddedEvent,
  };
}

export class ApplicationPanelSidebar extends UI.Widget.VBox implements SDK.TargetManager.Observer {
  panel: ResourcesPanel;
  private readonly sidebarTree: UI.TreeOutline.TreeOutlineInShadow;
  private readonly applicationTreeElement: UI.TreeOutline.TreeElement;
  serviceWorkersTreeElement: ServiceWorkersTreeElement;
  localStorageListTreeElement: ExpandableApplicationPanelTreeElement;
  sessionStorageListTreeElement: ExpandableApplicationPanelTreeElement;
  extensionStorageListTreeElement: ExpandableApplicationPanelTreeElement;
  indexedDBListTreeElement: IndexedDBTreeElement;
  interestGroupTreeElement: InterestGroupTreeElement;
  cookieListTreeElement: ExpandableApplicationPanelTreeElement;
  trustTokensTreeElement: TrustTokensTreeElement;
  cacheStorageListTreeElement: ServiceWorkerCacheTreeElement;
  sharedStorageListTreeElement: SharedStorageListTreeElement;
  storageBucketsTreeElement: StorageBucketsTreeParentElement|undefined;
  private backForwardCacheListTreeElement?: BackForwardCacheTreeElement;
  backgroundFetchTreeElement: BackgroundServiceTreeElement;
  backgroundSyncTreeElement: BackgroundServiceTreeElement;
  bounceTrackingMitigationsTreeElement: BounceTrackingMitigationsTreeElement;
  notificationsTreeElement: BackgroundServiceTreeElement;
  paymentHandlerTreeElement: BackgroundServiceTreeElement;
  periodicBackgroundSyncTreeElement: BackgroundServiceTreeElement;
  pushMessagingTreeElement: BackgroundServiceTreeElement;
  reportingApiTreeElement: ReportingApiTreeElement;
  preloadingSummaryTreeElement: PreloadingSummaryTreeElement|undefined;
  private readonly resourcesSection: ResourcesSection;
  private domStorageTreeElements: Map<DOMStorage, DOMStorageTreeElement>;
  private extensionIdToStorageTreeParentElement: Map<string, ExtensionStorageTreeParentElement>;
  private extensionStorageModels: ExtensionStorageModel[];
  private extensionStorageTreeElements: Map<string, ExtensionStorageTreeElement>;
  private sharedStorageTreeElements: Map<string, SharedStorageTreeElement>;
  private domains: {
    [x: string]: boolean,
  };
  // Holds main frame target.
  private target?: SDK.Target.Target;
  private previousHoveredElement?: FrameTreeElement;
  readonly sharedStorageTreeElementDispatcher:
      Common.ObjectWrapper.ObjectWrapper<SharedStorageTreeElementDispatcher.EventTypes>;

  constructor(panel: ResourcesPanel) {
    super();

    this.panel = panel;

    this.sidebarTree = new UI.TreeOutline.TreeOutlineInShadow(UI.TreeOutline.TreeVariant.NAVIGATION_TREE);
    this.sidebarTree.element.classList.add('resources-sidebar');
    this.sidebarTree.hideOverflow();

    this.sidebarTree.element.classList.add('filter-all');
    // Listener needs to have been set up before the elements are added
    this.sidebarTree.addEventListener(UI.TreeOutline.Events.ElementAttached, this.treeElementAdded, this);

    this.contentElement.appendChild(this.sidebarTree.element);

    const applicationSectionTitle = i18nString(UIStrings.application);
    this.applicationTreeElement = this.addSidebarSection(applicationSectionTitle, 'application');
    const applicationPanelSidebar = this.applicationTreeElement.treeOutline?.contentElement;
    if (applicationPanelSidebar) {
      applicationPanelSidebar.ariaLabel = i18nString(UIStrings.applicationSidebarPanel);
    }
    const manifestTreeElement = new AppManifestTreeElement(panel);
    this.applicationTreeElement.appendChild(manifestTreeElement);
    manifestTreeElement.generateChildren();
    this.serviceWorkersTreeElement = new ServiceWorkersTreeElement(panel);
    this.applicationTreeElement.appendChild(this.serviceWorkersTreeElement);
    const clearStorageTreeElement = new ClearStorageTreeElement(panel);
    this.applicationTreeElement.appendChild(clearStorageTreeElement);

    const storageSectionTitle = i18nString(UIStrings.storage);
    const storageTreeElement = this.addSidebarSection(storageSectionTitle, 'storage');
    this.localStorageListTreeElement =
        new ExpandableApplicationPanelTreeElement(panel, i18nString(UIStrings.localStorage), 'local-storage');
    this.localStorageListTreeElement.setLink(
        'https://developer.chrome.com/docs/devtools/storage/localstorage/?utm_source=devtools' as
        Platform.DevToolsPath.UrlString);
    const localStorageIcon = IconButton.Icon.create('table');
    this.localStorageListTreeElement.setLeadingIcons([localStorageIcon]);

    storageTreeElement.appendChild(this.localStorageListTreeElement);
    this.sessionStorageListTreeElement =
        new ExpandableApplicationPanelTreeElement(panel, i18nString(UIStrings.sessionStorage), 'session-storage');
    this.sessionStorageListTreeElement.setLink(
        'https://developer.chrome.com/docs/devtools/storage/sessionstorage/?utm_source=devtools' as
        Platform.DevToolsPath.UrlString);
    const sessionStorageIcon = IconButton.Icon.create('table');
    this.sessionStorageListTreeElement.setLeadingIcons([sessionStorageIcon]);

    storageTreeElement.appendChild(this.sessionStorageListTreeElement);

    this.extensionStorageListTreeElement =
        new ExpandableApplicationPanelTreeElement(panel, i18nString(UIStrings.extensionStorage), 'extension-storage');
    this.extensionStorageListTreeElement.setLink(
        'https://developer.chrome.com/docs/extensions/reference/api/storage/?utm_source=devtools' as
        Platform.DevToolsPath.UrlString);
    const extensionStorageIcon = IconButton.Icon.create('table');
    this.extensionStorageListTreeElement.setLeadingIcons([extensionStorageIcon]);

    storageTreeElement.appendChild(this.extensionStorageListTreeElement);

    this.indexedDBListTreeElement = new IndexedDBTreeElement(panel);
    this.indexedDBListTreeElement.setLink(
        'https://developer.chrome.com/docs/devtools/storage/indexeddb/?utm_source=devtools' as
        Platform.DevToolsPath.UrlString);
    storageTreeElement.appendChild(this.indexedDBListTreeElement);

    this.cookieListTreeElement =
        new ExpandableApplicationPanelTreeElement(panel, i18nString(UIStrings.cookies), 'cookies');
    this.cookieListTreeElement.setLink(
        'https://developer.chrome.com/docs/devtools/storage/cookies/?utm_source=devtools' as
        Platform.DevToolsPath.UrlString);
    const cookieIcon = IconButton.Icon.create('cookie');
    this.cookieListTreeElement.setLeadingIcons([cookieIcon]);
    storageTreeElement.appendChild(this.cookieListTreeElement);

    this.trustTokensTreeElement = new TrustTokensTreeElement(panel);
    storageTreeElement.appendChild(this.trustTokensTreeElement);

    this.interestGroupTreeElement = new InterestGroupTreeElement(panel);
    storageTreeElement.appendChild(this.interestGroupTreeElement);

    this.sharedStorageListTreeElement = new SharedStorageListTreeElement(panel);
    storageTreeElement.appendChild(this.sharedStorageListTreeElement);

    this.cacheStorageListTreeElement = new ServiceWorkerCacheTreeElement(panel);
    storageTreeElement.appendChild(this.cacheStorageListTreeElement);

    this.storageBucketsTreeElement = new StorageBucketsTreeParentElement(panel);
    storageTreeElement.appendChild(this.storageBucketsTreeElement);

    const backgroundServiceSectionTitle = i18nString(UIStrings.backgroundServices);
    const backgroundServiceTreeElement = this.addSidebarSection(backgroundServiceSectionTitle, 'background-services');

    this.backForwardCacheListTreeElement = new BackForwardCacheTreeElement(panel);
    backgroundServiceTreeElement.appendChild(this.backForwardCacheListTreeElement);
    this.backgroundFetchTreeElement =
        new BackgroundServiceTreeElement(panel, Protocol.BackgroundService.ServiceName.BackgroundFetch);
    backgroundServiceTreeElement.appendChild(this.backgroundFetchTreeElement);
    this.backgroundSyncTreeElement =
        new BackgroundServiceTreeElement(panel, Protocol.BackgroundService.ServiceName.BackgroundSync);
    backgroundServiceTreeElement.appendChild(this.backgroundSyncTreeElement);

    this.bounceTrackingMitigationsTreeElement = new BounceTrackingMitigationsTreeElement(panel);
    backgroundServiceTreeElement.appendChild(this.bounceTrackingMitigationsTreeElement);

    this.notificationsTreeElement =
        new BackgroundServiceTreeElement(panel, Protocol.BackgroundService.ServiceName.Notifications);
    backgroundServiceTreeElement.appendChild(this.notificationsTreeElement);
    this.paymentHandlerTreeElement =
        new BackgroundServiceTreeElement(panel, Protocol.BackgroundService.ServiceName.PaymentHandler);
    backgroundServiceTreeElement.appendChild(this.paymentHandlerTreeElement);
    this.periodicBackgroundSyncTreeElement =
        new BackgroundServiceTreeElement(panel, Protocol.BackgroundService.ServiceName.PeriodicBackgroundSync);
    backgroundServiceTreeElement.appendChild(this.periodicBackgroundSyncTreeElement);

    this.preloadingSummaryTreeElement = new PreloadingSummaryTreeElement(panel);
    backgroundServiceTreeElement.appendChild(this.preloadingSummaryTreeElement);
    this.preloadingSummaryTreeElement.constructChildren(panel);

    this.pushMessagingTreeElement =
        new BackgroundServiceTreeElement(panel, Protocol.BackgroundService.ServiceName.PushMessaging);
    backgroundServiceTreeElement.appendChild(this.pushMessagingTreeElement);
    this.reportingApiTreeElement = new ReportingApiTreeElement(panel);
    backgroundServiceTreeElement.appendChild(this.reportingApiTreeElement);

    const resourcesSectionTitle = i18nString(UIStrings.frames);
    const resourcesTreeElement = this.addSidebarSection(resourcesSectionTitle, 'frames');
    this.resourcesSection = new ResourcesSection(panel, resourcesTreeElement);

    this.domStorageTreeElements = new Map();
    this.extensionIdToStorageTreeParentElement = new Map();
    this.extensionStorageTreeElements = new Map();
    this.extensionStorageModels = [];
    this.sharedStorageTreeElements = new Map();
    this.domains = {};

    this.sidebarTree.contentElement.addEventListener('mousemove', this.onmousemove.bind(this), false);
    this.sidebarTree.contentElement.addEventListener('mouseleave', this.onmouseleave.bind(this), false);

    SDK.TargetManager.TargetManager.instance().observeTargets(this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.frameNavigated, this,
        {scoped: true});

    const selection = this.panel.lastSelectedItemPath();
    if (!selection.length) {
      manifestTreeElement.select();
    }

    SDK.TargetManager.TargetManager.instance().observeModels(
        DOMStorageModel, {
          modelAdded: (model: DOMStorageModel) => this.domStorageModelAdded(model),
          modelRemoved: (model: DOMStorageModel) => this.domStorageModelRemoved(model),
        },
        {scoped: true});

    SDK.TargetManager.TargetManager.instance().observeModels(
        ExtensionStorageModel, {
          modelAdded: (model: ExtensionStorageModel) => this.extensionStorageModelAdded(model),
          modelRemoved: (model: ExtensionStorageModel) => this.extensionStorageModelRemoved(model),
        },
        {scoped: true});

    SDK.TargetManager.TargetManager.instance().observeModels(
        IndexedDBModel, {
          modelAdded: (model: IndexedDBModel) => this.indexedDBModelAdded(model),
          modelRemoved: (model: IndexedDBModel) => this.indexedDBModelRemoved(model),
        },
        {scoped: true});
    SDK.TargetManager.TargetManager.instance().observeModels(
        InterestGroupStorageModel, {
          modelAdded: (model: InterestGroupStorageModel) => this.interestGroupModelAdded(model),
          modelRemoved: (model: InterestGroupStorageModel) => this.interestGroupModelRemoved(model),
        },
        {scoped: true});
    SDK.TargetManager.TargetManager.instance().observeModels(
        SharedStorageModel, {
          modelAdded: (model: SharedStorageModel) => this.sharedStorageModelAdded(model).catch(err => {
            console.error(err);
          }),
          modelRemoved: (model: SharedStorageModel) => this.sharedStorageModelRemoved(model),
        },
        {scoped: true});
    SDK.TargetManager.TargetManager.instance().observeModels(
        SDK.StorageBucketsModel.StorageBucketsModel, {
          modelAdded: (model: SDK.StorageBucketsModel.StorageBucketsModel) => this.storageBucketsModelAdded(model),
          modelRemoved: (model: SDK.StorageBucketsModel.StorageBucketsModel) => this.storageBucketsModelRemoved(model),
        },
        {scoped: true});

    this.sharedStorageTreeElementDispatcher =
        new Common.ObjectWrapper.ObjectWrapper<SharedStorageTreeElementDispatcher.EventTypes>();

    // Work-around for crbug.com/1152713: Something is wrong with custom scrollbars and size containment.
    // @ts-ignore
    this.contentElement.style.contain = 'layout style';
  }

  private addSidebarSection(title: string, jslogContext: string): UI.TreeOutline.TreeElement {
    const treeElement = new UI.TreeOutline.TreeElement(title, true, jslogContext);
    treeElement.listItemElement.classList.add('storage-group-list-item');
    treeElement.setCollapsible(false);
    treeElement.selectable = false;
    this.sidebarTree.appendChild(treeElement);
    UI.ARIAUtils.markAsHeading(treeElement.listItemElement, 3);
    UI.ARIAUtils.setLabel(treeElement.childrenListElement, title);
    return treeElement;
  }

  targetAdded(target: SDK.Target.Target): void {
    if (target !== target.outermostTarget()) {
      return;
    }

    this.target = target;

    const interestGroupModel = target.model(InterestGroupStorageModel);
    if (interestGroupModel) {
      interestGroupModel.addEventListener(
          InterestGroupModelEvents.INTEREST_GROUP_ACCESS, this.interestGroupAccess, this);
    }

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      return;
    }

    if (resourceTreeModel.cachedResourcesLoaded()) {
      this.initialize();
    }

    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded, this.initialize, this);
    resourceTreeModel.addEventListener(
        SDK.ResourceTreeModel.Events.WillLoadCachedResources, this.resetWithFrames, this);
  }

  targetRemoved(target: SDK.Target.Target): void {
    if (target !== this.target) {
      return;
    }
    delete this.target;

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel) {
      resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded, this.initialize, this);
      resourceTreeModel.removeEventListener(
          SDK.ResourceTreeModel.Events.WillLoadCachedResources, this.resetWithFrames, this);
    }

    const interestGroupModel = target.model(InterestGroupStorageModel);
    if (interestGroupModel) {
      interestGroupModel.removeEventListener(
          InterestGroupModelEvents.INTEREST_GROUP_ACCESS, this.interestGroupAccess, this);
    }

    this.resetWithFrames();
  }

  override focus(): void {
    this.sidebarTree.focus();
  }

  private initialize(): void {
    for (const frame of SDK.ResourceTreeModel.ResourceTreeModel.frames()) {
      this.addCookieDocument(frame);
    }
    const interestGroupModel = this.target && this.target.model(InterestGroupStorageModel);
    if (interestGroupModel) {
      interestGroupModel.enable();
    }

    this.cacheStorageListTreeElement.initialize();
    const backgroundServiceModel = this.target && this.target.model(BackgroundServiceModel) || null;
    this.backgroundFetchTreeElement && this.backgroundFetchTreeElement.initialize(backgroundServiceModel);
    this.backgroundSyncTreeElement && this.backgroundSyncTreeElement.initialize(backgroundServiceModel);
    this.notificationsTreeElement.initialize(backgroundServiceModel);
    this.paymentHandlerTreeElement.initialize(backgroundServiceModel);
    this.periodicBackgroundSyncTreeElement.initialize(backgroundServiceModel);
    this.pushMessagingTreeElement.initialize(backgroundServiceModel);
    this.storageBucketsTreeElement?.initialize();

    const preloadingModel = this.target?.model(SDK.PreloadingModel.PreloadingModel);
    if (preloadingModel) {
      this.preloadingSummaryTreeElement?.initialize(preloadingModel);
    }
  }

  private domStorageModelAdded(model: DOMStorageModel): void {
    model.enable();
    model.storages().forEach(this.addDOMStorage.bind(this));
    model.addEventListener(DOMStorageModelEvents.DOM_STORAGE_ADDED, this.domStorageAdded, this);
    model.addEventListener(DOMStorageModelEvents.DOM_STORAGE_REMOVED, this.domStorageRemoved, this);
  }

  private domStorageModelRemoved(model: DOMStorageModel): void {
    model.storages().forEach(this.removeDOMStorage.bind(this));
    model.removeEventListener(DOMStorageModelEvents.DOM_STORAGE_ADDED, this.domStorageAdded, this);
    model.removeEventListener(DOMStorageModelEvents.DOM_STORAGE_REMOVED, this.domStorageRemoved, this);
  }

  private extensionStorageModelAdded(model: ExtensionStorageModel): void {
    this.extensionStorageModels.push(model);
    model.enable();
    model.storages().forEach(this.addExtensionStorage.bind(this));
    model.addEventListener(ExtensionStorageModelEvents.EXTENSION_STORAGE_ADDED, this.extensionStorageAdded, this);
    model.addEventListener(ExtensionStorageModelEvents.EXTENSION_STORAGE_REMOVED, this.extensionStorageRemoved, this);
  }

  private extensionStorageModelRemoved(model: ExtensionStorageModel): void {
    console.assert(this.extensionStorageModels.includes(model));
    this.extensionStorageModels.splice(this.extensionStorageModels.indexOf(model), 1);
    model.storages().forEach(this.removeExtensionStorage.bind(this));
    model.removeEventListener(ExtensionStorageModelEvents.EXTENSION_STORAGE_ADDED, this.extensionStorageAdded, this);
    model.removeEventListener(
        ExtensionStorageModelEvents.EXTENSION_STORAGE_REMOVED, this.extensionStorageRemoved, this);
  }

  private indexedDBModelAdded(model: IndexedDBModel): void {
    model.enable();
    this.indexedDBListTreeElement.addIndexedDBForModel(model);
  }

  private indexedDBModelRemoved(model: IndexedDBModel): void {
    this.indexedDBListTreeElement.removeIndexedDBForModel(model);
  }

  private interestGroupModelAdded(model: InterestGroupStorageModel): void {
    model.enable();
    model.addEventListener(InterestGroupModelEvents.INTEREST_GROUP_ACCESS, this.interestGroupAccess, this);
  }

  private interestGroupModelRemoved(model: InterestGroupStorageModel): void {
    model.disable();
    model.removeEventListener(InterestGroupModelEvents.INTEREST_GROUP_ACCESS, this.interestGroupAccess, this);
  }

  private async sharedStorageModelAdded(model: SharedStorageModel): Promise<void> {
    await model.enable();
    for (const storage of model.storages()) {
      await this.addSharedStorage(storage);
    }
    model.addEventListener(SharedStorageModelEvents.SHARED_STORAGE_ADDED, this.sharedStorageAdded, this);
    model.addEventListener(SharedStorageModelEvents.SHARED_STORAGE_REMOVED, this.sharedStorageRemoved, this);
    model.addEventListener(SharedStorageModelEvents.SHARED_STORAGE_ACCESS, this.sharedStorageAccess, this);
  }

  private sharedStorageModelRemoved(model: SharedStorageModel): void {
    model.disable();
    for (const storage of model.storages()) {
      this.removeSharedStorage(storage);
    }
    model.removeEventListener(SharedStorageModelEvents.SHARED_STORAGE_ADDED, this.sharedStorageAdded, this);
    model.removeEventListener(SharedStorageModelEvents.SHARED_STORAGE_REMOVED, this.sharedStorageRemoved, this);
    model.removeEventListener(SharedStorageModelEvents.SHARED_STORAGE_ACCESS, this.sharedStorageAccess, this);
  }

  private storageBucketsModelAdded(model: SDK.StorageBucketsModel.StorageBucketsModel): void {
    model.enable();
  }

  private storageBucketsModelRemoved(model: SDK.StorageBucketsModel.StorageBucketsModel): void {
    this.storageBucketsTreeElement?.removeBucketsForModel(model);
  }

  private resetWithFrames(): void {
    this.resourcesSection.reset();
    this.reset();
  }

  private treeElementAdded(event: Common.EventTarget.EventTargetEvent<UI.TreeOutline.TreeElement>): void {
    // On tree item selection its itemURL and those of its parents are persisted.
    // On reload/navigation we check for matches starting from the root on the
    // path to the current element. Matching nodes are expanded until we hit a
    // mismatch. This way we ensure that the longest matching path starting from
    // the root is expanded, even if we cannot match the whole path.
    const selection = this.panel.lastSelectedItemPath();
    if (!selection.length) {
      return;
    }
    const element = event.data;
    const elementPath = [element as UI.TreeOutline.TreeElement | ApplicationPanelTreeElement];
    for (let parent = element.parent as UI.TreeOutline.TreeElement | ApplicationPanelTreeElement | null;
         parent && 'itemURL' in parent && parent.itemURL; parent = parent.parent) {
      elementPath.push(parent as ApplicationPanelTreeElement);
    }

    let i = selection.length - 1;
    let j = elementPath.length - 1;
    while (i >= 0 && j >= 0 && selection[i] === (elementPath[j] as ApplicationPanelTreeElement).itemURL) {
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

  private reset(): void {
    this.domains = {};
    this.cookieListTreeElement.removeChildren();
    this.interestGroupTreeElement.clearEvents();
  }

  private frameNavigated(event: Common.EventTarget.EventTargetEvent<SDK.ResourceTreeModel.ResourceTreeFrame>): void {
    const frame = event.data;

    if (frame.isOutermostFrame()) {
      this.reset();
    }
    this.addCookieDocument(frame);
  }

  private interestGroupAccess(event: Common.EventTarget.EventTargetEvent<Protocol.Storage.InterestGroupAccessedEvent>):
      void {
    this.interestGroupTreeElement.addEvent(event.data);
  }

  private addCookieDocument(frame: SDK.ResourceTreeModel.ResourceTreeFrame): void {
    // In case the current frame was unreachable, show its cookies
    // instead of the error interstitials because they might help to
    // debug why the frame was unreachable.
    const urlToParse = frame.unreachableUrl() || frame.url;
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(urlToParse);
    if (!parsedURL || (parsedURL.scheme !== 'http' && parsedURL.scheme !== 'https' && parsedURL.scheme !== 'file')) {
      return;
    }

    const domain = parsedURL.securityOrigin();
    if (!this.domains[domain]) {
      this.domains[domain] = true;
      const cookieDomainTreeElement = new CookieTreeElement(this.panel, frame, parsedURL);
      this.cookieListTreeElement.appendChild(cookieDomainTreeElement);
    }
  }

  private domStorageAdded(event: Common.EventTarget.EventTargetEvent<DOMStorage>): void {
    const domStorage = (event.data as DOMStorage);
    this.addDOMStorage(domStorage);
  }

  private addDOMStorage(domStorage: DOMStorage): void {
    console.assert(!this.domStorageTreeElements.get(domStorage));
    console.assert(Boolean(domStorage.storageKey));

    const domStorageTreeElement = new DOMStorageTreeElement(this.panel, domStorage);
    this.domStorageTreeElements.set(domStorage, domStorageTreeElement);
    if (domStorage.isLocalStorage) {
      this.localStorageListTreeElement.appendChild(domStorageTreeElement, comparator);
    } else {
      this.sessionStorageListTreeElement.appendChild(domStorageTreeElement, comparator);
    }

    function comparator(a: UI.TreeOutline.TreeElement, b: UI.TreeOutline.TreeElement): number {
      const aTitle = a.titleAsText().toLocaleLowerCase();
      const bTitle = b.titleAsText().toLocaleUpperCase();
      return aTitle.localeCompare(bTitle);
    }
  }

  private domStorageRemoved(event: Common.EventTarget.EventTargetEvent<DOMStorage>): void {
    const domStorage = (event.data as DOMStorage);
    this.removeDOMStorage(domStorage);
  }

  private removeDOMStorage(domStorage: DOMStorage): void {
    const treeElement = this.domStorageTreeElements.get(domStorage);
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
    this.domStorageTreeElements.delete(domStorage);
  }

  private extensionStorageAdded(event: Common.EventTarget.EventTargetEvent<ExtensionStorage>): void {
    const extensionStorage = event.data;
    this.addExtensionStorage(extensionStorage);
  }

  private useTreeViewForExtensionStorage(extensionStorage: ExtensionStorage): boolean {
    // If the origin the storage is associated with matches the top-level
    // target (e.g, an extension service worker or top-level
    // chrome-extension:// page), there is likely only one extension in the
    // context we are inspecting and we can show the storage as a direct child.
    // In other contexts (where multiple extensions may be injected) use a tree
    // view where storage areas are children of the extension they are
    // associated with.
    return !extensionStorage.matchesTarget(this.target);
  }

  private getExtensionStorageAreaParent(extensionStorage: ExtensionStorage): ApplicationPanelTreeElement|undefined {
    if (!this.useTreeViewForExtensionStorage(extensionStorage)) {
      return this.extensionStorageListTreeElement;
    }

    const existingParent = this.extensionIdToStorageTreeParentElement.get(extensionStorage.extensionId);
    if (existingParent) {
      return existingParent;
    }

    const parent =
        new ExtensionStorageTreeParentElement(this.panel, extensionStorage.extensionId, extensionStorage.name);
    this.extensionIdToStorageTreeParentElement.set(extensionStorage.extensionId, parent);
    this.extensionStorageListTreeElement?.appendChild(parent);
    return parent;
  }

  private addExtensionStorage(extensionStorage: ExtensionStorage): void {
    if (this.extensionStorageModels.find(
            m => m !== extensionStorage.model &&
                m.storageForIdAndArea(extensionStorage.extensionId, extensionStorage.storageArea))) {
      // There's at least one model that already has this storage area, so no need
      // to do anything.
      return;
    }

    console.assert(Boolean(this.extensionStorageListTreeElement));
    console.assert(!this.extensionStorageTreeElements.get(extensionStorage.key));

    const extensionStorageTreeElement = new ExtensionStorageTreeElement(this.panel, extensionStorage);
    this.extensionStorageTreeElements.set(extensionStorage.key, extensionStorageTreeElement);
    this.getExtensionStorageAreaParent(extensionStorage)?.appendChild(extensionStorageTreeElement, comparator);

    function comparator(a: UI.TreeOutline.TreeElement, b: UI.TreeOutline.TreeElement): number {
      const getStorageArea = (e: UI.TreeOutline.TreeElement): Protocol.Extensions.StorageArea =>
          (e as ExtensionStorageTreeElement).storageArea;
      const order = [
        Protocol.Extensions.StorageArea.Session,
        Protocol.Extensions.StorageArea.Local,
        Protocol.Extensions.StorageArea.Sync,
        Protocol.Extensions.StorageArea.Managed,
      ];
      return order.indexOf(getStorageArea(a)) - order.indexOf(getStorageArea(b));
    }
  }

  private extensionStorageRemoved(event: Common.EventTarget.EventTargetEvent<ExtensionStorage>): void {
    const extensionStorage = event.data;
    this.removeExtensionStorage(extensionStorage);
  }

  private removeExtensionStorage(extensionStorage: ExtensionStorage): void {
    if (this.extensionStorageModels.find(
            (m => m.storageForIdAndArea(extensionStorage.extensionId, extensionStorage.storageArea)))) {
      // There's at least one model that still has this storage area, so no need
      // to do anything.
      return;
    }

    const treeElement = this.extensionStorageTreeElements.get(extensionStorage.key);
    if (!treeElement) {
      return;
    }
    const wasSelected = treeElement.selected;
    const parentListTreeElement = treeElement.parent;
    if (parentListTreeElement) {
      parentListTreeElement.removeChild(treeElement);
      if (this.useTreeViewForExtensionStorage(extensionStorage) && parentListTreeElement.childCount() === 0) {
        this.extensionStorageListTreeElement?.removeChild(parentListTreeElement);
        this.extensionIdToStorageTreeParentElement.delete(extensionStorage.extensionId);
      } else {
        if (wasSelected) {
          parentListTreeElement.select();
        }
      }
    }
    this.extensionStorageTreeElements.delete(extensionStorage.key);
  }

  private async sharedStorageAdded(event: Common.EventTarget.EventTargetEvent<SharedStorageForOrigin>): Promise<void> {
    await this.addSharedStorage(event.data);
  }

  private async addSharedStorage(sharedStorage: SharedStorageForOrigin): Promise<void> {
    const sharedStorageTreeElement = await SharedStorageTreeElement.createElement(this.panel, sharedStorage);

    // A tree element for `sharedStorage.securityOrigin` may have been added while we were waiting for `sharedStorageTreeElement` to be created.
    if (this.sharedStorageTreeElements.has(sharedStorage.securityOrigin)) {
      return;
    }
    this.sharedStorageTreeElements.set(sharedStorage.securityOrigin, sharedStorageTreeElement);
    this.sharedStorageListTreeElement.appendChild(sharedStorageTreeElement);
    this.sharedStorageTreeElementDispatcher.dispatchEventToListeners(
        SharedStorageTreeElementDispatcher.Events.SHARED_STORAGE_TREE_ELEMENT_ADDED,
        {origin: sharedStorage.securityOrigin});
  }

  private sharedStorageRemoved(event: Common.EventTarget.EventTargetEvent<SharedStorageForOrigin>): void {
    this.removeSharedStorage(event.data);
  }

  private removeSharedStorage(sharedStorage: SharedStorageForOrigin): void {
    const treeElement = this.sharedStorageTreeElements.get(sharedStorage.securityOrigin);
    if (!treeElement) {
      return;
    }
    const wasSelected = treeElement.selected;
    const parentListTreeElement = treeElement.parent;
    if (parentListTreeElement) {
      parentListTreeElement.removeChild(treeElement);
      parentListTreeElement.setExpandable(parentListTreeElement.childCount() > 0);
      if (wasSelected) {
        parentListTreeElement.select();
      }
    }
    this.sharedStorageTreeElements.delete(sharedStorage.securityOrigin);
  }

  private sharedStorageAccess(event: Common.EventTarget.EventTargetEvent<Protocol.Storage.SharedStorageAccessedEvent>):
      void {
    this.sharedStorageListTreeElement.addEvent(event.data);
  }

  async showResource(resource: SDK.Resource.Resource, line?: number, column?: number): Promise<void> {
    await this.resourcesSection.revealResource(resource, line, column);
  }

  showFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame): void {
    this.resourcesSection.revealAndSelectFrame(frame);
  }

  showFileSystem(view: UI.Widget.Widget): void {
    this.innerShowView(view);
  }

  private innerShowView(view: UI.Widget.Widget): void {
    this.panel.showView(view);
  }

  showPreloadingRuleSetView(revealInfo: PreloadingHelper.PreloadingForward.RuleSetView): void {
    if (this.preloadingSummaryTreeElement) {
      this.preloadingSummaryTreeElement.expandAndRevealRuleSet(revealInfo);
    }
  }

  showPreloadingAttemptViewWithFilter(filter: PreloadingHelper.PreloadingForward.AttemptViewWithFilter): void {
    if (this.preloadingSummaryTreeElement) {
      this.preloadingSummaryTreeElement.expandAndRevealAttempts(filter);
    }
  }

  private onmousemove(event: MouseEvent): void {
    const nodeUnderMouse = (event.target as Node);
    if (!nodeUnderMouse) {
      return;
    }

    const listNode = UI.UIUtils.enclosingNodeOrSelfWithNodeName(nodeUnderMouse, 'li');
    if (!listNode) {
      return;
    }

    const element = UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(listNode);
    if (this.previousHoveredElement === element) {
      return;
    }

    if (this.previousHoveredElement) {
      this.previousHoveredElement.hovered = false;
      delete this.previousHoveredElement;
    }

    if (element instanceof FrameTreeElement) {
      this.previousHoveredElement = element;
      element.hovered = true;
    }
  }

  private onmouseleave(_event: MouseEvent): void {
    if (this.previousHoveredElement) {
      this.previousHoveredElement.hovered = false;
      delete this.previousHoveredElement;
    }
  }
  override wasShown(): void {
    super.wasShown();
    this.sidebarTree.registerCSSFiles([resourcesSidebarStyles]);
  }
}

export class BackgroundServiceTreeElement extends ApplicationPanelTreeElement {
  private serviceName: Protocol.BackgroundService.ServiceName;
  private view: BackgroundServiceView|null;
  private model: BackgroundServiceModel|null;
  private selectedInternal: boolean;

  constructor(storagePanel: ResourcesPanel, serviceName: Protocol.BackgroundService.ServiceName) {
    super(
        storagePanel, BackgroundServiceView.getUIString(serviceName), false,
        Platform.StringUtilities.toKebabCase(serviceName));

    this.serviceName = serviceName;

    /* Whether the element has been selected. */
    this.selectedInternal = false;

    this.view = null;

    this.model = null;

    const backgroundServiceIcon = IconButton.Icon.create(this.getIconType());
    this.setLeadingIcons([backgroundServiceIcon]);
  }

  private getIconType(): string {
    switch (this.serviceName) {
      case Protocol.BackgroundService.ServiceName.BackgroundFetch:
        return 'arrow-up-down';
      case Protocol.BackgroundService.ServiceName.BackgroundSync:
        return 'sync';
      case Protocol.BackgroundService.ServiceName.PushMessaging:
        return 'cloud';
      case Protocol.BackgroundService.ServiceName.Notifications:
        return 'bell';
      case Protocol.BackgroundService.ServiceName.PaymentHandler:
        return 'credit-card';
      case Protocol.BackgroundService.ServiceName.PeriodicBackgroundSync:
        return 'watch';
      default:
        console.error(`Service ${this.serviceName} does not have a dedicated icon`);
        return 'table';
    }
  }

  initialize(model: BackgroundServiceModel|null): void {
    this.model = model;
    // Show the view if the model was initialized after selection.
    if (this.selectedInternal && !this.view) {
      this.onselect(false);
    }
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return `background-service://${this.serviceName}` as Platform.DevToolsPath.UrlString;
  }

  override get selectable(): boolean {
    if (!this.model) {
      return false;
    }
    return super.selectable;
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    this.selectedInternal = true;

    if (!this.model) {
      return false;
    }

    if (!this.view) {
      this.view = new BackgroundServiceView(this.serviceName, this.model);
    }
    this.showView(this.view);
    UI.Context.Context.instance().setFlavor(BackgroundServiceView, this.view);
    Host.userMetrics.panelShown('background_service_' + this.serviceName);
    return false;
  }
}

export class ServiceWorkersTreeElement extends ApplicationPanelTreeElement {
  private view?: ServiceWorkersView;

  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, i18n.i18n.lockedString('Service workers'), false, 'service-workers');
    const icon = IconButton.Icon.create('gears');
    this.setLeadingIcons([icon]);
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'service-workers://' as Platform.DevToolsPath.UrlString;
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new ServiceWorkersView();
    }
    this.showView(this.view);
    Host.userMetrics.panelShown('service-workers');
    return false;
  }
}

export class AppManifestTreeElement extends ApplicationPanelTreeElement {
  private view: AppManifestView;
  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, i18nString(UIStrings.manifest), true, 'manifest');
    const icon = IconButton.Icon.create('document');
    this.setLeadingIcons([icon]);
    self.onInvokeElement(this.listItemElement, this.onInvoke.bind(this));
    const emptyView = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noManifestDetected));
    // TODO(crbug.com/1156978): Replace UI.ReportView.ReportView with ReportView.ts web component.
    const reportView = new UI.ReportView.ReportView(i18nString(UIStrings.appManifest));
    this.view = new AppManifestView(emptyView, reportView, new Common.Throttler.Throttler(1000));
    UI.ARIAUtils.setLabel(this.listItemElement, i18nString(UIStrings.onInvokeManifestAlert));
    const handleExpansion = (hasManifest: boolean): void => {
      this.setExpandable(hasManifest);
    };
    this.view.addEventListener(AppManifestViewEvents.MANIFEST_DETECTED, event => handleExpansion(event.data));
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'manifest://' as Platform.DevToolsPath.UrlString;
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    this.showView(this.view);
    Host.userMetrics.panelShown('app-manifest');
    return false;
  }

  generateChildren(): void {
    const staticSections = this.view.getStaticSections();
    for (const section of staticSections) {
      const sectionElement = section.getTitleElement();
      const childTitle = section.title();
      const sectionFieldElement = section.getFieldElement();
      const child = new ManifestChildTreeElement(
          this.resourcesPanel, sectionElement, childTitle, sectionFieldElement, section.jslogContext || '');
      this.appendChild(child);
    }
  }

  onInvoke(): void {
    this.view.getManifestElement().scrollIntoView();
    UI.ARIAUtils.alert(i18nString(UIStrings.onInvokeAlert, {PH1: this.listItemElement.title}));
  }

  showManifestView(): void {
    this.showView(this.view);
  }
}

export class ManifestChildTreeElement extends ApplicationPanelTreeElement {
  #sectionElement: Element;
  #sectionFieldElement: HTMLElement;
  constructor(
      storagePanel: ResourcesPanel, element: Element, childTitle: string, fieldElement: HTMLElement,
      jslogContext: string) {
    super(storagePanel, childTitle, false, jslogContext);
    const icon = IconButton.Icon.create('document');
    this.setLeadingIcons([icon]);
    this.#sectionElement = element;
    this.#sectionFieldElement = fieldElement;
    self.onInvokeElement(this.listItemElement, this.onInvoke.bind(this));
    this.listItemElement.addEventListener('keydown', this.onInvokeElementKeydown.bind(this));
    UI.ARIAUtils.setLabel(
        this.listItemElement, i18nString(UIStrings.beforeInvokeAlert, {PH1: this.listItemElement.title}));
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'manifest://' + this.title as Platform.DevToolsPath.UrlString;
  }

  onInvoke(): void {
    (this.parent as AppManifestTreeElement)?.showManifestView();
    this.#sectionElement.scrollIntoView();
    UI.ARIAUtils.alert(i18nString(UIStrings.onInvokeAlert, {PH1: this.listItemElement.title}));
    Host.userMetrics.manifestSectionSelected(this.listItemElement.title);
  }
  // direct focus to the corresponding element
  onInvokeElementKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || event.shiftKey) {
      return;
    }
    const checkBoxElement = this.#sectionFieldElement.querySelector('.mask-checkbox');
    let focusableElement: HTMLElement|null = this.#sectionFieldElement.querySelector('[tabindex="0"]');
    if (checkBoxElement && checkBoxElement.shadowRoot) {
      focusableElement = checkBoxElement.shadowRoot.querySelector('input') || null;
    } else if (!focusableElement) {
      // special case for protocol handler section since it is a custom Element and has different structure than the others
      focusableElement = this.#sectionFieldElement.querySelector('devtools-protocol-handlers-view')
                             ?.shadowRoot?.querySelector('[tabindex="0"]') ||
          null;
    }
    if (focusableElement) {
      focusableElement?.focus();
      event.consume(true);
    }
  }
}

export class ClearStorageTreeElement extends ApplicationPanelTreeElement {
  private view?: StorageView;
  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, i18nString(UIStrings.storage), false, 'storage');
    const icon = IconButton.Icon.create('database');
    this.setLeadingIcons([icon]);
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'clear-storage://' as Platform.DevToolsPath.UrlString;
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new StorageView();
    }
    this.showView(this.view);
    Host.userMetrics.panelShown(Host.UserMetrics.PanelCodes[Host.UserMetrics.PanelCodes.storage]);
    return false;
  }
}

export class IndexedDBTreeElement extends ExpandableApplicationPanelTreeElement {
  private idbDatabaseTreeElements: IDBDatabaseTreeElement[];
  private storageBucket?: Protocol.Storage.StorageBucket;
  constructor(storagePanel: ResourcesPanel, storageBucket?: Protocol.Storage.StorageBucket) {
    super(storagePanel, i18nString(UIStrings.indexeddb), 'indexed-db');
    const icon = IconButton.Icon.create('database');
    this.setLeadingIcons([icon]);
    this.idbDatabaseTreeElements = [];
    this.storageBucket = storageBucket;
    this.initialize();
  }

  private initialize(): void {
    SDK.TargetManager.TargetManager.instance().addModelListener(
        IndexedDBModel, IndexedDBModelEvents.DatabaseAdded, this.indexedDBAdded, this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        IndexedDBModel, IndexedDBModelEvents.DatabaseRemoved, this.indexedDBRemoved, this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        IndexedDBModel, IndexedDBModelEvents.DatabaseLoaded, this.indexedDBLoaded, this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        IndexedDBModel, IndexedDBModelEvents.IndexedDBContentUpdated, this.indexedDBContentUpdated, this,
        {scoped: true});
    // TODO(szuend): Replace with a Set once two web tests no longer directly access this private
    //               variable (indexeddb/live-update-indexeddb-content.js, indexeddb/delete-entry.js).
    this.idbDatabaseTreeElements = [];

    for (const indexedDBModel of SDK.TargetManager.TargetManager.instance().models(IndexedDBModel, {scoped: true})) {
      const databases = indexedDBModel.databases();
      for (let j = 0; j < databases.length; ++j) {
        this.addIndexedDB(indexedDBModel, databases[j]);
      }
    }
  }

  addIndexedDBForModel(model: IndexedDBModel): void {
    for (const databaseId of model.databases()) {
      this.addIndexedDB(model, databaseId);
    }
  }

  removeIndexedDBForModel(model: IndexedDBModel): void {
    const idbDatabaseTreeElements = this.idbDatabaseTreeElements.filter(element => element.model === model);
    for (const idbDatabaseTreeElement of idbDatabaseTreeElements) {
      this.removeIDBDatabaseTreeElement(idbDatabaseTreeElement);
    }
  }

  override onattach(): void {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);
  }

  private handleContextMenuEvent(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.refreshIndexeddb), this.refreshIndexedDB.bind(this), {jslogContext: 'refresh-indexeddb'});
    void contextMenu.show();
  }

  refreshIndexedDB(): void {
    for (const indexedDBModel of SDK.TargetManager.TargetManager.instance().models(IndexedDBModel, {scoped: true})) {
      void indexedDBModel.refreshDatabaseNames();
    }
  }

  private databaseInTree(databaseId: DatabaseId): boolean {
    if (this.storageBucket) {
      return databaseId.inBucket(this.storageBucket);
    }
    return true;
  }

  private indexedDBAdded({
    data: {databaseId, model},
  }: Common.EventTarget.EventTargetEvent<{databaseId: DatabaseId, model: IndexedDBModel}>): void {
    this.addIndexedDB(model, databaseId);
  }

  private addIndexedDB(model: IndexedDBModel, databaseId: DatabaseId): void {
    if (!this.databaseInTree(databaseId)) {
      return;
    }
    const idbDatabaseTreeElement = new IDBDatabaseTreeElement(this.resourcesPanel, model, databaseId);
    this.idbDatabaseTreeElements.push(idbDatabaseTreeElement);
    this.appendChild(idbDatabaseTreeElement);
    model.refreshDatabase(databaseId);
  }

  private indexedDBRemoved({
    data: {databaseId, model},
  }: Common.EventTarget.EventTargetEvent<{databaseId: DatabaseId, model: IndexedDBModel}>): void {
    const idbDatabaseTreeElement = this.idbDatabaseTreeElement(model, databaseId);
    if (!idbDatabaseTreeElement) {
      return;
    }
    this.removeIDBDatabaseTreeElement(idbDatabaseTreeElement);
  }

  private removeIDBDatabaseTreeElement(idbDatabaseTreeElement: IDBDatabaseTreeElement): void {
    idbDatabaseTreeElement.clear();
    this.removeChild(idbDatabaseTreeElement);
    Platform.ArrayUtilities.removeElement(this.idbDatabaseTreeElements, idbDatabaseTreeElement);
    this.setExpandable(this.childCount() > 0);
  }

  private indexedDBLoaded(
      {data: {database, model, entriesUpdated}}: Common.EventTarget
          .EventTargetEvent<{database: IndexedDBModelDatabase, model: IndexedDBModel, entriesUpdated: boolean}>): void {
    const idbDatabaseTreeElement = this.idbDatabaseTreeElement(model, database.databaseId);
    if (!idbDatabaseTreeElement) {
      return;
    }
    idbDatabaseTreeElement.update(database, entriesUpdated);
    this.indexedDBLoadedForTest();
  }

  private indexedDBLoadedForTest(): void {
    // For sniffing in tests.
  }

  private indexedDBContentUpdated({
    data: {databaseId, objectStoreName, model},
  }: Common.EventTarget.EventTargetEvent<{databaseId: DatabaseId, objectStoreName: string, model: IndexedDBModel}>):
      void {
    const idbDatabaseTreeElement = this.idbDatabaseTreeElement(model, databaseId);
    if (!idbDatabaseTreeElement) {
      return;
    }
    idbDatabaseTreeElement.indexedDBContentUpdated(objectStoreName);
  }

  private idbDatabaseTreeElement(model: IndexedDBModel, databaseId: DatabaseId): IDBDatabaseTreeElement|null {
    return this.idbDatabaseTreeElements.find(x => x.databaseId.equals(databaseId) && x.model === model) || null;
  }
}

export class IDBDatabaseTreeElement extends ApplicationPanelTreeElement {
  model: IndexedDBModel;
  databaseId: DatabaseId;
  private readonly idbObjectStoreTreeElements: Map<string, IDBObjectStoreTreeElement>;
  private database?: IndexedDBModelDatabase;
  private view?: LegacyWrapper.LegacyWrapper.LegacyWrapper<UI.Widget.VBox, IDBDatabaseView>;

  constructor(storagePanel: ResourcesPanel, model: IndexedDBModel, databaseId: DatabaseId) {
    super(storagePanel, databaseId.name, false, 'indexed-db-database');
    this.model = model;
    this.databaseId = databaseId;
    this.idbObjectStoreTreeElements = new Map();
    const icon = IconButton.Icon.create('database');
    this.setLeadingIcons([icon]);
    this.model.addEventListener(IndexedDBModelEvents.DatabaseNamesRefreshed, this.refreshIndexedDB, this);
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'indexedDB://' + this.databaseId.storageBucket.storageKey + '/' +
        (this.databaseId.storageBucket.name ?? '') + '/' + this.databaseId.name as Platform.DevToolsPath.UrlString;
  }

  override onattach(): void {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);
  }

  private handleContextMenuEvent(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.refreshIndexeddb), this.refreshIndexedDB.bind(this), {jslogContext: 'refresh-indexeddb'});
    void contextMenu.show();
  }

  private refreshIndexedDB(): void {
    this.model.refreshDatabase(this.databaseId);
  }

  indexedDBContentUpdated(objectStoreName: string): void {
    const treeElement = this.idbObjectStoreTreeElements.get(objectStoreName);
    if (treeElement) {
      treeElement.markNeedsRefresh();
    }
  }

  update(database: IndexedDBModelDatabase, entriesUpdated: boolean): void {
    this.database = database;
    const objectStoreNames = new Set<string>();
    for (const objectStoreName of [...this.database.objectStores.keys()].sort()) {
      const objectStore = this.database.objectStores.get(objectStoreName);
      if (!objectStore) {
        continue;
      }
      objectStoreNames.add(objectStore.name);
      let treeElement = this.idbObjectStoreTreeElements.get(objectStore.name);
      if (!treeElement) {
        treeElement = new IDBObjectStoreTreeElement(this.resourcesPanel, this.model, this.databaseId, objectStore);
        this.idbObjectStoreTreeElements.set(objectStore.name, treeElement);
        this.appendChild(treeElement);
      }
      treeElement.update(objectStore, entriesUpdated);
    }
    for (const objectStoreName of this.idbObjectStoreTreeElements.keys()) {
      if (!objectStoreNames.has(objectStoreName)) {
        this.objectStoreRemoved(objectStoreName);
      }
    }

    if (this.view) {
      this.view.getComponent().update(database);
    }

    this.updateTooltip();
  }

  private updateTooltip(): void {
    const version = this.database ? this.database.version : '-';
    if (Object.keys(this.idbObjectStoreTreeElements).length === 0) {
      this.tooltip = i18nString(UIStrings.versionSEmpty, {PH1: version});
    } else {
      this.tooltip = i18nString(UIStrings.versionS, {PH1: version});
    }
  }

  override get selectable(): boolean {
    if (!this.database) {
      return false;
    }
    return super.selectable;
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this.database) {
      return false;
    }
    if (!this.view) {
      this.view = LegacyWrapper.LegacyWrapper.legacyWrapper(
          UI.Widget.VBox, new IDBDatabaseView(this.model, this.database), 'indexeddb-data');
    }

    this.showView(this.view);
    Host.userMetrics.panelShown('indexed-db');
    return false;
  }

  private objectStoreRemoved(objectStoreName: string): void {
    const objectStoreTreeElement = this.idbObjectStoreTreeElements.get(objectStoreName);
    if (objectStoreTreeElement) {
      objectStoreTreeElement.clear();
      this.removeChild(objectStoreTreeElement);
    }
    this.idbObjectStoreTreeElements.delete(objectStoreName);
    this.updateTooltip();
  }

  clear(): void {
    for (const objectStoreName of this.idbObjectStoreTreeElements.keys()) {
      this.objectStoreRemoved(objectStoreName);
    }
  }
}

export class IDBObjectStoreTreeElement extends ApplicationPanelTreeElement {
  private model: IndexedDBModel;
  private databaseId: DatabaseId;
  private readonly idbIndexTreeElements: Map<string, IDBIndexTreeElement>;
  private objectStore: ObjectStore;
  private view: IDBDataView|null;

  constructor(storagePanel: ResourcesPanel, model: IndexedDBModel, databaseId: DatabaseId, objectStore: ObjectStore) {
    super(storagePanel, objectStore.name, false, 'indexed-db-object-store');
    this.model = model;
    this.databaseId = databaseId;
    this.idbIndexTreeElements = new Map();
    this.objectStore = objectStore;
    this.view = null;
    const icon = IconButton.Icon.create('table');
    this.setLeadingIcons([icon]);
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'indexedDB://' + this.databaseId.storageBucket.storageKey + '/' +
        (this.databaseId.storageBucket.name ?? '') + '/' + this.databaseId.name + '/' +
        this.objectStore.name as Platform.DevToolsPath.UrlString;
  }

  override onattach(): void {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);
  }

  markNeedsRefresh(): void {
    if (this.view) {
      this.view.markNeedsRefresh();
    }
    for (const treeElement of this.idbIndexTreeElements.values()) {
      treeElement.markNeedsRefresh();
    }
  }

  private handleContextMenuEvent(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.clear), this.clearObjectStore.bind(this), {jslogContext: 'clear'});
    void contextMenu.show();
  }

  private refreshObjectStore(): void {
    if (this.view) {
      this.view.refreshData();
    }
    for (const treeElement of this.idbIndexTreeElements.values()) {
      treeElement.refreshIndex();
    }
  }

  private async clearObjectStore(): Promise<void> {
    await this.model.clearObjectStore(this.databaseId, this.objectStore.name);
    this.update(this.objectStore, true);
  }

  update(objectStore: ObjectStore, entriesUpdated: boolean): void {
    this.objectStore = objectStore;

    const indexNames = new Set<string>();
    for (const index of this.objectStore.indexes.values()) {
      indexNames.add(index.name);
      let treeElement = this.idbIndexTreeElements.get(index.name);
      if (!treeElement) {
        treeElement = new IDBIndexTreeElement(
            this.resourcesPanel, this.model, this.databaseId, this.objectStore, index,
            this.refreshObjectStore.bind(this));
        this.idbIndexTreeElements.set(index.name, treeElement);
        this.appendChild(treeElement);
      }
      treeElement.update(this.objectStore, index, entriesUpdated);
    }
    for (const indexName of this.idbIndexTreeElements.keys()) {
      if (!indexNames.has(indexName)) {
        this.indexRemoved(indexName);
      }
    }
    for (const [indexName, treeElement] of this.idbIndexTreeElements.entries()) {
      if (!indexNames.has(indexName)) {
        this.removeChild((treeElement as IDBIndexTreeElement));
        this.idbIndexTreeElements.delete((indexName as string));
      }
    }

    if (this.childCount()) {
      this.expand();
    }

    if (this.view && entriesUpdated) {
      this.view.update(this.objectStore, null);
    }

    this.updateTooltip();
  }

  private updateTooltip(): void {
    const keyPathString = this.objectStore.keyPathString;
    let tooltipString = keyPathString !== null ? i18nString(UIStrings.keyPathS, {PH1: keyPathString}) : '';
    if (this.objectStore.autoIncrement) {
      tooltipString += '\n' + i18n.i18n.lockedString('autoIncrement');
    }
    this.tooltip = tooltipString;
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view =
          new IDBDataView(this.model, this.databaseId, this.objectStore, null, this.refreshObjectStore.bind(this));
    }

    this.showView(this.view);
    Host.userMetrics.panelShown('indexed-db');
    return false;
  }

  private indexRemoved(indexName: string): void {
    const indexTreeElement = this.idbIndexTreeElements.get(indexName);
    if (indexTreeElement) {
      indexTreeElement.clear();
      this.removeChild(indexTreeElement);
    }
    this.idbIndexTreeElements.delete(indexName);
  }

  clear(): void {
    for (const indexName of this.idbIndexTreeElements.keys()) {
      this.indexRemoved(indexName);
    }
    if (this.view) {
      this.view.clear();
    }
  }
}

export class IDBIndexTreeElement extends ApplicationPanelTreeElement {
  private model: IndexedDBModel;
  private databaseId: DatabaseId;
  private objectStore: ObjectStore;
  private index: Index;
  private refreshObjectStore: () => void;
  private view?: IDBDataView;

  constructor(
      storagePanel: ResourcesPanel, model: IndexedDBModel, databaseId: DatabaseId, objectStore: ObjectStore,
      index: Index, refreshObjectStore: () => void) {
    super(storagePanel, index.name, false, 'indexed-db');
    this.model = model;
    this.databaseId = databaseId;
    this.objectStore = objectStore;
    this.index = index;
    this.refreshObjectStore = refreshObjectStore;
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'indexedDB://' + this.databaseId.storageBucket.storageKey + '/' +
        (this.databaseId.storageBucket.name ?? '') + '/' + this.databaseId.name + '/' + this.objectStore.name + '/' +
        this.index.name as Platform.DevToolsPath.UrlString;
  }

  markNeedsRefresh(): void {
    if (this.view) {
      this.view.markNeedsRefresh();
    }
  }

  refreshIndex(): void {
    if (this.view) {
      this.view.refreshData();
    }
  }

  update(objectStore: ObjectStore, index: Index, entriesUpdated: boolean): void {
    this.objectStore = objectStore;
    this.index = index;

    if (this.view && entriesUpdated) {
      this.view.update(this.objectStore, this.index);
    }

    this.updateTooltip();
  }

  private updateTooltip(): void {
    const tooltipLines = [];
    const keyPathString = this.index.keyPathString;
    tooltipLines.push(i18nString(UIStrings.keyPathS, {PH1: keyPathString}));
    if (this.index.unique) {
      tooltipLines.push(i18n.i18n.lockedString('unique'));
    }
    if (this.index.multiEntry) {
      tooltipLines.push(i18n.i18n.lockedString('multiEntry'));
    }
    this.tooltip = tooltipLines.join('\n');
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new IDBDataView(this.model, this.databaseId, this.objectStore, this.index, this.refreshObjectStore);
    }

    this.showView(this.view);
    Host.userMetrics.panelShown('indexed-db');
    return false;
  }

  clear(): void {
    if (this.view) {
      this.view.clear();
    }
  }
}

export class DOMStorageTreeElement extends ApplicationPanelTreeElement {
  private readonly domStorage: DOMStorage;
  constructor(storagePanel: ResourcesPanel, domStorage: DOMStorage) {
    super(
        storagePanel,
        domStorage.storageKey ? SDK.StorageKeyManager.parseStorageKey(domStorage.storageKey).origin :
                                i18nString(UIStrings.localFiles),
        false, domStorage.isLocalStorage ? 'local-storage-for-domain' : 'session-storage-for-domain');
    this.domStorage = domStorage;
    const icon = IconButton.Icon.create('table');
    this.setLeadingIcons([icon]);
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'storage://' + this.domStorage.storageKey + '/' + (this.domStorage.isLocalStorage ? 'local' : 'session') as
        Platform.DevToolsPath.UrlString;
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    Host.userMetrics.panelShown('dom-storage');
    this.resourcesPanel.showDOMStorage(this.domStorage);
    return false;
  }

  override onattach(): void {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);
  }

  private handleContextMenuEvent(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.clear), () => this.domStorage.clear(), {jslogContext: 'clear'});
    void contextMenu.show();
  }
}

export class ExtensionStorageTreeElement extends ApplicationPanelTreeElement {
  private readonly extensionStorage: ExtensionStorage;
  constructor(storagePanel: ResourcesPanel, extensionStorage: ExtensionStorage) {
    super(
        storagePanel, nameForExtensionStorageArea(extensionStorage.storageArea), false, 'extension-storage-for-domain');
    this.extensionStorage = extensionStorage;
    const icon = IconButton.Icon.create('table');
    this.setLeadingIcons([icon]);
  }

  get storageArea(): Protocol.Extensions.StorageArea {
    return this.extensionStorage.storageArea;
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'extension-storage://' + this.extensionStorage.extensionId + '/' + this.extensionStorage.storageArea as
        Platform.DevToolsPath.UrlString;
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    this.resourcesPanel.showExtensionStorage(this.extensionStorage);
    Host.userMetrics.panelShown('extension-storage');
    return false;
  }

  override onattach(): void {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);
  }

  private handleContextMenuEvent(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.clear), () => this.extensionStorage.clear(), {jslogContext: 'clear'});
    void contextMenu.show();
  }
}

export class ExtensionStorageTreeParentElement extends ApplicationPanelTreeElement {
  private readonly extensionId: string;
  constructor(storagePanel: ResourcesPanel, extensionId: string, extensionName: string) {
    super(storagePanel, extensionName || extensionId, true, 'extension-storage-for-domain');
    this.extensionId = extensionId;
    const icon = IconButton.Icon.create('table');
    this.setLeadingIcons([icon]);
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'extension-storage://' + this.extensionId as Platform.DevToolsPath.UrlString;
  }
}

export class CookieTreeElement extends ApplicationPanelTreeElement {
  private readonly target: SDK.Target.Target;
  private readonly cookieDomainInternal: string;

  constructor(
      storagePanel: ResourcesPanel, frame: SDK.ResourceTreeModel.ResourceTreeFrame,
      cookieUrl: Common.ParsedURL.ParsedURL) {
    super(storagePanel, cookieUrl.securityOrigin() || i18nString(UIStrings.localFiles), false, 'cookies-for-frame');
    this.target = frame.resourceTreeModel().target();
    this.cookieDomainInternal = cookieUrl.securityOrigin();
    this.tooltip = i18nString(UIStrings.cookiesUsedByFramesFromS, {PH1: this.cookieDomainInternal});
    const icon = IconButton.Icon.create('cookie');
    // Note that we cannot use `cookieDomainInternal` here since it contains scheme.
    if (IssuesManager.RelatedIssue.hasThirdPartyPhaseoutCookieIssueForDomain(cookieUrl.domain())) {
      icon.name = 'warning-filled';
      icon.classList.add('warn-icon');
      this.tooltip = i18nString(UIStrings.thirdPartyPhaseout, {PH1: this.cookieDomainInternal});
    }
    this.setLeadingIcons([icon]);
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'cookies://' + this.cookieDomainInternal as Platform.DevToolsPath.UrlString;
  }

  cookieDomain(): string {
    return this.cookieDomainInternal;
  }

  override onattach(): void {
    super.onattach();
    this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);
  }

  private handleContextMenuEvent(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.clear), () => this.resourcesPanel.clearCookies(this.target, this.cookieDomainInternal),
        {jslogContext: 'clear'});
    void contextMenu.show();
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    this.resourcesPanel.showCookies(this.target, this.cookieDomainInternal);
    Host.userMetrics.panelShown(Host.UserMetrics.PanelCodes[Host.UserMetrics.PanelCodes.cookies]);
    return false;
  }
}

export class StorageCategoryView extends UI.Widget.VBox {
  private emptyWidget: UI.EmptyWidget.EmptyWidget;
  private linkElement: HTMLElement|null;

  constructor() {
    super();

    this.element.classList.add('storage-view');
    this.emptyWidget = new UI.EmptyWidget.EmptyWidget('');
    this.linkElement = null;
    this.emptyWidget.show(this.element);
  }

  setText(text: string): void {
    this.emptyWidget.text = text;
  }

  setLink(link: Platform.DevToolsPath.UrlString|null): void {
    if (link && !this.linkElement) {
      this.linkElement = this.emptyWidget.appendLink(link);
    }
    if (!link && this.linkElement) {
      this.linkElement.classList.add('hidden');
    }
    if (link && this.linkElement) {
      this.linkElement.setAttribute('href', link);
      this.linkElement.setAttribute('title', link);
      this.linkElement.classList.remove('hidden');
    }
  }
}

export class ResourcesSection implements SDK.TargetManager.Observer {
  panel: ResourcesPanel;
  private readonly treeElement: UI.TreeOutline.TreeElement;
  private treeElementForFrameId: Map<string, FrameTreeElement>;
  private treeElementForTargetId: Map<string, FrameTreeElement>;

  constructor(storagePanel: ResourcesPanel, treeElement: UI.TreeOutline.TreeElement) {
    this.panel = storagePanel;
    this.treeElement = treeElement;
    UI.ARIAUtils.setLabel(this.treeElement.listItemNode, 'Resources Section');
    this.treeElementForFrameId = new Map();
    this.treeElementForTargetId = new Map();

    const frameManager = SDK.FrameManager.FrameManager.instance();
    frameManager.addEventListener(
        SDK.FrameManager.Events.FRAME_ADDED_TO_TARGET, event => this.frameAdded(event.data.frame), this);
    frameManager.addEventListener(
        SDK.FrameManager.Events.FRAME_REMOVED, event => this.frameDetached(event.data.frameId), this);
    frameManager.addEventListener(
        SDK.FrameManager.Events.FRAME_NAVIGATED, event => this.frameNavigated(event.data.frame), this);
    frameManager.addEventListener(
        SDK.FrameManager.Events.RESOURCE_ADDED, event => this.resourceAdded(event.data.resource), this);

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ChildTargetManager.ChildTargetManager, SDK.ChildTargetManager.Events.TARGET_CREATED, this.windowOpened,
        this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ChildTargetManager.ChildTargetManager, SDK.ChildTargetManager.Events.TARGET_INFO_CHANGED,
        this.windowChanged, this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ChildTargetManager.ChildTargetManager, SDK.ChildTargetManager.Events.TARGET_DESTROYED, this.windowDestroyed,
        this, {scoped: true});

    SDK.TargetManager.TargetManager.instance().observeTargets(this, {scoped: true});
  }

  private initialize(): void {
    const frameManager = SDK.FrameManager.FrameManager.instance();
    for (const frame of frameManager.getAllFrames()) {
      if (!this.treeElementForFrameId.get(frame.id)) {
        this.addFrameAndParents(frame);
      }
      const childTargetManager = frame.resourceTreeModel().target().model(SDK.ChildTargetManager.ChildTargetManager);
      if (childTargetManager) {
        for (const targetInfo of childTargetManager.targetInfos()) {
          this.windowOpened({data: targetInfo});
        }
      }
    }
  }

  targetAdded(target: SDK.Target.Target): void {
    if (target.type() === SDK.Target.Type.Worker || target.type() === SDK.Target.Type.ServiceWorker) {
      void this.workerAdded(target);
    }
    if (target.type() === SDK.Target.Type.FRAME && target === target.outermostTarget()) {
      // Process existing frames, e.g. after prerendering activation or
      // switching between outermost targets.
      this.initialize();
    }
  }

  private async workerAdded(target: SDK.Target.Target): Promise<void> {
    const parentTarget = target.parentTarget();
    if (!parentTarget) {
      return;
    }
    const parentTargetId = parentTarget.id();
    const frameTreeElement = this.treeElementForTargetId.get(parentTargetId);
    const targetId = target.id();
    assertNotMainTarget(targetId);
    const {targetInfo} = await parentTarget.targetAgent().invoke_getTargetInfo({targetId});
    if (frameTreeElement && targetInfo) {
      frameTreeElement.workerCreated(targetInfo);
    }
  }

  targetRemoved(_target: SDK.Target.Target): void {
  }

  private addFrameAndParents(frame: SDK.ResourceTreeModel.ResourceTreeFrame): void {
    const parentFrame = frame.parentFrame();
    if (parentFrame && !this.treeElementForFrameId.get(parentFrame.id)) {
      this.addFrameAndParents(parentFrame);
    }
    this.frameAdded(frame);
  }

  private expandFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame|null): boolean {
    if (!frame) {
      return false;
    }
    let treeElement = this.treeElementForFrameId.get(frame.id);
    if (!treeElement && !this.expandFrame(frame.parentFrame())) {
      return false;
    }
    treeElement = this.treeElementForFrameId.get(frame.id);
    if (!treeElement) {
      return false;
    }
    treeElement.expand();
    return true;
  }

  async revealResource(resource: SDK.Resource.Resource, line?: number, column?: number): Promise<void> {
    if (!this.expandFrame(resource.frame())) {
      return;
    }
    const resourceTreeElement = FrameResourceTreeElement.forResource(resource);
    if (resourceTreeElement) {
      await resourceTreeElement.revealResource(line, column);
    }
  }

  revealAndSelectFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame): void {
    const frameTreeElement = this.treeElementForFrameId.get(frame.id);
    frameTreeElement?.reveal();
    frameTreeElement?.select();
  }

  private frameAdded(frame: SDK.ResourceTreeModel.ResourceTreeFrame): void {
    if (!SDK.TargetManager.TargetManager.instance().isInScope(frame.resourceTreeModel())) {
      return;
    }
    const parentFrame = frame.parentFrame();
    const parentTreeElement = parentFrame ? this.treeElementForFrameId.get(parentFrame.id) : this.treeElement;
    if (!parentTreeElement) {
      return;
    }

    const existingElement = this.treeElementForFrameId.get(frame.id);
    if (existingElement) {
      this.treeElementForFrameId.delete(frame.id);
      if (existingElement.parent) {
        existingElement.parent.removeChild(existingElement);
      }
    }

    const frameTreeElement = new FrameTreeElement(this, frame);
    this.treeElementForFrameId.set(frame.id, frameTreeElement);
    const targetId = frame.resourceTreeModel().target().id();
    if (!this.treeElementForTargetId.get(targetId)) {
      this.treeElementForTargetId.set(targetId, frameTreeElement);
    }
    parentTreeElement.appendChild(frameTreeElement);

    for (const resource of frame.resources()) {
      this.resourceAdded(resource);
    }
  }

  private frameDetached(frameId: Protocol.Page.FrameId): void {
    const frameTreeElement = this.treeElementForFrameId.get(frameId);
    if (!frameTreeElement) {
      return;
    }

    this.treeElementForFrameId.delete(frameId);
    if (frameTreeElement.parent) {
      frameTreeElement.parent.removeChild(frameTreeElement);
    }
  }

  private frameNavigated(frame: SDK.ResourceTreeModel.ResourceTreeFrame): void {
    if (!SDK.TargetManager.TargetManager.instance().isInScope(frame.resourceTreeModel())) {
      return;
    }
    const frameTreeElement = this.treeElementForFrameId.get(frame.id);
    if (frameTreeElement) {
      void frameTreeElement.frameNavigated(frame);
    }
  }

  private resourceAdded(resource: SDK.Resource.Resource): void {
    const frame = resource.frame();
    if (!frame) {
      return;
    }
    if (!SDK.TargetManager.TargetManager.instance().isInScope(frame.resourceTreeModel())) {
      return;
    }
    const frameTreeElement = this.treeElementForFrameId.get(frame.id);
    if (!frameTreeElement) {
      // This is a frame's main resource, it will be retained
      // and re-added by the resource manager;
      return;
    }
    frameTreeElement.appendResource(resource);
  }

  private windowOpened(event: Common.EventTarget.EventTargetEvent<Protocol.Target.TargetInfo>): void {
    const targetInfo = event.data;
    // Events for DevTools windows are ignored because they do not have an openerId
    if (targetInfo.openerId && targetInfo.type === 'page') {
      const frameTreeElement = this.treeElementForFrameId.get(targetInfo.openerId);
      if (frameTreeElement) {
        this.treeElementForTargetId.set(targetInfo.targetId, frameTreeElement);
        frameTreeElement.windowOpened(targetInfo);
      }
    }
  }

  private windowDestroyed(event: Common.EventTarget.EventTargetEvent<Protocol.Target.TargetID>): void {
    const targetId = event.data;
    const frameTreeElement = this.treeElementForTargetId.get(targetId);
    if (frameTreeElement) {
      frameTreeElement.windowDestroyed(targetId);
      this.treeElementForTargetId.delete(targetId);
    }
  }

  private windowChanged(event: Common.EventTarget.EventTargetEvent<Protocol.Target.TargetInfo>): void {
    const targetInfo = event.data;
    // Events for DevTools windows are ignored because they do not have an openerId
    if (targetInfo.openerId && targetInfo.type === 'page') {
      const frameTreeElement = this.treeElementForFrameId.get(targetInfo.openerId);
      if (frameTreeElement) {
        frameTreeElement.windowChanged(targetInfo);
      }
    }
  }

  reset(): void {
    this.treeElement.removeChildren();
    this.treeElementForFrameId.clear();
    this.treeElementForTargetId.clear();
  }
}

export class FrameTreeElement extends ApplicationPanelTreeElement {
  private section: ResourcesSection;
  private frame: SDK.ResourceTreeModel.ResourceTreeFrame;
  private frameId: string;
  private readonly categoryElements: Map<string, ExpandableApplicationPanelTreeElement>;
  private readonly treeElementForResource: Map<string, FrameResourceTreeElement>;
  private treeElementForWindow: Map<Protocol.Target.TargetID, FrameWindowTreeElement>;
  private treeElementForWorker: Map<Protocol.Target.TargetID, WorkerTreeElement>;
  private view: LegacyWrapper.LegacyWrapper
      .LegacyWrapper<UI.Widget.Widget, ApplicationComponents.FrameDetailsView.FrameDetailsReportView>|null;

  constructor(section: ResourcesSection, frame: SDK.ResourceTreeModel.ResourceTreeFrame) {
    super(section.panel, '', false, 'frame');
    this.section = section;
    this.frame = frame;
    this.frameId = frame.id;
    this.categoryElements = new Map();
    this.treeElementForResource = new Map();
    this.treeElementForWindow = new Map();
    this.treeElementForWorker = new Map();
    void this.frameNavigated(frame);
    this.view = null;
  }

  getIconTypeForFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame): 'frame-crossed'|'frame'|'iframe-crossed'|
      'iframe' {
    if (frame.isOutermostFrame()) {
      return frame.unreachableUrl() ? 'frame-crossed' : 'frame';
    }
    return frame.unreachableUrl() ? 'iframe-crossed' : 'iframe';
  }

  async frameNavigated(frame: SDK.ResourceTreeModel.ResourceTreeFrame): Promise<void> {
    const icon = IconButton.Icon.create(this.getIconTypeForFrame(frame));
    if (frame.unreachableUrl()) {
      icon.classList.add('red-icon');
    }
    this.setLeadingIcons([icon]);
    this.invalidateChildren();

    this.frameId = frame.id;
    if (this.title !== frame.displayName()) {
      this.title = frame.displayName();
      UI.ARIAUtils.setLabel(this.listItemElement, this.title);
      if (this.parent) {
        const parent = this.parent;
        // Insert frame at new position to preserve correct alphabetical order
        parent.removeChild(this);
        parent.appendChild(this);
      }
    }
    this.categoryElements.clear();
    this.treeElementForResource.clear();
    this.treeElementForWorker.clear();

    if (this.selected) {
      this.view = LegacyWrapper.LegacyWrapper.legacyWrapper(
          UI.Widget.Widget, new ApplicationComponents.FrameDetailsView.FrameDetailsReportView(this.frame));
      this.showView(this.view);
    } else {
      this.view = null;
    }

    // Service Workers' parent is always the outermost frame. We need to reconstruct
    // the service worker tree elements after those navigations which allow
    // the service workers to stay alive.
    if (frame.isOutermostFrame()) {
      const targets = SDK.TargetManager.TargetManager.instance().targets();
      for (const target of targets) {
        if (target.type() === SDK.Target.Type.ServiceWorker &&
            SDK.TargetManager.TargetManager.instance().isInScope(target)) {
          const targetId = target.id();
          assertNotMainTarget(targetId);
          const agent = frame.resourceTreeModel().target().targetAgent();
          const targetInfo = (await agent.invoke_getTargetInfo({targetId})).targetInfo;
          this.workerCreated(targetInfo);
        }
      }
    }
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    // This is used to persist over reloads/navigation which frame was selected.
    // A frame's title can change on DevTools refresh, so we resort to using
    // the URL instead (even though it is not guaranteed to be unique).
    if (this.frame.isOutermostFrame()) {
      return 'frame://' as Platform.DevToolsPath.UrlString;
    }
    return 'frame://' + encodeURI(this.frame.url) as Platform.DevToolsPath.UrlString;
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = LegacyWrapper.LegacyWrapper.legacyWrapper(
          UI.Widget.Widget, new ApplicationComponents.FrameDetailsView.FrameDetailsReportView(this.frame));
    }
    Host.userMetrics.panelShown('frame-details');
    this.showView(this.view);

    this.listItemElement.classList.remove('hovered');
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    return false;
  }

  set hovered(hovered: boolean) {
    if (hovered) {
      this.listItemElement.classList.add('hovered');
      void this.frame.highlight();
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
        resourceType === Common.ResourceType.resourceTypes.Document ? this : this.categoryElements.get(categoryName);
    if (!categoryElement) {
      categoryElement = new ExpandableApplicationPanelTreeElement(
          this.section.panel, resource.resourceType().category().title(), categoryName, categoryName === 'Frames');
      this.categoryElements.set(resourceType.name(), categoryElement);
      this.appendChild(categoryElement, FrameTreeElement.presentationOrderCompare);
    }
    const resourceTreeElement = new FrameResourceTreeElement(this.section.panel, resource);
    categoryElement.appendChild(resourceTreeElement, FrameTreeElement.presentationOrderCompare);
    this.treeElementForResource.set(resource.url, resourceTreeElement);
  }

  windowOpened(targetInfo: Protocol.Target.TargetInfo): void {
    const categoryKey = 'opened-windows';
    let categoryElement = this.categoryElements.get(categoryKey);
    if (!categoryElement) {
      categoryElement = new ExpandableApplicationPanelTreeElement(
          this.section.panel, i18nString(UIStrings.openedWindows), categoryKey);
      this.categoryElements.set(categoryKey, categoryElement);
      this.appendChild(categoryElement, FrameTreeElement.presentationOrderCompare);
    }
    if (!this.treeElementForWindow.get(targetInfo.targetId)) {
      const windowTreeElement = new FrameWindowTreeElement(this.section.panel, targetInfo);
      categoryElement.appendChild(windowTreeElement);
      this.treeElementForWindow.set(targetInfo.targetId, windowTreeElement);
    }
  }

  workerCreated(targetInfo: Protocol.Target.TargetInfo): void {
    const categoryKey = targetInfo.type === 'service_worker' ? 'service-workers' : 'web-workers';
    const categoryName = targetInfo.type === 'service_worker' ? i18n.i18n.lockedString('Service workers') :
                                                                i18nString(UIStrings.webWorkers);
    let categoryElement = this.categoryElements.get(categoryKey);
    if (!categoryElement) {
      categoryElement = new ExpandableApplicationPanelTreeElement(this.section.panel, categoryName, categoryKey);
      this.categoryElements.set(categoryKey, categoryElement);
      this.appendChild(categoryElement, FrameTreeElement.presentationOrderCompare);
    }
    if (!this.treeElementForWorker.get(targetInfo.targetId)) {
      const workerTreeElement = new WorkerTreeElement(this.section.panel, targetInfo);
      categoryElement.appendChild(workerTreeElement);
      this.treeElementForWorker.set(targetInfo.targetId, workerTreeElement);
    }
  }

  windowChanged(targetInfo: Protocol.Target.TargetInfo): void {
    const windowTreeElement = this.treeElementForWindow.get(targetInfo.targetId);
    if (!windowTreeElement) {
      return;
    }
    if (windowTreeElement.title !== targetInfo.title) {
      windowTreeElement.title = targetInfo.title;
    }
    windowTreeElement.update(targetInfo);
  }

  windowDestroyed(targetId: Protocol.Target.TargetID): void {
    const windowTreeElement = this.treeElementForWindow.get(targetId);
    if (windowTreeElement) {
      windowTreeElement.windowClosed();
    }
  }

  override appendChild(
      treeElement: UI.TreeOutline.TreeElement,
      comparator: ((arg0: UI.TreeOutline.TreeElement, arg1: UI.TreeOutline.TreeElement) => number)|
      undefined = FrameTreeElement.presentationOrderCompare): void {
    super.appendChild(treeElement, comparator);
  }

  /**
   * Order elements by type (first frames, then resources, last Document resources)
   * and then each of these groups in the alphabetical order.
   */
  private static presentationOrderCompare(
      treeElement1: UI.TreeOutline.TreeElement, treeElement2: UI.TreeOutline.TreeElement): number {
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
  private readonly panel: ResourcesPanel;
  private resource: SDK.Resource.Resource;
  private previewPromise: Promise<UI.Widget.Widget>|null;

  constructor(storagePanel: ResourcesPanel, resource: SDK.Resource.Resource) {
    super(
        storagePanel, resource.isGenerated ? i18nString(UIStrings.documentNotAvailable) : resource.displayName, false,
        'frame-resource');
    this.panel = storagePanel;
    this.resource = resource;
    this.previewPromise = null;
    this.tooltip = resource.url;
    resourceToFrameResourceTreeElement.set(this.resource, this);

    const icon = IconButton.Icon.create('document', 'navigator-file-tree-item');
    icon.classList.add('navigator-' + resource.resourceType().name() + '-tree-item');
    this.setLeadingIcons([icon]);
  }

  static forResource(resource: SDK.Resource.Resource): FrameResourceTreeElement|undefined {
    return resourceToFrameResourceTreeElement.get(resource);
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return this.resource.url;
  }

  private preparePreview(): Promise<UI.Widget.Widget> {
    if (this.previewPromise) {
      return this.previewPromise;
    }
    const viewPromise = SourceFrame.PreviewFactory.PreviewFactory.createPreview(this.resource, this.resource.mimeType);
    this.previewPromise = viewPromise.then(view => {
      if (view) {
        return view;
      }
      return new UI.EmptyWidget.EmptyWidget(this.resource.url);
    });
    return this.previewPromise;
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (this.resource.isGenerated) {
      this.panel.showCategoryView(i18nString(UIStrings.theContentOfThisDocumentHasBeen), null);
    } else {
      void this.panel.scheduleShowView(this.preparePreview());
    }
    Host.userMetrics.panelShown('frame-resource');
    return false;
  }

  override ondblclick(_event: Event): boolean {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(this.resource.url);
    return false;
  }

  override onattach(): void {
    super.onattach();
    this.listItemElement.draggable = true;
    this.listItemElement.addEventListener('dragstart', this.ondragstart.bind(this), false);
    this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);
  }

  private ondragstart(event: DragEvent): boolean {
    if (!event.dataTransfer) {
      return false;
    }
    event.dataTransfer.setData('text/plain', this.resource.content || '');
    event.dataTransfer.effectAllowed = 'copy';
    return true;
  }

  private handleContextMenuEvent(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this.resource);
    void contextMenu.show();
  }

  async revealResource(lineNumber?: number, columnNumber?: number): Promise<void> {
    this.revealAndSelect(true);
    const view = await this.panel.scheduleShowView(this.preparePreview());
    if (!(view instanceof SourceFrame.ResourceSourceFrame.ResourceSourceFrame) || typeof lineNumber !== 'number') {
      return;
    }
    view.revealPosition({lineNumber, columnNumber}, true);
  }
}

class FrameWindowTreeElement extends ApplicationPanelTreeElement {
  private targetInfo: Protocol.Target.TargetInfo;
  private isWindowClosed: boolean;
  private view: OpenedWindowDetailsView|null;

  constructor(storagePanel: ResourcesPanel, targetInfo: Protocol.Target.TargetInfo) {
    super(storagePanel, targetInfo.title || i18nString(UIStrings.windowWithoutTitle), false, 'window');
    this.targetInfo = targetInfo;
    this.isWindowClosed = false;
    this.view = null;
    this.updateIcon(targetInfo.canAccessOpener);
  }

  updateIcon(canAccessOpener: boolean): void {
    const iconType = canAccessOpener ? 'popup' : 'frame';
    const icon = IconButton.Icon.create(iconType);
    this.setLeadingIcons([icon]);
  }

  update(targetInfo: Protocol.Target.TargetInfo): void {
    if (targetInfo.canAccessOpener !== this.targetInfo.canAccessOpener) {
      this.updateIcon(targetInfo.canAccessOpener);
    }
    this.targetInfo = targetInfo;
    if (this.view) {
      this.view.setTargetInfo(targetInfo);
      this.view.update();
    }
  }

  windowClosed(): void {
    this.listItemElement.classList.add('window-closed');
    this.isWindowClosed = true;
    if (this.view) {
      this.view.setIsWindowClosed(true);
      this.view.update();
    }
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new OpenedWindowDetailsView(this.targetInfo, this.isWindowClosed);
    } else {
      this.view.update();
    }
    this.showView(this.view);
    Host.userMetrics.panelShown('frame-window');
    return false;
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return this.targetInfo.url as Platform.DevToolsPath.UrlString;
  }
}

class WorkerTreeElement extends ApplicationPanelTreeElement {
  private targetInfo: Protocol.Target.TargetInfo;
  private view: WorkerDetailsView|null;

  constructor(storagePanel: ResourcesPanel, targetInfo: Protocol.Target.TargetInfo) {
    super(storagePanel, targetInfo.title || targetInfo.url || i18nString(UIStrings.worker), false, 'worker');
    this.targetInfo = targetInfo;
    this.view = null;
    const icon = IconButton.Icon.create('gears', 'navigator-file-tree-item');
    this.setLeadingIcons([icon]);
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new WorkerDetailsView(this.targetInfo);
    } else {
      this.view.update();
    }
    this.showView(this.view);
    Host.userMetrics.panelShown('frame-worker');
    return false;
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return this.targetInfo.url as Platform.DevToolsPath.UrlString;
  }
}
