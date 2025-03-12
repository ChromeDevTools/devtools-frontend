import { c as createRule } from '../utils.js';
import { AST_TOKEN_TYPES } from '@typescript-eslint/utils';
import { isTokenOnSameLine } from '@typescript-eslint/utils/ast-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var blockSpacing = createRule({
  name: "block-spacing",
  package: "ts",
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
  defaultOptions: ["always"],
  create(context, [whenToApplyOption]) {
    const sourceCode = context.sourceCode;
    const always = whenToApplyOption !== "never";
    const messageId = always ? "missing" : "extra";
    function getOpenBrace(node) {
      return sourceCode.getFirstToken(node, {
        filter: (token) => token.type === AST_TOKEN_TYPES.Punctuator && token.value === "{"
      });
    }
    function isValid(left, right) {
      return !isTokenOnSameLine(left, right) || sourceCode.isSpaceBetween(left, right) === always;
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
      if (openBrace.type !== AST_TOKEN_TYPES.Punctuator || openBrace.value !== "{" || closeBrace.type !== AST_TOKEN_TYPES.Punctuator || closeBrace.value !== "}" || firstToken === closeBrace) {
        return;
      }
      if (!always && firstToken.type === AST_TOKEN_TYPES.Line)
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
      SwitchStatement: checkSpacingInsideBraces,
      // This code worked "out of the box" for interface and type literal
      // Enums were very close to match as well, the only reason they are not is that was that enums don't have a body node in the parser
      // So the opening brace punctuator starts in the middle of the node - `getFirstToken` in
      // the base rule did not filter for the first opening brace punctuator
      TSInterfaceBody: checkSpacingInsideBraces,
      TSTypeLiteral: checkSpacingInsideBraces,
      TSEnumDeclaration: checkSpacingInsideBraces
    };
  }
});

export { blockSpacing as default };
