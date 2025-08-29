// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Rule to enforce that operations on Trace.Types.Timing numeric values are type-safe.
 * @author Connor Clark
 */

// Flags code such as:
//
//     const a = 0 as Micro;
//     const b = 0 as Micro;
//     const c = (b - a) as Milli; // Wrong! Should have been Micro, or
//                                 // should have converted the units.
//
// ... which is a common pattern in our codebase.
//
// Also validates types within function calls for Math.min/max and Array.prototype.reduce.
//
// The reason this is a rule rather than a helper function `Timing.addMicros` (or
// w/e) is to avoid the runtime costs. These low-level utility types are used in hot
// code spots and so we should avoid overhead for checks that can be done statically.
//
// Wondering why we can't use TypeScript to help here? See the open FR for unit
// types: https://github.com/microsoft/TypeScript/issues/364

import type {TSESTree} from '@typescript-eslint/typescript-estree';
import {ESLintUtils} from '@typescript-eslint/utils';
import type {Type} from 'typescript';

import {createRule} from './utils/ruleCreator.ts';

function isTimingType(typeName: string|null): typeName is string {
  return ['Micro', 'Milli', 'Seconds'].includes(typeName ?? '');
}

function getNameFromType(type: Type): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return type.symbol?.getName() ?? type?.aliasSymbol?.getName() ?? (type as any).intrinsicName;
}

