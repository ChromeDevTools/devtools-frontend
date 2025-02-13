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
      description:
        'disallow `messageId`s that are missing from `meta.messages`',
      category: 'Rules',
      recommended: true,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-missing-message-ids.md',
    },
    fixable: null,
    schema: [],
    messages: {
      missingMessage:
        '`meta.messages` is missing the messageId "{{messageId}}".',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9
    const { scopeManager } = sourceCode;
    const ruleInfo = utils.getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }

    const messagesNode = utils.getMessagesNode(ruleInfo, scopeManager);

    let contextIdentifiers;

    if (!messagesNode || messagesNode.type !== 'ObjectExpression') {
      // If we can't find `meta.messages`, disable the rule.
      return {};
    }

    return {
      Program(ast) {
        contextIdentifiers = utils.getContextIdentifiers(scopeManager, ast);
      },

      CallExpression(node) {
        const scope = sourceCode.getScope?.(node) || context.getScope(); // TODO: just use sourceCode.getScope() when we drop support for ESLint < 9.0.0
        // Check for messageId properties used in known calls to context.report();
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
          for (const { messageId } of reportMessagesAndDataArray.filter(
            (obj) => obj.messageId,
          )) {
            const values =
              messageId.type === 'Literal'
                ? [messageId]
                : utils.findPossibleVariableValues(messageId, scopeManager);

            // Look for any possible string values we found for this messageId.
            values.forEach((val) => {
              if (
                val.type === 'Literal' &&
                typeof val.value === 'string' &&
                val.value !== '' &&
                !utils.getMessageIdNodeById(
                  val.value,
                  ruleInfo,
                  scopeManager,
                  scope,
                )
              )
                // Couldn't find this messageId in `meta.messages`.
                context.report({
                  node: val,
                  messageId: 'missingMessage',
                  data: {
                    messageId: val.value,
                  },
                });
            });
          }
        }
      },
    };
  },
};
