// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Types from '../types/types.js';

let activeManager: SyntheticEventsManager|null = null;

export class SyntheticEventsManager {
  /**
   * All synthetic entries created in a trace from a corresponding trace events.
   * (ProfileCalls are excluded because they are not based on a real trace event)
   */
  #syntheticTraces: Types.Events.SyntheticBased[] = [];
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
      return SyntheticEventsManager.getActiveManager().registerSyntheticEvent(syntheticEvent);
    } catch (e) {
      // If no active manager has been initialized, we assume the trace engine is
      // not running as part of the Performance panel. In this case we don't
      // register synthetic events because we don't need to support timeline
      // modifications serialization.
      return syntheticEvent as T;
    }
  }

  static registerServerTiming(syntheticEvent: Omit<Types.Events.SyntheticServerTiming, '_tag'>):
      Types.Events.SyntheticServerTiming {
    // TODO(crbug.com/340811171): Implement
    return syntheticEvent as Types.Events.SyntheticServerTiming;
  }

  private constructor(rawEvents: readonly Types.Events.Event[]) {
    this.#rawTraceEvents = rawEvents;
  }

  /**
   * Registers and returns a branded synthetic event. Synthetic events need to
   * be created with this method to ensure they are registered and made
   * available to load events using serialized keys.
   */
  registerSyntheticEvent<T extends Types.Events.SyntheticBased>(syntheticEvent: Omit<T, '_tag'>): T {
    const rawIndex = this.#rawTraceEvents.indexOf(syntheticEvent.rawSourceEvent);
    if (rawIndex < 0) {
      throw new Error('Attempted to register a synthetic event paired to an unknown raw event.');
    }
    const eventAsSynthetic = syntheticEvent as T;
    this.#syntheticTraces[rawIndex] = eventAsSynthetic;
    return eventAsSynthetic;
  }

  syntheticEventForRawEventIndex(rawEventIndex: number): Types.Events.SyntheticBased {
    const syntheticEvent = this.#syntheticTraces.at(rawEventIndex);
    if (!syntheticEvent) {
      throw new Error(`Attempted to get a synthetic event from an unknown raw event index: ${rawEventIndex}`);
    }
    return syntheticEvent;
  }

  getSyntheticTraces(): Types.Events.SyntheticBased[] {
    return this.#syntheticTraces;
  }

  getRawTraceEvents(): readonly Types.Events.Event[] {
    return this.#rawTraceEvents;
  }
}
