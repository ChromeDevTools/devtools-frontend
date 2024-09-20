// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describe('PageFramesHandler', () => {
  it('returns frames and their data', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
    Trace.Handlers.ModelHandlers.PageFrames.reset();
    for (const event of events) {
      Trace.Handlers.ModelHandlers.PageFrames.handleEvent(event);
    }
    const data = Trace.Handlers.ModelHandlers.PageFrames.data();
    const frames = Array.from(data.frames.entries());
    assert.deepEqual(frames, [

      [
        '25D2F12F1818C70B5BD4325CC9ACD8FF',
        {
          frame: '25D2F12F1818C70B5BD4325CC9ACD8FF',
          name: '',
          processId: Trace.Types.Events.ProcessID(90812),
          url: 'https://web.dev/',
        },
      ],
      [
        'DD911DEB03F2AAB573DE9CA330486E80',
        {
          frame: 'DD911DEB03F2AAB573DE9CA330486E80',
          name: '',
          parent: '25D2F12F1818C70B5BD4325CC9ACD8FF',
          processId: Trace.Types.Events.ProcessID(90824),
          url: 'https://shared-storage-demo-content-producer.web.app/paa/scripts/private-aggregation-test.html',
        },
      ],
    ]);
  });
});
