// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as StackTraceImpl from './stack_trace_impl.js';

describe('Trie', () => {
  describe('insert', () => {
    it('throws for empty stack traces', () => {
      const trie = new StackTraceImpl.Trie.Trie();

      assert.throws(() => trie.insert([]));
    });
  });
});
