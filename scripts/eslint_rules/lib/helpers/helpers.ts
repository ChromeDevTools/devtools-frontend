// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type {TSESTree} from '@typescript-eslint/utils';

export type AssertCallExpression<M extends string = string> = TSESTree.CallExpression&{
  callee: TSESTree.MemberExpression & {
    object: TSESTree.Identifier & {name: 'assert'},
    property: TSESTree.Identifier & {name: M},
  },
};

export function isAssertCall(
    node: TSESTree.Node,
    ): node is AssertCallExpression {
  return (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' && node.callee.object.name === 'assert' &&
          node.callee.property.type === 'Identifier');
}

export function isAssertMethodCall<M extends string>(
    node: TSESTree.Node,
    methodNames: M|Set<M>,
    ): node is AssertCallExpression<M> {
  if (!isAssertCall(node)) {
    return false;
  }
  if (typeof methodNames === 'string') {
    return node.callee.property.name === methodNames;
  }
  return methodNames.has(node.callee.property.name as M);
}

export function hasJsonImportAttribute(
    node: TSESTree.ImportDeclaration,
    ): boolean {
  return ('attributes' in node && Array.isArray(node.attributes) && node.attributes.some(attr => {
    const attribute = attr as unknown as {
      key: {type: string, name?: string, value?: string},
      value: {value: string},
    };
    const isTypeKey =
        attribute.key.type === 'Identifier' ? attribute.key.name === 'type' : attribute.key.value === 'type';
    return isTypeKey && attribute.value.value === 'json';
  }));
}
