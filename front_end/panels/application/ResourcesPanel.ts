// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../../core/sdk/sdk.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import type {CookieTreeElement} from './ApplicationPanelSidebar.js';
import {ApplicationPanelSidebar, StorageCategoryView} from './ApplicationPanelSidebar.js';  // eslint-disable-line no-unused-vars
import {CookieItemsView} from './CookieItemsView.js';
import {DatabaseQueryView} from './DatabaseQueryView.js';
import {DatabaseTableView} from './DatabaseTableView.js';
import {DOMStorageItemsView} from './DOMStorageItemsView.js';
import type {DOMStorage} from './DOMStorageModel.js'; // eslint-disable-line no-unused-vars
import {StorageItemsView} from './StorageItemsView.js';

let resourcesPanelInstance: ResourcesPanel;

export class ResourcesPanel extends UI.Panel.PanelWithSidebar {
  _resourcesLastSelectedItemSetting: Common.Settings.Setting<string[]>;
  visibleView: UI.Widget.Widget|null;
  _pendingViewPromise: Promise<UI.Widget.Widget>|null;
  _categoryView: StorageCategoryView|null;
  storageViews: HTMLElement;
  _storageViewToolbar: UI.Toolbar.Toolbar;
  _domStorageView: DOMStorageItemsView|null;
  _cookieView: CookieItemsView|null;
  _emptyWidget: UI.EmptyWidget.EmptyWidget|null;
  _sidebar: ApplicationPanelSidebar;

  private constructor() {
    super('resources');
    this.registerRequiredCSS('panels/application/resourcesPanel.css', {enableLegacyPatching: false});

    this._resourcesLastSelectedItemSetting =
        Common.Settings.Settings.instance().createSetting('resourcesLastSelectedElementPath', []);

    this.visibleView = null;

    this._pendingViewPromise = null;

    this._categoryView = null;

    const mainContainer = new UI.Widget.VBox();
    this.storageViews = mainContainer.element.createChild('div', 'vbox flex-auto');
    this._storageViewToolbar = new UI.Toolbar.Toolbar('resources-toolbar', mainContainer.element);
    this.splitWidget().setMainWidget(mainContainer);

    this._domStorageView = null;

    this._cookieView = null;

    this._emptyWidget = null;

    this._sidebar = new ApplicationPanelSidebar(this);
    this._sidebar.show(this.panelSidebarElement());
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

  static _instance(): ResourcesPanel {
    return ResourcesPanel.instance();
  }

  static _shouldCloseOnReset(view: UI.Widget.Widget): boolean {
    const viewClassesToClose = [
      SourceFrame.ResourceSourceFrame.ResourceSourceFrame,
      SourceFrame.ImageView.ImageView,
      SourceFrame.FontView.FontView,
      StorageItemsView,
      DatabaseQueryView,
      DatabaseTableView,
    ];
    return viewClassesToClose.some(type => view instanceof type);
  }

  static async showAndGetSidebar(): Promise<ApplicationPanelSidebar> {
    await UI.ViewManager.ViewManager.instance().showView('resources');
    return ResourcesPanel._instance()._sidebar;
  }

  focus(): void {
    this._sidebar.focus();
  }

  lastSelectedItemPath(): string[] {
    return this._resourcesLastSelectedItemSetting.get();
  }

  setLastSelectedItemPath(path: string[]): void {
    this._resourcesLastSelectedItemSetting.set(path);
  }

  resetView(): void {
    if (this.visibleView && ResourcesPanel._shouldCloseOnReset(this.visibleView)) {
      this.showView(null);
    }
  }

  showView(view: UI.Widget.Widget|null): void {
    this._pendingViewPromise = null;
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

    this._storageViewToolbar.removeToolbarItems();
    this._storageViewToolbar.element.classList.toggle('hidden', true);
    if (view instanceof UI.View.SimpleView) {
      view.toolbarItems().then(items => {
        items.map(item => this._storageViewToolbar.appendToolbarItem(item));
        this._storageViewToolbar.element.classList.toggle('hidden', !items.length);
      });
    }
  }

  async scheduleShowView(viewPromise: Promise<UI.Widget.Widget>): Promise<UI.Widget.Widget|null> {
    this._pendingViewPromise = viewPromise;
    const view = await viewPromise;
    if (this._pendingViewPromise !== viewPromise) {
      return null;
    }
    this.showView(view);
    return view;
  }

  showCategoryView(categoryName: string, categoryLink: string|null): void {
    if (!this._categoryView) {
      this._categoryView = new StorageCategoryView();
    }
    this._categoryView.setText(categoryName);
    this._categoryView.setLink(categoryLink);
    this.showView(this._categoryView);
  }

  showDOMStorage(domStorage: DOMStorage): void {
    if (!domStorage) {
      return;
    }

    if (!this._domStorageView) {
      this._domStorageView = new DOMStorageItemsView(domStorage);
    } else {
      this._domStorageView.setStorage(domStorage);
    }
    this.showView(this._domStorageView);
  }

  showCookies(cookieFrameTarget: SDK.SDKModel.Target, cookieDomain: string): void {
    const model = cookieFrameTarget.model(SDK.CookieModel.CookieModel);
    if (!model) {
      return;
    }
    if (!this._cookieView) {
      this._cookieView = new CookieItemsView(model, cookieDomain);
    } else {
      this._cookieView.setCookiesDomain(model, cookieDomain);
    }
    this.showView(this._cookieView);
  }

  clearCookies(target: SDK.SDKModel.Target, cookieDomain: string): void {
    const model = (target.model(SDK.CookieModel.CookieModel) as SDK.CookieModel.CookieModel | null);
    if (!model) {
      return;
    }
    model.clear(cookieDomain).then(() => {
      if (this._cookieView) {
        this._cookieView.refreshItems();
      }
    });
  }
}

let resourceRevealerInstance: ResourceRevealer;

export class ResourceRevealer implements Common.Revealer.Revealer {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ResourceRevealer {
    const {forceNew} = opts;
    if (!resourceRevealerInstance || forceNew) {
      resourceRevealerInstance = new ResourceRevealer();
    }

