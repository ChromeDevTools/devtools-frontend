// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describeWithEnvironment('LargestImagePaintHandler', function() {
  beforeEach(async () => {
    Trace.Handlers.ModelHandlers.LargestImagePaint.reset();
  });

  it('creates a map of DOM Node IDs to image candidates', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');

    const {mainFrameNavigations} = parsedTrace.Meta;
    // There is only one main frame navigation in this trace.
    assert.lengthOf(mainFrameNavigations, 1);
    const mainNavigation = mainFrameNavigations.at(0);
    assert.isOk(mainNavigation?.args.data?.navigationId);

    const {lcpRequestByNavigationId} = parsedTrace.LargestImagePaint;
    const lcpRequest = lcpRequestByNavigationId.get(mainNavigation.args.data?.navigationId);
    assert.isOk(lcpRequest);
    assert.strictEqual(lcpRequest.args.data.url, 'https://via.placeholder.com/2000.jpg');
  });

  it('is able to identify the LCP image request for each navigation', async function() {
    // The handler depends on Meta + Network requests, let's just execute
    // all of them rather than call them individually.
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'lcp-multiple-frames.json.gz');

    const {mainFrameNavigations} = parsedTrace.Meta;
    // There is only one main frame navigation in this trace.
    assert.lengthOf(mainFrameNavigations, 1);
    const mainNavigation = mainFrameNavigations.at(0);
    assert.isOk(mainNavigation?.args.data?.navigationId);

    const {lcpRequestByNavigationId} = parsedTrace.LargestImagePaint;
    const lcpRequest = lcpRequestByNavigationId.get(mainNavigation.args.data.navigationId);
    assert.isOk(lcpRequest);
    assert.strictEqual(lcpRequest.args.data.url, 'https://placehold.co/1000.jpg');
  });

  it('handles image paints which happen after the LCP event', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'lcp-late-paint-event.json.gz');

    const {mainFrameNavigations} = parsedTrace.Meta;
    // There is only one main frame navigation in this trace.
    assert.lengthOf(mainFrameNavigations, 1);
    const mainNavigation = mainFrameNavigations.at(0);
    assert.isOk(mainNavigation?.args.data?.navigationId);

    const {lcpRequestByNavigationId} = parsedTrace.LargestImagePaint;
    const lcpRequest = lcpRequestByNavigationId.get(mainNavigation.args.data.navigationId);

    // There is a largest image paint event, but it happens after the LCP candidate
    // so it's ignored. The actual LCP is text.
    assert.isUndefined(lcpRequest);
  });
});
