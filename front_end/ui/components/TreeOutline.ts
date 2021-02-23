// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../platform/platform.js';
import * as Coordinator from '../../render_coordinator/render_coordinator.js';
import * as LitHtml from '../../third_party/lit-html/lit-html.js';

import {findNextNodeForTreeOutlineKeyboardNavigation, isExpandableNode, trackDOMNodeToTreeNode, TreeNode, TreeNodeWithChildren} from './TreeOutlineUtils.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

export interface TreeOutlineData<TreeNodeDataType> {
  defaultRenderer: (node: TreeNode<TreeNodeDataType>, state: {isExpanded: boolean}) => LitHtml.TemplateResult;
  tree: TreeNode<TreeNodeDataType>[];
}

export function defaultRenderer(node: TreeNode<string>): LitHtml.TemplateResult {
  return LitHtml.html`${node.treeNodeData}`;
}

export class TreeOutline<TreeNodeDataType> extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private treeData: readonly TreeNode<TreeNodeDataType>[] = [];
  private nodeExpandedMap: WeakMap<TreeNode<TreeNodeDataType>, boolean> = new WeakMap();
  private nodeChildrenCacheMap: WeakMap<TreeNode<TreeNodeDataType>, TreeNode<TreeNodeDataType>[]> = new WeakMap();
  private domNodeToTreeNodeMap: WeakMap<HTMLLIElement, TreeNode<TreeNodeDataType>> = new WeakMap();
  private hasRenderedAtLeastOnce = false;
  private focusableTreeNode: TreeNode<TreeNodeDataType>|null = null;
  private defaultRenderer =
      (node: TreeNode<TreeNodeDataType>, _state: {isExpanded: boolean}): LitHtml.TemplateResult => {
        if (typeof node.treeNodeData !== 'string') {
          console.warn(`The default TreeOutline renderer simply stringifies its given value. You passed in ${
              JSON.stringify(
                  node.treeNodeData, null,
                  2)}. Consider providing a different defaultRenderer that can handle nodes of this type.`);
        }
        return LitHtml.html`${String(node.treeNodeData)}`;
      };

  /**
   * scheduledRender = render() has been called and scheduled a render.
   */
  private scheduledRender = false;
  /**
   * enqueuedRender = render() was called mid-way through an existing render.
   */
  private enqueuedRender = false;

  get data(): TreeOutlineData<TreeNodeDataType> {
    return {
      tree: this.treeData as TreeNode<TreeNodeDataType>[],
      defaultRenderer: this.defaultRenderer,
    };
  }

  set data(data: TreeOutlineData<TreeNodeDataType>) {
    this.defaultRenderer = data.defaultRenderer;
    this.treeData = data.tree;
    if (!this.hasRenderedAtLeastOnce) {
      this.focusableTreeNode = this.treeData[0];
    }
    this.render();
  }

  /**
   * Recursively expands the tree from the root nodes, to a max depth. The max
   * depth is 0 indexed - so a maxDepth of 2 (default) will expand 3 levels: 0,
   * 1 and 2.
   */
  async expandRecursively(maxDepth = 2): Promise<void> {
    await Promise.all(this.treeData.map(rootNode => this.expandAndRecurse(rootNode, 0, maxDepth)));
    this.render();
  }

  async collapseChildrenOfNode(domNode: HTMLLIElement): Promise<void> {
    const treeNode = this.domNodeToTreeNodeMap.get(domNode);
    if (!treeNode) {
      return;
    }
    await this.recursivelyCollapseTreeNodeChildren(treeNode);
    this.render();
  }

  private async recursivelyCollapseTreeNodeChildren(treeNode: TreeNode<TreeNodeDataType>): Promise<void> {
    if (!isExpandableNode(treeNode) || !this.nodeIsExpanded(treeNode)) {
      return;
    }
    const children = await this.fetchNodeChildren(treeNode);
    const childRecursions = Promise.all(children.map(child => this.recursivelyCollapseTreeNodeChildren(child)));
    await childRecursions;
    this.setNodeExpandedState(treeNode, false);
  }

  private getFocusableTreeNode(): TreeNode<TreeNodeDataType> {
    if (!this.focusableTreeNode) {
      throw new Error('getFocusableNode was called but focusableNode is null');
    }
    return this.focusableTreeNode;
  }

  private async fetchNodeChildren(node: TreeNodeWithChildren<TreeNodeDataType>): Promise<TreeNode<TreeNodeDataType>[]> {
    const cached = this.nodeChildrenCacheMap.get(node);
    if (cached) {
      return cached;
    }
    const children = await node.children();
    this.nodeChildrenCacheMap.set(node, children);
    return children;
  }

  private setNodeExpandedState(node: TreeNode<TreeNodeDataType>, newExpandedState: boolean): void {
    this.nodeExpandedMap.set(node, newExpandedState);
  }

  private nodeIsExpanded(node: TreeNode<TreeNodeDataType>): boolean {
    return this.nodeExpandedMap.get(node) || false;
  }

  private async expandAndRecurse(node: TreeNode<TreeNodeDataType>, currentDepth: number, maxDepth: number):
      Promise<void> {
    if (!isExpandableNode(node)) {
      return;
    }
    this.setNodeExpandedState(node, true);
    if (currentDepth === maxDepth || !isExpandableNode(node)) {
      return;
    }
    const children = await this.fetchNodeChildren(node);
    await Promise.all(children.map(child => this.expandAndRecurse(child, currentDepth + 1, maxDepth)));
  }

  private onArrowClick(node: TreeNode<TreeNodeDataType>): ((e: Event) => void) {
    return (event: Event): void => {
      event.stopPropagation();
      if (isExpandableNode(node)) {
        this.setNodeExpandedState(node, !this.nodeIsExpanded(node));
        this.render();
      }
    };
  }

  private onNodeClick(event: Event): void {
    // Avoid it bubbling up to parent tree elements, else clicking a node deep in the tree will toggle it + all its ancestor's visibility.
    event.stopPropagation();
    this.focusTreeNode(event.target as HTMLLIElement);
  }

  private async focusTreeNode(domNode: HTMLLIElement): Promise<void> {
    const treeNode = this.domNodeToTreeNodeMap.get(domNode);
    if (!treeNode) {
      return;
    }
    this.focusableTreeNode = treeNode;
    await this.render();
    coordinator.write(() => {
      domNode.focus();
    });
  }

  private processHomeAndEndKeysNavigation(key: 'Home'|'End'): void {
    if (key === 'Home') {
      const firstRootNode = this.shadow.querySelector<HTMLLIElement>('ul[role="tree"] > li[role="treeitem"]');
      if (firstRootNode) {
        this.focusTreeNode(firstRootNode);
      }
    } else if (key === 'End') {
      /**
       * The End key takes the user to the last visible node in the tree - you
       * can think of this as the one that's rendered closest to the bottom of
       * the page.
       *
       * We could walk our tree and compute this - but it will also be the last
       * li[role="treeitem"] in the DOM because we only render visible nodes.
       * Therefore we can select all the nodes and pick the last one.
       */
      const allTreeItems = this.shadow.querySelectorAll<HTMLLIElement>('li[role="treeitem"]');
      const lastTreeItem = allTreeItems[allTreeItems.length - 1];
      if (lastTreeItem) {
        this.focusTreeNode(lastTreeItem);
      }
    }
  }

  private async processArrowKeyNavigation(key: Platform.KeyboardUtilities.ArrowKey, currentDOMNode: HTMLLIElement):
      Promise<void> {
    const currentTreeNode = this.domNodeToTreeNodeMap.get(currentDOMNode);
    if (!currentTreeNode) {
      return;
    }

    const domNode = findNextNodeForTreeOutlineKeyboardNavigation({
      currentDOMNode,
      currentTreeNode,
      direction: key,
      setNodeExpandedState: (node, expanded) => this.setNodeExpandedState(node, expanded),
    });
    this.focusTreeNode(domNode);
  }

  private processEnterOrSpaceNavigation(currentDOMNode: HTMLLIElement): void {
    const currentTreeNode = this.domNodeToTreeNodeMap.get(currentDOMNode);
    if (!currentTreeNode) {
      return;
    }
    if (isExpandableNode(currentTreeNode)) {
      const currentExpandedState = this.nodeIsExpanded(currentTreeNode);
      this.setNodeExpandedState(currentTreeNode, !currentExpandedState);
      this.render();
    }
  }

  private async onTreeKeyDown(event: KeyboardEvent): Promise<void> {
    if (!(event.target instanceof HTMLLIElement)) {
      throw new Error('event.target was not an <li> element');
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      this.processHomeAndEndKeysNavigation(event.key);
    } else if (Platform.KeyboardUtilities.keyIsArrowKey(event.key)) {
      event.preventDefault();
      await this.processArrowKeyNavigation(event.key, event.target);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.processEnterOrSpaceNavigation(event.target);
    }
  }

  private async renderNode(node: TreeNode<TreeNodeDataType>, {depth, setSize, positionInSet}: {
    depth: number,
    setSize: number,
    positionInSet: number,
  }): Promise<LitHtml.TemplateResult> {
    let childrenToRender;
    const nodeIsExpanded = this.nodeIsExpanded(node);
    if (!isExpandableNode(node) || !nodeIsExpanded) {
      childrenToRender = LitHtml.nothing;
    } else {
      const children = await this.fetchNodeChildren(node);
      const childNodes = Promise.all(children.map((childNode, index) => {
        return this.renderNode(childNode, {depth: depth + 1, setSize: children.length, positionInSet: index});
      }));
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      childrenToRender = LitHtml.html`<ul role="group">${LitHtml.Directives.until(childNodes)}</ul>`;
      // clang-format on
    }

    const nodeIsFocusable = this.getFocusableTreeNode() === node;
    const tabIndex = nodeIsFocusable ? 0 : -1;
    const listItemClasses = LitHtml.Directives.classMap({
      expanded: isExpandableNode(node) && nodeIsExpanded,
      parent: isExpandableNode(node),
    });
    const ariaExpandedAttribute = LitHtml.Directives.ifDefined(isExpandableNode(node) ? String(nodeIsExpanded) : undefined);

    let renderedNodeKey: LitHtml.TemplateResult;
    if (node.renderer) {
      renderedNodeKey = node.renderer(node, {isExpanded: nodeIsExpanded});
    } else {
      renderedNodeKey = this.defaultRenderer(node, {isExpanded: nodeIsExpanded});
    }
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
      <li role="treeitem"
        tabindex=${tabIndex}
        aria-setsize=${setSize}
        aria-expanded=${ariaExpandedAttribute}
        aria-level=${depth + 1}
        aria-posinset=${positionInSet + 1}
        class=${listItemClasses}
        @click=${this.onNodeClick}
        track-dom-node-to-tree-node=${trackDOMNodeToTreeNode(this.domNodeToTreeNodeMap, node)}
      >
        <span class="arrow-and-key-wrapper">
          <span class="arrow-icon" @click=${this.onArrowClick(node)}>
          </span>
          <span class="tree-node-key" data-node-key=${node.treeNodeData}>${renderedNodeKey}</span>
        </span>
        ${childrenToRender}
      </li>
    `;
    // clang-format on
  }
  private async render(): Promise<void> {
    if (this.scheduledRender) {
      // If we are already rendering, don't render again immediately, but
      // enqueue it to be run after we're done on our current render.
      this.enqueuedRender = true;
      return;
    }

    this.scheduledRender = true;

    await coordinator.write(() => {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      LitHtml.render(LitHtml.html`
      <style>
        li {
          list-style: none;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-height: 12px;
        }

        .arrow-icon {
          display: inline-block;
          user-select: none;
          -webkit-mask-image: url(Images/treeoutlineTriangles.svg);
          -webkit-mask-size: 32px 24px;
          -webkit-mask-position: 0 0;
          background-color: var(--color-text-primary);
          content: "";
          text-shadow: none;
          margin-right: -2px;
          height: 12px;
          width: 13px;
          overflow: hidden;
        }

        ul {
          margin: 0;
          padding: 0;
        }

        ul[role="group"] {
          padding-left: 16px;
        }

        li:not(.parent) > .arrow-and-key-wrapper > .arrow-icon {
          -webkit-mask-size: 0;
        }

        li.parent.expanded > .arrow-and-key-wrapper > .arrow-icon {
          -webkit-mask-position: -16px 0;
        }

        .arrow-and-key-wrapper {
          border: 2px solid transparent;
        }

        [role="treeitem"]:focus {
          outline: 0;
        }

        [role="treeitem"]:focus > .arrow-and-key-wrapper {
          /* stylelint-disable-next-line color-named */
          border-color: black;
        }
      </style>
      <div class="wrapping-container">
      <ul role="tree" @keydown=${this.onTreeKeyDown}>
        ${this.treeData.map((topLevelNode, index) => {
          return LitHtml.Directives.until(this.renderNode(topLevelNode, {
            depth: 0,
            setSize: this.treeData.length,
            positionInSet: index,
          }));
        })}
      </ul>
      </div>
      `, this.shadow, {
        eventContext: this,
      });
    });
    // clang-format on
    this.hasRenderedAtLeastOnce = true;
    this.scheduledRender = false;

    // If render() was called when we were already mid-render, let's re-render
    // to ensure we're not rendering any stale UI.
    if (this.enqueuedRender) {
      this.enqueuedRender = false;
      this.render();
    }
  }
}

customElements.define('devtools-tree-outline', TreeOutline);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-tree-outline': TreeOutline<unknown>;
  }
}
