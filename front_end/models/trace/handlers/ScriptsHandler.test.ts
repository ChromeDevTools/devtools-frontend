// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// eslint-disable-next-line rulesdir/no-imports-in-directory
import type * as SDK from '../../../core/sdk/sdk.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describe('ScriptsHandler', () => {
  beforeEach(async function() {
    Trace.Handlers.ModelHandlers.Scripts.reset();
    const events = await TraceLoader.rawEvents(this, 'enhanced-traces.json.gz');
    for (const event of events) {
      Trace.Handlers.ModelHandlers.Scripts.handleEvent(event);
    }
    await Trace.Handlers.ModelHandlers.Scripts.finalize({
      async resolveSourceMap(url: string): Promise<SDK.SourceMap.SourceMap> {
        // Don't need to actually make a source map.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return {test: url} as any;
      }
    });
  });

  afterEach(() => {
    Trace.Handlers.ModelHandlers.Scripts.reset();
  });

  it('collects scripts contents', async function() {
    const data = Trace.Handlers.ModelHandlers.Scripts.data();
    assert.deepEqual([...data.scripts.values()], [
      {
        scriptId: '1',
        frame: '3E1717BE677B75D0536E292E00D6A34A',
        ts: 50442438976,
        url: 'http://localhost:8080/index.html',
        content: ' text ',
        sourceMapUrl: 'http://localhost:8080/source.map.json',
        sourceMap: {test: 'http://localhost:8080/source.map.json'}
      },
      {
        scriptId: '2',
        frame: '21D58E83A5C17916277166140F6A464B',
        ts: 50442438976,
        url: 'http://localhost:8080/index.html',
        content: 'source text 2'
      },
    ]);
  });
});
