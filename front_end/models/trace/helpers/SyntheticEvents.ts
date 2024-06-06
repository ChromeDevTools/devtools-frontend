// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Types from '../types/types.js';

const syntheticEventsManagerByTraceIndex: SyntheticEventsManager[] = [];

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
   */
  static initSyntheticEventsManagerForTrace(rawEvents: readonly Types.TraceEvents.TraceEventData[]):
      SyntheticEventsManager {
    const manager = new SyntheticEventsManager(rawEvents);
    syntheticEventsManagerByTraceIndex.push(manager);
    return manager;
  }

  /**
   * Gets the SyntheticEventsManager instance for a trace given the index
   * of the trace given its index used in Model#traces. If no index is
   * passed, defaults to the last created instance.
   * If no instance is found throws error.
   */
  static getManagerForTrace(traceIndex?: number): SyntheticEventsManager {
    const last = syntheticEventsManagerByTraceIndex.at(-1);
    if (!last) {
      throw new Error('Attempted to get a SyntheticEventsManager without initializing');
    }
    if (traceIndex === undefined) {
      return last;
    }
    const manager = syntheticEventsManagerByTraceIndex.at(traceIndex);
    if (!manager) {
      throw new Error(`Attempted to get a SyntheticEventsManager with an invalid index ${traceIndex}`);
    }
    return manager;
  }

  static getActiveManager(): SyntheticEventsManager {
    const last = syntheticEventsManagerByTraceIndex.at(-1);
    if (!last) {
      throw new Error('Attempted to get a SyntheticEventsManager without initializing');
    }
    return SyntheticEventsManager.getManagerForTrace(syntheticEventsManagerByTraceIndex.length - 1);
  }

  static reset(): void {
    syntheticEventsManagerByTraceIndex.length = 0;
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
