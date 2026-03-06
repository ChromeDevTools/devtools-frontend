// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {createContextForNavigation, getFirstOrError, processTrace} from '../../../testing/InsightHelpers.js';
import * as Trace from '../trace.js';

function setDocumentResponseHeaders(
    data: Trace.Handlers.Types.HandlerData,
    navigationId: string,
    headers: Array<{name: string, value: string}>|null,
    ): void {
  const documentRequest = data.NetworkRequests.byId.get(navigationId);
  if (!documentRequest) {
    throw new Error('missing document request');
  }
  (documentRequest.args.data as {responseHeaders: Array<{name: string, value: string}>| null}).responseHeaders =
      headers;
}

function addMetaCharsetCheckEvent(
    data: Trace.Handlers.Types.HandlerData,
    context: Trace.Insights.Types.InsightSetContextWithNavigation,
    disposition: Trace.Types.Events.MetaCharsetDisposition,
    ): void {
  const eventsByNavigation = data.PageLoadMetrics.metaCharsetCheckEventsByNavigation as
      Map<Trace.Types.Events.NavigationStart, Trace.Types.Events.MetaCharsetCheck[]>;
  const events = eventsByNavigation.get(context.navigation) ?? [];
  events.push({
    name: Trace.Types.Events.Name.META_CHARSET_CHECK,
    cat: 'devtools.timeline',
    ph: Trace.Types.Events.Phase.INSTANT,
    s: Trace.Types.Events.Scope.THREAD,
    pid: Trace.Types.Events.ProcessID(1),
    tid: Trace.Types.Events.ThreadID(1),
    ts: Trace.Types.Timing.Micro(context.bounds.min + 1),
    args: {
      data: {
        frame: context.frameId,
        disposition,
      },
    },
  });
  eventsByNavigation.set(context.navigation, events);
}

describeWithEnvironment('CharacterSet', function() {
  async function createInsight(testContext: Mocha.Context) {
    const {data} = await processTrace(testContext, 'lcp-images.json.gz');
    const navigation = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    const context = createContextForNavigation(data, navigation, data.Meta.mainFrameId);
    const navigationId = navigation.args.data?.navigationId;
    if (!navigationId) {
      throw new Error('missing navigation id');
    }
    return {data, context, navigationId};
  }

  it('passes when charset is declared in HTTP header', async function() {
    const {data, context, navigationId} = await createInsight(this);

    setDocumentResponseHeaders(data, navigationId, [{name: 'content-type', value: 'text/html; charset=utf-8'}]);

    const insight = Trace.Insights.Models.CharacterSet.generateInsight(data, context);
    assert.strictEqual(insight.state, 'pass');
    assert.isTrue(insight.data?.checklist.httpCharset.value);
  });

  it('passes when meta charset is found in the first 1024 bytes', async function() {
    const {data, context, navigationId} = await createInsight(this);

    setDocumentResponseHeaders(data, navigationId, [{name: 'content-type', value: 'text/html'}]);
    addMetaCharsetCheckEvent(data, context, 'found-in-first-1024-bytes');

    const insight = Trace.Insights.Models.CharacterSet.generateInsight(data, context);
    assert.strictEqual(insight.state, 'pass');
    assert.isFalse(insight.data?.checklist.httpCharset.value);
    assert.isTrue(insight.data?.checklist.metaCharset.value);
  });

  it('fails when meta charset is declared after the first 1024 bytes', async function() {
    const {data, context, navigationId} = await createInsight(this);

    setDocumentResponseHeaders(data, navigationId, [{name: 'content-type', value: 'text/html'}]);
    addMetaCharsetCheckEvent(data, context, 'found-after-first-1024-bytes');

    const insight = Trace.Insights.Models.CharacterSet.generateInsight(data, context);
    assert.strictEqual(insight.state, 'fail');
    assert.isFalse(insight.data?.checklist.metaCharset.value);
  });

  it('fails when no meta charset is found and HTTP header is missing charset', async function() {
    const {data, context, navigationId} = await createInsight(this);

    setDocumentResponseHeaders(data, navigationId, [{name: 'content-type', value: 'text/html'}]);
    addMetaCharsetCheckEvent(data, context, 'not-found');

    const insight = Trace.Insights.Models.CharacterSet.generateInsight(data, context);
    assert.strictEqual(insight.state, 'fail');
    assert.isFalse(insight.data?.checklist.httpCharset.value);
    assert.isFalse(insight.data?.checklist.metaCharset.value);
  });

  it('passes when HTTP header declares charset even if meta charset is missing', async function() {
    const {data, context, navigationId} = await createInsight(this);

    setDocumentResponseHeaders(data, navigationId, [{name: 'content-type', value: 'text/html; charset=utf-8'}]);
    addMetaCharsetCheckEvent(data, context, 'not-found');

    const insight = Trace.Insights.Models.CharacterSet.generateInsight(data, context);
    assert.strictEqual(insight.state, 'pass');
    assert.isTrue(insight.data?.checklist.httpCharset.value);
    assert.isFalse(insight.data?.checklist.metaCharset.value);
  });
});
