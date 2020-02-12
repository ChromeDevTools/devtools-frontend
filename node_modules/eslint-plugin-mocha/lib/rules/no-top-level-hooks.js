'use strict';

const astUtil = require('../util/ast');
const { additionalSuiteNames } = require('../util/settings');

module.exports = function (context) {
    const settings = context.settings;
    const testSuiteStack = [];

    return {
        CallExpression(node) {
            if (astUtil.isDescribe(node, additionalSuiteNames(settings))) {
                testSuiteStack.push(node);
                return;
            }

            if (!astUtil.isHookIdentifier(node.callee)) {
                return;
            }

            if (testSuiteStack.length === 0) {
                context.report({
                    node: node.callee,
                    message: `Unexpected use of Mocha \`${ node.callee.name }\` hook outside of a test suite`
                });
            }
        },

        'CallExpression:exit'(node) {
            if (testSuiteStack[testSuiteStack.length - 1] === node) {
                testSuiteStack.pop();
            }
        }
    };
};
