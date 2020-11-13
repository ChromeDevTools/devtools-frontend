'use strict';

/**
 * @fileoverview Disallow arrow functions as arguments to Mocha globals
 * @author Paul Melnikow
 */

const createAstUtils = require('../util/ast');

module.exports = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow arrow functions as arguments to mocha functions'
        },
        fixable: 'code'
    },
    create(context) {
        const astUtils = createAstUtils(context.settings);
        const sourceCode = context.getSourceCode();

        function extractSourceTextByRange(start, end) {
            return sourceCode.text.slice(start, end).trim();
        }

        // eslint-disable-next-line max-statements
        function formatFunctionHead(fn) {
            const arrow = sourceCode.getTokenBefore(fn.body);
            const beforeArrowToken = sourceCode.getTokenBefore(arrow);
            let firstToken = sourceCode.getFirstToken(fn);

            let functionKeyword = 'function';
            let params = extractSourceTextByRange(firstToken.range[0], beforeArrowToken.range[1]);
            if (fn.async) {
                // When 'async' specified strip the token from the params text
                // and prepend it to the function keyword
                params = params.slice(firstToken.range[1] - firstToken.range[0]).trim();
                functionKeyword = 'async function';

                // Advance firstToken pointer
                firstToken = sourceCode.getTokenAfter(firstToken);
            }

            const beforeArrowComment = extractSourceTextByRange(beforeArrowToken.range[1], arrow.range[0]);
            const afterArrowComment = extractSourceTextByRange(arrow.range[1], fn.body.range[0]);
            let paramsFullText;
            if (firstToken.type !== 'Punctuator') {
                paramsFullText = `(${params}${beforeArrowComment})${afterArrowComment}`;
            } else {
                paramsFullText = `${params}${beforeArrowComment}${afterArrowComment}`;
            }

            return `${functionKeyword}${paramsFullText} `;
        }

        function fixArrowFunction(fixer, fn) {
            if (fn.body.type === 'BlockStatement') {
                // When it((...) => { ... }),
                // simply replace '(...) => ' with 'function () '
                return fixer.replaceTextRange(
                    [ fn.range[0], fn.body.range[0] ],
                    formatFunctionHead(fn)
                );
            }

            const bodyText = sourceCode.text.slice(fn.body.range[0], fn.body.range[1]);
            return fixer.replaceTextRange(
                [ fn.range[0], fn.range[1] ],
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
    }
};
