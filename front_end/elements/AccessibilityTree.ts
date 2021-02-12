// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

import {AXNode, SDKNodeToAXNode} from './AccessibilityTreeUtils.js';
import type {AccessibilityNode, AccessibilityNodeData} from './AccessibilityNode.js';

export interface AccessibilityTreeData {
  node: SDK.DOMModel.DOMNode|null;
}

export class AccessibilityTree extends HTMLElement {
  private readonly shadow = this.attachShadow({
    mode: 'open',
    delegatesFocus: false,
  });
  private node: SDK.DOMModel.DOMNode|null = null;
  private nodeMap: Map<string, AccessibilityNode> = new Map();
  private rootNode: AXNode|null = null;
  private selectedNode: AccessibilityNode|null = null;

  constructor() {
    super();
    this.setAttribute('role', 'tree');
    this.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  set data(data: AccessibilityTreeData) {
    this.node = data.node;
    this.render();
  }

  set selectedAXNode(node: AccessibilityNode) {
    // Deselect previous node
    if (this.selectedNode && this.selectedNode !== node) {
      this.selectedNode.deselect();
    }

    // Select and focus new node
    this.selectedNode = node;
    this.selectedNode.select();
  }

  wasShown(): void {
    const rootNode = this.getRoot();
    if (rootNode) {
      this.selectedAXNode = rootNode;
    }
  }

  getNodeByAXID(id: string): AccessibilityNode|null {
    return this.nodeMap.get(id) || null;
  }

  appendToNodeMap(id: string, node: AccessibilityNode): void {
    this.nodeMap.set(id, node);
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

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.selectedNode) {
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        this.selectedNode.selectPreviousNode();
        e.preventDefault();
        break;
      case 'ArrowDown':
        this.selectedNode.selectNextNode();
        e.preventDefault();
        break;
      case 'ArrowLeft':
        if (this.selectedNode.isExpanded) {
          this.selectedNode.defaultAction();
        } else {
          this.selectedNode.selectParent();
        }
        e.preventDefault();
        break;
      case 'ArrowRight':
        if (this.selectedNode.isExpanded) {
          this.selectedNode.selectFirstChild();
        } else {
          this.selectedNode.defaultAction();
        }
        e.preventDefault();
        break;
      case 'Home':
        this.selectRootNode();
        e.preventDefault();
        break;
      case 'End':
        this.selectLastNode();
        e.preventDefault();
        break;
      case 'Enter':
        this.selectedNode.defaultAction();
        e.preventDefault();
        break;
      default:
        return;
    }
  }

  private getRoot(): AccessibilityNode|null {
    if (!this.rootNode) {
      return null;
    }

    const rootNode = this.getNodeByAXID(this.rootNode.id);
    return rootNode || null;
  }

  private selectRootNode(): void {
    const rootNode = this.getRoot();
    if (!rootNode) {
      return;
    }

    this.selectedAXNode = rootNode;
  }

  private selectLastNode(): void {
    const rootNode = this.getRoot();
    if (!rootNode) {
      return;
    }

    let lastChild = rootNode.getLastChild();
    while (lastChild && lastChild.isExpanded) {
      lastChild = lastChild.getLastChild();
    }

    if (lastChild) {
      this.selectedAXNode = lastChild;
    }
  }

  private render(): void {
    this.refreshAccessibilityTree().then(rootNode => {
      if (!rootNode) {
        return;
      }

      this.rootNode = SDKNodeToAXNode(null, rootNode, this);

      // clang-format off
      const output = LitHtml.html`
        <style>
          :host {
            overflow: auto;
          }

          :focus {
            outline: none;
          }
        </style>
        <devtools-accessibility-node .data=${{
          axNode: this.rootNode,
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
