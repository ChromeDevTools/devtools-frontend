// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../../generated/protocol.js';
import {TraceLoader} from '../../../../testing/TraceLoader.js';
import * as Trace from '../../trace.js';
import * as Lantern from '../lantern.js';
import {runTrace, toLanternTrace} from '../testing/testing.js';

const {NetworkNode, CPUNode} = Lantern.Graph;
const {Simulator, DNSCache} = Lantern.Simulation;

let nextRequestId = 1;
let nextTid = 1;

async function createGraph(trace: Lantern.Types.Trace) {
  const parsedTrace = await runTrace(trace);
  const requests = Trace.LanternComputationData.createNetworkRequests(trace, parsedTrace);
  return Trace.LanternComputationData.createGraph(requests, trace, parsedTrace);
}

interface FakeRequestOpts {
  startTime?: number;
  endTime?: number;
  requestId?: number;
  transferSize?: number;
  scheme?: number;
  timing?: Protocol.Network.ResourceTiming;
  fromDiskCache?: boolean;
  url?: string;
  parsedURL?: {scheme?: string, host?: string, securityOrigin?: string};
  protocol?: string;
  networkRequestTime?: number;
  connectionId?: number;
  priority?: Lantern.Types.ResourcePriority;
  resourceSize?: number;
}
// Instantiating a Simulator instance requires this value, but it isn't really
// needed for the sake of these tests, so we hardcode a reasonable value here
// to use throughout.
const observedThroughput = 240000;

function request(opts: FakeRequestOpts): Lantern.Types.NetworkRequest {
  const scheme = opts.scheme || 'http';
  const url = `${scheme}://example.com`;
  const rendererStartTime = opts.startTime ?? 0;
  const networkEndTime = opts.endTime ?? 0;
  delete opts.startTime;
  delete opts.endTime;

  return Object.assign(
             {
               requestId: opts.requestId || nextRequestId++,
               url,
               transferSize: opts.transferSize || 1000,
               protocol: scheme,
               parsedURL: {scheme, host: 'example.com', securityOrigin: url},
               timing: opts.timing,
               rendererStartTime,
               networkEndTime,
             },
             opts) as unknown as Lantern.Types.NetworkRequest;
}

function cpuTask({tid, ts, duration}: {
  tid?: number,
  ts?: number,
  duration?: number,
}): Trace.Lantern.Types.TraceEvent {
  tid = tid || nextTid++;
  ts = ts || 0;
  const dur = ((duration || 0) * 1000) / 5;
  return {tid, ts, dur} as Trace.Lantern.Types.TraceEvent;
}

