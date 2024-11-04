// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describe('GPUHandler', function() {
  beforeEach(() => {
    Trace.Handlers.ModelHandlers.Meta.reset();
  });

  it('finds all the GPU Tasks for the main GPU Thread', async function() {
    const events = await TraceLoader.rawEvents(this, 'threejs-gpu.json.gz');

    for (const event of events) {
      Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
      Trace.Handlers.ModelHandlers.GPU.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Meta.finalize();
    await Trace.Handlers.ModelHandlers.GPU.finalize();

    const gpuEvents = Trace.Handlers.ModelHandlers.GPU.data().mainGPUThreadTasks;
    assert.lengthOf(gpuEvents, 201);
  });
});
