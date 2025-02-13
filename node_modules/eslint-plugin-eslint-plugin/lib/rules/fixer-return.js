/**
 * @fileoverview require fixer functions to return a fix
 * @author 薛定谔的猫<hh_2013@foxmail.com>
 */

'use strict';

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

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
      description: 'require fixer functions to return a fix',
      category: 'Rules',
      recommended: true,
      url: 'https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/fixer-return.md',
    },
    fixable: null,
    schema: [],
    messages: {
      missingFix: 'Fixer function never returned a fix.',
    },
  },

  create(context) {
    let funcInfo = {
      upper: null,
      codePath: null,
      hasReturnWithFixer: false,
      hasYieldWithFixer: false,
      shouldCheck: false,
      node: null,
    };
    let contextIdentifiers;

    /**
     * As we exit the fix() function, ensure we have returned or yielded a real fix by this point.
     * If not, report the function as a violation.
     *
     * @param {ASTNode} node - A node to check.
     * @param {Location} loc - Optional location to report violation on.
     * @returns {void}
     */
    function ensureFunctionReturnedFix(
      node,
      loc = (node.id || node).loc.start,
    ) {
      if (
        (node.generator && !funcInfo.hasYieldWithFixer) || // Generator function never yielded a fix
        (!node.generator && !funcInfo.hasReturnWithFixer) // Non-generator function never returned a fix
      ) {
        context.report({
          node,
          loc,
          messageId: 'missingFix',
        });
      }
    }

    /**
     * Check if a returned/yielded node is likely to be a fix or not.
     * A fix is an object created by fixer.replaceText() for example and returned by the fix function.
     * @param {ASTNode} node - node to check
     * @param {Context} context
     * @returns {boolean}
     */
    function isFix(node) {
      const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: use context.sourceCode when dropping eslint < v9
      if (node.type === 'ArrayExpression' && node.elements.length === 0) {
        // An empty array is not a fix.
        return false;
      }
      const scope = sourceCode.getScope?.(node) || context.getScope(); // TODO: just use sourceCode.getScope() when we drop support for ESLint < 9.0.0
      const staticValue = getStaticValue(node, scope);
      if (!staticValue) {
        // If we can't find a static value, assume it's a real fix value.
        return true;
      }

      if (Array.isArray(staticValue.value)) {
        // If the static value is an array, then consider it a fix since fixes could have been added to it after creation.
        return true;
      }

      // Any other static values (booleans, numbers, etc) are not fixes.
      return false;
    }

    return {
      Program(ast) {
        const sourceCode = context.sourceCode || context.getSourceCode(); // TODO: just use context.sourceCode when dropping eslint < v9
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
          hasYieldWithFixer: false,
          hasReturnWithFixer: false,
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

      // Yield in generators
      YieldExpression(node) {
        if (funcInfo.shouldCheck && node.argument && isFix(node.argument)) {
          funcInfo.hasYieldWithFixer = true;
        }
      },

      // Checks the return statement is valid.
      ReturnStatement(node) {
        if (funcInfo.shouldCheck && node.argument && isFix(node.argument)) {
          funcInfo.hasReturnWithFixer = true;
        }
      },

      // Ensure the current fixer function returned or yielded a fix.
      'FunctionExpression:exit'(node) {
        if (funcInfo.shouldCheck) {
          ensureFunctionReturnedFix(node);
        }
      },

      // Ensure the current (arrow) fixer function returned a fix.
      'ArrowFunctionExpression:exit'(node) {
        if (funcInfo.shouldCheck) {
          const sourceCode = context.sourceCode || context.getSourceCode();
          const loc = sourceCode.getTokenBefore(node.body).loc; // Show violation on arrow (=>).
          if (node.expression) {
            // When the return is implied (no curly braces around the body), we have to check the single body node directly.
            if (!isFix(node.body)) {
              context.report({
                node,
                loc,
                messageId: 'missingFix',
              });
            }
          } else {
            ensureFunctionReturnedFix(node, loc);
          }
        }
      },
    };
  },
};
