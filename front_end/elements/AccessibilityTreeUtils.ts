// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';
import {AccessibilityTree} from './AccessibilityTree.js';

export interface AXNode {
  id: string;
  role: string|null;
  name: string|null;
  ignored: boolean;
  parent: AXNode|null;
  hasChildren: () => boolean;
  children: () => Promise<AXNode[]>;
  axTree: AccessibilityTree|null;
  highlightNode: () => void;
  clearHighlight: () => void;
}

export function sdkNodeToAXNode(
    parent: AXNode|null, sdkNode: SDK.AccessibilityModel.AccessibilityNode, tree: AccessibilityTree): AXNode {
  let axChildren: AXNode[] = [];

  const axNode = {
    id: sdkNode.id(),
    role: sdkNode.role()?.value,
    name: sdkNode.name()?.value,
    ignored: sdkNode.ignored(),
    parent: parent,
    axTree: tree,
    hasChildren: (): boolean => Boolean(sdkNode.numChildren()),
    // TODO: Remove next line once crbug.com/1177242 is solved.
    // eslint-disable-next-line @typescript-eslint/space-before-function-paren
    children: async(): Promise<AXNode[]> => {
      // sdkNode.numChildren() returns the true number of children that exist in the
      // backend whereas axChildren contains only nodes that have been fetched by the frontend.
      // If the number of local children is different from the number of children known
      // to the backend, we load the children and expect the numbers to match.
      if (sdkNode.numChildren() !== axChildren.length) {
        const children = await sdkNode.accessibilityModel().requestAXChildren(sdkNode.id());
        axChildren = (children || []).map(child => sdkNodeToAXNode(axNode, child, tree));
        if (axChildren.length !== sdkNode.numChildren()) {
          throw new Error('Unexpected: actual and expected number of child nodes is different');
        }
      }
      return axChildren;
    },
    highlightNode: (): void => sdkNode.highlightDOMNode(),
    clearHighlight: (): void => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(),
  };

  for (const child of sdkNode.children()) {
    axChildren.push(sdkNodeToAXNode(axNode, child, tree));
  }

  return axNode;
}
