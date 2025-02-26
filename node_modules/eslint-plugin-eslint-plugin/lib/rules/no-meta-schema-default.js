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
        'disallow rules `meta.schema` properties to include defaults',
      category: 'Rules',
      recommended: false,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-meta-schema-default.md',
    },
    schema: [],
    messages: {
      foundDefault: 'Disallowed default value in schema.',
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

    if (schemaProperty?.type === 'ObjectExpression') {
      checkSchemaElement(schemaProperty, true);
    } else if (schemaProperty?.type === 'ArrayExpression') {
      for (const element of schemaProperty.elements) {
        checkSchemaElement(element, true);
      }
    }

    return {};

    function checkSchemaElement(node) {
      if (node.type !== 'ObjectExpression') {
        return;
      }

      for (const { type, key, value } of node.properties) {
        if (type !== 'Property') {
          continue;
        }
        const staticKey =
          key.type === 'Identifier' ? { value: key.name } : getStaticValue(key);
        if (!staticKey?.value) {
          continue;
        }

        switch (key.name ?? key.value) {
          case 'allOf':
          case 'anyOf':
          case 'oneOf': {
            if (value.type === 'ArrayExpression') {
              for (const element of value.elements) {
                checkSchemaElement(element);
              }
            }

            break;
          }

          case 'properties': {
            if (Array.isArray(value.properties)) {
              for (const property of value.properties) {
                if (property.value?.type === 'ObjectExpression') {
                  checkSchemaElement(property.value);
                }
              }
            }

            break;
          }

          case 'elements': {
            checkSchemaElement(value);

            break;
          }

          case 'default': {
            context.report({
              messageId: 'foundDefault',
              node: key,
            });

            break;
          }
        }
      }
    }
  },
};
