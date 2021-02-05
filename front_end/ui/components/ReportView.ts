// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../third_party/lit-html/lit-html.js';

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
  private readonly shadow = this.attachShadow({mode: 'open'});
  private reportTitle: string = '';

  set data({reportTitle}: ReportData) {
    this.reportTitle = reportTitle;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <style>
        .content {
          background-color: var(--color-background);
          display: grid;
          grid-template-columns: min-content 1fr;
        }

        .report-title {
          padding: 12px 24px;
          font-size: 15px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          border-bottom: 1px solid var(--color-details-hairline);
          color: var(--color-text-primary);
          background-color: var(--color-background);
          grid-column-start: span 2;
        }
      </style>

      <div class="content">
        ${this.reportTitle ? LitHtml.html`<div class="report-title">${this.reportTitle}</div>` : LitHtml.nothing}
        <slot></slot>
      </div>
    `, this.shadow);
    // clang-format on
  }
}

export interface ReportSectionData {
  sectionTitle: string;
}

export class ReportSectionHeader extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <style>
        :host {
          grid-column-start: span 2;
        }

        .section-header {
          padding: 12px;
          margin-left: 18px;
          display: flex;
          flex-direction: row;
          align-items: center;
          flex: auto;
          text-overflow: ellipsis;
          overflow: hidden;
          font-weight: bold;
          color: var(--color-text-primary);
        }
      </style>
      <div class="section-header">
        <slot></slot>
      </div>
    `, this.shadow);
    // clang-format on
  }
}

export class ReportSectionDivider extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <style>
        :host {
          grid-column-start: span 2;
        }

        .section-divider {
          border-bottom: 1px solid var(--color-details-hairline);
        }
      </style>
      <div class="section-divider">
      </div>
    `, this.shadow);
    // clang-format on
  }
}

export class ReportKey extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <style>
        :host {
          line-height: 28px;
          margin: 0 0 8px 0;
        }

        .key {
          color: var(--color-text-secondary);
          padding: 0 6px;
          text-align: right;
          white-space: pre;
        }
      </style>
      <div class="key"><slot></slot></div>
    `, this.shadow);
    // clang-format on
  }
}

export class ReportValue extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <style>
        :host {
          line-height: 28px;
          margin: 0 0 8px 0;
          min-width: 150px;
        }

        .value {
          color: var(--color-text-primary);
          margin-inline-start: 0;
          padding: 0 6px;
        }
      </style>
      <div class="value"><slot></slot></div>
    `, this.shadow);
    // clang-format on
  }
}

customElements.define('devtools-report', Report);
customElements.define('devtools-report-section-header', ReportSectionHeader);
customElements.define('devtools-report-key', ReportKey);
customElements.define('devtools-report-value', ReportValue);
customElements.define('devtools-report-divider', ReportSectionDivider);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-report': Report;
    'devtools-report-section-header': ReportSectionHeader;
    'devtools-report-key': ReportKey;
    'devtools-report-value': ReportValue;
    'devtools-report-divider': ReportSectionDivider;
  }
}
