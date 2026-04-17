// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../../core/sdk/sdk.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as PanelsCommon from '../../common/common.js';
import { MarkdownRendererWithCodeBlock } from './MarkdownRendererWithCodeBlock.js';
const { html } = Lit.StaticHtml;
const { until } = Lit.Directives;
export class AccessibilityAgentMarkdownRenderer extends MarkdownRendererWithCodeBlock {
    mainFrameId;
    constructor(mainFrameId = '') {
        super();
        this.mainFrameId = mainFrameId;
    }
    templateForToken(token) {
        if (token.type === 'link' && token.href.startsWith('#')) {
            const parsed = this.#parseLink(token.href);
            if (parsed) {
                const resultPromise = parsed.type === 'path' ? this.#linkifyPath(parsed.path, token.text) :
                    this.#linkifyNode(parsed.nodeId, token.text);
                return html `<span>${until(resultPromise.then(node => node || token.text), token.text)}</span>`;
            }
        }
        return super.templateForToken(token);
    }
    /**
     * Parses a link href to determine if it's a node ID or a DOM path.
     *
     * The AI agent is instructed to use #node-ID or #path-PATH, but
     * sometimes it omits the prefixes, in which case we try to detect
     * paths by looking for `#1,HTML` which is often how paths in LH
     * start.
     */
    #parseLink(href) {
        if (href.startsWith('#path-')) {
            return { type: 'path', path: href.replace('#path-', '') };
        }
        if (href.startsWith('#1,HTML')) {
            return { type: 'path', path: href.slice(1) };
        }
        let nodeIdStr = '';
        if (href.startsWith('#node-')) {
            nodeIdStr = href.replace('#node-', '');
        }
        else if (href.startsWith('#')) {
            nodeIdStr = href.slice(1);
        }
        if (nodeIdStr.trim() !== '') {
            const nodeId = Number(nodeIdStr);
            if (Number.isInteger(nodeId)) {
                return { type: 'node', nodeId: nodeId };
            }
        }
        return null;
    }
    /**
     * Linkifies a node using its backend node ID.
     */
    async #linkifyNode(backendNodeId, label) {
        if (backendNodeId === undefined) {
            return;
        }
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        const domModel = target?.model(SDK.DOMModel.DOMModel);
        if (!domModel) {
            return undefined;
        }
        const domNodesMap = await domModel.pushNodesByBackendIdsToFrontend(new Set([backendNodeId]));
        const node = domNodesMap?.get(backendNodeId);
        if (!node) {
            return;
        }
        if (node.frameId() !== this.mainFrameId) {
            return;
        }
        const linkedNode = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node, { textContent: label });
        return linkedNode;
    }
    /**
     * Linkifies a node using its full DOM path (e.g. "1,HTML,1,BODY,...").
     */
    async #linkifyPath(path, label) {
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        const domModel = target?.model(SDK.DOMModel.DOMModel);
        if (!domModel) {
            return undefined;
        }
        const nodeId = await domModel.pushNodeByPathToFrontend(path);
        if (!nodeId) {
            return;
        }
        const node = domModel.nodeForId(nodeId);
        if (!node) {
            return;
        }
        const linkedNode = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node, { textContent: label });
        return linkedNode;
    }
}
//# sourceMappingURL=AccessibilityAgentMarkdownRenderer.js.map