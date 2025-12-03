// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';
import * as LegacyComponents from '../../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as PanelsCommon from '../../../common/common.js';
const { html } = Lit;
const { widgetConfig } = UI.Widget;
export const DEFAULT_VIEW = (input, output, target) => {
    const { relatedNodeEl, fallbackUrl, fallbackHtmlSnippet, fallbackText, } = input;
    let template;
    if (relatedNodeEl) {
        template = html `<div class='node-link'>${relatedNodeEl}</div>`;
    }
    else if (fallbackUrl) {
        const MAX_URL_LENGTH = 20;
        const options = {
            tabStop: true,
            showColumnNumber: false,
            inlineFrameIndex: 0,
            maxLength: MAX_URL_LENGTH,
        };
        const linkEl = LegacyComponents.Linkifier.Linkifier.linkifyURL(fallbackUrl, options);
        template = html `<div class='node-link'>
      <style>${Buttons.textButtonStyles}</style>
      ${linkEl}
    </div>`;
    }
    else if (fallbackHtmlSnippet) {
        // TODO: Use CodeHighlighter.
        template = html `<pre style='text-wrap: auto'>${fallbackHtmlSnippet}</pre>`;
    }
    else if (fallbackText) {
        template = html `<span>${fallbackText}</span>`;
    }
    else {
        template = Lit.nothing;
    }
    Lit.render(template, target);
};
export class NodeLink extends UI.Widget.Widget {
    #view;
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
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
    }
    set data(data) {
        this.#backendNodeId = data.backendNodeId;
        this.#frame = data.frame;
        this.#options = data.options;
        this.#fallbackUrl = data.fallbackUrl;
        this.#fallbackHtmlSnippet = data.fallbackHtmlSnippet;
        this.#fallbackText = data.fallbackText;
        this.requestUpdate();
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
    async performUpdate() {
        const input = {
            relatedNodeEl: await this.#linkify(),
            fallbackUrl: this.#fallbackUrl,
            fallbackHtmlSnippet: this.#fallbackHtmlSnippet,
            fallbackText: this.#fallbackText,
        };
        this.#view(input, undefined, this.contentElement);
    }
}
export function nodeLink(data) {
    return html `<devtools-widget .widgetConfig=${widgetConfig(NodeLink, {
        data,
    })}></devtools-widget>`;
}
//# sourceMappingURL=NodeLink.js.map