// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

type CallExpression = TSESTree.CallExpression;

// One of these AST node types must be an ancestor of an i18nString call.
const REQUIRED_ANCESTOR = new Set([
  'ArrowFunctionExpression',
  'PropertyDefinition',
  'FunctionDeclaration',
  'FunctionExpression',
  'MethodDefinition',
]);

function isI18nStringCall(callExpression: CallExpression): boolean {
  return (callExpression.callee.type === 'Identifier' && callExpression.callee.name === 'i18nString');
}

export default createRule({
  name: 'l10n-no-i18nstring-calls-module-instantiation',
  meta: {
    type: 'problem',
    docs: {
      description:
          'Calls to i18nString are illegal during module instantiation time because translated strings are not yet available.',
      category: 'Possible Errors',
    },
    messages: {
      disallowedCall: 'Calls to i18nString are disallowed at module instantiation time. Use i18nLazyString instead.',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    const sourceCode = context.sourceCode;
    return {
      CallExpression(callExpression) {
        if (!isI18nStringCall(callExpression)) {
          return;
        }

        const ancestorTypes = sourceCode.getAncestors(callExpression).map(node => node.type);
        const hasRequiredAncestor = ancestorTypes.some(
            ancestorType => REQUIRED_ANCESTOR.has(ancestorType),
        );

        if (!hasRequiredAncestor) {
          context.report({
            node: callExpression,
            messageId: 'disallowedCall',
          });
        }
      },
    };
  },
});
