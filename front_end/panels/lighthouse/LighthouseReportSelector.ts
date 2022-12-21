// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
  private readonly renderNewLighthouseView: () => void;
  private newLighthouseItem: HTMLOptionElement;
  private readonly comboBoxInternal: UI.Toolbar.ToolbarComboBox;
  private readonly itemByOptionElement: Map<Element, Item>;

  constructor(renderNewLighthouseView: () => void) {
    this.renderNewLighthouseView = renderNewLighthouseView;
    this.newLighthouseItem = document.createElement('option');
    this.comboBoxInternal = new UI.Toolbar.ToolbarComboBox(
        this.handleChange.bind(this), i18nString(UIStrings.reports), 'lighthouse-report');
    this.comboBoxInternal.setMaxWidth(180);
    this.comboBoxInternal.setMinWidth(140);
    this.itemByOptionElement = new Map();
    this.setEmptyState();
  }

  private setEmptyState(): void {
    this.comboBoxInternal.selectElement().removeChildren();

    this.comboBoxInternal.setEnabled(false);
    this.newLighthouseItem = document.createElement('option');
    this.newLighthouseItem.label = i18nString(UIStrings.newReport);
    this.comboBoxInternal.selectElement().appendChild(this.newLighthouseItem);
    this.comboBoxInternal.select(this.newLighthouseItem);
  }

  private handleChange(_event: Event): void {
    const item = this.selectedItem();
    if (item) {
      item.select();
    } else {
      this.renderNewLighthouseView();
    }
  }

  private selectedItem(): Item {
    const option = this.comboBoxInternal.selectedOption();
    return this.itemByOptionElement.get(option as Element) as Item;
  }

  hasCurrentSelection(): boolean {
    return Boolean(this.selectedItem());
  }

  hasItems(): boolean {
    return this.itemByOptionElement.size > 0;
  }

  comboBox(): UI.Toolbar.ToolbarComboBox {
    return this.comboBoxInternal;
  }

  prepend(item: Item): void {
    const optionEl = item.optionElement();
    const selectEl = this.comboBoxInternal.selectElement();

    this.itemByOptionElement.set(optionEl, item);
    selectEl.insertBefore(optionEl, selectEl.firstElementChild);
    this.comboBoxInternal.setEnabled(true);
    this.comboBoxInternal.select(optionEl);
    item.select();
  }

  clearAll(): void {
    for (const elem of this.comboBoxInternal.options()) {
      if (elem === this.newLighthouseItem) {
        continue;
      }

      this.itemByOptionElement.get(elem)?.delete();
      this.itemByOptionElement.delete(elem);
    }

    this.setEmptyState();
  }

  selectNewReport(): void {
    this.comboBoxInternal.select(this.newLighthouseItem);
  }
}

export class Item {
  private readonly lighthouseResult: ReportRenderer.ReportJSON;
  private readonly renderReport: () => void;
  private readonly showLandingCallback: () => void;
  private readonly element: HTMLOptionElement;

  constructor(lighthouseResult: ReportRenderer.ReportJSON, renderReport: () => void, showLandingCallback: () => void) {
    this.lighthouseResult = lighthouseResult;
    this.renderReport = renderReport;
    this.showLandingCallback = showLandingCallback;

    // In Lighthouse 10.0, `finalUrl` is not provided on snapshot or timespan reports.
    // `finalDisplayedUrl` is the new preferred URL to use for cosmetic identification.
    // TODO: Remove the `finalUrl` backport once Lighthouse 10.0 is rolled into DevTools.
    const finalDisplayedUrl = lighthouseResult.finalDisplayedUrl || lighthouseResult.finalUrl || '';

    const url = new Common.ParsedURL.ParsedURL(finalDisplayedUrl);
    const timestamp = lighthouseResult.fetchTime;
    this.element = document.createElement('option');
    this.element.label = `${new Date(timestamp).toLocaleTimeString()} - ${url.domain()}`;
  }

  select(): void {
    this.renderReport();
  }

  optionElement(): Element {
    return this.element;
  }

  delete(): void {
    if (this.element) {
      this.element.remove();
    }
    this.showLandingCallback();
  }
}
