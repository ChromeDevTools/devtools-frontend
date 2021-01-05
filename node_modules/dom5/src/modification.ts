/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import * as cloneObject from 'clone';
import {ASTNode as Node} from 'parse5';

import {isDocumentFragment, predicates as p} from './predicates';
import {queryAll} from './walking';

export {ASTNode as Node} from 'parse5';

function newTextNode(value: string): Node {
  return {
    nodeName: '#text',
    value: value,
    parentNode: undefined,
    attrs: [],
    __location: <any>undefined,
  };
}

function newCommentNode(comment: string): Node {
  return {
    nodeName: '#comment',
    data: comment,
    parentNode: undefined,
    attrs: [],
    __location: <any>undefined
  };
}

function newElement(tagName: string, namespace?: string): Node {
  return {
    nodeName: tagName,
    tagName: tagName,
    childNodes: [],
    namespaceURI: namespace || 'http://www.w3.org/1999/xhtml',
    attrs: [],
    parentNode: undefined,
    __location: <any>undefined
  };
}

function newDocumentFragment(): Node {
  return {
    nodeName: '#document-fragment',
    childNodes: [],
    parentNode: undefined,
    quirksMode: false,
    // TODO(rictic): update parse5 typings upstream to mention that attrs and
    //     __location are optional and not always present.
    attrs: undefined as any,
    __location: null as any
  };
}

export function cloneNode(node: Node): Node {
  // parent is a backreference, and we don't want to clone the whole tree, so
  // make it null before cloning.
  const parent = node.parentNode;
  node.parentNode = undefined;
  const clone = cloneObject(node);
  node.parentNode = parent;
  return clone;
}

/**
 * Inserts `newNode` into `parent` at `index`, optionally replaceing the
 * current node at `index`. If `newNode` is a DocumentFragment, its childNodes
 * are inserted and removed from the fragment.
 */
function insertNode(
    parent: Node, index: number, newNode: Node, replace?: boolean) {
  if (!parent.childNodes) {
    parent.childNodes = [];
  }
  let newNodes: Node[] = [];
  let removedNode = replace ? parent.childNodes[index] : null;

  if (newNode) {
    if (isDocumentFragment(newNode)) {
      if (newNode.childNodes) {
        newNodes = Array.from(newNode.childNodes);
        newNode.childNodes.length = 0;
      }
    } else {
      newNodes = [newNode];
      remove(newNode);
    }
  }

  if (replace) {
    removedNode = parent.childNodes[index];
  }

  Array.prototype.splice.apply(
      parent.childNodes, (<any>[index, replace ? 1 : 0]).concat(newNodes));

  newNodes.forEach(function(n) {
    n.parentNode = parent;
  });

  if (removedNode) {
    removedNode.parentNode = undefined;
  }
}

export function replace(oldNode: Node, newNode: Node) {
  const parent = oldNode.parentNode;
  const index = parent!.childNodes!.indexOf(oldNode);
  insertNode(parent!, index, newNode, true);
}

export function remove(node: Node) {
  const parent = node.parentNode;
  if (parent && parent.childNodes) {
    const idx = parent.childNodes.indexOf(node);
    parent.childNodes.splice(idx, 1);
  }
  node.parentNode = undefined;
}

export function insertBefore(parent: Node, target: Node, newNode: Node) {
  const index = parent.childNodes!.indexOf(target);
  insertNode(parent, index, newNode);
}

export function insertAfter(parent: Node, target: Node, newNode: Node) {
  const index = parent.childNodes!.indexOf(target);
  insertNode(parent, index + 1, newNode);
}

/**
 * Removes a node and places its children in its place.  If the node
 * has no parent, the operation is impossible and no action takes place.
 */
export function removeNodeSaveChildren(node: Node) {
  // We can't save the children if there's no parent node to provide
  // for them.
  const fosterParent = node.parentNode;
  if (!fosterParent) {
    return;
  }
  const children = (node.childNodes || []).slice();
  for (const child of children) {
    insertBefore(node.parentNode!, node, child);
  }
  remove(node);
}

/**
 * When parse5 parses an HTML document with `parse`, it injects missing root
 * elements (html, head and body) if they are missing.  This function removes
 * these from the AST if they have no location info, so it requires that
 * the `parse5.parse` be used with the `locationInfo` option of `true`.
 */
export function removeFakeRootElements(ast: Node) {
  const injectedNodes = queryAll(
      ast,
      p.AND(
          (node) => !node.__location,
          p.hasMatchingTagName(/^(html|head|body)$/i)),
      undefined,
      // Don't descend past 3 levels 'document > html > head|body'
      (node) => node.parentNode && node.parentNode.parentNode ?
          undefined :
          node.childNodes);
  injectedNodes.reverse().forEach(removeNodeSaveChildren);
}

export function append(parent: Node, newNode: Node) {
  const index = parent.childNodes && parent.childNodes.length || 0;
  insertNode(parent, index, newNode);
}

export const constructors = {
  text: newTextNode,
  comment: newCommentNode,
  element: newElement,
  fragment: newDocumentFragment,
};
