// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {loadEventsFromTraceFile, setTraceModelTimeout} from '../../../helpers/TraceHelpers.js';

type DataArgs = TraceModel.Types.TraceEvents.TraceEventSyntheticNetworkRequest['args']['data'];
type DataArgsMap = Map<keyof DataArgs, DataArgs[keyof DataArgs]>;

async function parseAndFinalizeFile(traceFile: string) {
  const traceEvents = await loadEventsFromTraceFile(traceFile);
  // The network handler makes use of frame data so we reset and initialize
  // the meta handler here, and finalize it in the test itself.
  TraceModel.Handlers.ModelHandlers.Meta.reset();
  TraceModel.Handlers.ModelHandlers.Meta.initialize();
  TraceModel.Handlers.ModelHandlers.NetworkRequests.reset();
  for (const event of traceEvents) {
    TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
    TraceModel.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
  }
  await TraceModel.Handlers.ModelHandlers.Meta.finalize();
  await TraceModel.Handlers.ModelHandlers.NetworkRequests.finalize();
  return traceEvents;
}
describe('NetworkRequestsHandler', function() {
  setTraceModelTimeout(this);
  describe('error handling', () => {
    it('throws if handleEvent is called before reset', () => {
      assert.throws(() => {
        TraceModel.Handlers.ModelHandlers.NetworkRequests.handleEvent(
            {} as TraceModel.Types.TraceEvents.TraceEventData);
      }, 'Network Request handler is not initialized');
    });

    it('throws if finalize is called before reset', async () => {
      let thrown: Error|null = null;
      try {
        await TraceModel.Handlers.ModelHandlers.NetworkRequests.finalize();
      } catch (e) {
        thrown = e as Error;
      }
      assert.strictEqual(thrown?.message, 'Network Request handler is not initialized');
    });
  });

  it('parses search param strings for network requests', async () => {
    await parseAndFinalizeFile('request-with-query-param.json.gz');
    const {byTime} = TraceModel.Handlers.ModelHandlers.NetworkRequests.data();
    // Filter to the requests that have search params.
    const withSearchParams = byTime.filter(request => Boolean(request.args.data.search));
    assert.deepEqual(['?test-query=hello'], withSearchParams.map(request => request.args.data.search));
  });

  describe('network requests calculations', () => {
    beforeEach(() => {
      // The network handler makes use of frame data so we reset and initialize
      // the meta handler here, and finalize it in the afterEach.
      TraceModel.Handlers.ModelHandlers.Meta.reset();
      TraceModel.Handlers.ModelHandlers.Meta.initialize();
      TraceModel.Handlers.ModelHandlers.NetworkRequests.reset();
    });

    it('calculates network requests correctly', async () => {
      const traceEvents = await loadEventsFromTraceFile('load-simple.json.gz');
      for (const event of traceEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
        TraceModel.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
      }
      await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      await TraceModel.Handlers.ModelHandlers.NetworkRequests.finalize();

      const requestsByOrigin = TraceModel.Handlers.ModelHandlers.NetworkRequests.data().byOrigin;
      assert.strictEqual(requestsByOrigin.size, 3, 'Too many origins detected');

      const topLevelRequests = requestsByOrigin.get('localhost:8080') || {all: []};
      assert.strictEqual(topLevelRequests.all.length, 4, 'Incorrect number of requests');

      // Page Request.
      const pageRequestExpected: DataArgsMap = new Map([
        ['queueing', TraceModel.Types.Timing.MicroSeconds(25085)],
        ['stalled', TraceModel.Types.Timing.MicroSeconds(5670)],
        ['dnsLookup', TraceModel.Types.Timing.MicroSeconds(105)],
        ['initialConnection', TraceModel.Types.Timing.MicroSeconds(498)],
        ['ssl', TraceModel.Types.Timing.MicroSeconds(0)],
        ['requestSent', TraceModel.Types.Timing.MicroSeconds(363)],
        ['waiting', TraceModel.Types.Timing.MicroSeconds(1383)],
        ['download', TraceModel.Types.Timing.MicroSeconds(4827)],
        ['networkDuration', TraceModel.Types.Timing.MicroSeconds(38503)],
      ]);
      assertStats(topLevelRequests.all, 'http://localhost:8080/', pageRequestExpected);

      // CSS Request.
      const cssRequestExpected: DataArgsMap = new Map([
        ['queueing', TraceModel.Types.Timing.MicroSeconds(0)],
        ['stalled', TraceModel.Types.Timing.MicroSeconds(3916)],
        ['dnsLookup', TraceModel.Types.Timing.MicroSeconds(0)],
        ['initialConnection', TraceModel.Types.Timing.MicroSeconds(0)],
        ['ssl', TraceModel.Types.Timing.MicroSeconds(0)],
        ['requestSent', TraceModel.Types.Timing.MicroSeconds(461)],
        ['waiting', TraceModel.Types.Timing.MicroSeconds(5985)],
        ['download', TraceModel.Types.Timing.MicroSeconds(0)],
        ['networkDuration', TraceModel.Types.Timing.MicroSeconds(0)],
      ]);

      const cssRequestBlockingStatusExpected: DataArgsMap = new Map([
        ['renderBlocking', 'blocking'],
      ]);

      assertStats(topLevelRequests.all, 'http://localhost:8080/styles.css', cssRequestExpected);
      assertStats(topLevelRequests.all, 'http://localhost:8080/styles.css', cssRequestBlockingStatusExpected);

      // Blocking JS Request.
      const blockingJSRequestExpected: DataArgsMap = new Map([
        ['queueing', TraceModel.Types.Timing.MicroSeconds(0)],
        ['stalled', TraceModel.Types.Timing.MicroSeconds(14799)],
        ['dnsLookup', TraceModel.Types.Timing.MicroSeconds(151)],
        ['initialConnection', TraceModel.Types.Timing.MicroSeconds(720)],
        ['ssl', TraceModel.Types.Timing.MicroSeconds(0)],
        ['requestSent', TraceModel.Types.Timing.MicroSeconds(425)],
        ['waiting', TraceModel.Types.Timing.MicroSeconds(2533)],
        ['download', TraceModel.Types.Timing.MicroSeconds(0)],
        ['networkDuration', TraceModel.Types.Timing.MicroSeconds(0)],
      ]);

      const blockingJSBlockingStatusExpected: DataArgsMap = new Map([
        ['renderBlocking', 'in_body_parser_blocking'],
      ]);

      assertStats(topLevelRequests.all, 'http://localhost:8080/blocking.js', blockingJSRequestExpected);
      assertStats(topLevelRequests.all, 'http://localhost:8080/blocking.js', blockingJSBlockingStatusExpected);

      // Module JS Request (cached).
      const moduleRequestExpected: DataArgsMap = new Map([
        ['queueing', TraceModel.Types.Timing.MicroSeconds(0)],
        ['stalled', TraceModel.Types.Timing.MicroSeconds(76865)],
        ['dnsLookup', TraceModel.Types.Timing.MicroSeconds(0)],
        ['initialConnection', TraceModel.Types.Timing.MicroSeconds(0)],
        ['ssl', TraceModel.Types.Timing.MicroSeconds(0)],
        ['requestSent', TraceModel.Types.Timing.MicroSeconds(0)],
        ['waiting', TraceModel.Types.Timing.MicroSeconds(0)],
        ['download', TraceModel.Types.Timing.MicroSeconds(27839)],
        ['networkDuration', TraceModel.Types.Timing.MicroSeconds(0)],
      ]);

      const moduleRequestBlockingStatusExpected: DataArgsMap = new Map([
        ['renderBlocking', 'non_blocking'],
      ]);

      assertStats(topLevelRequests.all, 'http://localhost:8080/module.js', moduleRequestExpected);
      assertStats(topLevelRequests.all, 'http://localhost:8080/module.js', moduleRequestBlockingStatusExpected);

      // Google Fonts CSS Request (cached).
      const fontCSSRequests = requestsByOrigin.get('fonts.googleapis.com') || {all: []};
      assert.strictEqual(fontCSSRequests.all.length, 1, 'Incorrect number of requests');

      const fontCSSRequestExpected: DataArgsMap = new Map([
        ['queueing', TraceModel.Types.Timing.MicroSeconds(0)],
        ['stalled', TraceModel.Types.Timing.MicroSeconds(3178)],
        ['dnsLookup', TraceModel.Types.Timing.MicroSeconds(0)],
        ['initialConnection', TraceModel.Types.Timing.MicroSeconds(0)],
        ['ssl', TraceModel.Types.Timing.MicroSeconds(0)],
        ['requestSent', TraceModel.Types.Timing.MicroSeconds(0)],
        ['waiting', TraceModel.Types.Timing.MicroSeconds(0)],
        ['download', TraceModel.Types.Timing.MicroSeconds(1203)],
        ['networkDuration', TraceModel.Types.Timing.MicroSeconds(0)],
      ]);

      const fontCSSBlockingStatusExpected: DataArgsMap = new Map([
        ['renderBlocking', 'blocking'],
      ]);

      assertStats(
          fontCSSRequests.all, 'https://fonts.googleapis.com/css2?family=Orelega+One&display=swap',
          fontCSSRequestExpected);
      assertStats(
          fontCSSRequests.all, 'https://fonts.googleapis.com/css2?family=Orelega+One&display=swap',
          fontCSSBlockingStatusExpected);

      // Google Fonts Data Request (cached).
      const fontDataRequests = requestsByOrigin.get('fonts.gstatic.com') || {all: []};
      assert.strictEqual(fontDataRequests.all.length, 1, 'Incorrect number of requests');

      const fontDataRequestExpected: DataArgsMap = new Map([
        ['queueing', TraceModel.Types.Timing.MicroSeconds(0)],
        ['stalled', TraceModel.Types.Timing.MicroSeconds(1929)],
        ['dnsLookup', TraceModel.Types.Timing.MicroSeconds(0)],
        ['initialConnection', TraceModel.Types.Timing.MicroSeconds(0)],
        ['ssl', TraceModel.Types.Timing.MicroSeconds(0)],
        ['requestSent', TraceModel.Types.Timing.MicroSeconds(0)],
        ['waiting', TraceModel.Types.Timing.MicroSeconds(0)],
        ['download', TraceModel.Types.Timing.MicroSeconds(962)],
        ['networkDuration', TraceModel.Types.Timing.MicroSeconds(0)],
      ]);

      const fontDataRequestBlockingStatusExpected: DataArgsMap = new Map([
        ['renderBlocking', 'non_blocking'],
      ]);

      assertStats(
          fontDataRequests.all, 'https://fonts.gstatic.com/s/orelegaone/v1/3qTpojOggD2XtAdFb-QXZFt93kY.woff2',
          fontDataRequestExpected);

      assertStats(
          fontDataRequests.all, 'https://fonts.gstatic.com/s/orelegaone/v1/3qTpojOggD2XtAdFb-QXZFt93kY.woff2',
          fontDataRequestBlockingStatusExpected);
    });
  });

  describe('redirects', () => {
    beforeEach(() => {
      // The network handler makes use of frame data so we reset and initialize
      // the meta handler here, and finalize it in the test itself.
      TraceModel.Handlers.ModelHandlers.Meta.reset();
      TraceModel.Handlers.ModelHandlers.Meta.initialize();
      TraceModel.Handlers.ModelHandlers.NetworkRequests.reset();
    });

    it('calculates redirects correctly (navigations)', async () => {
      const traceEvents = await loadEventsFromTraceFile('redirects.json.gz');
      for (const event of traceEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
        TraceModel.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
      }
      await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      await TraceModel.Handlers.ModelHandlers.NetworkRequests.finalize();

      const {byTime} = TraceModel.Handlers.ModelHandlers.NetworkRequests.data();
      assert.strictEqual(byTime.length, 2, 'Incorrect number of requests');
      assert.strictEqual(byTime[0].args.data.redirects.length, 0, 'Incorrect number of redirects (request 0)');
      assert.deepStrictEqual(
          byTime[1].args.data.redirects,
          [
            {
              url: 'http://localhost:3000/foo',
              priority: 'VeryHigh',
              ts: 1311223447642,
              dur: 7845,
            },
            {
              url: 'http://localhost:3000/bar',
              priority: 'VeryHigh',
              ts: 1311223455487,
              dur: 3771,
            },
          ],
          'Incorrect number of redirects (request 1)');
    });

    it('calculates redirects correctly (subresources)', async () => {
      const traceEvents = await loadEventsFromTraceFile('redirects-subresource-multiple.json.gz');
      for (const event of traceEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
        TraceModel.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
      }
      await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      await TraceModel.Handlers.ModelHandlers.NetworkRequests.finalize();

      const {byTime} = TraceModel.Handlers.ModelHandlers.NetworkRequests.data();
      assert.strictEqual(byTime.length, 2, 'Incorrect number of requests');
      assert.strictEqual(byTime[0].args.data.redirects.length, 0, 'Incorrect number of redirects (request 0)');
      assert.deepStrictEqual(
          byTime[1].args.data.redirects,
          [
            {
              url: 'http://localhost:3000/foo.js',
              priority: 'Low',
              ts: 183611568786,
              dur: 506233,
            },
            {
              url: 'http://localhost:3000/bar.js',
              priority: 'Low',
              ts: 183612075019,
              dur: 802726,
            },
          ],
          'Incorrect number of redirects (request 1)');
    });
  });
});

function assertStats<D extends keyof DataArgs>(
    requests: TraceModel.Types.TraceEvents.TraceEventSyntheticNetworkRequest[], url: string,
    stats: Map<D, DataArgs[D]>): void {
  const request = requests.find(request => request.args.data.url === url);
  if (!request) {
    assert.fail(`Unable to find request for URL ${url}`);
    return;
  }

  for (const [name, value] of stats.entries()) {
    if (typeof request.args.data[name] === 'number') {
      const expectedValue = value as DataArgs[D];
      const actualValueRounded = Number((request.args.data[name] as number).toPrecision(5)) as DataArgs[D];
      assert.strictEqual(actualValueRounded, expectedValue, url);
    } else {
      assert.strictEqual(request.args.data[name], value, url);
    }
  }
}
