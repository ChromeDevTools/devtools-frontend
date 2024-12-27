// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

/**
 * @fileoverview Don't use assert equality on `boolean`, `null` or `undefined`.
 *
 * Prefer the more specific `assert.isTrue`, `assert.notIsTrue`, `assert.isFalse`,
 * `assert.isNotFalse`, `assert.isNull`, `assert.isNotNull`, `assert.isDefined`,
 * and `assert.isUndefined` methods.
 */

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const EQUALITY_ASSERTIONS = new Set(['deepEqual', 'strictEqual']);
const INEQUALITY_ASSERTIONS = new Set(['notDeepEqual', 'notStrictEqual']);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',

    docs: {
      description: 'Don\'t use equality assertions on `boolean`, `null` or `undefined`.',
      category: 'Best Practices',
    },
    messages: {
      useAssertIsDefined: 'Use `assert.isDefined` instead of `assert.{{ methodName }}` to check that a value is not `undefined`',
      useAssertIsFalse: 'Use `assert.isFalse` instead of `assert.{{ methodName }}` to check that a value is `false`',
      useAssertIsNotFalse: 'Use `assert.isNotFalse` instead of `assert.{{ methodName }}` to check that a value is not `undefined`',
      useAssertIsNotNull: 'Use `assert.isNotNull` instead of `assert.{{ methodName }}` to check that a value is not `null`',
      useAssertIsNotTrue: 'Use `assert.isNotTrue` instead of `assert.{{ methodName }}` to check that a value is not `true`',
      useAssertIsNull: 'Use `assert.isNull` instead of `assert.{{ methodName }}` to check that a value is `null`',
      useAssertIsTrue: 'Use `assert.isTrue` instead of `assert.{{ methodName }}` to check that a value is `true`',
      useAssertIsUndefined: 'Use `assert.isUndefined` instead of `assert.{{ methodName }}` to check that a value is `undefined`',
    },
    fixable: 'code',
    schema: [], // no options
  },
  create: function (context) {
    function isAssertEquality(calleeNode) {
      return calleeNode.type === 'MemberExpression' && calleeNode.object.type === 'Identifier' &&
          calleeNode.object.name === 'assert' && calleeNode.property.type === 'Identifier' &&
          EQUALITY_ASSERTIONS.has(calleeNode.property.name);
    }

    function isAssertInequality(calleeNode) {
      return calleeNode.type === 'MemberExpression' && calleeNode.object.type === 'Identifier' &&
          calleeNode.object.name === 'assert' && calleeNode.property.type === 'Identifier' &&
          INEQUALITY_ASSERTIONS.has(calleeNode.property.name);
    }

    function isLiteral(argumentNode, value) {
      return argumentNode.type === 'Literal' && argumentNode.value === value;
    }

    function isUndefinedLiteral(argumentNode) {
      return argumentNode.type === 'Identifier' && argumentNode.name === 'undefined';
    }

    function reportError(node, calleeText, argumentIndex, messageId) {
      const methodName = node.callee.property.name;
      context.report({
        node,
        messageId,
        data: {methodName},
        fix(fixer) {
          const {sourceCode} = context;
          const args = [node.arguments[argumentIndex]].concat(node.arguments.slice(2));
          const argsText = args.map(node => sourceCode.getText(node)).join(', ');
          return fixer.replaceText(node, `${calleeText}(${argsText})`);
        }
      });
    }

    return {
      CallExpression(node) {
        if (node.arguments.length < 2) {
          return;
        }

        if (isAssertEquality(node.callee)) {
          if (isLiteral(node.arguments[1], false)) {
            reportError(node, 'assert.isFalse', 0, 'useAssertIsFalse');
          } else if (isLiteral(node.arguments[0], false)) {
            reportError(node, 'assert.isFalse', 1, 'useAssertIsFalse');
          } else if (isLiteral(node.arguments[1], null)) {
            reportError(node, 'assert.isNull', 0, 'useAssertIsNull');
          } else if (isLiteral(node.arguments[0], null)) {
            reportError(node, 'assert.isNull', 1, 'useAssertIsNull');
          } else if (isLiteral(node.arguments[0], true)) {
            reportError(node, 'assert.isTrue', 1, 'useAssertIsTrue');
          } else if (isLiteral(node.arguments[1], true)) {
            reportError(node, 'assert.isTrue', 0, 'useAssertIsTrue');
          } else if (isUndefinedLiteral(node.arguments[1])) {
            reportError(node, 'assert.isUndefined', 0, 'useAssertIsUndefined');
          } else if (isUndefinedLiteral(node.arguments[0])) {
            reportError(node, 'assert.isUndefined', 1, 'useAssertIsUndefined');
          }
        } else if (isAssertInequality(node.callee)) {
          if (isLiteral(node.arguments[1], false)) {
            reportError(node, 'assert.isNotFalse', 0, 'useAssertIsNotFalse');
          } else if (isLiteral(node.arguments[0], false)) {
            reportError(node, 'assert.isNotFalse', 1, 'useAssertIsNotFalse');
          } else if (isLiteral(node.arguments[1], null)) {
            reportError(node, 'assert.isNotNull', 0, 'useAssertIsNotNull');
          } else if (isLiteral(node.arguments[0], null)) {
            reportError(node, 'assert.isNotNull', 1, 'useAssertIsNotNull');
          } else if (isLiteral(node.arguments[0], true)) {
            reportError(node, 'assert.isNotTrue', 1, 'useAssertIsNotTrue');
          } else if (isLiteral(node.arguments[1], true)) {
            reportError(node, 'assert.isNotTrue', 0, 'useAssertIsNotTrue');
          } else if (isUndefinedLiteral(node.arguments[1])) {
            reportError(node, 'assert.isDefined', 0, 'useAssertIsDefined');
          } else if (isUndefinedLiteral(node.arguments[0])) {
            reportError(node, 'assert.isDefined', 1, 'useAssertIsDefined');
          }
        }
      }
    };
  },
};
