// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {protocolCallFrame, stringifyFragment} from '../../testing/StackTraceHelpers.js';

// TODO(crbug.com/444191656): Expose a `testing` bundle.
// eslint-disable-next-line @devtools/es-modules-import
import * as StackTraceImpl from './stack_trace_impl.js';

const VISIBLE = StackTraceImpl.Trie.FrameKind.VISIBLE;
const OUTLINED = StackTraceImpl.Trie.FrameKind.OUTLINED;
const HIDDEN = StackTraceImpl.Trie.FrameKind.HIDDEN;

interface NodeOptions {
  /** The function keys as 'top/bottom'. */
  keys?: string;
  /** The parsed `Error.stack` info of the raw frame. */
  info?: StackTraceImpl.Trie.ParsedFrameInfo;
  /** Whether the raw frame is a builtin frame (no URL, script or position). */
  builtin?: boolean;
  /** Whether the translation shows generated code. */
  unmapped?: boolean;
}

interface NodeSpec extends Omit<NodeOptions, 'keys'> {
  rawName: string;
  kind: StackTraceImpl.Trie.FrameKind;
  frames: string[];
  keys?: StackTraceImpl.Trie.FunctionKeys;
}

/** @param frames The translated frames as 'name@line:column', top first. */
function node(rawName: string, kind: StackTraceImpl.Trie.FrameKind, frames: string[] = [],
              {keys, ...options}: NodeOptions = {}): NodeSpec {
  const [top, bottom] = keys?.split('/') ?? [];
  return {rawName, kind, frames, keys: keys ? {top, bottom} : undefined, ...options};
}

/** Inserts one raw frame per spec (top first) into a trie and applies the specs to the resulting call stack. */
function callStack(...specs: NodeSpec[]): StackTraceImpl.Trie.FrameNode[] {
  const trie = new StackTraceImpl.Trie.Trie();
  const leaf = trie.insert(specs.map(
      (spec, i) => protocolCallFrame(spec.builtin ? `::${spec.rawName}::` : `bundle.js:1:${spec.rawName}:0:${i}`)));
  const stack = [...leaf.getCallStack()];
  stack.forEach((n, i) => {
    const {rawName, kind, frames, keys, info, unmapped} = specs[i];
    n.kind = kind;
    n.functionKeys = keys;
    n.parsedFrameInfo = info;
    n.isUnmapped = Boolean(unmapped);
    n.frames = frames.map((frame, k) => {
      const [, name, line, column] = /^(.*)@(\d+):(\d+)$/.exec(frame) ?? [];
      return new StackTraceImpl.StackTraceImpl.FrameImpl('src.ts', undefined, name, Number(line), Number(column),
                                                         undefined, rawName, undefined, k < frames.length - 1);
    });
  });
  return stack;
}

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
      const [outlined, helper, caller] = node.getCallStack();
      outlined.kind = StackTraceImpl.Trie.FrameKind.OUTLINED;
      outlined.functionKeys = {top: 'foo', bottom: 'foo'};
      outlined.frames = [new FrameImpl('foo.ts', undefined, 'foo', 1, 0)];
      helper.kind = StackTraceImpl.Trie.FrameKind.HIDDEN;
      caller.functionKeys = {top: 'foo', bottom: 'foo'};
      caller.frames = [new FrameImpl('foo.ts', undefined, 'foo', 2, 0)];
      const fragment = FragmentImpl.getOrCreate(node);

      assert.strictEqual(stringifyFragment(fragment), 'at foo (foo.ts:1:0)');
    });

    it('handles empty fragments correctly', () => {
      assert.lengthOf(FragmentImpl.EMPTY_FRAGMENT.frames, 0);
    });
  });
});

