// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview Rule to identify Lit render calls that are not inside of a
 * view function.
 */
import type {TSESTree} from '@typescript-eslint/utils';
import type {ArrowFunctionExpression, FunctionDeclaration, FunctionExpression} from 'estree';

import {isLitHtmlRenderCall, isViewFunction} from './utils/lit.ts';
import {createRule} from './utils/ruleCreator.ts';

export default createRule({
  name: 'no-lit-render-outside-of-view',
  meta: {
    type: 'problem',
    docs: {
      description: 'Lit render calls should be inside of a view function',
      category: 'Possible Errors',
    },
    messages: {
      litRenderShouldBeInsideOfView: 'Lit render calls should be inside of a view function',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
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
        let functionNode: TSESTree.Node|undefined = node.parent;
        while (functionNode &&
               !['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(functionNode.type)) {
          functionNode = functionNode.parent;
        }
        if (!functionNode || !isViewFunction(functionNode)) {
          context.report({
            node,
            messageId: 'litRenderShouldBeInsideOfView',
          });
          return;
        }
        type FunctionLike = FunctionDeclaration|FunctionExpression|ArrowFunctionExpression;
        const paramNames =
            (functionNode as FunctionLike).params.filter(p => p.type === 'Identifier').map(param => param.name);
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
});
