'use strict';

/**
 * @fileoverview Disallow arrow functions as arguments to Mocha globals
 * @author Paul Melnikow
 */

const last = require('ramda/src/last');
const astUtils = require('../util/ast');

module.exports = function (context) {
    const sourceCode = context.getSourceCode();

    function formatFunctionHead(fn) {
        const paramsLeftParen = sourceCode.getFirstToken(fn);
        const paramsRightParen = sourceCode.getTokenBefore(sourceCode.getTokenBefore(fn.body));
        let paramsFullText = sourceCode.text.slice(paramsLeftParen.range[0], paramsRightParen.range[1]);
        let functionKeyword = 'function';

        if (fn.async) {
            // When 'async' specified, take care about the keyword.
            functionKeyword = 'async function';
            // Strip 'async (...)' to ' (...)'
            paramsFullText = paramsFullText.slice(5);
        }

        if (fn.params.length > 0) {
            paramsFullText = `(${ sourceCode.text.slice(fn.params[0].start, last(fn.params).end) })`;
        }

        return `${functionKeyword}${paramsFullText} `;
    }

    function fixArrowFunction(fixer, fn) {
        if (fn.body.type === 'BlockStatement') {
            // When it((...) => { ... }),
            // simply replace '(...) => ' with 'function () '
            return fixer.replaceTextRange(
                [ fn.start, fn.body.start ],
                formatFunctionHead(fn)
            );
        }

        const bodyText = sourceCode.text.slice(fn.body.range[0], fn.body.range[1]);
        return fixer.replaceTextRange(
            [ fn.start, fn.end ],
            `${formatFunctionHead(fn)}{ return ${ bodyText }; }`
        );
    }

    return {
        CallExpression(node) {
            const name = astUtils.getNodeName(node.callee);

            if (astUtils.isMochaFunctionCall(node, context.getScope())) {
                const fnArg = node.arguments.slice(-1)[0];
                if (fnArg && fnArg.type === 'ArrowFunctionExpression') {
                    context.report({
                        node,
                        message: `Do not pass arrow functions to ${ name }()`,
                        fix(fixer) {
                            return fixArrowFunction(fixer, fnArg);
                        }
                    });
                }
            }
        }
    };
};
