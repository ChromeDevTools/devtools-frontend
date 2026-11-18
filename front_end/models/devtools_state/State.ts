// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';

/** Names each DevTools state tracked by `StateManager`. */
export const enum StateKind {
  CPU_THROTTLING = 'cpu-throttling',
  CACHE_DISABLED = 'cache-disabled',
  JAVASCRIPT_DISABLED = 'java-script-disabled',
}

/** Current state of a single `StateKind` */
export interface State<T = unknown> {
  kind: StateKind;
  value: T;
  isDefault: boolean;
}

/** Events emitted by StateProvider and `StateManager` when a tracked state changes. */
export const enum Events {
  STATE_CHANGED = 'StateChanged',
}

/** Pairs each event in `Events` with the data type sent to listeners. */
export interface EventTypes {
  [Events.STATE_CHANGED]: State;
}

/**
 * Connects DevTools state (such as `Common.Settings`) to `StateManager`, so callers
 * can read, listen to, and reset states without depending on that state.
 */
export interface StateProvider extends Common.EventTarget.EventTarget<EventTypes> {
  /** Returns all states owned by this provider, including states with default values. */
  allStates(): State[];
  /** Resets `kind` back to its default value. Does nothing if this provider does not own `kind`. */
  reset(kind: StateKind): void;
  /** Removes event listeners added by this provider. */
  dispose(): void;
}
