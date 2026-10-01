// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Workspace from '../workspace/workspace.js';

// eslint-disable-next-line @devtools/es-modules-import
import type * as StackTrace from './stack_trace.js';
import {type EvalOrigin, FrameKind, type FrameNode, type ParsedFrameInfo} from './Trie.js';

export type AnyStackTraceImpl = StackTraceImpl<FragmentImpl|DebuggableFragmentImpl|ParsedErrorStackFragmentImpl>;

export class StackTraceImpl<SyncFragmentT extends FragmentImpl|DebuggableFragmentImpl|ParsedErrorStackFragmentImpl =
                                                      FragmentImpl> extends
    Common.ObjectWrapper.ObjectWrapper<StackTrace.StackTrace.EventTypes> implements
        StackTrace.StackTrace.BaseStackTrace<SyncFragmentT> {
  readonly syncFragment: SyncFragmentT;
  readonly asyncFragments: readonly AsyncFragmentImpl[];

  constructor(syncFragment: SyncFragmentT, asyncFragments: AsyncFragmentImpl[]) {
    super();
    this.syncFragment = syncFragment;
    this.asyncFragments = asyncFragments;

    const fragment =
        (syncFragment instanceof DebuggableFragmentImpl || syncFragment instanceof ParsedErrorStackFragmentImpl) ?
        syncFragment.fragment :
        syncFragment as FragmentImpl;
    fragment.stackTraces.add(this);

    this.asyncFragments.forEach(asyncFragment => asyncFragment.fragment.stackTraces.add(this));
  }
}

export class FragmentImpl implements StackTrace.StackTrace.Fragment {
  static readonly EMPTY_FRAGMENT: FragmentImpl = new FragmentImpl();

  readonly node?: FrameNode;
  readonly stackTraces: Set<AnyStackTraceImpl> = new Set<AnyStackTraceImpl>();

  /**
   * Fragments are deduplicated based on the node.
   *
   * In turn, each fragment can be part of multiple stack traces.
   */
  static getOrCreate(node: FrameNode): FragmentImpl {
    if (!node.fragment) {
      node.fragment = new FragmentImpl(node);
    }
    return node.fragment;
  }

  private constructor(node?: FrameNode) {
    this.node = node;
  }

  get frames(): FrameImpl[] {
    return this.node ? consolidate([...this.node.getCallStack()]).map(({frame}) => frame) : [];
  }
}

export class AsyncFragmentImpl implements StackTrace.StackTrace.AsyncFragment {
  constructor(readonly description: string, readonly fragment: FragmentImpl) {
  }

  get frames(): StackTrace.StackTrace.Frame[] {
    return this.fragment.frames;
  }
}

export class FrameImpl implements StackTrace.StackTrace.Frame {
  readonly url?: string;
  readonly uiSourceCode?: Workspace.UISourceCode.UISourceCode;
  readonly name?: string;
  readonly line: number;
  readonly column: number;

  readonly missingDebugInfo?: StackTrace.StackTrace.MissingDebugInfo;
  readonly rawName?: string;
  readonly isWasm?: boolean;
  readonly isInline?: boolean;

  constructor(url: string|undefined, uiSourceCode: Workspace.UISourceCode.UISourceCode|undefined,
              name: string|undefined, line: number, column: number,
              missingDebugInfo?: StackTrace.StackTrace.MissingDebugInfo, rawName?: string, isWasm?: boolean,
              isInline?: boolean) {
    this.url = url;
    this.uiSourceCode = uiSourceCode;
    this.name = name;
    this.line = line;
    this.column = column;
    this.missingDebugInfo = missingDebugInfo;
    this.rawName = rawName;
    this.isWasm = isWasm;
    this.isInline = isInline;
  }
}

