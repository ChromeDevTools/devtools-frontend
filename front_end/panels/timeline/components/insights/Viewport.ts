// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './NodeLink.js';

import type {ViewportInsightModel} from '../../../../models/trace/insights/Viewport.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';

const {html} = LitHtml;

export class Viewport extends BaseInsightComponent<ViewportInsightModel> {
  static override readonly litTagName = LitHtml.literal`devtools-performance-viewport`;
  override internalName: string = 'viewport';

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    // TODO(b/351757418): create overlay for synthetic input delay events
    return [];
  }

  override getEstimatedSavingsTime(): Trace.Types.Timing.MilliSeconds|null {
    return this.model?.metricSavings?.INP ?? null;
  }

  #renderContent(): LitHtml.LitTemplate {
    if (!this.model) {
      return LitHtml.nothing;
    }

    const backendNodeId = this.model.viewportEvent?.args.data.node_id;

    // clang-format off
    return html`
      <div>
        ${backendNodeId !== undefined ? html`<devtools-performance-node-link
          .data=${{
            backendNodeId,
            options: {tooltip: this.model.viewportEvent?.args.data.content},
          }}>
        </devtools-performance-node-link>` : LitHtml.nothing}
      </div>`;
    // clang-format on
  }

  override render(): void {
    if (!this.model) {
      return;
    }

    this.renderWithContent(this.#renderContent());
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-viewport': Viewport;
  }
}

customElements.define('devtools-performance-viewport', Viewport);
