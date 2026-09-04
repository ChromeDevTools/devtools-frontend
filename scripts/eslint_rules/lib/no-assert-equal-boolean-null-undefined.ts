// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Don't use assert equality on `boolean`, `null` or `undefined`.
 *
 * Prefer the more specific `assert.isTrue`, `assert.notIsTrue`, `assert.isFalse`,
 * `assert.isNotFalse`, `assert.isNull`, `assert.isNotNull`, `assert.isDefined`,
 * and `assert.isUndefined` methods.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {type AssertCallExpression, isAssertMethodCall} from './helpers/helpers.ts';
import {createRule} from './utils/ruleCreator.ts';

// Define message IDs based on the meta.messages keys
type MessageIds = 'useAssertIsDefined'|'useAssertIsFalse'|'useAssertIsNotFalse'|'useAssertIsNotNull'|
    'useAssertIsNotTrue'|'useAssertIsNull'|'useAssertIsTrue'|'useAssertIsUndefined';

const EQUALITY_ASSERTIONS = new Set(['deepEqual', 'strictEqual']);
const INEQUALITY_ASSERTIONS = new Set(['notDeepEqual', 'notStrictEqual']);

/** Type guard for Literal nodes with specific values **/
function isLiteral<T extends string|boolean|null|number|RegExp>(
    argumentNode: TSESTree.Node, value: T): argumentNode is TSESTree.Literal&{
  value: T,
}
{
  return argumentNode.type === 'Literal' && argumentNode.value === value;
}

/** Type guard for the `undefined` identifier **/
function isUndefinedIdentifier(argumentNode: TSESTree.Node): argumentNode is TSESTree.Identifier&{
  name: 'undefined',
}
{
  return argumentNode.type === 'Identifier' && argumentNode.name === 'undefined';
}

export default createRule<[], MessageIds>({
  name: 'no-assert-equal-boolean-null-undefined',
  meta: {
    type: 'suggestion',

    docs: {
      description: 'Don\'t use equality assertions on `boolean`, `null` or `undefined`.',
      category: 'Best Practices',
    },
    messages: {
      useAssertIsDefined:
          'Use `assert.isDefined` instead of `assert.{{ methodName }}` to check that a value is not `undefined`',
      useAssertIsFalse: 'Use `assert.isFalse` instead of `assert.{{ methodName }}` to check that a value is `false`',
      useAssertIsNotFalse:
          'Use `assert.isNotFalse` instead of `assert.{{ methodName }}` to check that a value is not `false`',  // Corrected description
      useAssertIsNotNull:
          'Use `assert.isNotNull` instead of `assert.{{ methodName }}` to check that a value is not `null`',
      useAssertIsNotTrue:
          'Use `assert.isNotTrue` instead of `assert.{{ methodName }}` to check that a value is not `true`',
      useAssertIsNull: 'Use `assert.isNull` instead of `assert.{{ methodName }}` to check that a value is `null`',
      useAssertIsTrue: 'Use `assert.isTrue` instead of `assert.{{ methodName }}` to check that a value is `true`',
      useAssertIsUndefined:
          'Use `assert.isUndefined` instead of `assert.{{ methodName }}` to check that a value is `undefined`',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    const sourceCode = context.sourceCode;

    function reportError(node: AssertCallExpression, calleeText: string, argumentIndex: number,
                         messageId: MessageIds): void {
      // Type assertion is safe here because reportError is only called after isAssertEquality/Inequality checks
      const methodName = node.callee.property.name;
      context.report({
        node,
        messageId,
        data: {methodName},
        fix(fixer) {
          // Ensure the argument exists before accessing it
          const argToKeep = node.arguments[argumentIndex];
          if (!argToKeep) {
            // Should not happen based on the logic, but good practice to check
            // Return an empty fix or handle appropriately
            console.warn(`ESLint rule ${context.id}: Expected argument at index ${argumentIndex} not found.`);
            return fixer.replaceText(node, sourceCode.getText(node));  // No change
          }
          // Keep the argument at argumentIndex and any subsequent arguments (e.g., for messages)
          const args = [argToKeep].concat(node.arguments.slice(2));
          const argsText = args.map(argNode => sourceCode.getText(argNode)).join(', ');
          return fixer.replaceText(node, `${calleeText}(${argsText})`);
        },
      });
    }

    return {
      CallExpression(node): void {
        if (!isAssertMethodCall(node, EQUALITY_ASSERTIONS) && !isAssertMethodCall(node, INEQUALITY_ASSERTIONS)) {
          return;
        }

        // Need at least two arguments for equality/inequality checks
        if (node.arguments.length < 2) {
          return;
        }

        // Ensure arguments are valid nodes before proceeding
        const arg0 = node.arguments[0];
        const arg1 = node.arguments[1];
        if (!arg0 || !arg1) {
          return;
        }

        if (isAssertMethodCall(node, EQUALITY_ASSERTIONS)) {
          if (isLiteral(arg1, false)) {
            reportError(node, 'assert.isFalse', 0, 'useAssertIsFalse');
          } else if (isLiteral(arg0, false)) {
            reportError(node, 'assert.isFalse', 1, 'useAssertIsFalse');
          } else if (isLiteral(arg1, null)) {
            reportError(node, 'assert.isNull', 0, 'useAssertIsNull');
          } else if (isLiteral(arg0, null)) {
            reportError(node, 'assert.isNull', 1, 'useAssertIsNull');
          } else if (isLiteral(arg0, true)) {
            reportError(node, 'assert.isTrue', 1, 'useAssertIsTrue');
          } else if (isLiteral(arg1, true)) {
            reportError(node, 'assert.isTrue', 0, 'useAssertIsTrue');
          } else if (isUndefinedIdentifier(arg1)) {
            reportError(node, 'assert.isUndefined', 0, 'useAssertIsUndefined');
          } else if (isUndefinedIdentifier(arg0)) {
            reportError(node, 'assert.isUndefined', 1, 'useAssertIsUndefined');
          }
        } else if (isAssertMethodCall(node, INEQUALITY_ASSERTIONS)) {
          if (isLiteral(arg1, false)) {
            reportError(node, 'assert.isNotFalse', 0, 'useAssertIsNotFalse');
          } else if (isLiteral(arg0, false)) {
            reportError(node, 'assert.isNotFalse', 1, 'useAssertIsNotFalse');
          } else if (isLiteral(arg1, null)) {
            reportError(node, 'assert.isNotNull', 0, 'useAssertIsNotNull');
          } else if (isLiteral(arg0, null)) {
            reportError(node, 'assert.isNotNull', 1, 'useAssertIsNotNull');
          } else if (isLiteral(arg0, true)) {
            reportError(node, 'assert.isNotTrue', 1, 'useAssertIsNotTrue');
          } else if (isLiteral(arg1, true)) {
            reportError(node, 'assert.isNotTrue', 0, 'useAssertIsNotTrue');
          } else if (isUndefinedIdentifier(arg1)) {
            reportError(node, 'assert.isDefined', 0, 'useAssertIsDefined');
          } else if (isUndefinedIdentifier(arg0)) {
            reportError(node, 'assert.isDefined', 1, 'useAssertIsDefined');
          }
        }
      },
    };
  },
});
