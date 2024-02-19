// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

describe('LargestImagePaintHandler', async function() {
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
    const imageForLCP = data.get(125 as Protocol.DOM.BackendNodeId);
    assert.isDefined(imageForLCP);
    assert.strictEqual(imageForLCP?.args.data?.DOMNodeId, 125 as Protocol.DOM.BackendNodeId);
    assert.strictEqual(imageForLCP?.args.data?.imageUrl, 'https://via.placeholder.com/3000.jpg');
  });
});
