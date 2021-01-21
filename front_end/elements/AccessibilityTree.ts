// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

import {SDKNodeToAXNode} from './AccessibilityTreeUtils.js';
import type {AccessibilityNodeData} from './AccessibilityNode.js';

export interface AccessibilityTreeData {
  node: SDK.DOMModel.DOMNode|null;
}

export class AccessibilityTree extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private node: SDK.DOMModel.DOMNode|null = null;

  set data(data: AccessibilityTreeData) {
    this.node = data.node;
    this.shadow.host.setAttribute('role', 'tree');
    this.render();
  }

  async refreshAccessibilityTree(): Promise<SDK.AccessibilityModel.AccessibilityNode|null> {
    if (!this.node) {
      return null;
    }

    const accessibilityModel = this.node.domModel().target().model(SDK.AccessibilityModel.AccessibilityModel);
    if (!accessibilityModel) {
      return null;
    }

    const result = await accessibilityModel.requestRootNode();
    return result || null;
  }

  private render(): void {
    this.refreshAccessibilityTree().then(rootNode => {
      if (!rootNode) {
        return;
      }

      // clang-format off
      const output = LitHtml.html`
        <devtools-accessibility-node .data=${{
          axNode: SDKNodeToAXNode(null, rootNode),
          } as AccessibilityNodeData}>
        </devtools-accessibility-node>
      `;
      // clang-format on
      LitHtml.render(output, this.shadow);
    });
  }
}

if (!customElements.get('devtools-accessibility-tree')) {
  customElements.define('devtools-accessibility-tree', AccessibilityTree);
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-accessibility-tree': AccessibilityTree;
  }
}
