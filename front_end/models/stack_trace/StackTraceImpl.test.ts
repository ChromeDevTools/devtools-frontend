// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {protocolCallFrame, stringifyFragment} from '../../testing/StackTraceHelpers.js';

// TODO(crbug.com/444191656): Expose a `testing` bundle.
// eslint-disable-next-line @devtools/es-modules-import
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

    it('returns the call stack', () => {
      const trie = new StackTraceImpl.Trie.Trie();
      const node = trie.insert(['foo.js:1:foo:1:10', 'bar.js:2:bar:2:20'].map(protocolCallFrame));
      for (const n of node.getCallStack()) {
        n.frames = [identity(n.rawFrame)];
      }
      const fragment = FragmentImpl.getOrCreate(node);

      assert.strictEqual(stringifyFragment(fragment), [
        'at foo (foo.js:1:10)',
        'at bar (bar.js:2:20)',
      ].join('\n'));
    });

    it('handles inlined frames correctly', () => {
      const trie = new StackTraceImpl.Trie.Trie();
      const node = trie.insert(['foo.js:1:foo:1:10', 'bar.js:2:bar:2:20'].map(protocolCallFrame));
      for (const n of node.getCallStack()) {
        n.frames = [identity(n.rawFrame)];
      }
      node.frames.unshift(new FrameImpl('inlined.ts', undefined, 'inlinedFn', 3, 30));
      const fragment = FragmentImpl.getOrCreate(node);

      assert.strictEqual(stringifyFragment(fragment), [
        'at inlinedFn (inlined.ts:3:30)',
        'at foo (foo.js:1:10)',
        'at bar (bar.js:2:20)',
      ].join('\n'));
    });

    it('handles outlined frames correctly', () => {
      const trie = new StackTraceImpl.Trie.Trie();
      const node =
          trie.insert(['bundle.js:1:foo:1:10', 'bundle.js:1:bar:2:20', 'bundle.js:1:baz:3:30'].map(protocolCallFrame));
      node.frames = [new FrameImpl('foo.ts', undefined, 'foo', 1, 0)];
      const fragment = FragmentImpl.getOrCreate(node);

      assert.strictEqual(stringifyFragment(fragment), 'at foo (foo.ts:1:0)');
    });

    it('handles empty fragments correctly', () => {
      assert.lengthOf(FragmentImpl.EMPTY_FRAGMENT.frames, 0);
    });
  });
});

describe('ParsedErrorStackFragmentImpl', () => {
  const {ParsedErrorStackFragmentImpl, FragmentImpl, FrameImpl} = StackTraceImpl.StackTraceImpl;
  const {EvalOrigin} = StackTraceImpl.Trie;

  it('recursively exposes nested evalOrigin frames pointing only to index-0 inlined frames', () => {
    const trie = new StackTraceImpl.Trie.Trie();
    const node = trie.insert([protocolCallFrame('foo.js:1:foo:1:10')]);

    // 1. Setup translated frames for the main call frame
    node.frames = [new FrameImpl('foo.js', undefined, 'foo', 1, 10)];

    // 2. Setup nested recursively structured evalOrigin contexts
    // Level 2 (parent eval): intermediateCaller (has inlined frames)
    const level2Origin = new EvalOrigin([
      new FrameImpl('inlined_base.ts', undefined, 'inlinedBaseFn', 8, 80),
      new FrameImpl('base.ts', undefined, 'baseFn', 12, 120),
    ]);
    // Level 1 (immediate eval): evalCaller
    const level1Origin = new EvalOrigin(
        [new FrameImpl('eval_caller.ts', undefined, 'evalCallerFn', 4, 40)],
        level2Origin,
    );

    node.evalOrigin = level1Origin;

    const fragment = new ParsedErrorStackFragmentImpl(FragmentImpl.getOrCreate(node));
    const parsedFrames = fragment.frames;

    assert.lengthOf(parsedFrames, 1);
    assert.strictEqual(parsedFrames[0].url, 'foo.js');

    // Level 1 evaluation: evalCaller
    const origin1 = parsedFrames[0].evalOrigin;
    assert.exists(origin1);
    assert.strictEqual(origin1?.url, 'eval_caller.ts');
    assert.strictEqual(origin1?.name, 'evalCallerFn');
    assert.strictEqual(origin1?.line, 4);

    // Level 2 evaluation: base (maps to index 0 of the level 2 frames array: inlinedBaseFn!)
    const origin2 = origin1?.evalOrigin;
    assert.exists(origin2);
    assert.strictEqual(origin2?.url, 'inlined_base.ts');
    assert.strictEqual(origin2?.name, 'inlinedBaseFn');
    assert.strictEqual(origin2?.line, 8);

    // Outermost level: undefined
    assert.isUndefined(origin2?.evalOrigin);
  });
});
