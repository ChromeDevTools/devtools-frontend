// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as TraceEngine from '../../models/trace/trace.js';

export class EventsSerializer {
  #modifiedProfileCallByKey:
      Map<TraceEngine.Types.File.ProfileCallKey, TraceEngine.Types.TraceEvents.SyntheticProfileCall> = new Map();

  keyForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData): TraceEngine.Types.File.TraceEventSerializableKey
      |null {
    if (TraceEngine.Types.TraceEvents.isProfileCall(event)) {
      return ['p', event.pid, event.tid, TraceEngine.Types.TraceEvents.SampleIndex(event.sampleIndex), event.nodeId];
    }
    const rawEvents = TraceEngine.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager().getRawTraceEvents();
    const key: TraceEngine.Types.File.SyntheticEventKey|TraceEngine.Types.File.RawEventKey =
        TraceEngine.Types.TraceEvents.isSyntheticBasedEvent(event) ? ['s', rawEvents.indexOf(event.rawSourceEvent)] :
                                                                     ['r', rawEvents.indexOf(event)];
    if (key[1] < 0) {
      return null;
    }
    return key;
  }

  static isTraceEventSerializableKey(key: (number|string)[]): key is TraceEngine.Types.File.TraceEventSerializableKey {
    const maybeValidKey = key as TraceEngine.Types.File.TraceEventSerializableKey;
    if (EventsSerializer.isProfileCallKey(maybeValidKey)) {
      return key.length === 5 &&
          key.every((entry, i) => i === 0 || typeof entry === 'number' || !isNaN(parseInt(entry, 10)));
    }
    if (EventsSerializer.isRawEventKey(maybeValidKey) || EventsSerializer.isSyntheticEventKey(maybeValidKey)) {
      return key.length === 2 && (typeof key[1] === 'number' || !isNaN(parseInt(key[1], 10)));
    }
    return false;
  }

  eventForKey(
      key: TraceEngine.Types.File.TraceEventSerializableKey,
      traceParsedData: TraceEngine.Handlers.Types.TraceParseData): TraceEngine.Types.TraceEvents.TraceEventData {
    if (EventsSerializer.isProfileCallKey(key)) {
      return this.#getModifiedProfileCallByKey(key, traceParsedData);
    }
    if (EventsSerializer.isSyntheticEventKey(key)) {
      const syntheticEvents =
          TraceEngine.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager().getSyntheticTraceEvents();
      const syntheticEvent = syntheticEvents.at(key[1]);
      if (!syntheticEvent) {
        throw new Error(`Attempted to get a synthetic event from an unknown raw event index: ${key[1]}`);
      }
      return syntheticEvent;
    }
    if (EventsSerializer.isRawEventKey(key)) {
      const rawEvents =
          TraceEngine.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager().getRawTraceEvents();
      return rawEvents[key[1]];
    }
    throw new Error(`Unknown trace event serializable key: ${(key as Array<unknown>).join('-')}`);
  }

  static isProfileCallKey(key: TraceEngine.Types.File.TraceEventSerializableKey):
      key is TraceEngine.Types.File.ProfileCallKey {
    return key[0] === 'p';
  }
  static isRawEventKey(key: TraceEngine.Types.File.TraceEventSerializableKey):
      key is TraceEngine.Types.File.RawEventKey {
    return key[0] === 'r';
  }
  static isSyntheticEventKey(key: TraceEngine.Types.File.TraceEventSerializableKey):
      key is TraceEngine.Types.File.SyntheticEventKey {
    return key[0] === 's';
  }

  #getModifiedProfileCallByKey(
      key: TraceEngine.Types.File.ProfileCallKey,
      traceParsedData: TraceEngine.Handlers.Types.TraceParseData): TraceEngine.Types.TraceEvents.SyntheticProfileCall {
    const cacheResult = this.#modifiedProfileCallByKey.get(key);
    if (cacheResult) {
      return cacheResult;
    }
    const processId = key[1];
    const threadId = key[2];
    const sampleIndex = key[3];
    const nodeId = key[4];
    const profileCallsInThread = traceParsedData.Renderer.processes.get(processId)?.threads.get(threadId)?.profileCalls;
    if (!profileCallsInThread) {
      throw new Error(`Unknown profile call serializable key: ${(key as Array<unknown>).join('-')}`);
    }

    // Do a binary search on the complete profile call list to efficiently lookup for a
    // match based on sample index and node id. We need both because multiple calls can share
    // the same sample index, in which case we need to break the tie with the node id (by which
    // calls in a sample stack are ordered, allowing us to do a single search).
    const matchRangeStartIndex = Platform.ArrayUtilities.nearestIndexFromBeginning(
        profileCallsInThread, e => e.sampleIndex >= sampleIndex && e.nodeId >= nodeId);

    const match = matchRangeStartIndex !== null && profileCallsInThread.at(matchRangeStartIndex);
    if (!match) {
      throw new Error(`Unknown profile call serializable key: ${(key as Array<unknown>).join('-')}`);
    }
    // Cache to avoid looking up in subsequent calls.
    this.#modifiedProfileCallByKey.set(key, match);
    return match;
  }
}
