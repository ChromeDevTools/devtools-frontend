// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as LitHtml from '../../third_party/lit-html/lit-html.js';
import * as UIComponents from '../../ui/components/components.js';

export type AXTreeNode = UIComponents.TreeOutlineUtils.TreeNode<SDK.AccessibilityModel.AccessibilityNode>;

export function sdkNodeToAXTreeNode(node: SDK.AccessibilityModel.AccessibilityNode): AXTreeNode {
  if (!node.numChildren()) {
    return {
      treeNodeData: node,
    };
  }

  return {
    treeNodeData: node,
    children: async(): Promise<AXTreeNode[]> => {
      let children: SDK.AccessibilityModel.AccessibilityNode[] = node.children() || [];
      if (node.numChildren() !== children.length) {
        children = await node.accessibilityModel().requestAXChildren(node.id());
      }
      const treeNodeChildren = (children || []).map(child => sdkNodeToAXTreeNode(child));
      return Promise.resolve(treeNodeChildren);
    },
  };
}

// This function is a variant of setTextContentTruncatedIfNeeded found in DOMExtension.
function truncateTextIfNeeded(text: string): string {
  const maxTextContentLength = 10000;

  if (text.length > maxTextContentLength) {
    return Platform.StringUtilities.trimMiddle(text, maxTextContentLength);
  }
  return text;
}

export function accessibilityNodeRenderer(node: AXTreeNode): LitHtml.TemplateResult {
  // Left in for ease of reaching this file when doing DT on DT debugging
  // eslint-disable-next-line no-console
  const nodeContent: LitHtml.TemplateResult[] = [];
  const axNode = node.treeNodeData;

  const role = axNode.role();
  if (!role) {
    return LitHtml.html``;
  }

  const roleElement = LitHtml.html`<span class='monospace'>${truncateTextIfNeeded(role.value || '')}</span>`;
  nodeContent.push(LitHtml.html`${roleElement}`);

  const name = axNode.name();
  if (name) {
    nodeContent.push(LitHtml.html`<span class='separator'>\xA0</span>`);
    nodeContent.push(LitHtml.html`<span class='ax-readable-string'>"${name.value}"</span>`);
  }

  return LitHtml.html`
      <style>
          .ax-readable-string {
            font-style: italic;
          }

          .monospace {
            font-family: var(--monospace-font-family);
            font-size: var(--monospace-font-size);
          }
      </style>
      ${nodeContent}
      `;
}
