// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextEditor from './text_editor.js';

describe('argumentsList', () => {
  const {argumentsList} = TextEditor.JavaScript;

  it('handles functions with no parameters', () => {
    assert.isEmpty(argumentsList('function() {}'));
    assert.isEmpty(argumentsList('function foo() {}'));
    assert.isEmpty(argumentsList('function bar() { return 42; }'));
    assert.isEmpty(argumentsList('() => {}'));
    assert.isEmpty(argumentsList('() => 42'));
  });

  it('handles classes whose constructor has no parameters', () => {
    assert.isEmpty(argumentsList('class{constructor(){}}'));
    assert.isEmpty(argumentsList('class Klass { constructor() {} }'));
  });

  it('handles methods with no parameters', () => {
    assert.isEmpty(argumentsList('foo() {}'));
  });

  it('handles accessors with no parameters', () => {
    assert.isEmpty(argumentsList('get x() {}'));
  });

  it('handles functions with simple parameters', () => {
    assert.deepEqual(argumentsList('function(x){}'), ['x']);
    assert.deepEqual(argumentsList('function foo(x, y){}'), ['x', 'y']);
    assert.deepEqual(argumentsList('async function foo(abc){}'), ['abc']);
    assert.deepEqual(argumentsList('async function(abc, def){}'), ['abc', 'def']);
  });

  it('handles functions with non-simple parameters', () => {
    assert.deepEqual(argumentsList('function(...args){}'), ['...args']);
    assert.deepEqual(argumentsList('function(a, b, ...c){}'), ['a', 'b', '...c']);
    assert.deepEqual(argumentsList('function(x = 1){}'), ['x']);
    assert.deepEqual(argumentsList('function(x, y = 1){}'), ['x', 'y']);
    assert.deepEqual(argumentsList('function *bar(x = 1, y){}'), ['x', 'y']);
    assert.deepEqual(argumentsList('async function bar(x = {window}, y = [document]){}'), ['x', 'y']);
    assert.deepEqual(argumentsList('function([x, y], z){}'), ['arr', 'z']);
    assert.deepEqual(argumentsList('async function *foo([x, [y]], z){}'), ['arr', 'z']);
    assert.deepEqual(argumentsList('function *bar({x, y}, z){}'), ['obj', 'z']);
    assert.deepEqual(argumentsList('async function({x, y: {something}}, z){}'), ['obj', 'z']);
  });

  it('handles arrow functions with simple parameters', () => {
    assert.deepEqual(argumentsList('x => x'), ['x']);
    assert.deepEqual(argumentsList('(x, y) => x + y'), ['x', 'y']);
    assert.deepEqual(argumentsList('async (abc) => {}'), ['abc']);
    assert.deepEqual(argumentsList('async (abc, def) => {}'), ['abc', 'def']);
  });

  it('handles arrow functions with non-simple parameters', () => {
    assert.deepEqual(argumentsList('(...args) => args'), ['...args']);
    assert.deepEqual(argumentsList('(a, b, ...c)=>{}'), ['a', 'b', '...c']);
    assert.deepEqual(argumentsList('(x = 1)=>{}'), ['x']);
    assert.deepEqual(argumentsList('(x, y = 1)=>{}'), ['x', 'y']);
    assert.deepEqual(argumentsList('(x = 1, y)=>{}'), ['x', 'y']);
    assert.deepEqual(argumentsList('async(x = {window}, y = [document]) => {}'), ['x', 'y']);
    assert.deepEqual(argumentsList('([x, y], z) => z'), ['arr', 'z']);
    assert.deepEqual(argumentsList('async([x, [something]], z) => {}'), ['arr', 'z']);
    assert.deepEqual(argumentsList('({x, y}, z) => {}'), ['obj', 'z']);
    assert.deepEqual(argumentsList('async ({x, y: {something}}, z)=>z+x'), ['obj', 'z']);
  });

  it('handles classes with implicit constructors correctly', () => {
    assert.deepEqual(argumentsList('class A{}'), []);
    assert.deepEqual(argumentsList('class A extends B{}'), []);
    assert.deepEqual(argumentsList('class {}'), []);
    assert.deepEqual(argumentsList('class extends B{}'), []);
  });

  it('handles classes with explicit constructors correctly', () => {
    assert.deepEqual(argumentsList('class A{constructor(){}}'), []);
    assert.deepEqual(argumentsList('class A{constructor(x){}}'), ['x']);
    assert.deepEqual(argumentsList('class A{constructor(x, y = 1){}}'), ['x', 'y']);
    assert.deepEqual(argumentsList('class A extends B {constructor(){}}'), []);
    assert.deepEqual(argumentsList('class A extends B {constructor(x){}}'), ['x']);
    assert.deepEqual(argumentsList('class A extends B {constructor(x, y = 1){}}'), ['x', 'y']);
    assert.deepEqual(argumentsList('class{constructor(){}}'), []);
    assert.deepEqual(argumentsList('class{constructor(x){}}'), ['x']);
    assert.deepEqual(argumentsList('class{constructor(x, y = 1){}}'), ['x', 'y']);
    assert.deepEqual(argumentsList('class extends B {constructor(){}}'), []);
    assert.deepEqual(argumentsList('class extends B {constructor(x){}}'), ['x']);
    assert.deepEqual(argumentsList('class extends B {constructor(x, y = 1){}}'), ['x', 'y']);
  });

  it('handles methods correctly', () => {
    assert.deepEqual(argumentsList('foo(){}'), []);
    assert.deepEqual(argumentsList('foo(x){}'), ['x']);
    assert.deepEqual(argumentsList('*foo(){}'), []);
    assert.deepEqual(argumentsList('*foo(x){}'), ['x']);
    assert.deepEqual(argumentsList('async foo(){}'), []);
    assert.deepEqual(argumentsList('async foo(x = 1, y){}'), ['x', 'y']);
    assert.deepEqual(argumentsList('async *foo(){}'), []);
    assert.deepEqual(argumentsList('async *foo(abc, [def]){}'), ['abc', 'arr']);
  });

  it('handles methods with computed names correctly', () => {
    assert.deepEqual(argumentsList('[0](x){}'), ['x']);
    assert.deepEqual(argumentsList('async ["some name"](x){}'), ['x']);
    assert.deepEqual(argumentsList('[x => x](z,y){}'), ['z', 'y']);
    assert.deepEqual(argumentsList('async [x => x](z,y){}'), ['z', 'y']);
  });

  it('handles private methods correctly', () => {
    assert.deepEqual(argumentsList('#foo(){}'), []);
    assert.deepEqual(argumentsList('#foo(x){}'), ['x']);
    assert.deepEqual(argumentsList('*#foo(){}'), []);
    assert.deepEqual(argumentsList('*#foo(x){}'), ['x']);
    assert.deepEqual(argumentsList('async #foo(){}'), []);
    assert.deepEqual(argumentsList('async #foo(x = 1, y){}'), ['x', 'y']);
    assert.deepEqual(argumentsList('async *#foo(){}'), []);
    assert.deepEqual(argumentsList('async *#foo(abc, [def]){}'), ['abc', 'arr']);
  });
});
