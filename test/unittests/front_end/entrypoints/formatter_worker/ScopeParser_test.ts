// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as FormatterWorker from '../../../../../front_end/entrypoints/formatter_worker/formatter_worker.js';

describe('ScopeParser', () => {
  it('parses simple function', () => {
    const scopes = FormatterWorker.ScopeParser.parseScopes('function foo(a){}');

    const innerScope = scopes?.children[0];
    assert.strictEqual(innerScope?.start, 12);
    assert.strictEqual(innerScope?.end, 17);
    assert.deepEqual(innerScope?.variables?.get('a')?.uses.map(u => u.offset), [13]);
  });

  it('parses arrow function', () => {
    const scopes = FormatterWorker.ScopeParser.parseScopes('let f = (a) => {}');

    assert.strictEqual(scopes?.children.length, 1);
    const innerScope = scopes?.children[0];
    assert.strictEqual(innerScope?.start, 8);
    assert.strictEqual(innerScope?.end, 17);
    assert.deepEqual(innerScope?.variables?.size, 1);
    assert.deepEqual(innerScope?.variables?.get('a')?.uses.map(u => u.offset), [9]);
  });

  it('parses for loop', () => {
    const scopes = FormatterWorker.ScopeParser.parseScopes('for (let i = 0; i < 3; i++) console.log(i);');

    const innerScope = scopes?.children[0];
    assert.strictEqual(innerScope?.start, 0);
    assert.strictEqual(innerScope?.end, 43);
    assert.deepEqual(innerScope?.variables?.size, 1);
    assert.deepEqual(innerScope?.variables?.get('i')?.uses.map(u => u.offset), [9, 16, 23, 40]);
  });

  it('parses block scope', () => {
    const scopes = FormatterWorker.ScopeParser.parseScopes('let x; { let y; }');

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
});
