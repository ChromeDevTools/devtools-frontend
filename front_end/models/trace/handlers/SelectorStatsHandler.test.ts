// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describe('SelectorStatsHandler', () => {
  it('associates timings and stats with each RecalcStyleEvent', async function() {
    Trace.Handlers.ModelHandlers.SelectorStats.reset();

    const events = await TraceLoader.rawEvents(this, 'selector-stats.json.gz');
    for (const event of events) {
      Trace.Handlers.ModelHandlers.SelectorStats.handleEvent(event);
    }
    const data = Trace.Handlers.ModelHandlers.SelectorStats.data();

    // There are 10 RecalcStyle events that we expect to find
    // SelectorStats for.
    assert.strictEqual(data.dataForRecalcStyleEvent.size, 10);

    // We need the first recalcStyleEvent that happened before the
    // SelectorStats. This timestamp was found by looking through the trace and
    // finding the first SelectorStats event, and then finding the closest
    // previous RecalcStyleEvent
    const targetTimeStamp = 400015719531;
    const recalcStyleEvent = events.find(event => {
      return Trace.Types.Events.isRecalcStyle(event) && event.ts === targetTimeStamp;
    });
    assert.isOk(recalcStyleEvent);

    assert.isOk(Trace.Types.Events.isRecalcStyle(recalcStyleEvent), 'Event was of the wrong type.');

    const selectorInfo = data.dataForRecalcStyleEvent.get(recalcStyleEvent);
    assert.isOk(selectorInfo);
    // Ensure that we dumped the timings into the event
    assert.lengthOf(selectorInfo.timings, 325);
  });
});
