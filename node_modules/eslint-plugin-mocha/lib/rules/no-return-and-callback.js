'use strict';

const astUtils = require('../util/ast');

function reportIfShortArrowFunction(context, node) {
    if (node.body.type !== 'BlockStatement') {
        context.report({
            node: node.body,
            message: 'Confusing implicit return in a test with callback'
        });
        return true;
    }
    return false;
}

function isFunctionCallWithName(node, name) {
    return node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === name;
}

function isAllowedReturnStatement(node, doneName) {
    const argument = node.argument;

    if (astUtils.isReturnOfUndefined(node) || argument.type === 'Literal') {
        return true;
    }

    return isFunctionCallWithName(argument, doneName);
}

function reportIfFunctionWithBlock(context, node, doneName) {
    const returnStatement = astUtils.findReturnStatement(node.body.body);
    if (returnStatement && !isAllowedReturnStatement(returnStatement, doneName)) {
        context.report({
            node: returnStatement,
            message: 'Unexpected use of `return` in a test with callback'
        });
    }
}

module.exports = function (context) {
    function check(node) {
        if (node.params.length === 0 || !astUtils.hasParentMochaFunctionCall(node)) {
            return;
        }

        if (!reportIfShortArrowFunction(context, node)) {
            reportIfFunctionWithBlock(context, node, node.params[0].name);
        }
    }

    return {
        FunctionExpression: check,
        ArrowFunctionExpression: check
    };
};
