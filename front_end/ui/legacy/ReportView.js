// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import './Toolbar.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import * as ARIAUtils from './ARIAUtils.js';
import reportViewStyles from './reportView.css.js';
import { Tooltip } from './Tooltip.js';
import { VBox } from './Widget.js';
/**
 * @deprecated Please consider using the web component version of this widget
 *             (`ui/components/report_view/ReportView.ts`) for new code.
 */
export class ReportView extends VBox {
    contentBox;
    headerElement;
    titleElement;
    sectionList;
    subtitleElement;
    urlElement;
    constructor(title) {
        super({ useShadowDom: true });
        this.registerRequiredCSS(reportViewStyles);
        this.contentBox = this.contentElement.createChild('div', 'report-content-box');
        this.headerElement = this.contentBox.createChild('div', 'report-header vbox');
        this.titleElement = this.headerElement.createChild('div', 'report-title');
        if (title) {
            this.titleElement.textContent = title;
        }
        else {
            this.headerElement.classList.add('hidden');
        }
        ARIAUtils.markAsHeading(this.titleElement, 1);
        this.sectionList = this.contentBox.createChild('div', 'vbox');
    }
    getHeaderElement() {
        return this.headerElement;
    }
    setTitle(title) {
        if (this.titleElement.textContent === title) {
            return;
        }
        this.titleElement.textContent = title;
        this.headerElement.classList.toggle('hidden', Boolean(title));
    }
    setSubtitle(subtitle) {
        if (this.subtitleElement && this.subtitleElement.textContent === subtitle) {
            return;
        }
        if (!this.subtitleElement) {
            this.subtitleElement = this.headerElement.createChild('div', 'report-subtitle');
        }
        this.subtitleElement.textContent = subtitle;
    }
    setURL(link) {
        if (!this.urlElement) {
            this.urlElement = this.headerElement.createChild('div', 'report-url link');
        }
        this.urlElement.removeChildren();
        if (link) {
            this.urlElement.appendChild(link);
        }
        this.urlElement.setAttribute('jslog', `${VisualLogging.link('source-location').track({ click: true })}`);
    }
    createToolbar() {
        return this.headerElement.createChild('devtools-toolbar');
    }
    appendSection(title, className, jslogContext) {
        const section = new Section(title, className, jslogContext);
        section.show(this.sectionList);
        return section;
    }
    sortSections(comparator) {
        const sections = this.children().slice();
        const sorted = sections.every((_, i, a) => !i || comparator(a[i - 1], a[i]) <= 0);
        if (sorted) {
            return;
        }
        this.detachChildWidgets();
        sections.sort(comparator);
        for (const section of sections) {
            section.show(this.sectionList);
        }
    }
    setHeaderVisible(visible) {
        this.headerElement.classList.toggle('hidden', !visible);
    }
    setBodyScrollable(scrollable) {
        this.contentBox.classList.toggle('no-scroll', !scrollable);
    }
}
export class Section extends VBox {
    jslogContext;
    headerElement;
    headerButtons = [];
    titleElement;
    fieldList;
    fieldMap = new Map();
    constructor(title, className, jslogContext) {
        super();
        this.jslogContext = jslogContext;
        this.element.classList.add('report-section');
        if (className) {
            this.element.classList.add(className);
        }
        if (jslogContext) {
            this.element.setAttribute('jslog', `${VisualLogging.section(jslogContext)}`);
        }
        this.jslogContext = jslogContext;
        this.headerElement = this.element.createChild('div', 'report-section-header');
        this.titleElement = this.headerElement.createChild('div', 'report-section-title');
        this.setTitle(title);
        ARIAUtils.markAsHeading(this.titleElement, 2);
        this.fieldList = this.element.createChild('div', 'vbox');
    }
    title() {
        return this.titleElement.textContent || '';
    }
    getTitleElement() {
        return this.titleElement;
    }
    getFieldElement() {
        return this.fieldList;
    }
    appendFieldWithCustomView(customElement) {
        this.fieldList.append(customElement);
    }
    setTitle(title, tooltip) {
        if (this.titleElement.textContent !== title) {
            this.titleElement.textContent = title;
        }
        Tooltip.install(this.titleElement, tooltip || '');
        this.titleElement.classList.toggle('hidden', !this.titleElement.textContent);
    }
    /**
     * Declares the overall container to be a group and assigns a title.
     */
    setUiGroupTitle(groupTitle) {
        ARIAUtils.markAsGroup(this.element);
        ARIAUtils.setLabel(this.element, groupTitle);
    }
    appendButtonToHeader(button) {
        this.headerButtons.push(button);
        this.headerElement.appendChild(button);
    }
    setHeaderButtonsState(disabled) {
        this.headerButtons.map(button => {
            button.disabled = disabled;
        });
    }
    appendField(title, textValue) {
        let row = this.fieldMap.get(title);
        if (!row) {
            row = this.fieldList.createChild('div', 'report-field');
            row.createChild('div', 'report-field-name').textContent = title;
            this.fieldMap.set(title, row);
            row.createChild('div', 'report-field-value');
        }
        if (textValue && row.lastElementChild) {
            row.lastElementChild.textContent = textValue;
        }
        return row.lastElementChild;
    }
    appendFlexedField(title, textValue) {
        const field = this.appendField(title, textValue);
        field.classList.add('report-field-value-is-flexed');
        return field;
    }
    removeField(title) {
        const row = this.fieldMap.get(title);
        if (row) {
            row.remove();
        }
        this.fieldMap.delete(title);
    }
    setFieldVisible(title, visible) {
        const row = this.fieldMap.get(title);
        if (row) {
            row.classList.toggle('hidden', !visible);
        }
    }
    fieldValue(title) {
        const row = this.fieldMap.get(title);
        return row ? row.lastElementChild : null;
    }
    appendRow() {
        return this.fieldList.createChild('div', 'report-row');
    }
    appendSelectableRow() {
        return this.fieldList.createChild('div', 'report-row report-row-selectable');
    }
    clearContent() {
        this.fieldList.removeChildren();
        this.fieldMap.clear();
    }
    markFieldListAsGroup() {
        ARIAUtils.markAsGroup(this.fieldList);
        ARIAUtils.setLabel(this.fieldList, this.title());
    }
    setIconMasked(masked) {
        this.element.classList.toggle('show-mask', masked);
    }
}
//# sourceMappingURL=ReportView.js.map