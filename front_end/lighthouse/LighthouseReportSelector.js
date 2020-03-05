// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as UI from '../ui/ui.js';

export class ReportSelector {
  constructor(renderNewLighthouseView) {
    this._renderNewLighthouseView = renderNewLighthouseView;
    this._newLighthouseItem = createElement('option');
    this._comboBox = new UI.Toolbar.ToolbarComboBox(this._handleChange.bind(this), ls`Reports`, 'lighthouse-report');
    this._comboBox.setMaxWidth(180);
    this._comboBox.setMinWidth(140);
    this._itemByOptionElement = new Map();
    this._setEmptyState();
  }

  _setEmptyState() {
    this._comboBox.selectElement().removeChildren();

    this._comboBox.setEnabled(false);
    this._newLighthouseItem = createElement('option');
    this._newLighthouseItem.label = Common.UIString.UIString('(new report)');
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
   * @param {function()} renderReport
   * @param {function()} showLandingCallback
   */
  constructor(lighthouseResult, renderReport, showLandingCallback) {
    this._lighthouseResult = lighthouseResult;
    this._renderReport = renderReport;
    this._showLandingCallback = showLandingCallback;

    const url = new Common.ParsedURL.ParsedURL(lighthouseResult.finalUrl);
    const timestamp = lighthouseResult.fetchTime;
    this._element = createElement('option');
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
