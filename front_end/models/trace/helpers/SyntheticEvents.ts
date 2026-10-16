// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Types from '../types/types.js';

let activeManager: SyntheticEventsManager|null = null;

export class SyntheticEventsManager {
  /**
   * All synthetic entries created in a trace, keyed by the raw trace event
   * they are based on. (ProfileCalls and layout shift clusters are excluded
   * because they are not based on a real trace event.) Keying by the raw
   * event rather than by its index in the raw events array means
   * registration does not need to look up the index, which would require a
   * map of every raw event in the trace.
   */
  #syntheticEventByRawEvent = new WeakMap<Types.Events.Event, Types.Events.SyntheticBased>();
  /**
   * All raw entries from a trace.
   */
  #rawTraceEvents: readonly Types.Events.Event[] = [];

  static activate(manager: SyntheticEventsManager): void {
    activeManager = manager;
  }

  static createAndActivate(rawEvents: readonly Types.Events.Event[]): SyntheticEventsManager {
    const manager = new SyntheticEventsManager(rawEvents);
    SyntheticEventsManager.activate(manager);
    return manager;
  }

  static getActiveManager(): SyntheticEventsManager {
    if (!activeManager) {
      throw new Error('Attempted to get a SyntheticEventsManager without initializing');
    }
    return activeManager;
  }

  static reset(): void {
    activeManager = null;
  }

  static registerSyntheticEvent<T extends Types.Events.SyntheticBased>(syntheticEvent: Omit<T, '_tag'>): T {
    try {
      return SyntheticEventsManager.getActiveManager().#registerSyntheticEvent(syntheticEvent);
    } catch {
      // If no active manager has been initialized, we assume the trace engine is
      // not running as part of the Performance panel. In this case we don't
      // register synthetic events because we don't need to support timeline
      // modifications serialization.
      return syntheticEvent as T;
    }
  }

  private constructor(rawEvents: readonly Types.Events.Event[]) {
    this.#rawTraceEvents = rawEvents;
  }

  /**
   * Registers and returns a branded synthetic event. Synthetic events need to
   * be created with this method to ensure they are registered and made
   * available to load events using serialized keys.
   */
  #registerSyntheticEvent<T extends Types.Events.SyntheticBased>(syntheticEvent: Omit<T, '_tag'>): T {
    const eventAsSynthetic = syntheticEvent as T;
    this.#syntheticEventByRawEvent.set(syntheticEvent.rawSourceEvent, eventAsSynthetic);
    return eventAsSynthetic;
  }

  syntheticEventForRawEventIndex(rawEventIndex: number): Types.Events.SyntheticBased {
    const rawEvent = this.#rawTraceEvents.at(rawEventIndex);
    const syntheticEvent = rawEvent && this.#syntheticEventByRawEvent.get(rawEvent);
    if (!syntheticEvent) {
      throw new Error(`Attempted to get a synthetic event from an unknown raw event index: ${rawEventIndex}`);
    }
    return syntheticEvent;
  }

  getRawTraceEvents(): readonly Types.Events.Event[] {
    return this.#rawTraceEvents;
  }
}