/** A frame of a fragment after outlined frames were merged with their callers. */
export interface LogicalFrame {
  /** Node frame for non-merged groups (same identity as `node.frames[inlineIndex]`), a fresh copy for merged groups. */
  readonly frame: FrameImpl;
  /** The node this frame was translated from. */
  readonly node: FrameNode;
  /** Index of `node` in the call stack (0 = top). Equals the index into `DebuggerPausedDetails.callFrames`. */
  readonly nodeIndex: number;
  /** Index of `frame` in `node.frames`. Equals `CallFrame.inlineFrameIndex`. */
  readonly inlineIndex: number;
  /** Set only on the last frame of a group: the node that physically invoked this logical frame. */
  readonly invocationNode?: FrameNode;
}

/**
 * Drops HIDDEN nodes and merges each OUTLINED node with its callers into one group of logical frames.
 *
 * The chain continues with callers whose `functionKeys.top` equals the previous member's `functionKeys.bottom`,
 * skipping HIDDEN and not-authored nodes. It ends with the first VISIBLE member (the terminator), or before a
 * non-matching caller.
 */
export function consolidate(callStack: readonly FrameNode[]): LogicalFrame[] {
  const result: LogicalFrame[] = [];
  for (let i = 0; i < callStack.length; ++i) {
    const node = callStack[i];
    if (node.kind === FrameKind.HIDDEN) {
      continue;
    }
    if (node.kind === FrameKind.VISIBLE || !node.functionKeys) {
      node.frames.forEach((frame, inlineIndex) => result.push({
        frame,
        node,
        nodeIndex: i,
        inlineIndex,
        invocationNode: inlineIndex === node.frames.length - 1 ? node : undefined,
      }));
      continue;
    }

    // `node` is OUTLINED: start a chain.
    const group = node.frames.map((frame, inlineIndex) => ({frame, node, nodeIndex: i, inlineIndex}));
    let bottom = node.functionKeys.bottom;
    let terminator: FrameNode|undefined;
    let lastConsumed = i;
    for (let j = i + 1; j < callStack.length && !terminator; ++j) {
      const caller = callStack[j];
      if (caller.kind === FrameKind.HIDDEN || isNotAuthored(caller)) {
        continue;
      }
      if (!caller.functionKeys || caller.functionKeys.top !== bottom) {
        break;
      }
      // Skip `caller.frames[0]`: it's the same logical frame as the previous member's bottom frame.
      for (let k = 1; k < caller.frames.length; ++k) {
        group.push({frame: caller.frames[k], node: caller, nodeIndex: j, inlineIndex: k});
      }
      bottom = caller.functionKeys.bottom;
      terminator = caller.kind === FrameKind.VISIBLE ? caller : undefined;
      lastConsumed = j;
    }
    // HIDDEN and not-authored nodes after the last chain member are processed by the outer loop.
    i = lastConsumed;

    const rawName = terminator?.rawFrame.functionName;
    group.forEach(({frame: f, ...rest}, idx) => result.push({
      ...rest,
      frame: new FrameImpl(f.url, f.uiSourceCode, f.name, f.line, f.column, f.missingDebugInfo, rawName, f.isWasm,
                           idx < group.length - 1),
      invocationNode: idx === group.length - 1 ? terminator : undefined,
    }));
  }
  return result;
}

/**
 * Frames that the authored function can't have called directly (e.g. `Array.prototype.forEach` calling an outlined
 * callback, or an unmapped runtime helper). A chain looks past them.
 *
 * Builtins are unmapped like any other frame without authored code, see `TranslatedRawFrame.unmapped`.
 */
function isNotAuthored(node: FrameNode): boolean {
  return node.kind === FrameKind.VISIBLE && !node.functionKeys && node.isUnmapped;
}

/**
 * Converts the internal recursive `EvalOrigin` trie representation into the public-facing
 * linear `ParsedErrorStackFrameImpl` representation.
 *
 * NOTE: The V8 Error#stack format only allows serializing a single location descriptor
 * per nested eval origin level (e.g. `eval at functionName (location)`). Therefore, the
 * public-facing API only surfaces the top-most logical frame (`evalOrigin.frames[0]`) at each
 * eval level. Any other inlined caller frames at that specific level are technically dropped
 * in the public API, but they are fully preserved in the internal trie representation for
 * debugging, navigation, and ignore list correlation.
 */
