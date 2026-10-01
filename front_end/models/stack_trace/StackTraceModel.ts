// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import {augmentRawFramesWithScriptIds, parseRawFramesFromErrorStack} from './DetailedErrorStackParser.js';
// eslint-disable-next-line @devtools/es-modules-import
import * as StackTrace from './stack_trace.js';
import {
  type AnyStackTraceImpl,
  AsyncFragmentImpl,
  DebuggableFragmentImpl,
  FragmentImpl,
  FrameImpl,
  ParsedErrorStackFragmentImpl,
  StackTraceImpl,
} from './StackTraceImpl.js';
import {EvalOrigin, FrameKind, type FrameNode, type FunctionKeys, type RawFrame, Trie} from './Trie.js';

/** Named `TranslatedUIFrame` to avoid confusion with `SDK.SourceMapScopesInfo.TranslatedFrame`. */
export type TranslatedUIFrame =
    Pick<StackTrace.StackTrace.Frame, 'url'|'uiSourceCode'|'name'|'line'|'column'|'missingDebugInfo'>;

/**
 * The translation of a single {@link RawFrame}. `frames` is [top, ...inlinedCallers] in top-to-bottom order. It MUST
 * NOT be empty for VISIBLE and OUTLINED.
 */
export type TranslatedRawFrame = {
  readonly kind: FrameKind.HIDDEN,
  readonly frames: readonly [],
}|{
  readonly kind: FrameKind.VISIBLE,
  readonly frames: TranslatedUIFrame[],
  /** Makes the frame eligible to end an outlined chain. */
  readonly functionKeys?: FunctionKeys,
  /**
   * True iff `frames` show generated code because no authored code is known for the raw frame: builtins, scripts
   * without source map, scripts whose source map is still loading, language plugins reporting `missingDebugInfo`.
   * A frame at an unmapped position of a script with scopes information is not unmapped: its generated ranges still
   * identify the authored function.
   *
   * Unmapped frames are treated as "not authored" and may be merged away inside outlined chains.
   */
  readonly unmapped?: boolean,
}|{
  readonly kind: FrameKind.OUTLINED,
  readonly frames: TranslatedUIFrame[],
  readonly functionKeys: FunctionKeys,
};

/**
 * A stack trace translation function.
 *
 * Any implementation must return an array with the same length as `frames`.
 */
export type TranslateRawFrames = (frames: readonly RawFrame[], target: SDK.Target.Target) =>
    Promise<TranslatedRawFrame[]>;

/**
 * The {@link StackTraceModel} is a thin wrapper around a fragment trie.
 *
 * We want to store stack trace fragments per target so a SDKModel is the natural choice.
 */
export class StackTraceModel extends SDK.SDKModel.SDKModel<unknown> {
  readonly #trie = new Trie();
  readonly #mutex = new Common.Mutex.Mutex();

