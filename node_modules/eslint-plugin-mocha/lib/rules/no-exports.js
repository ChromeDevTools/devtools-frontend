'use strict';

const createAstUtils = require('../util/ast');

module.exports = {
    meta: {
        docs: {
            description: 'Disallow exports from test files'
        },
        messages: {
            unexpectedExport: 'Unexpected export from a test file'
        },
        type: 'suggestion'
    },
    create(context) {
        const astUtils = createAstUtils(context.settings);
        const exportNodes = [];
        let hasTestCase = false;

        function isCommonJsExport(node) {
            if (node.type === 'MemberExpression') {
                const name = astUtils.getNodeName(node);

                return name === 'module.exports' || name.startsWith('exports.');
            }

            return false;
        }

        return {
            'Program:exit'() {
                if (hasTestCase && exportNodes.length > 0) {
                    for (const node of exportNodes) {
                        context.report({ node, messageId: 'unexpectedExport' });
                    }
                }
            },

            CallExpression(node) {
                if (astUtils.isMochaFunctionCall(node, context.getScope())) {
                    hasTestCase = true;
                }
            },

            'ExportNamedDeclaration, ExportDefaultDeclaration, ExportAllDeclaration'(node) {
                exportNodes.push(node);
            },

            AssignmentExpression(node) {
                if (isCommonJsExport(node.left)) {
                    exportNodes.push(node);
                }
            }
        };
    }
};
