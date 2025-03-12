import { c as createRule, l as isNotCommaToken, i as isTokenOnSameLine, o as isClosingBracketToken, x as isClosingBraceToken, h as castRuleModule } from '../utils.js';
import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/utils';
import { isTokenOnSameLine as isTokenOnSameLine$1, isClosingBracketToken as isClosingBracketToken$1, isClosingBraceToken as isClosingBraceToken$1 } from '@typescript-eslint/utils/ast-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var _baseRule = createRule(
  {
    name: "object-curly-spacing",
    package: "js",
    meta: {
      type: "layout",
      docs: {
        description: "Enforce consistent spacing inside braces"
      },
      fixable: "whitespace",
      schema: [
        {
          type: "string",
          enum: ["always", "never"]
        },
        {
          type: "object",
          properties: {
            arraysInObjects: {
              type: "boolean"
            },
            objectsInObjects: {
              type: "boolean"
            }
          },
          additionalProperties: false
        }
      ],
      messages: {
        requireSpaceBefore: "A space is required before '{{token}}'.",
        requireSpaceAfter: "A space is required after '{{token}}'.",
        unexpectedSpaceBefore: "There should be no space before '{{token}}'.",
        unexpectedSpaceAfter: "There should be no space after '{{token}}'."
      }
    },
    create(context) {
      const spaced = context.options[0] === "always";
      const sourceCode = context.sourceCode;
      function isOptionSet(option) {
        return context.options[1] ? context.options[1][option] === !spaced : false;
      }
      const options = {
        spaced,
        arraysInObjectsException: isOptionSet("arraysInObjects"),
        objectsInObjectsException: isOptionSet("objectsInObjects")
      };
      function reportNoBeginningSpace(node, token) {
        const nextToken = context.sourceCode.getTokenAfter(token, { includeComments: true });
        context.report({
          node,
          loc: { start: token.loc.end, end: nextToken.loc.start },
          messageId: "unexpectedSpaceAfter",
          data: {
            token: token.value
          },
          fix(fixer) {
            return fixer.removeRange([token.range[1], nextToken.range[0]]);
          }
        });
      }
      function reportNoEndingSpace(node, token) {
        const previousToken = context.sourceCode.getTokenBefore(token, { includeComments: true });
        context.report({
          node,
          loc: { start: previousToken.loc.end, end: token.loc.start },
          messageId: "unexpectedSpaceBefore",
          data: {
            token: token.value
          },
          fix(fixer) {
            return fixer.removeRange([previousToken.range[1], token.range[0]]);
          }
        });
      }
      function reportRequiredBeginningSpace(node, token) {
        context.report({
          node,
          loc: token.loc,
          messageId: "requireSpaceAfter",
          data: {
            token: token.value
          },
          fix(fixer) {
            return fixer.insertTextAfter(token, " ");
          }
        });
      }
      function reportRequiredEndingSpace(node, token) {
        context.report({
          node,
          loc: token.loc,
          messageId: "requireSpaceBefore",
          data: {
            token: token.value
          },
          fix(fixer) {
            return fixer.insertTextBefore(token, " ");
          }
        });
      }
      function validateBraceSpacing(node, first, second, penultimate, last) {
        if (isTokenOnSameLine(first, second)) {
          const firstSpaced = sourceCode.isSpaceBetween(first, second);
          if (options.spaced && !firstSpaced)
            reportRequiredBeginningSpace(node, first);
          if (!options.spaced && firstSpaced && second.type !== "Line")
            reportNoBeginningSpace(node, first);
        }
        if (isTokenOnSameLine(penultimate, last)) {
          const shouldCheckPenultimate = options.arraysInObjectsException && isClosingBracketToken(penultimate) || options.objectsInObjectsException && isClosingBraceToken(penultimate);
          const penultimateType = shouldCheckPenultimate && sourceCode.getNodeByRangeIndex(penultimate.range[0]).type;
          const closingCurlyBraceMustBeSpaced = options.arraysInObjectsException && penultimateType === "ArrayExpression" || options.objectsInObjectsException && (penultimateType === "ObjectExpression" || penultimateType === "ObjectPattern") ? !options.spaced : options.spaced;
          const lastSpaced = sourceCode.isSpaceBetween(penultimate, last);
          if (closingCurlyBraceMustBeSpaced && !lastSpaced)
            reportRequiredEndingSpace(node, last);
          if (!closingCurlyBraceMustBeSpaced && lastSpaced)
            reportNoEndingSpace(node, last);
        }
      }
      function getClosingBraceOfObject(node) {
        const lastProperty = node.properties[node.properties.length - 1];
        return sourceCode.getTokenAfter(lastProperty, isClosingBraceToken);
      }
      function checkForObject(node) {
        if (node.properties.length === 0)
          return;
        const first = sourceCode.getFirstToken(node);
        const last = getClosingBraceOfObject(node);
        const second = sourceCode.getTokenAfter(first, { includeComments: true });
        const penultimate = sourceCode.getTokenBefore(last, { includeComments: true });
        validateBraceSpacing(node, first, second, penultimate, last);
      }
      function checkForImport(node) {
        if (node.specifiers.length === 0)
          return;
        let firstSpecifier = node.specifiers[0];
        const lastSpecifier = node.specifiers[node.specifiers.length - 1];
        if (lastSpecifier.type !== "ImportSpecifier")
          return;
        if (firstSpecifier.type !== "ImportSpecifier")
          firstSpecifier = node.specifiers[1];
        const first = sourceCode.getTokenBefore(firstSpecifier);
        const last = sourceCode.getTokenAfter(lastSpecifier, isNotCommaToken);
        const second = sourceCode.getTokenAfter(first, { includeComments: true });
        const penultimate = sourceCode.getTokenBefore(last, { includeComments: true });
        validateBraceSpacing(node, first, second, penultimate, last);
      }
      function checkForExport(node) {
        if (node.specifiers.length === 0)
          return;
        const firstSpecifier = node.specifiers[0];
        const lastSpecifier = node.specifiers[node.specifiers.length - 1];
        const first = sourceCode.getTokenBefore(firstSpecifier);
        const last = sourceCode.getTokenAfter(lastSpecifier, isNotCommaToken);
        const second = sourceCode.getTokenAfter(first, { includeComments: true });
        const penultimate = sourceCode.getTokenBefore(last, { includeComments: true });
        validateBraceSpacing(node, first, second, penultimate, last);
      }
      return {
        // var {x} = y;
        ObjectPattern: checkForObject,
        // var y = {x: 'y'}
        ObjectExpression: checkForObject,
        // import {y} from 'x';
        ImportDeclaration: checkForImport,
        // export {name} from 'yo';
        ExportNamedDeclaration: checkForExport
      };
    }
  }
);

