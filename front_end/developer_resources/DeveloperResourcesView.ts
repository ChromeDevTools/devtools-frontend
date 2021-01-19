// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {DeveloperResourcesListView} from './DeveloperResourcesListView.js';

export const UIStrings = {
  /**
  *@description Placeholder for a search field in a toolbar
  */
  enterTextToSearchTheUrlAndError: 'Enter text to search the URL and Error columns',
  /**
  *@description Title for a checkbox in the toolbar of the developer resources view
  */
  loadHttpsDeveloperResources: 'Load HTTP(S) developer resources through the inspected target',
  /**
  *@description Text for a checkbox in the toolbar of the developer resources view
  */
  enableLoadingThroughTarget: 'Enable loading through target',
  /**
   *@description Text for resources load status
   *@example {1} PH1
   *@example {1} PH2
   */
  resourcesCurrentlyLoading: '{PH1} resources, {PH2} currently loading',
  /**
   *@description Text for resources load status
   *@example {1} PH1
   */
  resources: '{PH1} resources',
};
const str_ = i18n.i18n.registerUIStrings('developer_resources/DeveloperResourcesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let developerResourcesViewInstance: DeveloperResourcesView;

export class DeveloperResourcesView extends UI.Widget.VBox {
  _textFilterRegExp: RegExp|null;
  _filterInput: UI.Toolbar.ToolbarInput;
  _coverageResultsElement: HTMLElement;
  _listView: DeveloperResourcesListView;
  _statusToolbarElement: HTMLElement;
  _statusMessageElement: HTMLElement;
  _throttler: Common.Throttler.Throttler;
  _loader: SDK.PageResourceLoader.PageResourceLoader;
  private constructor() {
    super(true);
    this.registerRequiredCSS('developer_resources/developerResourcesView.css', {enableLegacyPatching: true});

    const toolbarContainer = this.contentElement.createChild('div', 'developer-resource-view-toolbar-container');
    const toolbar = new UI.Toolbar.Toolbar('developer-resource-view-toolbar', toolbarContainer);

    this._textFilterRegExp = null;
    const accessiblePlaceholder = '';  // Indicates that ToobarInput should use the placeholder as ARIA label.
    this._filterInput =
        new UI.Toolbar.ToolbarInput(i18nString(UIStrings.enterTextToSearchTheUrlAndError), accessiblePlaceholder, 1);
    this._filterInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, this._onFilterChanged, this);
    toolbar.appendToolbarItem(this._filterInput);

    const loadThroughTarget = SDK.PageResourceLoader.getLoadThroughTargetSetting();
    const loadThroughTargetCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        loadThroughTarget, i18nString(UIStrings.loadHttpsDeveloperResources),
        i18nString(UIStrings.enableLoadingThroughTarget));
    toolbar.appendToolbarItem(loadThroughTargetCheckbox);

    this._coverageResultsElement = this.contentElement.createChild('div', 'developer-resource-view-results');
    this._listView = new DeveloperResourcesListView(this._isVisible.bind(this));
    this._listView.show(this._coverageResultsElement);
    this._statusToolbarElement = this.contentElement.createChild('div', 'developer-resource-view-toolbar-summary');
    this._statusMessageElement = this._statusToolbarElement.createChild('div', 'developer-resource-view-message');

    this._throttler = new Common.Throttler.Throttler(100);
    this._loader = SDK.PageResourceLoader.PageResourceLoader.instance();
    this._loader.addEventListener(SDK.PageResourceLoader.Events.Update, this._onUpdate, this);
    this._onUpdate();
  }

  static instance(): DeveloperResourcesView {
    if (!developerResourcesViewInstance) {
      developerResourcesViewInstance = new DeveloperResourcesView();
    }
    return developerResourcesViewInstance;
  }

  _onUpdate(): void {
    this._throttler.schedule(this._update.bind(this));
  }

  async _update(): Promise<void> {
    this._listView.reset();
    this._listView.update(this._loader.getResourcesLoaded().values());
    this._updateStats();
  }

  _updateStats(): void {
    const {loading, resources} = this._loader.getNumberOfResources();
    if (loading > 0) {
      this._statusMessageElement.textContent =
          i18nString(UIStrings.resourcesCurrentlyLoading, {PH1: resources, PH2: loading});
    } else {
      this._statusMessageElement.textContent = i18nString(UIStrings.resources, {PH1: resources});
    }
  }

  _isVisible(item: SDK.PageResourceLoader.PageResource): boolean {
    return !this._textFilterRegExp || this._textFilterRegExp.test(item.url) ||
        this._textFilterRegExp.test(item.errorMessage || '');
  }

  /**
   *
   */
  _onFilterChanged(): void {
    if (!this._listView) {
      return;
    }

    const text = this._filterInput.value();
    this._textFilterRegExp = text ? createPlainTextSearchRegex(text, 'i') : null;
    this._listView.updateFilterAndHighlight(this._textFilterRegExp);
    this._updateStats();
  }
}
