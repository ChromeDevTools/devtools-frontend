// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './components/components.js';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as TreeOutline from '../../ui/components/tree_outline/tree_outline.js';
import * as Lit from '../../ui/lit/lit.js';

const {html} = Lit;

export type AXTreeNodeData = SDK.AccessibilityModel.AccessibilityNode;
export type AXTreeNode = TreeOutline.TreeOutlineUtils.TreeNode<AXTreeNodeData>;

function isLeafNode(node: SDK.AccessibilityModel.AccessibilityNode): boolean {
  return node.numChildren() === 0 && node.role()?.value !== 'Iframe';
}

function getModel(frameId: Protocol.Page.FrameId): SDK.AccessibilityModel.AccessibilityModel {
  const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
  const model = frame?.resourceTreeModel().target().model(SDK.AccessibilityModel.AccessibilityModel);
  if (!model) {
    throw new Error('Could not instantiate model for frameId');
  }
  return model;
}

export async function getRootNode(frameId: Protocol.Page.FrameId): Promise<SDK.AccessibilityModel.AccessibilityNode> {
  const model = getModel(frameId);
  const root = await model.requestRootNode(frameId);
  if (!root) {
    throw new Error('No accessibility root for frame');
  }
  return root;
}

function getFrameIdForNodeOrDocument(node: SDK.DOMModel.DOMNode): Protocol.Page.FrameId {
  let frameId;
  if (node instanceof SDK.DOMModel.DOMDocument) {
    frameId = node.body?.frameId();
  } else {
    frameId = node.frameId();
  }
  if (!frameId) {
    throw new Error('No frameId for DOM node');
  }
  return frameId;
}

export async function getNodeAndAncestorsFromDOMNode(domNode: SDK.DOMModel.DOMNode):
    Promise<SDK.AccessibilityModel.AccessibilityNode[]> {
  let frameId = getFrameIdForNodeOrDocument(domNode);
  const model = getModel(frameId);
  const result = await model.requestAndLoadSubTreeToNode(domNode);
  if (!result) {
    throw new Error('Could not retrieve accessibility node for inspected DOM node');
  }

  const outermostFrameId = SDK.FrameManager.FrameManager.instance().getOutermostFrame()?.id;
  if (!outermostFrameId) {
    return result;
  }
  while (frameId !== outermostFrameId) {
    const node = await SDK.FrameManager.FrameManager.instance().getFrame(frameId)?.getOwnerDOMNodeOrDocument();
    if (!node) {
      break;
    }
    frameId = getFrameIdForNodeOrDocument(node);
    const model = getModel(frameId);
    const ancestors = await model.requestAndLoadSubTreeToNode(node);
    result.push(...ancestors || []);
  }
  return result;
}

async function getChildren(node: SDK.AccessibilityModel.AccessibilityNode):
    Promise<SDK.AccessibilityModel.AccessibilityNode[]> {
  if (node.role()?.value === 'Iframe') {
    const domNode = await node.deferredDOMNode()?.resolvePromise();
    if (!domNode) {
      throw new Error('Could not find corresponding DOMNode');
    }
    const frameId = domNode.frameOwnerFrameId();
    if (!frameId) {
      throw new Error('No owner frameId on iframe node');
    }
    const localRoot = await getRootNode(frameId);
    return [localRoot];
  }
  return await node.accessibilityModel().requestAXChildren(node.id(), node.getFrameId() || undefined);
}

export async function sdkNodeToAXTreeNodes(sdkNode: SDK.AccessibilityModel.AccessibilityNode): Promise<AXTreeNode[]> {
  const treeNodeData = sdkNode;
  if (isLeafNode(sdkNode)) {
    return [{
      treeNodeData,
      id: getNodeId(sdkNode),
    }];
  }

  return [{
    treeNodeData,
    children: async () => {
      const childNodes = await getChildren(sdkNode);
      const childTreeNodes = await Promise.all(childNodes.map(childNode => sdkNodeToAXTreeNodes(childNode)));
      return childTreeNodes.flat(1);
    },
    id: getNodeId(sdkNode),
  }];
}

export function accessibilityNodeRenderer(node: AXTreeNode): Lit.TemplateResult {
  const sdkNode = node.treeNodeData;
  const name = sdkNode.name()?.value || '';
  const role = sdkNode.role()?.value || '';
  const properties = sdkNode.properties() || [];
  const ignored = sdkNode.ignored();
  const id = getNodeId(sdkNode);
  return html`<devtools-accessibility-tree-node .data=${{
    name, role, ignored, properties, id,
  }
  }></devtools-accessibility-tree-node>`;
}

export function getNodeId(node: SDK.AccessibilityModel.AccessibilityNode): string {
  return node.getFrameId() + '#' + node.id();
}
