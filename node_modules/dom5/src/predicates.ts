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

import {ASTNode as Node} from 'parse5';

import {getAttribute, getAttributeIndex, getTextContent} from './util';

export {ASTNode as Node} from 'parse5';


/**
 * Match the text inside an element, textnode, or comment
 *
 * Note: nodeWalkAll with hasTextValue may return an textnode and its parent if
 * the textnode is the only child in that parent.
 */
function hasTextValue(value: string): Predicate {
  return function(node) {
    return getTextContent(node) === value;
  };
}

export type Predicate = (node: Node) => boolean;

/**
 * OR an array of predicates
 */
function OR(...predicates: Predicate[]): Predicate;
function OR(/* ...rules */): Predicate {
  const rules = new Array<Predicate>(arguments.length);
  for (let i = 0; i < arguments.length; i++) {
    rules[i] = arguments[i];
  }
  return function(node) {
    for (let i = 0; i < rules.length; i++) {
      if (rules[i](node)) {
        return true;
      }
    }
    return false;
  };
}

/**
 * AND an array of predicates
 */
function AND(...predicates: Predicate[]): Predicate;
function AND(/* ...rules */): Predicate {
  const rules = new Array<Predicate>(arguments.length);
  for (let i = 0; i < arguments.length; i++) {
    rules[i] = arguments[i];
  }
  return function(node) {
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
function NOT(predicateFn: Predicate): Predicate {
  return function(node) {
    return !predicateFn(node);
  };
}

/**
 * Returns a predicate that matches any node with a parent matching
 * `predicateFn`.
 */
function parentMatches(predicateFn: Predicate): Predicate {
  return function(node) {
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

function hasAttr(attr: string): Predicate {
  return function(node) {
    return getAttributeIndex(node, attr) > -1;
  };
}

function hasAttrValue(attr: string, value: string): Predicate {
  return function(node) {
    return getAttribute(node, attr) === value;
  };
}

function hasClass(name: string): Predicate {
  return hasSpaceSeparatedAttrValue('class', name);
}

function hasTagName(name: string): Predicate {
  const n = name.toLowerCase();
  return function(node) {
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
function hasMatchingTagName(regex: RegExp): Predicate {
  return function(node) {
    if (!node.tagName) {
      return false;
    }
    return regex.test(node.tagName.toLowerCase());
  };
}

export function hasSpaceSeparatedAttrValue(
    name: string, value: string): Predicate {
  return function(element: Node) {
    const attributeValue = getAttribute(element, name);
    if (typeof attributeValue !== 'string') {
      return false;
    }
    return attributeValue.split(' ').indexOf(value) !== -1;
  };
}

export function isDocument(node: Node): boolean {
  return node.nodeName === '#document';
}

export function isDocumentFragment(node: Node): boolean {
  return node.nodeName === '#document-fragment';
}

export function isElement(node: Node): boolean {
  return node.nodeName === node.tagName;
}

export function isTextNode(node: Node): boolean {
  return node.nodeName === '#text';
}

export function isCommentNode(node: Node): boolean {
  return node.nodeName === '#comment';
}

export const predicates = {
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
