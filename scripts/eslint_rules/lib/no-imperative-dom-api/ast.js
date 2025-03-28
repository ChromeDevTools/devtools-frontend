// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview A library for traversing the AST.
 */
'use strict';

/** @typedef {import('estree').Node} Node */
/** @typedef {import('eslint').Rule.Node} EsLintNode */

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
  return node.type === 'MemberExpression' && objectPredicate(node.object) && propertyPredicate(node.property);
}

/** @param {Node} estreeNode */
function getEnclosingExpression(estreeNode) {
  let node = /** @type {EsLintNode} */ (estreeNode);
  while (node.parent) {
    if (node.parent.type === 'BlockStatement') {
      return node;
    }
    node = node.parent;
  }
  return null;
}

/** @param {Node} estreeNode */
function getEnclosingProperty(estreeNode) {
  const node = /** @type {EsLintNode} */ (estreeNode);
  if (isMemberExpression(node, n => n.type === 'ThisExpression', n => n.type === 'Identifier')) {
    return node;
  }
  if (node.parent.type === 'AssignmentExpression' && node.parent.right === node &&
      isMemberExpression(node.parent.left, n => n.type === 'ThisExpression', n => n.type === 'Identifier')) {
    return node.parent.left;
  }
  return null;
}

/** @param {Node} node */
function getEnclosingClassDeclaration(node) {
  let parent = /** @type {EsLintNode} */ (node).parent;
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
