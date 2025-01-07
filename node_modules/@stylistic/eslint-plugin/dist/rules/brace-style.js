'use strict';

var utils = require('../utils.js');
var astUtils = require('@typescript-eslint/utils/ast-utils');
require('eslint-visitor-keys');
require('espree');
require('estraverse');

var _baseRule = utils.createRule({
  name: "brace-style",
  package: "js",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent brace style for blocks"
    },
    schema: [
      {
        type: "string",
        enum: ["1tbs", "stroustrup", "allman"]
      },
      {
        type: "object",
        properties: {
          allowSingleLine: {
            type: "boolean",
            default: false
          }
        },
        additionalProperties: false
      }
    ],
    fixable: "whitespace",
    messages: {
      nextLineOpen: "Opening curly brace does not appear on the same line as controlling statement.",
      sameLineOpen: "Opening curly brace appears on the same line as controlling statement.",
      blockSameLine: "Statement inside of curly braces should be on next line.",
      nextLineClose: "Closing curly brace does not appear on the same line as the subsequent block.",
      singleLineClose: "Closing curly brace should be on the same line as opening curly brace or on the line after the previous block.",
      sameLineClose: "Closing curly brace appears on the same line as the subsequent block."
    }
  },
  create(context) {
    const style = context.options[0] || "1tbs";
    const params = context.options[1] || {};
    const sourceCode = context.sourceCode;
    function removeNewlineBetween(firstToken, secondToken) {
      const textRange = [firstToken.range[1], secondToken.range[0]];
      const textBetween = sourceCode.text.slice(textRange[0], textRange[1]);
      if (textBetween.trim())
        return null;
      return (fixer) => fixer.replaceTextRange(textRange, " ");
    }
    function validateCurlyPair(openingCurly, closingCurly) {
      const tokenBeforeOpeningCurly = sourceCode.getTokenBefore(openingCurly);
      const tokenAfterOpeningCurly = sourceCode.getTokenAfter(openingCurly);
      const tokenBeforeClosingCurly = sourceCode.getTokenBefore(closingCurly);
      const singleLineException = params.allowSingleLine && utils.isTokenOnSameLine(openingCurly, closingCurly);
      if (style !== "allman" && !utils.isTokenOnSameLine(tokenBeforeOpeningCurly, openingCurly)) {
        context.report({
          node: openingCurly,
          messageId: "nextLineOpen",
          fix: removeNewlineBetween(
            tokenBeforeOpeningCurly,
            openingCurly
          )
        });
      }
      if (style === "allman" && utils.isTokenOnSameLine(tokenBeforeOpeningCurly, openingCurly) && !singleLineException) {
        context.report({
          node: openingCurly,
          messageId: "sameLineOpen",
          fix: (fixer) => fixer.insertTextBefore(openingCurly, "\n")
        });
      }
      if (utils.isTokenOnSameLine(openingCurly, tokenAfterOpeningCurly) && tokenAfterOpeningCurly !== closingCurly && !singleLineException) {
        context.report({
          node: openingCurly,
          messageId: "blockSameLine",
          fix: (fixer) => fixer.insertTextAfter(openingCurly, "\n")
        });
      }
      if (tokenBeforeClosingCurly !== openingCurly && !singleLineException && utils.isTokenOnSameLine(tokenBeforeClosingCurly, closingCurly)) {
        context.report({
          node: closingCurly,
          messageId: "singleLineClose",
          fix: (fixer) => fixer.insertTextBefore(closingCurly, "\n")
        });
      }
    }
    function validateCurlyBeforeKeyword(curlyToken) {
      const keywordToken = sourceCode.getTokenAfter(curlyToken);
      if (style === "1tbs" && !utils.isTokenOnSameLine(curlyToken, keywordToken)) {
        context.report({
          node: curlyToken,
          messageId: "nextLineClose",
          fix: removeNewlineBetween(curlyToken, keywordToken)
        });
      }
      if (style !== "1tbs" && utils.isTokenOnSameLine(curlyToken, keywordToken)) {
        context.report({
          node: curlyToken,
          messageId: "sameLineClose",
          fix: (fixer) => fixer.insertTextAfter(curlyToken, "\n")
        });
      }
    }
    return {
      BlockStatement(node) {
        if (!utils.STATEMENT_LIST_PARENTS.has(node.parent.type))
          validateCurlyPair(sourceCode.getFirstToken(node), sourceCode.getLastToken(node));
      },
      StaticBlock(node) {
        validateCurlyPair(
          sourceCode.getFirstToken(node, { skip: 1 }),
          // skip the `static` token
          sourceCode.getLastToken(node)
        );
      },
      ClassBody(node) {
        validateCurlyPair(sourceCode.getFirstToken(node), sourceCode.getLastToken(node));
      },
      SwitchStatement(node) {
        const closingCurly = sourceCode.getLastToken(node);
        const openingCurly = sourceCode.getTokenBefore(node.cases.length ? node.cases[0] : closingCurly);
        validateCurlyPair(openingCurly, closingCurly);
      },
      IfStatement(node) {
        if (node.consequent.type === "BlockStatement" && node.alternate) {
          validateCurlyBeforeKeyword(sourceCode.getLastToken(node.consequent));
        }
      },
      TryStatement(node) {
        validateCurlyBeforeKeyword(sourceCode.getLastToken(node.block));
        if (node.handler && node.finalizer) {
          validateCurlyBeforeKeyword(sourceCode.getLastToken(node.handler.body));
        }
      }
    };
  }
});

