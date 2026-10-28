// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import type * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import * as ElementsComponents from './components/components.js';

const {html} = Lit;
const {widget} = UI.Widget;

export type AXTreeNodeData = SDK.AccessibilityModel.AccessibilityNode;
export type AXTreeNode = TreeOutline.TreeOutlineUtils.TreeNode<AXTreeNodeData>;

export async function sdkNodeToAXTreeNodes(sdkNode: SDK.AccessibilityModel.AccessibilityNode): Promise<AXTreeNode[]> {
  const treeNodeData = sdkNode;
  if (sdkNode.isLeafNode()) {
    return [{
      treeNodeData,
      id: sdkNode.getNodeId(),
    }];
  }

  return [{
    treeNodeData,
    children: async () => {
      const childNodes = await sdkNode.getChildren();
      const childTreeNodes = await Promise.all(childNodes.map(childNode => sdkNodeToAXTreeNodes(childNode)));
      return childTreeNodes.flat(1);
    },
    id: sdkNode.getNodeId(),
  }];
}

export function accessibilityNodeRenderer(node: AXTreeNode): Lit.TemplateResult {
  const sdkNode = node.treeNodeData;
  const name = sdkNode.name()?.value || '';
  const role = sdkNode.role()?.value || '';
  const properties = sdkNode.properties() || [];
  const ignored = sdkNode.ignored();
  return html`${
      widget(ElementsComponents.AccessibilityTreeNode.AccessibilityTreeNode, {name, role, ignored, properties})}`;
}
