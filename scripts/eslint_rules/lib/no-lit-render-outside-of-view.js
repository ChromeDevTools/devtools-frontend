// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview Rule to identify Lit render calls that are not inside of a
 * view function.
 */
'use strict';

const {isLitHtmlRenderCall} = require('./utils.js');

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Lit render calls should be inside of a view function',
      category: 'Possible Errors',
    },
    messages: {
      litRenderShouldBeInsideOfView:
        'Lit render calls should be inside of a view function',
    },
    schema: [], // no options
  },
  create : function(context) {
    return {
      CallExpression(node) {
        if (!isLitHtmlRenderCall(node)) {
          return;
        }
        if (node.arguments.length !== 3) {
          context.report({
            node,
            messageId: 'litRenderShouldBeInsideOfView',
          });
          return;
        }
        let functionNode = node.parent;
        while (functionNode && !['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(functionNode.type)) {
          functionNode = functionNode.parent;
        }
        if (!functionNode) {
          context.report({
            node,
            messageId: 'litRenderShouldBeInsideOfView',
          });
          return;
        }
        /** @typedef {import('estree').FunctionDeclaration|import('estree').FunctionExpression|import('estree').ArrowFunctionExpression} FunctionLike */
        const paramNames = /** @type {FunctionLike} */(functionNode).params.filter(p => p.type === 'Identifier').map(param => param.name);
        if (paramNames.length !== 3 || !paramNames[0].toLowerCase().endsWith('input') ||
            !paramNames[1].toLowerCase().endsWith('output') ||
            !paramNames[2].toLowerCase().endsWith('target')) {
          context.report({
            node,
            messageId: 'litRenderShouldBeInsideOfView',
          });
          return;
        }
        const targetArgument = node.arguments[1];
        if (targetArgument.type !== 'Identifier' || targetArgument.name !== paramNames[2]) {
          context.report({
            node,
            messageId: 'litRenderShouldBeInsideOfView',
          });
          return;
        }
        const optionsArgument = node.arguments[2];
        if (optionsArgument.type !== 'ObjectExpression') {
          // Invalid, but TypeScript will catch it.
          return;
        }

        for (const property of optionsArgument.properties) {
          if (property.type === 'Property' && property.key.type === 'Identifier' && property.key.name === 'host') {
            if (property.value.type !== 'Identifier' || property.value.name !== paramNames[0]) {
              context.report({
                node,
                messageId: 'litRenderShouldBeInsideOfView',
              });
            }
            return;
          }
        }
      },
    };
  }
};
