// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
UI.ReportView = class extends UI.VBox {
  /**
   * @param {string} title
   */
  constructor(title) {
    super(true);
    this.registerRequiredCSS('ui/reportView.css');

    var contentBox = this.contentElement.createChild('div', 'report-content-box');
    this._headerElement = contentBox.createChild('div', 'report-header vbox');
    this._headerElement.createChild('div', 'report-title').textContent = title;

    this._sectionList = contentBox.createChild('div', 'vbox');
  }

  /**
   * @param {string} subtitle
   */
  setSubtitle(subtitle) {
    if (this._subtitleElement && this._subtitleElement.textContent === subtitle)
      return;
    if (!this._subtitleElement)
      this._subtitleElement = this._headerElement.createChild('div', 'report-subtitle');
    this._subtitleElement.textContent = subtitle;
  }

  /**
   * @param {?Element} link
   */
  setURL(link) {
    if (!this._urlElement)
      this._urlElement = this._headerElement.createChild('div', 'report-url link');
    this._urlElement.removeChildren();
    if (link)
      this._urlElement.appendChild(link);
  }

  /**
   * @return {!UI.Toolbar}
   */
  createToolbar() {
    var toolbar = new UI.Toolbar('');
    this._headerElement.appendChild(toolbar.element);
    return toolbar;
  }

  /**
   * @param {string} title
   * @param {string=} className
   * @return {!UI.ReportView.Section}
   */
  appendSection(title, className) {
    var section = new UI.ReportView.Section(title, className);
    section.show(this._sectionList);
    return section;
  }

  removeAllSection() {
    this._sectionList.removeChildren();
  }
};

/**
 * @unrestricted
 */
UI.ReportView.Section = class extends UI.VBox {
  /**
   * @param {string} title
   * @param {string=} className
   */
  constructor(title, className) {
    super();
    this.element.classList.add('report-section');
    if (className)
      this.element.classList.add(className);
    this._headerElement = this.element.createChild('div', 'report-section-header');
    this._titleElement = this._headerElement.createChild('div', 'report-section-title');
    this._titleElement.textContent = title;
    this._fieldList = this.element.createChild('div', 'vbox');
    /** @type {!Map.<string, !Element>} */
    this._fieldMap = new Map();
  }

  /**
   * @param {string} title
   */
  setTitle(title) {
    if (this._titleElement.textContent !== title)
      this._titleElement.textContent = title;
  }

  /**
   * @return {!UI.Toolbar}
   */
  createToolbar() {
    var toolbar = new UI.Toolbar('');
    this._headerElement.appendChild(toolbar.element);
    return toolbar;
  }

  /**
   * @param {string} title
   * @param {string=} textValue
   * @return {!Element}
   */
  appendField(title, textValue) {
    var row = this._fieldMap.get(title);
    if (!row) {
      row = this._fieldList.createChild('div', 'report-field');
      row.createChild('div', 'report-field-name').textContent = title;
      this._fieldMap.set(title, row);
      row.createChild('div', 'report-field-value');
    }
    if (textValue)
      row.lastElementChild.textContent = textValue;
    return /** @type {!Element} */ (row.lastElementChild);
  }

  remove() {
    this.element.remove();
  }

  /**
   * @param {string} title
   */
  removeField(title) {
    var row = this._fieldMap.get(title);
    if (row)
      row.remove();
    this._fieldMap.delete(title);
  }

  /**
   * @param {string} title
   * @param {boolean} visible
   */
  setFieldVisible(title, visible) {
    var row = this._fieldMap.get(title);
    if (row)
      row.classList.toggle('hidden', !visible);
  }

  /**
   * @param {string} title
   * @return {?Element}
   */
  fieldValue(title) {
    var row = this._fieldMap.get(title);
    return row ? row.lastElementChild : null;
  }

  /**
   * @return {!Element}
   */
  appendRow() {
    return this._fieldList.createChild('div', 'report-row');
  }

  clearContent() {
    this._fieldList.removeChildren();
    this._fieldMap.clear();
  }
};
