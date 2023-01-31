// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'prevent submitting with variables set to true or false',
      category: 'Possible Errors',
    },
    messages: {
      'moreThanOneScreenshotAssertionFound': 'A test must only have a single screenshot assertion inside.',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    function nodeIsFunctionCallToCheck(node) {
      if (node.expression.type === 'CallExpression') {
        return true;
      }

      if (node.expression.type === 'AwaitExpression') {
        return node.expression.argument.type === 'CallExpression';
      }

      return false;
    }
    function countScreenshotAssertions(functionBodyNodes) {
      const assertionCalls = functionBodyNodes.filter(node => {
        if (node.type !== 'ExpressionStatement') {
          return false;
        }
        if (!nodeIsFunctionCallToCheck(node)) {
          return false;
        }

        let nameOfCalledFunction = '';
        if (node.expression.type === 'CallExpression') {
          nameOfCalledFunction = node.expression.callee.name;
        } else if (node.expression.type === 'AwaitExpression') {
          nameOfCalledFunction = node.expression.argument.callee.name;
        }

        if (nameOfCalledFunction === '') {
          throw new Error('Could not find name of called function.');
        }

        return ['assertElementScreenshotUnchanged', 'assertPageScreenshotUnchanged'].includes(nameOfCalledFunction);
      });
      return assertionCalls.length;
    }

    function checkFunctionNode(node) {
      const bodyNodes = node.body?.body;
      if (!bodyNodes || bodyNodes.length === 0) {
        return;
      }
      const totalScreenshotAssertions = countScreenshotAssertions(bodyNodes);
      if (totalScreenshotAssertions > 1) {
        context.report({
          node: node,
          messageId: 'moreThanOneScreenshotAssertionFound',
        });
      }
    }

    return {
      ArrowFunctionExpression(node) {
        checkFunctionNode(node);
      },
      FunctionExpression(node) {
        checkFunctionNode(node);
      },
      FunctionDeclaration(node) {
        checkFunctionNode(node);
      }
    };
  }
};
