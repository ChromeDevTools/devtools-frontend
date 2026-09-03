// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as AiAssistance from '../ai_assistance.js';

describe('AgentFocus', function() {
  it('lookupEvent catches all errors and returns null for invalid event keys', async function() {
    const parsedTrace =
        await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz', undefined, {withTimelinePanel: false});
    const focus = AiAssistance.AIContext.AgentFocus.fromParsedTrace(parsedTrace);

    const invalidKey = 'r-invalid';
    const result = focus.lookupEvent(invalidKey);

    assert.isNull(result);
  });

  it('lookupEvent returns the event for a valid event key', async function() {
    const parsedTrace =
        await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz', undefined, {withTimelinePanel: false});
    const focus = AiAssistance.AIContext.AgentFocus.fromParsedTrace(parsedTrace);

    const rawEvent = parsedTrace.traceEvents[0];
    const key = focus.eventsSerializer.keyForEvent(rawEvent);
    assert.exists(key);

    const result = focus.lookupEvent(key!);
    assert.strictEqual(result, rawEvent);
  });
});
