/**
 * @fileoverview prefer using `replaceText()` instead of `replaceTextRange()`
 * @author 薛定谔的猫<hh_2013@foxmail.com>
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
        'require using `replaceText()` instead of `replaceTextRange()`',
      category: 'Rules',
      recommended: false,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/prefer-replace-text.md',
    },
    fixable: null,
    schema: [],
    messages: {
      useReplaceText: 'Use replaceText instead of replaceTextRange.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9
    let funcInfo = {
      upper: null,
      codePath: null,
      shouldCheck: false,
      node: null,
    };
    let contextIdentifiers;

    return {
      Program(ast) {
        contextIdentifiers = utils.getContextIdentifiers(
          sourceCode.scopeManager,
          ast,
        );
      },

      // Stacks this function's information.
      onCodePathStart(codePath, node) {
        funcInfo = {
          upper: funcInfo,
          codePath,
          shouldCheck:
            utils.isAutoFixerFunction(node, contextIdentifiers) ||
            utils.isSuggestionFixerFunction(node, contextIdentifiers),
          node,
        };
      },

      // Pops this function's information.
      onCodePathEnd() {
        funcInfo = funcInfo.upper;
      },

      // Checks the replaceTextRange arguments.
      'CallExpression[arguments.length=2]'(node) {
        if (
          funcInfo.shouldCheck &&
          node.callee.type === 'MemberExpression' &&
          node.callee.property.name === 'replaceTextRange'
        ) {
          const arg = node.arguments[0];
          const isIdenticalNodeRange =
            arg.type === 'ArrayExpression' &&
            arg.elements[0].type === 'MemberExpression' &&
            arg.elements[1].type === 'MemberExpression' &&
            sourceCode.getText(arg.elements[0].object) ===
              sourceCode.getText(arg.elements[1].object);
          if (isIdenticalNodeRange) {
            context.report({
              node,
              messageId: 'useReplaceText',
            });
          }
        }
      },
    };
  },
};
