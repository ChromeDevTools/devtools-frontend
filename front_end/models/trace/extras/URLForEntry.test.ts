// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as TraceEngine from '../trace.js';

describe('URLForEntry', () => {
  it('returns the URL in event.args.data if it has one', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const commitLoadEvent =
        traceData.Renderer.allTraceEntries.find(TraceEngine.Types.TraceEvents.isTraceEventCommitLoad);
    assert.isOk(commitLoadEvent);
    const url = TraceEngine.Extras.URLForEntry.get(traceData, commitLoadEvent);
    assert.isNotNull(url);
    assert.strictEqual(url, commitLoadEvent.args.data?.url);
  });

  it('returns the URL for a ProfileCall from the callframe', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const profileCall = traceData.Renderer.allTraceEntries.find(TraceEngine.Types.TraceEvents.isProfileCall);
    assert.isOk(profileCall);
    const url = TraceEngine.Extras.URLForEntry.get(traceData, profileCall);
    assert.isNotNull(url);
    assert.strictEqual(url, profileCall.callFrame.url);
  });

  it('uses the request URL for a network request', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const request = traceData.NetworkRequests.byTime[0];
    assert.isOk(request);
    const url = TraceEngine.Extras.URLForEntry.get(traceData, request);
    assert.isNotNull(url);
    assert.strictEqual(url, request.args.data.url);
  });

  it('for a generic event with a stackTrace property, it uses the URL of the top frame', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const eventDispatch = traceData.Renderer.allTraceEntries.find(entry => {
      return TraceEngine.Types.TraceEvents.isTraceEventDispatch(entry) && entry.args.data.stackTrace;
    });
    assert.isOk(eventDispatch);
    const url = TraceEngine.Extras.URLForEntry.get(traceData, eventDispatch);
    assert.isNotNull(url);
    assert.strictEqual(url, eventDispatch.args?.data?.stackTrace?.[0].url);
  });

  it('finds the URL for a ParseHTML event', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const parseHTMLEvent = traceData.Renderer.allTraceEntries.find(TraceEngine.Types.TraceEvents.isTraceEventParseHTML);
    assert.isOk(parseHTMLEvent);
    const url = TraceEngine.Extras.URLForEntry.get(traceData, parseHTMLEvent);
    assert.isNotNull(url);
    assert.strictEqual(url, parseHTMLEvent.args.beginData.url);
  });

  it('uses the PaintImage URL for a DecodeImage event', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const decodeImage = traceData.Renderer.allTraceEntries.find(TraceEngine.Types.TraceEvents.isTraceEventDecodeImage);
    assert.isOk(decodeImage);
    const url = TraceEngine.Extras.URLForEntry.get(traceData, decodeImage);
    assert.isNotNull(url);
    assert.strictEqual(
        url, 'https://web-dev.imgix.net/image/admin/WkMOiDtaDgiAA2YkRZ5H.jpg?fit=crop&h=64&w=64&dpr=1&q=75');
  });
});
