// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {getMainThread} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Trace from './trace.js';

function findFirstEntry(
    allEntries: readonly Trace.Types.Events.Event[],
    predicate: (entry: Trace.Types.Events.Event) => boolean): Trace.Types.Events.Event {
  const entry = allEntries.find(entry => predicate(entry));
  if (!entry) {
    throw new Error('Could not find expected entry.');
  }
  return entry;
}

describeWithEnvironment('EventsSerializer', () => {
  it('correctly implements a bidirectional key <-> event mapping', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'basic-stack.json.gz');
    const eventsSerializer = new Trace.EventsSerializer.EventsSerializer();
    const mainThread = getMainThread(parsedTrace.data.Renderer);
    // Find first 'Timer Fired' entry in the trace
    const rawEntry = findFirstEntry(mainThread.entries, entry => {
      return entry.name === 'TimerFire';
    });

    const syntheticEvent = parsedTrace.data.NetworkRequests.byTime[0];
    const profileCall = findFirstEntry(mainThread.entries, entry => Trace.Types.Events.isProfileCall(entry));
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

    const resolvedRawEntry = eventsSerializer.eventForKey(rawEntryKey, parsedTrace);
    const resolvedSyntheticEntry = eventsSerializer.eventForKey(syntheticEventKey, parsedTrace);
    const resolvedProfileCall = eventsSerializer.eventForKey(profileCallKey, parsedTrace);

    // Test key -> event mappings
    assert.strictEqual(resolvedRawEntry, rawEntry);
    assert.strictEqual(resolvedSyntheticEntry, syntheticEvent);
    assert.strictEqual(resolvedProfileCall, profileCall);
  });

  it('correctly maps to and from legacy timeline frames', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const eventsSerializer = new Trace.EventsSerializer.EventsSerializer();

    const frame = parsedTrace.data.Frames.frames.at(0);
    assert.isOk(frame);

    const frameKey = eventsSerializer.keyForEvent(frame);
    assert.isOk(frameKey);
    assert.strictEqual(frameKey, 'l-0');

    const resolvedFrame = eventsSerializer.eventForKey(frameKey, parsedTrace);
    assert.strictEqual(resolvedFrame, frame);
  });
});
