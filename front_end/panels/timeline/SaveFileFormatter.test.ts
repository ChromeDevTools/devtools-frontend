// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../models/trace/trace.js';
import {defaultTraceEvent} from '../../testing/TraceHelpers.js';

import * as Timeline from './timeline.js';

describe('SaveFileFormatter', () => {
  function assertValidJSON(input: string) {
    try {
      JSON.parse(input);
    } catch {
      assert.fail('Parsing input as JSON failed');
    }
  }
  describe('arrayOfObjectsJsonGenerator', () => {
    it('generates JSON where each event is on its own line', async () => {
      const eventOne = {...defaultTraceEvent, name: 'event_one'};
      const eventTwo = {...defaultTraceEvent, name: 'event_two'};

      const formatted =
          Array.from(Timeline.SaveFileFormatter.arrayOfObjectsJsonGenerator([eventOne, eventTwo])).join('');
      assertValidJSON(formatted);
      assert.strictEqual(formatted, `[
  {"name":"event_one","tid":0,"pid":0,"ts":0,"cat":"test","ph":"M"},
  {"name":"event_two","tid":0,"pid":0,"ts":0,"cat":"test","ph":"M"}
]`);
    });
  });

  describe('traceJsonGenerator', () => {
    it('contains top level keys for the events and for the metadata', async () => {
      const eventOne = {...defaultTraceEvent, name: 'event_one'};
      const eventTwo = {...defaultTraceEvent, name: 'event_two'};
      const events = [eventOne, eventTwo];
      const metadata: Trace.Types.File.MetaData = {
        source: 'DevTools',
        startTime: '1234',
        networkThrottling: '4',
        cpuThrottling: 1,
        hardwareConcurrency: 1,
        enhancedTraceVersion: 1,
      };
      const formatted = Array.from(Timeline.SaveFileFormatter.traceJsonGenerator(events, metadata)).join('');
      assertValidJSON(formatted);
      assert.strictEqual(formatted, `{"metadata": {
  "source": "DevTools",
  "startTime": "1234",
  "networkThrottling": "4",
  "cpuThrottling": 1,
  "hardwareConcurrency": 1,
  "enhancedTraceVersion": 1
},
"traceEvents": [
  {"name":"event_one","tid":0,"pid":0,"ts":0,"cat":"test","ph":"M"},
  {"name":"event_two","tid":0,"pid":0,"ts":0,"cat":"test","ph":"M"}
]}\n`);
    });

    it('will emit {} for the metadata if none is provided', async () => {
      const eventOne = {...defaultTraceEvent, name: 'event_one'};
      const eventTwo = {...defaultTraceEvent, name: 'event_two'};
      const events = [eventOne, eventTwo];
      const formatted = Array.from(Timeline.SaveFileFormatter.traceJsonGenerator(events, null)).join('');
      assertValidJSON(formatted);
      assert.strictEqual(formatted, `{"metadata": {},
"traceEvents": [
  {"name":"event_one","tid":0,"pid":0,"ts":0,"cat":"test","ph":"M"},
  {"name":"event_two","tid":0,"pid":0,"ts":0,"cat":"test","ph":"M"}
]}\n`);
    });
  });
});
