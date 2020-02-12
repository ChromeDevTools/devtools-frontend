'use strict';

const astUtil = require('../util/ast');
const { additionalSuiteNames } = require('../util/settings');

function newDescribeLayer(describeNode) {
    return {
        describeNode,
        before: false,
        after: false,
        beforeEach: false,
        afterEach: false
    };
}

module.exports = function (context) {
    const isUsed = [];
    const settings = context.settings;

    return {
        Program(node) {
            isUsed.push(newDescribeLayer(node));
        },

        CallExpression(node) {
            const name = astUtil.getNodeName(node.callee);

            if (astUtil.isDescribe(node, additionalSuiteNames(settings))) {
                isUsed.push(newDescribeLayer(node));
                return;
            }

            if (!astUtil.isHookIdentifier(node.callee)) {
                return;
            }

            if (isUsed[isUsed.length - 1][name]) {
                context.report({
                    node: node.callee,
                    message: `Unexpected use of duplicate Mocha \`${ name }\` hook`
                });
            }

            isUsed[isUsed.length - 1][name] = true;
        },

        'CallExpression:exit'(node) {
            if (isUsed[isUsed.length - 1].describeNode === node) {
                isUsed.pop();
            }
        }
    };
};
