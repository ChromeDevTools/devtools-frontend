'use strict';

const astUtils = require('../util/ast');

module.exports = function (context) {
    function isPendingMochaTest(node) {
        return astUtils.isTestCase(node) &&
            node.arguments.length === 1 &&
            node.arguments[0].type === 'Literal';
    }

    return {
        CallExpression(node) {
            if (node.callee && isPendingMochaTest(node)) {
                context.report({
                    node,
                    message: 'Unexpected pending mocha test.'
                });
            }
        }
    };
};
