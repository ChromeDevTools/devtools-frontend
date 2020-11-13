'use strict';

const createAstUtils = require('../util/ast');

module.exports = {
    meta: {
        docs: {
            description: 'Disallow skipped tests'
        },
        type: 'problem'
    },
    create(context) {
        const astUtils = createAstUtils(context.settings);

        return {
            CallExpression(node) {
                const options = { modifiers: [ 'skip' ], modifiersOnly: true };

                if (astUtils.isDescribe(node, options) || astUtils.isTestCase(node, options)) {
                    const callee = node.callee;
                    const nodeToReport = callee.type === 'MemberExpression' ? callee.property : callee;

                    context.report({
                        node: nodeToReport,
                        message: 'Unexpected skipped mocha test.'
                    });
                }
            }
        };
    }
};
