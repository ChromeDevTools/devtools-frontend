// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ARIAUtils from './ARIAUtils.js';
import {Toolbar} from './Toolbar.js';
import {VBox} from './Widget.js';

/**
 * @unrestricted
 */
export class ReportView extends VBox {
  /**
   * @param {string=} title
   */
  constructor(title) {
    super(true);
    this.registerRequiredCSS('ui/reportView.css');

    this._contentBox = this.contentElement.createChild('div', 'report-content-box');
    this._headerElement = this._contentBox.createChild('div', 'report-header vbox');
    this._titleElement = this._headerElement.createChild('div', 'report-title');
    this._titleElement.textContent = title;
    ARIAUtils.markAsHeading(this._titleElement, 1);

    this._sectionList = this._contentBox.createChild('div', 'vbox');
  }

  /**
   * @param {string} title
   */
  setTitle(title) {
    if (this._titleElement.textContent === title) {
      return;
    }
    this._titleElement.textContent = title;
  }

  /**
   * @param {string} subtitle
   */
  setSubtitle(subtitle) {
    if (this._subtitleElement && this._subtitleElement.textContent === subtitle) {
      return;
    }
    if (!this._subtitleElement) {
      this._subtitleElement = this._headerElement.createChild('div', 'report-subtitle');
    }
    this._subtitleElement.textContent = subtitle;
  }

  /**
   * @param {?Element} link
   */
  setURL(link) {
    if (!this._urlElement) {
      this._urlElement = this._headerElement.createChild('div', 'report-url link');
    }
    this._urlElement.removeChildren();
    if (link) {
      this._urlElement.appendChild(link);
    }
  }

  /**
   * @return {!Toolbar}
   */
  createToolbar() {
    const toolbar = new Toolbar('');
    this._headerElement.appendChild(toolbar.element);
    return toolbar;
  }

  /**
   * @param {string} title
   * @param {string=} className
   * @return {!Section}
   */
  appendSection(title, className) {
    const section = new Section(title, className);
    section.show(this._sectionList);
    return section;
  }

  /**
   * @param {function(!Section, !Section): number} comparator
   */
  sortSections(comparator) {
    const sections = /** @type {!Array<!Section>} */ (this.children().slice());
    const sorted = sections.every((e, i, a) => !i || comparator(a[i - 1], a[i]) <= 0);
    if (sorted) {
      return;
    }

    this.detachChildWidgets();
    sections.sort(comparator);
    for (const section of sections) {
      section.show(this._sectionList);
    }
  }

  /**
   * @param {boolean} visible
   */
  setHeaderVisible(visible) {
    this._headerElement.classList.toggle('hidden', !visible);
  }

  /**
   * @param {boolean} scrollable
   */
  setBodyScrollable(scrollable) {
    this._contentBox.classList.toggle('no-scroll', !scrollable);
  }
}

/**
 * @unrestricted
 */
export class Section extends VBox {
  /**
   * @param {string} title
   * @param {string=} className
   */
  constructor(title, className) {
    super();
    this.element.classList.add('report-section');
    if (className) {
      this.element.classList.add(className);
    }
    this._headerElement = this.element.createChild('div', 'report-section-header');
    this._titleElement = this._headerElement.createChild('div', 'report-section-title');
    this.setTitle(title);
    ARIAUtils.markAsHeading(this._titleElement, 2);
    this._fieldList = this.element.createChild('div', 'vbox');
    /** @type {!Map.<string, !Element>} */
    this._fieldMap = new Map();
  }

  /**
   * @return {string}
   */
  title() {
    return this._titleElement.textContent;
  }

  /**
   * @param {string} title
   */
  setTitle(title) {
    if (this._titleElement.textContent !== title) {
      this._titleElement.textContent = title;
    }
    this._titleElement.classList.toggle('hidden', !this._titleElement.textContent);
  }

  /**
   * Declares the overall container to be a group and assigns a title.
   * @param {string} groupTitle
   */
  setUiGroupTitle(groupTitle) {
    ARIAUtils.markAsGroup(this.element);
    ARIAUtils.setAccessibleName(this.element, groupTitle);
  }

  /**
   * @return {!Toolbar}
   */
  createToolbar() {
    const toolbar = new Toolbar('');
    this._headerElement.appendChild(toolbar.element);
    return toolbar;
  }

  /**
   * @param {string} title
   * @param {string=} textValue
   * @return {!Element}
   */
  appendField(title, textValue) {
    let row = this._fieldMap.get(title);
    if (!row) {
      row = this._fieldList.createChild('div', 'report-field');
      row.createChild('div', 'report-field-name').textContent = title;
      this._fieldMap.set(title, row);
      row.createChild('div', 'report-field-value');
    }
    if (textValue) {
      row.lastElementChild.textContent = textValue;
    }
    return /** @type {!Element} */ (row.lastElementChild);
  }

  /**
  * @param {string} title
  * @param {string=} textValue
  * @return {!Element}
  */
  appendFlexedField(title, textValue) {
    const field = this.appendField(title, textValue);
    field.classList.add('report-field-value-is-flexed');
    return field;
  }

  /**
   * @param {string} title
   */
  removeField(title) {
    const row = this._fieldMap.get(title);
    if (row) {
      row.remove();
    }
    this._fieldMap.delete(title);
  }

  /**
   * @param {string} title
   * @param {boolean} visible
   */
  setFieldVisible(title, visible) {
    const row = this._fieldMap.get(title);
    if (row) {
      row.classList.toggle('hidden', !visible);
    }
  }

  /**
   * @param {string} title
   * @return {?Element}
   */
  fieldValue(title) {
    const row = this._fieldMap.get(title);
    return row ? row.lastElementChild : null;
  }

  /**
   * @return {!Element}
   */
  appendRow() {
    return this._fieldList.createChild('div', 'report-row');
  }

  /**
   * @return {!Element}
   */
  appendSelectableRow() {
    return this._fieldList.createChild('div', 'report-row report-row-selectable');
  }

  clearContent() {
    this._fieldList.removeChildren();
    this._fieldMap.clear();
  }

  markFieldListAsGroup() {
    ARIAUtils.markAsGroup(this._fieldList);
    ARIAUtils.setAccessibleName(this._fieldList, this.title());
  }

  /**
   * @param {boolean} masked
   */
  setIconMasked(masked) {
    this.element.classList.toggle('show-mask', masked);
  }
}
