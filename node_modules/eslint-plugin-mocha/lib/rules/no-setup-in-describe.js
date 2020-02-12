'use strict';

const astUtils = require('../util/ast');
const { additionalSuiteNames } = require('../util/settings');

const FUNCTION = 1;
const DESCRIBE = 2;
// "Pure" nodes are hooks (like `beforeEach`) or `it` calls
const PURE = 3;

module.exports = function noSetupInDescribe(context) {
    const nesting = [];
    const settings = context.settings;

    function isPureNode(node) {
        return astUtils.isHookCall(node) ||
          astUtils.isTestCase(node) ||
          astUtils.isSuiteConfigCall(node);
    }

    function reportCallExpression(callExpression) {
        const message = 'Unexpected function call in describe block.';

        context.report({
            message,
            node: callExpression.callee
        });
    }

    function reportMemberExpression(memberExpression) {
        const message = 'Unexpected member expression in describe block. ' +
            'Member expressions may call functions via getters.';

        context.report({
            message,
            node: memberExpression
        });
    }

    function isNestedInDescribeBlock() {
        return nesting.length &&
                nesting.indexOf(PURE) === -1 &&
                nesting.lastIndexOf(FUNCTION) < nesting.lastIndexOf(DESCRIBE);
    }

    function handleCallExpressionInDescribe(node) {
        if (isPureNode(node)) {
            nesting.push(PURE);
        } else if (isNestedInDescribeBlock()) {
            reportCallExpression(node);
        }
    }

    function isDescribe(node) {
        return astUtils.isDescribe(node, additionalSuiteNames(settings));
    }

    function isParentDescribe(node) {
        return isDescribe(node.parent);
    }

    return {
        CallExpression(node) {
            if (isDescribe(node)) {
                nesting.push(DESCRIBE);
                return;
            }
            // don't process anything else if the first describe hasn't been processed
            if (!nesting.length) {
                return;
            }
            handleCallExpressionInDescribe(node);
        },

        'CallExpression:exit'(node) {
            if (isDescribe(node) || nesting.length && isPureNode(node)) {
                nesting.pop();
            }
        },

        MemberExpression(node) {
            if (isNestedInDescribeBlock()) {
                reportMemberExpression(node);
            }
        },

        FunctionDeclaration() {
            if (nesting.length) {
                nesting.push(FUNCTION);
            }
        },
        'FunctionDeclaration:exit'() {
            if (nesting.length) {
                nesting.pop();
            }
        },

        ArrowFunctionExpression(node) {
            if (nesting.length && !isParentDescribe(node)) {
                nesting.push(FUNCTION);
            }
        },
        'ArrowFunctionExpression:exit'(node) {
            if (nesting.length && !isParentDescribe(node)) {
                nesting.pop();
            }
        }
    };
};
