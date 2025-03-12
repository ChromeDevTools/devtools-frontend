import { c as createRule } from '../utils.js';
import { AST_TOKEN_TYPES } from '@typescript-eslint/utils';
import { isCommaToken, isTokenOnSameLine, isClosingParenToken, isClosingBracketToken, isClosingBraceToken } from '@typescript-eslint/utils/ast-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var commaSpacing = createRule({
  name: "comma-spacing",
  package: "ts",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent spacing before and after commas"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "object",
        properties: {
          before: {
            type: "boolean",
            default: false
          },
          after: {
            type: "boolean",
            default: true
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      unexpected: `There should be no space {{loc}} ','.`,
      missing: `A space is required {{loc}} ','.`
    }
  },
  defaultOptions: [
    {
      before: false,
      after: true
    }
  ],
  create(context, [options = {}]) {
    const { before: spaceBefore, after: spaceAfter } = options;
    const sourceCode = context.sourceCode;
    const tokensAndComments = sourceCode.tokensAndComments;
    const ignoredTokens = /* @__PURE__ */ new Set();
    function addNullElementsToIgnoreList(node) {
      let previousToken = sourceCode.getFirstToken(node);
      for (const element of node.elements) {
        let token;
        if (element == null) {
          token = sourceCode.getTokenAfter(previousToken);
          if (token && isCommaToken(token))
            ignoredTokens.add(token);
        } else {
          token = sourceCode.getTokenAfter(element);
        }
        previousToken = token;
      }
    }
    function addTypeParametersTrailingCommaToIgnoreList(node) {
      const paramLength = node.params.length;
      if (paramLength) {
        const param = node.params[paramLength - 1];
        const afterToken = sourceCode.getTokenAfter(param);
        if (afterToken && isCommaToken(afterToken))
          ignoredTokens.add(afterToken);
      }
    }
    function validateCommaSpacing(commaToken, prevToken, nextToken) {
      if (prevToken && isTokenOnSameLine(prevToken, commaToken) && spaceBefore !== sourceCode.isSpaceBetween(prevToken, commaToken)) {
        context.report({
          node: commaToken,
          data: {
            loc: "before"
          },
          messageId: spaceBefore ? "missing" : "unexpected",
          fix: (fixer) => spaceBefore ? fixer.insertTextBefore(commaToken, " ") : fixer.replaceTextRange(
            [prevToken.range[1], commaToken.range[0]],
            ""
          )
        });
      }
      if (nextToken && isTokenOnSameLine(commaToken, nextToken) && !isClosingParenToken(nextToken) && !isClosingBracketToken(nextToken) && !isClosingBraceToken(nextToken) && !(!spaceAfter && nextToken.type === AST_TOKEN_TYPES.Line) && spaceAfter !== sourceCode.isSpaceBetween(commaToken, nextToken)) {
        context.report({
          node: commaToken,
          data: {
            loc: "after"
          },
          messageId: spaceAfter ? "missing" : "unexpected",
          fix: (fixer) => spaceAfter ? fixer.insertTextAfter(commaToken, " ") : fixer.replaceTextRange(
            [commaToken.range[1], nextToken.range[0]],
            ""
          )
        });
      }
    }
    return {
      "TSTypeParameterDeclaration": addTypeParametersTrailingCommaToIgnoreList,
      "ArrayExpression": addNullElementsToIgnoreList,
      "ArrayPattern": addNullElementsToIgnoreList,
      "Program:exit": function() {
        tokensAndComments.forEach((token, i) => {
          if (!isCommaToken(token))
            return;
          const prevToken = tokensAndComments[i - 1];
          const nextToken = tokensAndComments[i + 1];
          validateCommaSpacing(
            token,
            isCommaToken(prevToken) || ignoredTokens.has(token) ? null : prevToken,
            nextToken && isCommaToken(nextToken) || ignoredTokens.has(token) ? null : nextToken
          );
        });
      }
    };
  }
});

export { commaSpacing as default };
