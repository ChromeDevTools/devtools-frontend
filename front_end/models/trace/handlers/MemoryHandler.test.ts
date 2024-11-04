// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describe('MemoryHandler', function() {
  beforeEach(() => {
    Trace.Handlers.ModelHandlers.Meta.reset();
    Trace.Handlers.ModelHandlers.Memory.reset();
  });

  it('gathers update counters', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev.json.gz');
    for (const event of events) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      Trace.Handlers.ModelHandlers.Memory.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();

    const data = Trace.Handlers.ModelHandlers.Memory.data();
    const meta = Trace.Handlers.ModelHandlers.Meta.data();
    const topLevelProcesses = Array.from(meta.topLevelRendererIds);
    const expectedPid = Trace.Types.Events.ProcessID(73704);
    assert.deepEqual(topLevelProcesses, [expectedPid]);
    assert.strictEqual(data.updateCountersByProcess.get(expectedPid)?.length, 158);
  });
});
