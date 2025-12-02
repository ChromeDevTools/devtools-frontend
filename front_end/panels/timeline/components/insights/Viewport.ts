// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {ViewportInsightModel} from '../../../../models/trace/insights/Viewport.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {nodeLink} from './NodeLink.js';

const {html} = Lit;

export class Viewport extends BaseInsightComponent<ViewportInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-viewport`;
  override internalName = 'viewport';

  protected override hasAskAiSupport(): boolean {
    return true;
  }

  override getEstimatedSavingsTime(): Trace.Types.Timing.Milli|null {
    return this.model?.metricSavings?.INP ?? null;
  }

  renderContent(): Lit.LitTemplate {
    if (!this.model || !this.model.viewportEvent) {
      return Lit.nothing;
    }

    const backendNodeId = this.model.viewportEvent.args.data.node_id;
    if (backendNodeId === undefined) {
      return Lit.nothing;
    }

    // clang-format off
    return html`
      <div>
        ${nodeLink({
          backendNodeId,
          frame: this.model.viewportEvent.args.data.frame ?? '',
          options: {tooltip: this.model.viewportEvent.args.data.content},
          fallbackHtmlSnippet: `<meta name=viewport content="${this.model.viewportEvent.args.data.content}">`,
        })}
      </div>`;
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-viewport': Viewport;
  }
}

customElements.define('devtools-performance-viewport', Viewport);
