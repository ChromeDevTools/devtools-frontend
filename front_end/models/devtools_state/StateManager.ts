// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import {
  Events,
  type EventTypes,
  type State,
  type StateKind,
  type StateProvider,
} from './State.js';

/**
 * The single place to read, reveal, reset, and listen to changes of the DevTools state. It delegates to providers so
 * callers do not depend on the parts of DevTools that own the underlying state.
 */
export class StateManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #providers: StateProvider[];
  readonly #eventListeners: Common.EventTarget.EventDescriptor[];

  constructor(providers: StateProvider[]) {
    super();
    this.#providers = providers;
    this.#eventListeners = providers.map(
        provider => provider.addEventListener(
            Events.STATE_CHANGED, event => this.dispatchEventToListeners(Events.STATE_CHANGED, event.data)));
  }

  state(kind: StateKind): State|null {
    return this.allStates().find(state => state.kind === kind) ?? null;
  }

  allStates(): State[] {
    return this.#providers.flatMap(provider => provider.allStates());
  }

  nonDefaultStates(): State[] {
    return this.allStates().filter(state => !state.isDefault);
  }

  async reveal(kind: StateKind): Promise<void> {
    for (const provider of this.#providers) {
      await provider.reveal(kind);
    }
  }

  reset(kind: StateKind): void {
    for (const provider of this.#providers) {
      provider.reset(kind);
    }
  }

  dispose(): void {
    Common.EventTarget.removeEventListeners(this.#eventListeners);
    for (const provider of this.#providers) {
      provider.dispose();
    }
  }
}
