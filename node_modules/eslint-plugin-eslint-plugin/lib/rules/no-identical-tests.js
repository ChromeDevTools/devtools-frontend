/**
 * @fileoverview disallow identical tests
 * @author 薛定谔的猫<hh_2013@foxmail.com>
 */

'use strict';

const utils = require('../utils');

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow identical tests',
      category: 'Tests',
      recommended: true,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-identical-tests.md',
    },
    fixable: 'code',
    schema: [],
    messages: {
      identical: 'This test case is identical to another case.',
    },
  },

  create(context) {
    // ----------------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------------
    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9

    // ----------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------
    /**
     * Create a unique cache key
     * @param {object} test
     * @returns {string}
     */
    function toKey(test) {
      if (test.type !== 'ObjectExpression') {
        return JSON.stringify([test.type, sourceCode.getText(test)]);
      }
      return JSON.stringify([
        test.type,
        ...test.properties.map((p) => sourceCode.getText(p)).sort(),
      ]);
    }

    return {
      Program(ast) {
        utils.getTestInfo(context, ast).forEach((testRun) => {
          [testRun.valid, testRun.invalid].forEach((tests) => {
            const cache = new Set();
            tests.forEach((test) => {
              const key = toKey(test);
              if (cache.has(key)) {
                context.report({
                  node: test,
                  messageId: 'identical',
                  fix(fixer) {
                    const start = sourceCode.getTokenBefore(test);
                    const end = sourceCode.getTokenAfter(test);
                    return fixer.removeRange(
                      // should remove test's trailing comma
                      [
                        start.range[1],
                        end.value === ',' ? end.range[1] : test.range[1],
                      ],
                    );
                  },
                });
              } else {
                cache.add(key);
              }
            });
          });
        });
      },
    };
  },
};
