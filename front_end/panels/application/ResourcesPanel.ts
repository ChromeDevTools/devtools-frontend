// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {ApplicationPanelSidebar, StorageCategoryView} from './ApplicationPanelSidebar.js';
import {CookieItemsView} from './CookieItemsView.js';
import type {DeviceBoundSessionsModel} from './DeviceBoundSessionsModel.js';
import {DeviceBoundSessionsView} from './DeviceBoundSessionsView.js';
import {DOMStorageItemsView} from './DOMStorageItemsView.js';
import type {DOMStorage} from './DOMStorageModel.js';
import {ExtensionStorageItemsView} from './ExtensionStorageItemsView.js';
import type {ExtensionStorage} from './ExtensionStorageModel.js';
import type * as PreloadingHelper from './preloading/helper/helper.js';
import resourcesPanelStyles from './resourcesPanel.css.js';
import {StorageItemsToolbar} from './StorageItemsToolbar.js';

let resourcesPanelInstance: ResourcesPanel;

export class ResourcesPanel extends UI.Panel.PanelWithSidebar {
  private readonly resourcesLastSelectedItemSetting: Common.Settings.Setting<Platform.DevToolsPath.UrlString[]>;
  visibleView: UI.Widget.Widget|null;
  private pendingViewPromise: Promise<UI.Widget.Widget>|null;
  private categoryView: StorageCategoryView|null;
  storageViews: HTMLElement;
  private readonly storageViewToolbar: UI.Toolbar.Toolbar;
  private domStorageView: DOMStorageItemsView|null;
  private extensionStorageView: ExtensionStorageItemsView|null;
  private cookieView: CookieItemsView|null;
  private deviceBoundSessionsView: DeviceBoundSessionsView|null;
  private readonly sidebar: ApplicationPanelSidebar;

