// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Logs from '../../../models/logs/logs.js';
import * as Trace from '../../../models/trace/trace.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as PanelsCommon from '../../common/common.js';
const { html } = Lit.StaticHtml;
const { until } = Lit.Directives;
/**
 * AIv2MarkdownRenderer is currently duplicated from the agent-specific renderers
 * as part of the migration to the V2 architecture. It will eventually become
 * the only markdown renderer used by AI assistance.
 */
export class AIv2MarkdownRenderer extends MarkdownView.MarkdownView.MarkdownInsightRenderer {
    options;
    constructor(options = {}) {
        super();
        this.options = options;
    }
    #isSameOrigin(node) {
        if (!this.options.mainDocumentURL) {
            return true;
        }
        const nodeDocumentURL = node.ownerDocument?.documentURL ?? '';
        return AiAssistanceModel.AiUtils.isSameOrigin(this.options.mainDocumentURL, nodeDocumentURL);
    }
    #revealableLink(revealable, label) {
        return html `<devtools-link @click=${(e) => {
            e.preventDefault();
            e.stopPropagation();
            void Common.Revealer.reveal(revealable);
        }}>${Platform.StringUtilities.trimEndWithMaxLength(label, 100)}</devtools-link>`;
    }
    #renderLink(href, text) {
        const devtoolsLink = this.#renderDevToolsLink(href, text);
        if (devtoolsLink) {
            return devtoolsLink;
        }
        if (href.startsWith('#')) {
            const parsed = this.#parseLink(href);
            if (parsed) {
                const resultPromise = parsed.type === 'path' ? this.#linkifyPath(parsed.path, text) : this.#linkifyNode(parsed.nodeId, text);
                return html `<span>${until(resultPromise.then(node => node || text), text)}</span>`;
            }
            if (this.options.lookupTraceEvent) {
                const event = this.options.lookupTraceEvent(href.slice(1));
                if (event) {
                    let label = text;
                    let title = '';
                    if (Trace.Types.Events.isSyntheticNetworkRequest(event)) {
                        title = event.args.data.url;
                    }
                    else {
                        label += ` (${event.name})`;
                    }
                    // eslint-disable-next-line @devtools/no-a-tags-in-lit
                    return html `<a href="#" draggable=false .title=${title} @click=${(e) => {
                        e.stopPropagation();
                        void Common.Revealer.reveal(new SDK.TraceObject.RevealableEvent(event));
                    }}>${label}</a>`;
                }
            }
        }
        return null;
    }
    #renderDevToolsLink(href, fallbackText) {
        if (href.startsWith('#req-')) {
            const request = Logs.NetworkLog.NetworkLog.instance().requests().find(req => req.requestId() === href.substring(5));
            if (request) {
                return this.#revealableLink(request, request.url());
            }
            return html `${fallbackText}`;
        }
        if (href.startsWith('#file-')) {
            const file = AiAssistanceModel.ContextSelectionAgent.ContextSelectionAgent.getUISourceCodes().find(file => AiAssistanceModel.ContextSelectionAgent.ContextSelectionAgent.uiSourceCodeId.get(file) ===
                Number(href.substring(6)));
            if (file) {
                return this.#revealableLink(file, file.name());
            }
            return html `${fallbackText}`;
        }
        return null;
    }
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
    async #linkifyNode(backendNodeId, label) {
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
        if (this.options.mainFrameId && node.frameId() !== this.options.mainFrameId) {
            return;
        }
        if (!this.#isSameOrigin(node)) {
            return;
        }
        const linkedNode = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node, { textContent: label });
        return linkedNode;
    }
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
        if (!this.#isSameOrigin(node)) {
            return;
        }
        const linkedNode = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node, { textContent: label });
        return linkedNode;
    }
    templateForToken(token) {
        if (token.type === 'link') {
            const link = this.#renderLink(token.href, token.text);
            if (link) {
                return link;
            }
        }
        if (token.type === 'code') {
            const lines = (token.text).split('\n');
            if (lines[0]?.trim() === 'css') {
                token.lang = 'css';
                token.text = lines.slice(1).join('\n');
            }
        }
        if (token.type === 'codespan') {
            // LLM likes outputting the link inside a codespan block.
            // Remove the codespan and render the link directly
            const matches = token.text.match(/^\[(.*)\]\((.+)\)$/);
            if (matches?.[2]) {
                const link = this.#renderLink(matches[2], matches[1]);
                if (link) {
                    return link;
                }
            }
        }
        return super.templateForToken(token);
    }
}
//# sourceMappingURL=AIv2MarkdownRenderer.js.map