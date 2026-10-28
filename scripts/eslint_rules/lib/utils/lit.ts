// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

/**
 * @param node a TaggedTemplateExpression node from the AST of the parsed code.
 * @returns - `true` if the code matches Lit.html`` or html``, and false otherwise.
 */
export function isLitHtmlTemplateCall(node: TSESTree.Node): node is TSESTree.TaggedTemplateExpression {
  if (node.type !== 'TaggedTemplateExpression') {
    return false;
  }

  // Match Lit.html``
  const {tag} = node;
  if (!tag) {
    return false;
  }
  // Match Lit.html``
  if (tag.type === 'MemberExpression' && tag.object.type === 'Identifier' && tag.property.type === 'Identifier') {
    return tag.object.name === 'Lit' && tag.property.name === 'html';
  }

  // Match html`` (and guess that it's Lit)
  if (tag.type === 'Identifier') {
    return tag.type === 'Identifier' && tag.name === 'html';
  }

  return false;
}

/**
 * @param node a CallExpression node from the AST of the parsed code.
 * @returns - `true` if the code matches Lit.render() or render(), and false otherwise.
 */
export function isLitHtmlRenderCall(node: TSESTree.Node): node is TSESTree.CallExpression {
  if (node.type !== 'CallExpression') {
    return false;
  }

  const {callee} = node;
  if (callee.type === 'Identifier' && callee.name === 'render') {
    return true;
  }
  if (callee.type !== 'MemberExpression' || callee.object.type !== 'Identifier' ||
      callee.property.type !== 'Identifier') {
    return false;
  }

  return callee.object.name === 'Lit' && callee.property.name === 'render';
}

/**
 * Determines if a parameter list matches the 3-parameter "view function"
 * convention (`input`, `output`, `target`/`element`/`container`).
 */
export function hasViewFunctionParameterNames(params: TSESTree.Parameter[]): params is[TSESTree.Identifier,
                                                                                       TSESTree.Identifier,
                                                                                       TSESTree.Identifier,
] {
  if (params.length !== 3 || !params.every((p): p is TSESTree.Identifier => p.type === 'Identifier')) {
    return false;
  }
  const first = params[0].name.toLowerCase();
  const second = params[1].name.toLowerCase();
  const third = params[2].name.toLowerCase();
  return first.endsWith('input') && second.endsWith('output') &&
      (third.endsWith('target') || third.endsWith('element') || third.endsWith('container'));
}

export function isVoidOrPromiseVoidReturn(returnType: TSESTree.TSTypeAnnotation|undefined): boolean {
  if (!returnType) {
    return false;
  }
  const typeNode = returnType.typeAnnotation;
  if (typeNode.type === 'TSVoidKeyword') {
    return true;
  }
  if (typeNode.type === 'TSTypeReference' && typeNode.typeName.type === 'Identifier' &&
      typeNode.typeName.name === 'Promise') {
    const typeArgs = typeNode.typeArguments?.params;
    return typeArgs?.length === 1 && typeArgs[0].type === 'TSVoidKeyword';
  }
  return false;
}

/**
 * Determines if a given AST function node matches the "view function" signature.
 * A view function is expected to have three parameters, with names conventionally
 * ending in 'input', 'output', and 'target'/'element'/'container'.
 * @param node The function-like AST node to inspect.
 * @returns True if the node is a view function, false otherwise.
 */
export function isViewFunction(node: TSESTree.Node): node is TSESTree.FunctionDeclaration|
    TSESTree.FunctionExpression|TSESTree.ArrowFunctionExpression {
  if (!['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type)) {
    return false;
  }
  const functionNode =
      node as TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression;
  return hasViewFunctionParameterNames(functionNode.params) &&
      (!functionNode.returnType || isVoidOrPromiseVoidReturn(functionNode.returnType));
}

/**
 * Determines if a given `TSFunctionType` AST node matches the "view function"
 * type signature `(input: ..., output: ..., target: ...) => void`.
 */
export function isViewFunctionType(node: TSESTree.Node): node is TSESTree.TSFunctionType {
  if (node.type !== 'TSFunctionType') {
    return false;
  }
  return hasViewFunctionParameterNames(node.params) && isVoidOrPromiseVoidReturn(node.returnType);
}

/**
 * Determines if a call expression's callee is a view function invocation
 * (such as `this.#view(...)`, `DEFAULT_VIEW(...)`, `view(...)`, etc.).
 */
export function isViewCallCallee(callee: TSESTree.Expression): boolean {
  if (callee.type === 'Identifier') {
    return callee.name === 'DEFAULT_VIEW' || callee.name.endsWith('_VIEW') || callee.name === 'defaultView' ||
        callee.name === 'view' || callee.name === 'viewFunction';
  }
  if (callee.type === 'MemberExpression' && !callee.computed) {
    if (callee.object.type === 'ThisExpression') {
      if (callee.property.type === 'PrivateIdentifier' || callee.property.type === 'Identifier') {
        return callee.property.name === 'view' || callee.property.name.endsWith('View');
      }
    }
    if (callee.property.type === 'Identifier') {
      return callee.property.name === 'DEFAULT_VIEW' || callee.property.name.endsWith('_VIEW') ||
          callee.property.name === 'defaultView';
    }
  }
  return false;
}
