// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {DeveloperResourcesListView} from './DeveloperResourcesListView.js';

export class DeveloperResourcesView extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('developer_resources/developerResourcesView.css');

    const toolbarContainer = this.contentElement.createChild('div', 'developer-resource-view-toolbar-container');
    const toolbar = new UI.Toolbar.Toolbar('developer-resource-view-toolbar', toolbarContainer);

    /** @type {?RegExp} */
    this._textFilterRegExp = null;
    const accessiblePlaceholder = '';  // Indicates that ToobarInput should use the placeholder as ARIA label.
    this._filterInput =
        new UI.Toolbar.ToolbarInput(ls`Enter text to search the URL and Error columns`, accessiblePlaceholder, 1);
    this._filterInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, this._onFilterChanged, this);
    toolbar.appendToolbarItem(this._filterInput);

    const loadThroughTarget = SDK.PageResourceLoader.getLoadThroughTargetSetting();
    const loadThroughTargetCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        loadThroughTarget, ls`Load HTTP(S) developer resources through the inspected target`,
        ls`Enable loading through target`);
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

  _onUpdate() {
    this._throttler.schedule(this._update.bind(this));
  }

  async _update() {
    this._listView.reset();
    this._listView.update(this._loader.getResourcesLoaded().values());
    this._updateStats();
  }

  _updateStats() {
    const {loading, resources} = this._loader.getNumberOfResources();
    if (loading > 0) {
      this._statusMessageElement.textContent = `${resources} resources, ${loading} currently loading`;
    } else {
      this._statusMessageElement.textContent = `${resources} resources`;
    }
  }

  /**
   * @param {!SDK.PageResourceLoader.PageResource} item
   * @return {boolean}
  */
  _isVisible(item) {
    return !this._textFilterRegExp || this._textFilterRegExp.test(item.url) ||
        this._textFilterRegExp.test(item.errorMessage || '');
  }

  /**
   *
   */
  _onFilterChanged() {
    if (!this._listView) {
      return;
    }

    const text = this._filterInput.value();
    this._textFilterRegExp = text ? createPlainTextSearchRegex(text, 'i') : null;
    this._listView.updateFilterAndHighlight(this._textFilterRegExp);
    this._updateStats();
  }
}
