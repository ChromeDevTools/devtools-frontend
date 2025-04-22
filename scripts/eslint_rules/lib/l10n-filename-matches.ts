// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';
import * as path from 'path';

import {isModuleScope} from './utils/l10n-helper.ts';
import {createRule} from './utils/ruleCreator.ts';

type CallExpression = TSESTree.CallExpression;
// True iff the callExpression is `i18n.i18n.registerUIStrings`.
function isRegisterUIStringsCall(callExpression: CallExpression): boolean {
  if (callExpression.callee?.type !== 'MemberExpression') {
    return false;
  }
  const callee = callExpression.callee;

  if (callee.property?.type !== 'Identifier' || callee.property?.name !== 'registerUIStrings') {
    return false;
  }

  if (callee.object?.type !== 'MemberExpression') {
    return false;
  }
  const calleeObject = callee.object;

  if (calleeObject.property?.type !== 'Identifier' || calleeObject.property?.name !== 'i18n') {
    return false;
  }

  if (calleeObject.object?.type !== 'Identifier' || calleeObject.object?.name !== 'i18n') {
    return false;
  }
  return true;
}

type Options = [
  {
    rootFrontendDirectory?: string,
  },
];

type MessageIds = 'pathMismatch';

export default createRule<Options, MessageIds>({
  name: 'l10n-filename-matches',
  meta: {
    type: 'problem',
    docs: {
      description: 'i18n.i18n.registerUIStrings must receive the current file\'s path as the first argument',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          rootFrontendDirectory: {
            type: 'string',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      // Using a generic message ID as the message itself is dynamic
      pathMismatch:
          'First argument to \'registerUIStrings\' call must be \'{{expectedPath}}\' or the ModuleUIStrings.(js|ts)',
    },
  },
  defaultOptions: [{}],
  create: function(context) {
    const filename = context.filename;

    let frontEndDirectory = '';
    if (context.options?.[0]?.rootFrontendDirectory) {
      frontEndDirectory = context.options[0].rootFrontendDirectory;
    }
    if (!frontEndDirectory) {
      throw new Error(
          '\'rootFrontendDirectory\' option must be provided for the l10n-filename-matches rule.',
      );
    }
    return {
      CallExpression(node) {
        if (!isModuleScope(context, node) || !isRegisterUIStringsCall(node)) {
          return;
        }

        // Do nothing if there are no arguments or the first argument is not a string literal we
        // can check.
        const firstArgument = node.arguments[0];
        if (node.arguments.length === 0 || !firstArgument || firstArgument.type !== 'Literal' ||
            typeof firstArgument.value !== 'string') {
          return;
        }

        const currentSourceFile = path.resolve(filename);
        const currentFileRelativeToFrontEnd = path.relative(
            frontEndDirectory,
            currentSourceFile,
        );

        const currentModuleDirectory = path.dirname(currentSourceFile);
        const allowedPathArguments = [
          currentSourceFile,
          path.join(currentModuleDirectory, 'ModuleUIStrings.js'),
          path.join(currentModuleDirectory, 'ModuleUIStrings.ts'),
        ];

        const actualPath = path.join(
            frontEndDirectory,
            `${firstArgument.value}`,
        );

        if (!allowedPathArguments.includes(actualPath)) {
          const newFileName = currentFileRelativeToFrontEnd.replace(/\\/g, '/');
          context.report({
            node,
            messageId: 'pathMismatch',
            data: {
              expectedPath: newFileName,
            },
            fix(fixer) {
              return fixer.replaceText(
                  firstArgument,
                  `'${newFileName}'`,
              );
            },
          });
        }
      },
    };
  },
});
