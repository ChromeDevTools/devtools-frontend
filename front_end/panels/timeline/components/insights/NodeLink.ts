// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

// TODO: move to ui/components/node_link?

import * as Common from '../../../../core/common/common.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as LegacyComponents from '../../../../ui/legacy/components/utils/utils.js';
import * as Lit from '../../../../ui/lit/lit.js';

const {html} = Lit;

export interface NodeLinkData {
  backendNodeId: Protocol.DOM.BackendNodeId;
  frame: string;
  options?: Common.Linkifier.Options;
  /**
   * URL to display if backendNodeId cannot be resolved (ie for traces loaded from disk).
   * Will be given to linkifyURL. Use this or one of the other fallback fields.
   */
  fallbackUrl?: Platform.DevToolsPath.UrlString;
  /**
   * Text to display if backendNodeId cannot be resolved (ie for traces loaded from disk).
   * Displayed as monospace code.
   */
  fallbackHtmlSnippet?: string;
  /**
   * Text to display if backendNodeId cannot be resolved (ie for traces loaded from disk).
   * Displayed as plain text.
   */
  fallbackText?: string;
}

export class NodeLink extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #backendNodeId?: Protocol.DOM.BackendNodeId;
  #frame?: string;
  #options?: Common.Linkifier.Options;
  #fallbackUrl?: Platform.DevToolsPath.UrlString;
  #fallbackHtmlSnippet?: string;
  #fallbackText?: string;
  /**
   * Track the linkified Node for a given backend NodeID to avoid repeated lookups on re-render.
   * Also tracks if we fail to resolve a node, to ensure we don't try on each subsequent re-render.
   */
  #linkifiedNodeForBackendId = new Map<Protocol.DOM.BackendNodeId, Node|'NO_NODE_FOUND'>();

  set data(data: NodeLinkData) {
    this.#backendNodeId = data.backendNodeId;
    this.#frame = data.frame;
    this.#options = data.options;
    this.#fallbackUrl = data.fallbackUrl;
    this.#fallbackHtmlSnippet = data.fallbackHtmlSnippet;
    this.#fallbackText = data.fallbackText;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  async #linkify(): Promise<Node|undefined> {
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
    const linkedNode = await Common.Linkifier.Linkifier.linkify(node, this.#options);
    this.#linkifiedNodeForBackendId.set(this.#backendNodeId, linkedNode);
    return linkedNode;
  }

  async #render(): Promise<void> {
    const relatedNodeEl = await this.#linkify();

    let template;
    if (relatedNodeEl) {
      template = html`<div class='node-link'>${relatedNodeEl}</div>`;
    } else if (this.#fallbackUrl) {
      const MAX_URL_LENGTH = 20;
      const options = {
        tabStop: true,
        showColumnNumber: false,
        inlineFrameIndex: 0,
        maxLength: MAX_URL_LENGTH,
      };
      const linkEl = LegacyComponents.Linkifier.Linkifier.linkifyURL(this.#fallbackUrl, options);
      template = html`<div class='node-link'>
        <style>${Buttons.textButtonStyles}</style>
        ${linkEl}
      </div>`;
    } else if (this.#fallbackHtmlSnippet) {
      // TODO: Use CodeHighlighter.
      template = html`<pre style='text-wrap: auto'>${this.#fallbackHtmlSnippet}</pre>`;
    } else if (this.#fallbackText) {
      template = html`<span>${this.#fallbackText}</span>`;
    } else {
      template = Lit.nothing;
    }

    Lit.render(template, this.#shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-node-link': NodeLink;
  }
}

customElements.define('devtools-performance-node-link', NodeLink);
