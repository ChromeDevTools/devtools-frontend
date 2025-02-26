'use strict';

const utils = require('../utils');
const { getStaticValue } = require('@eslint-community/eslint-utils');

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'require using `messageId` instead of `message` or `desc` to report rule violations',
      category: 'Rules',
      recommended: true,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/prefer-message-ids.md',
    },
    fixable: null,
    schema: [],
    messages: {
      messagesMissing:
        '`meta.messages` must contain at least one violation message.',
      foundMessage:
        'Use `messageId` instead of `message` (for violations) or `desc` (for suggestions).',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9
    const ruleInfo = utils.getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }

    let contextIdentifiers;

    // ----------------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------------

    return {
      Program(ast) {
        const scope = sourceCode.getScope?.(ast) || context.getScope(); // TODO: just use sourceCode.getScope() when we drop support for ESLint < v9.0.0
        contextIdentifiers = utils.getContextIdentifiers(
          sourceCode.scopeManager,
          ast,
        );

        const metaNode = ruleInfo.meta;
        const messagesNode =
          metaNode &&
          metaNode.properties &&
          metaNode.properties.find(
            (p) => p.type === 'Property' && utils.getKeyName(p) === 'messages',
          );

        if (!messagesNode) {
          context.report({
            node: metaNode || ruleInfo.create,
            messageId: 'messagesMissing',
          });
          return;
        }

        const staticValue = getStaticValue(messagesNode.value, scope);
        if (!staticValue) {
          return;
        }

        if (
          typeof staticValue.value === 'object' &&
          staticValue.value.constructor === Object &&
          Object.keys(staticValue.value).length === 0
        ) {
          context.report({
            node: messagesNode.value,
            messageId: 'messagesMissing',
          });
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          contextIdentifiers.has(node.callee.object) &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'report'
        ) {
          const reportInfo = utils.getReportInfo(node, context);
          if (!reportInfo) {
            return;
          }

          const reportMessagesAndDataArray = utils
            .collectReportViolationAndSuggestionData(reportInfo)
            .filter((obj) => obj.message);
          for (const { message } of reportMessagesAndDataArray) {
            context.report({
              node: message.parent,
              messageId: 'foundMessage',
            });
          }
        }
      },
    };
  },
};
