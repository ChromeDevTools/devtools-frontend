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
 * Example (without the data setters):
 * ```
 *   <devtools-report>
 *     <devtools-report-section>
 *       <devtools-report-row>
 *         <span slot="name">Name (rendered in the left column)</span>
 *         <span slot="value">Value (rendered in the right column)</span>
 *       </devtools-report-row>
  *       <devtools-report-row>
 *         <span slot="name" class="foo">Name (with custom styling)</span>
 *         <span slot="value">Some Value</span>
 *       </devtools-report-row>
 *     </devtools-report-section>
 *   </devtools-report>
 * ```
 * The component is intended to replace UI.ReportView in an idiomatic way.
 *
 * CSS variables to control the behavior of the component:
 *
 *   `--name-column-width`: The width of the left hand side column.
 */
export class Report extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});

  connectedCallback() {
    this.render();
  }

  private render() {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <style>
        .content {
          background-color:  var(--color-background);
          overflow: auto;
        }
      </style>

      <div class="content">
        <slot></slot>
      </div>
    `, this.shadow);
    // clang-format on
  }
}

export interface ReportSectionData {
  sectionTitle: string;
}

/**
 * Each report consists of an arbirtray number of sections.
 *
 * Semantically, each section is a <dl> with each row beeing
 * a pair of <dt> and <dd>.
 */
export class ReportSection extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private sectionTitle: string = '';

  set data({sectionTitle}: ReportSectionData) {
    this.sectionTitle = sectionTitle;
    this.render();
  }

  private render() {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <style>
        .section {
          display: flex;
          padding: 12px;
          border-bottom: 1px solid var(--color-details-hairline);
          flex-direction: column;
        }

        .header {
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
      <div class="section">
        <div class="header">${this.sectionTitle}</div>
        <dl><slot></slot></dl>
      </div>
    `, this.shadow);
    // clang-format on
  }
}

/**
 * Each report section can consist of arbitrary many `ReportRow`s.
 *
 * ReportRows have two slots that the user provides:
 *   - "name": Element for the left hand side column.
 *   - "value": Element for the right hand side column.
 *
 * Please note that both slots can be filled with arbitrary elements.
 * These can be either plain HTML, other custom elements or a combination
 * thereof.
 */
export class ReportRow extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});

  connectedCallback() {
    this.render();
  }

  private render() {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <style>
        :host {
          display: flex;
          line-height: 28px;
          margin: 8px 0px 0px 0px;
        }

        .name {
          color: var(--color-text-secondary);
          flex: 0 0 var(--name-column-width, 128px);
          padding: 0 6px;
          text-align: right;
          white-space: pre;
        }

        .value {
          color: var(--color-text-primary);
          flex: auto;
          padding: 0 6px;
          white-space: pre;
        }
      </style>
      <dt class="name"><slot name="name"></slot></dt>
      <dd class="value"><slot name="value"></slot></dd>
    `, this.shadow);
    // clang-format on
  }
}

customElements.define('devtools-report', Report);
customElements.define('devtools-report-section', ReportSection);
customElements.define('devtools-report-row', ReportRow);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-report': Report;
    'devtools-report-section': ReportSection;
    'devtools-report-row': ReportRow;
  }
}