  /** @returns the {@link StackTraceModel} for the target. Throws if the target or its model cannot be found. */
  static #modelForTarget(target: SDK.Target.Target|null|undefined): StackTraceModel {
    const model = target?.model(StackTraceModel);
    if (!model) {
      throw new Error('Unable to find StackTraceModel');
    }
    return model;
  }

  async createFromProtocolRuntime(stackTrace: Protocol.Runtime.StackTrace, rawFramesToUIFrames: TranslateRawFrames):
      Promise<StackTrace.StackTrace.StackTrace> {
    const debuggerModel = this.target().model(SDK.DebuggerModel.DebuggerModel);
    const syncFrames = stackTrace.callFrames.map((frame): RawFrame => {
      const isWasm = debuggerModel?.isWasm(frame.scriptId) ?? false;
      return {...frame, isWasm};
    });

    const [syncFragment, asyncFragments] = await Promise.all([
      this.#createFragment(syncFrames, rawFramesToUIFrames),
      this.#createAsyncFragments(stackTrace, rawFramesToUIFrames),
    ]);

    return new StackTraceImpl(syncFragment, asyncFragments);
  }

  async createFromErrorStackLikeString(
      stack: string, rawFramesToUIFrames: TranslateRawFrames,
      exceptionDetails?: Protocol.Runtime.ExceptionDetails): Promise<StackTrace.StackTrace.ParsedErrorStackTrace|null> {
    const debuggerModel = this.target().model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
    const baseURL = this.target().inspectedURL();
    const resolveURL = (url: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString|null => {
      let urlWithScheme = parseOrScriptMatch(debuggerModel, url);
      if (!urlWithScheme && Common.ParsedURL.ParsedURL.isRelativeURL(url)) {
        urlWithScheme = parseOrScriptMatch(debuggerModel, Common.ParsedURL.ParsedURL.completeURL(baseURL, url));
      }
      return urlWithScheme;
    };

    const rawFrames = parseRawFramesFromErrorStack(stack, resolveURL);
    if (!rawFrames) {
      return null;
    }

    if (exceptionDetails?.stackTrace) {
      augmentRawFramesWithScriptIds(rawFrames, exceptionDetails.stackTrace);
    }

    const [syncFragment, asyncFragments] = await Promise.all([
      this.#createFragment(rawFrames, rawFramesToUIFrames),
      exceptionDetails?.stackTrace ? this.#createAsyncFragments(exceptionDetails.stackTrace, rawFramesToUIFrames) :
                                     Promise.resolve([]),
    ]);

    return new StackTraceImpl(new ParsedErrorStackFragmentImpl(syncFragment), asyncFragments);
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

  /**
   * Re-translates all trie nodes whose raw frame or eval origin chain is in `script`, and notifies all stack traces
   * that contain such a node.
   */
  async scriptInfoChanged(script: SDK.Script.Script, translateRawFrames: TranslateRawFrames): Promise<void> {
    // scriptId has precedence, but if the frame does not have one, check the URL.
    const matches = (raw: RawFrame): boolean =>
        raw.scriptId === script.scriptId || (!raw.scriptId && raw.url === script.sourceURL);
    const evalMatches = (raw: RawFrame|undefined): boolean =>
        Boolean(raw) && (matches(raw as RawFrame) || evalMatches(raw?.parsedFrameInfo?.evalOrigin));

    const release = await this.#mutex.acquire();
    try {
      // Walk the whole trie: the same script can appear multiple times in a call stack.
      const affected: FrameNode[] = [];
      this.#trie.walk(null, node => {
        if (matches(node.rawFrame) || evalMatches(node.parsedFrameInfo?.evalOrigin)) {
          affected.push(node);
        }
        return true;
      });
      await this.#translateNodes(affected.filter(n => matches(n.rawFrame)),
                                 affected.filter(n => evalMatches(n.parsedFrameInfo?.evalOrigin)), translateRawFrames);

      // Every fragment in the sub-tree of an affected node contains the affected node in its call stack.
      const visited = new Set<FrameNode>();
      let stackTracesToUpdate = new Set<AnyStackTraceImpl>();
      for (const root of affected) {
        this.#trie.walk(root, node => {
          if (visited.has(node)) {
            return false;
          }
          visited.add(node);
          if (node.fragment) {
            stackTracesToUpdate = stackTracesToUpdate.union(node.fragment.stackTraces);
          }
          return true;
        });
      }

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
                                       isWasm: frame.script.isWasm(),
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
        const model = StackTraceModel.#modelForTarget(target ?? this.target().targetManager().primaryPageTarget());
        const targetDebuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
        const asyncFrames = asyncStackTrace.callFrames.map((frame): RawFrame => {
          const isWasm = targetDebuggerModel?.isWasm(frame.scriptId) ?? false;
          return {...frame, isWasm};
        });

        const asyncFragmentPromise =
            model.#createFragment(asyncFrames, rawFramesToUIFrames)
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
      const fragment = FragmentImpl.getOrCreate(node);
      const callStack = [...node.getCallStack()];
      // Translations are context-free, so shared prefixes of other fragments don't need re-translation. A node that was
      // first seen in a CDP trace may later get an `evalOrigin` from an `Error.stack` trace.
      await this.#translateNodes(callStack.filter(n => !n.isTranslated),
                                 callStack.filter(n => n.parsedFrameInfo?.evalOrigin && !n.evalOrigin),
                                 rawFramesToUIFrames);
      return fragment;
    } finally {
      release();
    }
  }

  /** Translates `nodes` and the eval origins of `evalNodes`. Writes nothing if any translation throws. */
  async #translateNodes(nodes: FrameNode[], evalNodes: FrameNode[],
                        rawFramesToUIFrames: TranslateRawFrames): Promise<void> {
    if (nodes.length === 0 && evalNodes.length === 0) {
      return;
    }
    const [translations, evalOrigins] = await Promise.all([
      nodes.length ? rawFramesToUIFrames(nodes.map(n => n.rawFrame), this.target()) : Promise.resolve([]),
      Promise.all(evalNodes.map(
          n => translateEvalOrigin(n.parsedFrameInfo?.evalOrigin as RawFrame, rawFramesToUIFrames, this.target()))),
    ]);
    if (translations.length !== nodes.length) {
      throw new Error('Broken rawFramesToUIFrames implementation');
    }
    // No `await` below: readers never see a partially updated trie.
    nodes.forEach((node, i) => applyTranslation(node, translations[i]));
    evalNodes.forEach((node, i) => {
      node.evalOrigin = evalOrigins[i];
    });
  }
}

