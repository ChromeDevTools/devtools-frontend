// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';

import {Events as ScopeChainResolverEvents, type ScopeChainResolver} from './ScopeChainResolver.js';

/**
 * This class is responsible for resolving / updating the scope chain for a specific {@link SDK.DebuggerModel.CallFrame}
 * instance.
 *
 * There are several sources that can influence the scope view:
 *   - Debugger plugins can provide the whole scope info (e.g. from DWARF)
 *   - Source Maps can provide OR augment scope info
 *
 * Source maps can be enabled/disabled dynamically and debugger plugins can attach debug info after the fact.
 *
 * The {@link ScopeChainResolver} tracks all that and invalidates its cache accordingly. This class
 * sends events with the latest scope chain for a specific call frame.
 */
export class ScopeChainModel extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #callFrame: SDK.DebuggerModel.CallFrame;
  readonly #scopeChainResolver: ScopeChainResolver;

  /** We use the `Throttler` here to make sure that `#boundUpdate` is not run multiple times simultanously */
  readonly #throttler = new Common.Throttler.Throttler(5);
  readonly #boundUpdate = this.#update.bind(this);

  constructor(callFrame: SDK.DebuggerModel.CallFrame, scopeChainResolver: ScopeChainResolver) {
    super();
    this.#callFrame = callFrame;
    this.#scopeChainResolver = scopeChainResolver;
    this.#scopeChainResolver.addEventListener(ScopeChainResolverEvents.SCOPE_CHAIN_INVALIDATED,
                                              this.#scopeChainInvalidated, this);

    void this.#throttler.schedule(this.#boundUpdate);
  }

  dispose(): void {
    this.#scopeChainResolver.removeEventListener(ScopeChainResolverEvents.SCOPE_CHAIN_INVALIDATED,
                                                 this.#scopeChainInvalidated, this);
    this.listeners?.clear();
  }

  resolveScopeChain(): Promise<SDK.DebuggerModel.ScopeChainEntry[]> {
    return this.#scopeChainResolver.resolveScopeChain(this.#callFrame);
  }

  async #update(): Promise<void> {
    const scopeChain = await this.resolveScopeChain();
    this.dispatchEventToListeners(Events.SCOPE_CHAIN_UPDATED, new ScopeChain(scopeChain));
  }

  #scopeChainInvalidated(event: Common.EventTarget.EventTargetEvent<SDK.Script.Script>): void {
    if (event.data === this.#callFrame.script) {
      void this.#throttler.schedule(this.#boundUpdate);
    }
  }
}

export const enum Events {
  SCOPE_CHAIN_UPDATED = 'ScopeChainUpdated',
}

export interface EventTypes {
  [Events.SCOPE_CHAIN_UPDATED]: ScopeChain;
}

/**
 * A scope chain ready to be shown in the UI with debugging info applied.
 */
export class ScopeChain {
  readonly scopeChain: SDK.DebuggerModel.ScopeChainEntry[];

  constructor(scopeChain: SDK.DebuggerModel.ScopeChainEntry[]) {
    this.scopeChain = scopeChain;
  }
}
