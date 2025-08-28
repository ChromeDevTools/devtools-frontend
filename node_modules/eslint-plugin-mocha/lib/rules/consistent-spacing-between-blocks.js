'use strict';

/* eslint "complexity": [ "error", 6 ] */

exports.meta = {
    type: 'suggestion',
    fixable: 'whitespace',
    schema: [],
    docs: {
        description: 'Require consistent spacing between blocks',
        url:
            'https://github.com/lo1tuma/eslint-plugin-mocha/blob/master/docs/rules/' +
            'consistent-spacing-between-blocks.md'
    }
};

// List of Mocha functions that should have a line break before them.
const MOCHA_FUNCTIONS = [
    'before',
    'after',
    'describe',
    'it',
    'beforeEach',
    'afterEach'
];

// Avoids enforcing line breaks at the beginning of a block.
function isFirstStatementInScope(node) {
    return node.parent.parent.body[0] === node.parent;
}

// Ensure that the rule is applied only within the context of Mocha describe blocks.
function isInsideDescribeBlock(node) {
    return (
        node.parent.type === 'ExpressionStatement' &&
        node.parent.parent.type === 'BlockStatement' &&
        (node.parent.parent.parent.type === 'ArrowFunctionExpression' ||
            node.parent.parent.parent.type === 'FunctionExpression') &&
        node.parent.parent.parent.parent.type === 'CallExpression' &&
        node.parent.parent.parent.parent.callee.name === 'describe'
    );
}

exports.create = function (context) {
    return {
        CallExpression(node) {
            if (
                !MOCHA_FUNCTIONS.includes(node.callee.name) ||
                !isInsideDescribeBlock(node) ||
                isFirstStatementInScope(node)
            ) {
                return;
            }

            // Retrieves the token before the current node, skipping comments.
            const beforeToken = context.getSourceCode().getTokenBefore(node);

            // And then count the number of lines between the two.
            const linesBetween = node.loc.start.line - beforeToken.loc.end.line;
            if (linesBetween < 2) {
                context.report({
                    node,
                    message: 'Expected line break before this statement.',
                    fix(fixer) {
                        return fixer.insertTextAfter(
                            beforeToken,
                            linesBetween === 0 ? '\n\n' : '\n'
                        );
                    }
                });
            }
        }
    };
};