function toFrameImpls(rawFrame: RawFrame, frames: readonly TranslatedUIFrame[]): FrameImpl[] {
  return frames.map((f, index) => new FrameImpl(f.url, f.uiSourceCode, f.name, f.line, f.column, f.missingDebugInfo,
                                                rawFrame.functionName, rawFrame.isWasm, index < frames.length - 1));
}

/** Stores a context-free translation on `node`. A VISIBLE or OUTLINED translation without frames becomes HIDDEN. */
function applyTranslation(node: FrameNode, translation: TranslatedRawFrame): void {
  node.isTranslated = true;
  if (translation.kind === FrameKind.HIDDEN || translation.frames.length === 0) {
    console.assert(translation.kind === FrameKind.HIDDEN, 'Non-HIDDEN translation without frames');
    node.kind = FrameKind.HIDDEN;
    node.frames = [];
    node.functionKeys = undefined;
    node.isUnmapped = false;
    return;
  }
  node.kind = translation.kind;
  node.frames = toFrameImpls(node.rawFrame, translation.frames);
  node.functionKeys = translation.functionKeys;
  node.isUnmapped = translation.kind === FrameKind.VISIBLE && Boolean(translation.unmapped);
}

async function translateEvalOrigin(rawFrame: RawFrame, rawFramesToUIFrames: TranslateRawFrames,
                                   target: SDK.Target.Target): Promise<EvalOrigin> {
  const [translation] = await rawFramesToUIFrames([rawFrame], target);
  // A HIDDEN eval origin still shows where the eval happened, in generated coordinates.
  const frames = translation.frames.length ?
      toFrameImpls(rawFrame, translation.frames) :
      [new FrameImpl(rawFrame.url, undefined, rawFrame.functionName, rawFrame.lineNumber, rawFrame.columnNumber,
                     undefined, rawFrame.functionName, rawFrame.isWasm, false)];

  let parentEvalOrigin: EvalOrigin|undefined;
  if (rawFrame.parsedFrameInfo?.evalOrigin) {
    parentEvalOrigin = await translateEvalOrigin(rawFrame.parsedFrameInfo.evalOrigin, rawFramesToUIFrames, target);
  }

  return new EvalOrigin(frames, parentEvalOrigin);
}

function parseOrScriptMatch(debuggerModel: SDK.DebuggerModel.DebuggerModel,
                            url: Platform.DevToolsPath.UrlString|null): Platform.DevToolsPath.UrlString|null {
  if (!url) {
    return null;
  }
  if (Common.ParsedURL.ParsedURL.isValidUrlString(url)) {
    return url;
  }
  if (debuggerModel.scriptsForSourceURL(url).length) {
    return url;
  }
  // nodejs stack traces contain (absolute) file paths, but v8 reports them as file: urls.
  try {
    const fileUrl = new URL(url, 'file://');
    if (debuggerModel.scriptsForSourceURL(fileUrl.href as Platform.DevToolsPath.UrlString).length) {
      return fileUrl.href as Platform.DevToolsPath.UrlString;
    }
  } catch {
  }
  return null;
}

SDK.SDKModel.SDKModel.register(StackTraceModel, {capabilities: SDK.Target.Capability.NONE, autostart: false});
