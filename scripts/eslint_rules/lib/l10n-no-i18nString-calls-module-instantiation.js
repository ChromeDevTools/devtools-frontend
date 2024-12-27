// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

// One of these AST nodes must be an ancestor of an i18nString call.
const REQUIRED_ANCESTOR = new Set([
  'ArrowFunctionExpression',
  'PropertyDefinition',
  'FunctionDeclaration',
  'FunctionExpression',
  'MethodDefinition',
]);

function isI18nStringCall(callExpression) {
  return callExpression.callee.type === 'Identifier' && callExpression.callee.name === 'i18nString';
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
          'Calls to i18nString are illegal during module instantiation time. Translated strings are not yet available',
      category: 'Possible Errors',
    },
    schema: []  // no options
  },
  create: function(context) {
    return {
      CallExpression(callExpression) {
        if (!isI18nStringCall(callExpression)) {
          return;
        }

        const ancestors = (context.getAncestors() || []).map(node => node.type);
        const hasRequiredAncestor = ancestors.some(ancestor => REQUIRED_ANCESTOR.has(ancestor));
        if (!hasRequiredAncestor) {
          context.report({
            node: callExpression,
            message: 'Calls to i18nString in are disallowed at module instantiation time. Use i18nLazyString instead.',
          });
        }
      }
    };
  }
};
