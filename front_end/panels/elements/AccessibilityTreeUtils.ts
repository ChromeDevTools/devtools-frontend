// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as ElementsComponents from './components/components.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';

export type AXTreeNodeData = SDK.AccessibilityModel.AccessibilityNode;
export type AXTreeNode = TreeOutline.TreeOutlineUtils.TreeNode<AXTreeNodeData>;

export function sdkNodeToAXTreeNode(sdkNode: SDK.AccessibilityModel.AccessibilityNode): AXTreeNode {
  const treeNodeData = sdkNode;
  const role = sdkNode.role()?.value;
  if (!sdkNode.numChildren() && role !== 'Iframe') {
    return {
      treeNodeData,
      id: sdkNode.id(),
    };
  }

  return {
    treeNodeData,
    children: async(): Promise<AXTreeNode[]> => {
      const domNode = await sdkNode.deferredDOMNode()?.resolvePromise();
      const document = domNode?.contentDocument();
      if (document) {
        const axmodel = document.domModel().target().model(SDK.AccessibilityModel.AccessibilityModel);
        if (!axmodel) {
          throw new Error('Could not create AccessibilityModel for iframe');
        }
        // Check if we have requested the node before:
        if (!axmodel.axNodeForDOMNode(document)) {
          // Request root node from backend and add to model
          await axmodel.requestPartialAXTree(document);
        }
        const localRoot = axmodel.axNodeForDOMNode(document);
        if (!localRoot) {
          throw new Error('Could not find root node');
        }
        return [sdkNodeToAXTreeNode(localRoot)];
      }
      if (sdkNode.numChildren() === sdkNode.children().length) {
        return sdkNode.children().map(child => sdkNodeToAXTreeNode(child));
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

      return treeNodeChildren;
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
