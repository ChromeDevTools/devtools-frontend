'use strict';

const { getAdditionalTestFunctions, getAdditionalXFunctions } = require('../util/settings');

let mochaTestFunctions;
let mochaXFunctions;

function matchesMochaTestFunction(object) {
    return object && mochaTestFunctions.indexOf(object.name) !== -1;
}

function isPropertyNamedSkip(property) {
    return property && (property.name === 'skip' || property.value === 'skip');
}

function isCallToMochasSkipFunction(callee) {
    return callee.type === 'MemberExpression' &&
       matchesMochaTestFunction(callee.object) &&
       isPropertyNamedSkip(callee.property);
}

function createSkipAutofixFunction(callee) {
    const [ , endRangeOfMemberExpression ] = callee.range;
    const [ , endRangeOfMemberExpressionObject ] = callee.object.range;

    const rangeToRemove = [ endRangeOfMemberExpressionObject, endRangeOfMemberExpression ];

    return function removeSkipProperty(fixer) {
        return fixer.removeRange(rangeToRemove);
    };
}

function createXAutofixFunction(callee) {
    const rangeToRemove = [ callee.range[0], callee.range[0] + 1 ];

    return function removeXPrefix(fixer) {
        return fixer.removeRange(rangeToRemove);
    };
}

function isMochaXFunction(name) {
    return mochaXFunctions.indexOf(name) !== -1;
}

function isCallToMochaXFunction(callee) {
    return callee.type === 'Identifier' && isMochaXFunction(callee.name);
}

module.exports = function (context) {
    const settings = context.settings;
    const additionalTestFunctions = getAdditionalTestFunctions(settings);
    const additionalXFunctions = getAdditionalXFunctions(settings);

    mochaTestFunctions = [
        'it',
        'describe',
        'suite',
        'test',
        'context',
        'specify'
    ].concat(additionalTestFunctions);
    mochaXFunctions = [
        'xit',
        'xdescribe',
        'xcontext',
        'xspecify'
    ].concat(additionalXFunctions);

    return {
        CallExpression(node) {
            const callee = node.callee;

            if (isCallToMochasSkipFunction(callee)) {
                context.report({
                    node: callee.property,
                    message: 'Unexpected skipped mocha test.',
                    fix: createSkipAutofixFunction(callee)
                });
            } else if (isCallToMochaXFunction(callee)) {
                context.report({
                    node: callee,
                    message: 'Unexpected skipped mocha test.',
                    fix: createXAutofixFunction(callee)
                });
            }
        }
    };
};

module.exports.schema = [
    {
        type: 'object',
        properties: {
            additionalTestFunctions: {
                type: 'array',
                items: {
                    type: 'string'
                },
                minItems: 1,
                uniqueItems: true
            },
            additionalXFunctions: {
                type: 'array',
                items: {
                    type: 'string'
                },
                minItems: 1,
                uniqueItems: true
            }
        }
    }
];
