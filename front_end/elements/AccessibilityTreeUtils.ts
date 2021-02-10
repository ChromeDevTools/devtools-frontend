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
  children: AXNode[];
  numChildren: number;
  hasOnlyUnloadedChildren: boolean;
  axTree: AccessibilityTree|null;
  loadChildren: () => Promise<void>;
  highlightNode: () => void;
  clearHighlight: () => void;
}

export function SDKNodeToAXNode(
    parent: AXNode|null, sdkNode: SDK.AccessibilityModel.AccessibilityNode, tree: AccessibilityTree): AXNode {
  const axChildren: AXNode[] = [];
  const axNode = {
    id: sdkNode.id(),
    role: sdkNode.role()?.value,
    name: sdkNode.name()?.value,
    ignored: sdkNode.ignored(),
    parent: parent,
    children: axChildren,
    numChildren: sdkNode.numChildren(),
    hasOnlyUnloadedChildren: sdkNode.hasOnlyUnloadedChildren(),
    axTree: tree,
    loadChildren: async(): Promise<void> => {
      const loadedChildren = await sdkNode.accessibilityModel().requestAXChildren(sdkNode.id());
      if (loadedChildren) {
        for (const child of loadedChildren) {
          axChildren.push(SDKNodeToAXNode(axNode, child, tree));
        }
      }
    },
    highlightNode: (): void => sdkNode.highlightDOMNode(),
    clearHighlight: (): void => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(),
  };

  for (const child of sdkNode.children()) {
    axNode.children.push(SDKNodeToAXNode(axNode, child, tree));
  }

  return axNode;
}
