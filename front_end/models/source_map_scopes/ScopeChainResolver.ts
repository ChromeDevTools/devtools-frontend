// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Bindings from '../bindings/bindings.js';

import {resolveScopeChain} from './NamesResolver.js';

/**
 * Resolves and caches the scope chain for {@link SDK.DebuggerModel.CallFrame}s.
 *
 * There is one instance per `Universe`. Caching the resolved scope chain allows different consumers
 * (e.g. the Scope view and the inline values in the editor) to share the exact same
 * {@link SDK.DebuggerModel.ScopeChainEntry} and {@link SDK.RemoteObject.RemoteObject} instances for a
 * given pause, without redundant CDP evaluations.
 *
 * The cache for a script is invalidated whenever debugging info (e.g. from a debugger language plugin)
 * or a source map is attached to or detached from that script. The {@link Events.SCOPE_CHAIN_INVALIDATED}
 * event is dispatched afterwards, so consumers can re-resolve the scope chain.
 */
export class ScopeChainResolver extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    SDK.TargetManager.SDKModelObserver<SDK.DebuggerModel.DebuggerModel> {
  readonly #debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;
  readonly #cache = new WeakMap<SDK.Script.Script,
                                WeakMap<SDK.DebuggerModel.CallFrame, Promise<SDK.DebuggerModel.ScopeChainEntry[]>>>();

  constructor(targetManager: SDK.TargetManager.TargetManager,
              debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding) {
    super();
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    targetManager.observeModels(SDK.DebuggerModel.DebuggerModel, this);
  }

  /**
   * @deprecated Pass the `ScopeChainResolver` of the `Universe` via constructor instead.
   */
  static instance(): ScopeChainResolver {
    // TODO(crbug.com/458180550): Remove once all callers receive the instance via constructor.
    return Root.DevToolsContext.globalInstance().get(ScopeChainResolver);
  }

  modelAdded(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebugInfoAttached, this.#debugInfoAttached, this);
    debuggerModel.sourceMapManager().addEventListener(SDK.SourceMapManager.Events.SourceMapAttached,
                                                      this.#sourceMapChanged, this);
    debuggerModel.sourceMapManager().addEventListener(SDK.SourceMapManager.Events.SourceMapDetached,
                                                      this.#sourceMapChanged, this);
  }

  modelRemoved(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.DebugInfoAttached, this.#debugInfoAttached, this);
    debuggerModel.sourceMapManager().removeEventListener(SDK.SourceMapManager.Events.SourceMapAttached,
                                                         this.#sourceMapChanged, this);
    debuggerModel.sourceMapManager().removeEventListener(SDK.SourceMapManager.Events.SourceMapDetached,
                                                         this.#sourceMapChanged, this);
  }

  /**
   * Returns the (cached) resolved scope chain for `callFrame`. Repeated calls return the same promise
   * until the cache for the call frame's script is invalidated.
   */
  resolveScopeChain(callFrame: SDK.DebuggerModel.CallFrame): Promise<SDK.DebuggerModel.ScopeChainEntry[]> {
    let cacheForScript = this.#cache.get(callFrame.script);
    if (!cacheForScript) {
      cacheForScript = new WeakMap();
      this.#cache.set(callFrame.script, cacheForScript);
    }
    let cachedPromise = cacheForScript.get(callFrame);
    if (!cachedPromise) {
      cachedPromise = resolveScopeChain(callFrame, this.#debuggerWorkspaceBinding);
      cacheForScript.set(callFrame, cachedPromise);
    }
    return cachedPromise;
  }

  #invalidate(script: SDK.Script.Script): void {
    this.#cache.delete(script);
    this.dispatchEventToListeners(Events.SCOPE_CHAIN_INVALIDATED, script);
  }

  #debugInfoAttached(event: Common.EventTarget.EventTargetEvent<SDK.Script.Script>): void {
    this.#invalidate(event.data);
  }

  #sourceMapChanged(event: Common.EventTarget
                        .EventTargetEvent<{client: SDK.Script.Script, sourceMap: SDK.SourceMap.SourceMap}>): void {
    this.#invalidate(event.data.client);
  }
}

export const enum Events {
  SCOPE_CHAIN_INVALIDATED = 'ScopeChainInvalidated',
}

export interface EventTypes {
  /** Dispatched with the script for which the cached scope chains have been invalidated. */
  [Events.SCOPE_CHAIN_INVALIDATED]: SDK.Script.Script;
}
