// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const {assert} = chai;
import * as TraceEngine from '../../../../../../front_end/models/trace/trace.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

describe('MemoryHandler', function() {
  beforeEach(() => {
    TraceEngine.Handlers.ModelHandlers.Meta.reset();
    TraceEngine.Handlers.ModelHandlers.Memory.reset();
  });

  it('gathers update counters', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev.json.gz');
    TraceEngine.Handlers.ModelHandlers.Meta.initialize();
    for (const event of events) {
      TraceEngine.Handlers.ModelHandlers.Meta.handleEvent(event);
      TraceEngine.Handlers.ModelHandlers.Memory.handleEvent(event);
    }
    await TraceEngine.Handlers.ModelHandlers.Meta.finalize();

    const data = TraceEngine.Handlers.ModelHandlers.Memory.data();
    const meta = TraceEngine.Handlers.ModelHandlers.Meta.data();
    const topLevelProcesses = Array.from(meta.topLevelRendererIds);
    const expectedPid = TraceEngine.Types.TraceEvents.ProcessID(73704);
    assert.deepEqual(topLevelProcesses, [expectedPid]);
    assert.strictEqual(data.updateCountersByProcess.get(expectedPid)?.length, 158);
  });
});
