// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../../core/sdk/sdk.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as PanelsCommon from '../../common/common.js';
import { MarkdownRendererWithCodeBlock } from './MarkdownRendererWithCodeBlock.js';
const { html } = Lit.StaticHtml;
const { until } = Lit.Directives;
export class StylingAgentMarkdownRenderer extends MarkdownRendererWithCodeBlock {
    mainFrameId;
    constructor(mainFrameId = '') {
        super();
        this.mainFrameId = mainFrameId;
    }
    #renderTableFromJson(data) {
        if (!Array.isArray(data) || data.length === 0 || typeof data[0] !== 'object' || data[0] === null) {
            return null;
        }
        const headers = Object.keys(data[0]);
        const requiredKeys = ['Problem', 'Element', 'NodeId', 'Details'];
        if (!requiredKeys.every(key => headers.includes(key))) {
            return null; // Not the expected JSON structure
        }
        const problemIndex = headers.indexOf('Problem');
        if (problemIndex > -1) {
            const problemHeader = headers.splice(problemIndex, 1);
            headers.unshift(...problemHeader);
        }
        return html `
      <table style="width: 100%;">
        <thead>
          <tr>
            ${headers.map(header => html `<th style="text-align: left;">${header === 'NodeId' ? '' : header}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${data.flatMap(row => {
            return html `
            <tr>
              ${headers.map(header => {
                if (header === 'NodeId') {
                    return html `<td>${this.#renderLinkifiedText(row[header])}</td>`;
                }
                if (header === 'Details') {
                    // eslint-disable-next-line @devtools/no-a-tags-in-lit
                    return html `<td><a href="#" @click=${this.#toggleDetailsRow}>Details</a></td>`;
                }
                return html `<td>${row[header]}</td>`;
            })}
            </tr>
            <tr class="details-row" style="display: none;">
              <td colspan=${headers.length} style="background-color: #f0f0f0; padding: 1em;">
                <devtools-markdown-view .data=${{
                tokens: Marked.Marked.lexer(row['Details']),
                renderer: new StylingAgentMarkdownRenderer(this.mainFrameId),
            }}></devtools-markdown-view>
              </td>
            </tr>
          `;
        })}
        </tbody>
      </table>
      <br><div>To investigate these problems, please click one of the provided links (above), to set as context, and ask me further questions about the problem.</div>
    `;
    }
    templateForToken(token) {
        if (token.type === 'code') {
            try {
                const data = JSON.parse(token.text);
                const table = this.#renderTableFromJson(data);
                if (table) {
                    return table;
                }
            }
            catch {
                // Not a JSON object, fallback to default rendering.
            }
        }
        if (token.type === 'link' && token.href.startsWith('#')) {
            let nodeId = undefined;
            if (token.href.startsWith('#node-')) {
                nodeId = Number(token.href.replace('#node-', ''));
            }
            else if (token.href.startsWith('#')) {
                // So often does it ignore requests to prepend nodes with node-, frustratingly.
                nodeId = Number(token.href.replace('#', ''));
            }
            if (nodeId) {
                return html `<span>${until(this.#linkifyNode(nodeId, token.text).then(node => node || token.text), token.text)}</span>`;
            }
        }
        return super.templateForToken(token);
    }
    #toggleDetailsRow(e) {
        e.preventDefault();
        const link = e.target;
        const currentRow = link.closest('tr');
        if (!currentRow) {
            return;
        }
        const detailsRow = currentRow.nextElementSibling;
        if (detailsRow?.classList.contains('details-row')) {
            if (detailsRow.style.display === 'none') {
                detailsRow.style.display = 'table-row';
                link.textContent = 'Hide';
            }
            else {
                detailsRow.style.display = 'none';
                link.textContent = 'Details';
            }
        }
    }
    #renderLinkifiedText(text) {
        if (text.indexOf(',') === -1) {
            const nodeId = Number(text);
            if (isNaN(nodeId)) {
                // Not a number, return as is.
                return html `${text}`;
            }
            return this.#renderSingleLink(nodeId);
        }
        // Check for comma separated list.
        const nodeIdsStr = text.split(',').map(s => s.trim()).filter(Boolean);
        return html `${nodeIdsStr.map(idStr => {
            const nodeId = Number(idStr);
            if (isNaN(nodeId)) {
                return html `<div>${idStr}</div>`;
            }
            return html `<div>${this.#renderSingleLink(nodeId)}</div>`;
        })}`;
    }
    #renderSingleLink(nodeId) {
        const label = `link`;
        return html `<span>${until(this.#linkifyNode(nodeId, label).then(node => node || label), label)}</span>`;
    }
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
}
//# sourceMappingURL=StylingAgentMarkdownRenderer.js.map