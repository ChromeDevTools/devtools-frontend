// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Enforce use of LitHtml.LitTemplate type rather than union with LitHtml.nothing',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      useLitTemplateOverEmptyObject:
          'Prefer LitHtml.LitTemplate type over a union with {}',
      useLitTemplateOverTypeOfNothing:
          'Prefer LitHtml.LitTemplate type over a union with LitHtml.nothing',
    },
    schema: []  // no options
  },
  create: function(context) {
    const sourceCode = context.getSourceCode();
    const UNION_TYPE_FOR_LIT_TEMPLATE = 'LitHtml.LitTemplate';

    function checkUnionReturnTypeForLit(node) {
      // We want to go through the types in the union and match if:
      // 1. We find `LitHtml.TemplateResult` and `{}`
      // 2. We find `LitHtml.TemplateResult` and `LitHtml.nothing`.
      // Otherwise, this node is OK.

      let templateResultNode = null;
      let literalEmptyObjectNode = null;
      let litNothingNode = null;

      const nonLitRelatedNodesInUnion = new Set();

      for (const typeNode of node.types) {
        // This matches a type reference of X.y. Now we see if X === 'LitHtml' and y === 'TemplateResult'
        if (typeNode.type === 'TSTypeReference' && typeNode.typeName.type === 'TSQualifiedName') {
          const leftText = typeNode.typeName.left.name;
          const rightText = typeNode.typeName.right.name;
          if (leftText === 'LitHtml' && rightText === 'TemplateResult') {
            templateResultNode = typeNode;
            continue;
          }
        } else if (typeNode.type === 'TSTypeLiteral') {
          // The TSTypeLiteral type matches against the literal `{}` type.
          literalEmptyObjectNode = typeNode;
          continue;
        } else if (typeNode.type === 'TSTypeQuery' && typeNode.exprName.type === 'TSQualifiedName') {
          // matches `typeof X.y`
          const leftText = typeNode.exprName.left.name;
          const rightText = typeNode.exprName.right.name;
          if (leftText === 'LitHtml' && rightText === 'nothing') {
            litNothingNode = typeNode;
            continue;
          }
        }

        nonLitRelatedNodesInUnion.add(typeNode);
      }

      // We didn't find LitHtml.TemplateResult, so bail.
      if (!templateResultNode) {
        return;
      }

      if (!litNothingNode && !literalEmptyObjectNode) {
        // We found TemplateResult with no `typeof LitHtml.nothing` or `{}`, so
        // bail.
        return;
      }

      // If we found a union type of:
      // LitHtml.TemplateResult|{}|number
      // That needs to become:
      // LitHtml.LitTemplate|number
      // So we capture all the non-lit related types in the union, and get
      // their text content, so we can keep them around when we run the fixer.
      const nonLitRelatedTypesToKeep = Array.from(nonLitRelatedNodesInUnion, node => {
        return sourceCode.getText(node);
      });
      const newText = [UNION_TYPE_FOR_LIT_TEMPLATE, ...nonLitRelatedTypesToKeep].join('|');

      context.report({
        node,
        messageId: litNothingNode ? 'useLitTemplateOverTypeOfNothing' : 'useLitTemplateOverEmptyObject',
        fix(fixer) {
          return fixer.replaceText(node, newText);
        }
      });
    }

    function checkTSTypeAnnotationForPotentialIssue(node) {
      const annotation = node.typeAnnotation;
      if (!annotation) {
        return;
      }
      if (annotation.type === 'TSUnionType') {
        // matches foo(): X|Y
        checkUnionReturnTypeForLit(annotation);
      } else if (annotation.type === 'TSTypeReference') {
        // matches many things, including foo(): Promise<X|Y>, which we do want
        // to check.

        if (annotation.typeName.name !== 'Promise') {
          // If it's not a promise, bail out.
          return;
        }
        // Represents the generic type passed to the promise: if our code is
        // Promise<X>, this node represents the X.
        const promiseGenericNode = annotation.typeParameters.params[0];
        if (promiseGenericNode && promiseGenericNode.type === 'TSUnionType') {
          checkUnionReturnTypeForLit(promiseGenericNode);
        }
      }
    }

    function checkFunctionDeclarationOrExpressionForUnionType(node) {
      if (!node.returnType) {
        return;
      }

      if (node.returnType.type !== 'TSTypeAnnotation') {
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
  }
};
