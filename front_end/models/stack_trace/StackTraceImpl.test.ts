// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {protocolCallFrame} from '../../testing/StackTraceHelpers.js';

import * as StackTraceImpl from './stack_trace_impl.js';

describe('FragmentImpl', () => {
  const {FragmentImpl, FrameImpl} = StackTraceImpl.StackTraceImpl;

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

  describe('frames', () => {
    function identity(rawFrame: StackTraceImpl.Trie.RawFrame): StackTraceImpl.StackTraceImpl.FrameImpl {
      return new FrameImpl(rawFrame.url, undefined, rawFrame.functionName, rawFrame.lineNumber, rawFrame.columnNumber);
    }

    function toDescriptorString(frame: StackTraceImpl.StackTraceImpl.FrameImpl): string {
      return [
        frame.uiSourceCode ? frame.uiSourceCode.contentURL() : (frame.url ?? ''),
        frame.name ?? '',
        frame.line,
        frame.column,
      ].join(':');
    }

    it('returns the call stack', () => {
      const trie = new StackTraceImpl.Trie.Trie();
      const node = trie.insert(['foo.js:1:foo:1:10', 'bar.js:2:bar:2:20'].map(protocolCallFrame));
      for (const n of node.getCallStack()) {
        n.frames = [identity(n.rawFrame)];
      }
      const fragment = FragmentImpl.getOrCreate(node);

      assert.deepEqual(fragment.frames.map(toDescriptorString), ['foo.js:foo:1:10', 'bar.js:bar:2:20']);
    });

    it('handles inlined frames correctly', () => {
      const trie = new StackTraceImpl.Trie.Trie();
      const node = trie.insert(['foo.js:1:foo:1:10', 'bar.js:2:bar:2:20'].map(protocolCallFrame));
      for (const n of node.getCallStack()) {
        n.frames = [identity(n.rawFrame)];
      }
      node.frames.unshift(new FrameImpl('inlined.ts', undefined, 'inlinedFn', 3, 30));
      const fragment = FragmentImpl.getOrCreate(node);

      assert.deepEqual(
          fragment.frames.map(toDescriptorString), ['inlined.ts:inlinedFn:3:30', 'foo.js:foo:1:10', 'bar.js:bar:2:20']);
    });

    it('handles outlined frames correctly', () => {
      const trie = new StackTraceImpl.Trie.Trie();
      const node =
          trie.insert(['bundle.js:1:foo:1:10', 'bundle.js:1:bar:2:20', 'bundle.js:1:baz:3:30'].map(protocolCallFrame));
      node.frames = [new FrameImpl('foo.ts', undefined, 'foo', 1, 0)];
      const fragment = FragmentImpl.getOrCreate(node);

      assert.deepEqual(fragment.frames.map(toDescriptorString), ['foo.ts:foo:1:0']);
    });
  });
});
