// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Buttons from '../components/buttons/buttons.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import * as ARIAUtils from './ARIAUtils.js';
import reportViewStyles from './reportView.css.legacy.js';
import {Toolbar} from './Toolbar.js';
import {Tooltip} from './Tooltip.js';
import {VBox} from './Widget.js';

/**
 * @deprecated Please consider using the web component version of this widget
 *             (`ui/components/report_view/ReportView.ts`) for new code.
 */
export class ReportView extends VBox {
  private readonly contentBox: HTMLElement;
  private headerElement: HTMLElement;
  private titleElement: HTMLElement;
  private readonly sectionList: HTMLElement;
  private subtitleElement?: HTMLElement;
  private urlElement?: HTMLElement;
  constructor(title?: string) {
    super(true);
    this.registerRequiredCSS(reportViewStyles);

    this.contentBox = this.contentElement.createChild('div', 'report-content-box');
    this.headerElement = this.contentBox.createChild('div', 'report-header vbox');
    this.titleElement = this.headerElement.createChild('div', 'report-title');
    if (title) {
      this.titleElement.textContent = title;
    } else {
      this.headerElement.classList.add('hidden');
    }
    ARIAUtils.markAsHeading(this.titleElement, 1);

    this.sectionList = this.contentBox.createChild('div', 'vbox');
  }

  getHeaderElement(): Element {
    return this.headerElement;
  }

  setTitle(title: string): void {
    if (this.titleElement.textContent === title) {
      return;
    }
    this.titleElement.textContent = title;
    this.headerElement.classList.toggle('hidden', Boolean(title));
  }

  setSubtitle(subtitle: string): void {
    if (this.subtitleElement && this.subtitleElement.textContent === subtitle) {
      return;
    }
    if (!this.subtitleElement) {
      this.subtitleElement = this.headerElement.createChild('div', 'report-subtitle');
    }
    this.subtitleElement.textContent = subtitle;
  }

  setURL(link: Element|null): void {
    if (!this.urlElement) {
      this.urlElement = this.headerElement.createChild('div', 'report-url link');
    }
    this.urlElement.removeChildren();
    if (link) {
      this.urlElement.appendChild(link);
    }
    this.urlElement.setAttribute('jslog', `${VisualLogging.link('source-location').track({click: true})}`);
  }

  createToolbar(): Toolbar {
    const toolbar = new Toolbar('');
    this.headerElement.appendChild(toolbar.element);
    return toolbar;
  }

  appendSection(title: string, className?: string, jslogContext?: string): Section {
    const section = new Section(title, className, jslogContext);
    section.show(this.sectionList);
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
      section.show(this.sectionList);
    }
  }

  setHeaderVisible(visible: boolean): void {
    this.headerElement.classList.toggle('hidden', !visible);
  }

  setBodyScrollable(scrollable: boolean): void {
    this.contentBox.classList.toggle('no-scroll', !scrollable);
  }
}

export class Section extends VBox {
  private readonly headerElement: HTMLElement;
  private headerButtons: Buttons.Button.Button[];
  private titleElement: HTMLElement;
  private fieldList: HTMLElement;
  private readonly fieldMap: Map<string, Element>;
  constructor(title: string, className?: string, public jslogContext?: string) {
    super();
    this.element.classList.add('report-section');
    if (className) {
      this.element.classList.add(className);
    }
    if (jslogContext) {
      this.element.setAttribute('jslog', `${VisualLogging.section(jslogContext)}`);
    }
    this.jslogContext = jslogContext;
    this.headerButtons = [];
    this.headerElement = this.element.createChild('div', 'report-section-header');
    this.titleElement = this.headerElement.createChild('div', 'report-section-title');
    this.setTitle(title);
    ARIAUtils.markAsHeading(this.titleElement, 2);
    this.fieldList = this.element.createChild('div', 'vbox');
    this.fieldMap = new Map();
  }

  title(): string {
    return this.titleElement.textContent || '';
  }

  getTitleElement(): Element {
    return this.titleElement;
  }

  getFieldElement(): HTMLElement {
    return this.fieldList;
  }
  appendFieldWithCustomView(customElement: HTMLElement): void {
    this.fieldList.append(customElement);
  }

  setTitle(title: string, tooltip?: string): void {
    if (this.titleElement.textContent !== title) {
      this.titleElement.textContent = title;
    }
    Tooltip.install(this.titleElement, tooltip || '');
    this.titleElement.classList.toggle('hidden', !this.titleElement.textContent);
  }

  /**
   * Declares the overall container to be a group and assigns a title.
   */
  setUiGroupTitle(groupTitle: string): void {
    ARIAUtils.markAsGroup(this.element);
    ARIAUtils.setLabel(this.element, groupTitle);
  }

  appendButtonToHeader(button: Buttons.Button.Button): void {
    this.headerButtons.push(button);
    this.headerElement.appendChild(button);
  }

  setHeaderButtonsState(disabled: boolean): void {
    this.headerButtons.map(button => {
      button.disabled = disabled;
    });
  }

  appendField(title: string, textValue?: string): HTMLElement {
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
    return row.lastElementChild as HTMLElement;
  }

  appendFlexedField(title: string, textValue?: string): Element {
    const field = this.appendField(title, textValue);
    field.classList.add('report-field-value-is-flexed');
    return field;
  }

  removeField(title: string): void {
    const row = this.fieldMap.get(title);
    if (row) {
      row.remove();
    }
    this.fieldMap.delete(title);
  }

  setFieldVisible(title: string, visible: boolean): void {
    const row = this.fieldMap.get(title);
    if (row) {
      row.classList.toggle('hidden', !visible);
    }
  }

  fieldValue(title: string): Element|null {
    const row = this.fieldMap.get(title);
    return row ? row.lastElementChild : null;
  }

  appendRow(): HTMLElement {
    return this.fieldList.createChild('div', 'report-row') as HTMLElement;
  }

  appendSelectableRow(): HTMLElement {
    return this.fieldList.createChild('div', 'report-row report-row-selectable') as HTMLElement;
  }

  clearContent(): void {
    this.fieldList.removeChildren();
    this.fieldMap.clear();
  }

  markFieldListAsGroup(): void {
    ARIAUtils.markAsGroup(this.fieldList);
    ARIAUtils.setLabel(this.fieldList, this.title());
  }

  setIconMasked(masked: boolean): void {
    this.element.classList.toggle('show-mask', masked);
  }
}
