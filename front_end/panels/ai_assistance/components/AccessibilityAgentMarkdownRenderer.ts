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

export class AccessibilityAgentMarkdownRenderer extends MarkdownRendererWithCodeBlock {
  constructor(
      private mainFrameId = '',
  ) {
    super();
  }

  override templateForToken(token: Marked.Marked.MarkedToken): Lit.LitTemplate|null {
    if (token.type === 'link' && token.href.startsWith('#')) {
      if (token.href.startsWith('#path-')) {
        const path = token.href.replace('#path-', '');
        return html`<span>${
            until(this.#linkifyPath(path, token.text).then(node => node || token.text), token.text)}</span>`;
      }

      let nodeId = undefined;
      if (token.href.startsWith('#node-')) {
        nodeId = Number(token.href.replace('#node-', '')) as Protocol.DOM.BackendNodeId;
      } else if (token.href.startsWith('#')) {
        nodeId = Number(token.href.replace('#', '')) as Protocol.DOM.BackendNodeId;
      }

      if (nodeId) {
        return html`<span>${
            until(this.#linkifyNode(nodeId, token.text).then(node => node || token.text), token.text)}</span>`;
      }
    }

    return super.templateForToken(token);
  }

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
