/**
 * @fileoverview require rules to implement a `meta.type` property
 * @author 薛定谔的猫<weiran.zsd@outlook.com>
 */

'use strict';

const { getStaticValue } = require('@eslint-community/eslint-utils');
const utils = require('../utils');
const VALID_TYPES = new Set(['problem', 'suggestion', 'layout']);

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require rules to implement a `meta.type` property',
      category: 'Rules',
      recommended: true,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/require-meta-type.md',
    },
    fixable: null,
    schema: [],
    messages: {
      missing:
        '`meta.type` is required (must be either `problem`, `suggestion`, or `layout`).',
      unexpected:
        '`meta.type` must be either `problem`, `suggestion`, or `layout`.',
    },
  },

  create(context) {
    // ----------------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------------

    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9
    const ruleInfo = utils.getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }

    return {
      Program(node) {
        const scope = sourceCode.getScope?.(node) || context.getScope(); // TODO: just use sourceCode.getScope() when we drop support for ESLint < v9.0.0
        const { scopeManager } = sourceCode;

        const metaNode = ruleInfo.meta;
        const typeNode = utils
          .evaluateObjectProperties(metaNode, scopeManager)
          .find((p) => p.type === 'Property' && utils.getKeyName(p) === 'type');

        if (!typeNode) {
          context.report({
            node: metaNode || ruleInfo.create,
            messageId: 'missing',
          });
          return;
        }

        const staticValue = getStaticValue(typeNode.value, scope);
        if (!staticValue) {
          // Ignore non-static values since we can't determine what they look like.
          return;
        }

        if (!VALID_TYPES.has(staticValue.value)) {
          context.report({ node: typeNode.value, messageId: 'unexpected' });
        }
      },
    };
  },
};
