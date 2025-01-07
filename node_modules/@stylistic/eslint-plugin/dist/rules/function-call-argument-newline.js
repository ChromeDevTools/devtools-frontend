'use strict';

var utils = require('../utils.js');
require('eslint-visitor-keys');
require('espree');
require('estraverse');

var functionCallArgumentNewline = utils.createRule({
  name: "function-call-argument-newline",
  package: "js",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce line breaks between arguments of a function call"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "string",
        enum: ["always", "never", "consistent"]
      }
    ],
    messages: {
      unexpectedLineBreak: "There should be no line break here.",
      missingLineBreak: "There should be a line break after this argument."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const checkers = {
      unexpected: {
        messageId: "unexpectedLineBreak",
        check: (prevToken, currentToken) => prevToken.loc.end.line !== currentToken.loc.start.line,
        createFix: (token, tokenBefore) => (fixer) => fixer.replaceTextRange([tokenBefore.range[1], token.range[0]], " ")
      },
      missing: {
        messageId: "missingLineBreak",
        check: (prevToken, currentToken) => prevToken.loc.end.line === currentToken.loc.start.line,
        createFix: (token, tokenBefore) => (fixer) => fixer.replaceTextRange([tokenBefore.range[1], token.range[0]], "\n")
      }
    };
    function checkArguments(argumentNodes, checker) {
      for (let i = 1; i < argumentNodes.length; i++) {
        const argumentNode = argumentNodes[i - 1];
        const prevArgToken = sourceCode.getLastToken(argumentNode);
        const currentArgToken = sourceCode.getFirstToken(argumentNodes[i]);
        if (checker.check(prevArgToken, currentArgToken)) {
          const tokenBefore = sourceCode.getTokenBefore(
            currentArgToken,
            { includeComments: true }
          );
          const hasLineCommentBefore = tokenBefore.type === "Line";
          context.report({
            node: argumentNodes[i - 1],
            loc: {
              start: tokenBefore.loc.end,
              end: currentArgToken.loc.start
            },
            messageId: checker.messageId,
            fix: hasLineCommentBefore ? null : checker.createFix(currentArgToken, tokenBefore)
          });
        }
      }
    }
    function check(argumentNodes) {
      if (argumentNodes.length < 2)
        return;
      const option = context.options[0] || "always";
      if (option === "never") {
        checkArguments(argumentNodes, checkers.unexpected);
      } else if (option === "always") {
        checkArguments(argumentNodes, checkers.missing);
      } else if (option === "consistent") {
        const firstArgToken = sourceCode.getLastToken(argumentNodes[0]);
        const secondArgToken = sourceCode.getFirstToken(argumentNodes[1]);
        if (firstArgToken?.loc.end.line === secondArgToken?.loc.start.line)
          checkArguments(argumentNodes, checkers.unexpected);
        else
          checkArguments(argumentNodes, checkers.missing);
      }
    }
    return {
      CallExpression: (node) => check(node.arguments),
      NewExpression: (node) => check(node.arguments),
      ImportExpression: (node) => {
        if (node.options)
          check([node.source, node.options]);
      }
    };
  }
});

module.exports = functionCallArgumentNewline;
