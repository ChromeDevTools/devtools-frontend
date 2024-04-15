// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as TraceModel from '../trace.js';

describe('LargestImagePaintHandler', function() {
  beforeEach(async () => {
    TraceModel.Handlers.ModelHandlers.LargestImagePaint.reset();
  });

  it('creates a map of DOM Node IDs to image candidates', async function() {
    const events = await TraceLoader.rawEvents(this, 'lcp-images.json.gz');
    for (const event of events) {
      TraceModel.Handlers.ModelHandlers.LargestImagePaint.handleEvent(event);
    }

    const data = TraceModel.Handlers.ModelHandlers.LargestImagePaint.data();
    assert.strictEqual(data.size, 1);
    const imageForLCP = data.get(10 as Protocol.DOM.BackendNodeId);
    assert.exists(imageForLCP);
    assert.strictEqual(imageForLCP?.args.data?.DOMNodeId, 10 as Protocol.DOM.BackendNodeId);
    assert.strictEqual(imageForLCP?.args.data?.imageUrl, 'https://via.placeholder.com/2000.jpg');
  });
});