function createParsedErrorStackFrameImplFromEvalOrigin(
    evalOrigin: EvalOrigin|undefined, parsedFrameInfo?: ParsedFrameInfo): ParsedErrorStackFrameImpl|undefined {
  if (!evalOrigin || evalOrigin.frames.length === 0) {
    return undefined;
  }
  const frame = evalOrigin.frames[0];
  const info = parsedFrameInfo?.evalOrigin?.parsedFrameInfo;
  const nestedOrigin = createParsedErrorStackFrameImplFromEvalOrigin(evalOrigin.evalOrigin, info);
  // An eval origin is a single location that is also its own invocation.
  return new ParsedErrorStackFrameImpl(frame, info, info, nestedOrigin);
}

export class ParsedErrorStackFragmentImpl implements StackTrace.StackTrace.ParsedErrorStackFragment {
  constructor(readonly fragment: FragmentImpl) {
  }

  get frames(): ParsedErrorStackFrameImpl[] {
    if (!this.fragment.node) {
      return [];
    }

    const evalOrigins = new Map<FrameNode, ParsedErrorStackFrameImpl|undefined>();
    return consolidate([...this.fragment.node.getCallStack()]).map(({frame, node, invocationNode}) => {
      if (!evalOrigins.has(node)) {
        evalOrigins.set(node, createParsedErrorStackFrameImplFromEvalOrigin(node.evalOrigin, node.parsedFrameInfo));
      }
      return new ParsedErrorStackFrameImpl(frame, node.parsedFrameInfo, invocationNode?.parsedFrameInfo,
                                           evalOrigins.get(node));
    });
  }
}

/**
 * Location properties (e.g. `isAsync`) describe where execution is, and come from the node a frame was translated
 * from. Invocation properties (e.g. `isConstructor`) describe how the physical function was called, and only exist
 * on the last frame of a group of inlined or merged frames.
 */
export class ParsedErrorStackFrameImpl implements StackTrace.StackTrace.ParsedErrorStackFrame {
  readonly #frame: FrameImpl;
  readonly #locationInfo?: ParsedFrameInfo;
  readonly #invocationInfo?: ParsedFrameInfo;
  readonly #evalOrigin?: ParsedErrorStackFrameImpl;

  constructor(frame: FrameImpl, locationInfo?: ParsedFrameInfo, invocationInfo?: ParsedFrameInfo,
              evalOrigin?: ParsedErrorStackFrameImpl) {
    this.#frame = frame;
    this.#locationInfo = locationInfo;
    this.#invocationInfo = invocationInfo;
    this.#evalOrigin = evalOrigin;
  }

  get url(): string|undefined {
    return this.#frame.url;
  }
  get uiSourceCode(): Workspace.UISourceCode.UISourceCode|undefined {
    return this.#frame.uiSourceCode;
  }
  get name(): string|undefined {
    return this.#frame.name;
  }
  get line(): number {
    return this.#frame.line;
  }
  get column(): number {
    return this.#frame.column;
  }
  get missingDebugInfo(): StackTrace.StackTrace.MissingDebugInfo|undefined {
    return this.#frame.missingDebugInfo;
  }
  get rawName(): string|undefined {
    return this.#frame.rawName;
  }

