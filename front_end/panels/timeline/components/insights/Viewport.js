// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { nodeLink } from './NodeLink.js';
const { html } = Lit;
export class Viewport extends BaseInsightComponent {
    static litTagName = Lit.StaticHtml.literal `devtools-performance-viewport`;
    internalName = 'viewport';
    hasAskAiSupport() {
        return true;
    }
    getEstimatedSavingsTime() {
        return this.model?.metricSavings?.INP ?? null;
    }
    renderContent() {
        if (!this.model || !this.model.viewportEvent) {
            return Lit.nothing;
        }
        const backendNodeId = this.model.viewportEvent.args.data.node_id;
        if (backendNodeId === undefined) {
            return Lit.nothing;
        }
        // clang-format off
        return html `
      <div>
        ${nodeLink({
            backendNodeId,
            frame: this.model.viewportEvent.args.data.frame ?? '',
            options: { tooltip: this.model.viewportEvent.args.data.content },
            fallbackHtmlSnippet: `<meta name=viewport content="${this.model.viewportEvent.args.data.content}">`,
        })}
      </div>`;
        // clang-format on
    }
}
customElements.define('devtools-performance-viewport', Viewport);
//# sourceMappingURL=Viewport.js.map