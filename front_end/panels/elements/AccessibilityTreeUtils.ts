// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import type * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as ElementsComponents from './components/components.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';

export type AXTreeNodeData = SDK.AccessibilityModel.AccessibilityNode;
export type AXTreeNode = TreeOutline.TreeOutlineUtils.TreeNode<AXTreeNodeData>;

export function sdkNodeToAXTreeNode(sdkNode: SDK.AccessibilityModel.AccessibilityNode): AXTreeNode {
  const treeNodeData = sdkNode;
  if (!sdkNode.numChildren()) {
    return {
      treeNodeData,
      id: sdkNode.id(),
    };
  }

  return {
    treeNodeData,
    children: async(): Promise<AXTreeNode[]> => {
      if (sdkNode.numChildren() === sdkNode.children().length) {
        return Promise.resolve(sdkNode.children().map(child => sdkNodeToAXTreeNode(child)));
      }
      // numChildren returns the number of children that this node has, whereas node.children()
      // returns only children that have been loaded. If these two don't match, that means that
      // there are backend children that need to be loaded into the model, so request them now.
      await sdkNode.accessibilityModel().requestAXChildren(sdkNode.id());

      if (sdkNode.numChildren() !== sdkNode.children().length) {
        throw new Error('Once loaded, number of children and length of children must match.');
      }

      const treeNodeChildren: AXTreeNode[] = [];

      for (const child of sdkNode.children()) {
        treeNodeChildren.push(sdkNodeToAXTreeNode(child));
      }

      return Promise.resolve(treeNodeChildren);
    },
    id: sdkNode.id(),
  };
}

type Data = ElementsComponents.AccessibilityTreeNode.AccessibilityTreeNodeData;

export function accessibilityNodeRenderer(node: AXTreeNode): LitHtml.TemplateResult {
  const tag = ElementsComponents.AccessibilityTreeNode.AccessibilityTreeNode.litTagName;
  const sdkNode = node.treeNodeData;
  const name = sdkNode.name()?.value || '';
  const role = sdkNode.role()?.value || '';
  const ignored = sdkNode.ignored();
  return LitHtml.html`<${tag} .data=${{name, role, ignored} as Data}></${tag}>`;
}

export interface AccessibilityTreeNodeData {
  ignored: boolean;
  name: string;
  role: string;
}
