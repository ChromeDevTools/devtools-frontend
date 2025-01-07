'use strict';

var utils = require('../utils.js');
var utils$1 = require('@typescript-eslint/utils');
var astUtils = require('@typescript-eslint/utils/ast-utils');
require('eslint-visitor-keys');
require('espree');
require('estraverse');

var _baseRule = utils.createRule({
  name: "space-infix-ops",
  package: "js",
  meta: {
    type: "layout",
    docs: {
      description: "Require spacing around infix operators"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "object",
        properties: {
          int32Hint: {
            type: "boolean",
            default: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      missingSpace: "Operator '{{operator}}' must be spaced."
    }
  },
  create(context) {
    const int32Hint = context.options[0] ? context.options[0].int32Hint === true : false;
    const sourceCode = context.sourceCode;
    function getFirstNonSpacedToken(left, right, op) {
      const operator = sourceCode.getFirstTokenBetween(left, right, (token) => token.value === op);
      const prev = sourceCode.getTokenBefore(operator);
      const next = sourceCode.getTokenAfter(operator);
      if (!sourceCode.isSpaceBetweenTokens(prev, operator) || !sourceCode.isSpaceBetweenTokens(operator, next))
        return operator;
      return null;
    }
    function report(mainNode, culpritToken) {
      context.report({
        node: mainNode,
        loc: culpritToken.loc,
        messageId: "missingSpace",
        data: {
          operator: culpritToken.value
        },
        fix(fixer) {
          const previousToken = sourceCode.getTokenBefore(culpritToken);
          const afterToken = sourceCode.getTokenAfter(culpritToken);
          let fixString = "";
          if (culpritToken.range[0] - previousToken.range[1] === 0)
            fixString = " ";
          fixString += culpritToken.value;
          if (afterToken.range[0] - culpritToken.range[1] === 0)
            fixString += " ";
          return fixer.replaceText(culpritToken, fixString);
        }
      });
    }
    function checkBinary(node) {
      const leftNode = "typeAnnotation" in node.left && node.left.typeAnnotation ? node.left.typeAnnotation : node.left;
      const rightNode = node.right;
      const operator = "operator" in node && node.operator ? node.operator : "=";
      const nonSpacedNode = getFirstNonSpacedToken(leftNode, rightNode, operator);
      if (nonSpacedNode) {
        if (!(int32Hint && sourceCode.getText(node).endsWith("|0")))
          report(node, nonSpacedNode);
      }
    }
    function checkConditional(node) {
      const nonSpacedConsequentNode = getFirstNonSpacedToken(node.test, node.consequent, "?");
      const nonSpacedAlternateNode = getFirstNonSpacedToken(node.consequent, node.alternate, ":");
      if (nonSpacedConsequentNode)
        report(node, nonSpacedConsequentNode);
      if (nonSpacedAlternateNode)
        report(node, nonSpacedAlternateNode);
    }
    function checkVar(node) {
      const leftNode = node.id.typeAnnotation ? node.id.typeAnnotation : node.id;
      const rightNode = node.init;
      if (rightNode) {
        const nonSpacedNode = getFirstNonSpacedToken(leftNode, rightNode, "=");
        if (nonSpacedNode)
          report(node, nonSpacedNode);
      }
    }
    return {
      AssignmentExpression: checkBinary,
      AssignmentPattern: checkBinary,
      BinaryExpression: checkBinary,
      LogicalExpression: checkBinary,
      ConditionalExpression: checkConditional,
      VariableDeclarator: checkVar,
      // TODO: Stage 3: Overridden by ts version, can delete directly
      PropertyDefinition(node) {
        if (!node.value)
          return;
        const operatorToken = sourceCode.getTokenBefore(node.value, utils.isEqToken);
        const leftToken = sourceCode.getTokenBefore(operatorToken);
        const rightToken = sourceCode.getTokenAfter(operatorToken);
        if (!sourceCode.isSpaceBetweenTokens(leftToken, operatorToken) || !sourceCode.isSpaceBetweenTokens(operatorToken, rightToken)) {
          report(node, operatorToken);
        }
      }
    };
  }
});

const baseRule = /* @__PURE__ */ utils.castRuleModule(_baseRule);
const UNIONS = ["|", "&"];
var spaceInfixOps = utils.createRule({
  name: "space-infix-ops",
  package: "ts",
  meta: {
    type: "layout",
    docs: {
      description: "Require spacing around infix operators"
    },
    fixable: baseRule.meta.fixable,
    hasSuggestions: baseRule.meta.hasSuggestions,
    schema: baseRule.meta.schema,
    messages: baseRule.meta.messages
  },
  defaultOptions: [
    {
      int32Hint: false
    }
  ],
  create(context) {
    const rules = baseRule.create(context);
    const sourceCode = context.sourceCode;
    function report(node, operator) {
      context.report({
        node,
        loc: operator.loc,
        messageId: "missingSpace",
        data: {
          operator: operator.value
        },
        fix(fixer) {
          const previousToken = sourceCode.getTokenBefore(operator);
          const afterToken = sourceCode.getTokenAfter(operator);
          let fixString = "";
          if (operator.range[0] - previousToken.range[1] === 0)
            fixString = " ";
          fixString += operator.value;
          if (afterToken.range[0] - operator.range[1] === 0)
            fixString += " ";
          return fixer.replaceText(operator, fixString);
        }
      });
    }
    function isSpaceChar(token) {
      return token.type === utils$1.AST_TOKEN_TYPES.Punctuator && /^[=?:]$/.test(token.value);
    }
    function checkAndReportAssignmentSpace(node, leftNode, rightNode) {
      if (!rightNode || !leftNode)
        return;
      const operator = sourceCode.getFirstTokenBetween(
        leftNode,
        rightNode,
        isSpaceChar
      );
      const prev = sourceCode.getTokenBefore(operator);
      const next = sourceCode.getTokenAfter(operator);
      if (!sourceCode.isSpaceBetween(prev, operator) || !sourceCode.isSpaceBetween(operator, next)) {
        report(node, operator);
      }
    }
    function checkForEnumAssignmentSpace(node) {
      checkAndReportAssignmentSpace(node, node.id, node.initializer);
    }
    function checkForPropertyDefinitionAssignmentSpace(node) {
      const leftNode = node.optional && !node.typeAnnotation ? sourceCode.getTokenAfter(node.key) : node.typeAnnotation ?? node.key;
      checkAndReportAssignmentSpace(node, leftNode, node.value);
    }
    function checkForTypeAnnotationSpace(typeAnnotation) {
      const types = typeAnnotation.types;
      types.forEach((type) => {
        const skipFunctionParenthesis = type.type === utils$1.AST_NODE_TYPES.TSFunctionType ? astUtils.isNotOpeningParenToken : 0;
        const operator = sourceCode.getTokenBefore(
          type,
          skipFunctionParenthesis
        );
        if (operator != null && UNIONS.includes(operator.value)) {
          const prev = sourceCode.getTokenBefore(operator);
          const next = sourceCode.getTokenAfter(operator);
          if (!sourceCode.isSpaceBetween(prev, operator) || !sourceCode.isSpaceBetween(operator, next)) {
            report(typeAnnotation, operator);
          }
        }
      });
    }
    function checkForTypeAliasAssignment(node) {
      checkAndReportAssignmentSpace(
        node,
        node.typeParameters ?? node.id,
        node.typeAnnotation
      );
    }
    function checkForTypeConditional(node) {
      checkAndReportAssignmentSpace(node, node.extendsType, node.trueType);
      checkAndReportAssignmentSpace(node, node.trueType, node.falseType);
    }
    return {
      ...rules,
      TSEnumMember: checkForEnumAssignmentSpace,
      PropertyDefinition: checkForPropertyDefinitionAssignmentSpace,
      TSTypeAliasDeclaration: checkForTypeAliasAssignment,
      TSUnionType: checkForTypeAnnotationSpace,
      TSIntersectionType: checkForTypeAnnotationSpace,
      TSConditionalType: checkForTypeConditional
    };
  }
});

module.exports = spaceInfixOps;
