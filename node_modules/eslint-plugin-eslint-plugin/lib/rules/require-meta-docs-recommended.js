'use strict';

const { getStaticValue } = require('@eslint-community/eslint-utils');
const utils = require('../utils');

/**
 * @param {import('eslint').Rule.RuleFixer} fixer
 * @param {import('estree').ObjectExpression} objectNode
 * @param {boolean} recommendedValue
 */
function insertRecommendedProperty(fixer, objectNode, recommendedValue) {
  if (objectNode.properties.length === 0) {
    return fixer.replaceText(
      objectNode,
      `{ recommended: ${recommendedValue} }`,
    );
  }
  return fixer.insertTextAfter(
    objectNode.properties.at(-1),
    `, recommended: ${recommendedValue}`,
  );
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'require rules to implement a `meta.docs.recommended` property',
      category: 'Rules',
      recommended: false,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/require-meta-docs-recommended.md',
    },
    fixable: null,
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          allowNonBoolean: {
            default: false,
            description: 'Whether to allow values of types other than boolean.',
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allowNonBoolean: false }],
    messages: {
      incorrect: '`meta.docs.recommended` is required to be a boolean.',
      missing: '`meta.docs.recommended` is required.',
      setRecommendedTrue: 'Set `meta.docs.recommended` to `true`.',
      setRecommendedFalse: 'Set `meta.docs.recommended` to `false`.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9
    const ruleInfo = utils.getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }

    const { scopeManager } = sourceCode;
    const {
      docsNode,
      metaNode,
      metaPropertyNode: descriptionNode,
    } = utils.getMetaDocsProperty('recommended', ruleInfo, scopeManager);

    if (!descriptionNode) {
      const suggestions =
        docsNode?.value?.type === 'ObjectExpression'
          ? [
              {
                messageId: 'setRecommendedTrue',
                fix: (fixer) =>
                  insertRecommendedProperty(fixer, docsNode.value, true),
              },
              {
                messageId: 'setRecommendedFalse',
                fix: (fixer) =>
                  insertRecommendedProperty(fixer, docsNode.value, false),
              },
            ]
          : [];

      context.report({
        node: docsNode || metaNode || ruleInfo.create,
        messageId: 'missing',
        suggest: suggestions,
      });
      return {};
    }

    if (context.options[0]?.allowNonBoolean) {
      return {};
    }

    const staticValue = utils.isUndefinedIdentifier(descriptionNode.value)
      ? { value: undefined }
      : getStaticValue(descriptionNode.value);

    if (staticValue && typeof staticValue.value !== 'boolean') {
      context.report({
        node: descriptionNode.value,
        messageId: 'incorrect',
        suggest: [
          {
            messageId: 'setRecommendedTrue',
            fix: (fixer) => fixer.replaceText(descriptionNode.value, 'true'),
          },
          {
            messageId: 'setRecommendedFalse',
            fix: (fixer) => fixer.replaceText(descriptionNode.value, 'false'),
          },
        ],
      });
      return {};
    }

    return {};
  },
};
