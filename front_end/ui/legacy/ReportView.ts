// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as ARIAUtils from './ARIAUtils.js';
import {Toolbar} from './Toolbar.js';
import {Tooltip} from './Tooltip.js';
import {VBox} from './Widget.js';

/**
 * @deprecated Please consider using the web component version of this widget
 *             (`ui/components/report_view/ReportView.ts`) for new code.
 */
export class ReportView extends VBox {
  _contentBox: HTMLElement;
  _headerElement: HTMLElement;
  _titleElement: HTMLElement;
  _sectionList: HTMLElement;
  _subtitleElement?: HTMLElement;
  _urlElement?: HTMLElement;
  constructor(title?: string) {
    super(true);
    this.registerRequiredCSS('ui/legacy/reportView.css');

    this._contentBox = this.contentElement.createChild('div', 'report-content-box');
    this._headerElement = this._contentBox.createChild('div', 'report-header vbox');
    this._titleElement = this._headerElement.createChild('div', 'report-title');
    if (title) {
      this._titleElement.textContent = title;
    } else {
      this._headerElement.classList.add('hidden');
    }
    ARIAUtils.markAsHeading(this._titleElement, 1);

    this._sectionList = this._contentBox.createChild('div', 'vbox');
  }

  setTitle(title: string): void {
    if (this._titleElement.textContent === title) {
      return;
    }
    this._titleElement.textContent = title;
    this._headerElement.classList.toggle('hidden', Boolean(title));
  }

  setSubtitle(subtitle: string): void {
    if (this._subtitleElement && this._subtitleElement.textContent === subtitle) {
      return;
    }
    if (!this._subtitleElement) {
      this._subtitleElement = this._headerElement.createChild('div', 'report-subtitle');
    }
    this._subtitleElement.textContent = subtitle;
  }

  setURL(link: Element|null): void {
    if (!this._urlElement) {
      this._urlElement = this._headerElement.createChild('div', 'report-url link');
    }
    this._urlElement.removeChildren();
    if (link) {
      this._urlElement.appendChild(link);
    }
  }

  createToolbar(): Toolbar {
    const toolbar = new Toolbar('');
    this._headerElement.appendChild(toolbar.element);
    return toolbar;
  }

  appendSection(title: string, className?: string): Section {
    const section = new Section(title, className);
    section.show(this._sectionList);
    return section;
  }

  sortSections(comparator: (arg0: Section, arg1: Section) => number): void {
    const sections = (this.children().slice() as Section[]);
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

  setHeaderVisible(visible: boolean): void {
    this._headerElement.classList.toggle('hidden', !visible);
  }

  setBodyScrollable(scrollable: boolean): void {
    this._contentBox.classList.toggle('no-scroll', !scrollable);
  }
}

export class Section extends VBox {
  _headerElement: HTMLElement;
  _titleElement: HTMLElement;
  _fieldList: HTMLElement;
  _fieldMap: Map<string, Element>;
  constructor(title: string, className?: string) {
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
    this._fieldMap = new Map();
  }

  title(): string {
    return this._titleElement.textContent || '';
  }

  setTitle(title: string, tooltip?: string): void {
    if (this._titleElement.textContent !== title) {
      this._titleElement.textContent = title;
    }
    Tooltip.install(this._titleElement, tooltip || '');
    this._titleElement.classList.toggle('hidden', !this._titleElement.textContent);
  }

  /**
   * Declares the overall container to be a group and assigns a title.
   */
  setUiGroupTitle(groupTitle: string): void {
    ARIAUtils.markAsGroup(this.element);
    ARIAUtils.setAccessibleName(this.element, groupTitle);
  }

  createToolbar(): Toolbar {
    const toolbar = new Toolbar('');
    this._headerElement.appendChild(toolbar.element);
    return toolbar;
  }

  appendField(title: string, textValue?: string): HTMLElement {
    let row = this._fieldMap.get(title);
    if (!row) {
      row = this._fieldList.createChild('div', 'report-field');
      row.createChild('div', 'report-field-name').textContent = title;
      this._fieldMap.set(title, row);
      row.createChild('div', 'report-field-value');
    }
    if (textValue && row.lastElementChild) {
      row.lastElementChild.textContent = textValue;
    }
    return /** @type {!HTMLElement} */ row.lastElementChild as HTMLElement;
  }

  appendFlexedField(title: string, textValue?: string): Element {
    const field = this.appendField(title, textValue);
    field.classList.add('report-field-value-is-flexed');
    return field;
  }

  removeField(title: string): void {
    const row = this._fieldMap.get(title);
    if (row) {
      row.remove();
    }
    this._fieldMap.delete(title);
  }

  setFieldVisible(title: string, visible: boolean): void {
    const row = this._fieldMap.get(title);
    if (row) {
      row.classList.toggle('hidden', !visible);
    }
  }

  fieldValue(title: string): Element|null {
    const row = this._fieldMap.get(title);
    return row ? row.lastElementChild : null;
  }

  appendRow(): HTMLElement {
    return /** @type {!HTMLElement} */ this._fieldList.createChild('div', 'report-row') as HTMLElement;
  }

  appendSelectableRow(): HTMLElement {
    return /** @type {!HTMLElement} */ this._fieldList.createChild('div', 'report-row report-row-selectable') as
        HTMLElement;
  }

  clearContent(): void {
    this._fieldList.removeChildren();
    this._fieldMap.clear();
  }

  markFieldListAsGroup(): void {
    ARIAUtils.markAsGroup(this._fieldList);
    ARIAUtils.setAccessibleName(this._fieldList, this.title());
  }

  setIconMasked(masked: boolean): void {
    this.element.classList.toggle('show-mask', masked);
  }
}