  get isAsync(): boolean|undefined {
    return this.#locationInfo?.isAsync;
  }
  get isConstructor(): boolean|undefined {
    return this.#invocationInfo?.isConstructor;
  }
  get isEval(): boolean|undefined {
    return this.#locationInfo?.isEval;
  }
  get evalOrigin(): ParsedErrorStackFrameImpl|undefined {
    return this.#evalOrigin;
  }
  get isWasm(): boolean|undefined {
    return this.#frame.isWasm;
  }
  get isInline(): boolean|undefined {
    return this.#frame.isInline;
  }
  get wasmModuleName(): string|undefined {
    return this.#locationInfo?.wasmModuleName;
  }
  get wasmFunctionIndex(): number|undefined {
    return this.#locationInfo?.wasmFunctionIndex;
  }
  get typeName(): string|undefined {
    return this.#invocationInfo?.typeName;
  }
  get methodName(): string|undefined {
    return this.#invocationInfo?.methodName;
  }
  get promiseIndex(): number|undefined {
    return this.#locationInfo?.promiseIndex;
  }
}

/**
 * A DebuggableFragmentImpl wraps an existing FragmentImpl. This is important: We can pause at the
 * same location multiple times and the paused information changes each and everytime while the underlying
 * FragmentImpl will stay the same.
 */
export class DebuggableFragmentImpl implements StackTrace.StackTrace.DebuggableFragment {
  /**
   * Virtual call frames for inlined frames, so that reading `frames` repeatedly (e.g. after `UPDATED`) yields
   * identical `sdkFrame`s. A new DebuggableFragmentImpl is created per pause, so this lives as long as `callFrames`.
   */
  readonly #virtualCallFrames = new Map<string, SDK.DebuggerModel.CallFrame>();

  constructor(readonly fragment: FragmentImpl, private readonly callFrames: SDK.DebuggerModel.CallFrame[]) {
  }

  get frames(): DebuggableFrameImpl[] {
    if (!this.fragment.node) {
      return [];
    }

    return consolidate([...this.fragment.node.getCallStack()]).map(({frame, nodeIndex, inlineIndex}) => {
      return new DebuggableFrameImpl(frame, this.#sdkFrameFor(nodeIndex, inlineIndex, frame.name ?? ''));
    });
  }

  #sdkFrameFor(nodeIndex: number, inlineIndex: number, name: string): SDK.DebuggerModel.CallFrame {
    const physical = this.callFrames[nodeIndex];
    if (inlineIndex === 0) {
      return physical;
    }
    // The name is part of the key, as a re-translation can change the name at the same indices.
    const key = `${nodeIndex}:${inlineIndex}:${name}`;
    let frame = this.#virtualCallFrames.get(key);
    if (!frame) {
      frame = physical.createVirtualCallFrame(inlineIndex, name);
      this.#virtualCallFrames.set(key, frame);
    }
    return frame;
  }
}

/**
 * A DebuggableFrameImpl wraps an existing FrameImpl. This is important: We can pause at the
 * same location multiple times and the paused information changes each and everytime while the underlying
 * FrameImpl will stay the same.
 */
export class DebuggableFrameImpl implements StackTrace.StackTrace.DebuggableFrame {
  readonly #frame: FrameImpl;
  readonly #sdkFrame: SDK.DebuggerModel.CallFrame;

  constructor(frame: FrameImpl, sdkFrame: SDK.DebuggerModel.CallFrame) {
    this.#frame = frame;
    this.#sdkFrame = sdkFrame;
  }

  get url(): string|undefined {
    return this.#frame.url;
  }

  get uiSourceCode(): Workspace.UISourceCode.UISourceCode|undefined {
    return this.#frame.uiSourceCode;
  }

  get name(): string|undefined {
    return this.#frame.name;
  }

  get line(): number {
    return this.#frame.line;
  }

  get column(): number {
    return this.#frame.column;
  }

  get missingDebugInfo(): StackTrace.StackTrace.MissingDebugInfo|undefined {
    return this.#frame.missingDebugInfo;
  }

  get rawName(): string|undefined {
    return this.#frame.rawName;
  }

  get isWasm(): boolean|undefined {
    return this.#frame.isWasm;
  }

  get isInline(): boolean|undefined {
    return this.#frame.isInline;
  }

  get sdkFrame(): SDK.DebuggerModel.CallFrame {
    return this.#sdkFrame;
  }
}
