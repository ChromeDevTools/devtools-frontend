// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

declare global {
  interface HTMLElementTagNameMap {
    'devtools-timeline-webvitals-tooltip': WebVitalsTooltip;
  }
}

export interface WebVitalsTooltipData {
  content: LitHtml.TemplateResult|null;
}

export class WebVitalsTooltip extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private content: LitHtml.TemplateResult|null = null;

  set data(data: WebVitalsTooltipData) {
    this.content = data.content;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }


  private render(): void {
    // clang-format off
    LitHtml.render(LitHtml.html`
    <style>
        .tooltip {
          padding: 6px 8px;
          border-radius: 3px;
          box-shadow: var(--drop-shadow);
          background: var(--color-background);
        }

        .table {
          border-collapse: collapse;
          min-width: 200px;
        }

        .table td {
          padding: 4px;
        }

        .table td:nth-child(1) {
          width: 0%;
        }

        .table td:nth-child(2) {
          width: auto;
        }

        .table td:nth-child(3) {
          text-align: right;
          color: var(--color-text-disabled);
        }

        .title {
          font-weight: bold;
        }

        .small {
          font-weight: normal;
          color: var(--color-text-disabled);
        }

        .good {
          display: block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--lighthouse-green);
        }

        .medium {
          display: block;
          width: 12px;
          height: 12px;
          background: var(--lighthouse-orange);
        }

        .bad {
          display: block;
          border: 1px solid transparent;
          border-width: 0 6px 12px 6px;
          border-bottom-color: var(--lighthouse-red);
          width: 0;
        }
      </style>
      <div class="tooltip">
        ${this.content}
      </div>
    `, this.shadow);
    // clang-format off
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-timeline-webvitals-tooltip', WebVitalsTooltip);
