// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as TraceEngine from '../trace.js';

describe('EnhancedTracesHandler', () => {
  beforeEach(async function() {
    TraceEngine.Handlers.ModelHandlers.EnhancedTraces.reset();
    const events = await TraceLoader.rawEvents(this, 'enhanced-traces.json.gz');
    TraceEngine.Handlers.ModelHandlers.EnhancedTraces.initialize();
    for (const event of events) {
      TraceEngine.Handlers.ModelHandlers.EnhancedTraces.handleEvent(event);
    }
    await TraceEngine.Handlers.ModelHandlers.EnhancedTraces.finalize();
  });
  afterEach(() => {
    TraceEngine.Handlers.ModelHandlers.EnhancedTraces.reset();
  });

  it('captures targets from target rundown events', async function() {
    const data = TraceEngine.Handlers.ModelHandlers.EnhancedTraces.data();
    assert.deepEqual(data.targets, [
      {
        id: '21D58E83A5C17916277166140F6A464B',
        type: 'page',
        isolate: '12345',
        pid: 8050,
        url: 'http://localhost:8080/index.html',
      },
      {
        id: '3E1717BE677B75D0536E292E00D6A34A',
        type: 'page',
        isolate: '6789',
        pid: 8051,
        url: 'http://localhost:8080/index.html',
      },
    ]);
  });

  it('captures execution context info', async function() {
    const data = TraceEngine.Handlers.ModelHandlers.EnhancedTraces.data();
    assert.deepEqual(data.executionContexts, [
      {
        id: 1,
        origin: 'http://localhost:8080',
        v8Context: 'example context 1',
        auxData: {
          frameId: '21D58E83A5C17916277166140F6A464B',
          isDefault: true,
          type: 'type',
        },
      },
      {
        id: 2,
        origin: 'http://localhost:8080',
        v8Context: 'example context 2',
        auxData: {
          frameId: '21D58E83A5C17916277166140F6A464B',
          isDefault: true,
          type: 'type',
        },
      },
      {
        id: 1,
        origin: 'http://localhost:8080',
        v8Context: 'example context 3',
        auxData: {
          frameId: '3E1717BE677B75D0536E292E00D6A34A',
          isDefault: true,
          type: 'type',
        },
      },
    ]);
  });

  it('captures script info and source text', async function() {
    const data = TraceEngine.Handlers.ModelHandlers.EnhancedTraces.data();
    assert.deepEqual(data.scripts, [
      {
        scriptId: 1,
        isolate: '12345',
        executionContextId: 1,
        startLine: 0,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
        hash: '',
        isModule: false,
        url: 'http://localhost:8080/index.html',
        hasSourceUrl: false,
        sourceMapUrl: 'http://localhost:8080/source',
        length: 5,
        sourceText: 'source text 1',
      },
      {
        scriptId: 2,
        isolate: '12345',
        executionContextId: 2,
        startLine: 0,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
        hash: '',
        isModule: false,
        url: 'http://localhost:8080/index.html',
        hasSourceUrl: false,
        sourceMapUrl: undefined,
        length: 10,
        sourceText: 'source text 2',
      },
      {
        scriptId: 1,
        isolate: '6789',
        executionContextId: 1,
        startLine: 0,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
        hash: '',
        isModule: false,
        url: 'http://localhost:8080/index.html',
        hasSourceUrl: false,
        sourceMapUrl: undefined,
        length: 5,
        sourceText: 'source text 3',
      },
    ]);
  });
});
