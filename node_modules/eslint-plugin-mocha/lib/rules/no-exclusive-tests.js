'use strict';

const createAstUtils = require('../util/ast');

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow exclusive tests'
        }
    },
    create(context) {
        const astUtils = createAstUtils(context.settings);

        return {
            CallExpression(node) {
                const options = { modifiers: [ 'only' ], modifiersOnly: true };

                if (astUtils.isDescribe(node, options) || astUtils.isTestCase(node, options)) {
                    const callee = node.callee;

                    context.report({
                        node: callee.property,
                        message: 'Unexpected exclusive mocha test.'
                    });
                }
            }
        };
    }
};
