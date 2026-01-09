// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import type * as Protocol from '../../../generated/protocol.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

import type {PreconnectedOrigin} from './NetworkDependencyTree.js';
import type {InsightSetContextWithNavigation, RelatedEventsMap} from './types.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('NetworkDependencyTree', function() {
  let insight: Trace.Insights.Types.InsightModels['NetworkDependencyTree'];

  before(async function() {
    const {data, insights} = await processTrace(this, 'lcp-multiple-frames.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    insight = getInsightOrError('NetworkDependencyTree', insights, firstNav);
    assert.isOk(insight);
  });

  it('calculates network dependency tree', () => {
    // The network dependency tree in this trace is, |app.js| took longer than |app.css|, so |app.js| will be first.
    // | .../index.html (ts:566777570990, dur:5005590)
    // |
    // | | .../app.js (ts:566782574106, dur:11790)
    // | | .../app.css (ts:566782573909, dur:7205)
    assert.isOk(insight);
    assert.lengthOf(insight.rootNodes, 1);

    const root = insight.rootNodes[0];
    assert.strictEqual(root.request.args.data.url, 'http://localhost:8787/lcp-iframes/index.html');
    assert.strictEqual(root.timeFromInitialRequest, Trace.Types.Timing.Micro(root.request.dur));
    assert.lengthOf(root.children, 2);

    const [child0, child1] = insight.rootNodes[0].children;
    assert.strictEqual(child0.request.args.data.url, 'http://localhost:8787/lcp-iframes/app.js');
    assert.strictEqual(
        child0.timeFromInitialRequest,
        Trace.Types.Timing.Micro(child0.request.ts + child0.request.dur - root.request.ts));
    assert.lengthOf(child0.children, 0);
    assert.strictEqual(child1.request.args.data.url, 'http://localhost:8787/lcp-iframes/app.css');
    assert.strictEqual(
        child1.timeFromInitialRequest,
        Trace.Types.Timing.Micro(child1.request.ts + child1.request.dur - root.request.ts));
    assert.lengthOf(child1.children, 0);
  });

  it('Calculate the max critical path latency', () => {
    // The chain |index.html(root) -> app.js(child0)| is the longest
    assert.isOk(insight);
    const root = insight.rootNodes[0];
    const child0 = root.children[0];
    assert.strictEqual(
        insight.maxTime, Trace.Types.Timing.Micro(child0.request.ts + child0.request.dur - root.request.ts));
  });

  it('Marks the longest network dependency chain', () => {
    assert.isOk(insight);
    const root = insight.rootNodes[0];
    const [child0, child1] = root.children;

    // The chain |index.html(root) -> app.js(child0)| is the longest
    assert.isTrue(root.isLongest);
    assert.isTrue(child0.isLongest);
    // The |app.css| is not in the longest chain
    assert.isNotTrue(child1.isLongest);
  });

  it('Store the all parents and children events for all requests', () => {
    assert.isOk(insight);
    const root = insight.rootNodes[0];
    const [child0, child1] = root.children;

    // There are three chains from Lantern:
    //   |index.html(root)|
    //   |index.html(root) -> app.js(child0)|
    //   |index.html(root) -> app.css(child1)|
    // Both child0 and child1 are related to the root
    assert.sameDeepMembers([...root.relatedRequests], [root.request, child0.request, child1.request]);
    // Only root and child0 are related to the child0
    assert.sameDeepMembers([...child0.relatedRequests], [root.request, child0.request]);
    // Only root and child1 are related to the child1
    assert.sameDeepMembers([...child1.relatedRequests], [root.request, child1.request]);
  });

  it('Fail the audit when there at least one chain with at least two requests', () => {
    assert.isOk(insight);
    assert.isTrue(insight.fail);
  });

  it('Does not fail the audit when there is only main doc request', async function() {
    // Need to load a file with only main doc in the the critical requests chains.
    const {data, insights} = await processTrace(this, 'image-delivery.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    insight = getInsightOrError('NetworkDependencyTree', insights, firstNav);

    assert.isFalse(insight.fail);
  });

  it('Calculates the relatedEvents map (event to warning map)', async function() {
    TraceLoader.setTestTimeout(this);
    // Need to load a file with longer dependency chain for this test.
    // Only those requests whose depth >= 2 will be added to the related events.
    const {data, insights} = await processTrace(this, 'web-dev-screenshot-source-ids.json.gz');
    const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
    insight = getInsightOrError('NetworkDependencyTree', insights, firstNav);

    // For NetworkDependencyTree, the relatedEvents is a map format.
    assert.isFalse(Array.isArray(insight.relatedEvents));
    const relatedEvents = insight.relatedEvents as RelatedEventsMap;

    // There are a few chains, let test the first chain
    // |web.dev -> /css -> KFO7CnqEu9…UBA.woff2|
    const root = insight.rootNodes[0];
    const child0 = root.children[0];
    const child00 = child0.children[0];

    // Root's depth is 0, so there isn't any warning message
    assert.deepEqual(relatedEvents.get(root.request), []);
    // child0's depth is 1, so there isn't any warning message
    assert.deepEqual(relatedEvents.get(child0.request), []);
    // child00's depth is 2, so there is one warning message
    assert.deepEqual(
        relatedEvents.get(child00.request), [Trace.Insights.Models.NetworkDependencyTree.UIStrings.warningDescription]);
  });
});

