'use strict';

var utils = require('../utils.js');
var utils$1 = require('@typescript-eslint/utils');
var astUtils = require('@typescript-eslint/utils/ast-utils');
require('eslint-visitor-keys');
require('espree');
require('estraverse');

var _baseRule = utils.createRule({
  name: "block-spacing",
  package: "js",
  meta: {
    type: "layout",
    docs: {
      description: "Disallow or enforce spaces inside of blocks after opening block and before closing block"
    },
    fixable: "whitespace",
    schema: [
      { type: "string", enum: ["always", "never"] }
    ],
    messages: {
      missing: "Requires a space {{location}} '{{token}}'.",
      extra: "Unexpected space(s) {{location}} '{{token}}'."
    }
  },
  create(context) {
    const always = context.options[0] !== "never";
    const messageId = always ? "missing" : "extra";
    const sourceCode = context.sourceCode;
    function getOpenBrace(node) {
      if (node.type === "SwitchStatement") {
        if (node.cases.length > 0)
          return sourceCode.getTokenBefore(node.cases[0]);
        return sourceCode.getLastToken(node, 1);
      }
      if (node.type === "StaticBlock")
        return sourceCode.getFirstToken(node, { skip: 1 });
      return sourceCode.getFirstToken(node);
    }
    function isValid(left, right) {
      return !utils.isTokenOnSameLine(left, right) || sourceCode.isSpaceBetweenTokens(left, right) === always;
    }
    function checkSpacingInsideBraces(node) {
      const openBrace = getOpenBrace(node);
      const closeBrace = sourceCode.getLastToken(node);
      const firstToken = sourceCode.getTokenAfter(openBrace, { includeComments: true });
      const lastToken = sourceCode.getTokenBefore(closeBrace, { includeComments: true });
      if (openBrace.type !== "Punctuator" || openBrace.value !== "{" || closeBrace.type !== "Punctuator" || closeBrace.value !== "}" || firstToken === closeBrace) {
        return;
      }
      if (!always && firstToken.type === "Line")
        return;
      if (!isValid(openBrace, firstToken)) {
        let loc = openBrace.loc;
        if (messageId === "extra") {
          loc = {
            start: openBrace.loc.end,
            end: firstToken.loc.start
          };
        }
        context.report({
          node,
          loc,
          messageId,
          data: {
            location: "after",
            token: openBrace.value
          },
          fix(fixer) {
            if (always)
              return fixer.insertTextBefore(firstToken, " ");
            return fixer.removeRange([openBrace.range[1], firstToken.range[0]]);
          }
        });
      }
      if (!isValid(lastToken, closeBrace)) {
        let loc = closeBrace.loc;
        if (messageId === "extra") {
          loc = {
            start: lastToken.loc.end,
            end: closeBrace.loc.start
          };
        }
        context.report({
          node,
          loc,
          messageId,
          data: {
            location: "before",
            token: closeBrace.value
          },
          fix(fixer) {
            if (always)
              return fixer.insertTextAfter(lastToken, " ");
            return fixer.removeRange([lastToken.range[1], closeBrace.range[0]]);
          }
        });
      }
    }
    return {
      BlockStatement: checkSpacingInsideBraces,
      StaticBlock: checkSpacingInsideBraces,
      SwitchStatement: checkSpacingInsideBraces
    };
  }
});

const baseRule = /* @__PURE__ */ utils.castRuleModule(_baseRule);
var blockSpacing = utils.createRule({
  name: "block-spacing",
  package: "ts",
  meta: {
    type: "layout",
    docs: {
      description: "Disallow or enforce spaces inside of blocks after opening block and before closing block"
    },
    fixable: "whitespace",
    hasSuggestions: baseRule.meta.hasSuggestions,
    schema: baseRule.meta.schema,
    messages: baseRule.meta.messages
  },
  defaultOptions: ["always"],
  create(context, [whenToApplyOption]) {
    const sourceCode = context.sourceCode;
    const baseRules = baseRule.create(context);
    const always = whenToApplyOption !== "never";
    const messageId = always ? "missing" : "extra";
    function getOpenBrace(node) {
      return sourceCode.getFirstToken(node, {
        filter: (token) => token.type === utils$1.AST_TOKEN_TYPES.Punctuator && token.value === "{"
      });
    }
    function isValid(left, right) {
      return !astUtils.isTokenOnSameLine(left, right) || sourceCode.isSpaceBetween(left, right) === always;
    }
    function checkSpacingInsideBraces(node) {
      const openBrace = getOpenBrace(node);
      const closeBrace = sourceCode.getLastToken(node);
      const firstToken = sourceCode.getTokenAfter(openBrace, {
        includeComments: true
      });
      const lastToken = sourceCode.getTokenBefore(closeBrace, {
        includeComments: true
      });
      if (openBrace.type !== utils$1.AST_TOKEN_TYPES.Punctuator || openBrace.value !== "{" || closeBrace.type !== utils$1.AST_TOKEN_TYPES.Punctuator || closeBrace.value !== "}" || firstToken === closeBrace) {
        return;
      }
      if (!always && firstToken.type === utils$1.AST_TOKEN_TYPES.Line)
        return;
      if (!isValid(openBrace, firstToken)) {
        let loc = openBrace.loc;
        if (messageId === "extra") {
          loc = {
            start: openBrace.loc.end,
            end: firstToken.loc.start
          };
        }
        context.report({
          node,
          loc,
          messageId,
          data: {
            location: "after",
            token: openBrace.value
          },
          fix(fixer) {
            if (always)
              return fixer.insertTextBefore(firstToken, " ");
            return fixer.removeRange([openBrace.range[1], firstToken.range[0]]);
          }
        });
      }
      if (!isValid(lastToken, closeBrace)) {
        let loc = closeBrace.loc;
        if (messageId === "extra") {
          loc = {
            start: lastToken.loc.end,
            end: closeBrace.loc.start
          };
        }
        context.report({
          node,
          loc,
          messageId,
          data: {
            location: "before",
            token: closeBrace.value
          },
          fix(fixer) {
            if (always)
              return fixer.insertTextAfter(lastToken, " ");
            return fixer.removeRange([lastToken.range[1], closeBrace.range[0]]);
          }
        });
      }
    }
    return {
      ...baseRules,
      // This code worked "out of the box" for interface and type literal
      // Enums were very close to match as well, the only reason they are not is that was that enums don't have a body node in the parser
      // So the opening brace punctuator starts in the middle of the node - `getFirstToken` in
      // the base rule did not filter for the first opening brace punctuator
      TSInterfaceBody: baseRules.BlockStatement,
      TSTypeLiteral: baseRules.BlockStatement,
      TSEnumDeclaration: checkSpacingInsideBraces
    };
  }
});

module.exports = blockSpacing;
