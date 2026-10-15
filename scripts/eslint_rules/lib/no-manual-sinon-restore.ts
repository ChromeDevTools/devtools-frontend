// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';
import type {RuleFix, RuleFixer, SourceCode} from '@typescript-eslint/utils/ts-eslint';

import {createRule} from './utils/ruleCreator.ts';

type MessageIds = 'noManualSinonRestore'|'noManualSinonRestoreInAfterEach';

const SUITE_OR_TEST_NAMES = new Set([
  'it',
  'test',
  'describe',
  'beforeEach',
  'before',
  'describeWithEnvironment',
  'describeWithMockConnection',
  'describeWithLocale',
]);

const NON_SINON_RESTORE_RECEIVERS = new Set([
  'sandbox',
  'ctx',
  'context',
  'canvasContext',
]);

function removeStatement(fixer: RuleFixer, sourceCode: Readonly<SourceCode>, node: TSESTree.Node): RuleFix {
  const text = sourceCode.text;
  let start = node.range[0];
  let end = node.range[1];

  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const linePrefix = text.slice(lineStart, start);
  const lineEndMatch = text.slice(end).match(/^[ \t]*\r?\n/);
  if (/^\s*$/.test(linePrefix) && lineEndMatch) {
    end += lineEndMatch[0].length;
    // If followed by a blank line, consume it as well to avoid leaving double blank lines or leading blank lines.
    const blankLineMatch = text.slice(end).match(/^[ \t]*\r?\n/);
    if (blankLineMatch) {
      end += blankLineMatch[0].length;
    }
    start = lineStart;
  }
  return fixer.removeRange([start, end]);
}

function isRestoreCall(
    node: TSESTree.CallExpression,
    ): node is TSESTree.CallExpression&{
  callee: TSESTree.MemberExpression,
}
{
  if (node.arguments.length !== 0) {
    return false;
  }
  const callee = node.callee;
  if (callee.type === 'MemberExpression' && !callee.computed) {
    return callee.property.type === 'Identifier' && callee.property.name === 'restore';
  }
  return false;
}

export default createRule<unknown[], MessageIds>({
  name: 'no-manual-sinon-restore',
  meta: {
    type: 'problem',
    docs: {
      description: 'Flag sinon.restore() calls and redundant restore() calls in afterEach() or after() ' +
          'since the global Mocha test harness already restores Sinon after each test.',
      category: 'Best Practices',
    },
    messages: {
      noManualSinonRestore: 'Global Mocha test harness already restores Sinon stubs and timers after each test. ' +
          'Do not call sinon.restore() manually. If a reset is required during a test, ' +
          'use stub.restore() on the specific stub instead.',
      noManualSinonRestoreInAfterEach:
          'Global Mocha test harness already restores Sinon stubs and timers after each test. ' +
          'Do not call restore() on Sinon stubs, spies, or timers in afterEach() or after().',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isRestoreCall(node)) {
          return;
        }

        let receiverName: string|null = null;
        if (node.callee.object.type === 'Identifier') {
          receiverName = node.callee.object.name;
        } else if (node.callee.object.type === 'MemberExpression' && !node.callee.object.computed &&
                   node.callee.object.property.type === 'Identifier') {
          receiverName = node.callee.object.property.name;
        }
        if (receiverName && NON_SINON_RESTORE_RECEIVERS.has(receiverName)) {
          return;
        }

        const isSinonRestore = node.callee.object.type === 'Identifier' && node.callee.object.name === 'sinon';

        // Walk up to find enclosing afterEach or after call.
        let afterEachCall: TSESTree.CallExpression|null = null;
        let current: TSESTree.Node|undefined = node.parent;

        while (current) {
          if (current.type === 'CallExpression') {
            const callee = current.callee;
            const isAfterEach =
                (callee.type === 'Identifier' && (callee.name === 'afterEach' || callee.name === 'after')) ||
                (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier' &&
                 (callee.property.name === 'afterEach' || callee.property.name === 'after'));
            if (isAfterEach) {
              afterEachCall = current;
              break;
            }

            const isTestOrSuite = (callee.type === 'Identifier' && SUITE_OR_TEST_NAMES.has(callee.name)) ||
                (callee.type === 'MemberExpression' && !callee.computed && callee.object.type === 'Identifier' &&
                 SUITE_OR_TEST_NAMES.has(callee.object.name));
            if (isTestOrSuite) {
              break;
            }
          }
          current = current.parent;
        }

        if (afterEachCall) {
          context.report({
            node,
            messageId: isSinonRestore ? 'noManualSinonRestore' : 'noManualSinonRestoreInAfterEach',
            fix: isSinonRestore ?
                fixer => {
                  const fn = afterEachCall.arguments.find(arg => arg.type === 'ArrowFunctionExpression' ||
                                                              arg.type === 'FunctionExpression') as
                          TSESTree.ArrowFunctionExpression |
                      TSESTree.FunctionExpression | undefined;

                  if (!fn) {
                    return null;
                  }

                  if (fn.body.type === 'CallExpression') {
                    if (fn.body === node) {
                      const stmt =
                          afterEachCall.parent?.type === 'ExpressionStatement' ? afterEachCall.parent : afterEachCall;
                      return removeStatement(fixer, context.sourceCode, stmt);
                    }
                    return null;
                  }

                  if (fn.body.type === 'BlockStatement') {
                    const isDirectStatement =
                        node.parent?.type === 'ExpressionStatement' && node.parent.parent === fn.body;
                    if (!isDirectStatement) {
                      return null;
                    }

                    if (fn.body.body.length === 1) {
                      const stmt =
                          afterEachCall.parent?.type === 'ExpressionStatement' ? afterEachCall.parent : afterEachCall;
                      return removeStatement(fixer, context.sourceCode, stmt);
                    }

                    return removeStatement(fixer, context.sourceCode, node.parent);
                  }

                  return null;
                } :
                null,
          });
          return;
        }

        if (isSinonRestore) {
          context.report({
            node,
            messageId: 'noManualSinonRestore',
          });
        }
      },
      MemberExpression(node: TSESTree.MemberExpression) {
        const isSinonRestore = !node.computed && node.object.type === 'Identifier' && node.object.name === 'sinon' &&
            node.property.type === 'Identifier' && node.property.name === 'restore';
        if (!isSinonRestore) {
          return;
        }

        // Ignore direct CallExpressions (`sinon.restore()`), which are handled by CallExpression visitor.
        if (node.parent?.type === 'CallExpression' && node.parent.callee === node) {
          return;
        }

        if (node.parent?.type === 'CallExpression' && node.parent.arguments.includes(node)) {
          const parentCall = node.parent;
          const callee = parentCall.callee;
          const isAfterEach =
              (callee.type === 'Identifier' && (callee.name === 'afterEach' || callee.name === 'after')) ||
              (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier' &&
               (callee.property.name === 'afterEach' || callee.property.name === 'after'));
          context.report({
            node,
            messageId: 'noManualSinonRestore',
            fix: isAfterEach ?
                fixer => {
                  const stmt = parentCall.parent?.type === 'ExpressionStatement' ? parentCall.parent : parentCall;
                  return removeStatement(fixer, context.sourceCode, stmt);
                } :
                null,
          });
        }
      },
    };
  },
});
