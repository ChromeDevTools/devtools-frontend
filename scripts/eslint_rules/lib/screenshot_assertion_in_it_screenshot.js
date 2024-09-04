// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'ensure screenshots are asserted in an itScreenshot block',
      category: 'Possible Errors',
    },
    messages: {
      itScreenshotRequired: 'A screenshot assertion must be within an itScreenshot() test, not an it() test.',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    const SCREENSHOT_ASSERTION_FUNCTIONS =
        new Set(['assertElementScreenshotUnchanged', 'assertPageScreenshotUnchanged']);

    function nodeIsFunctionCallToCheck(node) {
      if (node.expression.type === 'CallExpression') {
        return true;
      }

      if (node.expression.type === 'AwaitExpression') {
        return node.expression.argument.type === 'CallExpression';
      }

      return false;
    }
    function getNameOfFunctionToCheck(node) {
      if (node.type !== 'ExpressionStatement') {
        return null;
      }
      if (!nodeIsFunctionCallToCheck(node)) {
        return null;
      }

      let nameOfCalledFunction = '';
      if (node.expression.type === 'CallExpression') {
        nameOfCalledFunction = node.expression.callee.name;
      } else if (node.expression.type === 'AwaitExpression') {
        nameOfCalledFunction = node.expression.argument.callee.name;
      }
      return nameOfCalledFunction || null;
    }

    function findItParentForNode(node) {
      if (!node || !node.parent) {
        return null;
      }

      const parent = node.parent;

      if (parent.type === 'Program') {
        return null;
      }

      if (parent.type === 'ExpressionStatement' && parent.expression.type === 'CallExpression' &&
          parent.expression.callee?.name === 'it') {
        return parent;
      }

      return findItParentForNode(node.parent);
    }

    function checkForScreenshotCalls(bodyNodes) {
      for (const node of bodyNodes) {
        const functionCallName = getNameOfFunctionToCheck(node);
        if (!functionCallName) {
          continue;
        }
        if (SCREENSHOT_ASSERTION_FUNCTIONS.has(functionCallName)) {
          context.report({
            node,
            messageId: 'itScreenshotRequired',
            fix(fixer) {
              const itExpression = findItParentForNode(node);
              const callee = itExpression?.expression?.callee;
              if (!callee) {
                return [];
              }

              return [fixer.replaceText(callee, 'itScreenshot')];
            }
          });
        }
      }
    }

    return {
      'CallExpression[callee.type="Identifier"][callee.name="it"]'(node) {
        const testCallback = node.arguments[1];
        const validCallbackTypes = ['ArrowFunctionExpression', 'FunctionExpression'];
        if (!testCallback || !validCallbackTypes.includes(testCallback.type)) {
          // Oddly structured it: bail.
          return;
        }
        checkForScreenshotCalls(testCallback.body.body);
      }
    };
  }
};
