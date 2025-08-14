// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {protocolCallFrame} from '../../testing/StackTraceHelpers.js';

import * as StackTraceImpl from './stack_trace_impl.js';

describe('FragmentImpl', () => {
  const {FragmentImpl} = StackTraceImpl.StackTraceImpl;

  describe('getOrCreate', () => {
    it('returns the same fragment for the same node', () => {
      const trie = new StackTraceImpl.Trie.Trie();
      const node = trie.insert([protocolCallFrame('foo.js:1:foo:1:10')]);

      assert.strictEqual(FragmentImpl.getOrCreate(node), FragmentImpl.getOrCreate(node));
    });

    it('returns different fragments for different nodes', () => {
      const trie = new StackTraceImpl.Trie.Trie();
      const node1 = trie.insert([protocolCallFrame('foo.js:1:foo:1:10')]);
      const node2 = trie.insert([protocolCallFrame('bar.js:2:bar:2:20')]);

      assert.notStrictEqual(FragmentImpl.getOrCreate(node1), FragmentImpl.getOrCreate(node2));
    });
  });
});
