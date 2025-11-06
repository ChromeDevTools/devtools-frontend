var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/tree_outline/TreeOutline.js
var TreeOutline_exports = {};
__export(TreeOutline_exports, {
  ItemMouseOutEvent: () => ItemMouseOutEvent,
  ItemMouseOverEvent: () => ItemMouseOverEvent,
  ItemSelectedEvent: () => ItemSelectedEvent,
  TreeOutline: () => TreeOutline,
  defaultRenderer: () => defaultRenderer
});
import * as Platform2 from "./../../../core/platform/platform.js";
import * as UI from "./../../legacy/legacy.js";
import * as Lit2 from "./../../lit/lit.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";
import * as Buttons from "./../buttons/buttons.js";
import * as CodeHighlighter from "./../code_highlighter/code_highlighter.js";
import * as RenderCoordinator from "./../render_coordinator/render_coordinator.js";

// gen/front_end/ui/components/tree_outline/treeOutline.css.js
var treeOutline_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  --list-group-padding: 16px;
}

li {
  border: 2px solid transparent;
  list-style: none;
  text-overflow: ellipsis;
  min-height: 12px;
}

.compact {
  border: 0;
}

.tree-item:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.tree-node-key {
  white-space: var(--override-key-whitespace-wrapping);
  /* Override the default |min-width: auto| to avoid overflows of flex items */
  min-width: 0;
  flex-grow: 1;
}

.arrow-icon {
  display: block;
  user-select: none;
  mask-image: var(--image-file-arrow-collapse);
  background-color: var(--icon-default);
  margin-top: -2px;
  margin-right: 3px;
  content: "";
  text-shadow: none;
  height: 14px;
  width: 14px;
  overflow: hidden;
  flex: none;
}

ul {
  margin: 0;
  padding: 0;
}

ul[role="group"] {
  padding-left: var(--list-group-padding);
}

li:not(.parent) > .arrow-and-key-wrapper > .arrow-icon {
  mask-size: 0;
}

li.parent.expanded > .arrow-and-key-wrapper > .arrow-icon {
  mask-image: var(--image-file-arrow-drop-down);
}

li.is-top-level {
  border-top: var(--override-top-node-border);
}

li.is-top-level:last-child {
  border-bottom: var(--override-top-node-border);
}

:host([animated]) li:not(.is-top-level) {
  animation-name: slideIn;
  animation-duration: 150ms;
  animation-timing-function: cubic-bezier(0, 0, 0.3, 1);
  animation-fill-mode: forwards;
}

@keyframes slideIn {
  from {
    transform: translateY(-5px);
    opacity: 0%;
  }

  to {
    transform: none;
    opacity: 100%;
  }
}

.arrow-and-key-wrapper {
  display: flex;
  align-content: center;
  align-items: center;

  & ::selection {
    background-color: var(--sys-color-state-focus-select);
    color: currentcolor;
  }
}

[role="treeitem"]:focus {
  outline: 0;
}

