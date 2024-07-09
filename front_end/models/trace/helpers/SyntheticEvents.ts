// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Types from '../types/types.js';

const syntheticEventsManagerByTraceIndex: SyntheticEventsManager[] = [];

const managerByRawEvents = new Map<readonly Types.TraceEvents.TraceEventData[], SyntheticEventsManager>();

let activeManager: SyntheticEventsManager|null = null;

export class SyntheticEventsManager {
  /**
   * All synthetic entries created in a trace from a corresponding trace events.
   * (ProfileCalls are excluded because)
   */
  #syntheticTraceEvents: Types.TraceEvents.SyntheticBasedEvent[] = [];
  /**
   * All raw entries from a trace.
   */
  #rawTraceEvents: readonly Types.TraceEvents.TraceEventData[] = [];

  /**
   * Initializes a SyntheticEventsManager for a trace. This needs to be
   * called before running the trace engine handlers, since the instance
   * created here will be used by the handlers to register their
   * synthetic trace events.
   *
   * Can be called multiple times for the same set of raw events, in which case it will re-use the existing manager rather than recreate it again.
   */
  static initAndActivate(rawEvents: readonly Types.TraceEvents.TraceEventData[]): SyntheticEventsManager {
    const existingManager = managerByRawEvents.get(rawEvents);
    if (existingManager) {
      activeManager = existingManager;
    } else {
      const manager = new SyntheticEventsManager(rawEvents);
      managerByRawEvents.set(rawEvents, manager);
      activeManager = manager;
    }
    return activeManager;
  }

  static getActiveManager(): SyntheticEventsManager {
    if (!activeManager) {
      throw new Error('Attempted to get a SyntheticEventsManager without initializing');
    }
    return activeManager;
  }

  static reset(): void {
    syntheticEventsManagerByTraceIndex.length = 0;
    activeManager = null;
  }

  static registerSyntheticBasedEvent<T extends Types.TraceEvents.SyntheticBasedEvent>(syntheticEvent: Omit<T, '_tag'>):
      T {
    try {
      return SyntheticEventsManager.getActiveManager().registerSyntheticBasedEvent(syntheticEvent);
    } catch (e) {
      // If no active manager has been initialized, we assume the trace engine is
      // not running as part of the Performance panel. In this case we don't
      // register synthetic events because we don't need to support timeline
      // modifications serialization.
      return syntheticEvent as T;
    }
  }

  private constructor(rawEvents: readonly Types.TraceEvents.TraceEventData[]) {
    this.#rawTraceEvents = rawEvents;
  }

  /**
   * Registers and returns a branded synthetic event. Synthetic events need to
   * be created with this method to ensure they are registered and made
   * available to load events using serialized keys.
   */
  registerSyntheticBasedEvent<T extends Types.TraceEvents.SyntheticBasedEvent>(syntheticEvent: Omit<T, '_tag'>): T {
    const rawIndex = this.#rawTraceEvents.indexOf(syntheticEvent.rawSourceEvent);
    if (rawIndex < 0) {
      throw new Error('Attempted to register a synthetic event paired to an unknown raw event.');
    }
    const eventAsSynthetic = syntheticEvent as T;
    this.#syntheticTraceEvents[rawIndex] = eventAsSynthetic;
    return eventAsSynthetic;
  }

  syntheticEventForRawEventIndex(rawEventIndex: number): Types.TraceEvents.SyntheticBasedEvent {
    const syntheticEvent = this.#syntheticTraceEvents.at(rawEventIndex);
    if (!syntheticEvent) {
      throw new Error(`Attempted to get a synthetic event from an unknown raw event index: ${rawEventIndex}`);
    }
    return syntheticEvent;
  }

  getSyntheticTraceEvents(): Types.TraceEvents.SyntheticBasedEvent[] {
    return this.#syntheticTraceEvents;
  }

  getRawTraceEvents(): readonly Types.TraceEvents.TraceEventData[] {
    return this.#rawTraceEvents;
  }
}
