// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  createAstNode,
  quoteForGn,
  unquoteFromGn,
} from '../../gn_ast/gn_ast_factory.ts';

describe('gn_ast_factory', () => {
  describe('unquote & quote', () => {
    it('unquotes double-quoted strings', () => {
      assert.strictEqual(unquoteFromGn('"hello"'), 'hello');
      assert.strictEqual(unquoteFromGn('hello'), 'hello');
      assert.strictEqual(unquoteFromGn('""'), '');
      assert.strictEqual(unquoteFromGn(undefined), '');
    });

    it('quotes strings', () => {
      assert.strictEqual(quoteForGn('hello'), '"hello"');
      assert.strictEqual(quoteForGn('"hello"'), '"hello"');
    });
  });

  describe('createAstNode', () => {
    it('creates literal nodes', () => {
      const node = createAstNode.literal('"foo"');
      assert.strictEqual(node.type, 'LITERAL');
      assert.strictEqual(node.value, '"foo"');
      assert.isDefined(node.location);
    });

    it('creates stringLiteral nodes with quotes', () => {
      const node = createAstNode.stringLiteral('foo');
      assert.strictEqual(node.type, 'LITERAL');
      assert.strictEqual(node.value, '"foo"');
    });

    it('creates identifier nodes', () => {
      const node = createAstNode.identifier('deps');
      assert.strictEqual(node.type, 'IDENTIFIER');
      assert.strictEqual(node.value, 'deps');
    });

    it('creates list nodes', () => {
      const child = createAstNode.stringLiteral('item');
      const node = createAstNode.list([child]);
      assert.strictEqual(node.type, 'LIST');
      assert.strictEqual(node.begin_token, '[');
      assert.deepEqual(node.child, [child]);
      assert.isDefined(node.end);
      assert.strictEqual(node.end.type, 'END');
      assert.strictEqual(node.end.value, ']');
    });

    it('creates binary nodes', () => {
      const lhs = createAstNode.identifier('deps');
      const rhs = createAstNode.list();
      const node = createAstNode.binary('=', lhs, rhs);
      assert.strictEqual(node.type, 'BINARY');
      assert.strictEqual(node.value, '=');
      assert.deepEqual(node.child, [lhs, rhs]);
    });

    it('creates assignment nodes', () => {
      const rhs = createAstNode.list();
      const node = createAstNode.assignment('deps', rhs, '+=');
      assert.strictEqual(node.type, 'BINARY');
      assert.strictEqual(node.value, '+=');
      assert.isDefined(node.child);
      assert.strictEqual(node.child[0].type, 'IDENTIFIER');
      assert.strictEqual(node.child[0].value, 'deps');
      assert.strictEqual(node.child[1], rhs);
    });
  });
});