ul[role="tree"]:focus-within [role="treeitem"].selected > .arrow-and-key-wrapper {
  background-color: var(--sys-color-tonal-container);
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inline-icon {
  vertical-align: sub;
}

@media (forced-colors: active) {
  .arrow-icon {
    background-color: ButtonText;
  }

  ul[role="tree"]:focus-within [role="treeitem"].selected {
    outline: solid 1px ButtonText;
  }
}

/*# sourceURL=${import.meta.resolve("./treeOutline.css")} */`;

// gen/front_end/ui/components/tree_outline/TreeOutlineUtils.js
var TreeOutlineUtils_exports = {};
__export(TreeOutlineUtils_exports, {
  findNextNodeForTreeOutlineKeyboardNavigation: () => findNextNodeForTreeOutlineKeyboardNavigation,
  getNodeChildren: () => getNodeChildren,
  getPathToTreeNode: () => getPathToTreeNode,
  isExpandableNode: () => isExpandableNode,
  trackDOMNodeToTreeNode: () => trackDOMNodeToTreeNode
});
import * as Platform from "./../../../core/platform/platform.js";
import * as Lit from "./../../lit/lit.js";
function isExpandableNode(node) {
  return "children" in node;
}
var TrackDOMNodeToTreeNode = class extends Lit.Directive.Directive {
  constructor(partInfo) {
    super(partInfo);
    if (partInfo.type !== Lit.Directive.PartType.ATTRIBUTE) {
      throw new Error("TrackDOMNodeToTreeNode directive must be used as an attribute.");
    }
  }
  update(part, [weakMap, treeNode]) {
    const elem = part.element;
    if (!(elem instanceof HTMLLIElement)) {
      throw new Error("trackTreeNodeToDOMNode must be used on <li> elements.");
    }
    weakMap.set(elem, treeNode);
  }
  /*
   * Because this directive doesn't render anything, there's no implementation
   * here for the render method. But we need it to state the params the
   * directive takes so the update() method's types are correct. Unfortunately
   * we have to pass any as the generic type because we can't define this class
   * using a generic - the generic gets lost when wrapped in the directive call
   * below.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render(_weakmap, _treeNode) {
  }
};
var trackDOMNodeToTreeNode = Lit.Directive.directive(TrackDOMNodeToTreeNode);
var findNextParentSibling = (currentDOMNode) => {
  const currentDOMNodeParentListItem = currentDOMNode.parentElement?.parentElement;
  if (currentDOMNodeParentListItem && currentDOMNodeParentListItem instanceof HTMLLIElement) {
    const parentNodeSibling = currentDOMNodeParentListItem.nextElementSibling;
    if (parentNodeSibling && parentNodeSibling instanceof HTMLLIElement) {
      return parentNodeSibling;
    }
    return findNextParentSibling(currentDOMNodeParentListItem);
  }
  return null;
};
var getFirstChildOfExpandedTreeNode = (currentDOMNode) => {
  const firstChild = currentDOMNode.querySelector(':scope > [role="group"] > [role="treeitem"]:first-child');
  if (!firstChild) {
    throw new Error("Could not find child of expanded node.");
  }
  return firstChild;
};
var domNodeIsExpandable = (domNode) => {
  return domNode.getAttribute("aria-expanded") !== null;
};
var domNodeIsLeafNode = (domNode) => {
  return !domNodeIsExpandable(domNode);
};
var domNodeIsExpanded = (domNode) => {
  return domNodeIsExpandable(domNode) && domNode.getAttribute("aria-expanded") === "true";
};
var getDeepLastChildOfExpandedTreeNode = (currentDOMNode) => {
  const lastChild = currentDOMNode.querySelector(':scope > [role="group"] > [role="treeitem"]:last-child');
  if (!lastChild) {
    throw new Error("Could not find child of expanded node.");
  }
  if (domNodeIsExpanded(lastChild)) {
    return getDeepLastChildOfExpandedTreeNode(lastChild);
  }
  return lastChild;
};
var getNextSiblingOfCurrentDOMNode = (currentDOMNode) => {
  const currentNodeSibling = currentDOMNode.nextElementSibling;
  if (currentNodeSibling && currentNodeSibling instanceof HTMLLIElement) {
    return currentNodeSibling;
  }
  return null;
};
var getPreviousSiblingOfCurrentDOMNode = (currentDOMNode) => {
  const currentNodeSibling = currentDOMNode.previousElementSibling;
  if (currentNodeSibling && currentNodeSibling instanceof HTMLLIElement) {
    return currentNodeSibling;
  }
  return null;
};
var getParentListItemForDOMNode = (currentDOMNode) => {
  let parentNode = currentDOMNode.parentElement;
  if (!parentNode) {
    return null;
  }
  while (parentNode && parentNode.getAttribute("role") !== "treeitem" && parentNode instanceof HTMLLIElement === false) {
    parentNode = parentNode.parentElement;
  }
  return parentNode;
};
var treeNodeChildrenWeakMap = /* @__PURE__ */ new WeakMap();
var getNodeChildren = async (node) => {
  if (!node.children) {
    throw new Error("Asked for children of node that does not have any children.");
  }
  const cachedChildren = treeNodeChildrenWeakMap.get(node);
  if (cachedChildren) {
    return cachedChildren;
  }
  const children = await node.children();
  treeNodeChildrenWeakMap.set(node, children);
  return children;
};
var getPathToTreeNode = async (tree, nodeIdToFind) => {
  for (const rootNode of tree) {
    const foundPathOrNull = await getPathToTreeNodeRecursively(rootNode, nodeIdToFind, [rootNode]);
    if (foundPathOrNull !== null) {
      return foundPathOrNull;
    }
  }
  return null;
};
var getPathToTreeNodeRecursively = async (currentNode, nodeIdToFind, pathToNode) => {
  if (currentNode.id === nodeIdToFind) {
    return pathToNode;
  }
  if (currentNode.children) {
    const children = await getNodeChildren(currentNode);
    for (const child of children) {
      const foundPathOrNull = await getPathToTreeNodeRecursively(child, nodeIdToFind, [...pathToNode, child]);
      if (foundPathOrNull !== null) {
        return foundPathOrNull;
      }
    }
  }
  return null;
};
var findNextNodeForTreeOutlineKeyboardNavigation = (options) => {
  const { currentDOMNode, currentTreeNode, direction, setNodeExpandedState } = options;
  if (!currentTreeNode) {
    return currentDOMNode;
  }
  if (direction === "ArrowDown") {
    if (domNodeIsExpanded(currentDOMNode)) {
      return getFirstChildOfExpandedTreeNode(currentDOMNode);
    }
    const currentNodeSibling = getNextSiblingOfCurrentDOMNode(currentDOMNode);
    if (currentNodeSibling) {
      return currentNodeSibling;
    }
    const parentSibling = findNextParentSibling(currentDOMNode);
    if (parentSibling) {
      return parentSibling;
    }
  } else if (direction === "ArrowRight") {
    if (domNodeIsLeafNode(currentDOMNode)) {
      return currentDOMNode;
    }
    if (domNodeIsExpanded(currentDOMNode)) {
      return getFirstChildOfExpandedTreeNode(currentDOMNode);
    }
    setNodeExpandedState(currentTreeNode, true);
    return currentDOMNode;
  } else if (direction === "ArrowUp") {
    const currentNodePreviousSibling = getPreviousSiblingOfCurrentDOMNode(currentDOMNode);
    if (currentNodePreviousSibling) {
      if (domNodeIsExpanded(currentNodePreviousSibling)) {
        return getDeepLastChildOfExpandedTreeNode(currentNodePreviousSibling);
      }
      return currentNodePreviousSibling;
    }
    const parentNode = getParentListItemForDOMNode(currentDOMNode);
    if (parentNode && parentNode instanceof HTMLLIElement) {
      return parentNode;
    }
  } else if (direction === "ArrowLeft") {
    if (domNodeIsExpanded(currentDOMNode)) {
      setNodeExpandedState(currentTreeNode, false);
      return currentDOMNode;
    }
    const parentNode = getParentListItemForDOMNode(currentDOMNode);
    if (parentNode && parentNode instanceof HTMLLIElement) {
      return parentNode;
    }
  }
  return currentDOMNode;
};

// gen/front_end/ui/components/tree_outline/TreeOutline.js
var { html, Directives: { ifDefined } } = Lit2;
function defaultRenderer(node) {
  return html`${node.treeNodeData}`;
}
var ItemSelectedEvent = class _ItemSelectedEvent extends Event {
  static eventName = "itemselected";
  data;
  constructor(node) {
    super(_ItemSelectedEvent.eventName, { bubbles: true, composed: true });
    this.data = { node };
  }
};
var ItemMouseOverEvent = class _ItemMouseOverEvent extends Event {
  static eventName = "itemmouseover";
  data;
  constructor(node) {
    super(_ItemMouseOverEvent.eventName, { bubbles: true, composed: true });
    this.data = { node };
  }
};
var ItemMouseOutEvent = class _ItemMouseOutEvent extends Event {
  static eventName = "itemmouseout";
  data;
  constructor(node) {
    super(_ItemMouseOutEvent.eventName, { bubbles: true, composed: true });
    this.data = { node };
  }
};
var TreeOutline = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #treeData = [];
  #nodeExpandedMap = /* @__PURE__ */ new Map();
  #domNodeToTreeNodeMap = /* @__PURE__ */ new WeakMap();
  #hasRenderedAtLeastOnce = false;
  /**
   * If we have expanded to a certain node, we want to focus it once we've
   * rendered. But we render lazily and wrapped in Lit.until, so we can't
   * know for sure when that node will be rendered. This variable tracks the
   * node that we want focused but may not yet have been rendered.
   */
  #nodeIdPendingFocus = null;
  #selectedTreeNode = null;
  #defaultRenderer = (node, _state) => {
    if (typeof node.treeNodeData !== "string") {
      console.warn(`The default TreeOutline renderer simply stringifies its given value. You passed in ${JSON.stringify(node.treeNodeData, null, 2)}. Consider providing a different defaultRenderer that can handle nodes of this type.`);
    }
    return html`${String(node.treeNodeData)}`;
  };
  #nodeFilter;
  #compact = false;
  /**
   * scheduledRender = render() has been called and scheduled a render.
   */
  #scheduledRender = false;
  /**
   * enqueuedRender = render() was called mid-way through an existing render.
   */
  #enqueuedRender = false;
  static get observedAttributes() {
    return ["nowrap", "toplevelbordercolor"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    switch (name) {
      case "nowrap": {
        this.#setNodeKeyNoWrapCSSVariable(newValue);
        break;
      }
      case "toplevelbordercolor": {
        this.#setTopLevelNodeBorderColorCSSVariable(newValue);
        break;
      }
    }
  }
  connectedCallback() {
    this.#setTopLevelNodeBorderColorCSSVariable(this.getAttribute("toplevelbordercolor"));
    this.#setNodeKeyNoWrapCSSVariable(this.getAttribute("nowrap"));
  }
  get data() {
    return {
      tree: this.#treeData,
      defaultRenderer: this.#defaultRenderer
    };
  }
  set data(data) {
    this.#defaultRenderer = data.defaultRenderer;
    this.#treeData = data.tree;
    this.#nodeFilter = data.filter;
    this.#compact = data.compact || false;
    if (!this.#hasRenderedAtLeastOnce) {
      this.#selectedTreeNode = this.#treeData[0];
    }
    void this.#render();
  }
  /**
   * Recursively expands the tree from the root nodes, to a max depth. The max
   * depth is 0 indexed - so a maxDepth of 2 (default) will expand 3 levels: 0,
   * 1 and 2.
   */
  async expandRecursively(maxDepth = 2) {
    await Promise.all(this.#treeData.map((rootNode) => this.#expandAndRecurse(rootNode, 0, maxDepth)));
    await this.#render();
  }
  /**
   * Collapses all nodes in the tree.
   */
  async collapseAllNodes() {
    this.#nodeExpandedMap.clear();
    await this.#render();
  }
  /**
   * Takes a TreeNode, expands the outline to reveal it, and focuses it.
   */
  async expandToAndSelectTreeNode(targetTreeNode) {
    return await this.expandToAndSelectTreeNodeId(targetTreeNode.id);
  }
  /**
   * Takes a TreeNode ID, expands the outline to reveal it, and focuses it.
   */
  async expandToAndSelectTreeNodeId(targetTreeNodeId) {
    const pathToTreeNode = await getPathToTreeNode(this.#treeData, targetTreeNodeId);
    if (pathToTreeNode === null) {
      throw new Error(`Could not find node with id ${targetTreeNodeId} in the tree.`);
    }
    pathToTreeNode.forEach((node, index) => {
      if (index < pathToTreeNode.length - 1) {
        this.#setNodeExpandedState(node, true);
      }
    });
    this.#nodeIdPendingFocus = targetTreeNodeId;
    await this.#render();
  }
  /**
   * Takes a list of TreeNode IDs and expands the corresponding nodes.
   */
  expandNodeIds(nodeIds) {
    nodeIds.forEach((id) => this.#nodeExpandedMap.set(id, true));
    return this.#render();
  }
  /**
   * Takes a TreeNode ID and focuses the corresponding node.
   */
  focusNodeId(nodeId) {
    this.#nodeIdPendingFocus = nodeId;
    return this.#render();
  }
  async collapseChildrenOfNode(domNode) {
    const treeNode = this.#domNodeToTreeNodeMap.get(domNode);
    if (!treeNode) {
      return;
    }
    await this.#recursivelyCollapseTreeNodeChildren(treeNode);
    await this.#render();
  }
  #setNodeKeyNoWrapCSSVariable(attributeValue) {
    this.style.setProperty("--override-key-whitespace-wrapping", attributeValue !== null ? "nowrap" : "initial");
  }
  #setTopLevelNodeBorderColorCSSVariable(attributeValue) {
    this.style.setProperty("--override-top-node-border", attributeValue ? `1px solid ${attributeValue}` : "");
  }
  async #recursivelyCollapseTreeNodeChildren(treeNode) {
    if (!isExpandableNode(treeNode) || !this.#nodeIsExpanded(treeNode)) {
      return;
    }
    const children = await this.#fetchNodeChildren(treeNode);
    const childRecursions = Promise.all(children.map((child) => this.#recursivelyCollapseTreeNodeChildren(child)));
    await childRecursions;
    this.#setNodeExpandedState(treeNode, false);
  }
  async #flattenSubtree(node, filter) {
    const children = await getNodeChildren(node);
    const filteredChildren = [];
    for (const child of children) {
      const filtering = filter(child.treeNodeData);
      const toBeSelected = this.#isSelectedNode(child) || child.id === this.#nodeIdPendingFocus;
      const expanded = this.#nodeExpandedMap.get(child.id);
      if (filtering === "SHOW" || toBeSelected || expanded) {
        filteredChildren.push(child);
      } else if (filtering === "FLATTEN" && isExpandableNode(child)) {
        const grandChildren = await this.#flattenSubtree(child, filter);
        filteredChildren.push(...grandChildren);
      }
    }
    return filteredChildren;
  }
  async #fetchNodeChildren(node) {
    const children = await getNodeChildren(node);
    const filter = this.#nodeFilter;
    if (!filter) {
      return children;
    }
    const filteredDescendants = await this.#flattenSubtree(node, filter);
    return filteredDescendants.length ? filteredDescendants : children;
  }
  #setNodeExpandedState(node, newExpandedState) {
    this.#nodeExpandedMap.set(node.id, newExpandedState);
  }
  #nodeIsExpanded(node) {
    return this.#nodeExpandedMap.get(node.id) || false;
  }
  async #expandAndRecurse(node, currentDepth, maxDepth) {
    if (!isExpandableNode(node)) {
      return;
    }
    this.#setNodeExpandedState(node, true);
    if (currentDepth === maxDepth || !isExpandableNode(node)) {
      return;
    }
    const children = await this.#fetchNodeChildren(node);
    await Promise.all(children.map((child) => this.#expandAndRecurse(child, currentDepth + 1, maxDepth)));
  }
  #onArrowClick(node) {
    return (event) => {
      event.stopPropagation();
      if (isExpandableNode(node)) {
        this.#setNodeExpandedState(node, !this.#nodeIsExpanded(node));
        void this.#render();
      }
    };
  }
  #onNodeClick(event) {
    event.stopPropagation();
    const nodeClickExpandsOrContracts = this.getAttribute("clickabletitle") !== null;
    const domNode = event.currentTarget;
    const node = this.#domNodeToTreeNodeMap.get(domNode);
    if (nodeClickExpandsOrContracts && node && isExpandableNode(node)) {
      this.#setNodeExpandedState(node, !this.#nodeIsExpanded(node));
    }
    void this.#focusTreeNode(domNode);
  }
  async #focusTreeNode(domNode) {
    const treeNode = this.#domNodeToTreeNodeMap.get(domNode);
    if (!treeNode) {
      return;
    }
    this.#selectedTreeNode = treeNode;
    await this.#render();
    this.dispatchEvent(new ItemSelectedEvent(treeNode));
    void RenderCoordinator.write("DOMNode focus", () => {
      domNode.focus();
    });
  }
  #processHomeAndEndKeysNavigation(key) {
    if (key === "Home") {
      const firstRootNode = this.#shadow.querySelector('ul[role="tree"] > li[role="treeitem"]');
      if (firstRootNode) {
        void this.#focusTreeNode(firstRootNode);
      }
    } else if (key === "End") {
      const allTreeItems = this.#shadow.querySelectorAll('li[role="treeitem"]');
      const lastTreeItem = allTreeItems[allTreeItems.length - 1];
      if (lastTreeItem) {
        void this.#focusTreeNode(lastTreeItem);
      }
    }
  }
  async #processArrowKeyNavigation(key, currentDOMNode) {
    const currentTreeNode = this.#domNodeToTreeNodeMap.get(currentDOMNode);
    if (!currentTreeNode) {
      return;
    }
    const domNode = findNextNodeForTreeOutlineKeyboardNavigation({
      currentDOMNode,
      currentTreeNode,
      direction: key,
      setNodeExpandedState: (node, expanded) => this.#setNodeExpandedState(node, expanded)
    });
    await this.#focusTreeNode(domNode);
  }
  #processEnterOrSpaceNavigation(currentDOMNode) {
    const currentTreeNode = this.#domNodeToTreeNodeMap.get(currentDOMNode);
    if (!currentTreeNode) {
      return;
    }
    if (isExpandableNode(currentTreeNode)) {
      const currentExpandedState = this.#nodeIsExpanded(currentTreeNode);
      this.#setNodeExpandedState(currentTreeNode, !currentExpandedState);
      void this.#render();
    }
  }
  async #onTreeKeyDown(event) {
    if (!(event.target instanceof HTMLLIElement)) {
      throw new Error("event.target was not an <li> element");
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      this.#processHomeAndEndKeysNavigation(event.key);
    } else if (Platform2.KeyboardUtilities.keyIsArrowKey(event.key)) {
      event.preventDefault();
      await this.#processArrowKeyNavigation(event.key, event.target);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.#processEnterOrSpaceNavigation(event.target);
    }
  }
  #focusPendingNode(domNode) {
    this.#nodeIdPendingFocus = null;
    void this.#focusTreeNode(domNode);
  }
  #isSelectedNode(node) {
    if (this.#selectedTreeNode) {
      return node.id === this.#selectedTreeNode.id;
    }
    return false;
  }
  #renderNode(node, { depth, setSize, positionInSet }) {
    let childrenToRender;
    const nodeIsExpanded = this.#nodeIsExpanded(node);
    if (!isExpandableNode(node) || !nodeIsExpanded) {
      childrenToRender = Lit2.nothing;
    } else {
      const childNodes = this.#fetchNodeChildren(node).then((children) => {
        return children.map((childNode, index) => {
          return this.#renderNode(childNode, { depth: depth + 1, setSize: children.length, positionInSet: index });
        });
      });
      childrenToRender = html`<ul role="group">${Lit2.Directives.until(childNodes)}</ul>`;
    }
    const nodeIsFocusable = this.#isSelectedNode(node);
    const tabIndex = nodeIsFocusable ? 0 : -1;
    const listItemClasses = Lit2.Directives.classMap({
      expanded: isExpandableNode(node) && nodeIsExpanded,
      parent: isExpandableNode(node),
      selected: this.#isSelectedNode(node),
      "is-top-level": depth === 0,
      compact: this.#compact
    });
    const ariaExpandedAttribute = !isExpandableNode(node) ? void 0 : nodeIsExpanded ? "true" : "false";
    let renderedNodeKey;
    if (node.renderer) {
      renderedNodeKey = node.renderer(node, { isExpanded: nodeIsExpanded });
    } else {
      renderedNodeKey = this.#defaultRenderer(node, { isExpanded: nodeIsExpanded });
    }
    return html`
      <li role="treeitem"
        tabindex=${tabIndex}
        aria-setsize=${setSize}
        aria-expanded=${ifDefined(ariaExpandedAttribute)}
        aria-level=${depth + 1}
        aria-posinset=${positionInSet + 1}
        class=${listItemClasses}
        jslog=${VisualLogging.treeItem(node.jslogContext).track({ click: true, keydown: "ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Enter|Space|Home|End" })}
        @click=${this.#onNodeClick}
        track-dom-node-to-tree-node=${trackDOMNodeToTreeNode(this.#domNodeToTreeNodeMap, node)}
        ${Lit2.Directives.ref((domNode) => {
      if (!(domNode instanceof HTMLLIElement)) {
        return;
      }
      if (this.#nodeIdPendingFocus && node.id === this.#nodeIdPendingFocus) {
        this.#focusPendingNode(domNode);
      }
    })}
      >
        <span class="arrow-and-key-wrapper"
          @mouseover=${() => {
      this.dispatchEvent(new ItemMouseOverEvent(node));
    }}
          @mouseout=${() => {
      this.dispatchEvent(new ItemMouseOutEvent(node));
    }}
        >
          <span class="arrow-icon" @click=${this.#onArrowClick(node)} jslog=${VisualLogging.expand().track({ click: true })}>
          </span>
          <span class="tree-node-key" data-node-key=${node.treeNodeData}>${renderedNodeKey}</span>
        </span>
        ${childrenToRender}
      </li>
    `;
  }
  async #render() {
    if (this.#scheduledRender) {
      this.#enqueuedRender = true;
      return;
    }
    this.#scheduledRender = true;
    await RenderCoordinator.write("TreeOutline render", () => {
      Lit2.render(html`
      <style>${Buttons.textButtonStyles}</style>
      <style>${UI.inspectorCommonStyles}</style>
      <style>${treeOutline_css_default}</style>
      <style>${CodeHighlighter.codeHighlighterStyles}</style>
      <div class="wrapping-container">
        <ul role="tree" @keydown=${this.#onTreeKeyDown}>
          ${this.#treeData.map((topLevelNode, index) => {
        return this.#renderNode(topLevelNode, {
          depth: 0,
          setSize: this.#treeData.length,
          positionInSet: index
        });
      })}
        </ul>
      </div>
      `, this.#shadow, {
        host: this
      });
    });
    this.#hasRenderedAtLeastOnce = true;
    this.#scheduledRender = false;
    if (this.#enqueuedRender) {
      this.#enqueuedRender = false;
      return await this.#render();
    }
  }
};
customElements.define("devtools-tree-outline", TreeOutline);
export {
  TreeOutline_exports as TreeOutline,
  TreeOutlineUtils_exports as TreeOutlineUtils
};
//# sourceMappingURL=tree_outline.js.map
