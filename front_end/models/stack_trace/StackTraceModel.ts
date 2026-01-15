// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

// eslint-disable-next-line @devtools/es-modules-import
import * as StackTrace from './stack_trace.js';
import {
  type AnyStackTraceImpl,
  AsyncFragmentImpl,
  DebuggableFragmentImpl,
  FragmentImpl,
  FrameImpl,
  StackTraceImpl
} from './StackTraceImpl.js';
import {type FrameNode, type RawFrame, Trie} from './Trie.js';

/**
 * A stack trace translation function.
 *
 * Any implementation must return an array with the same length as `frames`.
 */
export type TranslateRawFrames = (frames: readonly RawFrame[], target: SDK.Target.Target) => Promise<
    Array<Array<Pick<StackTrace.StackTrace.Frame, 'url'|'uiSourceCode'|'name'|'line'|'column'|'missingDebugInfo'>>>>;

/**
 * The {@link StackTraceModel} is a thin wrapper around a fragment trie.
 *
 * We want to store stack trace fragments per target so a SDKModel is the natural choice.
 */
export class StackTraceModel extends SDK.SDKModel.SDKModel<unknown> {
  readonly #trie = new Trie();
  readonly #mutex = new Common.Mutex.Mutex();

  /** @returns the {@link StackTraceModel} for the target, or the model for the primaryPageTarget when passing null/undefined */
  static #modelForTarget(target: SDK.Target.Target|null|undefined): StackTraceModel {
    const model = (target ?? SDK.TargetManager.TargetManager.instance().primaryPageTarget())?.model(StackTraceModel);
    if (!model) {
      throw new Error('Unable to find StackTraceModel');
    }
    return model;
  }

  async createFromProtocolRuntime(stackTrace: Protocol.Runtime.StackTrace, rawFramesToUIFrames: TranslateRawFrames):
      Promise<StackTrace.StackTrace.StackTrace> {
    const [syncFragment, asyncFragments] = await Promise.all([
      this.#createFragment(stackTrace.callFrames, rawFramesToUIFrames),
      this.#createAsyncFragments(stackTrace, rawFramesToUIFrames),
    ]);

    return new StackTraceImpl(syncFragment, asyncFragments);
  }

  async createFromDebuggerPaused(
      pausedDetails: SDK.DebuggerModel.DebuggerPausedDetails,
      rawFramesToUIFrames: TranslateRawFrames): Promise<StackTrace.StackTrace.DebuggableStackTrace> {
    const [syncFragment, asyncFragments] = await Promise.all([
      this.#createDebuggableFragment(pausedDetails, rawFramesToUIFrames),
      this.#createAsyncFragments(pausedDetails, rawFramesToUIFrames),
    ]);

    return new StackTraceImpl(syncFragment, asyncFragments);
  }

  /** Trigger re-translation of all fragments with the provide script in their call stack */
  async scriptInfoChanged(script: SDK.Script.Script, translateRawFrames: TranslateRawFrames): Promise<void> {
    const release = await this.#mutex.acquire();
    try {
      const translatePromises: Array<Promise<unknown>> = [];
      let stackTracesToUpdate = new Set<AnyStackTraceImpl>();

      for (const fragment of this.#affectedFragments(script)) {
        // We trigger re-translation only for fragments of leaf-nodes. Any fragment along the ancestor-chain
        // is re-translated as a side-effect.
        // We just need to remember the stack traces of the skipped over fragments, so we can send the
        // UPDATED event also to them.
        if (fragment.node?.children.length === 0) {
          translatePromises.push(this.#translateFragment(fragment, translateRawFrames));
        }
        stackTracesToUpdate = stackTracesToUpdate.union(fragment.stackTraces);
      }

      await Promise.all(translatePromises);

      for (const stackTrace of stackTracesToUpdate) {
        stackTrace.dispatchEventToListeners(StackTrace.StackTrace.Events.UPDATED);
      }
    } finally {
      release();
    }
  }

  async #createDebuggableFragment(
      pausedDetails: SDK.DebuggerModel.DebuggerPausedDetails,
      rawFramesToUIFrames: TranslateRawFrames): Promise<DebuggableFragmentImpl> {
    const fragment = await this.#createFragment(
        pausedDetails.callFrames.map(frame => ({
                                       scriptId: frame.script.scriptId,
                                       url: frame.script.sourceURL,
                                       functionName: frame.functionName,
                                       lineNumber: frame.location().lineNumber,
                                       columnNumber: frame.location().columnNumber,
                                     })),
        rawFramesToUIFrames);
    return new DebuggableFragmentImpl(fragment, pausedDetails.callFrames);
  }

  async #createAsyncFragments(
      stackTraceOrPausedEvent: Protocol.Runtime.StackTrace|SDK.DebuggerModel.DebuggerPausedDetails,
      rawFramesToUIFrames: TranslateRawFrames): Promise<AsyncFragmentImpl[]> {
    const asyncFragments: Array<Promise<AsyncFragmentImpl>> = [];

    const debuggerModel = this.target().model(SDK.DebuggerModel.DebuggerModel);
    if (debuggerModel) {
      for await (
          const {stackTrace: asyncStackTrace, target} of debuggerModel.iterateAsyncParents(stackTraceOrPausedEvent)) {
        if (asyncStackTrace.callFrames.length === 0) {
          // Skip empty async fragments, they don't add value.
          continue;
        }
        const model = StackTraceModel.#modelForTarget(target);
        const asyncFragmentPromise =
            model.#createFragment(asyncStackTrace.callFrames, rawFramesToUIFrames)
                .then(fragment => new AsyncFragmentImpl(asyncStackTrace.description ?? '', fragment));
        asyncFragments.push(asyncFragmentPromise);
      }
    }

    return await Promise.all(asyncFragments);
  }

  async #createFragment(frames: RawFrame[], rawFramesToUIFrames: TranslateRawFrames): Promise<FragmentImpl> {
    if (frames.length === 0) {
      return FragmentImpl.EMPTY_FRAGMENT;
    }

    const release = await this.#mutex.acquire();
    try {
      const node = this.#trie.insert(frames);
      const requiresTranslation = !Boolean(node.fragment);
      const fragment = FragmentImpl.getOrCreate(node);

      if (requiresTranslation) {
        await this.#translateFragment(fragment, rawFramesToUIFrames);
      }

      return fragment;
    } finally {
      release();
    }
  }

  async #translateFragment(fragment: FragmentImpl, rawFramesToUIFrames: TranslateRawFrames): Promise<void> {
    if (!fragment.node) {
      return;
    }

    const rawFrames = fragment.node.getCallStack().map(node => node.rawFrame).toArray();
    const uiFrames = await rawFramesToUIFrames(rawFrames, this.target());
    console.assert(rawFrames.length === uiFrames.length, 'Broken rawFramesToUIFrames implementation');

    let i = 0;
    for (const node of fragment.node.getCallStack()) {
      node.frames = uiFrames[i++].map(
          frame => new FrameImpl(
              frame.url, frame.uiSourceCode, frame.name, frame.line, frame.column, frame.missingDebugInfo));
    }
  }

  #affectedFragments(script: SDK.Script.Script): Set<FragmentImpl> {
    // 1. Collect branches with the matching script.
    const affectedBranches = new Set<FrameNode>();
    this.#trie.walk(null, node => {
      // scriptId has precedence, but if the frame does not have one, check the URL.
      if (node.rawFrame.scriptId === script.scriptId ||
          (!node.rawFrame.scriptId && node.rawFrame.url === script.sourceURL)) {
        affectedBranches.add(node);
        return false;
      }
      return true;
    });

    // 2. For each branch collect all the fragments.
    const fragments = new Set<FragmentImpl>();
    for (const branch of affectedBranches) {
      this.#trie.walk(branch, node => {
        if (node.fragment) {
          fragments.add(node.fragment);
        }
        return true;
      });
    }
    return fragments;
  }
}

SDK.SDKModel.SDKModel.register(StackTraceModel, {capabilities: SDK.Target.Capability.NONE, autostart: false});
