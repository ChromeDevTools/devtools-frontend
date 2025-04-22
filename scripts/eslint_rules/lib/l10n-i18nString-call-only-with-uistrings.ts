// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

type CallExpression = TSESTree.CallExpression;
type Argument = TSESTree.Expression|TSESTree.SpreadElement;

function isI18nStringOrLazyCall(callExpression: CallExpression): boolean {
  return (
      callExpression.callee.type === 'Identifier' &&
      ['i18nString', 'i18nLazyString'].includes(callExpression.callee.name));
}

function isArgumentValid(argument: Argument|undefined): boolean {
  if (!argument) {
    return false;
  }

  if (argument.type !== 'MemberExpression') {
    return false;
  }
  return argument.object.type === 'Identifier' && argument.object.name === 'UIStrings';
}

export default createRule({
  name: 'l10n-i18nstring-call-only-with-uistrings',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensures i18nString/i18nLazyString are called only with UIStrings members.',
      category: 'Possible Errors',
    },
    messages: {
      invalidArgument:
          'Calling i18nString/i18nLazyString requires a UIStrings member as the first argument (e.g., UIStrings.someString).',
    },
    schema: [],          // no options
    fixable: undefined,  // Rule is not automatically fixable
  },
  defaultOptions: [],
  create: function(context) {
    return {
      CallExpression(callExpression) {
        if (!isI18nStringOrLazyCall(callExpression)) {
          return;
        }

        const argument = callExpression.arguments[0];
        if (!isArgumentValid(argument)) {
          context.report({
            node: callExpression,
            messageId: 'invalidArgument',
          });
        }
      },
    };
  },
});
