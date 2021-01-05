"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const parse5_1 = require("parse5");
const modification_1 = require("./modification");
const predicates_1 = require("./predicates");
const walking_1 = require("./walking");
/**
 * Return the text value of a node or element
 *
 * Equivalent to `node.textContent` in the browser
 */
function getTextContent(node) {
    if (predicates_1.isCommentNode(node)) {
        return node.data || '';
    }
    if (predicates_1.isTextNode(node)) {
        return node.value || '';
    }
    const subtree = walking_1.nodeWalkAll(node, predicates_1.isTextNode);
    return subtree.map(getTextContent).join('');
}
exports.getTextContent = getTextContent;
/**
 * @returns The string value of attribute `name`, or `null`.
 */
function getAttribute(element, name) {
    const i = getAttributeIndex(element, name);
    if (i > -1) {
        return element.attrs[i].value;
    }
    return null;
}
exports.getAttribute = getAttribute;
function getAttributeIndex(element, name) {
    if (!element.attrs) {
        return -1;
    }
    const n = name.toLowerCase();
    for (let i = 0; i < element.attrs.length; i++) {
        if (element.attrs[i].name.toLowerCase() === n) {
            return i;
        }
    }
    return -1;
}
exports.getAttributeIndex = getAttributeIndex;
/**
 * @returns `true` iff [element] has the attribute [name], `false` otherwise.
 */
function hasAttribute(element, name) {
    return getAttributeIndex(element, name) !== -1;
}
exports.hasAttribute = hasAttribute;
function setAttribute(element, name, value) {
    const i = getAttributeIndex(element, name);
    if (i > -1) {
        element.attrs[i].value = value;
    }
    else {
        element.attrs.push({ name: name, value: value });
    }
}
exports.setAttribute = setAttribute;
function removeAttribute(element, name) {
    const i = getAttributeIndex(element, name);
    if (i > -1) {
        element.attrs.splice(i, 1);
    }
}
exports.removeAttribute = removeAttribute;
function collapseTextRange(parent, start, end) {
    if (!parent.childNodes) {
        return;
    }
    let text = '';
    for (let i = start; i <= end; i++) {
        text += getTextContent(parent.childNodes[i]);
    }
    parent.childNodes.splice(start, (end - start) + 1);
    if (text) {
        const tn = modification_1.constructors.text(text);
        tn.parentNode = parent;
        parent.childNodes.splice(start, 0, tn);
    }
}
/**
 * Normalize the text inside an element
 *
 * Equivalent to `element.normalize()` in the browser
 * See https://developer.mozilla.org/en-US/docs/Web/API/Node/normalize
 */
function normalize(node) {
    if (!(predicates_1.isElement(node) || predicates_1.isDocument(node) || predicates_1.isDocumentFragment(node))) {
        return;
    }
    if (!node.childNodes) {
        return;
    }
    let textRangeStart = -1;
    for (let i = node.childNodes.length - 1, n; i >= 0; i--) {
        n = node.childNodes[i];
        if (predicates_1.isTextNode(n)) {
            if (textRangeStart === -1) {
                textRangeStart = i;
            }
            if (i === 0) {
                // collapse leading text nodes
                collapseTextRange(node, 0, textRangeStart);
            }
        }
        else {
            // recurse
            normalize(n);
            // collapse the range after this node
            if (textRangeStart > -1) {
                collapseTextRange(node, i + 1, textRangeStart);
                textRangeStart = -1;
            }
        }
    }
}
exports.normalize = normalize;
/**
 * Set the text value of a node or element
 *
 * Equivalent to `node.textContent = value` in the browser
 */
function setTextContent(node, value) {
    if (predicates_1.isCommentNode(node)) {
        node.data = value;
    }
    else if (predicates_1.isTextNode(node)) {
        node.value = value;
    }
    else {
        const tn = modification_1.constructors.text(value);
        tn.parentNode = node;
        node.childNodes = [tn];
    }
}
exports.setTextContent = setTextContent;
exports.defaultChildNodes = function defaultChildNodes(node) {
    return node.childNodes;
};
exports.childNodesIncludeTemplate = function childNodesIncludeTemplate(node) {
    if (node.nodeName === 'template') {
        return parse5_1.treeAdapters.default.getTemplateContent(node).childNodes;
    }
    return node.childNodes;
};
//# sourceMappingURL=util.js.map