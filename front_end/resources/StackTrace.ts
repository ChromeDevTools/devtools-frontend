// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Components from '../components/components.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as LitHtml from '../third_party/lit-html/lit-html.js';
import * as UIComponents from '../ui/components/components.js';

const UIStrings = {
  /**
  *@description Error message stating that something went wrong when tring to render stack trace
  */
  cannotRenderStackTrace: 'Cannot not render stack trace',
};
const str_ = i18n.i18n.registerUIStrings('resources/StackTrace.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface StackTraceData {
  frame: SDK.ResourceTreeModel.ResourceTreeFrame;
}

export class StackTrace extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private readonly linkifier = new Components.Linkifier.Linkifier();
  private expandableRows: LitHtml.TemplateResult[] = [];

  set data(data: StackTraceData) {
    const frame = data.frame;
    let stackTraceRows: (Components.JSPresentationUtils.StackTraceRegularRow|
                         Components.JSPresentationUtils.StackTraceAsyncRow)[] = [];
    if (frame && frame._creationStackTrace) {
      stackTraceRows = Components.JSPresentationUtils.buildStackTraceRows(
          frame._creationStackTrace, frame.resourceTreeModel().target(), this.linkifier, true,
          this.createRowTemplates.bind(this));
    }
    this.createRowTemplates(stackTraceRows);
  }

  private createRowTemplates(stackTraceRows: (Components.JSPresentationUtils.StackTraceRegularRow|
                                              Components.JSPresentationUtils.StackTraceAsyncRow)[]): void {
    this.expandableRows = [];
    for (const item of stackTraceRows) {
      if ('functionName' in item) {
        this.expandableRows.push(LitHtml.html`
        <style>
        .stack-trace-row {
          display: flex;
        }

        .stack-trace-function-name {
          width: 100px;
        }

        .stack-trace-source-location {
          display: flex;
          overflow: hidden;
        }

        .text-ellipsis {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ignore-list-link {
          opacity: 60%;
        }
      </style>
          <div class="stack-trace-row">
            <div class="stack-trace-function-name text-ellipsis" title="${item.functionName}">
              ${item.functionName}
            </div>
            <div class="stack-trace-source-location">
              ${item.link ? LitHtml.html`<div class="text-ellipsis">@\xA0${item.link}</div>` : LitHtml.nothing}
            </div>
          </div>
        `);
      }
      if ('asyncDescription' in item) {
        this.expandableRows.push(LitHtml.html`
          <div>${item.asyncDescription}</div>
        `);
      }
    }
    this.render();
  }

  private render(): void {
    if (!this.expandableRows.length) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      LitHtml.render(
        LitHtml.html`
          <span>${i18nString(UIStrings.cannotRenderStackTrace)}</span>
        `,
        this.shadow);
      return;
    }
    LitHtml.render(
      LitHtml.html`
        <devtools-expandable-list .data=${{
          rows: this.expandableRows,
        } as UIComponents.ExpandableList.ExpandableListData}>
        </devtools-expandable-list>
      `,
      this.shadow);
    // clang-format on
  }
}

customElements.define('devtools-resources-stack-trace', StackTrace);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-resources-stack-trace': StackTrace;
  }
}
