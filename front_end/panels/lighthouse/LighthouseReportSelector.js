// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
const UIStrings = {
    /**
     * @description Title of combo box in audits report selector
     */
    reports: 'Reports',
    /**
     * @description New report item label in Lighthouse Report Selector
     */
    newReport: '(new report)',
};
const str_ = i18n.i18n.registerUIStrings('panels/lighthouse/LighthouseReportSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ReportSelector {
    renderNewLighthouseView;
    newLighthouseItem;
    #comboBox;
    itemByOptionElement;
    constructor(renderNewLighthouseView) {
        this.renderNewLighthouseView = renderNewLighthouseView;
        this.newLighthouseItem = document.createElement('option');
        this.#comboBox = new UI.Toolbar.ToolbarComboBox(this.handleChange.bind(this), i18nString(UIStrings.reports), 'lighthouse-report');
        this.itemByOptionElement = new Map();
        this.setEmptyState();
    }
    setEmptyState() {
        this.#comboBox.removeOptions();
        this.#comboBox.setEnabled(false);
        this.newLighthouseItem = document.createElement('option');
        this.newLighthouseItem.label = i18nString(UIStrings.newReport);
        this.#comboBox.addOption(this.newLighthouseItem);
        this.#comboBox.select(this.newLighthouseItem);
    }
    handleChange(_event) {
        const item = this.selectedItem();
        if (item) {
            item.select();
        }
        else {
            this.renderNewLighthouseView();
        }
    }
    selectedItem() {
        const option = this.#comboBox.selectedOption();
        return this.itemByOptionElement.get(option);
    }
    hasItems() {
        return this.itemByOptionElement.size > 0;
    }
    comboBox() {
        return this.#comboBox;
    }
    prepend(item) {
        const optionEl = item.optionElement();
        const selectEl = this.#comboBox.element;
        this.itemByOptionElement.set(optionEl, item);
        selectEl.insertBefore(optionEl, selectEl.firstElementChild);
        this.#comboBox.setEnabled(true);
        this.#comboBox.select(optionEl);
        item.select();
    }
    clearAll() {
        for (const elem of this.#comboBox.options()) {
            if (elem === this.newLighthouseItem) {
                continue;
            }
            this.itemByOptionElement.get(elem)?.delete();
            this.itemByOptionElement.delete(elem);
        }
        this.setEmptyState();
    }
    selectNewReport() {
        this.#comboBox.select(this.newLighthouseItem);
    }
}
export class Item {
    renderReport;
    showLandingCallback;
    element;
    constructor(lighthouseResult, renderReport, showLandingCallback) {
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
    select() {
        this.renderReport();
    }
    optionElement() {
        return this.element;
    }
    delete() {
        if (this.element) {
            this.element.remove();
        }
        this.showLandingCallback();
    }
}
//# sourceMappingURL=LighthouseReportSelector.js.map