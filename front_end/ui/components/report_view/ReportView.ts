// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../components/helpers/helpers.js';
import * as LitHtml from '../../lit-html/lit-html.js';

import reportStyles from './report.css.js';
import reportKeyStyles from './reportKey.css.js';
import reportSectionStyles from './reportSection.css.js';
import reportSectionDividerStyles from './reportSectionDivider.css.js';
import reportSectionHeaderStyles from './reportSectionHeader.css.js';
import reportValueStyles from './reportValue.css.js';

/**
 * The `Report` component can be used to display static information. A report
 * usually consists of multiple sections where each section has rows of name/value
 * pairs. The exact structure of a report is determined by the user, as is the
 * rendering and content of the individual name/value pairs.
 *
 * Example:
 * ```
 *   <devtools-report .data=${{reportTitle: 'Optional Title'} as Components.ReportView.ReportData}>
 *     <devtools-report-section-header>Some Header</devtools-report-section-header>
 *     <devtools-report-key>Key (rendered in the left column)</devtools-report-key>
 *     <devtools-report-value>Value (rendered in the right column)</devtools-report-value>
 *     <devtools-report-key class="foo">Name (with custom styling)</devtools-report-key>
 *     <devtools-report-value>Some Value</devtools-report-value>
 *     <devtools-report-divider></devtools-report-divider>
 *   </devtools-report>
 * ```
 * The component is intended to replace UI.ReportView in an idiomatic way.
 */
export interface ReportData {
  reportTitle: string;
}
export class Report extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-report`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  #reportTitle: string = '';

  set data({reportTitle}: ReportData) {
    this.#reportTitle = reportTitle;
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [reportStyles];
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <div class="content">
        ${this.#reportTitle ? LitHtml.html`<div class="report-title">${this.#reportTitle}</div>` : LitHtml.nothing}
        <slot></slot>
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

export interface ReportSectionData {
  sectionTitle: string;
}

export class ReportSection extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-report-section`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [reportSectionStyles];
    this.#render();
  }
  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <div class="section">
        <slot></slot>
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

export class ReportSectionHeader extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-report-section-header`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [reportSectionHeaderStyles];
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <div class="section-header">
        <slot></slot>
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

export class ReportSectionDivider extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-report-divider`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [reportSectionDividerStyles];
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <div class="section-divider">
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

export class ReportKey extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-report-key`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [reportKeyStyles];
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <div class="key"><slot></slot></div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

export class ReportValue extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-report-value`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [reportValueStyles];
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <div class="value"><slot></slot></div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-report', Report);
ComponentHelpers.CustomElements.defineComponent('devtools-report-section', ReportSection);
ComponentHelpers.CustomElements.defineComponent('devtools-report-section-header', ReportSectionHeader);
ComponentHelpers.CustomElements.defineComponent('devtools-report-key', ReportKey);
ComponentHelpers.CustomElements.defineComponent('devtools-report-value', ReportValue);
ComponentHelpers.CustomElements.defineComponent('devtools-report-divider', ReportSectionDivider);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-report': Report;
    'devtools-report-section': ReportSection;
    'devtools-report-section-header': ReportSectionHeader;
    'devtools-report-key': ReportKey;
    'devtools-report-value': ReportValue;
    'devtools-report-divider': ReportSectionDivider;
  }
}
