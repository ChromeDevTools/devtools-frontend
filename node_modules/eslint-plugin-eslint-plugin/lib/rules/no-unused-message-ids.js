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
      description: 'disallow unused `messageId`s in `meta.messages`',
      category: 'Rules',
      recommended: true,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-unused-message-ids.md',
    },
    fixable: null,
    schema: [],
    messages: {
      unusedMessage: 'The messageId "{{messageId}}" is never used.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9
    const { scopeManager } = sourceCode;
    const ruleInfo = utils.getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }

    const messageIdsUsed = new Set();
    let contextIdentifiers;
    let hasSeenUnknownMessageId = false;
    let hasSeenViolationReport = false;

    const messageIdNodes = utils.getMessageIdNodes(ruleInfo, scopeManager);
    if (!messageIdNodes) {
      // If we can't find `meta.messages`, disable the rule.
      return {};
    }

    return {
      Program(ast) {
        contextIdentifiers = utils.getContextIdentifiers(scopeManager, ast);
      },

      'Program:exit'(ast) {
        if (hasSeenUnknownMessageId || !hasSeenViolationReport) {
          /*
          Bail out when the rule is likely to have false positives.
          - If we saw a dynamic/unknown messageId
          - If we couldn't find any violation reporting code, likely because a helper function from an external file is handling this
          */
          return;
        }

        const scope = sourceCode.getScope?.(ast) || context.getScope(); // TODO: just use sourceCode.getScope() when we drop support for ESLint < 9.0.0

        const messageIdNodesUnused = messageIdNodes.filter(
          (node) => !messageIdsUsed.has(utils.getKeyName(node, scope)),
        );

        // Report any messageIds that were never used.
        for (const messageIdNode of messageIdNodesUnused) {
          context.report({
            node: messageIdNode,
            messageId: 'unusedMessage',
            data: {
              messageId: utils.getKeyName(messageIdNode, scope),
            },
          });
        }
      },

      CallExpression(node) {
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

          hasSeenViolationReport = true;

          const reportMessagesAndDataArray =
            utils.collectReportViolationAndSuggestionData(reportInfo);
          for (const { messageId } of reportMessagesAndDataArray.filter(
            (obj) => obj.messageId,
          )) {
            const values =
              messageId.type === 'Literal'
                ? [messageId]
                : utils.findPossibleVariableValues(messageId, scopeManager);
            if (
              values.length === 0 ||
              values.some((val) => val.type !== 'Literal')
            ) {
              // When a dynamic messageId is used and we can't detect its value, disable the rule to avoid false positives.
              hasSeenUnknownMessageId = true;
            }
            values.forEach((val) => messageIdsUsed.add(val.value));
          }
        }
      },

      Property(node) {
        // In order to reduce false positives, we will also check for messageId properties anywhere in the file.
        // This is helpful especially in the event that helper functions are used for reporting violations.
        if (node.key.type === 'Identifier' && node.key.name === 'messageId') {
          hasSeenViolationReport = true;

          const values =
            node.value.type === 'Literal'
              ? [node.value]
              : utils.findPossibleVariableValues(node.value, scopeManager);

          if (
            values.length === 0 ||
            values.some((val) => val.type !== 'Literal') ||
            utils.isVariableFromParameter(node.value, scopeManager)
          ) {
            // When a dynamic messageId is used and we can't detect its value, disable the rule to avoid false positives.
            hasSeenUnknownMessageId = true;
          }

          values.forEach((val) => messageIdsUsed.add(val.value));
        }
      },
    };
  },
};
