// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure trace engine tests are defined as functions for test timeouts.',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      needsFunction: 'Test should use a function keyword, not an arrow function.'
    },
    schema: []  // no options
  },
  create: function(context) {
  const MOCHA_CALLS_TO_CHECK = new Set([
    'it',
    'before',
    'beforeEach',
    'after',
    'afterEach',
  ]);
  function walkUpTreeToFindMochaFunctionCall(node) {
      if(node.type === 'CallExpression' && node.callee.type === 'Identifier' && MOCHA_CALLS_TO_CHECK.has(node.callee.name)) {
        return node;
      }
      if(!node || !node.parent) {
        return null;
      }
      return walkUpTreeToFindMochaFunctionCall(node.parent);
    }

    return {
      MemberExpression(node) {
        const objectIsTraceLoader = node.object.type === 'Identifier' && node.object.name === 'TraceLoader';
        if(!objectIsTraceLoader) {
          return;
        }
        // Find out if this is an await call (which needs the additional test timeout).
        const callExpression = node.parent;
        const isAwait = callExpression.parent && callExpression.parent.type === 'AwaitExpression';
        if(!isAwait) {
          return;
        }
        // We now know that we have await TraceLoader.[something]();
        // Now we need to walk up the tree to find the it() call. If we do,
        // we can then check that its function is defined via a function
        // and not as an arrow function.
        const mochaFunctionCall = walkUpTreeToFindMochaFunctionCall(node);
        if(!mochaFunctionCall) {
          return;
        }
        // This code is within a mocha call. If the call is an `it`, we need
        // the second argument, otherwise we use the first argument (Mocha
        // functions like `beforeEach` take only a function as the argument.)
        const functionArg = mochaFunctionCall.callee.name === 'it' ?
          mochaFunctionCall.arguments[1] :
          mochaFunctionCall.arguments[0];

        if(!functionArg) {
          // The node unexpectedly does not have a function passed. The
          // developer is probably in the middle of writing it, so we should
          // just stop and leave them to it.
          return;
        }

        if(functionArg.type === 'ArrowFunctionExpression') {
          context.report({
            node: functionArg,
            messageId: 'needsFunction',
            fix(fixer) {
              const rangeToReplace = [
                // We want to replace `async () =>` [11 characters] with
                // `function()`. So we replace the first 11 characters of
                // the function.
                functionArg.range[0],
                functionArg.range[0] + 11,
              ];
              return fixer.replaceTextRange(rangeToReplace, 'async function()');
            }
          });
        }
      }
    };
  }
};
