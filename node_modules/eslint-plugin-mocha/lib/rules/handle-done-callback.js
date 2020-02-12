'use strict';

const find = require('ramda/src/find');
const astUtils = require('../util/ast');

module.exports = function (context) {
    function isAsyncFunction(functionExpression) {
        return functionExpression.params.length === 1;
    }

    function findParamInScope(paramName, scope) {
        return find(function (variable) {
            return variable.name === paramName && variable.defs[0].type === 'Parameter';
        }, scope.variables);
    }

    function isReferenceHandled(reference) {
        const parent = context.getNodeByRangeIndex(reference.identifier.range[0]).parent;

        return parent.type === 'CallExpression';
    }

    function hasHandledReferences(references) {
        return references.some(isReferenceHandled);
    }

    function checkAsyncMochaFunction(functionExpression) {
        const scope = context.getScope();
        const callback = functionExpression.params[0];
        const callbackName = callback.name;
        const callbackVariable = findParamInScope(callbackName, scope);

        if (callbackVariable && !hasHandledReferences(callbackVariable.references)) {
            context.report(callback, 'Expected "{{name}}" callback to be handled.', { name: callbackName });
        }
    }

    function check(node) {
        if (astUtils.hasParentMochaFunctionCall(node) && isAsyncFunction(node)) {
            checkAsyncMochaFunction(node);
        }
    }

    return {
        FunctionExpression: check,
        ArrowFunctionExpression: check
    };
};
