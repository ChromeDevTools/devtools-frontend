'use strict';

/* eslint "complexity": [ "error", 5 ] */

const createAstUtils = require('../util/ast');

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow tests to be nested within other tests '
        }
    },
    create(context) {
        const astUtils = createAstUtils(context.settings);
        let testNestingLevel = 0;
        let hookCallNestingLevel = 0;

        function report(callExpression, message) {
            context.report({
                message,
                node: callExpression.callee
            });
        }

        function isNestedTest(isTestCase, isDescribe, nestingLevel) {
            const isNested = nestingLevel > 0;
            const isTest = isTestCase || isDescribe;

            return isNested && isTest;
        }

        function checkForAndReportErrors(node, isTestCase, isDescribe, isHookCall) {
            if (isNestedTest(isTestCase, isDescribe, testNestingLevel)) {
                const message = isDescribe ?
                    'Unexpected suite nested within a test.' :
                    'Unexpected test nested within another test.';
                report(node, message);
            } else if (isNestedTest(isTestCase, isHookCall, hookCallNestingLevel)) {
                const message = isHookCall ?
                    'Unexpected test hook nested within a test hook.' :
                    'Unexpected test nested within a test hook.';
                report(node, message);
            }
        }

        return {
            CallExpression(node) {
                const isTestCase = astUtils.isTestCase(node);
                const isHookCall = astUtils.isHookCall(node);
                const isDescribe = astUtils.isDescribe(node);

                checkForAndReportErrors(node, isTestCase, isDescribe, isHookCall);

                if (isTestCase) {
                    testNestingLevel += 1;
                } else if (isHookCall) {
                    hookCallNestingLevel += 1;
                }
            },

            'CallExpression:exit'(node) {
                if (astUtils.isTestCase(node)) {
                    testNestingLevel -= 1;
                } else if (astUtils.isHookCall(node)) {
                    hookCallNestingLevel -= 1;
                }
            }
        };
    }
};
