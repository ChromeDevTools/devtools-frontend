// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ESLintUtils, type TSESTree} from '@typescript-eslint/utils';
import {type Type, type TypeChecker, TypeFlags} from 'typescript';

import {createRule} from './utils/ruleCreator.ts';

const FALSY_ASSERTIONS = new Set(['isFalse', 'isNotOk', 'isNotTrue', 'notOk']);
const TRUTHY_ASSERTIONS = new Set(['isNotFalse', 'isOk', 'isTrue', 'ok']);

function isTruthyAssertion(node: TSESTree.Expression) {
  if (node.type === 'Identifier' && node.name === 'assert') {
    return true;
  }
  return node.type === 'MemberExpression' && node.object.type === 'Identifier' && node.object.name === 'assert' &&
      node.property.type === 'Identifier' && TRUTHY_ASSERTIONS.has(node.property.name);
}

function isFalsyAssertion(node: TSESTree.Expression) {
  return node.type === 'MemberExpression' && node.object.type === 'Identifier' && node.object.name === 'assert' &&
      node.property.type === 'Identifier' && FALSY_ASSERTIONS.has(node.property.name);
}

export default createRule({
  name: 'prefer-assert-strict-equal',
  meta: {
    type: 'suggestion',

    docs: {
      description:
          'Prefer explicit `assert.strictEqual(x, y)` or `assert.strictNotEqual(x, y)` over generic `assert(x === y)` or `assert.isFalse(x === y)',
      category: 'Best Practices',
    },
    messages: {
      useAssertStrictEqual: 'Use `assert.strictEqual` to assert that two values are strictly equal',
      useAssertNotStrictEqual: 'Use `assert.notStrictEqual` to assert that two values aren\'t strictly equal',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    const {sourceCode} = context;

    const parserServices = ESLintUtils.getParserServices(context);
    const checker: TypeChecker = parserServices.program.getTypeChecker();

    function reportError(
        node: TSESTree.CallExpression, calleeText: string,
        messageId: 'useAssertStrictEqual'|'useAssertNotStrictEqual') {
      const calleeNode = node.callee;
      const [argumentNode] = node.arguments;
      if (argumentNode.type !== 'BinaryExpression') {
        return;
      }

      // Allow type narrowing for objects called via `x.y === z`
      // Also for false assertion we want to skip this
      if (argumentNode.left.type === 'MemberExpression' && calleeText === 'assert.strictEqual') {
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(argumentNode.left.property);
        const type: Type = checker.getTypeAtLocation(tsNode);
        if ((type.flags & TypeFlags.Object) === 0) {
          return;
        }
      }

      context.report({
        node,
        messageId,
        fix(fixer) {
          const argumentText = `${sourceCode.getText(argumentNode.left)}, ${sourceCode.getText(argumentNode.right)}`;
          return [
            fixer.replaceText(calleeNode, calleeText),
            fixer.replaceText(argumentNode, argumentText),
          ];
        }
      });
    }

    return {
      CallExpression(node) {
        if (node.arguments.length === 0) {
          return;
        }
        const [argumentNode] = node.arguments;
        if (argumentNode.type !== 'BinaryExpression') {
          return;
        }
        if (argumentNode.operator === '===') {
          if (isTruthyAssertion(node.callee)) {
            reportError(node, 'assert.strictEqual', 'useAssertStrictEqual');
          } else if (isFalsyAssertion(node.callee)) {
            reportError(node, 'assert.notStrictEqual', 'useAssertNotStrictEqual');
          }
        } else if (argumentNode.operator === '!==') {
          if (isFalsyAssertion(node.callee)) {
            reportError(node, 'assert.strictEqual', 'useAssertStrictEqual');
          } else if (isTruthyAssertion(node.callee)) {
            reportError(node, 'assert.notStrictEqual', 'useAssertNotStrictEqual');
          }
        }
      }
    };
  },
});
