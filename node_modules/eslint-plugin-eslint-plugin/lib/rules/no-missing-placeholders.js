/**
 * @fileoverview Disallow missing placeholders in rule report messages
 * @author Teddy Katz
 */

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
      description: 'disallow missing placeholders in rule report messages',
      category: 'Rules',
      recommended: true,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-missing-placeholders.md',
    },
    fixable: null,
    schema: [],
    messages: {
      placeholderDoesNotExist:
        "The placeholder {{{{missingKey}}}} is missing (must provide it in the report's `data` object).",
    },
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9
    const { scopeManager } = sourceCode;

    let contextIdentifiers;

    const ruleInfo = utils.getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }

    const messagesNode = utils.getMessagesNode(ruleInfo, scopeManager);

    return {
      Program(ast) {
        contextIdentifiers = utils.getContextIdentifiers(scopeManager, ast);
      },
      CallExpression(node) {
        const scope = sourceCode.getScope?.(node) || context.getScope(); // TODO: just use sourceCode.getScope() when we drop support for ESLint < 9.0.0
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

          const reportMessagesAndDataArray =
            utils.collectReportViolationAndSuggestionData(reportInfo);

          if (messagesNode) {
            // Check for any potential instances where we can use the messageId to fill in the message for convenience.
            reportMessagesAndDataArray.forEach((obj) => {
              if (
                !obj.message &&
                obj.messageId &&
                obj.messageId.type === 'Literal' &&
                typeof obj.messageId.value === 'string'
              ) {
                const correspondingMessage = utils.getMessageIdNodeById(
                  obj.messageId.value,
                  ruleInfo,
                  scopeManager,
                  scope,
                );
                if (correspondingMessage) {
                  obj.message = correspondingMessage.value;
                }
              }
            });
          }

          for (const {
            message,
            messageId,
            data,
          } of reportMessagesAndDataArray.filter((obj) => obj.message)) {
            const messageStaticValue = getStaticValue(message, scope);
            if (
              ((message.type === 'Literal' &&
                typeof message.value === 'string') ||
                (messageStaticValue &&
                  typeof messageStaticValue.value === 'string')) &&
              (!data || data.type === 'ObjectExpression')
            ) {
              // Same regex as the one ESLint uses
              // https://github.com/eslint/eslint/blob/e5446449d93668ccbdb79d78cc69f165ce4fde07/lib/eslint.js#L990
              const PLACEHOLDER_MATCHER = /{{\s*([^{}]+?)\s*}}/g;
              let match;

              while (
                (match = PLACEHOLDER_MATCHER.exec(
                  message.value || messageStaticValue.value,
                ))
              ) {
                const matchingProperty =
                  data &&
                  data.properties.find(
                    (prop) => utils.getKeyName(prop) === match[1],
                  );

                if (!matchingProperty) {
                  context.report({
                    node: data || messageId || message,
                    messageId: 'placeholderDoesNotExist',
                    data: { missingKey: match[1] },
                  });
                }
              }
            }
          }
        }
      },
    };
  },
};
