// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as LitHtml from '../../third_party/lit-html/lit-html.js';
import * as Components from '../../ui/components/components.js';
import * as UI from '../../ui/ui.js';

import {accessibilityNodeRenderer, AXTreeNode, sdkNodeToAXTreeNode} from './AccessibilityTreeUtils.js';

// This class simply acts as a wrapper around the AccessibilityTree web component for
// compatibility with DevTools legacy UI widgets. It in itself contains no business logic
// or functionality.

export class AccessibilityTreeView extends UI.Widget.VBox {
  private readonly accessibilityTreeComponent =
      new Components.TreeOutline.TreeOutline<SDK.AccessibilityModel.AccessibilityNode>();
  private treeData: AXTreeNode[] = [];
  private readonly toggleButton: HTMLButtonElement;

  constructor(toggleButton: HTMLButtonElement) {
    super();
    // toggleButton is bound to a click handler on ElementsPanel to switch between the DOM tree
    // and accessibility tree views.
    this.toggleButton = toggleButton;
    this.contentElement.appendChild(this.toggleButton);
    this.contentElement.appendChild(this.accessibilityTreeComponent);
  }

  async refreshAccessibilityTree(node: SDK.DOMModel.DOMNode): Promise<SDK.AccessibilityModel.AccessibilityNode|null> {
    const accessibilityModel = node.domModel().target().model(SDK.AccessibilityModel.AccessibilityModel);
    if (!accessibilityModel) {
      return null;
    }

    const result = await accessibilityModel.requestRootNode();
    return result || null;
  }


  async setNode(inspectedNode: SDK.DOMModel.DOMNode): Promise<void> {
    const root = await this.refreshAccessibilityTree(inspectedNode);
    if (!root) {
      return;
    }

    this.treeData = [sdkNodeToAXTreeNode(root)];

    this.accessibilityTreeComponent.data = {
      defaultRenderer: (node): LitHtml.TemplateResult => accessibilityNodeRenderer(node),
      tree: this.treeData,
    };
    this.accessibilityTreeComponent.expandRecursively(2);
  }
}
