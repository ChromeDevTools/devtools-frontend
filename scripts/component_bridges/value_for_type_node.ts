// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ts from 'typescript';

import {nodeIsReadOnlyArrayInterfaceReference, nodeIsReadOnlyInterfaceReference} from './walk_tree';

export const nodeIsPrimitive = (node: ts.TypeNode): boolean => {
  return [
    ts.SyntaxKind.NumberKeyword,
    ts.SyntaxKind.StringKeyword,
    ts.SyntaxKind.BooleanKeyword,
    ts.SyntaxKind.AnyKeyword,
    ts.SyntaxKind.UnknownKeyword,
    ts.SyntaxKind.VoidKeyword,
  ].includes(node.kind);
};

export const valueForTypeNode = (node: ts.TypeNode, isFunctionParam: boolean = false): string => {
  let value = '';

  if (ts.isTypeReferenceNode(node)) {
    /* These check for Readonly<X> or ReadonlyArray<X> and unwrap them
     * so we parse out the inner type instead.
     */
    if (nodeIsReadOnlyInterfaceReference(node) && node.typeArguments) {
      return valueForTypeNode(node.typeArguments[0], isFunctionParam);
    }
    if (nodeIsReadOnlyArrayInterfaceReference(node) && node.typeArguments) {
      /* The structure of a ReadonlyArray node is different to that of an Array node.
       * Rather than duplicate the logic for handling an array, we can instead construct
       * an array node from the inner type of the ReadonlyArray and recurse with that.
       */
      const arrayNode = ts.factory.createArrayTypeNode(node.typeArguments[0]);
      return valueForTypeNode(arrayNode, isFunctionParam);
    }
    if (ts.isIdentifier(node.typeName)) {
      value = node.typeName.escapedText.toString();
      /* For both Maps and Sets we make an assumption that the value within
         * needs a non-nullable ! prefixed. This is a bit of a simplification
         * where we assume the value needs a ! if it is not a primitive. There
         * could be times where this is incorrect. However a search of the
         * DevTools codebase found no usages of a Map without a `!` for the
         * value type. So rather than invest in the work now, let's wait until
         * it causes us a problem and we can revisit.
         */
      if (value === 'Map' && node.typeArguments) {
        const keyType = valueForTypeNode(node.typeArguments[0]);
        let valueType = valueForTypeNode(node.typeArguments[1]);
        if (!nodeIsPrimitive(node.typeArguments[1])) {
          valueType = `!${valueType}`;
        }
        value = `Map<${keyType}, ${valueType}>`;
      } else if (value === 'Set' && node.typeArguments) {
        let valueType = valueForTypeNode(node.typeArguments[0]);
        if (!nodeIsPrimitive(node.typeArguments[0])) {
          valueType = `!${valueType}`;
        }
        value = `Set<${valueType}>`;
      }
    } else if (ts.isIdentifier(node.typeName.left)) {
      value = node.typeName.left.escapedText.toString();
    } else {
      throw new Error('Internal error: cannot map a node to value.');
    }
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
    const isNullUnion = node.types.some(node => {
      return ts.isLiteralTypeNode(node) && node.literal.kind === ts.SyntaxKind.NullKeyword;
    });
    if (isNullUnion) {
      if (node.types.length > 2) {
        /* decided to defer support for complex types like string | number | null until we hit a legitimate case to use them */
        throw new Error('Union types with null and > 1 other types are not yet supported.');
      }

      const notNullNode = node.types.find(n => n.kind !== ts.SyntaxKind.NullKeyword);

      if (!notNullNode) {
        throw new Error('Found null union without a not null node.');
      }

      const value = valueForTypeNode(notNullNode);
      return `?${value}`;
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

                         const valueForParam = valueForTypeNode(param.type, true);

                         if (nodeIsPrimitive(param.type)) {
                           // A primitive never has a ! at the start, but does have a = at the end if it's optional.
                           return param.questionToken ? `${valueForParam}=` : valueForParam;
                         }

                         // If it's not a primitive, it's a type ref and needs a
                         // non-nullable ! at the start and a = at the end if
                         // it's optional.
                         return [
                           '!',
                           valueForTypeNode(param.type, true),
                           param.questionToken ? '=' : '',
                         ].join('');
                       })
                       .join(', ');

    value = `function(${params}):${returnType}`;
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
  } else if (ts.isLiteralTypeNode(node)) {
    if (ts.isStringLiteral(node.literal)) {
      return `"${node.literal.text}"`;
    }
    throw new Error(`Unsupported literal node kind: ${ts.SyntaxKind[node.literal.kind]}`);
  } else if (node.kind === ts.SyntaxKind.NullKeyword) {
    value = 'null';
  } else {
    throw new Error(`Unsupported node kind: ${ts.SyntaxKind[node.kind]}`);
  }
  return value;
};
