// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ts from 'typescript';

export const nodeIsPrimitive = (node: ts.TypeNode): boolean => {
  return [
    ts.SyntaxKind.NumberKeyword,
    ts.SyntaxKind.StringKeyword,
    ts.SyntaxKind.BooleanKeyword,
    ts.SyntaxKind.AnyKeyword,
    ts.SyntaxKind.UnknownKeyword,
  ].includes(node.kind);
};

export const valueForTypeNode = (node: ts.TypeNode, isFunctionParam: boolean = false): string => {
  let value = '';

  if (ts.isTypeReferenceNode(node)) {
    value = (node.typeName as ts.Identifier).escapedText.toString();
  } else if (ts.isArrayTypeNode(node)) {
    const isPrimitive = nodeIsPrimitive(node.elementType);
    const modifier = isPrimitive ? '' : '!';
    value = `Array.<${modifier}${valueForTypeNode(node.elementType)}>`;
  } else if (node.kind === ts.SyntaxKind.NumberKeyword) {
    value = 'number';
  } else if (node.kind === ts.SyntaxKind.StringKeyword) {
    value = 'string';
  } else if (node.kind === ts.SyntaxKind.BooleanKeyword) {
    value = 'boolean';
  } else if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
    value = 'undefined';
  } else if (node.kind === ts.SyntaxKind.UnknownKeyword || node.kind === ts.SyntaxKind.AnyKeyword) {
    value = '*';
  } else if (node.kind === ts.SyntaxKind.VoidKeyword) {
    value = 'void';
  } else if (ts.isUnionTypeNode(node)) {
    const isNullUnion = node.types.some(n => n.kind === ts.SyntaxKind.NullKeyword);

    if (isNullUnion) {
      if (node.types.length > 2) {
        /* decided to defer support for complex types like string | number | null until we hit a legitimate case to use them */
        throw new Error('Union types with null and > 1 other types are not yet supported.');
      }

      const notNullNode = node.types.find(n => n.kind !== ts.SyntaxKind.NullKeyword);

      if (!notNullNode) {
        throw new Error('Found null union without a not null node.');
      }

      // if it's primitive|null, return ?primitive
      if (nodeIsPrimitive(notNullNode)) {
        const value = valueForTypeNode(notNullNode);
        return `?${value}`;
      }
      /* for non primitives, we return !Foo|null
       * if we are in an interface
       * but still ?Foo for parameters
       */
      const value = valueForTypeNode(notNullNode);
      return isFunctionParam ? `?${value}` : `!${value}|null`;
    }

    const parts = node.types.map(n => valueForTypeNode(n, isFunctionParam));
    return parts.join('|');
  } else if (ts.isFunctionTypeNode(node)) {
    let returnType = valueForTypeNode(node.type);

    /* If the function returns a union, and we are in a function param, we need to wrap it in parens to satisfy the Closure parser
     * e.g. it wants: someFunc: function(string): (string|undefined)
     *   rather than: someFunc: function(string): string|undefined
     */
    if (returnType.includes('|')) {
      returnType = `(${returnType})`;
    }

    const params = node.parameters
                       .map(param => {
                         if (!param.type) {
                           return '';
                         }
                         return valueForTypeNode(param.type);
                       })
                       .join(', ');

    value = `function(${params}): ${returnType}`;
  } else if (ts.isTypeLiteralNode(node)) {
    const members = node.members
                        .map(member => {
                          if (ts.isPropertySignature(member) && member.type) {
                            let requiredOptionalFlag = '';

                            if (ts.isTypeReferenceNode(member.type) || ts.isArrayTypeNode(member.type)) {
                              requiredOptionalFlag = !!member.questionToken ? '?' : '!';
                            }
                            return {
                              name: (member.name as ts.Identifier).escapedText.toString(),
                              value: requiredOptionalFlag + valueForTypeNode(member.type, isFunctionParam),
                            };
                          }

                          return null;
                        })
                        .map(member => {
                          return member ? `${member.name}: ${member.value}` : null;
                        })
                        .filter(Boolean)
                        .join(', ');

    return `{${members}}`;
  } else {
    throw new Error(`Unsupported node kind: ${ts.SyntaxKind[node.kind]}`);
  }
  return value;
};
