// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

describe('LargestTextPaintHandler', async function() {
  beforeEach(() => {
    TraceModel.Handlers.ModelHandlers.LargestTextPaint.reset();
  });

  it('creates a map of DOM Node IDs to Text candidates', async function() {
    const events = await TraceLoader.rawEvents(this, 'lcp-web-font.json.gz');

    for (const event of events) {
      TraceModel.Handlers.ModelHandlers.LargestTextPaint.handleEvent(event);
    }

    const data = TraceModel.Handlers.ModelHandlers.LargestTextPaint.data();
    assert.strictEqual(data.size, 1);
    const textCandidate = data.get(28 as Protocol.DOM.BackendNodeId);
    assert.isDefined(textCandidate);
    assert.strictEqual(textCandidate?.args.data?.DOMNodeId, 28 as Protocol.DOM.BackendNodeId);
  });
});
