// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as ReportRenderer from './LighthouseReporterTypes.js';

const UIStrings = {
  /**
  *@description Title of combo box in audits report selector
  */
  reports: 'Reports',
  /**
  *@description New report item label in Lighthouse Report Selector
  */
  newReport: '(new report)',
};
const str_ = i18n.i18n.registerUIStrings('panels/lighthouse/LighthouseReportSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ReportSelector {
  _renderNewLighthouseView: () => void;
  _newLighthouseItem: HTMLOptionElement;
  _comboBox: UI.Toolbar.ToolbarComboBox;
  _itemByOptionElement: Map<Element, Item>;

  constructor(renderNewLighthouseView: () => void) {
    this._renderNewLighthouseView = renderNewLighthouseView;
    this._newLighthouseItem = document.createElement('option');
    this._comboBox = new UI.Toolbar.ToolbarComboBox(
        this._handleChange.bind(this), i18nString(UIStrings.reports), 'lighthouse-report');
    this._comboBox.setMaxWidth(180);
    this._comboBox.setMinWidth(140);
    this._itemByOptionElement = new Map();
    this._setEmptyState();
  }

  _setEmptyState(): void {
    this._comboBox.selectElement().removeChildren();

    this._comboBox.setEnabled(false);
    this._newLighthouseItem = document.createElement('option');
    this._newLighthouseItem.label = i18nString(UIStrings.newReport);
    this._comboBox.selectElement().appendChild(this._newLighthouseItem);
    this._comboBox.select(this._newLighthouseItem);
  }

  _handleChange(_event: Event): void {
    const item = this._selectedItem();
    if (item) {
      item.select();
    } else {
      this._renderNewLighthouseView();
    }
  }

  _selectedItem(): Item {
    const option = this._comboBox.selectedOption();
    return this._itemByOptionElement.get(option as Element) as Item;
  }

  hasCurrentSelection(): boolean {
    return Boolean(this._selectedItem());
  }

  hasItems(): boolean {
    return this._itemByOptionElement.size > 0;
  }

  comboBox(): UI.Toolbar.ToolbarComboBox {
    return this._comboBox;
  }

  prepend(item: Item): void {
    const optionEl = item.optionElement();
    const selectEl = this._comboBox.selectElement();

    this._itemByOptionElement.set(optionEl, item);
    selectEl.insertBefore(optionEl, selectEl.firstElementChild);
    this._comboBox.setEnabled(true);
    this._comboBox.select(optionEl);
    item.select();
  }

  clearAll(): void {
    for (const elem of this._comboBox.options()) {
      if (elem === this._newLighthouseItem) {
        continue;
      }

      this._itemByOptionElement.get(elem)?.delete();
      this._itemByOptionElement.delete(elem);
    }

    this._setEmptyState();
  }

  selectNewReport(): void {
    this._comboBox.select(this._newLighthouseItem);
  }
}

export class Item {
  _lighthouseResult: ReportRenderer.ReportJSON;
  _renderReport: () => void;
  _showLandingCallback: () => void;
  _element: HTMLOptionElement;

  constructor(lighthouseResult: ReportRenderer.ReportJSON, renderReport: () => void, showLandingCallback: () => void) {
    this._lighthouseResult = lighthouseResult;
    this._renderReport = renderReport;
    this._showLandingCallback = showLandingCallback;

    const url = new Common.ParsedURL.ParsedURL(lighthouseResult.finalUrl);
    const timestamp = lighthouseResult.fetchTime;
    this._element = document.createElement('option');
    this._element.label = `${new Date(timestamp).toLocaleTimeString()} - ${url.domain()}`;
  }

  select(): void {
    this._renderReport();
  }

  optionElement(): Element {
    return this._element;
  }

  delete(): void {
    if (this._element) {
      this._element.remove();
    }
    this._showLandingCallback();
  }
}
