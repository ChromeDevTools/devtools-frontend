// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {DeveloperResourcesListView} from './DeveloperResourcesListView.js';
import developerResourcesViewStyles from './developerResourcesView.css.js';

const UIStrings = {
  /**
   *@description Placeholder for a search field in a toolbar
   */
  filterByText: 'Filter by URL and error',
  /**
   * @description Tooltip for a checkbox in the toolbar of the developer resources view. The
   * inspected target is the webpage that DevTools is debugging/inspecting/attached to.
   */
  loadHttpsDeveloperResources:
      'Load `HTTP(S)` developer resources through the website you inspect, not through DevTools',
  /**
   * @description Text for a checkbox in the toolbar of the developer resources view. The target is
   * the webpage that DevTools is debugging/inspecting/attached to. This setting makes it so
   * developer resources are requested from the webpage itself, and not from the DevTools
   * application.
   */
  enableLoadingThroughTarget: 'Load through website',
  /**
   *@description Text for resources load status
   *@example {1} PH1
   *@example {1} PH2
   */
  resourcesCurrentlyLoading: '{PH1} resources, {PH2} currently loading',
  /**
   * @description Status text that appears to tell the developer how many resources were loaded in
   * total. Resources are files related to the webpage.
   */
  resources: '{n, plural, =1 {# resource} other {# resources}}',
};
const str_ = i18n.i18n.registerUIStrings('panels/developer_resources/DeveloperResourcesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class DeveloperResourcesRevealer implements Common.Revealer.Revealer<SDK.PageResourceLoader.ResourceKey> {
  async reveal(resourceInitiatorKey: SDK.PageResourceLoader.ResourceKey): Promise<void> {
    const loader = SDK.PageResourceLoader.PageResourceLoader.instance();
    const resource = loader.getResourcesLoaded().get(resourceInitiatorKey.key);
    if (resource) {
      await UI.ViewManager.ViewManager.instance().showView('developer-resources');
      const developerResourcesView =
          await UI.ViewManager.ViewManager.instance().view('developer-resources').widget() as DeveloperResourcesView;
      return developerResourcesView.select(resource);
    }
  }
}

export class DeveloperResourcesView extends UI.ThrottledWidget.ThrottledWidget {
  private textFilterRegExp: RegExp|null;
  private readonly filterInput: UI.Toolbar.ToolbarInput;
  private readonly coverageResultsElement: HTMLElement;
  private listView: DeveloperResourcesListView;
  private readonly statusToolbarElement: HTMLElement;
  private statusMessageElement: HTMLElement;
  private readonly loader: SDK.PageResourceLoader.PageResourceLoader;

  constructor() {
    super(true);

    this.element.setAttribute('jslog', `${VisualLogging.panel('developer-resources').track({resize: true})}`);

    const toolbarContainer = this.contentElement.createChild('div', 'developer-resource-view-toolbar-container');
    toolbarContainer.setAttribute('jslog', `${VisualLogging.toolbar()}`);
    const toolbar = new UI.Toolbar.Toolbar('developer-resource-view-toolbar', toolbarContainer);

    this.textFilterRegExp = null;
    this.filterInput = new UI.Toolbar.ToolbarFilter(i18nString(UIStrings.filterByText), 1);
    this.filterInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED, this.onFilterChanged, this);
    toolbar.appendToolbarItem(this.filterInput);

    const loadThroughTarget = SDK.PageResourceLoader.getLoadThroughTargetSetting();
    const loadThroughTargetCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        loadThroughTarget, i18nString(UIStrings.loadHttpsDeveloperResources),
        i18nString(UIStrings.enableLoadingThroughTarget));
    toolbar.appendToolbarItem(loadThroughTargetCheckbox);

    this.coverageResultsElement = this.contentElement.createChild('div', 'developer-resource-view-results');
    this.listView = new DeveloperResourcesListView(this.isVisible.bind(this));
    this.listView.show(this.coverageResultsElement);
    this.statusToolbarElement = this.contentElement.createChild('div', 'developer-resource-view-toolbar-summary');
    this.statusMessageElement = this.statusToolbarElement.createChild('div', 'developer-resource-view-message');

    this.loader = SDK.PageResourceLoader.PageResourceLoader.instance();
    this.loader.addEventListener(SDK.PageResourceLoader.Events.UPDATE, this.update, this);
    this.update();
  }

  override async doUpdate(): Promise<void> {
    const selectedItem = this.listView.selectedItem();
    this.listView.reset();
    this.listView.update(this.loader.getScopedResourcesLoaded().values());
    if (selectedItem) {
      this.listView.select(selectedItem);
    }
    this.updateStats();
  }

  async select(resource: SDK.PageResourceLoader.PageResource): Promise<void> {
    await this.lastUpdatePromise;
    this.listView.select(resource);
  }

  async selectedItem(): Promise<SDK.PageResourceLoader.PageResource|null> {
    await this.lastUpdatePromise;
    return this.listView.selectedItem();
  }

  private updateStats(): void {
    const {loading, resources} = this.loader.getScopedNumberOfResources();
    if (loading > 0) {
      this.statusMessageElement.textContent =
          i18nString(UIStrings.resourcesCurrentlyLoading, {PH1: resources, PH2: loading});
    } else {
      this.statusMessageElement.textContent = i18nString(UIStrings.resources, {n: resources});
    }
  }

  private isVisible(item: SDK.PageResourceLoader.PageResource): boolean {
    return !this.textFilterRegExp || this.textFilterRegExp.test(item.url) ||
        this.textFilterRegExp.test(item.errorMessage || '');
  }

  private onFilterChanged(): void {
    if (!this.listView) {
      return;
    }

    const text = this.filterInput.value();
    this.textFilterRegExp = text ? Platform.StringUtilities.createPlainTextSearchRegex(text, 'i') : null;
    this.listView.updateFilterAndHighlight(this.textFilterRegExp);
    this.updateStats();
  }

  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([developerResourcesViewStyles]);
  }
}
