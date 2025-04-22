// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

export default createRule({
  name: 'lit-template-result-or-nothing',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce use of Lit.LitTemplate type rather than union with Lit.nothing or {}',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      useLitTemplateOverEmptyObject: 'Prefer Lit.LitTemplate type over a union with {}',
      useLitTemplateOverTypeOfNothing: 'Prefer Lit.LitTemplate type over a union with typeof Lit.nothing',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    const sourceCode = context.sourceCode;
    const UNION_TYPE_FOR_LIT_TEMPLATE = 'Lit.LitTemplate';

    function checkUnionReturnTypeForLit(node: TSESTree.TSUnionType): void {
      // We want to go through the types in the union and match if:
      // 1. We find `Lit.TemplateResult` and `{}`
      // 2. We find `Lit.TemplateResult` and `typeof Lit.nothing`.
      // Otherwise, this node is OK.

      let templateResultNode: TSESTree.TSTypeReference|null = null;
      let literalEmptyObjectNode: TSESTree.TSTypeLiteral|null = null;
      let litNothingNode: TSESTree.TSTypeQuery|null = null;

      const nonLitRelatedNodesInUnion = new Set<TSESTree.TypeNode>();

      for (const typeNode of node.types) {
        // This matches a type reference of X.y. Now we see if X === 'Lit' and y === 'TemplateResult'
        if (typeNode.type === 'TSTypeReference' && typeNode.typeName.type === 'TSQualifiedName' &&
            typeNode.typeName.left.type === 'Identifier') {
          const leftText = typeNode.typeName.left.name;
          const rightText = typeNode.typeName.right.name;
          if (leftText === 'Lit' && rightText === 'TemplateResult') {
            templateResultNode = typeNode;
            continue;
          }
        } else if (typeNode.type === 'TSTypeLiteral') {
          // The TSTypeLiteral type matches against the literal `{}` type.
          literalEmptyObjectNode = typeNode;
          continue;
        } else if (
            typeNode.type === 'TSTypeQuery' && typeNode.exprName.type === 'TSQualifiedName' &&
            typeNode.exprName.left.type === 'Identifier') {
          // matches `typeof X.y`
          const leftText = typeNode.exprName.left.name;
          const rightText = typeNode.exprName.right.name;
          if (leftText === 'Lit' && rightText === 'nothing') {
            litNothingNode = typeNode;
            continue;
          }
        }

        nonLitRelatedNodesInUnion.add(typeNode);
      }

      // We didn't find Lit.TemplateResult, so bail.
      if (!templateResultNode) {
        return;
      }

      if (!litNothingNode && !literalEmptyObjectNode) {
        // We found TemplateResult with no `typeof Lit.nothing` or `{}`, so
        // bail.
        return;
      }

      // If we found a union type of:
      // Lit.TemplateResult|{}|number
      // That needs to become:
      // Lit.LitTemplate|number
      // So we capture all the non-lit related types in the union, and get
      // their text content, so we can keep them around when we run the fixer.
      const nonLitRelatedTypesToKeep = Array.from(
          nonLitRelatedNodesInUnion,
          node => {
            return sourceCode.getText(node);
          },
      );
      const newText = [
        UNION_TYPE_FOR_LIT_TEMPLATE,
        ...nonLitRelatedTypesToKeep,
      ].join('|');

      context.report({
        node,
        messageId: litNothingNode ? 'useLitTemplateOverTypeOfNothing' : 'useLitTemplateOverEmptyObject',
        fix(fixer) {
          return fixer.replaceText(node, newText);
        },
      });
    }

    function checkTSTypeAnnotationForPotentialIssue(node: TSESTree.TSTypeAnnotation): void {
      const annotation = node.typeAnnotation;

      if (annotation.type === 'TSUnionType') {
        // matches foo(): X|Y
        checkUnionReturnTypeForLit(annotation);
      } else if (annotation.type === 'TSTypeReference') {
        // matches many things, including foo(): Promise<X|Y>, which we do want
        // to check.

        if (annotation.typeName.type !== 'Identifier' || annotation.typeName.name !== 'Promise') {
          // If it's not a promise, bail out.
          return;
        }

        // Represents the generic type passed to the promise: if our code is
        // Promise<X>, this node represents the X.
        const promiseGenericNode = annotation.typeArguments?.params[0];
        if (promiseGenericNode && promiseGenericNode.type === 'TSUnionType') {
          checkUnionReturnTypeForLit(promiseGenericNode);
        }
      }
    }

    function checkFunctionDeclarationOrExpressionForUnionType(
        node: TSESTree.FunctionDeclaration|TSESTree.FunctionExpression|TSESTree.ArrowFunctionExpression): void {
      if (!node.returnType) {
        return;
      }

      checkTSTypeAnnotationForPotentialIssue(node.returnType);
    }

    return {
      // function() {}
      FunctionDeclaration(node) {
        checkFunctionDeclarationOrExpressionForUnionType(node);
      },
      // Match functions defined inside classes
      FunctionExpression(node) {
        checkFunctionDeclarationOrExpressionForUnionType(node);
      },
      // Match values in interfaces or types.
      TSPropertySignature(node) {
        if (!node.typeAnnotation) {
          return;
        }
        checkTSTypeAnnotationForPotentialIssue(node.typeAnnotation);
      },
    };
  },
});
