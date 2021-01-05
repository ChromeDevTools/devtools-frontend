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
const util_1 = require("./util");
/**
 * Match the text inside an element, textnode, or comment
 *
 * Note: nodeWalkAll with hasTextValue may return an textnode and its parent if
 * the textnode is the only child in that parent.
 */
function hasTextValue(value) {
    return function (node) {
        return util_1.getTextContent(node) === value;
    };
}
function OR( /* ...rules */) {
    const rules = new Array(arguments.length);
    for (let i = 0; i < arguments.length; i++) {
        rules[i] = arguments[i];
    }
    return function (node) {
        for (let i = 0; i < rules.length; i++) {
            if (rules[i](node)) {
                return true;
            }
        }
        return false;
    };
}
function AND( /* ...rules */) {
    const rules = new Array(arguments.length);
    for (let i = 0; i < arguments.length; i++) {
        rules[i] = arguments[i];
    }
    return function (node) {
        for (let i = 0; i < rules.length; i++) {
            if (!rules[i](node)) {
                return false;
            }
        }
        return true;
    };
}
/**
 * negate an individual predicate, or a group with AND or OR
 */
function NOT(predicateFn) {
    return function (node) {
        return !predicateFn(node);
    };
}
/**
 * Returns a predicate that matches any node with a parent matching
 * `predicateFn`.
 */
function parentMatches(predicateFn) {
    return function (node) {
        let parent = node.parentNode;
        while (parent !== undefined) {
            if (predicateFn(parent)) {
                return true;
            }
            parent = parent.parentNode;
        }
        return false;
    };
}
function hasAttr(attr) {
    return function (node) {
        return util_1.getAttributeIndex(node, attr) > -1;
    };
}
function hasAttrValue(attr, value) {
    return function (node) {
        return util_1.getAttribute(node, attr) === value;
    };
}
function hasClass(name) {
    return hasSpaceSeparatedAttrValue('class', name);
}
function hasTagName(name) {
    const n = name.toLowerCase();
    return function (node) {
        if (!node.tagName) {
            return false;
        }
        return node.tagName.toLowerCase() === n;
    };
}
/**
 * Returns true if `regex.match(tagName)` finds a match.
 *
 * This will use the lowercased tagName for comparison.
 */
function hasMatchingTagName(regex) {
    return function (node) {
        if (!node.tagName) {
            return false;
        }
        return regex.test(node.tagName.toLowerCase());
    };
}
function hasSpaceSeparatedAttrValue(name, value) {
    return function (element) {
        const attributeValue = util_1.getAttribute(element, name);
        if (typeof attributeValue !== 'string') {
            return false;
        }
        return attributeValue.split(' ').indexOf(value) !== -1;
    };
}
exports.hasSpaceSeparatedAttrValue = hasSpaceSeparatedAttrValue;
function isDocument(node) {
    return node.nodeName === '#document';
}
exports.isDocument = isDocument;
function isDocumentFragment(node) {
    return node.nodeName === '#document-fragment';
}
exports.isDocumentFragment = isDocumentFragment;
function isElement(node) {
    return node.nodeName === node.tagName;
}
exports.isElement = isElement;
function isTextNode(node) {
    return node.nodeName === '#text';
}
exports.isTextNode = isTextNode;
function isCommentNode(node) {
    return node.nodeName === '#comment';
}
exports.isCommentNode = isCommentNode;
exports.predicates = {
    hasClass: hasClass,
    hasAttr: hasAttr,
    hasAttrValue: hasAttrValue,
    hasMatchingTagName: hasMatchingTagName,
    hasSpaceSeparatedAttrValue: hasSpaceSeparatedAttrValue,
    hasTagName: hasTagName,
    hasTextValue: hasTextValue,
    AND: AND,
    OR: OR,
    NOT: NOT,
    parentMatches: parentMatches,
};
//# sourceMappingURL=predicates.js.map