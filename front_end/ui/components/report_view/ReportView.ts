// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import {html, nothing, render} from '../../lit/lit.js';

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
 *   <devtools-report .data=${{reportTitle: 'Optional Title'}}>
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
  readonly #shadow = this.attachShadow({mode: 'open'});
  #reportTitle = '';

  set data({reportTitle}: ReportData) {
    this.#reportTitle = reportTitle;
    this.#render();
  }

  connectedCallback(): void {
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>${reportStyles}</style>
      ${this.#reportTitle ? html`<div class="report-title">${this.#reportTitle}</div>` : nothing}
      <div class="content">
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
  readonly #shadow = this.attachShadow({mode: 'open'});
  connectedCallback(): void {
    this.#render();
  }
  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>${reportSectionStyles}</style>
      <div class="section">
        <slot></slot>
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

export class ReportSectionHeader extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  connectedCallback(): void {
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>${reportSectionHeaderStyles}</style>
      <div class="section-header">
        <slot></slot>
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

export class ReportSectionDivider extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  connectedCallback(): void {
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>${reportSectionDividerStyles}</style>
      <div class="section-divider">
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

export class ReportKey extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  connectedCallback(): void {
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>${reportKeyStyles}</style>
      <div class="key"><slot></slot></div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

export class ReportValue extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  connectedCallback(): void {
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>${reportValueStyles}</style>
      <div class="value"><slot></slot></div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-report', Report);
customElements.define('devtools-report-section', ReportSection);
customElements.define('devtools-report-section-header', ReportSectionHeader);
customElements.define('devtools-report-key', ReportKey);
customElements.define('devtools-report-value', ReportValue);
customElements.define('devtools-report-divider', ReportSectionDivider);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-report': Report;
    'devtools-report-section': ReportSection;
    'devtools-report-section-header': ReportSectionHeader;
    'devtools-report-key': ReportKey;
    'devtools-report-value': ReportValue;
    'devtools-report-divider': ReportSectionDivider;
  }
}
