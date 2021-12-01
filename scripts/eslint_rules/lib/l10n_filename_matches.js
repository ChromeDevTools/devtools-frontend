// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const path = require('path');

function isModuleScope(context) {
  return context.getScope().type === 'module';
}

// True iff the callExpression is `i18n.i18n.registerUIStrings`.
function isRegisterUIStringsCall(callExpression) {
  if (callExpression.callee?.property?.name !== 'registerUIStrings') {
    return false;
  }

  if (callExpression.callee?.object?.property?.name !== 'i18n') {
    return false;
  }

  if (callExpression.callee?.object?.object?.name !== 'i18n') {
    return false;
  }
  return true;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'i18n.i18n.registerUIStrings must receive the current file\'s path as the first argument',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: [{
      'type': 'object',
      'properties': {
        'rootFrontendDirectory': {
          'type': 'string',
        },
      },
      additionalProperties: false,
    }]
  },
  create: function(context) {
    return {
      CallExpression(callExpression) {
        if (!isModuleScope(context) || !isRegisterUIStringsCall(callExpression)) {
          return;
        }

        // Do nothing if there are no arguments or the first argument is not a string literal we
        // can check.
        if (callExpression.arguments.length === 0 || callExpression.arguments[0].type !== 'Literal') {
          return;
        }

        let frontEndDirectory = '';
        if (context.options && context.options[0]?.rootFrontendDirectory) {
          frontEndDirectory = context.options[0].rootFrontendDirectory;
        }
        if (!frontEndDirectory) {
          throw new Error('rootFrontendDirectory must be provided.');
        }
        const currentSourceFile = path.resolve(context.getFilename());
        const currentFileRelativeToFrontEnd = path.relative(frontEndDirectory, currentSourceFile);

        const currentModuleDirectory = path.dirname(currentSourceFile);
        const allowedPathArguments = [
          currentSourceFile,
          path.join(currentModuleDirectory, 'ModuleUIStrings.js'),
          path.join(currentModuleDirectory, 'ModuleUIStrings.ts'),
        ];

        const previousFileLocationArgument = callExpression.arguments[0];
        const actualPath = path.join(frontEndDirectory, previousFileLocationArgument.value);
        if (!allowedPathArguments.includes(actualPath)) {
          const newFileName = currentFileRelativeToFrontEnd.replace(/\\/g, '/');
          context.report({
            node: callExpression,
            message:
                `First argument to 'registerUIStrings' call must be '${newFileName}' or the ModuleUIStrings.(js|ts)`,
            fix(fixer) {
              return fixer.replaceText(previousFileLocationArgument, `'${newFileName}'`);
            }
          });
        }
      }
    };
  }
};
