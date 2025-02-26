/**
 * @fileoverview Disallow the version of `context.report()` with multiple arguments
 * @author Teddy Katz
 */

'use strict';

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
        'disallow the version of `context.report()` with multiple arguments',
      category: 'Rules',
      recommended: true,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-deprecated-report-api.md',
    },
    fixable: 'code', // or "code" or "whitespace"
    schema: [],
    messages: {
      useNewAPI: 'Use the new-style context.report() API.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9
    let contextIdentifiers;

    // ----------------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------------

    return {
      Program(ast) {
        contextIdentifiers = utils.getContextIdentifiers(
          sourceCode.scopeManager,
          ast,
        );
      },
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          contextIdentifiers.has(node.callee.object) &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'report' &&
          (node.arguments.length > 1 ||
            (node.arguments.length === 1 &&
              node.arguments[0].type === 'SpreadElement'))
        ) {
          context.report({
            node: node.callee.property,
            messageId: 'useNewAPI',
            fix(fixer) {
              const openingParen = sourceCode.getTokenBefore(node.arguments[0]);
              const closingParen = sourceCode.getLastToken(node);
              const reportInfo = utils.getReportInfo(node, context);

              if (!reportInfo) {
                return null;
              }

              return fixer.replaceTextRange(
                [openingParen.range[1], closingParen.range[0]],
                `{${Object.keys(reportInfo)
                  .map(
                    (key) => `${key}: ${sourceCode.getText(reportInfo[key])}`,
                  )
                  .join(', ')}}`,
              );
            },
          });
        }
      },
    };
  },
};
