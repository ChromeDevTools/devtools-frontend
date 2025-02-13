/**
 * @fileoverview Enforces the order of meta properties
 */

'use strict';

const { getKeyName, getRuleInfo } = require('../utils');

const defaultOrder = [
  'type',
  'docs',
  'fixable',
  'hasSuggestions',
  'deprecated',
  'replacedBy',
  'schema',
  'defaultOptions', // https://github.com/eslint/rfcs/tree/main/designs/2023-rule-options-defaults
  'messages',
];

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce the order of meta properties',
      category: 'Rules',
      recommended: false,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/meta-property-ordering.md',
    },
    fixable: 'code',
    schema: [
      {
        type: 'array',
        description: 'What order to enforce for meta properties.',
        elements: { type: 'string' },
      },
    ],
    defaultOptions: [defaultOrder],
    messages: {
      inconsistentOrder:
        'The meta properties should be placed in a consistent order: [{{order}}].',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9
    const ruleInfo = getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }

    const order = context.options[0] || defaultOrder;

    const orderMap = new Map(order.map((name, i) => [name, i]));

    return {
      Program() {
        if (!ruleInfo.meta || ruleInfo.meta.properties.length < 2) {
          return;
        }

        const props = ruleInfo.meta.properties;

        let last;

        const violatingProps = props.filter((prop) => {
          const curr = orderMap.has(getKeyName(prop))
            ? orderMap.get(getKeyName(prop))
            : Number.POSITIVE_INFINITY;
          return last > (last = curr);
        });

        if (violatingProps.length === 0) {
          return;
        }

        const knownProps = props
          .filter((prop) => orderMap.has(getKeyName(prop)))
          .sort(
            (a, b) => orderMap.get(getKeyName(a)) - orderMap.get(getKeyName(b)),
          );
        const unknownProps = props.filter(
          (prop) => !orderMap.has(getKeyName(prop)),
        );

        for (const violatingProp of violatingProps) {
          context.report({
            node: violatingProp,
            messageId: 'inconsistentOrder',
            data: {
              order: knownProps.map(getKeyName).join(', '),
            },
            fix(fixer) {
              const expectedProps = [...knownProps, ...unknownProps];
              return props.map((prop, k) => {
                return fixer.replaceText(
                  prop,
                  sourceCode.getText(expectedProps[k]),
                );
              });
            },
          });
        }
      },
    };
  },
};
