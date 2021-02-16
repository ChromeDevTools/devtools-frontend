// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../third_party/lit-html/lit-html.js';

import {AXNode} from './AccessibilityTreeUtils.js';

import type {AccessibilityNode, AccessibilityNodeData} from './AccessibilityNode.js';

export interface AccessibilityTreeData {
  rootNode: AXNode;
}

export class AccessibilityTree extends HTMLElement {
  private readonly shadow = this.attachShadow({
    mode: 'open',
    delegatesFocus: false,
  });
  private nodeMap: Map<string, AccessibilityNode> = new Map();
  private rootNode: AXNode|null = null;
  private selectedNode: AccessibilityNode|null = null;

  constructor() {
    super();
    this.setAttribute('role', 'tree');
    this.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  set data(data: AccessibilityTreeData) {
    this.rootNode = data.rootNode;
    if (!this.rootNode) {
      throw new Error('Root node is missing');
    }
    this.render();
    this.selectRootNode();
    this.expandTree();
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

  async expandTree(): Promise<void> {
    if (!this.rootNode) {
      return;
    }
    let levelNodes = [this.rootNode];
    // Expand the first 3 levels which are expected to be preloaded.
    for (let level = 0; level < 3; level++) {
      const nextLevelNodes = [];
      for (const node of levelNodes) {
        await this.nodeMap.get(node.id)?.expand();
        nextLevelNodes.push(...(await node.children()));
      }
      levelNodes = nextLevelNodes;
    }
  }

  getNodeByAXID(id: string): AccessibilityNode|null {
    return this.nodeMap.get(id) || null;
  }

  appendToNodeMap(id: string, node: AccessibilityNode): void {
    this.nodeMap.set(id, node);
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
