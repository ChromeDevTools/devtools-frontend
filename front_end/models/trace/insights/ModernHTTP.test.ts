// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';
import * as Trace from '../trace.js';

import * as ModernHTTP from './ModernHTTP.js';
const {determineHttp1Requests: determineNonHttp2Resources} = ModernHTTP;

describeWithEnvironment('Cache', function() {
  describe('determineNonHttp2Resources', () => {
    function createNRequests(cb: (i: number) => Trace.Types.Events.SyntheticNetworkRequest, num: number) {
      const reqs: Trace.Types.Events.SyntheticNetworkRequest[] = [];
      for (let i = 0; i < num; ++i) {
        reqs.push(cb(i));
      }
      return reqs;
    }

    const generic1PEntity: Trace.Handlers.Helpers.Entity = {
      name: 'first-party',
      company: 'First Party',
      category: 'cat',
      categories: [],
      domains: ['first.party'],
      averageExecutionTime: 100,
      totalExecutionTime: 100,
      totalOccurrences: 1,
    };

    function createEntityMappings(events: Trace.Types.Events.Event[]): Trace.Handlers.Helpers.EntityMappings {
      const entityMappings: Trace.Handlers.Helpers.EntityMappings = {
        createdEntityCache: new Map(),
        entityByEvent: new Map(),
        eventsByEntity: new Map(),
        entityByUrlCache: new Map(),
      };
      for (const event of events) {
        Trace.Handlers.Helpers.addEventToEntityMapping(event, entityMappings);
      }
      return entityMappings;
    }

    it('returns requests affected by an old HTTP version', () => {
      const requests: Trace.Types.Events.SyntheticNetworkRequest[] = [
        ...createNRequests(
            i => ({
              args: {
                data: {
                  url: `https://example.com/req${i}`,
                  protocol: 'http/2',
                  resourceType: 'Image',
                  decodedBodyLength: 1000,
                },
              },
            } as Trace.Types.Events.SyntheticNetworkRequest),
            6),
        {
          args: {
            data: {
              url: 'https://example.com/bad',
              protocol: 'http/1.1',
              resourceType: 'Image',
              decodedBodyLength: 1000,
            },
          },
        } as Trace.Types.Events.SyntheticNetworkRequest,
      ];
      const result = determineNonHttp2Resources(requests, createEntityMappings(requests), generic1PEntity);
      assert.deepEqual(result.map(r => r.args.data.url), ['https://example.com/bad']);
    });

    it('ignores requests fetched from service workers', () => {
      const requests: Trace.Types.Events.SyntheticNetworkRequest[] = [
        ...createNRequests(
            i => ({
              args: {
                data: {
                  url: `https://example.com/req${i}`,
                  protocol: 'http/2',
                  resourceType: 'Image',
                  decodedBodyLength: 1000,
                },
              },
            } as Trace.Types.Events.SyntheticNetworkRequest),
            6),
        {
          args: {
            data: {
              url: 'https://example.com/bad',
              protocol: 'http/1.1',
              resourceType: 'Image',
              decodedBodyLength: 1000,
              fromServiceWorker: true,
            },
          },
        } as Trace.Types.Events.SyntheticNetworkRequest,
      ];
      const result = determineNonHttp2Resources(requests, createEntityMappings(requests), generic1PEntity);
      assert.deepEqual(result.map(r => r.args.data.url), []);
    });

    it('ignores requests fetched using http2 or higher', () => {
      const requests: Trace.Types.Events.SyntheticNetworkRequest[] = [
        ...createNRequests(
            i => ({
              args: {
                data: {
                  url: `https://example.com/req${i}`,
                  protocol: 'http/2',
                  resourceType: 'Image',
                  decodedBodyLength: 1000,
                },
              },
            } as Trace.Types.Events.SyntheticNetworkRequest),
            6),
        {
          args: {
            data: {
              url: 'https://example.com/bad',
              protocol: 'http/3',
              resourceType: 'Image',
              decodedBodyLength: 1000,
            },
          },
        } as Trace.Types.Events.SyntheticNetworkRequest,
      ];
      const result = determineNonHttp2Resources(requests, createEntityMappings(requests), generic1PEntity);
      assert.deepEqual(result.map(r => r.args.data.url), []);
    });

    it('shows requests if the origin had 6 static resource requests', () => {
      const requests: Trace.Types.Events.SyntheticNetworkRequest[] = [
        ...createNRequests(
            i => ({
              args: {
                data: {
                  url: `https://example.com/req${i}`,
                  protocol: 'http/2',
                  resourceType: 'Image',
                  decodedBodyLength: 1000,
                },
              },
            } as Trace.Types.Events.SyntheticNetworkRequest),
            6),
        {
          args: {
            data: {
              url: 'https://example.com/fetch',
              protocol: 'http/1.1',
              resourceType: 'Fetch',
              decodedBodyLength: 1000,
            },
          },
        } as Trace.Types.Events.SyntheticNetworkRequest,
      ];
      const result = determineNonHttp2Resources(requests, createEntityMappings(requests), generic1PEntity);
      assert.deepEqual(result.map(r => r.args.data.url), ['https://example.com/fetch']);
    });

    it('ignores requests if the origin did not have 6 requests', () => {
      const requests: Trace.Types.Events.SyntheticNetworkRequest[] = [
        {
          args: {
            data: {
              url: 'https://example.com/fetch',
              protocol: 'http/1.1',
              resourceType: 'Fetch',
              decodedBodyLength: 1000,
            },
          },
        } as Trace.Types.Events.SyntheticNetworkRequest,
      ];
      const result = determineNonHttp2Resources(requests, createEntityMappings(requests), generic1PEntity);
      assert.deepEqual(result.map(r => r.args.data.url), []);
    });

    it('ignores requests if the 6+ origin requests were not static resources', () => {
      const requests: Trace.Types.Events.SyntheticNetworkRequest[] = [
        ...createNRequests(
            i => ({
              args: {
                data: {
                  url: `https://example.com/req${i}`,
                  protocol: 'http/2',
                  resourceType: 'Fetch',
                  decodedBodyLength: 1000,
                },
              },
            } as Trace.Types.Events.SyntheticNetworkRequest),
            6),
        {
          args: {
            data: {
              url: 'https://example.com/fetch',
              protocol: 'http/1.1',
              resourceType: 'Fetch',
              decodedBodyLength: 1000,
            },
          },
        } as Trace.Types.Events.SyntheticNetworkRequest,
      ];
      const result = determineNonHttp2Resources(requests, createEntityMappings(requests), generic1PEntity);
      assert.deepEqual(result.map(r => r.args.data.url), []);
    });

    it('ignores requests if the 6+ origin requests were served on localhost', () => {
      const requests: Trace.Types.Events.SyntheticNetworkRequest[] = [
        ...createNRequests(
            i => ({
              args: {
                data: {
                  url: `https://localhost:8080/req${i}`,
                  protocol: 'http/2',
                  resourceType: 'Image',
                  decodedBodyLength: 1000,
                },
              },
            } as Trace.Types.Events.SyntheticNetworkRequest),
            6),
        {
          args: {
            data: {
              url: 'https://localhost:8080/fetch',
              protocol: 'http/1.1',
              resourceType: 'Fetch',
              decodedBodyLength: 1000,
            },
          },
        } as Trace.Types.Events.SyntheticNetworkRequest,
      ];
      const result = determineNonHttp2Resources(requests, createEntityMappings(requests), generic1PEntity);
      assert.deepEqual(result.map(r => r.args.data.url), []);
    });

    it('ignores requests if the 6+ origin requests were too small on a known entity', () => {
      const requests: Trace.Types.Events.SyntheticNetworkRequest[] = [
        ...createNRequests(
            i => ({
              args: {
                data: {
                  url: `https://www.google.com/req${i}`,
                  protocol: 'http/2',
                  resourceType: 'Image',
                  decodedBodyLength: 10,
                },
              },
            } as Trace.Types.Events.SyntheticNetworkRequest),
            6),
        {
          args: {
            data: {
              url: 'https://www.google.com/fetch',
              protocol: 'http/1.1',
              resourceType: 'Fetch',
              decodedBodyLength: 1000,
            },
          },
        } as Trace.Types.Events.SyntheticNetworkRequest,
      ];
      const result = determineNonHttp2Resources(requests, createEntityMappings(requests), generic1PEntity);
      assert.deepEqual(result.map(r => r.args.data.url), []);
    });

    it('shows requests if the 6+ origin requests were too small on an unknown entity', () => {
      const requests: Trace.Types.Events.SyntheticNetworkRequest[] = [
        ...createNRequests(
            i => ({
              args: {
                data: {
                  url: `https://example.com/req${i}`,
                  protocol: 'http/2',
                  resourceType: 'Image',
                  decodedBodyLength: 10,
                },
              },
            } as Trace.Types.Events.SyntheticNetworkRequest),
            6),
        {
          args: {
            data: {
              url: 'https://example.com/fetch',
              protocol: 'http/1.1',
              resourceType: 'Fetch',
              decodedBodyLength: 1000,
            },
          },
        } as Trace.Types.Events.SyntheticNetworkRequest,
      ];
      const result = determineNonHttp2Resources(requests, createEntityMappings(requests), generic1PEntity);
      assert.deepEqual(result.map(r => r.args.data.url), ['https://example.com/fetch']);
    });

    it('shows requests if the 6+ origin requests were too small on the first party entity', () => {
      const requests: Trace.Types.Events.SyntheticNetworkRequest[] = [
        ...createNRequests(
            i => ({
              args: {
                data: {
                  url: `https://example.com/req${i}`,
                  protocol: 'http/2',
                  resourceType: 'Image',
                  decodedBodyLength: 10,
                },
              },
            } as Trace.Types.Events.SyntheticNetworkRequest),
            6),
        {
          args: {
            data: {
              url: 'https://example.com/fetch',
              protocol: 'http/1.1',
              resourceType: 'Fetch',
              decodedBodyLength: 1000,
            },
          },
        } as Trace.Types.Events.SyntheticNetworkRequest,
      ];
      const entityMappings = createEntityMappings(requests);
      const firstPartyEntity = entityMappings.entityByEvent.get(requests[0]);
      const result = determineNonHttp2Resources(requests, createEntityMappings(requests), firstPartyEntity!);
      assert.deepEqual(result.map(r => r.args.data.url), ['https://example.com/fetch']);
    });
  });

  it('identifies HTTP/1.1 requests in a real trace', async () => {
    const {data, insights} = await processTrace(this, 'http1.1.json.gz');
    const insight =
        getInsightOrError('ModernHTTP', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));
    assert.deepEqual(insight.http1Requests.map(r => r.args.data.url), [
      'https://ads.jetpackdigital.com/sites/_uploads/1742278386bg_opt_640x350-avif.avif',
      'https://ads.jetpackdigital.com/sites/_uploads/1583540859Play.png',
      'https://ads.jetpackdigital.com/sites/_uploads/1583540859Muted.png',
      'https://ads.jetpackdigital.com/h5media/sites/_uploads/1742363510mm_allthefeels_20_mob.mp4',
      'https://ads.jetpackdigital.com/sites/_uploads/1583540860Pause.png',
      'https://ads.jetpackdigital.com/tracking_pixel.gif?8852762616',
      'https://ads.jetpackdigital.com/tracking_pixel.gif?7753243273',
    ]);

    // All the above were preload requests. None should affect FCP or LCP.
    assert.deepEqual(insight.metricSavings, {
      FCP: 0 as Trace.Types.Timing.Milli,
      LCP: 0 as Trace.Types.Timing.Milli,
    });
  });
});
