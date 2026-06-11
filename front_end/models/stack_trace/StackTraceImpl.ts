// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Workspace from '../workspace/workspace.js';

import type * as StackTrace from './stack_trace.js';
import type {EvalOrigin, FrameNode, ParsedFrameInfo} from './Trie.js';

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
  static readonly EMPTY_FRAGMENT = new FragmentImpl();

  readonly node?: FrameNode;
  readonly stackTraces = new Set<AnyStackTraceImpl>();

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
    if (!this.node) {
      return [];
    }

    const frames: FrameImpl[] = [];

    for (const node of this.node.getCallStack()) {
      frames.push(...node.frames);
    }

    return frames;
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
  const nestedOrigin = createParsedErrorStackFrameImplFromEvalOrigin(
      evalOrigin.evalOrigin, parsedFrameInfo?.evalOrigin?.parsedFrameInfo);
  return new ParsedErrorStackFrameImpl(frame, parsedFrameInfo?.evalOrigin?.parsedFrameInfo, nestedOrigin);
}

export class ParsedErrorStackFragmentImpl implements StackTrace.StackTrace.ParsedErrorStackFragment {
  constructor(readonly fragment: FragmentImpl) {
  }

  get frames(): ParsedErrorStackFrameImpl[] {
    if (!this.fragment.node) {
      return [];
    }

    const frames: ParsedErrorStackFrameImpl[] = [];

    for (const node of this.fragment.node.getCallStack()) {
      const evalOrigin = createParsedErrorStackFrameImplFromEvalOrigin(node.evalOrigin, node.parsedFrameInfo);
      for (const frame of node.frames) {
        frames.push(new ParsedErrorStackFrameImpl(frame, node.parsedFrameInfo, evalOrigin));
      }
    }

    return frames;
  }
}

export class ParsedErrorStackFrameImpl implements StackTrace.StackTrace.ParsedErrorStackFrame {
  readonly #frame: FrameImpl;
  readonly #parsedFrameInfo?: ParsedFrameInfo;
  readonly #evalOrigin?: ParsedErrorStackFrameImpl;

  constructor(frame: FrameImpl, parsedFrameInfo?: ParsedFrameInfo, evalOrigin?: ParsedErrorStackFrameImpl) {
    this.#frame = frame;
    this.#parsedFrameInfo = parsedFrameInfo;
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
    return this.#parsedFrameInfo?.isAsync;
  }
  get isConstructor(): boolean|undefined {
    return this.#parsedFrameInfo?.isConstructor;
  }
  get isEval(): boolean|undefined {
    return this.#parsedFrameInfo?.isEval;
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
    return this.#parsedFrameInfo?.wasmModuleName;
  }
  get wasmFunctionIndex(): number|undefined {
    return this.#parsedFrameInfo?.wasmFunctionIndex;
  }
  get typeName(): string|undefined {
    return this.#parsedFrameInfo?.typeName;
  }
  get methodName(): string|undefined {
    return this.#parsedFrameInfo?.methodName;
  }
  get promiseIndex(): number|undefined {
    return this.#parsedFrameInfo?.promiseIndex;
  }
}

/**
 * A DebuggableFragmentImpl wraps an existing FragmentImpl. This is important: We can pause at the
 * same location multiple times and the paused information changes each and everytime while the underlying
 * FragmentImpl will stay the same.
 */
export class DebuggableFragmentImpl implements StackTrace.StackTrace.DebuggableFragment {
  constructor(readonly fragment: FragmentImpl, private readonly callFrames: SDK.DebuggerModel.CallFrame[]) {
  }

  get frames(): DebuggableFrameImpl[] {
    if (!this.fragment.node) {
      return [];
    }

    const frames: DebuggableFrameImpl[] = [];

    let index = 0;
    for (const node of this.fragment.node.getCallStack()) {
      for (const [inlineIdx, frame] of node.frames.entries()) {
        // Create virtual frames for inlined frames.
        const sdkFrame = inlineIdx === 0 ? this.callFrames[index] :
                                           this.callFrames[index].createVirtualCallFrame(inlineIdx, frame.name ?? '');
        frames.push(new DebuggableFrameImpl(frame, sdkFrame));
      }
      index++;
    }

    return frames;
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
