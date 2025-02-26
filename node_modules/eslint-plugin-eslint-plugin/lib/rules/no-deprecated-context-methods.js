/**
 * @fileoverview Disallows usage of deprecated methods on rule context objects
 * @author Teddy Katz
 */

'use strict';

const utils = require('../utils');

const DEPRECATED_PASSTHROUGHS = {
  getSource: 'getText',
  getSourceLines: 'getLines',
  getAllComments: 'getAllComments',
  getNodeByRangeIndex: 'getNodeByRangeIndex',
  getComments: 'getComments',
  getCommentsBefore: 'getCommentsBefore',
  getCommentsAfter: 'getCommentsAfter',
  getCommentsInside: 'getCommentsInside',
  getJSDocComment: 'getJSDocComment',
  getFirstToken: 'getFirstToken',
  getFirstTokens: 'getFirstTokens',
  getLastToken: 'getLastToken',
  getLastTokens: 'getLastTokens',
  getTokenAfter: 'getTokenAfter',
  getTokenBefore: 'getTokenBefore',
  getTokenByRangeStart: 'getTokenByRangeStart',
  getTokens: 'getTokens',
  getTokensAfter: 'getTokensAfter',
  getTokensBefore: 'getTokensBefore',
  getTokensBetween: 'getTokensBetween',
};

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'disallow usage of deprecated methods on rule context objects',
      category: 'Rules',
      recommended: true,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-deprecated-context-methods.md',
    },
    fixable: 'code',
    schema: [],
    messages: {
      newFormat:
        'Use `{{contextName}}.getSourceCode().{{replacement}}` instead of `{{contextName}}.{{original}}`.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9

    // ----------------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------------

    return {
      'Program:exit'(ast) {
        [...utils.getContextIdentifiers(sourceCode.scopeManager, ast)]
          .filter(
            (contextId) =>
              contextId.parent.type === 'MemberExpression' &&
              contextId === contextId.parent.object &&
              contextId.parent.property.type === 'Identifier' &&
              Object.prototype.hasOwnProperty.call(
                DEPRECATED_PASSTHROUGHS,
                contextId.parent.property.name,
              ),
          )
          .forEach((contextId) =>
            context.report({
              node: contextId.parent,
              messageId: 'newFormat',
              data: {
                contextName: contextId.name,
                original: contextId.parent.property.name,
                replacement:
                  DEPRECATED_PASSTHROUGHS[contextId.parent.property.name],
              },
              fix: (fixer) => [
                fixer.insertTextAfter(contextId, '.getSourceCode()'),
                fixer.replaceText(
                  contextId.parent.property,
                  DEPRECATED_PASSTHROUGHS[contextId.parent.property.name],
                ),
              ],
            }),
          );
      },
    };
  },
};
