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
import { ApplicationPanelSidebar, StorageCategoryView } from './ApplicationPanelSidebar.js';
import { CookieItemsView } from './CookieItemsView.js';
import { DOMStorageItemsView } from './DOMStorageItemsView.js';
import { ExtensionStorageItemsView } from './ExtensionStorageItemsView.js';
import resourcesPanelStyles from './resourcesPanel.css.js';
import { StorageItemsToolbar } from './StorageItemsToolbar.js';
let resourcesPanelInstance;
export class ResourcesPanel extends UI.Panel.PanelWithSidebar {
    resourcesLastSelectedItemSetting;
    visibleView;
    pendingViewPromise;
    categoryView;
    storageViews;
    storageViewToolbar;
    domStorageView;
    extensionStorageView;
    cookieView;
    sidebar;
    constructor() {
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
        this.sidebar = new ApplicationPanelSidebar(this);
        this.sidebar.show(this.panelSidebarElement());
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!resourcesPanelInstance || forceNew) {
            resourcesPanelInstance = new ResourcesPanel();
        }
        return resourcesPanelInstance;
    }
    static shouldCloseOnReset(view) {
        const viewClassesToClose = [
            SourceFrame.ResourceSourceFrame.ResourceSourceFrame,
            SourceFrame.ImageView.ImageView,
            SourceFrame.FontView.FontView,
            StorageItemsToolbar,
        ];
        return viewClassesToClose.some(type => view instanceof type);
    }
    static async showAndGetSidebar() {
        await UI.ViewManager.ViewManager.instance().showView('resources');
        return ResourcesPanel.instance().sidebar;
    }
    focus() {
        this.sidebar.focus();
    }
    lastSelectedItemPath() {
        return this.resourcesLastSelectedItemSetting.get();
    }
    setLastSelectedItemPath(path) {
        this.resourcesLastSelectedItemSetting.set(path);
    }
    resetView() {
        if (this.visibleView && ResourcesPanel.shouldCloseOnReset(this.visibleView)) {
            this.showView(null);
        }
    }
    showView(view) {
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
    async scheduleShowView(viewPromise) {
        this.pendingViewPromise = viewPromise;
        const view = await viewPromise;
        if (this.pendingViewPromise !== viewPromise) {
            return null;
        }
        this.showView(view);
        return view;
    }
    showCategoryView(categoryName, categoryHeadline, categoryDescription, categoryLink) {
        if (!this.categoryView) {
            this.categoryView = new StorageCategoryView();
        }
        this.categoryView.element.setAttribute('jslog', `${VisualLogging.pane().context(Platform.StringUtilities.toKebabCase(categoryName))}`);
        this.categoryView.setHeadline(categoryHeadline);
        this.categoryView.setText(categoryDescription);
        this.categoryView.setLink(categoryLink);
        this.showView(this.categoryView);
    }
    showDOMStorage(domStorage) {
        if (!domStorage) {
            return;
        }
        if (!this.domStorageView) {
            this.domStorageView = new DOMStorageItemsView(domStorage);
        }
        else {
            this.domStorageView.setStorage(domStorage);
        }
        this.showView(this.domStorageView);
    }
    showExtensionStorage(extensionStorage) {
        if (!extensionStorage) {
            return;
        }
        if (!this.extensionStorageView) {
            this.extensionStorageView = new ExtensionStorageItemsView(extensionStorage);
        }
        else {
            this.extensionStorageView.setStorage(extensionStorage);
        }
        this.showView(this.extensionStorageView);
    }
    showCookies(cookieFrameTarget, cookieDomain) {
        const model = cookieFrameTarget.model(SDK.CookieModel.CookieModel);
        if (!model) {
            return;
        }
        if (!this.cookieView) {
            this.cookieView = new CookieItemsView(model, cookieDomain);
        }
        else {
            this.cookieView.setCookiesDomain(model, cookieDomain);
        }
        this.showView(this.cookieView);
    }
    clearCookies(target, cookieDomain) {
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
}
export class ResourceRevealer {
    async reveal(resource) {
        const sidebar = await ResourcesPanel.showAndGetSidebar();
        await sidebar.showResource(resource);
    }
}
export class FrameDetailsRevealer {
    async reveal(frame) {
        const sidebar = await ResourcesPanel.showAndGetSidebar();
        sidebar.showFrame(frame);
    }
}
export class RuleSetViewRevealer {
    async reveal(revealInfo) {
        const sidebar = await ResourcesPanel.showAndGetSidebar();
        sidebar.showPreloadingRuleSetView(revealInfo);
    }
}
export class AttemptViewWithFilterRevealer {
    async reveal(filter) {
        const sidebar = await ResourcesPanel.showAndGetSidebar();
        sidebar.showPreloadingAttemptViewWithFilter(filter);
    }
}
//# sourceMappingURL=ResourcesPanel.js.map