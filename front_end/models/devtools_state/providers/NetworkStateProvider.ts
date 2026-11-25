// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {
  Events,
  type EventTypes,
  type State,
  StateKind,
  type StateProvider,
} from '../State.js';

/**
 * Owns access to `MultitargetNetworkManager` for `StateManager`: lists network state,
 * reveals it, resets it, and reports changes.
 */
export class NetworkStateProvider extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements StateProvider {
  readonly #networkManager: SDK.NetworkManager.MultitargetNetworkManager;
  readonly #eventListeners: Common.EventTarget.EventDescriptor[];
  #lastUserAgent: string;

  constructor(networkManager: SDK.NetworkManager.MultitargetNetworkManager) {
    super();
    this.#networkManager = networkManager;
    this.#lastUserAgent = networkManager.customUserAgent();
    this.#eventListeners = [
      this.#networkManager.addEventListener(
          SDK.NetworkManager.MultitargetNetworkManager.Events.CUSTOM_USER_AGENT_CHANGED,
          () => {
            const state = this.#userAgentState();
            if (state.value === this.#lastUserAgent) {
              return;
            }
            this.#lastUserAgent = state.value;
            this.dispatchEventToListeners(Events.STATE_CHANGED, state);
          }),
    ];
  }

  allStates(): State[] {
    return [this.#userAgentState()];
  }

  async reveal(kind: StateKind): Promise<void> {
    if (kind === StateKind.USER_AGENT) {
      await Common.Revealer.reveal(new SDK.NetworkManager.RevealableCustomUserAgent());
    }
  }

  reset(kind: StateKind): void {
    if (kind === StateKind.USER_AGENT && this.#networkManager.customUserAgentEnabled()) {
      this.#networkManager.setCustomUserAgentEnabled(false);
    }
  }

  #userAgentState(): State<string> {
    const userAgent = this.#networkManager.customUserAgent();
    return {
      kind: StateKind.USER_AGENT,
      value: userAgent,
      isDefault: userAgent === '',
    };
  }

  dispose(): void {
    Common.EventTarget.removeEventListeners(this.#eventListeners);
  }
}