describe('generatePreconnectedOrigins', () => {
  describe('generatePreconnectedOriginsFromDom', () => {
    const mockParsedTrace = {
      NetworkRequests: {
        linkPreconnectEvents: [] as Trace.Types.Events.LinkPreconnect[],
        byId: new Map<string, Trace.Types.Events.SyntheticNetworkRequest>(),
      },
    } as Trace.Handlers.Types.HandlerData;

    const mockContext = {} as InsightSetContextWithNavigation;

    beforeEach(() => {
      mockParsedTrace.NetworkRequests.linkPreconnectEvents.length = 0;
    });

    it('should mark preconnect origins as not unused when they match context requests', () => {
      mockParsedTrace.NetworkRequests.linkPreconnectEvents.push({
        args: {
          data: {
            url: 'https://example.com',
            node_id: 1,
            frame: 'frame-id',
          },
        },
      } as Trace.Types.Events.LinkPreconnect);
      const mockContextRequests: Trace.Types.Events.SyntheticNetworkRequest[] = [{
        args: {
          data: {
            url: 'https://example.com/script.js',
          },
        },
      } as Trace.Types.Events.SyntheticNetworkRequest];
      const preconnectOrigins = Trace.Insights.Models.NetworkDependencyTree.generatePreconnectedOrigins(
          mockParsedTrace, mockContext, mockContextRequests, /* preconnectCandidates */[]);
      assert.deepEqual(preconnectOrigins, [{
                         node_id: 1 as Protocol.DOM.BackendNodeId,
                         frame: 'frame-id',
                         url: 'https://example.com',
                         unused: false,
                         crossorigin: false,
                         source: 'DOM'
                       }]);
    });

    it('should mark preconnect origins as unused when they do not match context requests', () => {
      mockParsedTrace.NetworkRequests.linkPreconnectEvents.push({
        args: {
          data: {
            url: 'https://example.com',
            node_id: 1,
            frame: 'frame-id',
          },
        },
      } as Trace.Types.Events.LinkPreconnect);
      const mockContextRequests: Trace.Types.Events.SyntheticNetworkRequest[] = [{
        args: {
          data: {
            url: 'https://other.com/image.png',
          },
        },
      } as Trace.Types.Events.SyntheticNetworkRequest];
      const preconnectOrigins = Trace.Insights.Models.NetworkDependencyTree.generatePreconnectedOrigins(
          mockParsedTrace, mockContext, mockContextRequests, /* preconnectCandidates */[]);
      assert.deepEqual(preconnectOrigins, [{
                         node_id: 1 as Protocol.DOM.BackendNodeId,
                         frame: 'frame-id',
                         url: 'https://example.com',
                         unused: true,
                         crossorigin: false,
                         source: 'DOM'
                       }]);
    });

    it('sets crossorigin to true when a matching preconnect candidate exists', () => {
      mockParsedTrace.NetworkRequests.linkPreconnectEvents.push({
        args: {
          data: {
            url: 'https://example.com',
            node_id: 1,
            frame: 'frame-id',
          },
        },
      } as Trace.Types.Events.LinkPreconnect);
      const mockPreconnectCandidates: Trace.Insights.Models.NetworkDependencyTree.PreconnectCandidate[] =
          [{origin: urlString`https://example.com`, wastedMs: 100 as Trace.Types.Timing.Milli}];
      const preconnectOrigins = Trace.Insights.Models.NetworkDependencyTree.generatePreconnectedOrigins(
          mockParsedTrace, mockContext, /* mockContextRequests */[],
          /* preconnectCandidates */ mockPreconnectCandidates);
      assert.deepEqual(preconnectOrigins, [{
                         node_id: 1 as Protocol.DOM.BackendNodeId,
                         frame: 'frame-id',
                         url: 'https://example.com',
                         unused: true,
                         crossorigin: true,
                         source: 'DOM'
                       }]);
    });

    it('sets crossorigin to false when no matching preconnect candidate exists', () => {
      mockParsedTrace.NetworkRequests.linkPreconnectEvents.push({
        args: {
          data: {
            url: 'https://example.com',
            node_id: 1,
            frame: 'frame-id',
          },
        },
      } as Trace.Types.Events.LinkPreconnect);
      const mockPreconnectCandidates: Trace.Insights.Models.NetworkDependencyTree.PreconnectCandidate[] =
          [{origin: urlString`https://other.com`, wastedMs: 100 as Trace.Types.Timing.Milli}];
      const preconnectOrigins = Trace.Insights.Models.NetworkDependencyTree.generatePreconnectedOrigins(
          mockParsedTrace, mockContext, /* mockContextRequests */[],
          /* preconnectCandidates */ mockPreconnectCandidates);
      assert.deepEqual(preconnectOrigins, [{
                         node_id: 1 as Protocol.DOM.BackendNodeId,
                         frame: 'frame-id',
                         url: 'https://example.com',
                         unused: true,
                         crossorigin: false,
                         source: 'DOM'
                       }]);
    });
  });

  describeWithEnvironment('PreconnectedOriginFromResponseHeader', function() {
    let insight: Trace.Insights.Types.InsightModels['NetworkDependencyTree'];
    let documentRequest: Trace.Types.Events.SyntheticNetworkRequest|undefined;

    before(async function() {
      const {data, insights} = await processTrace(this, 'preconnect-advice.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      insight = getInsightOrError('NetworkDependencyTree', insights, firstNav);
      assert.isOk(insight);
      documentRequest =
          data.NetworkRequests.byTime.find(req => req.args.data.requestId === firstNav.args.data?.navigationId);
    });

    it('correctly generate the preconnected origins', () => {
      // There are 4 preconnected origins, 3 from DOM, and 1 from response header.
      assert.isOk(insight);
      assert.lengthOf(insight.preconnectedOrigins, 4);

      // A sanity check to avoid TS error.
      assert.isDefined(documentRequest);
      const expected: PreconnectedOrigin[] = [
        {
          node_id: 57 as Protocol.DOM.BackendNodeId,
          frame: '3773BAB92FB5A26C6B03EAD6CF821791',
          url: 'https://www.youtube.com/',
          unused: true,
          crossorigin: false,
          source: 'DOM',
        },
        {
          node_id: 58 as Protocol.DOM.BackendNodeId,
          frame: '3773BAB92FB5A26C6B03EAD6CF821791',
          url: 'https://www.google.com/',
          unused: true,
          crossorigin: false,
          source: 'DOM',
        },
        {
          node_id: 59 as Protocol.DOM.BackendNodeId,
          frame: '3773BAB92FB5A26C6B03EAD6CF821791',
          url: 'http://example.com/',
          unused: true,
          crossorigin: false,
          source: 'DOM',
        },
        {
          url: 'https://example.com/',
          headerText: '<https://example.com/>; rel=preconnect',
          request: documentRequest,
          unused: true,
          crossorigin: false,
          source: 'ResponseHeader',
        },
      ];

      assert.deepEqual(insight?.preconnectedOrigins, expected);
    });
  });

  describe('handleLinkResponseHeader', () => {
    it('should return an empty array for null or empty input', () => {
      assert.deepEqual(Trace.Insights.Models.NetworkDependencyTree.handleLinkResponseHeader(''), []);
      assert.deepEqual(
          Trace.Insights.Models.NetworkDependencyTree.handleLinkResponseHeader(null as unknown as string), []);
    });

    it('should parse a valid preconnect link with quotes', () => {
      const linkHeader = '<https://example.com>; rel="preconnect"';
      const result = Trace.Insights.Models.NetworkDependencyTree.handleLinkResponseHeader(linkHeader);
      assert.deepEqual(result, [{url: 'https://example.com', headerText: '<https://example.com>; rel="preconnect"'}]);
    });

    it('should parse a valid preconnect link without quotes', () => {
      const linkHeader = '<https://example.com>; rel=preconnect';
      const result = Trace.Insights.Models.NetworkDependencyTree.handleLinkResponseHeader(linkHeader);
      assert.deepEqual(result, [{url: 'https://example.com', headerText: '<https://example.com>; rel=preconnect'}]);
    });

    it('should parse multiple preconnect links', () => {
      const linkHeader = '<https://example.com>; rel="preconnect", <https://other.com>; rel=preconnect';
      const result = Trace.Insights.Models.NetworkDependencyTree.handleLinkResponseHeader(linkHeader);
      assert.deepEqual(result, [
        {url: 'https://example.com', headerText: '<https://example.com>; rel="preconnect"'},
        {url: 'https://other.com', headerText: '<https://other.com>; rel=preconnect'},
      ]);
    });

    it('should parse a preconnect link with other parameters', () => {
      const linkHeader = '<https://example.com>; rel="preconnect"; crossorigin';
      const result = Trace.Insights.Models.NetworkDependencyTree.handleLinkResponseHeader(linkHeader);
      assert.deepEqual(
          result, [{url: 'https://example.com', headerText: '<https://example.com>; rel="preconnect"; crossorigin'}]);
    });

    it('should parse a preconnect link with comma in urls', () => {
      const linkHeader =
          '<https://imaginary.url.notreal/segment;foo=bar;baz/item?name=What,+me+worry>; rel="preconnect"';
      const result = Trace.Insights.Models.NetworkDependencyTree.handleLinkResponseHeader(linkHeader);
      assert.deepEqual(
          result, [{
            url: 'https://imaginary.url.notreal/segment;foo=bar;baz/item?name=What,+me+worry',
            headerText: '<https://imaginary.url.notreal/segment;foo=bar;baz/item?name=What,+me+worry>; rel="preconnect"'
          }]);
    });

    it('should ignore links with other rel values', () => {
      const linkHeader = '<https://example.com>; rel="preload"';
      const result = Trace.Insights.Models.NetworkDependencyTree.handleLinkResponseHeader(linkHeader);
      assert.deepEqual(result, []);
    });

    it('should ignore invalid links (missing <>)', () => {
      const linkHeader = 'https://example.com; rel="preconnect"';
      const result = Trace.Insights.Models.NetworkDependencyTree.handleLinkResponseHeader(linkHeader);
      assert.deepEqual(result, []);
    });

    it('should ignore invalid links (missing rel)', () => {
      const linkHeader = '<https://example.com>; crossorigin';
      const result = Trace.Insights.Models.NetworkDependencyTree.handleLinkResponseHeader(linkHeader);
      assert.deepEqual(result, []);
    });

    it('should handle mixed valid and invalid links', () => {
      const linkHeader =
          '<https://example.com>; rel="preconnect", https://other.com; rel=preconnect, <https://another.com>; rel="preload"';
      const result = Trace.Insights.Models.NetworkDependencyTree.handleLinkResponseHeader(linkHeader);
      assert.deepEqual(result, [{url: 'https://example.com', headerText: '<https://example.com>; rel="preconnect"'}]);
    });

    it('should not loop infinitely on a malformed link part at the end', () => {
      const linkHeader = '<https://a.com>; rel=preconnect, <https://b.com';
      const result = Trace.Insights.Models.NetworkDependencyTree.handleLinkResponseHeader(linkHeader);
      assert.deepEqual(result, [{url: 'https://a.com', headerText: '<https://a.com>; rel=preconnect'}]);
    });
  });
});

describeWithEnvironment('generatePreconnectCandidates', () => {
  const mockParsedTrace = {
    NetworkRequests: {
      incompleteInitiator: new Map<Trace.Types.Events.SyntheticNetworkRequest, Trace.Types.Events.Event>(),
      byTime: [] as Trace.Types.Events.SyntheticNetworkRequest[],
      byId: new Map<string, Trace.Types.Events.SyntheticNetworkRequest>(),
      linkPreconnectEvents: [] as Trace.Types.Events.LinkPreconnect[],
    },
    Renderer: {
      entryToNode: new Map(),
    },
    Samples: {
      entryToNode: new Map(),
    }
  } as Trace.Handlers.Types.HandlerData;

  const mockContext = {
    // This is not need to calculate the data of this insight, but is needed to check this is a context with lantern data.
    navigation: {} as Trace.Types.Events.NavigationStart,
    lantern: {
      simulator: {
        getOptions: () => ({rtt: 200, additionalRttByOrigin: new Map<string, number>()}),
      },
      metrics: {
        largestContentfulPaint: {
          pessimisticGraph: {
            traverse: (cb: (node: Trace.Lantern.Graph.Node) => void) => {
              cb({type: 'network', request: {url: 'https://example.com/script.js'}} as Trace.Lantern.Graph.Node);
              cb({type: 'network', request: {url: 'https://example.com/first.js'}} as Trace.Lantern.Graph.Node);
              cb({type: 'network', request: {url: 'https://example.com/second.js'}} as Trace.Lantern.Graph.Node);
              cb({type: 'network', request: {url: 'https://other.com/image.png'}} as Trace.Lantern.Graph.Node);
            },
          },
        },
        firstContentfulPaint: {
          pessimisticGraph: {
            traverse: (cb: (node: Trace.Lantern.Graph.Node) => void) => {
              cb({type: 'network', request: {url: 'https://example.com/script.js'}} as Trace.Lantern.Graph.Node);
            },
          },
        },
      },
    } as unknown as Trace.Insights.Types.LanternContext,
    bounds: {min: 0, max: 1000000},
    navigationId: 'main-request',
  } as InsightSetContextWithNavigation;

  const mainRequest: Trace.Types.Events.SyntheticNetworkRequest = {
    args: {
      data: {
        url: 'https://main.com',
        requestId: 'main-request',
        syntheticData: {finishTime: 1_000},
        timing: {connectEnd: 0, connectStart: 0}
      },
    },
    ts: 0,
    rawSourceEvent: {
      cat: 'devtools.timeline',
      name: 'ResourceSendRequest',
    }
  } as unknown as Trace.Types.Events.SyntheticNetworkRequest;

  const validRequest: Trace.Types.Events.SyntheticNetworkRequest = {
    args: {
      data: {
        url: 'https://example.com/script.js',
        syntheticData: {sendStartTime: 2_000},
        timing: {dnsStart: 100, dnsEnd: 200, connectStart: 300, connectEnd: 400},
      },
    },
    ts: 1500,
    rawSourceEvent: {
      cat: 'devtools.timeline',
      name: 'ResourceSendRequest',
    }
  } as unknown as Trace.Types.Events.SyntheticNetworkRequest;

  beforeEach(() => {
    mockParsedTrace.NetworkRequests.incompleteInitiator.clear();
    mockParsedTrace.NetworkRequests.byTime.length = 0;
    mockParsedTrace.NetworkRequests.byId.clear();
    mockParsedTrace.NetworkRequests.linkPreconnectEvents.length = 0;
    mockParsedTrace.NetworkRequests.byTime.push(mainRequest);
    mockParsedTrace.NetworkRequests.byId.set(mainRequest.args.data.requestId, mainRequest);
  });

  it('generates preconnect results for valid requests', () => {
    mockParsedTrace.NetworkRequests.byTime.push(validRequest);

    const preconnectCandidates = Trace.Insights.Models.NetworkDependencyTree.generatePreconnectCandidates(
        mockParsedTrace, mockContext, mockParsedTrace.NetworkRequests.byTime);
    assert.lengthOf(preconnectCandidates, 1);
    assert.strictEqual(preconnectCandidates[0].origin, 'https://example.com');
    // |validRequest->sendStartTime| - |mainRequest->finishTime| + |validRequest->dnsStart|
    assert.strictEqual(preconnectCandidates[0].wastedMs, 101);
  });

  it('generates preconnect results and sort them by wasted time', () => {
    mockParsedTrace.NetworkRequests.byTime.push(validRequest);

    const otherValidRequest: Trace.Types.Events.SyntheticNetworkRequest = JSON.parse(JSON.stringify(validRequest));
    otherValidRequest.args.data.url = 'https://other.com/image.png';
    otherValidRequest.args.data.syntheticData.sendStartTime = Trace.Types.Timing.Micro(3_000);
    mockParsedTrace.NetworkRequests.byTime.push(otherValidRequest);

    const preconnectCandidates = Trace.Insights.Models.NetworkDependencyTree.generatePreconnectCandidates(
        mockParsedTrace, mockContext, mockParsedTrace.NetworkRequests.byTime);
    assert.lengthOf(preconnectCandidates, 2);

    // other.com has a wasted time of 102 ms, while example.com has 101 ms. So other.com will be the first.
    assert.strictEqual(preconnectCandidates[0].origin, 'https://other.com');
    // |otherValidRequest->sendStartTime| - |mainRequest->finishTime| + |otherValidRequest->dnsStart|
    assert.strictEqual(preconnectCandidates[0].wastedMs, 102);

    assert.strictEqual(preconnectCandidates[1].origin, 'https://example.com');
    // |validRequest->sendStartTime| - |mainRequest->finishTime| + |validRequest->dnsStart|
    assert.strictEqual(preconnectCandidates[1].wastedMs, 101);
  });

  it('shouldn\'t suggest preconnect when requests have same origin as main request', () => {
    const sameOriginRequest: Trace.Types.Events.SyntheticNetworkRequest = JSON.parse(JSON.stringify(validRequest));
    sameOriginRequest.args.data.url = 'https://main.com/some-resource';
    mockParsedTrace.NetworkRequests.byTime.push(sameOriginRequest);

    const preconnectCandidates = Trace.Insights.Models.NetworkDependencyTree.generatePreconnectCandidates(
        mockParsedTrace, mockContext, mockParsedTrace.NetworkRequests.byTime);
    assert.lengthOf(preconnectCandidates, 0);
  });

  it('shouldn\'t suggest preconnect when initiator is main resource', () => {
    const initiatedByMainRequest: Trace.Types.Events.SyntheticNetworkRequest = JSON.parse(JSON.stringify(validRequest));
    initiatedByMainRequest.args.data.url = 'https://example.com/script.js';
    mockParsedTrace.NetworkRequests.byTime.push(initiatedByMainRequest);
    mockParsedTrace.NetworkRequests.incompleteInitiator.set(initiatedByMainRequest, mainRequest);

    const preconnectCandidates = Trace.Insights.Models.NetworkDependencyTree.generatePreconnectCandidates(
        mockParsedTrace, mockContext, mockParsedTrace.NetworkRequests.byTime);
    assert.lengthOf(preconnectCandidates, 0);
  });

  it('shouldn\'t suggest non http(s) protocols as preconnect', () => {
    const nonHttpRequest: Trace.Types.Events.SyntheticNetworkRequest = JSON.parse(JSON.stringify(validRequest));
    nonHttpRequest.args.data.url = 'data:text/plain;base64,hello';
    mockParsedTrace.NetworkRequests.byTime.push(nonHttpRequest);

    const preconnectCandidates = Trace.Insights.Models.NetworkDependencyTree.generatePreconnectCandidates(
        mockParsedTrace, mockContext, mockParsedTrace.NetworkRequests.byTime);
    assert.lengthOf(preconnectCandidates, 0);
  });

  it('shouldn\'t suggest preconnect when request has been fired after 15s', () => {
    const aboveThresholdRequest: Trace.Types.Events.SyntheticNetworkRequest = JSON.parse(JSON.stringify(validRequest));
    // sendStartTime is way above the threshold (15000ms)
    aboveThresholdRequest.args.data.syntheticData.sendStartTime = Trace.Types.Timing.Micro(20_000_000);
    mockParsedTrace.NetworkRequests.byTime.push(aboveThresholdRequest);

    const preconnectCandidates = Trace.Insights.Models.NetworkDependencyTree.generatePreconnectCandidates(
        mockParsedTrace, mockContext, mockParsedTrace.NetworkRequests.byTime);
    assert.lengthOf(preconnectCandidates, 0);
  });

  it('shouldn\'t suggest preconnect when requests are not in LCP graph', () => {
    const notInLCPRequest: Trace.Types.Events.SyntheticNetworkRequest = JSON.parse(JSON.stringify(validRequest));
    notInLCPRequest.args.data.url = 'https://not-in-lcp.com/some-resource';
    mockParsedTrace.NetworkRequests.byTime.push(notInLCPRequest);

    const preconnectCandidates = Trace.Insights.Models.NetworkDependencyTree.generatePreconnectCandidates(
        mockParsedTrace, mockContext, mockParsedTrace.NetworkRequests.byTime);
    assert.lengthOf(preconnectCandidates, 0);
  });

  it('should only list an origin once', () => {
    const firstRequest: Trace.Types.Events.SyntheticNetworkRequest = JSON.parse(JSON.stringify(validRequest));
    firstRequest.args.data.url = 'https://example.com/first.js';
    mockParsedTrace.NetworkRequests.byTime.push(firstRequest);

    const secondRequest: Trace.Types.Events.SyntheticNetworkRequest = JSON.parse(JSON.stringify(validRequest));
    secondRequest.args.data.url = 'https://example.com/second.js';
    mockParsedTrace.NetworkRequests.byTime.push(secondRequest);

    const preconnectCandidates = Trace.Insights.Models.NetworkDependencyTree.generatePreconnectCandidates(
        mockParsedTrace, mockContext, mockParsedTrace.NetworkRequests.byTime);
    assert.lengthOf(preconnectCandidates, 1);
    assert.strictEqual(preconnectCandidates[0].origin, 'https://example.com');
    // First request has a wasted time of 101 ms, while second request has 51 ms.
    // So the final waste time will be the longer one: 101 ms.
    assert.strictEqual(preconnectCandidates[0].wastedMs, 101);
  });
});
