// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as UI from '../ui/ui.js';

import * as ReportRenderer from './LighthouseReporterTypes.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Title of combo box in audits report selector
  */
  reports: 'Reports',
  /**
  *@description New report item label in Lighthouse Report Selector
  */
  newReport: '(new report)',
};
const str_ = i18n.i18n.registerUIStrings('lighthouse/LighthouseReportSelector.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ReportSelector {
  /**
   * @param {function():void} renderNewLighthouseView
   */
  constructor(renderNewLighthouseView) {
    this._renderNewLighthouseView = renderNewLighthouseView;
    this._newLighthouseItem = document.createElement('option');
    this._comboBox = new UI.Toolbar.ToolbarComboBox(
        this._handleChange.bind(this), i18nString(UIStrings.reports), 'lighthouse-report');
    this._comboBox.setMaxWidth(180);
    this._comboBox.setMinWidth(140);
    this._itemByOptionElement = new Map();
    this._setEmptyState();
  }

  _setEmptyState() {
    this._comboBox.selectElement().removeChildren();

    this._comboBox.setEnabled(false);
    this._newLighthouseItem = document.createElement('option');
    this._newLighthouseItem.label = i18nString(UIStrings.newReport);
    this._comboBox.selectElement().appendChild(this._newLighthouseItem);
    this._comboBox.select(this._newLighthouseItem);
  }

  /**
   * @param {!Event} event
   */
  _handleChange(event) {
    const item = this._selectedItem();
    if (item) {
      item.select();
    } else {
      this._renderNewLighthouseView();
    }
  }

  /**
   * @return {!Item}
   */
  _selectedItem() {
    const option = this._comboBox.selectedOption();
    return this._itemByOptionElement.get(option);
  }

  /**
   * @return {boolean}
   */
  hasCurrentSelection() {
    return !!this._selectedItem();
  }

  /**
   * @return {boolean}
   */
  hasItems() {
    return this._itemByOptionElement.size > 0;
  }

  /**
   * @return {!UI.Toolbar.ToolbarComboBox}
   */
  comboBox() {
    return this._comboBox;
  }

  /**
   * @param {!Item} item
   */
  prepend(item) {
    const optionEl = item.optionElement();
    const selectEl = this._comboBox.selectElement();

    this._itemByOptionElement.set(optionEl, item);
    selectEl.insertBefore(optionEl, selectEl.firstElementChild);
    this._comboBox.setEnabled(true);
    this._comboBox.select(optionEl);
    item.select();
  }

  clearAll() {
    for (const elem of this._comboBox.options()) {
      if (elem === this._newLighthouseItem) {
        continue;
      }

      this._itemByOptionElement.get(elem).delete();
      this._itemByOptionElement.delete(elem);
    }

    this._setEmptyState();
  }

  selectNewReport() {
    this._comboBox.select(this._newLighthouseItem);
  }
}

export class Item {
  /**
   * @param {!ReportRenderer.ReportJSON} lighthouseResult
   * @param {function():void} renderReport
   * @param {function():void} showLandingCallback
   */
  constructor(lighthouseResult, renderReport, showLandingCallback) {
    this._lighthouseResult = lighthouseResult;
    this._renderReport = renderReport;
    this._showLandingCallback = showLandingCallback;

    const url = new Common.ParsedURL.ParsedURL(lighthouseResult.finalUrl);
    const timestamp = lighthouseResult.fetchTime;
    this._element = document.createElement('option');
    this._element.label = `${new Date(timestamp).toLocaleTimeString()} - ${url.domain()}`;
  }

  select() {
    this._renderReport();
  }

  /**
   * @return {!Element}
   */
  optionElement() {
    return this._element;
  }

  delete() {
    if (this._element) {
      this._element.remove();
    }
    this._showLandingCallback();
  }
}
