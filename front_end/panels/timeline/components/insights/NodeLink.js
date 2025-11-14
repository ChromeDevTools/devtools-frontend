// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as LegacyComponents from '../../../../ui/legacy/components/utils/utils.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as PanelsCommon from '../../../common/common.js';
const { html } = Lit;
export class NodeLink extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #backendNodeId;
    #frame;
    #options;
    #fallbackUrl;
    #fallbackHtmlSnippet;
    #fallbackText;
    /**
     * Track the linkified Node for a given backend NodeID to avoid repeated lookups on re-render.
     * Also tracks if we fail to resolve a node, to ensure we don't try on each subsequent re-render.
     */
    #linkifiedNodeForBackendId = new Map();
    set data(data) {
        this.#backendNodeId = data.backendNodeId;
        this.#frame = data.frame;
        this.#options = data.options;
        this.#fallbackUrl = data.fallbackUrl;
        this.#fallbackHtmlSnippet = data.fallbackHtmlSnippet;
        this.#fallbackText = data.fallbackText;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    async #linkify() {
        if (this.#backendNodeId === undefined) {
            return;
        }
        const fromCache = this.#linkifiedNodeForBackendId.get(this.#backendNodeId);
        if (fromCache) {
            if (fromCache === 'NO_NODE_FOUND') {
                return undefined;
            }
            return fromCache;
        }
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        const domModel = target?.model(SDK.DOMModel.DOMModel);
        if (!domModel) {
            return undefined;
        }
        const domNodesMap = await domModel.pushNodesByBackendIdsToFrontend(new Set([this.#backendNodeId]));
        const node = domNodesMap?.get(this.#backendNodeId);
        if (!node) {
            this.#linkifiedNodeForBackendId.set(this.#backendNodeId, 'NO_NODE_FOUND');
            return;
        }
        if (node.frameId() !== this.#frame) {
            this.#linkifiedNodeForBackendId.set(this.#backendNodeId, 'NO_NODE_FOUND');
            return;
        }
        // TODO: it'd be nice if we could specify what attributes to render,
        // ex for the Viewport insight: <meta content="..."> (instead of just <meta>)
        const linkedNode = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node, this.#options);
        this.#linkifiedNodeForBackendId.set(this.#backendNodeId, linkedNode);
        return linkedNode;
    }
    async #render() {
        const relatedNodeEl = await this.#linkify();
        let template;
        if (relatedNodeEl) {
            template = html `<div class='node-link'>${relatedNodeEl}</div>`;
        }
        else if (this.#fallbackUrl) {
            const MAX_URL_LENGTH = 20;
            const options = {
                tabStop: true,
                showColumnNumber: false,
                inlineFrameIndex: 0,
                maxLength: MAX_URL_LENGTH,
            };
            const linkEl = LegacyComponents.Linkifier.Linkifier.linkifyURL(this.#fallbackUrl, options);
            template = html `<div class='node-link'>
        <style>${Buttons.textButtonStyles}</style>
        ${linkEl}
      </div>`;
        }
        else if (this.#fallbackHtmlSnippet) {
            // TODO: Use CodeHighlighter.
            template = html `<pre style='text-wrap: auto'>${this.#fallbackHtmlSnippet}</pre>`;
        }
        else if (this.#fallbackText) {
            template = html `<span>${this.#fallbackText}</span>`;
        }
        else {
            template = Lit.nothing;
        }
        Lit.render(template, this.#shadow, { host: this });
    }
}
customElements.define('devtools-performance-node-link', NodeLink);
//# sourceMappingURL=NodeLink.js.map