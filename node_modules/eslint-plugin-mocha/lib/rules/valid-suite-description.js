'use strict';

/**
 * @fileoverview Match suite descriptions to match a pre-configured regular expression
 * @author Alexander Afanasyev
 */

const astUtils = require('../util/ast');
const defaultSuiteNames = [ 'describe', 'context', 'suite' ];

function inlineOptions(context) {
    const pattern = new RegExp(context.options[0]);
    const suiteNames = context.options[1] ? context.options[1] : defaultSuiteNames;
    const message = context.options[2];

    return { pattern, suiteNames, message };
}

function objectOptions(options) {
    const pattern = new RegExp(options.pattern);
    const suiteNames = options.suiteNames ? options.suiteNames : defaultSuiteNames;
    const message = options.message;

    return { pattern, suiteNames, message };
}

module.exports = function (context) {
    const options = context.options[0];

    const { pattern, suiteNames, message } = typeof options === 'object' && !(options instanceof RegExp) ?
        objectOptions(options) :
        inlineOptions(context);

    function isSuite(node) {
        return node.callee && node.callee.name && suiteNames.indexOf(node.callee.name) > -1;
    }

    function hasValidSuiteDescription(mochaCallExpression) {
        const args = mochaCallExpression.arguments;
        const description = args[0];

        if (astUtils.isStringLiteral(description)) {
            return pattern.test(description.value);
        }

        return true;
    }

    function hasValidOrNoSuiteDescription(mochaCallExpression) {
        const args = mochaCallExpression.arguments;
        const hasNoSuiteDescription = args.length === 0;

        return hasNoSuiteDescription || hasValidSuiteDescription(mochaCallExpression);
    }

    return {
        CallExpression(node) {
            const callee = node.callee;

            if (isSuite(node)) {
                if (!hasValidOrNoSuiteDescription(node)) {
                    context.report(node, message || `Invalid "${ callee.name }()" description found.`);
                }
            }
        }
    };
};