  private constructor() {
    super('resources');
    this.registerRequiredCSS(resourcesPanelStyles);

    this.resourcesLastSelectedItemSetting =
        Common.Settings.Settings.instance().createSetting('resources-last-selected-element-path', []);

    this.visibleView = null;

    this.pendingViewPromise = null;

    this.categoryView = null;

    const mainContainer = new UI.Widget.VBox();
    mainContainer.setMinimumSize(100, 0);
    this.storageViews = mainContainer.element.createChild('div', 'vbox flex-auto');
    this.storageViewToolbar = mainContainer.element.createChild('devtools-toolbar', 'resources-toolbar');
    this.splitWidget().setMainWidget(mainContainer);

    this.domStorageView = null;
    this.extensionStorageView = null;

    this.cookieView = null;
    this.deviceBoundSessionsView = null;

    this.sidebar = new ApplicationPanelSidebar(this);
    this.sidebar.show(this.panelSidebarElement());
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ResourcesPanel {
    const {forceNew} = opts;
    if (!resourcesPanelInstance || forceNew) {
      resourcesPanelInstance = new ResourcesPanel();
    }

    return resourcesPanelInstance;
  }

  private static shouldCloseOnReset(view: UI.Widget.Widget): boolean {
    const viewClassesToClose = [
      SourceFrame.ResourceSourceFrame.ResourceSourceFrame,
      SourceFrame.ImageView.ImageView,
      SourceFrame.FontView.FontView,
      StorageItemsToolbar,
    ];
    return viewClassesToClose.some(type => view instanceof type);
  }

  static async showAndGetSidebar(): Promise<ApplicationPanelSidebar> {
    await UI.ViewManager.ViewManager.instance().showView('resources');
    return ResourcesPanel.instance().sidebar;
  }

  override focus(): void {
    this.sidebar.focus();
  }

  lastSelectedItemPath(): Platform.DevToolsPath.UrlString[] {
    return this.resourcesLastSelectedItemSetting.get();
  }

  setLastSelectedItemPath(path: Platform.DevToolsPath.UrlString[]): void {
    this.resourcesLastSelectedItemSetting.set(path);
  }

  resetView(): void {
    if (this.visibleView && ResourcesPanel.shouldCloseOnReset(this.visibleView)) {
      this.showView(null);
    }
  }

  showView(view: UI.Widget.Widget|null): void {
    this.pendingViewPromise = null;
    if (this.visibleView === view) {
      return;
    }

    if (this.visibleView) {
      this.visibleView.detach();
    }

    if (view) {
      view.show(this.storageViews);
    }
    this.visibleView = view;

    this.storageViewToolbar.removeToolbarItems();
    this.storageViewToolbar.classList.toggle('hidden', true);
    if (view instanceof UI.View.SimpleView) {
      void view.toolbarItems().then(items => {
        items.map(item => this.storageViewToolbar.appendToolbarItem(item));
        this.storageViewToolbar.classList.toggle('hidden', !items.length);
      });
    }
  }

  async scheduleShowView(viewPromise: Promise<UI.Widget.Widget>): Promise<UI.Widget.Widget|null> {
    this.pendingViewPromise = viewPromise;
    const view = await viewPromise;
    if (this.pendingViewPromise !== viewPromise) {
      return null;
    }
    this.showView(view);
    return view;
  }

  showCategoryView(
      categoryName: string, categoryHeadline: string, categoryDescription: string,
      categoryLink: Platform.DevToolsPath.UrlString|null): void {
    if (!this.categoryView) {
      this.categoryView = new StorageCategoryView();
    }
    this.categoryView.element.setAttribute(
        'jslog', `${VisualLogging.pane().context(Platform.StringUtilities.toKebabCase(categoryName))}`);
    this.categoryView.setHeadline(categoryHeadline);
    this.categoryView.setText(categoryDescription);
    this.categoryView.setLink(categoryLink);
    this.showView(this.categoryView);
  }

  showDOMStorage(domStorage: DOMStorage): void {
    if (!domStorage) {
      return;
    }

    if (!this.domStorageView) {
      this.domStorageView = new DOMStorageItemsView(domStorage);
    } else {
      this.domStorageView.setStorage(domStorage);
    }
    this.showView(this.domStorageView);
  }

  showExtensionStorage(extensionStorage: ExtensionStorage): void {
    if (!extensionStorage) {
      return;
    }

    if (!this.extensionStorageView) {
      this.extensionStorageView = new ExtensionStorageItemsView(extensionStorage);
    } else {
      this.extensionStorageView.setStorage(extensionStorage);
    }
    this.showView(this.extensionStorageView);
  }

  showCookies(cookieFrameTarget: SDK.Target.Target, cookieDomain: string): void {
    const model = cookieFrameTarget.model(SDK.CookieModel.CookieModel);
    if (!model) {
      return;
    }
    if (!this.cookieView) {
      this.cookieView = new CookieItemsView(model, cookieDomain);
    } else {
      this.cookieView.setCookiesDomain(model, cookieDomain);
    }
    this.showView(this.cookieView);
  }

  clearCookies(target: SDK.Target.Target, cookieDomain: string): void {
    const model = (target.model(SDK.CookieModel.CookieModel));
    if (!model) {
      return;
    }
    void model.clear(cookieDomain).then(() => {
      if (this.cookieView) {
        this.cookieView.refreshItems();
      }
    });
  }

  showDeviceBoundSession(model: DeviceBoundSessionsModel, site: string, sessionId?: string): void {
    if (!this.deviceBoundSessionsView) {
      this.deviceBoundSessionsView = new DeviceBoundSessionsView();
    }
    this.deviceBoundSessionsView.showSession(model, site, sessionId);
    this.showView(this.deviceBoundSessionsView);
  }
  showDeviceBoundSessionDefault(model: DeviceBoundSessionsModel, title: string, description: string): void {
    if (!this.deviceBoundSessionsView) {
      this.deviceBoundSessionsView = new DeviceBoundSessionsView();
    }
    this.deviceBoundSessionsView.showDefault(model, title, description);
    this.showView(this.deviceBoundSessionsView);
  }
}

export class ResourceRevealer implements Common.Revealer.Revealer<SDK.Resource.Resource> {
  async reveal(resource: SDK.Resource.Resource): Promise<void> {
    const sidebar = await ResourcesPanel.showAndGetSidebar();
    await sidebar.showResource(resource);
  }
}

export class FrameDetailsRevealer implements Common.Revealer.Revealer<SDK.ResourceTreeModel.ResourceTreeFrame> {
  async reveal(frame: SDK.ResourceTreeModel.ResourceTreeFrame): Promise<void> {
    const sidebar = await ResourcesPanel.showAndGetSidebar();
    sidebar.showFrame(frame);
  }
}

export class RuleSetViewRevealer implements Common.Revealer.Revealer<PreloadingHelper.PreloadingForward.RuleSetView> {
  async reveal(revealInfo: PreloadingHelper.PreloadingForward.RuleSetView): Promise<void> {
    const sidebar = await ResourcesPanel.showAndGetSidebar();
    sidebar.showPreloadingRuleSetView(revealInfo);
  }
}

export class AttemptViewWithFilterRevealer implements
    Common.Revealer.Revealer<PreloadingHelper.PreloadingForward.AttemptViewWithFilter> {
  async reveal(filter: PreloadingHelper.PreloadingForward.AttemptViewWithFilter): Promise<void> {
    const sidebar = await ResourcesPanel.showAndGetSidebar();
    sidebar.showPreloadingAttemptViewWithFilter(filter);
  }
}
