'use strict';

const isNil = require('ramda/src/isNil');
const find = require('ramda/src/find');
const astUtil = require('../util/ast');

const asyncMethods = [ 'async', 'callback', 'promise' ];

function hasAsyncCallback(functionExpression) {
    return functionExpression.params.length === 1;
}

function isAsyncFunction(functionExpression) {
    return functionExpression.async === true;
}

function findPromiseReturnStatement(nodes) {
    return find(function (node) {
        return node.type === 'ReturnStatement' && node.argument && node.argument.type !== 'Literal';
    }, nodes);
}

function doesReturnPromise(functionExpression) {
    const bodyStatement = functionExpression.body;
    let returnStatement = null;

    if (bodyStatement.type === 'BlockStatement') {
        returnStatement = findPromiseReturnStatement(functionExpression.body.body);
    } else if (bodyStatement.type !== 'Literal') {
        //  allow arrow statements calling a promise with implicit return.
        returnStatement = bodyStatement;
    }

    return returnStatement !== null &&
        typeof returnStatement !== 'undefined';
}

module.exports = function (context) {
    const options = context.options[0] || {};
    const allowedAsyncMethods = isNil(options.allowed) ? asyncMethods : options.allowed;

    function check(node) {
        if (astUtil.hasParentMochaFunctionCall(node)) {
            // For each allowed async test method, check if it is used in the test
            const testAsyncMethods = allowedAsyncMethods.map(function (method) {
                switch (method) {
                case 'async':
                    return isAsyncFunction(node);

                case 'callback':
                    return hasAsyncCallback(node);

                default:
                    return doesReturnPromise(node);
                }
            });

            // Check that at least one allowed async test method is used in the test
            const isAsyncTest = testAsyncMethods.some(function (value) {
                return value === true;
            });

            if (!isAsyncTest) {
                context.report(node, 'Unexpected synchronous test.');
            }
        }
    }

    return {
        FunctionExpression: check,
        ArrowFunctionExpression: check
    };
};

module.exports.schema = [
    {
        type: 'object',
        properties: {
            allowed: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: asyncMethods
                },
                minItems: 1,
                uniqueItems: true
            }
        }
    }
];
