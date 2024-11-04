// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

type DataArgs = Trace.Types.Events.SyntheticNetworkRequest['args']['data'];
type DataArgsProcessedData = Trace.Types.Events.SyntheticNetworkRequest['args']['data']['syntheticData'];
type DataArgsMap = Map<keyof DataArgs, DataArgs[keyof DataArgs]>;
type DataArgsProcessedDataMap = Map<keyof DataArgsProcessedData, DataArgsProcessedData[keyof DataArgsProcessedData]>;

describe('NetworkRequestsHandler', function() {
  describe('network requests calculations', () => {
    beforeEach(() => {
      Trace.Handlers.ModelHandlers.Meta.reset();
    });

    it('calculates network requests correctly', async function() {
      const traceEvents = await TraceLoader.rawEvents(this, 'load-simple.json.gz');
      for (const event of traceEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
        Trace.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
      }
      await Trace.Handlers.ModelHandlers.Meta.finalize();
      await Trace.Handlers.ModelHandlers.NetworkRequests.finalize();

      const requestsByOrigin = Trace.Handlers.ModelHandlers.NetworkRequests.data().byOrigin;
      assert.strictEqual(requestsByOrigin.size, 3, 'Too many origins detected');

      const topLevelRequests = requestsByOrigin.get('localhost:8080') || {all: []};
      assert.strictEqual(topLevelRequests.all.length, 4, 'Incorrect number of requests');

      // Page Request.
      const pageRequestExpected: DataArgsProcessedDataMap = new Map([
        ['queueing', Trace.Types.Timing.MicroSeconds(25085)],
        ['stalled', Trace.Types.Timing.MicroSeconds(5670)],
        ['dnsLookup', Trace.Types.Timing.MicroSeconds(105)],
        ['initialConnection', Trace.Types.Timing.MicroSeconds(498)],
        ['ssl', Trace.Types.Timing.MicroSeconds(0)],
        ['requestSent', Trace.Types.Timing.MicroSeconds(363)],
        ['waiting', Trace.Types.Timing.MicroSeconds(1383)],
        ['download', Trace.Types.Timing.MicroSeconds(4827)],
        ['networkDuration', Trace.Types.Timing.MicroSeconds(38503)],
      ]);
      assertDataArgsProcessedDataStats(topLevelRequests.all, 'http://localhost:8080/', pageRequestExpected);

      // CSS Request (cached event (with resourceMarkAsCached event)),
      const cssRequestExpected: DataArgsProcessedDataMap = new Map([
        ['queueing', Trace.Types.Timing.MicroSeconds(0)],
        ['stalled', Trace.Types.Timing.MicroSeconds(2175)],
        ['dnsLookup', Trace.Types.Timing.MicroSeconds(0)],
        ['initialConnection', Trace.Types.Timing.MicroSeconds(0)],
        ['ssl', Trace.Types.Timing.MicroSeconds(0)],
        ['requestSent', Trace.Types.Timing.MicroSeconds(0)],
        ['waiting', Trace.Types.Timing.MicroSeconds(0)],
        ['download', Trace.Types.Timing.MicroSeconds(1294)],
        ['networkDuration', Trace.Types.Timing.MicroSeconds(0)],
      ]);

      const cssRequestBlockingStatusExpected: DataArgsMap = new Map([
        ['renderBlocking', 'blocking'],
      ]);

      assertDataArgsProcessedDataStats(topLevelRequests.all, 'http://localhost:8080/styles.css', cssRequestExpected);
      assertDataArgsStats(topLevelRequests.all, 'http://localhost:8080/styles.css', cssRequestBlockingStatusExpected);

      // Blocking JS Request.
      const blockingJSRequestExpected: DataArgsProcessedDataMap = new Map([
        ['queueing', Trace.Types.Timing.MicroSeconds(0)],
        ['stalled', Trace.Types.Timing.MicroSeconds(2126)],
        ['dnsLookup', Trace.Types.Timing.MicroSeconds(0)],
        ['initialConnection', Trace.Types.Timing.MicroSeconds(0)],
        ['ssl', Trace.Types.Timing.MicroSeconds(0)],
        ['requestSent', Trace.Types.Timing.MicroSeconds(0)],
        ['waiting', Trace.Types.Timing.MicroSeconds(0)],
        ['download', Trace.Types.Timing.MicroSeconds(1207)],
        ['networkDuration', Trace.Types.Timing.MicroSeconds(0)],
      ]);

      const blockingJSBlockingStatusExpected: DataArgsMap = new Map([
        ['renderBlocking', 'in_body_parser_blocking'],
      ]);

      assertDataArgsProcessedDataStats(
          topLevelRequests.all, 'http://localhost:8080/blocking.js', blockingJSRequestExpected);
      assertDataArgsStats(topLevelRequests.all, 'http://localhost:8080/blocking.js', blockingJSBlockingStatusExpected);

      // Module JS Request (cached).
      const moduleRequestExpected: DataArgsProcessedDataMap = new Map([
        ['queueing', Trace.Types.Timing.MicroSeconds(7681)],
        ['stalled', Trace.Types.Timing.MicroSeconds(1527)],
        ['dnsLookup', Trace.Types.Timing.MicroSeconds(0)],
        ['initialConnection', Trace.Types.Timing.MicroSeconds(0)],
        ['ssl', Trace.Types.Timing.MicroSeconds(0)],
        ['requestSent', Trace.Types.Timing.MicroSeconds(0)],
        ['waiting', Trace.Types.Timing.MicroSeconds(20200)],
        ['download', Trace.Types.Timing.MicroSeconds(19273)],
        ['networkDuration', Trace.Types.Timing.MicroSeconds(48681)],
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
        ['queueing', Trace.Types.Timing.MicroSeconds(0)],
        ['stalled', Trace.Types.Timing.MicroSeconds(3178)],
        ['dnsLookup', Trace.Types.Timing.MicroSeconds(0)],
        ['initialConnection', Trace.Types.Timing.MicroSeconds(0)],
        ['ssl', Trace.Types.Timing.MicroSeconds(0)],
        ['requestSent', Trace.Types.Timing.MicroSeconds(0)],
        ['waiting', Trace.Types.Timing.MicroSeconds(0)],
        ['download', Trace.Types.Timing.MicroSeconds(1203)],
        ['networkDuration', Trace.Types.Timing.MicroSeconds(0)],
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
        ['queueing', Trace.Types.Timing.MicroSeconds(0)],
        ['stalled', Trace.Types.Timing.MicroSeconds(1929)],
        ['dnsLookup', Trace.Types.Timing.MicroSeconds(0)],
        ['initialConnection', Trace.Types.Timing.MicroSeconds(0)],
        ['ssl', Trace.Types.Timing.MicroSeconds(0)],
        ['requestSent', Trace.Types.Timing.MicroSeconds(0)],
        ['waiting', Trace.Types.Timing.MicroSeconds(0)],
        ['download', Trace.Types.Timing.MicroSeconds(962)],
        ['networkDuration', Trace.Types.Timing.MicroSeconds(0)],
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

    it('calculates Websocket events correctly', async function() {
      const traceEvents = await TraceLoader.rawEvents(this, 'network-websocket-messages.json.gz');
      for (const event of traceEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
        Trace.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
      }
      await Trace.Handlers.ModelHandlers.Meta.finalize();
      await Trace.Handlers.ModelHandlers.NetworkRequests.finalize();

      const webSocketEvents = Trace.Handlers.ModelHandlers.NetworkRequests.data().webSocket;

      assert.strictEqual(webSocketEvents[0].events.length, 9, 'Incorrect number of events');
    });
  });

  describe('parses the change priority request', () => {
    beforeEach(() => {
      Trace.Handlers.ModelHandlers.Meta.reset();
    });

    it('changes priority of the resouce', async function() {
      const traceEvents = await TraceLoader.rawEvents(this, 'changing-priority.json.gz');

      for (const event of traceEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
        Trace.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
      }
      await Trace.Handlers.ModelHandlers.Meta.finalize();
      await Trace.Handlers.ModelHandlers.NetworkRequests.finalize();

      const {byTime} = Trace.Handlers.ModelHandlers.NetworkRequests.data();

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
      Trace.Handlers.ModelHandlers.Meta.reset();
    });

    it('calculates redirects correctly (navigations)', async function() {
      const traceEvents = await TraceLoader.rawEvents(this, 'redirects.json.gz');
      for (const event of traceEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
        Trace.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
      }
      await Trace.Handlers.ModelHandlers.Meta.finalize();
      await Trace.Handlers.ModelHandlers.NetworkRequests.finalize();

      const {byTime} = Trace.Handlers.ModelHandlers.NetworkRequests.data();
      assert.strictEqual(byTime.length, 2, 'Incorrect number of requests');
      assert.strictEqual(byTime[0].args.data.redirects.length, 0, 'Incorrect number of redirects (request 0)');
      assert.deepStrictEqual(
          byTime[1].args.data.redirects,
          [
            {
              url: 'http://localhost:3000/foo',
              priority: 'VeryHigh',
              requestMethod: 'GET',
              ts: Trace.Types.Timing.MicroSeconds(1311223447642),
              dur: Trace.Types.Timing.MicroSeconds(7845),
            },
            {
              url: 'http://localhost:3000/bar',
              priority: 'VeryHigh',
              requestMethod: 'GET',
              ts: Trace.Types.Timing.MicroSeconds(1311223455487),
              dur: Trace.Types.Timing.MicroSeconds(3771),
            },
          ],
          'Incorrect number of redirects (request 1)');
    });

    it('calculates redirects correctly (subresources)', async function() {
      const traceEvents = await TraceLoader.rawEvents(this, 'redirects-subresource-multiple.json.gz');
      for (const event of traceEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
        Trace.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
      }
      await Trace.Handlers.ModelHandlers.Meta.finalize();
      await Trace.Handlers.ModelHandlers.NetworkRequests.finalize();

      const {byTime} = Trace.Handlers.ModelHandlers.NetworkRequests.data();
      assert.strictEqual(byTime.length, 2, 'Incorrect number of requests');
      assert.strictEqual(byTime[0].args.data.redirects.length, 0, 'Incorrect number of redirects (request 0)');
      assert.deepStrictEqual(
          byTime[1].args.data.redirects,
          [
            {
              url: 'http://localhost:3000/foo.js',
              priority: 'Low',
              requestMethod: 'GET',
              ts: Trace.Types.Timing.MicroSeconds(183611568786),
              dur: Trace.Types.Timing.MicroSeconds(506233),
            },
            {
              url: 'http://localhost:3000/bar.js',
              priority: 'Low',
              requestMethod: 'GET',
              ts: Trace.Types.Timing.MicroSeconds(183612075019),
              dur: Trace.Types.Timing.MicroSeconds(802726),
            },
          ],
          'Incorrect number of redirects (request 1)');
    });
  });

  describe('initiators', () => {
    beforeEach(() => {
      Trace.Handlers.ModelHandlers.Meta.reset();
    });

    it('calculate the initiator by `initiator` field correctly', async function() {
      const traceEvents = await TraceLoader.rawEvents(this, 'network-requests-initiators.json.gz');
      for (const event of traceEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
        Trace.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
      }
      await Trace.Handlers.ModelHandlers.Meta.finalize();
      await Trace.Handlers.ModelHandlers.NetworkRequests.finalize();

      const {eventToInitiator, byTime} = Trace.Handlers.ModelHandlers.NetworkRequests.data();

      // Find the network request to test, it is initiated by `youtube.com`.
      const event = byTime.find(event => event.ts === 1491680762420);
      if (!event) {
        throw new Error('Could not find the network request.');
      }
      assert.strictEqual(
          event.args.data.url,
          'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=YouTube+Sans:wght@300..900&display=swap');

      const initiator = eventToInitiator.get(event);
      if (!initiator) {
        throw new Error('Did not find expected initiator for the network request');
      }
      assert.strictEqual(initiator.args.data.url, 'https://www.youtube.com/');
      assert.strictEqual(initiator.args.data.url, event.args.data.initiator?.url);
    });

    it('calculate the initiator by top frame correctly', async function() {
      const traceEvents = await TraceLoader.rawEvents(this, 'network-requests-initiators.json.gz');
      for (const event of traceEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
        Trace.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
      }
      await Trace.Handlers.ModelHandlers.Meta.finalize();
      await Trace.Handlers.ModelHandlers.NetworkRequests.finalize();

      const {eventToInitiator, byTime} = Trace.Handlers.ModelHandlers.NetworkRequests.data();

      // Find the network request to test, it is initiated by `                `.
      const event = byTime.find(event => event.ts === 1491681999060);
      if (!event) {
        throw new Error('Could not find the network request.');
      }
      assert.strictEqual(
          event.args.data.url, 'https://www.youtube.com/s/player/5b22937f/player_ias.vflset/en_US/base.js');

      const initiator = eventToInitiator.get(event);
      if (!initiator) {
        throw new Error('Did not find expected initiator for the network request');
      }
      assert.strictEqual(
          initiator.args.data.url,
          'https://www.youtube.com/s/desktop/28bb7000/jsbin/desktop_polymer.vflset/desktop_polymer.js');
      assert.isUndefined(event.args.data.initiator?.url);
      assert.strictEqual(initiator.args.data.url, event.args.data.stackTrace?.[0].url);
    });
  });
});

function assertDataArgsStats<D extends keyof DataArgs>(
    requests: Trace.Types.Events.SyntheticNetworkRequest[], url: string, stats: Map<D, DataArgs[D]>): void {
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
    requests: Trace.Types.Events.SyntheticNetworkRequest[], url: string,
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
