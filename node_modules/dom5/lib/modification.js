"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const cloneObject = require("clone");
const predicates_1 = require("./predicates");
const walking_1 = require("./walking");
function newTextNode(value) {
    return {
        nodeName: '#text',
        value: value,
        parentNode: undefined,
        attrs: [],
        __location: undefined,
    };
}
function newCommentNode(comment) {
    return {
        nodeName: '#comment',
        data: comment,
        parentNode: undefined,
        attrs: [],
        __location: undefined
    };
}
function newElement(tagName, namespace) {
    return {
        nodeName: tagName,
        tagName: tagName,
        childNodes: [],
        namespaceURI: namespace || 'http://www.w3.org/1999/xhtml',
        attrs: [],
        parentNode: undefined,
        __location: undefined
    };
}
function newDocumentFragment() {
    return {
        nodeName: '#document-fragment',
        childNodes: [],
        parentNode: undefined,
        quirksMode: false,
        // TODO(rictic): update parse5 typings upstream to mention that attrs and
        //     __location are optional and not always present.
        attrs: undefined,
        __location: null
    };
}
function cloneNode(node) {
    // parent is a backreference, and we don't want to clone the whole tree, so
    // make it null before cloning.
    const parent = node.parentNode;
    node.parentNode = undefined;
    const clone = cloneObject(node);
    node.parentNode = parent;
    return clone;
}
exports.cloneNode = cloneNode;
/**
 * Inserts `newNode` into `parent` at `index`, optionally replaceing the
 * current node at `index`. If `newNode` is a DocumentFragment, its childNodes
 * are inserted and removed from the fragment.
 */
function insertNode(parent, index, newNode, replace) {
    if (!parent.childNodes) {
        parent.childNodes = [];
    }
    let newNodes = [];
    let removedNode = replace ? parent.childNodes[index] : null;
    if (newNode) {
        if (predicates_1.isDocumentFragment(newNode)) {
            if (newNode.childNodes) {
                newNodes = Array.from(newNode.childNodes);
                newNode.childNodes.length = 0;
            }
        }
        else {
            newNodes = [newNode];
            remove(newNode);
        }
    }
    if (replace) {
        removedNode = parent.childNodes[index];
    }
    Array.prototype.splice.apply(parent.childNodes, [index, replace ? 1 : 0].concat(newNodes));
    newNodes.forEach(function (n) {
        n.parentNode = parent;
    });
    if (removedNode) {
        removedNode.parentNode = undefined;
    }
}
function replace(oldNode, newNode) {
    const parent = oldNode.parentNode;
    const index = parent.childNodes.indexOf(oldNode);
    insertNode(parent, index, newNode, true);
}
exports.replace = replace;
function remove(node) {
    const parent = node.parentNode;
    if (parent && parent.childNodes) {
        const idx = parent.childNodes.indexOf(node);
        parent.childNodes.splice(idx, 1);
    }
    node.parentNode = undefined;
}
exports.remove = remove;
function insertBefore(parent, target, newNode) {
    const index = parent.childNodes.indexOf(target);
    insertNode(parent, index, newNode);
}
exports.insertBefore = insertBefore;
function insertAfter(parent, target, newNode) {
    const index = parent.childNodes.indexOf(target);
    insertNode(parent, index + 1, newNode);
}
exports.insertAfter = insertAfter;
/**
 * Removes a node and places its children in its place.  If the node
 * has no parent, the operation is impossible and no action takes place.
 */
function removeNodeSaveChildren(node) {
    // We can't save the children if there's no parent node to provide
    // for them.
    const fosterParent = node.parentNode;
    if (!fosterParent) {
        return;
    }
    const children = (node.childNodes || []).slice();
    for (const child of children) {
        insertBefore(node.parentNode, node, child);
    }
    remove(node);
}
exports.removeNodeSaveChildren = removeNodeSaveChildren;
/**
 * When parse5 parses an HTML document with `parse`, it injects missing root
 * elements (html, head and body) if they are missing.  This function removes
 * these from the AST if they have no location info, so it requires that
 * the `parse5.parse` be used with the `locationInfo` option of `true`.
 */
function removeFakeRootElements(ast) {
    const injectedNodes = walking_1.queryAll(ast, predicates_1.predicates.AND((node) => !node.__location, predicates_1.predicates.hasMatchingTagName(/^(html|head|body)$/i)), undefined, 
    // Don't descend past 3 levels 'document > html > head|body'
    (node) => node.parentNode && node.parentNode.parentNode ?
        undefined :
        node.childNodes);
    injectedNodes.reverse().forEach(removeNodeSaveChildren);
}
exports.removeFakeRootElements = removeFakeRootElements;
function append(parent, newNode) {
    const index = parent.childNodes && parent.childNodes.length || 0;
    insertNode(parent, index, newNode);
}
exports.append = append;
exports.constructors = {
    text: newTextNode,
    comment: newCommentNode,
    element: newElement,
    fragment: newDocumentFragment,
};
//# sourceMappingURL=modification.js.map