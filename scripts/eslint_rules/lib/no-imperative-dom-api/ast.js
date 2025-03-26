// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview A library for traversing the AST.
 */
'use strict';

/** @typedef {import('eslint').Rule.Node} Node */

/**
 * @param {Node} node
 * @param {string|Array<string>} name
 * @return {boolean}
 */
function isIdentifier(node, name) {
  return node.type === 'Identifier' && (Array.isArray(name) ? name.includes(node.name) : node.name === name);
}

/**
 * @param {Node} node
 * @param {function(Node): boolean} objectPredicate
 * @param {function(Node): boolean} propertyPredicate
 */
function isMemberExpression(node, objectPredicate, propertyPredicate) {
  return node.type === 'MemberExpression' && objectPredicate(/** @type {Node} */ (node.object)) &&
      propertyPredicate(/** @type {Node} */ (node.property));
}

/** @param {Node} node */
function getEnclosingExpression(node) {
  while (node.parent) {
    if (node.parent.type === 'BlockStatement') {
      return node;
    }
    node = node.parent;
  }
  return null;
}

function getEnclosingProperty(node) {
  if (node.parent.type === 'AssignmentExpression' && node.parent.right === node &&
      isMemberExpression(node.parent.left, n => n.type === 'ThisExpression', n => n.type === 'Identifier')) {
    return /** @type {Node} */ (node.parent.left);
  }
  return null;
}

/** @param {Node} node */
function getEnclosingClassDeclaration(node) {
  let parent = node.parent;
  while (parent && parent.type !== 'ClassDeclaration') {
    parent = parent.parent;
  }
  return parent;
}

exports.isIdentifier = isIdentifier;
exports.isMemberExpression = isMemberExpression;
exports.getEnclosingExpression = getEnclosingExpression;
exports.getEnclosingProperty = getEnclosingProperty;
exports.getEnclosingClassDeclaration = getEnclosingClassDeclaration;
