// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Formatter from './formatter.js';

describe('FormatterWorkerPool', () => {
  describe('javaScriptScopeTree', () => {
    it('works', async () => {
      const pool = new Formatter.FormatterWorkerPool.FormatterWorkerPool();

      const scopeTree = await pool.javaScriptScopeTree('function foo() {}');

      assert.isNotNull(scopeTree);
      assert.strictEqual(scopeTree.kind, Formatter.FormatterWorkerPool.ScopeKind.GLOBAL);
      assert.strictEqual(scopeTree.children[0].kind, Formatter.FormatterWorkerPool.ScopeKind.FUNCTION);

      pool.dispose();
    });
  });

  describe('format', () => {
    it('works', async () => {
      const pool = new Formatter.FormatterWorkerPool.FormatterWorkerPool();

      const {content} = await pool.format('text/javascript', 'function foo(){console.log("hello");}', '  ');
      assert.deepEqual(content.split('\n'), [
        'function foo() {',
        '  console.log("hello");',
        '}',
        '',
      ]);

      pool.dispose();
    });
  });

  describe('javaScriptSubstitute', () => {
    it('substitutes authored names with their generated names', async () => {
      const pool = new Formatter.FormatterWorkerPool.FormatterWorkerPool();

      const result = await pool.javaScriptSubstitute('origObj.prop',
                                                     [{bindings: new Map([['origObj', 'a']]), generatedNames: []}]);
      assert.strictEqual(result, 'a.prop');

      pool.dispose();
    });

    it('rejects without crashing the worker if a variable is unavailable', async () => {
      const pool = new Formatter.FormatterWorkerPool.FormatterWorkerPool();
      const mapping =
          [{bindings: new Map<string, string|null>([['origObj', null], ['other', 'b']]), generatedNames: []}];

      try {
        await pool.javaScriptSubstitute('origObj.prop', mapping);
        assert.fail('Expected javaScriptSubstitute to reject');
      } catch (error) {
        assert.include((error as Error).message, 'Cannot substitute \'origObj\'');
      }
      // The pool keeps working afterwards.
      assert.strictEqual(await pool.javaScriptSubstitute('other', mapping), 'b');

      pool.dispose();
    });
  });
});
