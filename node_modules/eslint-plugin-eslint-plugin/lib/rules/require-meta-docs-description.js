'use strict';

const { getStaticValue } = require('@eslint-community/eslint-utils');
const utils = require('../utils');

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const DEFAULT_PATTERN = new RegExp('^(enforce|require|disallow)');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'require rules to implement a `meta.docs.description` property with the correct format',
      category: 'Rules',
      recommended: false,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/require-meta-docs-description.md',
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description:
              "A regular expression that the description must match. Use `'.+'` to allow anything.",
            default: '^(enforce|require|disallow)',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ pattern: '^(enforce|require|disallow)' }],
    messages: {
      extraWhitespace:
        '`meta.docs.description` must not have leading nor trailing whitespace.',
      mismatch: '`meta.docs.description` must match the regexp {{pattern}}.',
      missing: '`meta.docs.description` is required.',
      wrongType: '`meta.docs.description` must be a non-empty string.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9
    const ruleInfo = utils.getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }

    return {
      Program(ast) {
        const scope = sourceCode.getScope?.(ast) || context.getScope(); // TODO: just use sourceCode.getScope() when we drop support for ESLint < v9.0.0
        const { scopeManager } = sourceCode;

        const {
          docsNode,
          metaNode,
          metaPropertyNode: descriptionNode,
        } = utils.getMetaDocsProperty('description', ruleInfo, scopeManager);

        if (!descriptionNode) {
          context.report({
            node: docsNode || metaNode || ruleInfo.create,
            messageId: 'missing',
          });
          return;
        }

        const staticValue = getStaticValue(descriptionNode.value, scope);
        if (!staticValue) {
          // Ignore non-static values since we can't determine what they look like.
          return;
        }

        const pattern = context.options[0]?.pattern
          ? new RegExp(context.options[0].pattern)
          : DEFAULT_PATTERN;

        if (typeof staticValue.value !== 'string' || staticValue.value === '') {
          context.report({
            node: descriptionNode.value,
            messageId: 'wrongType',
          });
        } else if (staticValue.value !== staticValue.value.trim()) {
          context.report({
            node: descriptionNode.value,
            messageId: 'extraWhitespace',
          });
        } else if (!pattern.test(staticValue.value)) {
          context.report({
            node: descriptionNode.value,
            messageId: 'mismatch',
            data: { pattern },
          });
        }
      },
    };
  },
};
