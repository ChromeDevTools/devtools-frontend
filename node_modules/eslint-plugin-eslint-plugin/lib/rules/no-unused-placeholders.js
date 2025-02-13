/**
 * @fileoverview Disallow unused placeholders in rule report messages
 * @author 薛定谔的猫<hh_2013@foxmail.com>
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
      description: 'disallow unused placeholders in rule report messages',
      category: 'Rules',
      recommended: true,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-unused-placeholders.md',
    },
    fixable: null,
    schema: [],
    messages: {
      placeholderUnused:
        'The placeholder {{{{unusedKey}}}} is unused (does not exist in the actual message).',
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

          for (const { message, data } of reportMessagesAndDataArray.filter(
            (obj) => obj.message,
          )) {
            const messageStaticValue = getStaticValue(message, scope);
            if (
              ((message.type === 'Literal' &&
                typeof message.value === 'string') ||
                (messageStaticValue &&
                  typeof messageStaticValue.value === 'string')) &&
              data &&
              data.type === 'ObjectExpression'
            ) {
              const messageValue = message.value || messageStaticValue.value;
              // https://github.com/eslint/eslint/blob/2874d75ed8decf363006db25aac2d5f8991bd969/lib/linter.js#L986
              const PLACEHOLDER_MATCHER = /{{\s*([^{}]+?)\s*}}/g;
              const placeholdersInMessage = new Set();

              messageValue.replaceAll(
                PLACEHOLDER_MATCHER,
                (fullMatch, term) => {
                  placeholdersInMessage.add(term);
                },
              );

              data.properties.forEach((prop) => {
                const key = utils.getKeyName(prop);
                if (!placeholdersInMessage.has(key)) {
                  context.report({
                    node: prop,
                    messageId: 'placeholderUnused',
                    data: { unusedKey: key },
                  });
                }
              });
            }
          }
        }
      },
    };
  },
};
