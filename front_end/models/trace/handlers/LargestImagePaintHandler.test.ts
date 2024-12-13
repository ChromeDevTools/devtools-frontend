// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describeWithEnvironment('LargestImagePaintHandler', function() {
  beforeEach(async () => {
    Trace.Handlers.ModelHandlers.LargestImagePaint.reset();
  });

  it('creates a map of DOM Node IDs to image candidates', async function() {
    const events = await TraceLoader.rawEvents(this, 'lcp-images.json.gz');
    for (const event of events) {
      Trace.Handlers.ModelHandlers.LargestImagePaint.handleEvent(event);
    }

    const data = Trace.Handlers.ModelHandlers.LargestImagePaint.data();
    assert.strictEqual(data.imageByDOMNodeId.size, 1);
    const imageForLCP = data.imageByDOMNodeId.get(10 as Protocol.DOM.BackendNodeId);
    assert.exists(imageForLCP);
    assert.strictEqual(imageForLCP?.args.data?.DOMNodeId, 10 as Protocol.DOM.BackendNodeId);
    assert.strictEqual(imageForLCP?.args.data?.imageUrl, 'https://via.placeholder.com/2000.jpg');
  });

  it('is able to identify the LCP image request for each navigation', async function() {
    // The handler depends on Meta + Network requests, let's just execute
    // all of them rather than call them individually.
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'lcp-multiple-frames.json.gz');

    const {mainFrameNavigations} = parsedTrace.Meta;
    // There is only one main frame navigation in this trace.
    assert.lengthOf(mainFrameNavigations, 1);
    const mainNavigation = mainFrameNavigations.at(0);
    assert.isOk(mainNavigation);

    const {lcpRequestByNavigation} = parsedTrace.LargestImagePaint;
    const lcpRequest = lcpRequestByNavigation.get(mainNavigation);
    assert.isOk(lcpRequest);
    assert.strictEqual(lcpRequest.args.data.url, 'https://placehold.co/1000.jpg');
  });
});