describe('consolidate', () => {
  const {consolidate} = StackTraceImpl.StackTraceImpl;

  function summarize(logicalFrames: StackTraceImpl.StackTraceImpl.LogicalFrame[]): string[] {
    return logicalFrames.map(({frame, nodeIndex, inlineIndex}) => `${frame.name}@${frame.line}:${frame.column} (${
                                 nodeIndex},${inlineIndex})${frame.isInline ? ' inline' : ''} raw=${frame.rawName}`);
  }

  it('returns the frames of VISIBLE nodes as is', () => {
    const stack = callStack(
        node('a', VISIBLE, ['a@1:0']),
        node('b', VISIBLE, ['inlined@2:0', 'b@3:0']),
    );

    const result = consolidate(stack);

    assert.deepEqual(summarize(result), [
      'a@1:0 (0,0) raw=a',
      'inlined@2:0 (1,0) inline raw=b',
      'b@3:0 (1,1) raw=b',
    ]);
    result.forEach(({frame, node, inlineIndex}) => assert.strictEqual(frame, node.frames[inlineIndex]));
    assert.deepEqual(result.map(({invocationNode}) => invocationNode), [stack[0], undefined, stack[1]]);
  });

  it('drops HIDDEN nodes', () => {
    const stack = callStack(
        node('a', VISIBLE, ['a@1:0']),
        node('helper', HIDDEN),
        node('b', VISIBLE, ['b@3:0']),
    );

    assert.deepEqual(summarize(consolidate(stack)), [
      'a@1:0 (0,0) raw=a',
      'b@3:0 (2,0) raw=b',
    ]);
  });

  it('merges an OUTLINED node with its VISIBLE caller of the same function', () => {
    const stack = callStack(
        node('_o', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
        node('outer', VISIBLE, ['outer@5:2'], {keys: 'outer/outer'}),
    );

    const result = consolidate(stack);

    assert.deepEqual(summarize(result), ['outer@2:4 (0,0) raw=outer']);
    assert.strictEqual(result[0].node, stack[0]);
    assert.strictEqual(result[0].invocationNode, stack[1]);
    assert.notStrictEqual(result[0].frame, stack[0].frames[0], 'merged frames are copies');
  });

  it('merges an OUTLINED node with its caller across HIDDEN nodes', () => {
    const stack = callStack(
        node('_o', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
        node('helper', HIDDEN),
        node('outer', VISIBLE, ['outer@5:2'], {keys: 'outer/outer'}),
    );

    assert.deepEqual(summarize(consolidate(stack)), ['outer@2:4 (0,0) raw=outer']);
  });

  it('shows an OUTLINED node at the stack bottom without a raw name', () => {
    const stack = callStack(
        node('f', VISIBLE, ['f@1:0'], {keys: 'f/f'}),
        node('_o', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
    );

    const result = consolidate(stack);

    assert.deepEqual(summarize(result), [
      'f@1:0 (0,0) raw=f',
      'outer@2:4 (1,0) raw=undefined',
    ]);
    assert.isUndefined(result[1].invocationNode);
  });

  it('does not merge an OUTLINED node with a caller of a different function', () => {
    const stack = callStack(
        node('_o', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
        node('main', VISIBLE, ['main@9:2'], {keys: 'main/main'}),
    );

    const result = consolidate(stack);

    assert.deepEqual(summarize(result), [
      'outer@2:4 (0,0) raw=undefined',
      'main@9:2 (1,0) raw=main',
    ]);
    assert.strictEqual(result[1].frame, stack[1].frames[0]);
  });

  it('does not merge an OUTLINED node with a caller without function keys', () => {
    const stack = callStack(
        node('_o', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
        node('main', VISIBLE, ['main@9:2']),
    );

    assert.deepEqual(summarize(consolidate(stack)), [
      'outer@2:4 (0,0) raw=undefined',
      'main@9:2 (1,0) raw=main',
    ]);
  });

  it('merges nested outlined functions with inlined frames at both ends', () => {
    // `main` calls `outer`, which is inlined into `main`. Block B1 of `outer` is outlined into `_o1`, B1's inner
    // block B2 into `_o2`. B2 calls `g`, which is inlined into `_o2`.
    const stack = callStack(
        node('_o2', OUTLINED, ['g@2:4', 'outer@3:6'], {keys: 'g/outer'}),
        node('_o1', OUTLINED, ['outer@4:2'], {keys: 'outer/outer'}),
        node('main', VISIBLE, ['outer@5:2', 'main@9:2'], {keys: 'outer/main'}),
    );

    const result = consolidate(stack);

    assert.deepEqual(summarize(result), [
      'g@2:4 (0,0) inline raw=main',
      'outer@3:6 (0,1) inline raw=main',
      'main@9:2 (2,1) raw=main',
    ]);
    assert.deepEqual(result.map(({node}) => node), [stack[0], stack[0], stack[2]]);
    assert.deepEqual(result.map(({invocationNode}) => invocationNode), [undefined, undefined, stack[2]]);
  });

  it('handles two consecutive chains', () => {
    const stack = callStack(
        node('_o1', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
        node('outer', VISIBLE, ['outer@3:0'], {keys: 'outer/outer'}),
        node('_o2', OUTLINED, ['main@7:2'], {keys: 'main/main'}),
        node('main', VISIBLE, ['main@8:0'], {keys: 'main/main'}),
    );

    assert.deepEqual(summarize(consolidate(stack)), [
      'outer@2:4 (0,0) raw=outer',
      'main@7:2 (2,0) raw=main',
    ]);
  });

  it('starts a new chain at an OUTLINED node of a different function', () => {
    const stack = callStack(
        node('_o1', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
        node('_o2', OUTLINED, ['main@7:2'], {keys: 'main/main'}),
        node('main', VISIBLE, ['main@8:0'], {keys: 'main/main'}),
    );

    assert.deepEqual(summarize(consolidate(stack)), [
      'outer@2:4 (0,0) raw=undefined',
      'main@7:2 (1,0) raw=main',
    ]);
  });

  it('returns nothing for an empty call stack', () => {
    assert.deepEqual(consolidate([]), []);
  });

  it('drops a HIDDEN top node above inlined frames', () => {
    const stack = callStack(
        node('helper', HIDDEN),
        node('b', VISIBLE, ['a@1:0', 'b@2:0']),
    );

    assert.deepEqual(summarize(consolidate(stack)), [
      'a@1:0 (1,0) inline raw=b',
      'b@2:0 (1,1) raw=b',
    ]);
  });

  it('drops HIDDEN nodes after a chain that reaches the stack bottom', () => {
    const stack = callStack(
        node('_o', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
        node('helper', HIDDEN),
    );

    assert.deepEqual(summarize(consolidate(stack)), ['outer@2:4 (0,0) raw=undefined']);
  });

  it('drops HIDDEN nodes between two chains', () => {
    const stack = callStack(
        node('_o1', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
        node('outer', VISIBLE, ['outer@3:0'], {keys: 'outer/outer'}),
        node('helper', HIDDEN),
        node('_o2', OUTLINED, ['main@7:2'], {keys: 'main/main'}),
        node('main', VISIBLE, ['main@8:0'], {keys: 'main/main'}),
    );

    assert.deepEqual(summarize(consolidate(stack)), [
      'outer@2:4 (0,0) raw=outer',
      'main@7:2 (3,0) raw=main',
    ]);
  });

  it('handles an OUTLINED node without function keys like a VISIBLE node', () => {
    const stack = callStack(
        node('_o', OUTLINED, ['outer@2:4']),
        node('outer', VISIBLE, ['outer@5:2'], {keys: 'outer/outer'}),
    );

    const result = consolidate(stack);

    assert.deepEqual(summarize(result), [
      'outer@2:4 (0,0) raw=_o',
      'outer@5:2 (1,0) raw=outer',
    ]);
    assert.strictEqual(result[0].frame, stack[0].frames[0]);
  });

  it('merges a chain across unmapped builtin frames', () => {
    const stack = callStack(
        node('_o', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
        node('forEach', VISIBLE, ['forEach@0:0'], {builtin: true, unmapped: true}),
        node('outer', VISIBLE, ['outer@5:2'], {keys: 'outer/outer'}),
    );

    const result = consolidate(stack);

    assert.deepEqual(summarize(result), ['outer@2:4 (0,0) raw=outer']);
    assert.strictEqual(result[0].invocationNode, stack[2]);
  });

  it('shows builtin frames if the chain does not continue after them', () => {
    const stack = callStack(
        node('_o', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
        node('forEach', VISIBLE, ['forEach@0:0'], {builtin: true, unmapped: true}),
        node('other', VISIBLE, ['other@7:0'], {keys: 'other/other'}),
    );

    assert.deepEqual(summarize(consolidate(stack)), [
      'outer@2:4 (0,0) raw=undefined',
      'forEach@0:0 (1,0) raw=forEach',
      'other@7:0 (2,0) raw=other',
    ]);
  });

  it('does not look past builtin frames that a translation did not mark as unmapped', () => {
    // In production, builtins are always unmapped. Custom translations decide for themselves.
    const stack = callStack(
        node('_o', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
        node('forEach', VISIBLE, ['forEach@0:0'], {builtin: true}),
        node('outer', VISIBLE, ['outer@5:2'], {keys: 'outer/outer'}),
    );

    assert.deepEqual(summarize(consolidate(stack)), [
      'outer@2:4 (0,0) raw=undefined',
      'forEach@0:0 (1,0) raw=forEach',
      'outer@5:2 (2,0) raw=outer',
    ]);
  });

  it('does not merge builtin frames above an OUTLINED node', () => {
    const stack = callStack(
        node('map', VISIBLE, ['map@0:0'], {builtin: true, unmapped: true}),
        node('_o', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
        node('outer', VISIBLE, ['outer@5:2'], {keys: 'outer/outer'}),
    );

    assert.deepEqual(summarize(consolidate(stack)), [
      'map@0:0 (0,0) raw=map',
      'outer@2:4 (1,0) raw=outer',
    ]);
  });

  it('merges a chain across unmapped and HIDDEN frames', () => {
    const stack = callStack(
        node('_o', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
        node('runtime', VISIBLE, ['runtime@3:0'], {unmapped: true}),
        node('helper', HIDDEN),
        node('outer', VISIBLE, ['outer@5:2'], {keys: 'outer/outer'}),
    );

    const result = consolidate(stack);

    assert.deepEqual(summarize(result), ['outer@2:4 (0,0) raw=outer']);
    assert.strictEqual(result[0].invocationNode, stack[3]);
  });

  it('shows unmapped frames if the chain reaches the stack bottom', () => {
    const stack = callStack(
        node('_o', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
        node('runtime1', VISIBLE, ['runtime1@3:0'], {unmapped: true}),
        node('runtime2', VISIBLE, ['runtime2@4:0'], {unmapped: true}),
    );

    assert.deepEqual(summarize(consolidate(stack)), [
      'outer@2:4 (0,0) raw=undefined',
      'runtime1@3:0 (1,0) raw=runtime1',
      'runtime2@4:0 (2,0) raw=runtime2',
    ]);
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

  function parsedFrames(stack: StackTraceImpl.Trie.FrameNode[]):
      StackTraceImpl.StackTraceImpl.ParsedErrorStackFrameImpl[] {
    return new ParsedErrorStackFragmentImpl(FragmentImpl.getOrCreate(stack[0])).frames;
  }

  it('takes location properties from the frame\'s node and invocation properties from the terminator', () => {
    const frames = parsedFrames(callStack(
        node('_o', OUTLINED, ['outer@2:4'], {keys: 'outer/outer', info: {isAsync: false}}),
        node('outer', VISIBLE, ['outer@5:2', 'main@9:2'], {
          keys: 'outer/main',
          info: {isAsync: true, isConstructor: true, typeName: 'Foo', methodName: 'bar'},
        }),
        ));

    assert.deepEqual(frames.map(f => f.name), ['outer', 'main']);
    assert.deepEqual(frames.map(f => f.isAsync), [false, true]);
    assert.deepEqual(frames.map(f => f.isConstructor), [undefined, true]);
    assert.deepEqual(frames.map(f => f.typeName), [undefined, 'Foo']);
    assert.deepEqual(frames.map(f => f.methodName), [undefined, 'bar']);
  });

  it('has no invocation properties for a chain without terminator', () => {
    const frames = parsedFrames(callStack(
        node('_o', OUTLINED, ['outer@2:4'], {keys: 'outer/outer', info: {isAsync: true, isConstructor: true}}),
        ));

    assert.lengthOf(frames, 1);
    assert.isTrue(frames[0].isAsync);
    assert.isUndefined(frames[0].isConstructor);
  });

  it('only sets invocation properties on the last frame of an inlined group', () => {
    const frames = parsedFrames(callStack(
        node('b', VISIBLE, ['a@1:0', 'b@2:0'], {info: {isAsync: true, isConstructor: true, typeName: 'B'}}),
        ));

    assert.deepEqual(frames.map(f => f.isAsync), [true, true]);
    assert.deepEqual(frames.map(f => f.isConstructor), [undefined, true]);
    assert.deepEqual(frames.map(f => f.typeName), [undefined, 'B']);
  });

  it('takes the evalOrigin from the frame\'s node', () => {
    const stack = callStack(
        node('_o', OUTLINED, ['outer@2:4'], {keys: 'outer/outer'}),
        node('outer', VISIBLE, ['outer@5:2', 'main@9:2'], {keys: 'outer/main'}),
    );
    stack[0].evalOrigin = new EvalOrigin([new FrameImpl('a.ts', undefined, 'evalA', 1, 0)]);
    stack[1].evalOrigin = new EvalOrigin([new FrameImpl('b.ts', undefined, 'evalB', 2, 0)]);

    const frames = parsedFrames(stack);

    assert.deepEqual(frames.map(f => f.evalOrigin?.name), ['evalA', 'evalB']);
  });

  it('keeps the invocation properties of an evalOrigin', () => {
    const stack = callStack(node('foo', VISIBLE, ['foo@1:0'], {
      info: {
        isEval: true,
        evalOrigin: {
          url: 'caller.js',
          functionName: 'Foo',
          lineNumber: 4,
          columnNumber: 2,
          parsedFrameInfo: {isConstructor: true},
        },
      },
    }));
    stack[0].evalOrigin = new EvalOrigin([new FrameImpl('caller.ts', undefined, 'Foo', 4, 2)]);

    const frames = parsedFrames(stack);

    assert.isTrue(frames[0].isEval);
    assert.isTrue(frames[0].evalOrigin?.isConstructor);
  });

  it('takes location properties of frames contributed by a middle chain member from that member', () => {
    const frames = parsedFrames(callStack(
        node('_o2', OUTLINED, ['g@2:4'], {keys: 'g/g'}),
        node('_o1', OUTLINED, ['g@3:0', 'outer@4:2'], {keys: 'g/outer', info: {isAsync: true}}),
        node('main', VISIBLE, ['outer@5:2', 'main@9:2'], {keys: 'outer/main', info: {isAsync: false}}),
        ));

    assert.deepEqual(frames.map(f => f.name), ['g', 'outer', 'main']);
    assert.deepEqual(frames.map(f => f.isAsync), [undefined, true, false]);
  });
});
