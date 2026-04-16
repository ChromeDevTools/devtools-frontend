// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import type * as Marked from '../../../third_party/marked/marked.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as PanelsCommon from '../../common/common.js';

import {MarkdownRendererWithCodeBlock} from './MarkdownRendererWithCodeBlock.js';

const {html} = Lit.StaticHtml;
const {until} = Lit.Directives;

/**
 * Represents the different types of links that can be parsed from the AI agent's response.
 * The agent can linkify a node either by its backend node ID or by its full DOM path.
 */
type ParsedLink = {
  type: 'path',
  path: string,
}|{
  type: 'node',
  nodeId: Protocol.DOM.BackendNodeId,
};

export class AccessibilityAgentMarkdownRenderer extends MarkdownRendererWithCodeBlock {
  constructor(
      private mainFrameId = '',
  ) {
    super();
  }

  override templateForToken(token: Marked.Marked.MarkedToken): Lit.LitTemplate|null {
    if (token.type === 'link' && token.href.startsWith('#')) {
      const parsed = this.#parseLink(token.href);
      if (parsed) {
        const resultPromise = parsed.type === 'path' ? this.#linkifyPath(parsed.path, token.text) :
                                                       this.#linkifyNode(parsed.nodeId, token.text);

        return html`<span>${until(resultPromise.then(node => node || token.text), token.text)}</span>`;
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
  #parseLink(href: string): ParsedLink|null {
    if (href.startsWith('#path-')) {
      return {type: 'path', path: href.replace('#path-', '')};
    }
    if (href.startsWith('#1,HTML')) {
      return {type: 'path', path: href.slice(1)};
    }

    let nodeIdStr = '';
    if (href.startsWith('#node-')) {
      nodeIdStr = href.replace('#node-', '');
    } else if (href.startsWith('#')) {
      nodeIdStr = href.slice(1);
    }

    if (nodeIdStr.trim() !== '') {
      const nodeId = Number(nodeIdStr);
      if (Number.isInteger(nodeId)) {
        return {type: 'node', nodeId: nodeId as Protocol.DOM.BackendNodeId};
      }
    }

    return null;
  }

  /**
   * Linkifies a node using its backend node ID.
   */
  async #linkifyNode(backendNodeId: Protocol.DOM.BackendNodeId, label: string): Promise<Lit.LitTemplate|undefined> {
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

    const linkedNode = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node, {textContent: label});
    return linkedNode;
  }

  /**
   * Linkifies a node using its full DOM path (e.g. "1,HTML,1,BODY,...").
   */
  async #linkifyPath(path: string, label: string): Promise<Lit.LitTemplate|undefined> {
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
    const linkedNode = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node, {textContent: label});
    return linkedNode;
  }
}
