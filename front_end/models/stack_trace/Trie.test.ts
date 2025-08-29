// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {protocolCallFrame} from '../../testing/StackTraceHelpers.js';

import * as StackTraceImpl from './stack_trace_impl.js';

describe('Trie', () => {
  describe('insert', () => {
    it('throws for empty stack traces', () => {
      const trie = new StackTraceImpl.Trie.Trie();

      assert.throws(() => trie.insert([]));
    });

    it('returns the same node when inserting the same frame twice', () => {
      const trie = new StackTraceImpl.Trie.Trie();
      const frame = protocolCallFrame('foo.js:1:foo:1:10');

      const node1 = trie.insert([frame]);
      const node2 = trie.insert([frame]);

      assert.strictEqual(node1, node2);
      assert.strictEqual(StackTraceImpl.Trie.compareRawFrames(frame, node1.rawFrame), 0);
    });

    it('returns different nodes when inserting different frames', () => {
      const trie = new StackTraceImpl.Trie.Trie();
      const frame1 = protocolCallFrame('foo.js:1:foo:1:10');
      const frame2 = protocolCallFrame('foo.js:1:bar:2:20');

      const node1 = trie.insert([frame1]);
      const node2 = trie.insert([frame2]);

      assert.notStrictEqual(node1, node2);
      assert.strictEqual(StackTraceImpl.Trie.compareRawFrames(frame1, node1.rawFrame), 0);
      assert.strictEqual(StackTraceImpl.Trie.compareRawFrames(frame2, node2.rawFrame), 0);
    });

    it('creates 3 nodes for 2 stack traces with 1 shared parent call frame', () => {
      const trie = new StackTraceImpl.Trie.Trie();

      const node1 = trie.insert([
        'foo.js::x:1:10',
        'foo.js::y:2:20',
      ].map(protocolCallFrame));
      const node2 = trie.insert([
        'foo.js::x:1:15',
        'foo.js::y:2:20',
      ].map(protocolCallFrame));

      assert.strictEqual(node1.rawFrame.columnNumber, 10);
      assert.strictEqual(node2.rawFrame.columnNumber, 15);

      assert.strictEqual(node1.parent, node2.parent);
    });
  });

  describe('getCallStack', () => {
    it('returns FrameNodes top to bottom', () => {
      const trie = new StackTraceImpl.Trie.Trie();
      const node = trie.insert([
        'foo.js:1:foo:1:10',
        'bar.js:2:bar:2:20',
      ].map(protocolCallFrame));

      const urls = [...node.getCallStack()].map(node => node.rawFrame.url);
      assert.deepEqual(urls, ['foo.js', 'bar.js']);
    });
  });

  describe('walk', () => {
    function setupTrie() {
      const trie = new StackTraceImpl.Trie.Trie();
      const frameA = protocolCallFrame('a.js:1:a:1:10');
      const frameB = protocolCallFrame('b.js:2:b:2:20');
      const frameC = protocolCallFrame('c.js:3:c:3:30');
      const frameD = protocolCallFrame('d.js:4:d:4:40');

      // stack trace C -> B -> A
      const nodeC = trie.insert([frameC, frameB, frameA]);
      // stack trace D -> A
      const nodeD = trie.insert([frameD, frameA]);

      const nodeB = nodeC.parent as StackTraceImpl.Trie.FrameNode;
      const nodeA = nodeB.parent as StackTraceImpl.Trie.FrameNode;
      assert.strictEqual(nodeD.parent, nodeA);

      return {trie, nodeA, nodeB, nodeC, nodeD};
    }

    it('walks the whole trie', () => {
      const {trie, nodeA, nodeB, nodeC, nodeD} = setupTrie();
      const visited: StackTraceImpl.Trie.FrameNode[] = [];

      trie.walk(null, node => {
        visited.push(node);
        return true;
      });

      assert.deepEqual(visited, [nodeA, nodeB, nodeC, nodeD]);
    });

    it('can start walking from a given node', () => {
      const {trie, nodeB, nodeC} = setupTrie();
      const visited: StackTraceImpl.Trie.FrameNode[] = [];

      trie.walk(nodeB, node => {
        visited.push(node);
        return true;
      });

      assert.deepEqual(visited, [nodeB, nodeC]);
    });

    it('does not walk children if the callback returns false', () => {
      const {trie, nodeA, nodeB, nodeD} = setupTrie();
      const visited: StackTraceImpl.Trie.FrameNode[] = [];

      trie.walk(null, node => {
        visited.push(node);
        return node !== nodeB;
      });

      assert.deepEqual(visited, [nodeA, nodeB, nodeD]);
    });
  });
});
