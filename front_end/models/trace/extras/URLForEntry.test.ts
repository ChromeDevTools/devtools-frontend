// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describeWithEnvironment('URLForEntry', () => {
  it('returns the URL in event.args.data if it has one', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const commitLoadEvent = parsedTrace.Renderer.allTraceEntries.find(Trace.Types.Events.isCommitLoad);
    assert.isOk(commitLoadEvent);
    const url = Trace.Extras.URLForEntry.getNonResolved(parsedTrace, commitLoadEvent);
    assert.isNotNull(url);
    assert.strictEqual(url, commitLoadEvent.args.data?.url);
  });

  it('returns the URL for a ProfileCall from the callframe', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const profileCall = parsedTrace.Renderer.allTraceEntries.find(Trace.Types.Events.isProfileCall);
    assert.isOk(profileCall);
    const url = Trace.Extras.URLForEntry.getNonResolved(parsedTrace, profileCall);
    assert.isNotNull(url);
    assert.strictEqual(url, profileCall.callFrame.url);
  });

  it('uses the request URL for a network request', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const request = parsedTrace.NetworkRequests.byTime[0];
    assert.isOk(request);
    const url = Trace.Extras.URLForEntry.getNonResolved(parsedTrace, request);
    assert.isNotNull(url);
    assert.strictEqual(url, request.args.data.url);
  });

  it('for a generic event with a stackTrace property, it uses the URL of the top frame', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const eventDispatch = parsedTrace.Renderer.allTraceEntries.find(entry => {
      return Trace.Types.Events.isDispatch(entry) && entry.args.data.stackTrace;
    });
    assert.isOk(eventDispatch);
    const url = Trace.Extras.URLForEntry.getNonResolved(parsedTrace, eventDispatch);
    assert.isNotNull(url);
    assert.strictEqual(url, eventDispatch.args?.data?.stackTrace?.[0].url);
  });

  it('finds the URL for a ParseHTML event', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const parseHTMLEvent = parsedTrace.Renderer.allTraceEntries.find(Trace.Types.Events.isParseHTML);
    assert.isOk(parseHTMLEvent);
    const url = Trace.Extras.URLForEntry.getNonResolved(parsedTrace, parseHTMLEvent);
    assert.isNotNull(url);
    assert.strictEqual(url, parseHTMLEvent.args.beginData.url);
  });

  it('uses the PaintImage URL for a DecodeImage event', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const decodeImage = parsedTrace.Renderer.allTraceEntries.find(Trace.Types.Events.isDecodeImage);
    assert.isOk(decodeImage);
    const url = Trace.Extras.URLForEntry.getNonResolved(parsedTrace, decodeImage);
    assert.isNotNull(url);
    assert.strictEqual(
        url, 'https://web-dev.imgix.net/image/admin/WkMOiDtaDgiAA2YkRZ5H.jpg?fit=crop&h=64&w=64&dpr=1&q=75');
  });
});
