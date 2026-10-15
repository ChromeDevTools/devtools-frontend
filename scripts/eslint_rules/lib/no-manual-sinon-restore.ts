// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';
import type {RuleFix, RuleFixer, SourceCode} from '@typescript-eslint/utils/ts-eslint';

import {createRule} from './utils/ruleCreator.ts';

type MessageIds = 'noManualSinonRestore';

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

export default createRule<unknown[], MessageIds>({
  name: 'no-manual-sinon-restore',
  meta: {
    type: 'problem',
    docs: {
      description:
          'Flag sinon.restore() calls since the global Mocha test harness already restores Sinon after each test, ' +
          'and targeted stub.restore() should be used if resetting mid-test.',
      category: 'Best Practices',
    },
    messages: {
      noManualSinonRestore: 'Global Mocha test harness already restores Sinon stubs and timers after each test. ' +
          'Do not call sinon.restore() manually. If a reset is required during a test, ' +
          'use stub.restore() on the specific stub instead.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'MemberExpression' || node.callee.computed || node.arguments.length !== 0) {
          return;
        }

        const isSinonRestore = node.callee.object.type === 'Identifier' && node.callee.object.name === 'sinon' &&
            node.callee.property.type === 'Identifier' && node.callee.property.name === 'restore';

        if (!isSinonRestore) {
          return;
        }

        // Find enclosing afterEach or after call, if any.
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

            const isTestOrSuite = (callee.type === 'Identifier' &&
                                   (callee.name === 'it' || callee.name === 'test' || callee.name === 'describe')) ||
                (callee.type === 'MemberExpression' && !callee.computed && callee.object.type === 'Identifier' &&
                 (callee.object.name === 'it' || callee.object.name === 'test' || callee.object.name === 'describe'));
            if (isTestOrSuite) {
              break;
            }
          }
          current = current.parent;
        }

        context.report({
          node,
          messageId: 'noManualSinonRestore',
          fix(fixer) {
            if (!afterEachCall) {
              return null;
            }

            const fn = afterEachCall.arguments.find(arg => arg.type === 'ArrowFunctionExpression' ||
                                                        arg.type === 'FunctionExpression') as
                    TSESTree.ArrowFunctionExpression |
                TSESTree.FunctionExpression | undefined;

            if (!fn) {
              return null;
            }

            if (fn.body.type === 'CallExpression') {
              if (fn.body === node) {
                // Concise arrow body: afterEach(() => sinon.restore());
                const stmt =
                    afterEachCall.parent?.type === 'ExpressionStatement' ? afterEachCall.parent : afterEachCall;
                return removeStatement(fixer, context.sourceCode, stmt);
              }
              return null;
            }

            if (fn.body.type === 'BlockStatement') {
              const isDirectStatement = node.parent?.type === 'ExpressionStatement' && node.parent.parent === fn.body;
              if (!isDirectStatement) {
                return null;
              }

              if (fn.body.body.length === 1) {
                // sinon.restore() is the only statement in afterEach
                const stmt =
                    afterEachCall.parent?.type === 'ExpressionStatement' ? afterEachCall.parent : afterEachCall;
                return removeStatement(fixer, context.sourceCode, stmt);
              }

              return removeStatement(fixer, context.sourceCode, node.parent);
            }

            return null;
          },
        });
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
