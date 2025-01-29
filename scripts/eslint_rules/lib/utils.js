// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file contains utility functions that are commonly needed in ESLint
// rules. It does not contain any ESLint rules itself.

/**
 * @param taggedTemplateExpressionNode - a TaggedTemplateExpression node from the AST of the parsed code.
 * @returns {boolean} - `true` if the code matches Lit.html`` or html``, and false otherwise.
 */
function isLitHtmlTemplateCall(taggedTemplateExpressionNode) {
  if (taggedTemplateExpressionNode.type !== 'TaggedTemplateExpression') {
    throw new Error('Node of type other than TaggedTemplateExpression passed to isLitHtmlTemplateCall.');
  }
  // Match Lit.html``
  const {tag} = taggedTemplateExpressionNode;
  if (!tag) {
    return false;
  }
  // Match Lit.html``
  const isLitHtmlDotHtmlCall = tag.object?.name === 'Lit' && tag.property?.name === 'html';
  // Match html`` (and guess that it's Lit)
  const isDestructuredHtmlCall = tag.type === 'Identifier' && tag.name === 'html';

  return isLitHtmlDotHtmlCall || isDestructuredHtmlCall;
}

/**
 * @param callExpressionNode - a CallExpression node from the AST of the parsed code.
 * @returns {boolean} - `true` if the code matches Lit.render() or render(), and false otherwise.
 */
function isLitHtmlRenderCall(callExpressionNode) {
  if (callExpressionNode.type !== 'CallExpression') {
    throw new Error('Node of type other than CallExpresson passed to isLitHtmlRenderCall.');
  }

  const {callee} = callExpressionNode;
  const isDestructuredRenderCall = callee.type === 'Identifier' && callee.name === 'render';
  const isLitHtmlDotRenderCall = callee.object?.name === 'Lit' && callee.property?.name === 'render';

  return isDestructuredRenderCall || isLitHtmlDotRenderCall;
}

module.exports = {
  isLitHtmlTemplateCall,
  isLitHtmlRenderCall
};
