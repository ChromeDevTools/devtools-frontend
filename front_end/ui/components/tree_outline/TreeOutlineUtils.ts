// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../../core/platform/platform.js';
import * as Lit from '../../lit/lit.js';

export type TreeNodeId = string;

interface BaseTreeNode<TreeNodeDataType> {
  treeNodeData: TreeNodeDataType;
  renderer?: (node: TreeNode<TreeNodeDataType>, state: {isExpanded: boolean}) => Lit.TemplateResult;
  id: TreeNodeId;
  jslogContext?: string;
}

export interface TreeNodeWithChildren<TreeNodeDataType> extends BaseTreeNode<TreeNodeDataType> {
  children: () => Promise<Array<TreeNode<TreeNodeDataType>>>;
}

interface LeafNode<TreeNodeDataType> extends BaseTreeNode<TreeNodeDataType> {
  children?: never;
}

export type TreeNode<TreeNodeDataType> = TreeNodeWithChildren<TreeNodeDataType>|LeafNode<TreeNodeDataType>;

export function isExpandableNode<TreeNodeDataType>(node: TreeNode<TreeNodeDataType>):
    node is TreeNodeWithChildren<TreeNodeDataType> {
  return 'children' in node;
}

/**
 * This is a custom lit directive that lets us track the DOM nodes that Lit
 * creates and maps them to the tree node that was given to us. This means we
 * can navigate between real DOM node and structural tree node easily in code.
 */

class TrackDOMNodeToTreeNode extends Lit.Directive.Directive {
  constructor(partInfo: Lit.Directive.PartInfo) {
    super(partInfo);

    if (partInfo.type !== Lit.Directive.PartType.ATTRIBUTE) {
      throw new Error('TrackDOMNodeToTreeNode directive must be used as an attribute.');
    }
  }

