// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getAllNetworkRequestsByHost} from '../../../testing/TraceHelpers.js';
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

      const topLevelRequests =
          getAllNetworkRequestsByHost(Trace.Handlers.ModelHandlers.NetworkRequests.data().byTime, 'localhost:8080');
      assert.lengthOf(topLevelRequests, 4, 'Incorrect number of requests');

      // Page Request.
      const pageRequestExpected: DataArgsProcessedDataMap = new Map([
        ['queueing', Trace.Types.Timing.Micro(25085)],
        ['stalled', Trace.Types.Timing.Micro(5670)],
        ['dnsLookup', Trace.Types.Timing.Micro(105)],
        ['initialConnection', Trace.Types.Timing.Micro(498)],
        ['ssl', Trace.Types.Timing.Micro(0)],
        ['requestSent', Trace.Types.Timing.Micro(363)],
        ['waiting', Trace.Types.Timing.Micro(1383)],
        ['download', Trace.Types.Timing.Micro(4827)],
        ['networkDuration', Trace.Types.Timing.Micro(38503)],
      ]);
      assertDataArgsProcessedDataStats(topLevelRequests, 'http://localhost:8080/', pageRequestExpected);

      // CSS Request (cached event (with resourceMarkAsCached event)),
      const cssRequestExpected: DataArgsProcessedDataMap = new Map([
        ['queueing', Trace.Types.Timing.Micro(0)],
        ['stalled', Trace.Types.Timing.Micro(2175)],
        ['dnsLookup', Trace.Types.Timing.Micro(0)],
        ['initialConnection', Trace.Types.Timing.Micro(0)],
        ['ssl', Trace.Types.Timing.Micro(0)],
        ['requestSent', Trace.Types.Timing.Micro(0)],
        ['waiting', Trace.Types.Timing.Micro(0)],
        ['download', Trace.Types.Timing.Micro(1294)],
        ['networkDuration', Trace.Types.Timing.Micro(0)],
      ]);

      const cssRequestBlockingStatusExpected: DataArgsMap = new Map([
        ['renderBlocking', 'blocking'],
      ]);

      assertDataArgsProcessedDataStats(topLevelRequests, 'http://localhost:8080/styles.css', cssRequestExpected);
      assertDataArgsStats(topLevelRequests, 'http://localhost:8080/styles.css', cssRequestBlockingStatusExpected);

      // Blocking JS Request.
      const blockingJSRequestExpected: DataArgsProcessedDataMap = new Map([
        ['queueing', Trace.Types.Timing.Micro(0)],
        ['stalled', Trace.Types.Timing.Micro(2126)],
        ['dnsLookup', Trace.Types.Timing.Micro(0)],
        ['initialConnection', Trace.Types.Timing.Micro(0)],
        ['ssl', Trace.Types.Timing.Micro(0)],
        ['requestSent', Trace.Types.Timing.Micro(0)],
        ['waiting', Trace.Types.Timing.Micro(0)],
        ['download', Trace.Types.Timing.Micro(1207)],
        ['networkDuration', Trace.Types.Timing.Micro(0)],
      ]);

      const blockingJSBlockingStatusExpected: DataArgsMap = new Map([
        ['renderBlocking', 'in_body_parser_blocking'],
      ]);

      assertDataArgsProcessedDataStats(
          topLevelRequests, 'http://localhost:8080/blocking.js', blockingJSRequestExpected);
      assertDataArgsStats(topLevelRequests, 'http://localhost:8080/blocking.js', blockingJSBlockingStatusExpected);

      // Module JS Request (cached).
      const moduleRequestExpected: DataArgsProcessedDataMap = new Map([
        ['queueing', Trace.Types.Timing.Micro(7681)],
        ['stalled', Trace.Types.Timing.Micro(1527)],
        ['dnsLookup', Trace.Types.Timing.Micro(0)],
        ['initialConnection', Trace.Types.Timing.Micro(0)],
        ['ssl', Trace.Types.Timing.Micro(0)],
        ['requestSent', Trace.Types.Timing.Micro(0)],
        ['waiting', Trace.Types.Timing.Micro(20200)],
        ['download', Trace.Types.Timing.Micro(19273)],
        ['networkDuration', Trace.Types.Timing.Micro(48681)],
      ]);

      const moduleRequestBlockingStatusExpected: DataArgsMap = new Map([
        ['renderBlocking', 'non_blocking'],
      ]);

      assertDataArgsProcessedDataStats(topLevelRequests, 'http://localhost:8080/module.js', moduleRequestExpected);
      assertDataArgsStats(topLevelRequests, 'http://localhost:8080/module.js', moduleRequestBlockingStatusExpected);

      // Google Fonts CSS Request (cached).
      const fontCSSRequests = getAllNetworkRequestsByHost(
          Trace.Handlers.ModelHandlers.NetworkRequests.data().byTime, 'fonts.googleapis.com');
      assert.lengthOf(fontCSSRequests, 1, 'Incorrect number of requests');

      const fontCSSRequestExpected: DataArgsProcessedDataMap = new Map([
        ['queueing', Trace.Types.Timing.Micro(0)],
        ['stalled', Trace.Types.Timing.Micro(3178)],
        ['dnsLookup', Trace.Types.Timing.Micro(0)],
        ['initialConnection', Trace.Types.Timing.Micro(0)],
        ['ssl', Trace.Types.Timing.Micro(0)],
        ['requestSent', Trace.Types.Timing.Micro(0)],
        ['waiting', Trace.Types.Timing.Micro(0)],
        ['download', Trace.Types.Timing.Micro(1203)],
        ['networkDuration', Trace.Types.Timing.Micro(0)],
      ]);

      const fontCSSBlockingStatusExpected: DataArgsMap = new Map([
        ['renderBlocking', 'blocking'],
      ]);

      assertDataArgsProcessedDataStats(
          fontCSSRequests, 'https://fonts.googleapis.com/css2?family=Orelega+One&display=swap', fontCSSRequestExpected);
      assertDataArgsStats(
          fontCSSRequests, 'https://fonts.googleapis.com/css2?family=Orelega+One&display=swap',
          fontCSSBlockingStatusExpected);

      // Google Fonts Data Request (cached).
      const fontDataRequests =
          getAllNetworkRequestsByHost(Trace.Handlers.ModelHandlers.NetworkRequests.data().byTime, 'fonts.gstatic.com');
      assert.lengthOf(fontDataRequests, 1, 'Incorrect number of requests');

      const fontDataRequestExpected: DataArgsProcessedDataMap = new Map([
        ['queueing', Trace.Types.Timing.Micro(0)],
        ['stalled', Trace.Types.Timing.Micro(1929)],
        ['dnsLookup', Trace.Types.Timing.Micro(0)],
        ['initialConnection', Trace.Types.Timing.Micro(0)],
        ['ssl', Trace.Types.Timing.Micro(0)],
        ['requestSent', Trace.Types.Timing.Micro(0)],
        ['waiting', Trace.Types.Timing.Micro(0)],
        ['download', Trace.Types.Timing.Micro(962)],
        ['networkDuration', Trace.Types.Timing.Micro(0)],
      ]);

      const fontDataRequestBlockingStatusExpected: DataArgsMap = new Map([
        ['renderBlocking', 'non_blocking'],
      ]);

      assertDataArgsProcessedDataStats(
          fontDataRequests, 'https://fonts.gstatic.com/s/orelegaone/v1/3qTpojOggD2XtAdFb-QXZFt93kY.woff2',
          fontDataRequestExpected);

      assertDataArgsStats(
          fontDataRequests, 'https://fonts.gstatic.com/s/orelegaone/v1/3qTpojOggD2XtAdFb-QXZFt93kY.woff2',
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

      assert.lengthOf(webSocketEvents[0].events, 9, 'Incorrect number of events');
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
      assert.lengthOf(byTime, 2, 'Incorrect number of requests');
      assert.lengthOf(byTime[0].args.data.redirects, 0, 'Incorrect number of redirects (request 0)');
      assert.deepEqual(
          byTime[1].args.data.redirects,
          [
            {
              url: 'http://localhost:3000/foo',
              priority: 'VeryHigh',
              requestMethod: 'GET',
              ts: Trace.Types.Timing.Micro(1311223447642),
              dur: Trace.Types.Timing.Micro(7845),
            },
            {
              url: 'http://localhost:3000/bar',
              priority: 'VeryHigh',
              requestMethod: 'GET',
              ts: Trace.Types.Timing.Micro(1311223455487),
              dur: Trace.Types.Timing.Micro(3771),
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
      assert.lengthOf(byTime, 2, 'Incorrect number of requests');
      assert.lengthOf(byTime[0].args.data.redirects, 0, 'Incorrect number of redirects (request 0)');
      assert.deepEqual(
          byTime[1].args.data.redirects,
          [
            {
              url: 'http://localhost:3000/foo.js',
              priority: 'Low',
              requestMethod: 'GET',
              ts: Trace.Types.Timing.Micro(183611568786),
              dur: Trace.Types.Timing.Micro(506233),
            },
            {
              url: 'http://localhost:3000/bar.js',
              priority: 'Low',
              requestMethod: 'GET',
              ts: Trace.Types.Timing.Micro(183612075019),
              dur: Trace.Types.Timing.Micro(802726),
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
  describe('ThirdParty caches', () => {
    it('Correctly captures entities by network event', async function() {
      const traceEvents = await TraceLoader.rawEvents(this, 'lantern/paul/trace.json.gz');
      for (const event of traceEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
        Trace.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
      }
      await Trace.Handlers.ModelHandlers.Meta.finalize();
      await Trace.Handlers.ModelHandlers.NetworkRequests.finalize();

      const {entityMappings} = Trace.Handlers.ModelHandlers.NetworkRequests.data();
      const syntheticNetworkEventsByEntity = new Map(
          Array.from(entityMappings.eventsByEntity.entries()).map(([entity, events]) => {
            const syntheticNetworkEvents = events.filter(
                event => Trace.Types.Events.isSyntheticNetworkRequest(event),
            );
            return [entity, syntheticNetworkEvents];
          }),
      );
      const requestsByEntityResult = [...syntheticNetworkEventsByEntity.entries()].map(([entity, requests]) => {
        return [entity.name, requests.map(r => r.args?.data?.url)];
      });
      assert.deepEqual(
          requestsByEntityResult,
          [
            [
              'paulirish.com',
              [
                'https://www.paulirish.com/',
                'https://www.paulirish.com/assets/wikipedia-flamechart.jpg',
                'https://www.paulirish.com/avatar150.jpg',
                'https://www.paulirish.com/javascripts/modernizr-2.0.js',
                'https://www.paulirish.com/javascripts/ender.js',
                'https://www.paulirish.com/javascripts/octopress.js',
                'https://www.paulirish.com/javascripts/firebase-performance-standalone.js',
                'https://www.paulirish.com/images/noise.png?1418840251',
                'https://www.paulirish.com/images/code_bg.png?1418840251',
                'https://www.paulirish.com/favicon.ico',
              ],
            ],
            [
              'Google Tag Manager',
              [
                'https://www.googletagmanager.com/gtag/js?id=G-PGXNGYWP8E',
              ],
            ],
            [
              'Google Fonts',
              [
                'https://fonts.googleapis.com/css?family=PT+Serif:regular,italic,bold|PT+Sans:regular,italic,bold|Droid+Sans:400,700|Lato:700,900',
                'https://fonts.gstatic.com/s/droidsans/v18/SlGVmQWMvZQIdix7AFxXkHNSbRYXags.woff2',
                'https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh6UVSwiPGQ3q5d0.woff2',
                'https://fonts.gstatic.com/s/ptsans/v17/jizaRExUiTo99u79D0KExcOPIDU.woff2',
                'https://fonts.gstatic.com/s/ptsans/v17/jizfRExUiTo99u79B_mh0O6tLR8a8zI.woff2',
                'https://fonts.gstatic.com/s/droidsans/v18/SlGWmQWMvZQIdix7AFxXmMh3eDs1ZyHKpWg.woff2',
                'https://fonts.gstatic.com/s/ptserif/v18/EJRVQgYoZZY2vCFuvAFWzr-_dSb_.woff2',
              ],
            ],
            [
              'Google Analytics',
              [
                'https://www.google-analytics.com/analytics.js',
                'https://www.google-analytics.com/g/collect?v=2&tid=G-PGXNGYWP8E&gtm=45je4580v880158425za200&_p=1715625261583&gcd=13l3l3l3l1&npa=0&dma=0&cid=414801335.1715625262&ul=en-us&sr=412x823&uaa=&uab=64&uafvl=Not%252FA)Brand%3B8.0.0.0%7CChromium%3B126.0.6475.0%7CGoogle%2520Chrome%3B126.0.6475.0&uamb=1&uam=moto%20g%20power%20(2022)&uap=Android&uapv=11.0&uaw=0&are=1&frm=0&pscdl=noapi&_s=1&sid=1715625261&sct=1&seg=0&dl=https%3A%2F%2Fwww.paulirish.com%2F&dt=Paul%20Irish&en=page_view&_fv=1&_nsi=1&_ss=1&_ee=1&tfd=353',
                'https://www.google-analytics.com/j/collect?v=1&_v=j101&a=272264939&t=pageview&_s=1&dl=https%3A%2F%2Fwww.paulirish.com%2F&ul=en-us&de=UTF-8&dt=Paul%20Irish&sd=30-bit&sr=412x823&vp=412x823&je=0&_u=IADAAEABAAAAACAAI~&jid=1388679807&gjid=654531532&cid=414801335.1715625262&tid=UA-692547-2&_gid=1964734610.1715625262&_r=1&_slc=1&z=1746264594',
              ],
            ],
            [
              'Disqus',
              [
                'https://paulirish.disqus.com/count.js',
              ],
            ],
            [
              'Firebase',
              [
                'https://firebaseinstallations.googleapis.com/v1/projects/paulirishcom/installations',
                'https://firebaseremoteconfig.googleapis.com/v1/projects/paulirishcom/namespaces/fireperf:fetch?key=AIzaSyCGxLbbFQxH4BV1fY0RODlxTos9nJa2l_g',
              ],
            ],
          ],
      );
    });
    it('Correctly captures entities', async function() {
      const traceEvents = await TraceLoader.rawEvents(this, 'lantern/paul/trace.json.gz');
      for (const event of traceEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
        Trace.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
      }
      await Trace.Handlers.ModelHandlers.Meta.finalize();
      await Trace.Handlers.ModelHandlers.NetworkRequests.finalize();

      const {entityMappings} = Trace.Handlers.ModelHandlers.NetworkRequests.data();
      const expectedEntities = [
        'paulirish.com',
        'Google Tag Manager',
        'Google Fonts',
        'Google Analytics',
        'Disqus',
        'Firebase',
      ];
      const gotEntities = Array.from(entityMappings.entityByEvent.values()).map(enity => enity.name);
      expectedEntities.forEach(entity => {
        assert.isTrue(gotEntities.includes(entity));
      });
    });
  });

  describe('preconnect links', () => {
    it('Correctly captures preconnect links', async function() {
      const traceEvents = await TraceLoader.rawEvents(this, 'preconnect-advice.json.gz');
      for (const event of traceEvents) {
        Trace.Handlers.ModelHandlers.Meta.handleEvent(event);
        Trace.Handlers.ModelHandlers.NetworkRequests.handleEvent(event);
      }
      await Trace.Handlers.ModelHandlers.Meta.finalize();
      await Trace.Handlers.ModelHandlers.NetworkRequests.finalize();

      const linkPreconnectEvents = Trace.Handlers.ModelHandlers.NetworkRequests.data().linkPreconnectEvents;
      const actualLinks = linkPreconnectEvents.map(linkPreconnectEvent => linkPreconnectEvent.args.data.url);

      const expectedLinks = [
        'https://www.youtube.com/',
        'https://www.google.com/',
        'http://example.com/',
      ];

      assert.deepEqual(actualLinks, expectedLinks);
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
      const expectedValue = value;
      const actualValueRounded = Number((request.args.data[name]).toPrecision(5)) as DataArgs[D];
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
      const expectedValue = value;
      const actualValueRounded =
          Number((request.args.data.syntheticData[name] as number).toPrecision(5)) as DataArgsProcessedData[D];
      assert.strictEqual(actualValueRounded, expectedValue, url);
    } else {
      assert.strictEqual(request.args.data.syntheticData[name], value, url);
    }
  }
}
