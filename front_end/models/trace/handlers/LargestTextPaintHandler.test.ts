// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describe('LargestTextPaintHandler', function() {
  beforeEach(() => {
    Trace.Handlers.ModelHandlers.LargestTextPaint.reset();
  });

  it('creates a map of DOM Node IDs to Text candidates', async function() {
    const events = await TraceLoader.rawEvents(this, 'lcp-web-font.json.gz');

    for (const event of events) {
      Trace.Handlers.ModelHandlers.LargestTextPaint.handleEvent(event);
    }

    const data = Trace.Handlers.ModelHandlers.LargestTextPaint.data();
    assert.strictEqual(data.size, 1);
    const textCandidate = data.get(8 as Protocol.DOM.BackendNodeId);
    assert.exists(textCandidate);
    assert.strictEqual(textCandidate?.args.data?.DOMNodeId, 8 as Protocol.DOM.BackendNodeId);
  });
});
