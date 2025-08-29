// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file Rule to identify Lit render calls that are not inside of a
 * view function.
 */
import type {TSESTree} from '@typescript-eslint/utils';
import {isCommaToken} from '@typescript-eslint/utils/ast-utils';
import {nullThrows, NullThrowsReasons} from '@typescript-eslint/utils/eslint-utils';
import type {ArrowFunctionExpression, FunctionDeclaration, FunctionExpression, Identifier} from 'estree';

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
      litRenderInsideOfViewMustUseTarget: 'Lit render calls inside of a view function must use the `target` parameter',
      litRenderInsideOfViewMustNotUseHost: 'Lit render calls inside of a view function must not use the `host` option',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    const {sourceCode} = context;
    return {
      CallExpression(node) {
        if (!isLitHtmlRenderCall(node)) {
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
        const targetParameterName = ((functionNode as FunctionLike).params[2] as Identifier).name;
        const targetArgument = node.arguments[1];
        if (targetArgument.type !== 'Identifier' || targetArgument.name !== targetParameterName) {
          context.report({
            node,
            messageId: 'litRenderInsideOfViewMustUseTarget',
            fix(fixer) {
              return fixer.replaceText(targetArgument, targetParameterName);
            }
          });
          return;
        }

        if (node.arguments.length < 3) {
          return;
        }
        const renderOptions = node.arguments[2];
        if (renderOptions.type !== 'ObjectExpression') {
          // Invalid, but TypeScript will catch it.
          return;
        }

        for (const renderOption of renderOptions.properties) {
          if (renderOption.type === 'Property' && renderOption.key.type === 'Identifier' &&
              renderOption.key.name === 'host') {
            context.report({
              node,
              messageId: 'litRenderInsideOfViewMustNotUseHost',
              fix(fixer) {
                if (renderOptions.properties.length === 1) {
                  const commaToken = nullThrows(
                      sourceCode.getTokenBefore(renderOptions, isCommaToken),
                      NullThrowsReasons.MissingToken(',', node.type));
                  return fixer.removeRange([commaToken.range[0], renderOptions.range[1]]);
                }
                const prevToken = sourceCode.getTokenBefore(renderOption);
                if (prevToken && isCommaToken(prevToken)) {
                  return fixer.removeRange([prevToken.range[0], renderOption.range[1]]);
                }
                const nextToken = sourceCode.getTokenAfter(renderOption);
                if (nextToken && isCommaToken(nextToken)) {
                  return fixer.removeRange([renderOption.range[0], nextToken.range[1]]);
                }
                return [];
              }
            });
          }
        }
      },
    };
  }
});
