// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

export interface AccessibilityNodeData {
  axNode: SDK.AccessibilityModel.AccessibilityNode|null;
}

export class AccessibilityNode extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private axNode: SDK.AccessibilityModel.AccessibilityNode|null = null;

  set data(data: AccessibilityNodeData) {
    this.axNode = data.axNode;
    this.shadow.host.setAttribute('role', 'treeitem');
    this.render();
  }

  // TODO(annabelzhou): Track whether the children should be expanded and change arrow accordingly
  private renderChildren(node: SDK.AccessibilityModel.AccessibilityNode): LitHtml.TemplateResult {
    if (!node) {
      return LitHtml.html``;
    }

    const children = [];
    for (const child of node.children()) {
      const childTemplate = LitHtml.html`
        <devtools-accessibility-node .data=${{
        axNode: child,
      } as AccessibilityNodeData}>
        </devtools-accessibility-node>
      `;
      children.push(childTemplate);
    }

    return LitHtml.html`<div role='group' class='children'>${children}</div>`;
  }

  // This function is a variant of setTextContentTruncatedIfNeeded found in DOMExtension.
  private truncateTextIfNeeded(text: string): string {
    const maxTextContentLength = 10000;

    if (text.length > maxTextContentLength) {
      return Platform.StringUtilities.trimMiddle(text, maxTextContentLength);
    }
    return text;
  }

  private renderNodeContent(): LitHtml.TemplateResult[] {
    const nodeContent: LitHtml.TemplateResult[] = [];
    if (!this.axNode) {
      return nodeContent;
    }

    const role = this.axNode.role();
    if (!role) {
      return nodeContent;
    }

    const roleElement = LitHtml.html`<span class='monospace'>${this.truncateTextIfNeeded(role.value || '')}</span>`;
    nodeContent.push(LitHtml.html`${roleElement}`);

    nodeContent.push(LitHtml.html`<span class='separator'>\xA0</span>`);

    const name = this.axNode.name();
    if (name && name.value) {
      nodeContent.push(LitHtml.html`<span class='ax-readable-string'>"${name.value}"</span>`);
    }

    return nodeContent;
  }

  private render(): void {
    if (!this.axNode) {
      return;
    }

    const parts: LitHtml.TemplateResult[] = [];
    // TODO(annabelzhou): Ignored nodes (and their potential children) to be handled in the future.
    if (this.axNode.ignored()) {
      parts.push(LitHtml.html`<span class='monospace ignored-node'>${ls`Ignored`}</span>`);
    } else {
      const nodeContent = this.renderNodeContent();

      if (this.axNode.numChildren()) {
        this.shadow.host.classList.add('parent', 'expanded');
      } else {
        this.shadow.host.classList.add('no-children');
      }
      parts.push(LitHtml.html`${nodeContent}`);
    }

    const children = this.renderChildren(this.axNode);
    parts.push(children);

    // clang-format off
    const output = LitHtml.html`
      <style>
          .ax-readable-string {
            font-style: italic;
          }

          .monospace {
            font-family: var(--monospace-font-family);
            font-size: var(--monospace-font-size);
          }

          .ignored-node {
            font-style: italic;
            opacity: 70%;
          }

          :host {
            align-items: center;
            display: block;
            margin: 0;
            min-height: 16px;
            overflow-x: hidden;
            padding-left: 4px;
            padding-right: 4px;
            position: relative;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          span {
            flex-shrink: 0;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .children {
            padding-inline-start: 16px;
          }

          :host(.no-children) {
            margin-left: 16px;
          }

          :host(.parent)::before {
            box-sizing: border-box;
            user-select: none;
            -webkit-mask-image: url(Images/treeoutlineTriangles.svg);
            -webkit-mask-size: 32px 24px;
            content: '\A0';
            color: transparent;
            text-shadow: none;
            margin-right: -3px;
            -webkit-mask-position: 0 0;
            background-color: var(--color-syntax-7);
          }

          :host(.parent.expanded)::before {
            -webkit-mask-position: -16px 0;
          }

      </style>
      ${parts}
      `;
    // clang-format on
    LitHtml.render(output, this.shadow);
  }
}

if (!customElements.get('devtools-accessibility-node')) {
  customElements.define('devtools-accessibility-node', AccessibilityNode);
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-accessibility-node': AccessibilityNode;
  }
}