describe('DependencyGraph/Simulator', () => {
  // Insulate the simulator tests from DNS multiplier changes
  let originalDNSMultiplier = 1;
  let trace: Lantern.Types.Trace;

  before(async function() {
    trace = toLanternTrace(await TraceLoader.rawEvents(this, 'lantern/progressive-app/trace.json.gz'));
    originalDNSMultiplier = DNSCache.rttMultiplier;
    DNSCache.rttMultiplier = 1;
  });

  after(() => {
    DNSCache.rttMultiplier = originalDNSMultiplier;
  });

  describe('.simulate', () => {
    const serverResponseTimeByOrigin = new Map([['http://example.com', 500]]);

    function assertNodeTiming(
        result: Lantern.Simulation.Result, node: Lantern.Graph.NetworkNode|Lantern.Graph.CPUNode,
        assertions: Partial<Trace.Lantern.Types.Simulation.NodeTiming>) {
      const timing = result.nodeTimings.get(node);
      assert.isOk(timing, 'missing node timing information');
      Object.keys(assertions).forEach(k => {
        const key = k as keyof Trace.Lantern.Types.Simulation.NodeTiming;
        assert.strictEqual(timing[key], assertions[key]);
      });
    }

    it('should simulate basic network graphs', () => {
      const rootNode = new NetworkNode(request({}));
      const simulator = new Simulator({serverResponseTimeByOrigin, observedThroughput: 1});
      const result = simulator.simulate(rootNode);
      // should be 3 RTTs and 500ms for the server response time
      assert.strictEqual(result.timeInMs, 450 + 500);
      assertNodeTiming(result, rootNode, {startTime: 0, endTime: 950});
    });

    it('should simulate basic mixed graphs', () => {
      const rootNode = new NetworkNode(request({}));
      const cpuNode = new CPUNode(cpuTask({duration: 200}));
      cpuNode.addDependency(rootNode);

      const simulator = new Simulator({
        serverResponseTimeByOrigin,
        cpuSlowdownMultiplier: 5,
        observedThroughput: 1,
      });
      const result = simulator.simulate(rootNode);
      // should be 3 RTTs and 500ms for the server response time + 200 CPU
      assert.strictEqual(result.timeInMs, 450 + 500 + 200);
      assertNodeTiming(result, rootNode, {startTime: 0, endTime: 950});
      assertNodeTiming(result, cpuNode, {startTime: 950, endTime: 1150});
    });

    it('should simulate basic network waterfall graphs', () => {
      const nodeA = new NetworkNode(request({startTime: 0, endTime: 1}));
      const nodeB = new NetworkNode(request({startTime: 0, endTime: 3}));
      const nodeC = new NetworkNode(request({startTime: 0, endTime: 5}));
      const nodeD = new NetworkNode(request({startTime: 0, endTime: 7}));

      nodeA.addDependent(nodeB);
      nodeB.addDependent(nodeC);
      nodeC.addDependent(nodeD);

      const simulator = new Simulator({serverResponseTimeByOrigin, observedThroughput: 1});
      const result = simulator.simulate(nodeA);
      // should be 950ms for A, 650ms each for B, C, D (no DNS and one-way connection)
      assert.strictEqual(result.timeInMs, 2900);
      assertNodeTiming(result, nodeA, {startTime: 0, endTime: 950});
      assertNodeTiming(result, nodeB, {startTime: 950, endTime: 1600});
      assertNodeTiming(result, nodeC, {startTime: 1600, endTime: 2250});
      assertNodeTiming(result, nodeD, {startTime: 2250, endTime: 2900});
    });

    it('should simulate cached network graphs', () => {
      const nodeA = new NetworkNode(request({startTime: 0, endTime: 1, fromDiskCache: true}));
      const nodeB = new NetworkNode(request({startTime: 0, endTime: 3, fromDiskCache: true}));
      nodeA.addDependent(nodeB);

      const simulator = new Simulator({serverResponseTimeByOrigin, observedThroughput: 1});
      const result = simulator.simulate(nodeA);
      // should be ~8ms each for A, B
      assert.strictEqual(result.timeInMs, 16);
      assertNodeTiming(result, nodeA, {startTime: 0, endTime: 8});
      assertNodeTiming(result, nodeB, {startTime: 8, endTime: 16});
    });

    it('should simulate data URL network graphs', () => {
      const url = 'data:image/jpeg;base64,foobar';
      const protocol = 'data';
      const parsedURL = {scheme: 'data', host: '', securityOrigin: 'null'};
      const nodeA = new NetworkNode(request({startTime: 0, endTime: 1, url, parsedURL, protocol}));
      const nodeB =
          new NetworkNode(request({startTime: 0, endTime: 3, url, parsedURL, protocol, resourceSize: 1024 * 1024}));
      nodeA.addDependent(nodeB);

      const simulator = new Simulator({serverResponseTimeByOrigin, observedThroughput: 1});
      const result = simulator.simulate(nodeA);

      // should be ~2ms for A (resourceSize 0), ~12ms for B (resourceSize 1MB)
      assert.strictEqual(result.timeInMs, 14);
      assertNodeTiming(result, nodeA, {startTime: 0, endTime: 2});
      assertNodeTiming(result, nodeB, {startTime: 2, endTime: 14});
    });

    it('should simulate basic CPU queue graphs', () => {
      const nodeA = new NetworkNode(request({}));
      const nodeB = new CPUNode(cpuTask({duration: 100}));
      const nodeC = new CPUNode(cpuTask({duration: 600}));
      const nodeD = new CPUNode(cpuTask({duration: 300}));

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeD);

      const simulator = new Simulator({
        serverResponseTimeByOrigin,
        cpuSlowdownMultiplier: 5,
        observedThroughput: 1,
      });
      const result = simulator.simulate(nodeA);
      // should be 800ms A, then 1000 ms total for B, C, D in serial
      assert.strictEqual(result.timeInMs, 1950);
      assertNodeTiming(result, nodeA, {startTime: 0, endTime: 950});
      assertNodeTiming(result, nodeB, {startTime: 950, endTime: 1050});
      assertNodeTiming(result, nodeC, {startTime: 1050, endTime: 1650});
      assertNodeTiming(result, nodeD, {startTime: 1650, endTime: 1950});
    });

    it('should simulate basic network waterfall graphs with CPU', () => {
      const nodeA = new NetworkNode(request({}));
      const nodeB = new NetworkNode(request({}));
      const nodeC = new NetworkNode(request({}));
      const nodeD = new NetworkNode(request({}));
      const nodeE = new CPUNode(cpuTask({duration: 1000}));
      const nodeF = new CPUNode(cpuTask({duration: 1000}));

      nodeA.addDependent(nodeB);
      nodeB.addDependent(nodeC);
      nodeB.addDependent(nodeE);  // finishes 350 ms after C
      nodeC.addDependent(nodeD);
      nodeC.addDependent(nodeF);  // finishes 700 ms after D

      const simulator = new Simulator({
        serverResponseTimeByOrigin,
        cpuSlowdownMultiplier: 5,
        observedThroughput: 1,
      });
      const result = simulator.simulate(nodeA);
      // should be 950ms for A, 650ms each for B, C, D, with F finishing 700 ms after D
      assert.strictEqual(result.timeInMs, 3600);
    });

    it('should simulate basic parallel requests', () => {
      const nodeA = new NetworkNode(request({}));
      const nodeB = new NetworkNode(request({}));
      const nodeC = new NetworkNode(request({transferSize: 15000}));
      const nodeD = new NetworkNode(request({}));

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeD);

      const simulator = new Simulator({serverResponseTimeByOrigin, observedThroughput: 1});
      const result = simulator.simulate(nodeA);
      // should be 950ms for A and 950ms for C (2 round trips of downloading, but no DNS)
      assert.strictEqual(result.timeInMs, 950 + 950);
    });

    it('should make connections in parallel', () => {
      const nodeA = new NetworkNode(request({startTime: 0, networkRequestTime: 0, endTime: 1}));
      const nodeB = new NetworkNode(request({startTime: 2, networkRequestTime: 2, endTime: 3}));
      const nodeC = new NetworkNode(request({startTime: 2, networkRequestTime: 2, endTime: 5}));
      const nodeD = new NetworkNode(request({startTime: 2, networkRequestTime: 2, endTime: 7}));

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeD);

      const simulator = new Simulator({serverResponseTimeByOrigin, observedThroughput: 1});
      const result = simulator.simulate(nodeA);
      // should be 950ms for A, 650ms for B reusing connection, 800ms for C and D in parallel.
      assert.strictEqual(result.timeInMs, 950 + 800);
      assertNodeTiming(result, nodeA, {startTime: 0, endTime: 950});
      assertNodeTiming(result, nodeB, {startTime: 950, endTime: 1600});
      assertNodeTiming(result, nodeC, {startTime: 950, endTime: 1750});
      assertNodeTiming(result, nodeD, {startTime: 950, endTime: 1750});
    });

    it('should adjust throughput based on number of requests', () => {
      const nodeA = new NetworkNode(request({}));
      const nodeB = new NetworkNode(request({}));
      const nodeC = new NetworkNode(request({transferSize: 14000}));
      const nodeD = new NetworkNode(request({}));

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeD);

      // 80 kbps while all 3 download at 150ms/RT = ~1460 bytes/RT
      // 240 kbps while the last one finishes at 150ms/RT = ~4380 bytes/RT
      // ~14000 bytes = 5 RTs
      // 1 RT 80 kbps b/c its shared
      // 1 RT 80 kbps b/c it needs to grow congestion window from being shared
      // 1 RT 160 kbps b/c TCP
      // 2 RT 240 kbps b/c throughput cap
      const simulator = new Simulator({serverResponseTimeByOrigin, throughput: 240000, observedThroughput: 240000});
      const result = simulator.simulate(nodeA);
      // should be 950ms for A and 1400ms for C (5 round trips of downloading)
      assert.strictEqual(result.timeInMs, 950 + (150 + 750 + 500));
    });

    it('should start network requests in startTime order', () => {
      const rootNode = new NetworkNode(request({startTime: 0, endTime: 0.05, connectionId: 1}));
      const imageNodes = [
        new NetworkNode(request({startTime: 5})),
        new NetworkNode(request({startTime: 4})),
        new NetworkNode(request({startTime: 3})),
        new NetworkNode(request({startTime: 2})),
        new NetworkNode(request({startTime: 1})),
      ];

      for (const imageNode of imageNodes) {
        imageNode.request.connectionReused = true;
        imageNode.request.connectionId = 1;
        rootNode.addDependent(imageNode);
      }

      const simulator =
          new Simulator({serverResponseTimeByOrigin, maximumConcurrentRequests: 1, observedThroughput: 1});
      const result = simulator.simulate(rootNode);

      // should be 3 RTs + SRT for rootNode (950ms)
      // should be 1 RT  + SRT for image nodes in observed order (650ms)
      assertNodeTiming(result, rootNode, {startTime: 0, endTime: 950});
      assertNodeTiming(result, imageNodes[4], {startTime: 950, endTime: 1600});
      assertNodeTiming(result, imageNodes[3], {startTime: 1600, endTime: 2250});
      assertNodeTiming(result, imageNodes[2], {startTime: 2250, endTime: 2900});
      assertNodeTiming(result, imageNodes[1], {startTime: 2900, endTime: 3550});
      assertNodeTiming(result, imageNodes[0], {startTime: 3550, endTime: 4200});
    });

    it('should start network requests in priority order to break startTime ties', () => {
      const rootNode = new NetworkNode(request({startTime: 0, endTime: 0.05, connectionId: 1}));
      const imageNodes = [
        new NetworkNode(request({startTime: 0.1, priority: 'VeryLow'})),
        new NetworkNode(request({startTime: 0.2, priority: 'Low'})),
        new NetworkNode(request({startTime: 0.3, priority: 'Medium'})),
        new NetworkNode(request({startTime: 0.4, priority: 'High'})),
        new NetworkNode(request({startTime: 0.5, priority: 'VeryHigh'})),
      ];

      for (const imageNode of imageNodes) {
        imageNode.request.connectionReused = true;
        imageNode.request.connectionId = 1;
        rootNode.addDependent(imageNode);
      }

      const simulator = new Simulator({serverResponseTimeByOrigin, maximumConcurrentRequests: 1, observedThroughput});
      const result = simulator.simulate(rootNode);

      // should be 3 RTs + SRT for rootNode (950ms)
      // should be 1 RT  + SRT for image nodes in priority order (650ms)
      assertNodeTiming(result, rootNode, {startTime: 0, endTime: 950});
      assertNodeTiming(result, imageNodes[4], {startTime: 950, endTime: 1600});
      assertNodeTiming(result, imageNodes[3], {startTime: 1600, endTime: 2250});
      assertNodeTiming(result, imageNodes[2], {startTime: 2250, endTime: 2900});
      assertNodeTiming(result, imageNodes[1], {startTime: 2900, endTime: 3550});
      assertNodeTiming(result, imageNodes[0], {startTime: 3550, endTime: 4200});
    });

    it('should simulate two graphs in a row', () => {
      const simulator = new Simulator({serverResponseTimeByOrigin, observedThroughput});

      const nodeA = new NetworkNode(request({}));
      const nodeB = new NetworkNode(request({}));
      const nodeC = new NetworkNode(request({transferSize: 15000}));
      const nodeD = new NetworkNode(request({}));

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeD);

      const resultA = simulator.simulate(nodeA);
      // should be 950ms for A and 950ms for C (2 round trips of downloading, no DNS)
      assert.strictEqual(resultA.timeInMs, 950 + 950);

      const nodeE = new NetworkNode(request({}));
      const nodeF = new NetworkNode(request({}));
      const nodeG = new NetworkNode(request({}));

      nodeE.addDependent(nodeF);
      nodeE.addDependent(nodeG);

      const resultB = simulator.simulate(nodeE);
      // should be 950ms for E and 800ms for F/G
      assert.strictEqual(resultB.timeInMs, 950 + 800);
    });

    it('should maximize throughput with H2', () => {
      const simulator = new Simulator({serverResponseTimeByOrigin, observedThroughput});
      const connectionDefaults = {protocol: 'h2', connectionId: 1};
      const nodeA = new NetworkNode(request({startTime: 0, endTime: 1, ...connectionDefaults}));
      const nodeB = new NetworkNode(request({startTime: 1, endTime: 2, ...connectionDefaults}));
      const nodeC = new NetworkNode(request({startTime: 2, endTime: 3, ...connectionDefaults}));
      const nodeD = new NetworkNode(request({startTime: 3, endTime: 4, ...connectionDefaults}));

      nodeA.addDependent(nodeB);
      nodeB.addDependent(nodeC);
      nodeB.addDependent(nodeD);

      // Run two simulations:
      //  - The first with C & D in parallel.
      //  - The second with C & D in series.
      // Under HTTP/2 simulation these should be equivalent, but definitely parallel
      // shouldn't be slower.
      const resultA = simulator.simulate(nodeA);
      nodeC.addDependent(nodeD);
      const resultB = simulator.simulate(nodeA);
      expect(resultA.timeInMs).to.be.lessThanOrEqual(resultB.timeInMs);
    });

    it('should throw (not hang) on graphs with cycles', () => {
      const rootNode = new NetworkNode(request({}));
      const depNode = new NetworkNode(request({}));
      rootNode.addDependency(depNode);
      depNode.addDependency(rootNode);

      const simulator = new Simulator({serverResponseTimeByOrigin, observedThroughput});
      assert.throws(() => simulator.simulate(rootNode), /cycle/);
    });

    describe('on a real trace', function() {
      TraceLoader.setTestTimeout(this);

      it('should compute a timeInMs', async function() {
        const graph = await createGraph(trace);
        const simulator = new Simulator({serverResponseTimeByOrigin, observedThroughput});
        const result = simulator.simulate(graph);
        expect(result.timeInMs).to.be.greaterThan(100);
      });

      it('should sort the task event times', async () => {
        const graph = await createGraph(trace);
        const simulator = new Simulator({serverResponseTimeByOrigin, observedThroughput});
        const result = simulator.simulate(graph);
        const nodeTimings = Array.from(result.nodeTimings.entries());

        for (let i = 1; i < nodeTimings.length; i++) {
          const startTime = nodeTimings[i][1].startTime;
          const previousStartTime = nodeTimings[i - 1][1].startTime;
          expect(startTime).to.be.greaterThanOrEqual(previousStartTime);
        }
      });
    });
  });

  describe('.simulateTimespan', () => {
    it('calculates savings using throughput', () => {
      const simulator = new Simulator({throughput: 1000, observedThroughput: 2000});
      const wastedMs = simulator.computeWastedMsFromWastedBytes(500);
      expect(wastedMs).to.be.closeTo(4000, 0.1);
    });

    it('falls back to observed throughput if throughput is 0', () => {
      const simulator = new Simulator({throughput: 0, observedThroughput: 2000});
      const wastedMs = simulator.computeWastedMsFromWastedBytes(500);
      expect(wastedMs).to.be.closeTo(2000, 0.1);
    });

    it('returns 0 if throughput and observed throughput are 0', () => {
      const simulator = new Simulator({throughput: 0, observedThroughput: 0});
      const wastedMs = simulator.computeWastedMsFromWastedBytes(500);
      expect(wastedMs).to.equal(0);
    });
  });
});