export default createRule({
  name: 'validate-timing-types',

  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that operations on Trace.Types.Timing numeric values are type-safe.',
      category: 'Possible Errors',
    },
    messages: {
      genericMessage: '{{message}}',
    },
    schema: [],
  },
  defaultOptions: [],
  create: function(context) {
    // This might speed things up a bit.
    const rawSourceCode = context.sourceCode.getText();
    if (!rawSourceCode.match(/Timing|Micro|Milli|Seconds/i)) {
      return {};
    }

    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();

    function getTypeName(node: TSESTree.Node): string|null {
      if (node.type === 'BinaryExpression') {
        const left = getTypeName(node.left);
        const right = getTypeName(node.right);
        return left === right ? left : null;
      }

      const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node));
      if (type.isLiteral()) {
        return null;
      }

      let name = getNameFromType(type);

      // For unions, just find one timing type. If multiple exit then ignore this node.
      if (!name && type.isUnionOrIntersection()) {
        const timingTypes = type.types.filter(type => isTimingType(getNameFromType(type)));
        if (timingTypes.length !== 1) {
          return null;
        }

        name = getNameFromType(timingTypes[0]);
      }

      if (!name) {
        // Maybe it's a complicated indexed type. Or some other ungodly type
        // expression. In any case, we don't need to handle super complex types.
        return null;
      }

      return name;
    }

    function validateBinaryExpression(node: TSESTree.BinaryExpression, expectedResultType: string|null = null) {
      const leftType = getTypeName(node.left);
      const rightType = getTypeName(node.right);
      if (leftType === null || rightType === null) {
        return;
      }

      if (expectedResultType && (leftType !== rightType || leftType !== expectedResultType)) {
        if (node.left.type === 'BinaryExpression' || node.right.type === 'BinaryExpression') {
          const other = leftType === expectedResultType ? rightType : leftType;
          context.report({
            node,
            messageId: 'genericMessage',
            data: {message: `Expected: ${expectedResultType}, but got: ${other}`},
          });
        } else {
          const op = node.operator;
          context.report({
            node,
            messageId: 'genericMessage',
            data: {
              message: `Expected: (${expectedResultType} ${op} ${expectedResultType}) -> ${
                  expectedResultType}, but got: (${leftType} ${op} ${rightType}) -> ${expectedResultType}`
            },
          });
        }
      } else if (leftType !== rightType) {
        const op = node.operator;
        context.report({
          node,
          messageId: 'genericMessage',
          data: {message: `Type mismatch: (${leftType} ${op} ${rightType})`},
        });
      }
    }

    /**
     * Checks the type of `Array.prototype.reduce` accumulator function explicitly matches its initial value.
     * Only supports inline arrow functions.
     */
    function validateReduceCall(node: TSESTree.CallExpression, expectedResultType: string) {
      if (node.callee.type !== 'MemberExpression') {
        return;
      }

      if (node.callee.computed) {
        return;
      }

      if (node.callee.property.name !== 'reduce') {
        return;
      }

      if (node.arguments[0].type !== 'ArrowFunctionExpression') {
        return;
      }

      let inferredType;
      let returnExpression;
      if (node.arguments[0].type === 'ArrowFunctionExpression') {
        const returnExpressions: TSESTree.Expression[] = [];
        if (node.arguments[0].body.type === 'BlockStatement') {
          // It would be better to walk this node and find all ReturnBinaryExpression
          // nodes - but not sure how to do that without recreating the visitor
          // pattern for all statement node types.
          // So for now, this is not digging into IfStatements, etc.
          for (const statement of node.arguments[0].body.body) {
            if (statement.type === 'ReturnStatement' && statement.argument?.type === 'BinaryExpression') {
              returnExpressions.push(statement.argument);
            }
          }
        } else {
          returnExpressions.push(node.arguments[0].body);
        }

        for (const expr of returnExpressions) {
          if (expr.type !== 'BinaryExpression') {
            continue;
          }

          const leftType = getTypeName(expr.left);
          const rightType = getTypeName(expr.right);

          if (isTimingType(leftType)) {
            returnExpression = expr.left;
            inferredType = leftType;
            break;
          }

          if (isTimingType(rightType)) {
            returnExpression = expr.right;
            inferredType = rightType;
            break;
          }
        }
      }

      if (!returnExpression) {
        return;
      }

      if (inferredType !== expectedResultType) {
        context.report({
          node,
          messageId: 'genericMessage',
          data: {message: `Type mismatch: expected ${expectedResultType}, got ${inferredType} from reduce function`},
        });
      }
    }

    /**
     * Checks the type of `Math.min/max` parameters explicitly matches the expected
     * result type.
     */
    function validateMinMaxCall(node: TSESTree.CallExpression, expectedResultType: string|null) {
      if (node.callee.type !== 'MemberExpression') {
        return;
      }

      if (node.callee.computed) {
        return;
      }

      if (node.callee.object.type !== 'Identifier') {
        return;
      }

      if (node.callee.object.name !== 'Math') {
        return;
      }

      const fnName = node.callee.property.name;
      if (fnName !== 'min' && fnName !== 'max') {
        return;
      }

      const inferredTimingTypes = node.arguments.map(getTypeName).filter(isTimingType);
      if (!inferredTimingTypes.length) {
        return;
      }

      // Check the expected type.
      if (expectedResultType) {
        if (inferredTimingTypes[0] !== expectedResultType) {
          context.report({
            node,
            messageId: 'genericMessage',
            data: {
              message: `Type mismatch: expected ${expectedResultType}, got ${inferredTimingTypes[0]} from Math.${
                  fnName} function`
            },
          });
        }

        return;
      }

      // Check that the timings types all agree with each other.
      if (new Set(inferredTimingTypes).size !== 1) {
        context.report({
          node,
          messageId: 'genericMessage',
          data: {
            message: `Type mismatch: the parameters of Math.${fnName} do not all match in type. Got: ${
                inferredTimingTypes.join(', ')}`
          },
        });
      }
    }

    function validateTimingResult(node: TSESTree.Node, expectedResultType: string) {
      if (node.type === 'BinaryExpression') {
        // Tagged numeric types, like our Timing types, dissolve to number after a
        // binary operation. Let's dig into the binary expression to find what types
        // were used, and then assert against the expected result type (as given by a
        // variable declaration or `as` type cast).
        validateBinaryExpression(node, expectedResultType);
      } else if (node.type === 'CallExpression') {
        // Similar, but in this case the reduce function return type may be inferred
        // to be a number. Look for return statements of a binary expression using
        // our Timing types, and assert their type matches the expected result type.
        validateReduceCall(node, expectedResultType);

        // Validate the arguments of Math.min/max calls match the expected result
        // type.
        validateMinMaxCall(node, expectedResultType);
      }
    }

    return {
      TSAsExpression(node) {
        const expectedResultType = getTypeName(node.typeAnnotation);
        if (expectedResultType && isTimingType(expectedResultType)) {
          validateTimingResult(node.expression, expectedResultType);
        }
      },
      VariableDeclarator(node) {
        if (!node.init) {
          return;
        }

        const expectedResultType = getTypeName(node);
        if (expectedResultType && isTimingType(expectedResultType)) {
          validateTimingResult(node.init, expectedResultType);
        }
      },
      AssignmentExpression(node) {
        const expectedResultType = getTypeName(node.left);
        if (isTimingType(expectedResultType)) {
          validateTimingResult(node.right, expectedResultType);
        }
      },
      BinaryExpression(node) {
        const leftType = getTypeName(node.left);
        const rightType = getTypeName(node.right);

        if (!leftType || !rightType) {
          return;
        }

        if (isTimingType(leftType) && isTimingType(rightType)) {
          validateBinaryExpression(node);
        }
      },
      CallExpression(node) {
        validateMinMaxCall(node, null);
      }
    };
  },
});
