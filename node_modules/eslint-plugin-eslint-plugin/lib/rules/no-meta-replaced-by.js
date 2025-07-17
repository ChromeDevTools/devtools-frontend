/**
 * @fileoverview Disallows the usage of `meta.replacedBy` property
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
      description: 'disallow using the `meta.replacedBy` rule property',
      category: 'Rules',
      recommended: false,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-meta-replaced-by.md',
    },
    schema: [],
    messages: {
      useNewFormat:
        'Use `meta.deprecated.replacedBy` instead of `meta.replacedBy`',
    },
  },
  create(context) {
    const sourceCode = utils.getSourceCode(context);
    const ruleInfo = utils.getRuleInfo(sourceCode);

    if (!ruleInfo) {
      return {};
    }

    return {
      Program() {
        const metaNode = ruleInfo.meta;

        if (!metaNode) {
          return;
        }

        const replacedByNode = utils
          .evaluateObjectProperties(metaNode, sourceCode.scopeManager)
          .find(
            (p) =>
              p.type === 'Property' && utils.getKeyName(p) === 'replacedBy',
          );

        if (!replacedByNode) {
          return;
        }

        context.report({
          node: replacedByNode,
          messageId: 'useNewFormat',
        });
      },
    };
  },
};
