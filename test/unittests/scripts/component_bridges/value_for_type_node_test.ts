// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import * as ts from 'typescript';

import {valueForTypeNode} from '../../../../scripts/component_bridges/value_for_type_node.js';

const createNode = (type: ts.SyntaxKind): ts.TypeNode => {
  const node = ts.createNode(type);
  // not sure what this field is used for or why it exists
  // but we need it to satisfy the compiler
  (node as ts.TypeNode)._typeNodeBrand = '...';
  return node as ts.TypeNode;
};

/*
 * As of TypeScript 4, `null` is no longer generated as a Node with
 * ts.SyntaxKind.NullKeyword kind, but instead as a LiteralTypeNode with a
 * NullKeyword literal within it.
 */
const createNullLiteral = () => {
  return ts.factory.createLiteralTypeNode(ts.factory.createNull());
};

describe('valueForTypeNode', () => {
  it('throws for any node it cannot process', () => {
    const objectNode = createNode(ts.SyntaxKind.ObjectKeyword);
    assert.throws(() => {
      valueForTypeNode(objectNode);
    }, `Unsupported node kind: ${ts.SyntaxKind[ts.SyntaxKind.ObjectKeyword]}`);
  });

  it('supports primitive types', () => {
    const stringNode = createNode(ts.SyntaxKind.StringKeyword);
    const numberNode = createNode(ts.SyntaxKind.NumberKeyword);
    const booleanNode = createNode(ts.SyntaxKind.BooleanKeyword);
    const voidNode = createNode(ts.SyntaxKind.VoidKeyword);
    const undefinedNode = createNode(ts.SyntaxKind.UndefinedKeyword);

    assert.strictEqual(valueForTypeNode(stringNode), 'string');
    assert.strictEqual(valueForTypeNode(numberNode), 'number');
    assert.strictEqual(valueForTypeNode(booleanNode), 'boolean');
    assert.strictEqual(valueForTypeNode(voidNode), 'void');
    assert.strictEqual(valueForTypeNode(undefinedNode), 'undefined');
  });

  it('supports qualified types by taking the left type', () => {
    const node = ts.createTypeReferenceNode(ts.createQualifiedName(ts.createIdentifier('MyEnum'), 'myMember'), []);
    assert.strictEqual(valueForTypeNode(node), 'MyEnum');
  });

  it('converts union types', () => {
    const stringNode = createNode(ts.SyntaxKind.StringKeyword);
    const numberNode = createNode(ts.SyntaxKind.NumberKeyword);

    const unionNode = ts.createUnionTypeNode([stringNode, numberNode]);
    assert.strictEqual(valueForTypeNode(unionNode), 'string|number');
  });

  describe('optional types from TS => Closure', () => {
    it('converts unions with a primitive and null into ?', () => {
      const stringNode = createNode(ts.SyntaxKind.StringKeyword);
      const nullLiteral = createNullLiteral();

      const unionNode = ts.createUnionTypeNode([stringNode, nullLiteral]);
      assert.strictEqual(valueForTypeNode(unionNode), '?string');
    });

    it('converts null unions with an interface into ?X', () => {
      const interfaceNode = ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface'), []);
      const nullLiteral = createNullLiteral();

      const unionNode = ts.createUnionTypeNode([interfaceNode, nullLiteral]);
      assert.strictEqual(valueForTypeNode(unionNode), '?ExampleInterface');
    });

    it('converts null unions into ?X if they are a func param', () => {
      const interfaceNode = ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface'), []);
      const nullLiteral = createNullLiteral();

      const unionNode = ts.createUnionTypeNode([interfaceNode, nullLiteral]);
      assert.strictEqual(valueForTypeNode(unionNode, true), '?ExampleInterface');
    });
  });

  it('converts any and unknown into *', () => {
    const anyNode = createNode(ts.SyntaxKind.AnyKeyword);
    const unknownNode = createNode(ts.SyntaxKind.UnknownKeyword);

    assert.strictEqual(valueForTypeNode(unknownNode), '*');
    assert.strictEqual(valueForTypeNode(anyNode), '*');
  });

  it('uses the name for a typereference', () => {
    const node = ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface'), []);
    assert.strictEqual(valueForTypeNode(node), 'ExampleInterface');
  });

  describe('converting type literals', () => {
    it('converts objects into closure type objects', () => {
      const node = ts.createTypeLiteralNode([
        ts.createPropertySignature(
            undefined, 'x', undefined, ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface'), []),
            undefined),
        ts.createPropertySignature(undefined, 'y', undefined, createNode(ts.SyntaxKind.StringKeyword), undefined),
      ]);
      assert.strictEqual(valueForTypeNode(node), '{x: !ExampleInterface, y: string}');
    });

    it('converts union types of type refs and null correctly', () => {
      const nullLiteral = createNullLiteral();
      const typeRefNode = ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface'), []);
      const unionNode = ts.factory.createUnionTypeNode([
        typeRefNode,
        nullLiteral,

      ]);
      const node = ts.createTypeLiteralNode([
        ts.createPropertySignature(undefined, 'x', undefined, unionNode, undefined),
      ]);
      assert.strictEqual(valueForTypeNode(node), '{x: ?ExampleInterface}');
    });

    it('converts union types of type refs and null correctly when in function parameters', () => {
      const nullLiteral = createNullLiteral();
      const typeRefNode = ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface'), []);
      const unionNode = ts.createUnionTypeNode([typeRefNode, nullLiteral]);
      const node = ts.createTypeLiteralNode([
        ts.createPropertySignature(undefined, 'x', undefined, unionNode, undefined),
      ]);
      assert.strictEqual(valueForTypeNode(node, true), '{x: ?ExampleInterface}');
    });
  });

  describe('converting arrays', () => {
    it('converts primitive types without the non-null !', () => {
      const node = ts.createArrayTypeNode(createNode(ts.SyntaxKind.StringKeyword));

      assert.strictEqual(valueForTypeNode(node), 'Array.<string>');
    });

    it('converts complex types with the non null !', () => {
      const node = ts.createArrayTypeNode(ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface'), []));

      assert.strictEqual(valueForTypeNode(node), 'Array.<!ExampleInterface>');
    });
  });

  describe('converting Maps', () => {
    it('converts maps of primitives', () => {
      // Map<string, number>
      const node = ts.createTypeReferenceNode(
          ts.createIdentifier('Map'),
          [
            ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
          ],
      );
      assert.strictEqual(valueForTypeNode(node), 'Map<string, number>');
    });

    it('converts maps of type references', () => {
      // Map<string, ExampleInterface>
      const node = ts.createTypeReferenceNode(
          ts.createIdentifier('Map'),
          [
            ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface')),
          ],
      );
      assert.strictEqual(valueForTypeNode(node), 'Map<string, !ExampleInterface>');
    });

    it('converts maps with optional type reference values', () => {
      const nullNode = createNode(ts.SyntaxKind.NullKeyword);
      const typeRefNode = ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface'), []);
      const returnUnionNode = ts.createUnionTypeNode([typeRefNode, nullNode]);

      // Map<string, ExampleInterface | null>
      const node = ts.createTypeReferenceNode(
          ts.createIdentifier('Map'),
          [
            ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            returnUnionNode,
          ],
      );
      assert.strictEqual(valueForTypeNode(node), 'Map<string, !ExampleInterface|null>');
    });
  });

  describe('converting Sets', () => {
    it('can convert primitive sets', () => {
      // Set<string>
      const node = ts.createTypeReferenceNode(
          ts.createIdentifier('Set'),
          [
            ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          ],
      );
      assert.strictEqual(valueForTypeNode(node), 'Set<string>');
    });

    it('can convert sets of type references', () => {
      // Set<ExampleInterface>
      const node = ts.createTypeReferenceNode(
          ts.createIdentifier('Set'),
          [ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface'), [])],
      );
      assert.strictEqual(valueForTypeNode(node), 'Set<!ExampleInterface>');
    });
  });

  describe('converting functions', () => {
    it('converts functions with no parameters', () => {
      const returnTypeNode = createNode(ts.SyntaxKind.StringKeyword);
      const node = ts.createFunctionTypeNode([], [], returnTypeNode);
      assert.strictEqual(valueForTypeNode(node), 'function():string');
    });

    it('converts a function with parameters', () => {
      const returnTypeNode = createNode(ts.SyntaxKind.StringKeyword);
      const stringParam = ts.createParameter(
          [], [], undefined, ts.createIdentifier('foo'), undefined, createNode(ts.SyntaxKind.StringKeyword));
      const node = ts.createFunctionTypeNode([], [stringParam], returnTypeNode);

      assert.strictEqual(valueForTypeNode(node), 'function(string):string');
    });

    it('can convert functions that return primitives or undefined', () => {
      const stringNode = createNode(ts.SyntaxKind.StringKeyword);
      const undefinedNode = createNode(ts.SyntaxKind.UndefinedKeyword);
      const returnUnionNode = ts.createUnionTypeNode([stringNode, undefinedNode]);

      const stringParam = ts.createParameter(
          [], [], undefined, ts.createIdentifier('foo'), undefined, createNode(ts.SyntaxKind.StringKeyword));
      const node = ts.createFunctionTypeNode([], [stringParam], returnUnionNode);
      assert.strictEqual(valueForTypeNode(node), 'function(string):(string|undefined)');
    });

    it('correctly deals with optional type reference parameters', () => {
      const stringNode = createNode(ts.SyntaxKind.StringKeyword);
      const typeReferenceNode = ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface'), []);
      const functionParam = ts.createParameter(
          [], [], undefined, ts.createIdentifier('foo'), ts.createToken(ts.SyntaxKind.QuestionToken),
          typeReferenceNode);

      // function(foo?: ExampleInterface):string
      const node = ts.createFunctionTypeNode([], [functionParam], stringNode);
      assert.strictEqual(valueForTypeNode(node), 'function(!ExampleInterface=):string');
    });

    it('correctly deals with required type reference parameters', () => {
      const stringNode = createNode(ts.SyntaxKind.StringKeyword);
      const typeReferenceNode = ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface'), []);
      const functionParam =
          ts.createParameter([], [], undefined, ts.createIdentifier('foo'), undefined, typeReferenceNode);

      // function(foo: ExampleInterface):string
      const node = ts.createFunctionTypeNode([], [functionParam], stringNode);
      assert.strictEqual(valueForTypeNode(node), 'function(!ExampleInterface):string');
    });

    it('correctly deals with optional primitive parameters', () => {
      const returnTypeNode = createNode(ts.SyntaxKind.StringKeyword);
      const stringParam = ts.createParameter(
          [], [], undefined, ts.createIdentifier('foo'), ts.createToken(ts.SyntaxKind.QuestionToken),
          createNode(ts.SyntaxKind.StringKeyword));
      const node = ts.createFunctionTypeNode([], [stringParam], returnTypeNode);

      // function(foo?: string):string
      assert.strictEqual(valueForTypeNode(node), 'function(string=):string');
    });
  });
});
