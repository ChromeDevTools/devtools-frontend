// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';
import {getMainThread} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as EventsSerializer from './events_serializer.js';

function findFirstEntry(
    allEntries: readonly TraceEngine.Types.TraceEvents.SyntheticTraceEntry[],
    predicate: (entry: TraceEngine.Types.TraceEvents.SyntheticTraceEntry) =>
        boolean): TraceEngine.Types.TraceEvents.SyntheticTraceEntry {
  const entry = allEntries.find(entry => predicate(entry));
  if (!entry) {
    throw new Error('Could not find expected entry.');
  }
  return entry;
}

describe('ModificationsManager', () => {
  it('correctly implements a bidirectional key <-> event mapping', async function() {
    const data = await TraceLoader.traceEngine(null, 'basic-stack.json.gz');
    const eventsSerializer = new EventsSerializer.EventsSerializer();
    if (!eventsSerializer) {
      throw new Error('Modifications manager does not exist.');
    }
    const mainThread = getMainThread(data.Renderer);
    assert.exists(eventsSerializer);
    // Find first 'Timer Fired' entry in the trace
    const rawEntry = findFirstEntry(mainThread.entries, entry => {
      return entry.name === 'TimerFire';
    });

    const syntheticEvent = data.NetworkRequests.byTime[0];
    const profileCall = findFirstEntry(mainThread.entries, entry => TraceEngine.Types.TraceEvents.isProfileCall(entry));
    const rawEntryKey = eventsSerializer.keyForEvent(rawEntry);
    const syntheticEventKey = eventsSerializer.keyForEvent(syntheticEvent);
    const profileCallKey = eventsSerializer.keyForEvent(profileCall);

    // Test event -> key mappings
    assert.deepEqual(rawEntryKey, 'r-8036');
    assert.deepEqual(syntheticEventKey, 's-2078');
    assert.deepEqual(profileCallKey, 'p-55385-259-38-4');

    assert.isOk(rawEntryKey);
    assert.isOk(syntheticEventKey);
    assert.isOk(profileCallKey);

    const resolvedRawEntry = eventsSerializer.eventForKey(rawEntryKey, data);
    const resolvedSyntheticEntry = eventsSerializer.eventForKey(syntheticEventKey, data);
    const resolvedProfileCall = eventsSerializer.eventForKey(profileCallKey, data);

    // Test key -> event mappings
    assert.strictEqual(resolvedRawEntry, rawEntry);
    assert.strictEqual(resolvedSyntheticEntry, syntheticEvent);
    assert.strictEqual(resolvedProfileCall, profileCall);
  });
});