const baseRule = /* @__PURE__ */ utils.castRuleModule(_baseRule);
var braceStyle = utils.createRule({
  name: "brace-style",
  package: "ts",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent brace style for blocks"
    },
    messages: baseRule.meta.messages,
    fixable: baseRule.meta.fixable,
    hasSuggestions: baseRule.meta.hasSuggestions,
    schema: baseRule.meta.schema
  },
  defaultOptions: ["1tbs"],
  create(context) {
    const [
      style,
      { allowSingleLine } = { allowSingleLine: false }
    ] = context.options;
    const isAllmanStyle = style === "allman";
    const sourceCode = context.sourceCode;
    const rules = baseRule.create(context);
    function validateCurlyPair(openingCurlyToken, closingCurlyToken) {
      if (allowSingleLine && astUtils.isTokenOnSameLine(openingCurlyToken, closingCurlyToken)) {
        return;
      }
      const tokenBeforeOpeningCurly = sourceCode.getTokenBefore(openingCurlyToken);
      const tokenBeforeClosingCurly = sourceCode.getTokenBefore(closingCurlyToken);
      const tokenAfterOpeningCurly = sourceCode.getTokenAfter(openingCurlyToken);
      if (!isAllmanStyle && !astUtils.isTokenOnSameLine(tokenBeforeOpeningCurly, openingCurlyToken)) {
        context.report({
          node: openingCurlyToken,
          messageId: "nextLineOpen",
          fix: (fixer) => {
            const textRange = [
              tokenBeforeOpeningCurly.range[1],
              openingCurlyToken.range[0]
            ];
            const textBetween = sourceCode.text.slice(
              textRange[0],
              textRange[1]
            );
            if (textBetween.trim())
              return null;
            return fixer.replaceTextRange(textRange, " ");
          }
        });
      }
      if (isAllmanStyle && astUtils.isTokenOnSameLine(tokenBeforeOpeningCurly, openingCurlyToken)) {
        context.report({
          node: openingCurlyToken,
          messageId: "sameLineOpen",
          fix: (fixer) => fixer.insertTextBefore(openingCurlyToken, "\n")
        });
      }
      if (astUtils.isTokenOnSameLine(openingCurlyToken, tokenAfterOpeningCurly) && tokenAfterOpeningCurly !== closingCurlyToken) {
        context.report({
          node: openingCurlyToken,
          messageId: "blockSameLine",
          fix: (fixer) => fixer.insertTextAfter(openingCurlyToken, "\n")
        });
      }
      if (astUtils.isTokenOnSameLine(tokenBeforeClosingCurly, closingCurlyToken) && tokenBeforeClosingCurly !== openingCurlyToken) {
        context.report({
          node: closingCurlyToken,
          messageId: "singleLineClose",
          fix: (fixer) => fixer.insertTextBefore(closingCurlyToken, "\n")
        });
      }
    }
    return {
      ...rules,
      "TSInterfaceBody, TSModuleBlock": function(node) {
        const openingCurly = sourceCode.getFirstToken(node);
        const closingCurly = sourceCode.getLastToken(node);
        validateCurlyPair(openingCurly, closingCurly);
      },
      TSEnumDeclaration(node) {
        const closingCurly = sourceCode.getLastToken(node);
        const members = node.body?.members || node.members;
        const openingCurly = sourceCode.getTokenBefore(
          members.length ? members[0] : closingCurly
        );
        validateCurlyPair(openingCurly, closingCurly);
      }
    };
  }
});

module.exports = braceStyle;
