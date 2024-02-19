// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as FormatterWorker from '../../../../../front_end/entrypoints/formatter_worker/formatter_worker.js';

function evaluatableJavaScriptSubstring(text: string): string {
  return FormatterWorker.FormatterWorker.evaluatableJavaScriptSubstring(text);
}

describe('EvaluatableJavaScriptSubstring', () => {
  it('handles identifiers correctly', () => {
    assert.strictEqual(evaluatableJavaScriptSubstring('obj'), 'obj');
    assert.strictEqual(evaluatableJavaScriptSubstring('obj]'), 'obj');
    assert.strictEqual(evaluatableJavaScriptSubstring('obj)'), 'obj');
    assert.strictEqual(evaluatableJavaScriptSubstring('obj='), 'obj');
    assert.strictEqual(evaluatableJavaScriptSubstring('a+b'), 'a');
  });

  it('handles strings correctly', () => {
    assert.strictEqual(evaluatableJavaScriptSubstring('"o"'), '"o"');
    assert.strictEqual(evaluatableJavaScriptSubstring('\'o\''), '\'o\'');
  });

  it('handles numbers correctly', () => {
    assert.strictEqual(evaluatableJavaScriptSubstring('1'), '1');
    assert.strictEqual(evaluatableJavaScriptSubstring('1.40'), '1.40');
  });

  it('handles `this` correctly', () => {
    assert.strictEqual(evaluatableJavaScriptSubstring('this'), 'this');
    assert.strictEqual(evaluatableJavaScriptSubstring('this='), 'this');
    assert.strictEqual(evaluatableJavaScriptSubstring('this = 1'), 'this');
  });

  it('handles named property access chains correctly', () => {
    assert.strictEqual(evaluatableJavaScriptSubstring('a.b.c.d'), 'a.b.c.d');
    assert.strictEqual(evaluatableJavaScriptSubstring('a.b.c.d = 1'), 'a.b.c.d');
    assert.strictEqual(evaluatableJavaScriptSubstring('this.b.c.d'), 'this.b.c.d');
    assert.strictEqual(evaluatableJavaScriptSubstring('this.b.c.d = 42'), 'this.b.c.d');
    assert.strictEqual(evaluatableJavaScriptSubstring('"foo".toString'), '"foo".toString');
  });

  it('handles keyed property access chains correctly', () => {
    assert.strictEqual(evaluatableJavaScriptSubstring('this["a"]'), 'this["a"]');
    assert.strictEqual(evaluatableJavaScriptSubstring('this["a"])'), 'this["a"]');
    assert.strictEqual(evaluatableJavaScriptSubstring('bar[foo][baz]'), 'bar[foo][baz]');
    assert.strictEqual(evaluatableJavaScriptSubstring('bar[foo][baz] = '), 'bar[foo][baz]');
    assert.strictEqual(evaluatableJavaScriptSubstring('obj[x + 1][0]'), 'obj[x + 1][0]');
    assert.strictEqual(evaluatableJavaScriptSubstring('bar[foo[baz]]'), 'bar[foo[baz]]');
    assert.strictEqual(evaluatableJavaScriptSubstring('bar[foo[baz]])'), 'bar[foo[baz]]');
    assert.strictEqual(evaluatableJavaScriptSubstring('"bar"[0])'), '"bar"[0]');
  });

  it('handles mixed property access chain correctly', () => {
    assert.strictEqual(evaluatableJavaScriptSubstring('a[b[c()]].x.#y'), 'a[b[c()]].x.#y');
  });

  it('handles private field access correctly', () => {
    assert.strictEqual(evaluatableJavaScriptSubstring('this.#x'), 'this.#x');
    assert.strictEqual(evaluatableJavaScriptSubstring('this.#x = 1'), 'this.#x');
    assert.strictEqual(evaluatableJavaScriptSubstring('bar.#foo'), 'bar.#foo');
  });

  it('removes leading and trailing punctators', () => {
    assert.strictEqual(evaluatableJavaScriptSubstring('.[)x.y.z'), 'x.y.z');
    assert.strictEqual(evaluatableJavaScriptSubstring('x.y.z])='), 'x.y.z');
    assert.strictEqual(evaluatableJavaScriptSubstring('.[)x.y.z])='), 'x.y.z');
    assert.strictEqual(evaluatableJavaScriptSubstring('x.y.'), 'x.y');
  });
});
