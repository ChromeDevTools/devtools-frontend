'use strict';

const { getStaticValue } = require('@eslint-community/eslint-utils');
const utils = require('../utils');

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'require rules `meta.schema` properties to include descriptions',
      category: 'Rules',
      recommended: false,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/require-meta-schema-description.md',
    },
    schema: [],
    messages: {
      missingDescription: 'Schema option is missing an ajv description.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9
    const { scopeManager } = sourceCode;
    const ruleInfo = utils.getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }

    const schemaNode = utils.getMetaSchemaNode(ruleInfo.meta, scopeManager);
    if (!schemaNode) {
      return {};
    }

    const schemaProperty = utils.getMetaSchemaNodeProperty(
      schemaNode,
      scopeManager,
    );
    if (schemaProperty?.type !== 'ArrayExpression') {
      return {};
    }

    for (const element of schemaProperty.elements) {
      checkSchemaElement(element, true);
    }

    return {};

    function checkSchemaElement(node, isRoot) {
      if (node.type !== 'ObjectExpression') {
        return;
      }

      let hadChildren = false;
      let hadDescription = false;

      for (const { key, value } of node.properties) {
        if (!key) {
          continue;
        }
        const staticKey =
          key.type === 'Identifier' ? { value: key.name } : getStaticValue(key);
        if (!staticKey?.value) {
          continue;
        }

        switch (key.name ?? key.value) {
          case 'description': {
            hadDescription = true;
            break;
          }

          case 'oneOf': {
            hadChildren = true;

            if (value.type === 'ArrayExpression') {
              for (const element of value.elements) {
                checkSchemaElement(element, isRoot);
              }
            }

            break;
          }

          case 'properties': {
            hadChildren = true;

            if (Array.isArray(value.properties)) {
              for (const property of value.properties) {
                if (property.value?.type === 'ObjectExpression') {
                  checkSchemaElement(property.value);
                }
              }
            }

            break;
          }
        }
      }

      if (!hadDescription && !(hadChildren && isRoot)) {
        context.report({
          messageId: 'missingDescription',
          node,
        });
      }
    }
  },
};
