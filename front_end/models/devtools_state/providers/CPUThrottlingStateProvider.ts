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

const NO_CPU_THROTTLING_RATE = 1;

/**
 * Owns access to `CPUThrottlingManager` for `StateManager`: lists CPU throttling state, resets it, and reports
 * changes.
 */
export class CPUThrottlingStateProvider extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    StateProvider {
  readonly #cpuThrottlingManager: SDK.CPUThrottlingManager.CPUThrottlingManager;
  readonly #eventListeners: Common.EventTarget.EventDescriptor[];

  constructor(cpuThrottlingManager: SDK.CPUThrottlingManager.CPUThrottlingManager) {
    super();
    this.#cpuThrottlingManager = cpuThrottlingManager;
    this.#eventListeners = [
      this.#cpuThrottlingManager.addEventListener(SDK.CPUThrottlingManager.Events.RATE_CHANGED,
                                                  () => {
                                                    this.dispatchEventToListeners(Events.STATE_CHANGED,
                                                                                  this.#toState());
                                                  }),
    ];
  }

  allStates(): State[] {
    return [this.#toState()];
  }

  reset(kind: StateKind): void {
    if (kind === StateKind.CPU_THROTTLING &&
        this.#cpuThrottlingManager.cpuThrottlingRate() !== NO_CPU_THROTTLING_RATE) {
      this.#cpuThrottlingManager.setCPUThrottlingRate(NO_CPU_THROTTLING_RATE);
    }
  }

  #toState(): State<number> {
    const rate = this.#cpuThrottlingManager.cpuThrottlingRate();
    return {
      kind: StateKind.CPU_THROTTLING,
      value: rate,
      isDefault: rate === NO_CPU_THROTTLING_RATE,
    };
  }

  dispose(): void {
    Common.EventTarget.removeEventListeners(this.#eventListeners);
  }
}
