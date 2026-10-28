// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file Rule to forbid typing a stateless UI.Widget view function's `output`
 * parameter as `object` / `{}` or passing an empty object literal `{}` as the
 * `output` argument to `this.#view(...)` / `DEFAULT_VIEW(...)`.
 */
import type {TSESTree} from '@typescript-eslint/utils';

import {
  isViewCallCallee,
  isViewFunction,
  isViewFunctionType,
} from './utils/lit.ts';
import {createRule} from './utils/ruleCreator.ts';

type MessageIds = 'noEmptyViewOutputType'|'noEmptyViewOutputArgument';
type RuleOptions = [];

function isEmptyOutputTypeNode(node: TSESTree.TypeNode, emptyViewOutputNames: ReadonlySet<string>): boolean {
  if (node.type === 'TSObjectKeyword') {
    return true;
  }
  if (node.type === 'TSTypeLiteral' && node.members.length === 0) {
    return true;
  }
  if (node.type === 'TSTypeReference' && node.typeName.type === 'Identifier') {
    if (emptyViewOutputNames.has(node.typeName.name)) {
      return true;
    }
    if (node.typeName.name === 'Record') {
      const typeArgs = node.typeArguments?.params;
      if (typeArgs?.length === 2 && typeArgs[1].type === 'TSNeverKeyword') {
        return true;
      }
    }
  }
  return false;
}

export default createRule<RuleOptions, MessageIds>({
  name: 'no-empty-view-output',
  meta: {
    type: 'problem',
    docs: {
      description:
          'Forbid typing a stateless UI.Widget view function\'s `output` parameter as `object` / `{}` or passing `{}` as the `output` argument to a view call; use `undefined` instead.',
      category: 'Possible Errors',
    },
    messages: {
      noEmptyViewOutputType:
          'Stateless view functions with no outputs must type their `output` parameter as `undefined` instead of an empty object type.',
      noEmptyViewOutputArgument:
          'Pass `undefined` instead of an empty object literal `{}` as the `output` argument to a view function.',
    },
    fixable: 'code',
    schema: [],
  },
  defaultOptions: [],
  create: function(context) {
    const emptyViewOutputNames = new Set<string>();
    const nonEmptyViewOutputNames = new Set<string>();
    const parserServices = context.sourceCode.parserServices;

    function isCalleeExpectingNonEmptyViewOutput(callee: TSESTree.Expression): boolean {
      if (parserServices?.program && parserServices.esTreeNodeToTSNodeMap) {
        const checker = parserServices.program.getTypeChecker();
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(callee);
        if (tsNode) {
          const calleeType = checker.getTypeAtLocation(tsNode);
          const signatures = calleeType.getCallSignatures();
          if (signatures.length > 0 && signatures[0].parameters.length >= 2) {
            const secondParamType = checker.getTypeOfSymbolAtLocation(signatures[0].parameters[1], tsNode);
            return secondParamType.getProperties().length > 0;
          }
        }
      }
      return nonEmptyViewOutputNames.size > 0;
    }

    function checkViewFunctionOutputParameter(
        node: TSESTree.TSFunctionType|TSESTree.ArrowFunctionExpression|TSESTree.FunctionDeclaration|
        TSESTree.FunctionExpression,
        ): void {
      if (!isViewFunctionType(node) && !isViewFunction(node)) {
        return;
      }
      const outputParam = node.params[1];
      if (outputParam.type !== 'Identifier') {
        return;
      }
      const outputType = outputParam.typeAnnotation?.typeAnnotation;
      if (!outputType || !isEmptyOutputTypeNode(outputType, emptyViewOutputNames)) {
        return;
      }
      context.report({
        node: outputType,
        messageId: 'noEmptyViewOutputType',
        fix(fixer) {
          return fixer.replaceText(outputType, 'undefined');
        },
      });
    }

    return {
      Program(programNode) {
        for (const stmt of programNode.body) {
          const decl = stmt.type === 'ExportNamedDeclaration' ? stmt.declaration : stmt;
          if (!decl) {
            continue;
          }
          if (decl.type === 'TSInterfaceDeclaration' && decl.id.name.endsWith('ViewOutput')) {
            if (decl.body.body.length === 0 && (!decl.extends || decl.extends.length === 0)) {
              emptyViewOutputNames.add(decl.id.name);
            } else {
              nonEmptyViewOutputNames.add(decl.id.name);
            }
          } else if (decl.type === 'TSTypeAliasDeclaration' && decl.id.name.endsWith('ViewOutput')) {
            if (isEmptyOutputTypeNode(decl.typeAnnotation, emptyViewOutputNames)) {
              emptyViewOutputNames.add(decl.id.name);
            } else if (decl.typeAnnotation.type !== 'TSUndefinedKeyword') {
              nonEmptyViewOutputNames.add(decl.id.name);
            }
          }
        }
      },
      TSFunctionType: checkViewFunctionOutputParameter,
      ArrowFunctionExpression: checkViewFunctionOutputParameter,
      FunctionDeclaration: checkViewFunctionOutputParameter,
      FunctionExpression: checkViewFunctionOutputParameter,
      CallExpression(node) {
        if (node.arguments.length !== 3 || !isViewCallCallee(node.callee)) {
          return;
        }
        const outputArg = node.arguments[1];
        if (outputArg.type !== 'ObjectExpression' || outputArg.properties.length !== 0) {
          return;
        }
        if (isCalleeExpectingNonEmptyViewOutput(node.callee)) {
          return;
        }
        context.report({
          node: outputArg,
          messageId: 'noEmptyViewOutputArgument',
          fix(fixer) {
            return fixer.replaceText(outputArg, 'undefined');
          },
        });
      },
    };
  },
});
