'use strict';

/**
 * @fileoverview Match test descriptions to match a pre-configured regular expression
 * @author Alexander Afanasyev
 */

const astUtils = require('../util/ast');

const defaultTestNames = [ 'it', 'test', 'specify' ];

function inlineOptions(context) {
    const pattern = context.options[0] ? new RegExp(context.options[0]) : /^should/;
    const testNames = context.options[1] ? context.options[1] : defaultTestNames;
    const message = context.options[2];

    return { pattern, testNames, message };
}

function objectOptions(options) {
    const pattern = options.pattern ? new RegExp(options.pattern) : /^should/;
    const testNames = options.testNames ? options.testNames : defaultTestNames;
    const message = options.message;

    return { pattern, testNames, message };
}

module.exports = function (context) {
    const options = context.options[0];

    const { pattern, testNames, message } = typeof options === 'object' && !(options instanceof RegExp) ?
        objectOptions(options) :
        inlineOptions(context);

    function isTest(node) {
        return node.callee && node.callee.name && testNames.indexOf(node.callee.name) > -1;
    }

    function hasValidTestDescription(mochaCallExpression) {
        const args = mochaCallExpression.arguments;
        const testDescriptionArgument = args[0];

        if (astUtils.isStringLiteral(testDescriptionArgument)) {
            return pattern.test(testDescriptionArgument.value);
        }

        return true;
    }

    function hasValidOrNoTestDescription(mochaCallExpression) {
        const args = mochaCallExpression.arguments;
        const hasNoTestDescription = args.length === 0;

        return hasNoTestDescription || hasValidTestDescription(mochaCallExpression);
    }

    return {
        CallExpression(node) {
            const callee = node.callee;

            if (isTest(node)) {
                if (!hasValidOrNoTestDescription(node)) {
                    context.report(node, message || `Invalid "${ callee.name }()" description found.`);
                }
            }
        }
    };
};
