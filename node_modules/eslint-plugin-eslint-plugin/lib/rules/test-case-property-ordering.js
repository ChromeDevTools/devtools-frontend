/**
 * @fileoverview Requires the properties of a test case to be placed in a consistent order.
 * @author 薛定谔的猫<hh_2013@foxmail.com>
 */

'use strict';

const utils = require('../utils');

const defaultOrder = [
  'filename',
  'code',
  'output',
  'options',
  'parser',
  'languageOptions', // flat-mode only
  'parserOptions', // eslintrc-mode only
  'globals', // eslintrc-mode only
  'env', // eslintrc-mode only
  'errors',
];

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'require the properties of a test case to be placed in a consistent order',
      category: 'Tests',
      recommended: false,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/test-case-property-ordering.md',
    },
    fixable: 'code',
    schema: [
      {
        type: 'array',
        description: 'What order to enforce for test case properties.',
        elements: { type: 'string' },
      },
    ],
    defaultOptions: [defaultOrder],
    messages: {
      inconsistentOrder:
        'The properties of a test case should be placed in a consistent order: [{{order}}].',
    },
  },

  create(context) {
    // ----------------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------------
    const order = context.options[0] || defaultOrder;
    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9

    return {
      Program(ast) {
        utils.getTestInfo(context, ast).forEach((testRun) => {
          [testRun.valid, testRun.invalid].forEach((tests) => {
            tests.forEach((test) => {
              const properties = (test && test.properties) || [];
              const keyNames = properties.map(utils.getKeyName);

              for (let i = 0, lastChecked; i < keyNames.length; i++) {
                const current = order.indexOf(keyNames[i]);

                // current < lastChecked to catch unordered;
                // and lastChecked === -1 to catch extra properties before.
                if (
                  current !== -1 &&
                  (current < lastChecked || lastChecked === -1)
                ) {
                  let orderMsg = order.filter((item) =>
                    keyNames.includes(item),
                  );
                  orderMsg = [
                    ...orderMsg,
                    ...(lastChecked === -1
                      ? keyNames.filter((item) => !order.includes(item))
                      : []),
                  ];

                  context.report({
                    node: properties[i],
                    messageId: 'inconsistentOrder',
                    data: { order: orderMsg.join(', ') },
                    fix(fixer) {
                      return orderMsg.map((key, index) => {
                        const propertyToInsert =
                          properties[keyNames.indexOf(key)];
                        return fixer.replaceText(
                          properties[index],
                          sourceCode.getText(propertyToInsert),
                        );
                      });
                    },
                  });
                }
                lastChecked = current;
              }
            });
          });
        });
      },
    };
  },
};
