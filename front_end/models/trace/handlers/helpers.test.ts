// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {allThreadEntriesInTrace} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describeWithEnvironment('getNonResolvedURL', () => {
  it('returns the URL in event.args.data if it has one', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const commitLoadEvent = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isCommitLoad);
    assert.isOk(commitLoadEvent);
    const url = Trace.Handlers.Helpers.getNonResolvedURL(commitLoadEvent, parsedTrace);
    assert.isNotNull(url);
    assert.strictEqual(url, commitLoadEvent.args.data?.url);
  });

  it('returns the URL for a ProfileCall from the callframe', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const profileCall = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isProfileCall);
    assert.isOk(profileCall);
    const url = Trace.Handlers.Helpers.getNonResolvedURL(profileCall, parsedTrace);
    assert.isNotNull(url);
    assert.strictEqual(url, profileCall.callFrame.url);
  });

  it('parses out the URL For a ParseAuthorStyleSheet', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const parseStyle = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isParseAuthorStyleSheetEvent);
    assert.isOk(parseStyle);
    const url = Trace.Handlers.Helpers.getNonResolvedURL(parseStyle, parsedTrace);
    assert.strictEqual(url, parseStyle.args?.data.url);
  });

  it('uses the request URL for a network request', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const request = parsedTrace.NetworkRequests.byTime[0];
    assert.isOk(request);
    const url = Trace.Handlers.Helpers.getNonResolvedURL(request, parsedTrace);
    assert.isNotNull(url);
    assert.strictEqual(url, request.args.data.url);
  });

  it('for a generic event with a stackTrace property, it uses the URL of the top frame', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const eventDispatch = allThreadEntriesInTrace(parsedTrace).find(entry => {
      return Trace.Types.Events.isDispatch(entry) && entry.args.data.stackTrace;
    });
    assert.isOk(eventDispatch);
    const url = Trace.Handlers.Helpers.getNonResolvedURL(eventDispatch, parsedTrace);
    assert.isNotNull(url);
    assert.strictEqual(url, eventDispatch.args?.data?.stackTrace?.[0].url);
  });

  it('finds the URL for a ParseHTML event', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const parseHTMLEvent = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isParseHTML);
    assert.isOk(parseHTMLEvent);
    const url = Trace.Handlers.Helpers.getNonResolvedURL(parseHTMLEvent, parsedTrace);
    assert.isNotNull(url);
    assert.strictEqual(url, parseHTMLEvent.args.beginData.url);
  });

  it('uses the PaintImage URL for a DecodeImage event', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const decodeImage = allThreadEntriesInTrace(parsedTrace).find(Trace.Types.Events.isDecodeImage);
    assert.isOk(decodeImage);
    const url = Trace.Handlers.Helpers.getNonResolvedURL(decodeImage, parsedTrace);
    assert.isNotNull(url);
    assert.strictEqual(
        url, 'https://web-dev.imgix.net/image/admin/WkMOiDtaDgiAA2YkRZ5H.jpg?fit=crop&h=64&w=64&dpr=1&q=75');
  });
});
describeWithEnvironment('makeUpEntity', () => {
  it('correctly makes up entities', async function() {
    const expectedEntities = new Map<string, string>([
      ['http://localhost:8080/', 'localhost'],
      ['https://fonts.googleapis.com/css2?family=Orelega+One&display=swap', 'googleapis.com'],
      ['https://emp.bbci.co.uk/emp/bump-4/bump-4.js', 'bbci.co.uk'],
      ['http://localhost:8080/blocking.js', 'localhost'],
      ['https://fonts.gstatic.com/s/orelegaone/v1/3qTpojOggD2XtAdFb-QXZFt93kY.woff2', 'gstatic.com'],
      ['chrome-extension://chromeextension/something/exciting.js', 'chromeextension'],
    ]);

    for (const [url, expectedEntity] of expectedEntities.entries()) {
      const gotEntity =
          Trace.Handlers.Helpers.makeUpEntity(new Map<string, Trace.Extras.ThirdParties.Entity>(), url)?.name ?? '';
      assert.deepEqual(gotEntity, expectedEntity);
    }
  });
  it('correctly makes up chrome extension entity', async function() {
    const url = 'chrome-extension://chromeextension/something/exciting.js';
    const gotEntity = Trace.Handlers.Helpers.makeUpEntity(new Map<string, Trace.Extras.ThirdParties.Entity>(), url);
    assert.exists(gotEntity);

    assert.deepEqual(gotEntity.name, 'chromeextension');
    assert.deepEqual(gotEntity.category, 'Chrome Extension');
    assert.deepEqual(gotEntity.homepage, 'https://chromewebstore.google.com/detail/chromeextension');
  });
});
