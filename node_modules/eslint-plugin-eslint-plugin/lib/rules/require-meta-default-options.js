'use strict';

const utils = require('../utils');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'require only rules with options to implement a `meta.defaultOptions` property',
      category: 'Rules',
      recommended: false,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/require-meta-default-options.md',
    },
    fixable: 'code',
    schema: [],
    messages: {
      missingDefaultOptions:
        'Rule with non-empty schema is missing a `meta.defaultOptions` property.',
      unnecessaryDefaultOptions:
        'Rule with empty schema should not have a `meta.defaultOptions` property.',
      defaultOptionsMustBeArray: 'Default options must be an array.',
      defaultOptionsMustNotBeEmpty: 'Default options must not be empty.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9
    const { scopeManager } = sourceCode;
    const ruleInfo = utils.getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }

    const metaNode = ruleInfo.meta;

    const schemaNode = utils.getMetaSchemaNode(metaNode, scopeManager);
    const schemaProperty = utils.getMetaSchemaNodeProperty(
      schemaNode,
      scopeManager,
    );
    if (!schemaProperty) {
      return {};
    }

    const metaDefaultOptions = utils
      .evaluateObjectProperties(metaNode, scopeManager)
      .find(
        (p) =>
          p.type === 'Property' && utils.getKeyName(p) === 'defaultOptions',
      );

    if (
      schemaProperty.type === 'ArrayExpression' &&
      schemaProperty.elements.length === 0
    ) {
      if (metaDefaultOptions) {
        context.report({
          node: metaDefaultOptions,
          messageId: 'unnecessaryDefaultOptions',
          fix(fixer) {
            return fixer.remove(metaDefaultOptions);
          },
        });
      }
      return {};
    }

    if (!metaDefaultOptions) {
      context.report({
        node: metaNode,
        messageId: 'missingDefaultOptions',
        fix(fixer) {
          return fixer.insertTextAfter(schemaProperty, ', defaultOptions: []');
        },
      });
      return {};
    }

    if (metaDefaultOptions.value.type !== 'ArrayExpression') {
      context.report({
        node: metaDefaultOptions.value,
        messageId: 'defaultOptionsMustBeArray',
      });
      return {};
    }

    const isArrayRootSchema =
      schemaProperty.type === 'ObjectExpression' &&
      schemaProperty.properties.find((property) => property.key.name === 'type')
        ?.value.value === 'array';

    if (metaDefaultOptions.value.elements.length === 0 && !isArrayRootSchema) {
      context.report({
        node: metaDefaultOptions.value,
        messageId: 'defaultOptionsMustNotBeEmpty',
      });
      return {};
    }

    return {};
  },
};
