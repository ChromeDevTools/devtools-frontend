/**
 * @author Brad Zacher <https://github.com/bradzacher>
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
      description: 'disallow function-style rules',
      category: 'Rules',
      recommended: true,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/prefer-object-rule.md',
    },
    fixable: 'code',
    schema: [],
    messages: {
      preferObject: 'Rules should be declared using the object style.',
    },
  },

  create(context) {
    // ----------------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------------

    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9
    const ruleInfo = utils.getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }

    return {
      Program() {
        if (ruleInfo.isNewStyle) {
          return;
        }

        context.report({
          node: ruleInfo.create,
          messageId: 'preferObject',
          *fix(fixer) {
            // note - we intentionally don't worry about formatting here, as otherwise we have
            //        to indent the function correctly

            if (
              ruleInfo.create.type === 'FunctionExpression' ||
              ruleInfo.create.type === 'FunctionDeclaration'
            ) {
              const openParenToken = sourceCode.getFirstToken(
                ruleInfo.create,
                (token) => token.type === 'Punctuator' && token.value === '(',
              );

              /* istanbul ignore if */
              if (!openParenToken) {
                // this shouldn't happen, but guarding against crashes just in case
                return null;
              }

              yield fixer.replaceTextRange(
                [ruleInfo.create.range[0], openParenToken.range[0]],
                '{create',
              );
              yield fixer.insertTextAfter(ruleInfo.create, '}');
            } else if (ruleInfo.create.type === 'ArrowFunctionExpression') {
              yield fixer.insertTextBefore(ruleInfo.create, '{create: ');
              yield fixer.insertTextAfter(ruleInfo.create, '}');
            }
          },
        });
      },
    };
  },
};
