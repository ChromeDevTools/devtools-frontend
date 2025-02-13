'use strict';

const utils = require('../utils');
const {
  isCommaToken,
  isOpeningBraceToken,
  isClosingBraceToken,
} = require('@eslint-community/eslint-utils');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow the test case property `only`',
      category: 'Tests',
      recommended: true,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-only-tests.md',
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      foundOnly:
        'The test case property `only` can be used during development, but should not be checked-in, since it prevents all the tests from running.',
      removeOnly: 'Remove `only`.',
    },
  },

  create(context) {
    return {
      Program(ast) {
        for (const testRun of utils.getTestInfo(context, ast)) {
          for (const test of [...testRun.valid, ...testRun.invalid]) {
            if (test.type === 'ObjectExpression') {
              // Test case object: { code: 'const x = 123;', ... }

              const onlyProperty = test.properties.find(
                (property) =>
                  property.type === 'Property' &&
                  property.key.type === 'Identifier' &&
                  property.key.name === 'only' &&
                  property.value.type === 'Literal' &&
                  property.value.value,
              );

              if (onlyProperty) {
                context.report({
                  node: onlyProperty,
                  messageId: 'foundOnly',
                  suggest: [
                    {
                      messageId: 'removeOnly',
                      *fix(fixer) {
                        const sourceCode =
                          context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9

                        const tokenBefore =
                          sourceCode.getTokenBefore(onlyProperty);
                        const tokenAfter =
                          sourceCode.getTokenAfter(onlyProperty);
                        if (
                          (isCommaToken(tokenBefore) &&
                            isCommaToken(tokenAfter)) || // In middle of properties
                          (isOpeningBraceToken(tokenBefore) &&
                            isCommaToken(tokenAfter)) // At beginning of properties
                        ) {
                          yield fixer.remove(tokenAfter); // Remove extra comma.
                        }
                        if (
                          isCommaToken(tokenBefore) &&
                          isClosingBraceToken(tokenAfter)
                        ) {
                          // At end of properties
                          yield fixer.remove(tokenBefore); // Remove extra comma.
                        }

                        yield fixer.remove(onlyProperty);
                      },
                    },
                  ],
                });
              }
            } else if (
              test.type === 'CallExpression' &&
              test.callee.type === 'MemberExpression' &&
              test.callee.object.type === 'Identifier' &&
              test.callee.object.name === 'RuleTester' &&
              test.callee.property.type === 'Identifier' &&
              test.callee.property.name === 'only'
            ) {
              // RuleTester.only('const x = 123;');
              context.report({ node: test.callee, messageId: 'foundOnly' });
            }
          }
        }
      },
    };
  },
};