const baseRule = /* @__PURE__ */ castRuleModule(_baseRule);
var objectCurlySpacing = createRule({
  name: "object-curly-spacing",
  package: "ts",
  meta: {
    ...baseRule.meta,
    docs: {
      description: "Enforce consistent spacing inside braces"
    }
  },
  defaultOptions: ["never"],
  create(context) {
    const [firstOption, secondOption] = context.options;
    const spaced = firstOption === "always";
    const sourceCode = context.sourceCode || context.getSourceCode();
    function isOptionSet(option) {
      return secondOption ? secondOption[option] === !spaced : false;
    }
    const options = {
      spaced,
      arraysInObjectsException: isOptionSet("arraysInObjects"),
      objectsInObjectsException: isOptionSet("objectsInObjects")
    };
    function reportNoBeginningSpace(node, token) {
      const nextToken = sourceCode.getTokenAfter(token, { includeComments: true });
      context.report({
        node,
        loc: { start: token.loc.end, end: nextToken.loc.start },
        messageId: "unexpectedSpaceAfter",
        data: {
          token: token.value
        },
        fix(fixer) {
          return fixer.removeRange([token.range[1], nextToken.range[0]]);
        }
      });
    }
    function reportNoEndingSpace(node, token) {
      const previousToken = sourceCode.getTokenBefore(token, { includeComments: true });
      context.report({
        node,
        loc: { start: previousToken.loc.end, end: token.loc.start },
        messageId: "unexpectedSpaceBefore",
        data: {
          token: token.value
        },
        fix(fixer) {
          return fixer.removeRange([previousToken.range[1], token.range[0]]);
        }
      });
    }
    function reportRequiredBeginningSpace(node, token) {
      context.report({
        node,
        loc: token.loc,
        messageId: "requireSpaceAfter",
        data: {
          token: token.value
        },
        fix(fixer) {
          return fixer.insertTextAfter(token, " ");
        }
      });
    }
    function reportRequiredEndingSpace(node, token) {
      context.report({
        node,
        loc: token.loc,
        messageId: "requireSpaceBefore",
        data: {
          token: token.value
        },
        fix(fixer) {
          return fixer.insertTextBefore(token, " ");
        }
      });
    }
    function validateBraceSpacing(node, first, second, penultimate, last) {
      if (isTokenOnSameLine$1(first, second)) {
        const firstSpaced = sourceCode.isSpaceBetween(first, second);
        const secondType = sourceCode.getNodeByRangeIndex(
          second.range[0]
        ).type;
        const openingCurlyBraceMustBeSpaced = options.arraysInObjectsException && [
          AST_NODE_TYPES.TSMappedType,
          AST_NODE_TYPES.TSIndexSignature
        ].includes(secondType) ? !options.spaced : options.spaced;
        if (openingCurlyBraceMustBeSpaced && !firstSpaced)
          reportRequiredBeginningSpace(node, first);
        if (!openingCurlyBraceMustBeSpaced && firstSpaced && second.type !== AST_TOKEN_TYPES.Line) {
          reportNoBeginningSpace(node, first);
        }
      }
      if (isTokenOnSameLine$1(penultimate, last)) {
        const shouldCheckPenultimate = options.arraysInObjectsException && isClosingBracketToken$1(penultimate) || options.objectsInObjectsException && isClosingBraceToken$1(penultimate);
        const penultimateType = shouldCheckPenultimate ? sourceCode.getNodeByRangeIndex(penultimate.range[0]).type : void 0;
        const closingCurlyBraceMustBeSpaced = options.arraysInObjectsException && penultimateType === AST_NODE_TYPES.TSTupleType || options.objectsInObjectsException && penultimateType !== void 0 && [
          AST_NODE_TYPES.TSMappedType,
          AST_NODE_TYPES.TSTypeLiteral
        ].includes(penultimateType) ? !options.spaced : options.spaced;
        const lastSpaced = sourceCode.isSpaceBetween(penultimate, last);
        if (closingCurlyBraceMustBeSpaced && !lastSpaced)
          reportRequiredEndingSpace(node, last);
        if (!closingCurlyBraceMustBeSpaced && lastSpaced)
          reportNoEndingSpace(node, last);
      }
    }
    function getClosingBraceOfObject(node) {
      const lastProperty = node.members[node.members.length - 1];
      return sourceCode.getTokenAfter(lastProperty, isClosingBraceToken$1);
    }
    const rules = baseRule.create(context);
    return {
      ...rules,
      TSMappedType(node) {
        const first = sourceCode.getFirstToken(node);
        const last = sourceCode.getLastToken(node);
        const second = sourceCode.getTokenAfter(first, {
          includeComments: true
        });
        const penultimate = sourceCode.getTokenBefore(last, {
          includeComments: true
        });
        validateBraceSpacing(node, first, second, penultimate, last);
      },
      TSTypeLiteral(node) {
        if (node.members.length === 0)
          return;
        const first = sourceCode.getFirstToken(node);
        const last = getClosingBraceOfObject(node);
        const second = sourceCode.getTokenAfter(first, {
          includeComments: true
        });
        const penultimate = sourceCode.getTokenBefore(last, {
          includeComments: true
        });
        validateBraceSpacing(node, first, second, penultimate, last);
      }
    };
  }
});

export { objectCurlySpacing as default };
