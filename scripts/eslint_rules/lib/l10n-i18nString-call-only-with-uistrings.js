// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

function isI18nStringOrLazyCall(callExpression) {
  return callExpression.callee.type === 'Identifier' &&
      ['i18nString', 'i18nLazyString'].includes(callExpression.callee.name);
}

function isArgumentValid(argument) {
  if (!argument) {
    return false;
  }
  if (argument.type !== 'MemberExpression') {
    return false;
  }
  return argument.object.type === 'Identifier' && argument.object.name === 'UIStrings';
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Calling i18nString/i18nLazyString without using a UIStrings object is illegal.',
      category: 'Possible Errors',
    },
    schema: []  // no options
  },
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
            message: 'Calling i18nString/i18nLazyString without using a UIStrings object is illegal.',
          });
        }
      }
    };
  }
};
