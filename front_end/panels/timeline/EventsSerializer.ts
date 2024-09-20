// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';

export class EventsSerializer {
  #modifiedProfileCallByKey: Map<Trace.Types.File.ProfileCallKeyValues, Trace.Types.Events.SyntheticProfileCall> =
      new Map();

  keyForEvent(event: Trace.Types.Events.Event): Trace.Types.File.SerializableKey|null {
    if (Trace.Types.Events.isProfileCall(event)) {
      return `${Trace.Types.File.EventKeyType.PROFILE_CALL}-${event.pid}-${event.tid}-${
          Trace.Types.Events.SampleIndex(event.sampleIndex)}-${event.nodeId}`;
    }

    if (Trace.Types.Events.isLegacyTimelineFrame(event)) {
      return `${Trace.Types.File.EventKeyType.LEGACY_TIMELINE_FRAME}-${event.index}`;
    }

    const rawEvents = Trace.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager().getRawTraceEvents();
    const key: Trace.Types.File.SyntheticEventKey|Trace.Types.File.RawEventKey =
        Trace.Types.Events.isSyntheticBased(event) ?
        `${Trace.Types.File.EventKeyType.SYNTHETIC_EVENT}-${rawEvents.indexOf(event.rawSourceEvent)}` :
        `${Trace.Types.File.EventKeyType.RAW_EVENT}-${rawEvents.indexOf(event)}`;
    if (key.length < 3) {
      return null;
    }
    return key;
  }

  eventForKey(key: Trace.Types.File.SerializableKey, parsedTrace: Trace.Handlers.Types.ParsedTrace):
      Trace.Types.Events.Event {
    const eventValues = Trace.Types.File.traceEventKeyToValues(key);

    if (EventsSerializer.isProfileCallKey(eventValues)) {
      return this.#getModifiedProfileCallByKeyValues(eventValues, parsedTrace);
    }

    if (EventsSerializer.isLegacyTimelineFrameKey(eventValues)) {
      const event = parsedTrace.Frames.frames.at(eventValues.rawIndex);
      if (!event) {
        throw new Error(`Could not find frame with index ${eventValues.rawIndex}`);
      }
      return event;
    }

    if (EventsSerializer.isSyntheticEventKey(eventValues)) {
      const syntheticEvents =
          Trace.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager().getSyntheticTraces();
      const syntheticEvent = syntheticEvents.at(eventValues.rawIndex);
      if (!syntheticEvent) {
        throw new Error(`Attempted to get a synthetic event from an unknown raw event index: ${eventValues.rawIndex}`);
      }
      return syntheticEvent;
    }

    if (EventsSerializer.isRawEventKey(eventValues)) {
      const rawEvents = Trace.Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager().getRawTraceEvents();
      return rawEvents[eventValues.rawIndex];
    }
    throw new Error(`Unknown trace event serializable key values: ${(eventValues as Array<unknown>).join('-')}`);
  }

  static isProfileCallKey(key: Trace.Types.File.SerializableKeyValues): key is Trace.Types.File.ProfileCallKeyValues {
    return key.type === Trace.Types.File.EventKeyType.PROFILE_CALL;
  }
  static isLegacyTimelineFrameKey(key: Trace.Types.File.SerializableKeyValues):
      key is Trace.Types.File.LegacyTimelineFrameKeyValues {
    return key.type === Trace.Types.File.EventKeyType.LEGACY_TIMELINE_FRAME;
  }

  static isRawEventKey(key: Trace.Types.File.SerializableKeyValues): key is Trace.Types.File.RawEventKeyValues {
    return key.type === Trace.Types.File.EventKeyType.RAW_EVENT;
  }
  static isSyntheticEventKey(key: Trace.Types.File.SerializableKeyValues):
      key is Trace.Types.File.SyntheticEventKeyValues {
    return key.type === Trace.Types.File.EventKeyType.SYNTHETIC_EVENT;
  }

  #getModifiedProfileCallByKeyValues(
      key: Trace.Types.File.ProfileCallKeyValues,
      parsedTrace: Trace.Handlers.Types.ParsedTrace): Trace.Types.Events.SyntheticProfileCall {
    const cacheResult = this.#modifiedProfileCallByKey.get(key);
    if (cacheResult) {
      return cacheResult;
    }
    const profileCallsInThread =
        parsedTrace.Renderer.processes.get(key.processID)?.threads.get(key.threadID)?.profileCalls;
    if (!profileCallsInThread) {
      throw new Error(`Unknown profile call serializable key: ${(key)}`);
    }

    const match = profileCallsInThread?.find(e => {
      return e.sampleIndex === key.sampleIndex && e.nodeId === key.protocol;
    });
    if (!match) {
      throw new Error(`Unknown profile call serializable key: ${(JSON.stringify(key))}`);
    }
    // Cache to avoid looking up in subsequent calls.
    this.#modifiedProfileCallByKey.set(key, match);
    return match;
  }
}
