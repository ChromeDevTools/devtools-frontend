// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

type DataArgs = TraceModel.Types.TraceEvents.TraceEventSyntheticNetworkRequest['args']['data'];
type DataArgsProcessedData =
    TraceModel.Types.TraceEvents.TraceEventSyntheticNetworkRequest['args']['data']['syntheticData'];
type DataArgsMap = Map<keyof DataArgs, DataArgs[keyof DataArgs]>;
type DataArgsProcessedDataMap = Map<keyof DataArgsProcessedData, DataArgsProcessedData[keyof DataArgsProcessedData]>;

async function parseAndFinalizeFile(context: Mocha.Suite|Mocha.Context|null, traceFile: string) {
  const traceEvents = await TraceLoader.rawEvents(context, traceFile);
  TraceModel.Handlers.ModelHandlers.Meta.initialize();
  TraceModel.Handlers.ModelHandlers.NetworkRequests.initialize();
  for (const event of traceEvents) {
    TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
    TraceModel.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
  }
  await TraceModel.Handlers.ModelHandlers.Meta.finalize();
  await TraceModel.Handlers.ModelHandlers.NetworkRequests.finalize();
  return traceEvents;
}

describe('NetworkRequestsHandler', function() {
  describe('error handling', () => {
    it('throws if handleEvent is called before it is initialized', () => {
      assert.throws(() => {
        TraceModel.Handlers.ModelHandlers.NetworkRequests.handleEvent(
            {} as TraceModel.Types.TraceEvents.TraceEventData);
      }, 'Network Request handler is not initialized');
    });

    it('throws if finalize is called before initialize', async () => {
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
    await parseAndFinalizeFile(this, 'request-with-query-param.json.gz');
    const {byTime} = TraceModel.Handlers.ModelHandlers.NetworkRequests.data();
    // Filter to the requests that have search params.
    const withSearchParams = byTime.filter(request => Boolean(request.args.data.search));
    assert.deepEqual(['?test-query=hello'], withSearchParams.map(request => request.args.data.search));
  });

  describe('network requests calculations', () => {
    beforeEach(() => {
      TraceModel.Handlers.ModelHandlers.Meta.initialize();
      TraceModel.Handlers.ModelHandlers.NetworkRequests.initialize();
    });

    it('calculates network requests correctly', async function() {
      const traceEvents = await TraceLoader.rawEvents(this, 'load-simple.json.gz');
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
      const pageRequestExpected: DataArgsProcessedDataMap = new Map([
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
      assertDataArgsProcessedDataStats(topLevelRequests.all, 'http://localhost:8080/', pageRequestExpected);

      // CSS Request.
      const cssRequestExpected: DataArgsProcessedDataMap = new Map([
        ['queueing', TraceModel.Types.Timing.MicroSeconds(0)],
        ['stalled', TraceModel.Types.Timing.MicroSeconds(2175)],
        ['dnsLookup', TraceModel.Types.Timing.MicroSeconds(0)],
        ['initialConnection', TraceModel.Types.Timing.MicroSeconds(0)],
        ['ssl', TraceModel.Types.Timing.MicroSeconds(0)],
        ['requestSent', TraceModel.Types.Timing.MicroSeconds(0)],
        ['waiting', TraceModel.Types.Timing.MicroSeconds(0)],
        ['download', TraceModel.Types.Timing.MicroSeconds(1294)],
        ['networkDuration', TraceModel.Types.Timing.MicroSeconds(0)],
      ]);

      const cssRequestBlockingStatusExpected: DataArgsMap = new Map([
        ['renderBlocking', 'blocking'],
      ]);

      assertDataArgsProcessedDataStats(topLevelRequests.all, 'http://localhost:8080/styles.css', cssRequestExpected);
      assertDataArgsStats(topLevelRequests.all, 'http://localhost:8080/styles.css', cssRequestBlockingStatusExpected);

      // Blocking JS Request.
      const blockingJSRequestExpected: DataArgsProcessedDataMap = new Map([
        ['queueing', TraceModel.Types.Timing.MicroSeconds(0)],
        ['stalled', TraceModel.Types.Timing.MicroSeconds(2126)],
        ['dnsLookup', TraceModel.Types.Timing.MicroSeconds(0)],
        ['initialConnection', TraceModel.Types.Timing.MicroSeconds(0)],
        ['ssl', TraceModel.Types.Timing.MicroSeconds(0)],
        ['requestSent', TraceModel.Types.Timing.MicroSeconds(0)],
        ['waiting', TraceModel.Types.Timing.MicroSeconds(0)],
        ['download', TraceModel.Types.Timing.MicroSeconds(1207)],
        ['networkDuration', TraceModel.Types.Timing.MicroSeconds(0)],
      ]);

      const blockingJSBlockingStatusExpected: DataArgsMap = new Map([
        ['renderBlocking', 'in_body_parser_blocking'],
      ]);

      assertDataArgsProcessedDataStats(
          topLevelRequests.all, 'http://localhost:8080/blocking.js', blockingJSRequestExpected);
      assertDataArgsStats(topLevelRequests.all, 'http://localhost:8080/blocking.js', blockingJSBlockingStatusExpected);

      // Module JS Request (cached).
      const moduleRequestExpected: DataArgsProcessedDataMap = new Map([
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

      assertDataArgsProcessedDataStats(topLevelRequests.all, 'http://localhost:8080/module.js', moduleRequestExpected);
      assertDataArgsStats(topLevelRequests.all, 'http://localhost:8080/module.js', moduleRequestBlockingStatusExpected);

      // Google Fonts CSS Request (cached).
      const fontCSSRequests = requestsByOrigin.get('fonts.googleapis.com') || {all: []};
      assert.strictEqual(fontCSSRequests.all.length, 1, 'Incorrect number of requests');

      const fontCSSRequestExpected: DataArgsProcessedDataMap = new Map([
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

      assertDataArgsProcessedDataStats(
          fontCSSRequests.all, 'https://fonts.googleapis.com/css2?family=Orelega+One&display=swap',
          fontCSSRequestExpected);
      assertDataArgsStats(
          fontCSSRequests.all, 'https://fonts.googleapis.com/css2?family=Orelega+One&display=swap',
          fontCSSBlockingStatusExpected);

      // Google Fonts Data Request (cached).
      const fontDataRequests = requestsByOrigin.get('fonts.gstatic.com') || {all: []};
      assert.strictEqual(fontDataRequests.all.length, 1, 'Incorrect number of requests');

      const fontDataRequestExpected: DataArgsProcessedDataMap = new Map([
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

      assertDataArgsProcessedDataStats(
          fontDataRequests.all, 'https://fonts.gstatic.com/s/orelegaone/v1/3qTpojOggD2XtAdFb-QXZFt93kY.woff2',
          fontDataRequestExpected);

      assertDataArgsStats(
          fontDataRequests.all, 'https://fonts.gstatic.com/s/orelegaone/v1/3qTpojOggD2XtAdFb-QXZFt93kY.woff2',
          fontDataRequestBlockingStatusExpected);
    });
  });

  describe('parses the change priority request', () => {
    beforeEach(() => {
      TraceModel.Handlers.ModelHandlers.Meta.initialize();
      TraceModel.Handlers.ModelHandlers.NetworkRequests.initialize();
    });

    it('changes priority of the resouce', async function() {
      const traceEvents = await TraceLoader.rawEvents(this, 'changing-priority.json.gz');

      for (const event of traceEvents) {
        TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
        TraceModel.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
      }
      await TraceModel.Handlers.ModelHandlers.Meta.finalize();
      await TraceModel.Handlers.ModelHandlers.NetworkRequests.finalize();

      const {byTime} = TraceModel.Handlers.ModelHandlers.NetworkRequests.data();

      const imageRequest = byTime.find(request => {
        return request.args.data.url === 'https://via.placeholder.com/3000.jpg';
      });

      if (!imageRequest) {
        throw new Error('Could not find expected network request.');
      }

      assert.strictEqual(imageRequest.args.data.priority, 'High');
      assert.strictEqual(imageRequest.args.data.initialPriority, 'Medium');
    });
  });

  describe('redirects', () => {
    beforeEach(() => {
      TraceModel.Handlers.ModelHandlers.Meta.initialize();
      TraceModel.Handlers.ModelHandlers.NetworkRequests.initialize();
    });

    it('calculates redirects correctly (navigations)', async function() {
      const traceEvents = await TraceLoader.rawEvents(this, 'redirects.json.gz');
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
              requestMethod: 'GET',
              ts: TraceModel.Types.Timing.MicroSeconds(1311223447642),
              dur: TraceModel.Types.Timing.MicroSeconds(7845),
            },
            {
              url: 'http://localhost:3000/bar',
              priority: 'VeryHigh',
              requestMethod: 'GET',
              ts: TraceModel.Types.Timing.MicroSeconds(1311223455487),
              dur: TraceModel.Types.Timing.MicroSeconds(3771),
            },
          ],
          'Incorrect number of redirects (request 1)');
    });

    it('calculates redirects correctly (subresources)', async function() {
      const traceEvents = await TraceLoader.rawEvents(this, 'redirects-subresource-multiple.json.gz');
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
              requestMethod: 'GET',
              ts: TraceModel.Types.Timing.MicroSeconds(183611568786),
              dur: TraceModel.Types.Timing.MicroSeconds(506233),
            },
            {
              url: 'http://localhost:3000/bar.js',
              priority: 'Low',
              requestMethod: 'GET',
              ts: TraceModel.Types.Timing.MicroSeconds(183612075019),
              dur: TraceModel.Types.Timing.MicroSeconds(802726),
            },
          ],
          'Incorrect number of redirects (request 1)');
    });
  });
});

function assertDataArgsStats<D extends keyof DataArgs>(
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

function assertDataArgsProcessedDataStats<D extends keyof DataArgsProcessedData>(
    requests: TraceModel.Types.TraceEvents.TraceEventSyntheticNetworkRequest[], url: string,
    stats: Map<D, DataArgsProcessedData[D]>): void {
  const request = requests.find(request => request.args.data.url === url);
  if (!request) {
    assert.fail(`Unable to find request for URL ${url}`);
    return;
  }

  for (const [name, value] of stats.entries()) {
    if (typeof request.args.data.syntheticData[name] === 'number') {
      const expectedValue = value as DataArgsProcessedData[D];
      const actualValueRounded =
          Number((request.args.data.syntheticData[name] as number).toPrecision(5)) as DataArgsProcessedData[D];
      assert.strictEqual(actualValueRounded, expectedValue, url);
    } else {
      assert.strictEqual(request.args.data.syntheticData[name], value, url);
    }
  }
}