  override update(part: Lit.Directive.ElementPart, [weakMap, treeNode]: Lit.Directive.DirectiveParameters<this>): void {
    const elem = part.element;
    if (!(elem instanceof HTMLLIElement)) {
      throw new Error('trackTreeNodeToDOMNode must be used on <li> elements.');
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
  render(_weakmap: WeakMap<HTMLLIElement, TreeNode<any>>, _treeNode: TreeNode<any>): void {
  }
}

export const trackDOMNodeToTreeNode = Lit.Directive.directive(TrackDOMNodeToTreeNode);

/**
 * Finds the next sibling of the node's parent, recursing up the tree if
 * required.
 * Given:
 * A
 *   * B
 *     * C
 * D
 * If called on B, this will return D. If called on C, this will also return D.
 */
const findNextParentSibling = (currentDOMNode: HTMLLIElement): HTMLLIElement|null => {
  // We go up two parents here because the structure is:
  // <li treeitem> => <ul group> => <li treeitem>
  // So if we are on the last treeitem (furthest to the right), we need to find its parent tree item, which is two parents up.
  const currentDOMNodeParentListItem = currentDOMNode.parentElement?.parentElement;

  if (currentDOMNodeParentListItem && currentDOMNodeParentListItem instanceof HTMLLIElement) {
    const parentNodeSibling = currentDOMNodeParentListItem.nextElementSibling;
    // If this parent doesn't have a sibling, recurse up the tree to look for
    // the nearest parent that does have a sibling.
    if (parentNodeSibling && parentNodeSibling instanceof HTMLLIElement) {
      return parentNodeSibling;
    }
    return findNextParentSibling(currentDOMNodeParentListItem);
  }
  return null;
};

const getFirstChildOfExpandedTreeNode = (currentDOMNode: HTMLLIElement): HTMLLIElement => {
  const firstChild =
      currentDOMNode.querySelector<HTMLLIElement>(':scope > [role="group"] > [role="treeitem"]:first-child');
  if (!firstChild) {
    throw new Error('Could not find child of expanded node.');
  }
  return firstChild;
};

const domNodeIsExpandable = (domNode: HTMLLIElement): boolean => {
  // Nodes with no children are not given the aria-expanded attributes.
  // Nodes with children are given aria-expanded = true/false.
  return domNode.getAttribute('aria-expanded') !== null;
};

const domNodeIsLeafNode = (domNode: HTMLLIElement): boolean => {
  return !domNodeIsExpandable(domNode);
};

const domNodeIsExpanded = (domNode: HTMLLIElement): boolean => {
  // Nodes with no children are not given the aria-expanded attributes.
  // Nodes with children are given aria-expanded = true/false.
  return domNodeIsExpandable(domNode) && domNode.getAttribute('aria-expanded') === 'true';
};

const getDeepLastChildOfExpandedTreeNode = (currentDOMNode: HTMLLIElement): HTMLLIElement => {
  const lastChild =
      currentDOMNode.querySelector<HTMLLIElement>(':scope > [role="group"] > [role="treeitem"]:last-child');
  if (!lastChild) {
    throw new Error('Could not find child of expanded node.');
  }

  if (domNodeIsExpanded(lastChild)) {
    return getDeepLastChildOfExpandedTreeNode(lastChild);
  }
  return lastChild;
};

const getNextSiblingOfCurrentDOMNode = (currentDOMNode: HTMLLIElement): HTMLLIElement|null => {
  const currentNodeSibling = currentDOMNode.nextElementSibling;
  if (currentNodeSibling && currentNodeSibling instanceof HTMLLIElement) {
    return currentNodeSibling;
  }
  return null;
};

const getPreviousSiblingOfCurrentDOMNode = (currentDOMNode: HTMLLIElement): HTMLLIElement|null => {
  const currentNodeSibling = currentDOMNode.previousElementSibling;
  if (currentNodeSibling && currentNodeSibling instanceof HTMLLIElement) {
    return currentNodeSibling;
  }
  return null;
};

const getParentListItemForDOMNode = (currentDOMNode: HTMLLIElement): HTMLLIElement|null => {
  let parentNode = currentDOMNode.parentElement;
  if (!parentNode) {
    return null;
  }
  while (parentNode && parentNode.getAttribute('role') !== 'treeitem' &&
         (parentNode instanceof HTMLLIElement) === false) {
    parentNode = parentNode.parentElement;
  }
  return parentNode as HTMLLIElement;
};

/**
 * We cache a tree node's children; they are lazily evaluated and if two code
 * paths get the children, we need to make sure they get the same objects.
 *
 * We're OK to use <unknown> here as the weakmap doesn't care and a TreeOutline that
 * adds nodes of type X to the map will always then get children of that type
 * back as that's enforced by the TreeOutline types elsewhere. We can't make
 * this WeakMap easily generic as it's a top level variable.
 */
const treeNodeChildrenWeakMap = new WeakMap<TreeNode<unknown>, Array<TreeNode<unknown>>>();
export const getNodeChildren =
    async<TreeNodeDataType>(node: TreeNode<TreeNodeDataType>): Promise<Array<TreeNode<TreeNodeDataType>>> => {
  if (!node.children) {
    throw new Error('Asked for children of node that does not have any children.');
  }

  const cachedChildren = treeNodeChildrenWeakMap.get(node as TreeNode<unknown>);
  if (cachedChildren) {
    return cachedChildren as unknown as Array<TreeNode<TreeNodeDataType>>;
  }

  const children = await node.children();
  treeNodeChildrenWeakMap.set(node as TreeNode<unknown>, children as Array<TreeNode<unknown>>);
  return children;
};

/**
 * Searches the tree and returns a path to the given node.
 * e.g. if the tree is:
 * A
 * - B
 *   - C
 * - D
 *   - E
 *   - F
 *
 * And you look for F, you'll get back [A, D, F]
 */
export const getPathToTreeNode =
    async<TreeNodeDataType>(tree: ReadonlyArray<TreeNode<TreeNodeDataType>>, nodeIdToFind: TreeNodeId):
        Promise<Array<TreeNode<TreeNodeDataType>>|null> => {
          for (const rootNode of tree) {
            const foundPathOrNull = await getPathToTreeNodeRecursively(rootNode, nodeIdToFind, [rootNode]);
            if (foundPathOrNull !== null) {
              return foundPathOrNull;
            }
          }
          return null;
        };

const getPathToTreeNodeRecursively = async<TreeNodeDataType>(
    currentNode: TreeNode<TreeNodeDataType>, nodeIdToFind: TreeNodeId,
    pathToNode: Array<TreeNode<TreeNodeDataType>>): Promise<Array<TreeNode<TreeNodeDataType>>|null> => {
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

interface KeyboardNavigationOptions<TreeNodeDataType> {
  currentDOMNode: HTMLLIElement;
  currentTreeNode: TreeNode<TreeNodeDataType>;
  direction: Platform.KeyboardUtilities.ArrowKey;
  setNodeExpandedState: (treeNode: TreeNode<TreeNodeDataType>, expanded: boolean) => void;
}

export const findNextNodeForTreeOutlineKeyboardNavigation =
    <TreeNodeDataType>(options: KeyboardNavigationOptions<TreeNodeDataType>): HTMLLIElement => {
      const {
        currentDOMNode,
        currentTreeNode,
        direction,
        setNodeExpandedState,
      } = options;
      if (!currentTreeNode) {
        return currentDOMNode;
      }

      if (direction === Platform.KeyboardUtilities.ArrowKey.DOWN) {
        // If the node has expanded children, down takes you into that list.
        if (domNodeIsExpanded(currentDOMNode)) {
          return getFirstChildOfExpandedTreeNode(currentDOMNode);
        }
        // If the node has a sibling, we go to that.
        const currentNodeSibling = getNextSiblingOfCurrentDOMNode(currentDOMNode);
        if (currentNodeSibling) {
          return currentNodeSibling;
        }

        // If the Node's parent has a sibling then we go to that.
        const parentSibling = findNextParentSibling(currentDOMNode);
        if (parentSibling) {
          return parentSibling;
        }
      } else if (direction === Platform.KeyboardUtilities.ArrowKey.RIGHT) {
        if (domNodeIsLeafNode(currentDOMNode)) {
          // If the node cannot be expanded, we have nothing to do and we leave everything as is.
          return currentDOMNode;
        }

        // If the current node is expanded, move and focus into the first child
        if (domNodeIsExpanded(currentDOMNode)) {
          return getFirstChildOfExpandedTreeNode(currentDOMNode);
        }
        // Else, we expand the Node (but leave focus where it is)
        setNodeExpandedState(currentTreeNode, true);
        return currentDOMNode;
      } else if (direction === Platform.KeyboardUtilities.ArrowKey.UP) {
        // First see if there is a previous sibling
        const currentNodePreviousSibling = getPreviousSiblingOfCurrentDOMNode(currentDOMNode);
        if (currentNodePreviousSibling) {
          // We now find the nested node within our previous sibling; if it has
          // children that are expanded, we want to find the last child and
          // highlight that, else we'll highlight our sibling directly.
          if (domNodeIsExpanded(currentNodePreviousSibling)) {
            return getDeepLastChildOfExpandedTreeNode(currentNodePreviousSibling);
          }
          // Otherwise, if we have a previous sibling with no children, focus it.
          return currentNodePreviousSibling;
        }

        // Otherwise, let's go to the direct parent if there is one.
        const parentNode = getParentListItemForDOMNode(currentDOMNode);
        if (parentNode && parentNode instanceof HTMLLIElement) {
          return parentNode;
        }
      } else if (direction === Platform.KeyboardUtilities.ArrowKey.LEFT) {
        // If the node is expanded, we close it.
        if (domNodeIsExpanded(currentDOMNode)) {
          setNodeExpandedState(currentTreeNode, false);
          return currentDOMNode;
        }

        // Otherwise, let's go to the parent if there is one.
        const parentNode = getParentListItemForDOMNode(currentDOMNode);
        if (parentNode && parentNode instanceof HTMLLIElement) {
          return parentNode;
        }
      }

      // If we got here, there's no other option than to stay put.
      return currentDOMNode;
    };
