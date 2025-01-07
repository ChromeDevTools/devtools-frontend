'use strict';

var utils = require('../utils.js');
var astUtils = require('@typescript-eslint/utils/ast-utils');
require('eslint-visitor-keys');
require('espree');
require('estraverse');

function createRules(options) {
  const globals = {
    ...options?.before !== void 0 ? { before: options.before } : {},
    ...options?.after !== void 0 ? { after: options.after } : {}
  };
  const override = options?.overrides ?? {};
  const colon = {
    ...{ before: false, after: true },
    ...globals,
    ...override?.colon
  };
  const arrow = {
    ...{ before: true, after: true },
    ...globals,
    ...override?.arrow
  };
  return {
    colon,
    arrow,
    variable: { ...colon, ...override?.variable },
    property: { ...colon, ...override?.property },
    parameter: { ...colon, ...override?.parameter },
    returnType: { ...colon, ...override?.returnType }
  };
}
function getIdentifierRules(rules, node) {
  const scope = node?.parent;
  if (astUtils.isVariableDeclarator(scope))
    return rules.variable;
  else if (astUtils.isFunctionOrFunctionType(scope))
    return rules.parameter;
  return rules.colon;
}
function getRules(rules, node) {
  const scope = node?.parent?.parent;
  if (astUtils.isTSFunctionType(scope) || astUtils.isTSConstructorType(scope))
    return rules.arrow;
  else if (astUtils.isIdentifier(scope))
    return getIdentifierRules(rules, scope);
  else if (astUtils.isClassOrTypeElement(scope))
    return rules.property;
  else if (astUtils.isFunction(scope))
    return rules.returnType;
  return rules.colon;
}
var typeAnnotationSpacing = utils.createRule({
  name: "type-annotation-spacing",
  package: "ts",
  meta: {
    type: "layout",
    docs: {
      description: "Require consistent spacing around type annotations"
    },
    fixable: "whitespace",
    messages: {
      expectedSpaceAfter: "Expected a space after the '{{type}}'.",
      expectedSpaceBefore: "Expected a space before the '{{type}}'.",
      unexpectedSpaceAfter: "Unexpected space after the '{{type}}'.",
      unexpectedSpaceBefore: "Unexpected space before the '{{type}}'.",
      unexpectedSpaceBetween: "Unexpected space between the '{{previousToken}}' and the '{{type}}'."
    },
    schema: [
      {
        $defs: {
          spacingConfig: {
            type: "object",
            properties: {
              before: { type: "boolean" },
              after: { type: "boolean" }
            },
            additionalProperties: false
          }
        },
        type: "object",
        properties: {
          before: { type: "boolean" },
          after: { type: "boolean" },
          overrides: {
            type: "object",
            properties: {
              colon: { $ref: "#/items/0/$defs/spacingConfig" },
              arrow: { $ref: "#/items/0/$defs/spacingConfig" },
              variable: { $ref: "#/items/0/$defs/spacingConfig" },
              parameter: { $ref: "#/items/0/$defs/spacingConfig" },
              property: { $ref: "#/items/0/$defs/spacingConfig" },
              returnType: { $ref: "#/items/0/$defs/spacingConfig" }
            },
            additionalProperties: false
          }
        },
        additionalProperties: false
      }
    ]
  },
  defaultOptions: [
    // technically there is a default, but the overrides mean
    // that if we apply them here, it will break the no override case.
    {}
  ],
  create(context, [options]) {
    const punctuators = [":", "=>"];
    const sourceCode = context.sourceCode;
    const ruleSet = createRules(options);
    function checkTypeAnnotationSpacing(typeAnnotation) {
      const nextNode = typeAnnotation;
      const punctuatorTokenEnd = sourceCode.getTokenBefore(nextNode);
      let punctuatorTokenStart = punctuatorTokenEnd;
      let previousToken = sourceCode.getTokenBefore(punctuatorTokenEnd);
      let type = punctuatorTokenEnd.value;
      if (!punctuators.includes(type))
        return;
      const { before, after } = getRules(ruleSet, typeAnnotation);
      if (type === ":" && previousToken.value === "?") {
        if (sourceCode.isSpaceBetween(previousToken, punctuatorTokenStart)) {
          context.report({
            node: punctuatorTokenStart,
            messageId: "unexpectedSpaceBetween",
            data: {
              type,
              previousToken: previousToken.value
            },
            fix(fixer) {
              return fixer.removeRange([
                previousToken.range[1],
                punctuatorTokenStart.range[0]
              ]);
            }
          });
        }
        type = "?:";
        punctuatorTokenStart = previousToken;
        previousToken = sourceCode.getTokenBefore(previousToken);
        if (previousToken.value === "+" || previousToken.value === "-") {
          type = `${previousToken.value}?:`;
          punctuatorTokenStart = previousToken;
          previousToken = sourceCode.getTokenBefore(previousToken);
        }
      }
      const previousDelta = punctuatorTokenStart.range[0] - previousToken.range[1];
      const nextDelta = nextNode.range[0] - punctuatorTokenEnd.range[1];
      if (after && nextDelta === 0) {
        context.report({
          node: punctuatorTokenEnd,
          messageId: "expectedSpaceAfter",
          data: {
            type
          },
          fix(fixer) {
            return fixer.insertTextAfter(punctuatorTokenEnd, " ");
          }
        });
      } else if (!after && nextDelta > 0) {
        context.report({
          node: punctuatorTokenEnd,
          messageId: "unexpectedSpaceAfter",
          data: {
            type
          },
          fix(fixer) {
            return fixer.removeRange([
              punctuatorTokenEnd.range[1],
              nextNode.range[0]
            ]);
          }
        });
      }
      if (before && previousDelta === 0) {
        context.report({
          node: punctuatorTokenStart,
          messageId: "expectedSpaceBefore",
          data: {
            type
          },
          fix(fixer) {
            return fixer.insertTextAfter(previousToken, " ");
          }
        });
      } else if (!before && previousDelta > 0) {
        context.report({
          node: punctuatorTokenStart,
          messageId: "unexpectedSpaceBefore",
          data: {
            type
          },
          fix(fixer) {
            return fixer.removeRange([
              previousToken.range[1],
              punctuatorTokenStart.range[0]
            ]);
          }
        });
      }
    }
    return {
      TSMappedType(node) {
        if (node.typeAnnotation)
          checkTypeAnnotationSpacing(node.typeAnnotation);
      },
      TSTypeAnnotation(node) {
        checkTypeAnnotationSpacing(node.typeAnnotation);
      }
    };
  }
});

module.exports = typeAnnotationSpacing;
