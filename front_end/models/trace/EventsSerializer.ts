// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from './helpers/helpers.js';
import type {ParsedTrace} from './ModelImpl.js';
import * as Types from './types/types.js';

export class EventsSerializer {
  #modifiedProfileCallByKey = new Map<Types.File.ProfileCallKeyValues, Types.Events.SyntheticProfileCall>();

  keyForEvent(event: Types.Events.Event): Types.File.SerializableKey|null {
    if (Types.Events.isProfileCall(event)) {
      return `${Types.File.EventKeyType.PROFILE_CALL}-${event.pid}-${event.tid}-${
          Types.Events.SampleIndex(event.sampleIndex)}-${event.nodeId}`;
    }

    if (Types.Events.isLegacyTimelineFrame(event)) {
      return `${Types.File.EventKeyType.LEGACY_TIMELINE_FRAME}-${event.index}`;
    }

    const rawEvents = Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager().getRawTraceEvents();
    const key: Types.File.SyntheticEventKey|Types.File.RawEventKey = Types.Events.isSyntheticBased(event) ?
        `${Types.File.EventKeyType.SYNTHETIC_EVENT}-${rawEvents.indexOf(event.rawSourceEvent)}` :
        `${Types.File.EventKeyType.RAW_EVENT}-${rawEvents.indexOf(event)}`;
    if (key.length < 3) {
      return null;
    }
    return key;
  }

  eventForKey(key: Types.File.SerializableKey, parsedTrace: ParsedTrace): Types.Events.Event {
    const eventValues = Types.File.traceEventKeyToValues(key);

    if (EventsSerializer.isProfileCallKey(eventValues)) {
      return this.#getModifiedProfileCallByKeyValues(eventValues, parsedTrace);
    }

    if (EventsSerializer.isLegacyTimelineFrameKey(eventValues)) {
      const event = parsedTrace.data.Frames.frames.at(eventValues.rawIndex);
      if (!event) {
        throw new Error(`Unknown trace event. Could not find frame with index ${eventValues.rawIndex}`);
      }
      return event;
    }

    if (EventsSerializer.isSyntheticEventKey(eventValues)) {
      const syntheticEvents = Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager().getSyntheticTraces();
      const syntheticEvent = syntheticEvents.at(eventValues.rawIndex);
      if (!syntheticEvent) {
        throw new Error(`Unknown trace event. Attempted to get a synthetic event from an unknown raw event index: ${
            eventValues.rawIndex}`);
      }
      return syntheticEvent;
    }

    if (EventsSerializer.isRawEventKey(eventValues)) {
      const rawEvents = Helpers.SyntheticEvents.SyntheticEventsManager.getActiveManager().getRawTraceEvents();
      return rawEvents[eventValues.rawIndex];
    }
    throw new Error(`Unknown trace event. Serializable key values: ${(eventValues as unknown[]).join('-')}`);
  }

  static isProfileCallKey(key: Types.File.SerializableKeyValues): key is Types.File.ProfileCallKeyValues {
    return key.type === Types.File.EventKeyType.PROFILE_CALL;
  }
  static isLegacyTimelineFrameKey(key: Types.File.SerializableKeyValues):
      key is Types.File.LegacyTimelineFrameKeyValues {
    return key.type === Types.File.EventKeyType.LEGACY_TIMELINE_FRAME;
  }

  static isRawEventKey(key: Types.File.SerializableKeyValues): key is Types.File.RawEventKeyValues {
    return key.type === Types.File.EventKeyType.RAW_EVENT;
  }
  static isSyntheticEventKey(key: Types.File.SerializableKeyValues): key is Types.File.SyntheticEventKeyValues {
    return key.type === Types.File.EventKeyType.SYNTHETIC_EVENT;
  }

  #getModifiedProfileCallByKeyValues(key: Types.File.ProfileCallKeyValues, parsedTrace: ParsedTrace):
      Types.Events.SyntheticProfileCall {
    const cacheResult = this.#modifiedProfileCallByKey.get(key);
    if (cacheResult) {
      return cacheResult;
    }
    const profileCallsInThread =
        parsedTrace.data.Renderer.processes.get(key.processID)?.threads.get(key.threadID)?.profileCalls;
    if (!profileCallsInThread) {
      throw new Error(`Unknown profile call serializable key: ${(key)}`);
    }

    const match = profileCallsInThread?.find((e: Types.Events.SyntheticProfileCall) => {
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
