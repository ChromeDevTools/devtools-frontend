// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

/**
 * @param node a TaggedTemplateExpression node from the AST of the parsed code.
 * @returns - `true` if the code matches Lit.html`` or html``, and false otherwise.
 */
export function isLitHtmlTemplateCall(node: TSESTree.Node): node is TSESTree.TaggedTemplateExpression {
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
 * @param node a CallExpression node from the AST of the parsed code.
 * @returns - `true` if the code matches Lit.render() or render(), and false otherwise.
 */
export function isLitHtmlRenderCall(node: TSESTree.Node): node is TSESTree.CallExpression {
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

/**
 * Determines if a given AST function node matches the "view function" signature.
 * A view function is expected to have three parameters, with names conventionally
 * ending in 'input', 'output', and 'target'.
 * @param node The function-like AST node to inspect.
 * @returns True if the node is a view function, false otherwise.
 */
export function isViewFunction(node: TSESTree.Node): boolean {
  if (!['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type)) {
    return false;
  }
  const functionNode =
      node as TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression;
  const paramNames =
      functionNode.params.filter((p): p is TSESTree.Identifier => p.type === 'Identifier').map(param => param.name);

  return paramNames.length === 3 && paramNames[0].toLowerCase().endsWith('input') &&
      paramNames[1].toLowerCase().endsWith('output') && paramNames[2].toLowerCase().endsWith('target');
}
