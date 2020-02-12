'use strict';

const astUtils = require('../util/ast');

function reportIfShortArrowFunction(context, node) {
    if (node.body.type !== 'BlockStatement') {
        context.report({
            node: node.body,
            message: 'Confusing implicit return in a test with an async function'
        });
        return true;
    }
    return false;
}

function isAllowedReturnStatement(node) {
    const argument = node.argument;

    if (astUtils.isReturnOfUndefined(node) || argument.type === 'Literal') {
        return true;
    }

    return false;
}

function reportIfFunctionWithBlock(context, node) {
    const returnStatement = astUtils.findReturnStatement(node.body.body);
    if (returnStatement && !isAllowedReturnStatement(returnStatement)) {
        context.report({
            node: returnStatement,
            message: 'Unexpected use of `return` in a test with an async function'
        });
    }
}

module.exports = function (context) {
    function check(node) {
        if (!node.async || !astUtils.hasParentMochaFunctionCall(node)) {
            return;
        }

        if (!reportIfShortArrowFunction(context, node)) {
            reportIfFunctionWithBlock(context, node);
        }
    }

    return {
        FunctionExpression: check,
        ArrowFunctionExpression: check
    };
};
