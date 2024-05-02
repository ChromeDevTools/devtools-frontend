// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {parseScopeChain} from './MockScopeChain.js';

describe('Scope test string parser', () => {
  it('test helper parses scopes from test descriptor', () => {
    //    source = 'function f(x) { g(x); {let a = x, return a} }';
    const scopes = '          {           <    B             B> }';
    const [scope, functionScope] = parseScopeChain(scopes);
    assert.strictEqual(functionScope.startColumn, 10);
    assert.strictEqual(functionScope.endColumn, 45);
    assert.strictEqual(scope.startColumn, 22);
    assert.strictEqual(scope.endColumn, 43);
  });

  it('test helper parses function scope from test descriptor', () => {
    //    source = 'function f(x) { g(x); {let a = x, return a} }';
    const scopes = '          {B      B            B            }';
    const [functionScope] = parseScopeChain(scopes);
    assert.strictEqual(functionScope.startColumn, 10);
    assert.strictEqual(functionScope.endColumn, 45);
  });
});
