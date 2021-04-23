// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as FormatterWorker from '../../../../../front_end/entrypoints/formatter_worker/formatter_worker.js';

type Item = {
  title: string,
  subtitle?: string, line: number, column: number,
};

function javaScriptOutline(text: string): Promise<Item[]> {
  return new Promise(resolve => {
    const items: Item[] = [];
    FormatterWorker.JavaScriptOutline.javaScriptOutline(text, ({chunk, isLastChunk}) => {
      items.push(...chunk);
      if (isLastChunk) {
        resolve(items);
      }
    });
  });
}

describe('JavaScriptOutline', () => {
  it('handles empty scripts', async () => {
    const items = await javaScriptOutline('');
    assert.deepEqual(items, []);
  });

  it('handles simple function statements', async () => {
    const items = await javaScriptOutline('function foo(a, b, c) {}');
    assert.deepEqual(items, [
      {title: 'foo', subtitle: '(a, b, c)', line: 0, column: 9},
    ]);
  });

  it('handles function statements with rest arguments', async () => {
    const items = await javaScriptOutline('function foo(a, b, ...c) {}');
    assert.deepEqual(items, [
      {title: 'foo', subtitle: '(a, b, ...c)', line: 0, column: 9},
    ]);
  });

  it('handles function expressions in variable declarations', async () => {
    const items = await javaScriptOutline('var a = function(a,b) { }, b = function bar(c,d) { }');
    assert.deepEqual(items, [
      {title: 'a', subtitle: '(a, b)', line: 0, column: 4},
      {title: 'b', subtitle: '(c, d)', line: 0, column: 27},
    ]);
  });

  it('handles function expressions in property assignments', async () => {
    const items = await javaScriptOutline(`a.b.c = function(d, e) { };
a.b[c] = function() { };
a.b[c].d = function() { };
(a || b).c = function() { };`);
    assert.deepEqual(items, [
      {title: 'c', subtitle: '(d, e)', line: 0, column: 0},
      {title: 'd', subtitle: '()', line: 2, column: 0},
      {title: 'c', subtitle: '()', line: 3, column: 0},
    ]);
  });

  it('handles function expressions in object literals', async () => {
    const items = await javaScriptOutline(`x = { run: function() { }, get count() { }, set count(value) { }};
var foo = { "bar": function() { }};
var foo = { 42: function() { }}`);
    assert.deepEqual(items, [
      {title: 'run', subtitle: '()', line: 0, column: 6},
      {title: 'get count', subtitle: '()', line: 0, column: 31},
      {title: 'set count', subtitle: '(value)', line: 0, column: 48},
    ]);
  });

  it('handles arrow functions in variable declarations', async () => {
    const items = await javaScriptOutline(`var a = x => x + 2;
var b = (x, y) => x + y`);
    assert.deepEqual(items, [
      {title: 'a', subtitle: '(x)', line: 0, column: 4},
      {title: 'b', subtitle: '(x, y)', line: 1, column: 4},
    ]);
  });

  it('handles nested function statements', async () => {
    const items = await javaScriptOutline('function foo(){ function bar() {} function baz() { }}');
    assert.deepEqual(items, [
      {title: 'foo', subtitle: '()', line: 0, column: 9},
      {title: 'bar', subtitle: '()', line: 0, column: 25},
      {title: 'baz', subtitle: '()', line: 0, column: 43},
    ]);
  });

  it('handles class constructors', async () => {
    const items = await javaScriptOutline('class Test { constructor(foo, bar) { }}');
    assert.deepEqual(items, [
      {title: 'class Test', subtitle: undefined, line: 0, column: 6},
      {title: 'constructor', subtitle: '(foo, bar)', line: 0, column: 13},
    ]);
  });

  it('handles class methods', async () => {
    const items = await javaScriptOutline('class Test { foo() {} static bar() { }}');
    assert.deepEqual(items, [
      {title: 'class Test', subtitle: undefined, line: 0, column: 6},
      {title: 'foo', subtitle: '()', line: 0, column: 13},
      {title: 'static bar', subtitle: '()', line: 0, column: 29},
    ]);
  });

  it('handles anonymous classes', async () => {
    const items = await javaScriptOutline(`var test = class { constructor() { }};
var A = class extends B { foo() { }}`);
    assert.deepEqual(items, [
      {title: 'class test', subtitle: undefined, line: 0, column: 4},
      {title: 'constructor', subtitle: '()', line: 0, column: 19},
      {title: 'class A', subtitle: undefined, line: 1, column: 4},
      {title: 'foo', subtitle: '()', line: 1, column: 26},
    ]);
  });

  it('handles object literals with class properties', async () => {
    const items = await javaScriptOutline(`var foo = { 42: class { }};
var foo = { "foo": class { }};
var foo = { foo: class { }};`);
    assert.deepEqual(items, [
      {title: 'class foo', subtitle: undefined, line: 2, column: 12},
    ]);
  });

  it('handles async functions', async () => {
    const items = await javaScriptOutline(`async function foo() { };
var sum = async (x, y) => x + y;`);
    assert.deepEqual(items, [
      {title: 'async foo', subtitle: '()', line: 0, column: 15},
      {title: 'async sum', subtitle: '(x, y)', line: 1, column: 4},
    ]);
  });

  it('handles generator functions', async () => {
    const items = await javaScriptOutline('function* foo() { }');
    assert.deepEqual(items, [
      {title: '*foo', subtitle: '()', line: 0, column: 10},
    ]);
  });

  it('recovers from syntax errors', async () => {
    const items = await javaScriptOutline(`
function foo(a, b) {
    if (a > b) {
        return a;
}

function bar(eee) {
    yield foo(eee, 2 * eee);
}
`);
    assert.deepEqual(items, [
      {title: 'foo', subtitle: '(a, b)', line: 1, column: 9},
      {title: 'bar', subtitle: '(eee)', line: 6, column: 9},
    ]);
  });
});
