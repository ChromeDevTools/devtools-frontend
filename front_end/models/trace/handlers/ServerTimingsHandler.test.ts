// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describeWithEnvironment('ServerTimingsHandler', () => {
  it('extracts server timings from network request trace events', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'server-timings.json.gz');
    const events = parsedTrace.parsedTrace.ServerTimings.serverTimings;
    const timingData =
        events.map(({name, dur, ts, args}) => ({name, dur, ts, desc: args.data.desc, origin: args.data.origin}));
    assert.deepEqual(timingData, [
      {
        dur: Trace.Types.Timing.MicroSeconds(1004293.2819999987),
        name: 'Topleveltask1',
        ts: Trace.Types.Timing.MicroSeconds(80542636965.7475),
        desc: 'Description of top level task 1',
        origin: 'https://node-server-tan.vercel.app',
      },
      {
        dur: Trace.Types.Timing.MicroSeconds(904293.2819999987),
        name: 'Secondleveltask1',
        ts: Trace.Types.Timing.MicroSeconds(80542686965.7475),
        desc: 'Description of second level task 1',
        origin: 'https://node-server-tan.vercel.app',
      },
      {
        dur: Trace.Types.Timing.MicroSeconds(1000092.5859999988),
        name: 'Topleveltask2',
        ts: Trace.Types.Timing.MicroSeconds(80543641261.0185),
        desc: undefined,
        origin: 'https://node-server-tan.vercel.app',
      },
    ]);
  });
});
