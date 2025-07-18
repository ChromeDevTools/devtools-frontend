// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

function isAssert(calleeNode: TSESTree.Expression) {
  if (calleeNode.type === 'Identifier' && calleeNode.name === 'assert') {
    return true;
  }
  if (calleeNode.type === 'MemberExpression' && calleeNode.object.type === 'Identifier' &&
      calleeNode.object.name === 'assert' && calleeNode.property.type === 'Identifier') {
    return ['isNotFalse', 'isOk', 'isTrue', 'ok'].includes(calleeNode.property.name);
  }
  return false;
}

function isAssertFalsy(node: TSESTree.Expression) {
  if (node.type === 'MemberExpression' && node.object.type === 'Identifier' && node.object.name === 'assert' &&
      node.property.type === 'Identifier') {
    return ['isFalse', 'isNotOk', 'isNotTrue', 'notOk'].includes(node.property.name);
  }
  return false;
}

function isAssertEquality(node: TSESTree.Expression) {
  if (node.type === 'MemberExpression' && node.object.type === 'Identifier' && node.object.name === 'assert' &&
      node.property.type === 'Identifier') {
    return ['deepEqual', 'equal', 'strictEqual'].includes(node.property.name);
  }
  return false;
}

type MessageIds = 'useSinonAssertInsteadOfAssert'|'useSinonAssertCalledInsteadOfAssert'|
    'useSinonAssertNotCalledInsteadOfAssert'|'useSinonAssertCallCountInsteadOfAssert';

export default createRule<unknown[], MessageIds>({
  name: 'prefer-sinon-assert',
  meta: {
    type: 'suggestion',
    docs: {
      description:
          'Prefer `sinon.assert` over `assert` with spy/stub call checks, as it provides a much better error message.',
      category: 'Best Practices',
    },
    messages: {
      useSinonAssertInsteadOfAssert:
          'Use `sinon.assert.{{ methodName }}(spy)` instead of `assert(spy.{{ methodName }})`',
      useSinonAssertCalledInsteadOfAssert:
          'Use `sinon.assert.called(spy)` instead of asserting that `spy.notCalled` doesn\'t hold true',
      useSinonAssertNotCalledInsteadOfAssert:
          'Use `sinon.assert.notCalled(spy)` instead of asserting that `spy.called` doesn\'t hold true',
      useSinonAssertCallCountInsteadOfAssert:
          'Use `sinon.assert.{{ methodName }}(spy, num)` instead of asserting equality of `spy.callCount` with `num`',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    function reportError(
        node: TSESTree.CallExpression,
        methodName: string,
        firstArgNodes: TSESTree.Node|TSESTree.Node[],
        messageId: MessageIds,
    ) {
      context.report({
        node,
        messageId,
        data: {
          methodName,
        },
        fix(fixer) {
          const {sourceCode} = context;
          let firstArgText = '';
          if (Array.isArray(firstArgNodes)) {
            firstArgText = firstArgNodes.map(node => sourceCode.getText(node)).join(', ');
          } else {
            firstArgText = sourceCode.getText(firstArgNodes);
          }
          return [
            fixer.replaceText(node.arguments[0], firstArgText),
            fixer.replaceText(node.callee, `sinon.assert.${methodName}`),
          ];
        }
      });
    }

    return {
      CallExpression(node) {
        if (node.arguments.length === 1) {
          const [argumentNode] = node.arguments;
          if (isAssert(node.callee)) {
            if (argumentNode.type === 'CallExpression' && argumentNode.callee.type === 'MemberExpression' &&
                argumentNode.callee.property.type === 'Identifier') {
              const {name} = argumentNode.callee.property;
              if ([
                    'calledOn',
                    'alwaysCalledOn',
                    'calledWith',
                    'calledWithExactly',
                    'calledOnceWithExactly',
                    'alwaysCalledWithExactly',
                    'alwaysCalledWith',
                    'neverCalledWith',
                    'calledWithMatch',
                    'calledOnceWithMatch',
                    'alwaysCalledWithMatch',
                  ].includes(name)) {
                const argumentNodes = [argumentNode.callee.object, ...argumentNode.arguments];
                reportError(node, name, argumentNodes, 'useSinonAssertInsteadOfAssert');
              }
            } else if (argumentNode.type === 'MemberExpression' && argumentNode.property.type === 'Identifier') {
              const {name} = argumentNode.property;
              if (['notCalled', 'called', 'calledOnce', 'calledTwice', 'calledThrice'].includes(name)) {
                reportError(node, name, argumentNode.object, 'useSinonAssertInsteadOfAssert');
              }
            } else if (argumentNode.type === 'UnaryExpression' && argumentNode.operator === '!') {
              const expressionNode = argumentNode.argument;
              if (expressionNode.type === 'MemberExpression' && expressionNode.property.type === 'Identifier') {
                if (expressionNode.property.name === 'notCalled') {
                  reportError(node, 'called', expressionNode.object, 'useSinonAssertCalledInsteadOfAssert');
                } else if (expressionNode.property.name === 'called') {
                  reportError(node, 'notCalled', expressionNode.object, 'useSinonAssertNotCalledInsteadOfAssert');
                }
              }
            }
          } else if (isAssertFalsy(node.callee)) {
            if (argumentNode.type === 'MemberExpression' && argumentNode.property.type === 'Identifier') {
              if (argumentNode.property.name === 'notCalled') {
                reportError(node, 'called', argumentNode.object, 'useSinonAssertCalledInsteadOfAssert');
              } else if (argumentNode.property.name === 'called') {
                reportError(node, 'notCalled', argumentNode.object, 'useSinonAssertNotCalledInsteadOfAssert');
              }
            }
          }
        } else if (node.arguments.length === 2) {
          const [argumentNode] = node.arguments;
          if (isAssertEquality(node.callee)) {
            if (argumentNode.type === 'MemberExpression' && argumentNode.property.type === 'Identifier' &&
                argumentNode.property.name === 'callCount') {
              reportError(node, 'callCount', argumentNode.object, 'useSinonAssertCallCountInsteadOfAssert');
            }
          }
        }
      }
    };
  },
});
