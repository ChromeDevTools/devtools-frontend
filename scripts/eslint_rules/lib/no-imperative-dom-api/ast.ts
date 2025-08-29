// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library for traversing the AST.
 */

import type {TSESTree} from '@typescript-eslint/utils';
import type {RuleContext, RuleListener} from '@typescript-eslint/utils/ts-eslint';

import type {DomFragment} from './dom-fragment';

type Node = TSESTree.Node;
type CallExpression = TSESTree.CallExpression;
type Identifier = TSESTree.Identifier;

type Context = RuleContext<'preferTemplateLiterals', []>;
type Subrule = Partial<{
  getEvent(event: Node): string | null,
  propertyAssignment(property: Identifier, propertyValue: Node, domFragment: DomFragment): boolean,
  methodCall(property: Identifier, firstArg: Node, secondArg: Node, domFragment: DomFragment, call: CallExpression):
      boolean,
  propertyMethodCall(property: Identifier, method: Node, firstArg: Node, domFragment: DomFragment): boolean,
  subpropertyAssignment(
      property: Identifier, subproperty: Identifier, subpropertyValue: Node, domFragment: DomFragment): boolean,
  functionCall(call: CallExpression, firstArg: Node, secondArg: Node, domFragment: DomFragment): boolean,

}>&Pick<RuleListener, 'MemberExpression'|'NewExpression'|'CallExpression'>;

export interface RuleCreator {
  create(context: Context): Subrule;
}

export function isIdentifier(node: Node, name: string|string[]): boolean {
  return node.type === 'Identifier' && (Array.isArray(name) ? name.includes(node.name) : node.name === name);
}

export function isIdentifierChain(node: Node, names: string[]): boolean {
  if (names.length === 1) {
    return isIdentifier(node, names[0]);
  }
  return Boolean(isMemberExpression(
      node, n => isIdentifierChain(n, names.slice(0, -1)), n => isIdentifier(n, names.at(-1) as string)));
}

export function isMemberExpression(
    node: Node, objectPredicate: (node: Node) => boolean, propertyPredicate: (node: Node) => boolean): Node|null {
  const match = node.type === 'MemberExpression' && objectPredicate(node.object) && propertyPredicate(node.property);
  return match ? node.property : null;
}

export function isLiteral(node: Node, value: string|number|boolean): boolean {
  return node.type === 'Literal' && node.value === value;
}

export function getEnclosingExpression(node: Node): Node|null {
  while (node.parent) {
    if (node.parent.type === 'BlockStatement') {
      return node;
    }
    node = node.parent;
  }
  return null;
}

export function getEnclosingProperty(node: Node): Node|null {
  if (isMemberExpression(
          node, n => n.type === 'ThisExpression', n => ['Identifier', 'PrivateIdentifier'].includes(n.type))) {
    return node;
  }
  if (node.parent?.type === 'AssignmentExpression' && node.parent.right === node &&
      isMemberExpression(
          node.parent.left, n => n.type === 'ThisExpression',
          n => ['Identifier', 'PrivateIdentifier'].includes(n.type))) {
    return node.parent.left;
  }
  return null;
}

export function getEnclosingClassDeclaration(node: Node): Node|undefined {
  let parent = node.parent;
  while (parent && !['ClassDeclaration', 'ClassExpression'].includes(parent.type)) {
    parent = parent.parent;
  }
  return parent;
}
