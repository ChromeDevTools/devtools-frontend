// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FormatterWorker from './formatter_worker.js';

describe('ScopeParser', () => {
  describe('parseScopes', () => {
    const {parseScopes} = FormatterWorker.ScopeParser;

    it('parses simple function', () => {
      const scopes = parseScopes('function foo(a){}');

      const innerScope = scopes?.children[0];
      assert.strictEqual(innerScope?.start, 12);
      assert.strictEqual(innerScope?.end, 17);
      assert.deepEqual(innerScope?.variables?.get('a')?.uses.map(u => u.offset), [13]);
    });

    it('parses arrow function', () => {
      const scopes = parseScopes('let f = (a) => {}');

      assert.strictEqual(scopes?.children.length, 1);
      const innerScope = scopes?.children[0];
      assert.strictEqual(innerScope?.start, 8);
      assert.strictEqual(innerScope?.end, 17);
      assert.deepEqual(innerScope?.variables?.size, 1);
      assert.deepEqual(innerScope?.variables?.get('a')?.uses.map(u => u.offset), [9]);
    });

    it('parses for loop', () => {
      const scopes = parseScopes('for (let i = 0; i < 3; i++) console.log(i);');

      const innerScope = scopes?.children[0];
      assert.strictEqual(innerScope?.start, 0);
      assert.strictEqual(innerScope?.end, 43);
      assert.deepEqual(innerScope?.variables?.size, 1);
      assert.deepEqual(innerScope?.variables?.get('i')?.uses.map(u => u.offset), [9, 16, 23, 40]);
    });

    it('parses block scope', () => {
      const scopes = parseScopes('let x; { let y; }');

      assert.strictEqual(scopes?.start, 0);
      assert.strictEqual(scopes?.end, 17);
      assert.deepEqual(scopes?.variables?.size, 1);
      assert.deepEqual(scopes?.variables?.get('x')?.uses.map(u => u.offset), [4]);
      const blockScope = scopes?.children[0];
      assert.strictEqual(blockScope?.start, 7);
      assert.strictEqual(blockScope?.end, 17);
      assert.deepEqual(blockScope?.variables?.size, 1);
      assert.deepEqual(blockScope?.variables?.get('y')?.uses.map(u => u.offset), [13]);
    });

    it('parses object destructuring', () => {
      const source = 'let {x: y} = {}';
      const scopes = parseScopes(source);

      assert.exists(scopes);
      assert.isEmpty(scopes.children);
      assert.strictEqual(scopes.variables.size, 1);
      const [[name, {uses}]] = scopes.variables;
      assert.strictEqual(name, 'y');
      assert.lengthOf(uses, 1);
      assert.strictEqual(uses[0].offset, source.indexOf('y'));
    });

    it('parses object destructuring with default values', () => {
      const source = 'let {x: y = 42} = {}';
      const scopes = parseScopes(source);

      assert.exists(scopes);
      assert.isEmpty(scopes.children);
      assert.strictEqual(scopes.variables.size, 1);
      const [[name, {uses}]] = scopes.variables;
      assert.strictEqual(name, 'y');
      assert.lengthOf(uses, 1);
      assert.strictEqual(uses[0].offset, source.indexOf('y'));
    });

    it('parses object destructuring with short-hand syntax', () => {
      const source = 'let {x} = {}';
      const scopes = parseScopes(source);

      assert.exists(scopes);
      assert.isEmpty(scopes.children);
      assert.strictEqual(scopes.variables.size, 1);
      const [[name, {uses}]] = scopes.variables;
      assert.strictEqual(name, 'x');
      assert.lengthOf(uses, 1);
      assert.strictEqual(uses[0].offset, source.indexOf('x'));
    });

    it('parses object destructuring with short-hand syntax and default values', () => {
      const source = 'let {x = 42} = {}';
      const scopes = parseScopes(source);

      assert.exists(scopes);
      assert.isEmpty(scopes.children);
      assert.strictEqual(scopes.variables.size, 1);
      const [[name, {uses}]] = scopes.variables;
      assert.strictEqual(name, 'x');
      assert.lengthOf(uses, 1);
      assert.strictEqual(uses[0].offset, source.indexOf('x'));
    });

    it('parses ES modules', () => {
      const source = 'import * as Foo from "./foo.js"; Foo.foo();';
      const scopes = parseScopes(source, 'module');

      assert.exists(scopes);
      assert.isEmpty(scopes.children);
      assert.strictEqual(scopes.variables.size, 1);
      const [[name, {uses}]] = scopes.variables;
      assert.strictEqual(name, 'Foo');
      assert.lengthOf(uses, 1);
      const firstOccurence = source.indexOf('Foo');
      assert.strictEqual(uses[0].offset, source.indexOf('Foo', firstOccurence + 1));
    });
  });
});
