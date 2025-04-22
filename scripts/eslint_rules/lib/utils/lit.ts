// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

// This file contains utility functions that are commonly needed in ESLint
// rules. It does not contain any ESLint rules itself.

/**
 * @param node - a TaggedTemplateExpression node from the AST of the parsed code.
 * @returns {boolean} - `true` if the code matches Lit.html`` or html``, and false otherwise.
 */
export function isLitHtmlTemplateCall(node: TSESTree.Expression): boolean {
  if (node.type !== 'TaggedTemplateExpression') {
    return false;
  }

  // Match Lit.html``
  const {tag} = node;
  if (!tag) {
    return false;
  }
  // Match Lit.html``
  if (tag.type === 'MemberExpression' && tag.object.type === 'Identifier' && tag.property.type === 'Identifier') {
    return tag.object.name === 'Lit' && tag.property.name === 'html';
  }

  // Match html`` (and guess that it's Lit)
  if (tag.type === 'Identifier') {
    return tag.type === 'Identifier' && tag.name === 'html';
  }

  return false;
}

/**
 * @param node - a CallExpression node from the AST of the parsed code.
 * @returns {boolean} - `true` if the code matches Lit.render() or render(), and false otherwise.
 */
export function isLitHtmlRenderCall(node: TSESTree.Expression): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }

  const {callee} = node;
  if (callee.type === 'Identifier' && callee.name === 'render') {
    return true;
  }
  if (callee.type !== 'MemberExpression' || callee.object.type !== 'Identifier' ||
      callee.property.type !== 'Identifier') {
    return false;
  }

  return callee.object.name === 'Lit' && callee.property.name === 'render';
}