    return resourceRevealerInstance;
  }

  async reveal(resource: Object): Promise<void> {
    if (!(resource instanceof SDK.Resource.Resource)) {
      throw new Error('Internal error: not a resource');
    }
    const sidebar = await ResourcesPanel.showAndGetSidebar();
    await sidebar.showResource(resource);
  }
}

let cookieReferenceRevealerInstance: CookieReferenceRevealer;

export class CookieReferenceRevealer implements Common.Revealer.Revealer {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): CookieReferenceRevealer {
    const {forceNew} = opts;
    if (!cookieReferenceRevealerInstance || forceNew) {
      cookieReferenceRevealerInstance = new CookieReferenceRevealer();
    }

    return cookieReferenceRevealerInstance;
  }
  async reveal(cookie: Object): Promise<void> {
    if (!(cookie instanceof SDK.Cookie.CookieReference)) {
      throw new Error('Internal error: not a cookie reference');
    }

    const sidebar = await ResourcesPanel.showAndGetSidebar();
    await sidebar.cookieListTreeElement.select();

    const contextUrl = cookie.contextUrl();
    if (contextUrl && await this._revealByDomain(sidebar, contextUrl)) {
      return;
    }
    // Fallback: try to reveal the cookie using its domain as context, which may not work, because the
    // Application Panel shows cookies grouped by context, see crbug.com/1060563.
    this._revealByDomain(sidebar, cookie.domain());
  }

  async _revealByDomain(sidebar: ApplicationPanelSidebar, domain: string): Promise<boolean> {
    const item = sidebar.cookieListTreeElement.children().find(
        c => /** @type {!CookieTreeElement} */ (c as CookieTreeElement).cookieDomain().endsWith(domain));
    if (item) {
      await item.revealAndSelect();
      return true;
    }
    return false;
  }
}

let frameDetailsRevealerInstance: FrameDetailsRevealer;

export class FrameDetailsRevealer implements Common.Revealer.Revealer {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): FrameDetailsRevealer {
    const {forceNew} = opts;
    if (!frameDetailsRevealerInstance || forceNew) {
      frameDetailsRevealerInstance = new FrameDetailsRevealer();
    }

    return frameDetailsRevealerInstance;
  }

  async reveal(frame: Object): Promise<void> {
    if (!(frame instanceof SDK.ResourceTreeModel.ResourceTreeFrame)) {
      throw new Error('Internal error: not a frame');
    }
    const sidebar = await ResourcesPanel.showAndGetSidebar();
    sidebar.showFrame(frame);
  }
}
