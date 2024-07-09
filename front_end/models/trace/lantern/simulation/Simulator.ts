// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Core from '../core/core.js';
import * as Graph from '../graph/graph.js';
import type * as Lantern from '../types/types.js';

import {ConnectionPool} from './ConnectionPool.js';
import {Constants} from './Constants.js';
import {DNSCache} from './DNSCache.js';
import {type CompleteNodeTiming, type ConnectionTiming, SimulatorTimingMap} from './SimulationTimingMap.js';
import {TCPConnection} from './TCPConnection.js';

export interface Result<T = Lantern.AnyNetworkObject> {
  timeInMs: number;
  nodeTimings: Map<Graph.Node<T>, Lantern.Simulation.NodeTiming>;
}

const defaultThrottling = Constants.throttling.mobileSlow4G;

// see https://cs.chromium.org/search/?q=kDefaultMaxNumDelayableRequestsPerClient&sq=package:chromium&type=cs
const DEFAULT_MAXIMUM_CONCURRENT_REQUESTS = 10;
// layout tasks tend to be less CPU-bound and do not experience the same increase in duration
const DEFAULT_LAYOUT_TASK_MULTIPLIER = 0.5;
// if a task takes more than 10 seconds it's usually a sign it isn't actually CPU bound and we're overestimating
const DEFAULT_MAXIMUM_CPU_TASK_DURATION = 10000;

const NodeState = {
  NotReadyToStart: 0,
  ReadyToStart: 1,
  InProgress: 2,
  Complete: 3,
};

const PriorityStartTimePenalty: Record<Lantern.ResourcePriority, number> = {
  VeryHigh: 0,
  High: 0.25,
  Medium: 0.5,
  Low: 1,
  VeryLow: 2,
};

const ALL_SIMULATION_NODE_TIMINGS = new Map<string, Map<Graph.Node, CompleteNodeTiming>>();

class Simulator<T = Lantern.AnyNetworkObject> {
  static createSimulator(settings: Lantern.Simulation.Settings): Simulator {
    const {throttlingMethod, throttling, precomputedLanternData, networkAnalysis} = settings;

    const options: Lantern.Simulation.Options = {
      additionalRttByOrigin: networkAnalysis.additionalRttByOrigin,
      serverResponseTimeByOrigin: networkAnalysis.serverResponseTimeByOrigin,
      observedThroughput: networkAnalysis.throughput,
    };

    // If we have precomputed lantern data, overwrite our observed estimates and use precomputed instead
    // for increased stability.
    if (precomputedLanternData) {
      options.additionalRttByOrigin = new Map(Object.entries(precomputedLanternData.additionalRttByOrigin));
      options.serverResponseTimeByOrigin = new Map(Object.entries(precomputedLanternData.serverResponseTimeByOrigin));
    }

    switch (throttlingMethod) {
      case 'provided':
        options.rtt = networkAnalysis.rtt;
        options.throughput = networkAnalysis.throughput;
        options.cpuSlowdownMultiplier = 1;
        options.layoutTaskMultiplier = 1;
        break;
      case 'devtools':
        if (throttling) {
          options.rtt = throttling.requestLatencyMs / Constants.throttling.DEVTOOLS_RTT_ADJUSTMENT_FACTOR;
          options.throughput =
              throttling.downloadThroughputKbps * 1024 / Constants.throttling.DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR;
        }

        options.cpuSlowdownMultiplier = 1;
        options.layoutTaskMultiplier = 1;
        break;
      case 'simulate':
        if (throttling) {
          options.rtt = throttling.rttMs;
          options.throughput = throttling.throughputKbps * 1024;
          options.cpuSlowdownMultiplier = throttling.cpuSlowdownMultiplier;
        }
        break;
      default:
        // intentionally fallback to simulator defaults
        break;
    }

    return new Simulator(options);
  }

  _options: Required<Lantern.Simulation.Options>;
  _rtt: number;
  _throughput: number;
  _maximumConcurrentRequests: number;
  _cpuSlowdownMultiplier: number;
  _layoutTaskMultiplier: number;
  _cachedNodeListByStartPosition: Graph.Node[];
  _nodeTimings: SimulatorTimingMap;
  _numberInProgressByType: Map<string, number>;
  _nodes: Record<number, Set<Graph.Node>>;
  _dns: DNSCache;
  _connectionPool: ConnectionPool;

  constructor(options?: Lantern.Simulation.Options) {
    this._options = Object.assign(
        {
          rtt: defaultThrottling.rttMs,
          throughput: defaultThrottling.throughputKbps * 1024,
          maximumConcurrentRequests: DEFAULT_MAXIMUM_CONCURRENT_REQUESTS,
          cpuSlowdownMultiplier: defaultThrottling.cpuSlowdownMultiplier,
          layoutTaskMultiplier: DEFAULT_LAYOUT_TASK_MULTIPLIER,
          additionalRttByOrigin: new Map(),
          serverResponseTimeByOrigin: new Map(),
        },
        options,
    );

    this._rtt = this._options.rtt;
    this._throughput = this._options.throughput;
    this._maximumConcurrentRequests = Math.max(
        Math.min(
            TCPConnection.maximumSaturatedConnections(this._rtt, this._throughput),
            this._options.maximumConcurrentRequests,
            ),
        1);
    this._cpuSlowdownMultiplier = this._options.cpuSlowdownMultiplier;
    this._layoutTaskMultiplier = this._cpuSlowdownMultiplier * this._options.layoutTaskMultiplier;
    this._cachedNodeListByStartPosition = [];

    // Properties reset on every `.simulate` call but duplicated here for type checking
    this._nodeTimings = new SimulatorTimingMap();
    this._numberInProgressByType = new Map<string, number>();
    this._nodes = {};
    this._dns = new DNSCache({rtt: this._rtt});
    // @ts-expect-error
    this._connectionPool = null;

    if (!Number.isFinite(this._rtt)) {
      throw new Core.LanternError(`Invalid rtt ${this._rtt}`);
    }
    if (!Number.isFinite(this._throughput)) {
      throw new Core.LanternError(`Invalid rtt ${this._throughput}`);
    }
  }

  get rtt(): number {
    return this._rtt;
  }

  _initializeConnectionPool(graph: Graph.Node): void {
    const records: Lantern.NetworkRequest[] = [];
    graph.getRootNode().traverse(node => {
      if (node.type === Graph.BaseNode.types.NETWORK) {
        records.push(node.request);
      }
    });

    this._connectionPool = new ConnectionPool(records, this._options);
  }

  /**
   * Initializes the various state data structures such _nodeTimings and the _node Sets by state.
   */
  _initializeAuxiliaryData(): void {
    this._nodeTimings = new SimulatorTimingMap();
    this._numberInProgressByType = new Map();

    this._nodes = {};
    this._cachedNodeListByStartPosition = [];
    // NOTE: We don't actually need *all* of these sets, but the clarity that each node progresses
    // through the system is quite nice.
    for (const state of Object.values(NodeState)) {
      this._nodes[state] = new Set();
    }
  }

  _numberInProgress(type: string): number {
    return this._numberInProgressByType.get(type) || 0;
  }

  _markNodeAsReadyToStart(node: Graph.Node, queuedTime: number): void {
    const nodeStartPosition = Simulator._computeNodeStartPosition(node);
    const firstNodeIndexWithGreaterStartPosition = this._cachedNodeListByStartPosition.findIndex(
        candidate => Simulator._computeNodeStartPosition(candidate) > nodeStartPosition);
    const insertionIndex = firstNodeIndexWithGreaterStartPosition === -1 ? this._cachedNodeListByStartPosition.length :
                                                                           firstNodeIndexWithGreaterStartPosition;
    this._cachedNodeListByStartPosition.splice(insertionIndex, 0, node);

    this._nodes[NodeState.ReadyToStart].add(node);
    this._nodes[NodeState.NotReadyToStart].delete(node);
    this._nodeTimings.setReadyToStart(node, {queuedTime});
  }

  _markNodeAsInProgress(node: Graph.Node, startTime: number): void {
    const indexOfNodeToStart = this._cachedNodeListByStartPosition.indexOf(node);
    this._cachedNodeListByStartPosition.splice(indexOfNodeToStart, 1);

    this._nodes[NodeState.InProgress].add(node);
    this._nodes[NodeState.ReadyToStart].delete(node);
    this._numberInProgressByType.set(node.type, this._numberInProgress(node.type) + 1);
    this._nodeTimings.setInProgress(node, {startTime});
  }

  _markNodeAsComplete(node: Graph.Node, endTime: number, connectionTiming?: ConnectionTiming): void {
    this._nodes[NodeState.Complete].add(node);
    this._nodes[NodeState.InProgress].delete(node);
    this._numberInProgressByType.set(node.type, this._numberInProgress(node.type) - 1);
    this._nodeTimings.setCompleted(node, {endTime, connectionTiming});

    // Try to add all its dependents to the queue
    for (const dependent of node.getDependents()) {
      // Skip dependent node if one of its dependencies hasn't finished yet
      const dependencies = dependent.getDependencies();
      if (dependencies.some(dep => !this._nodes[NodeState.Complete].has(dep))) {
        continue;
      }

      // Otherwise add it to the queue
      this._markNodeAsReadyToStart(dependent, endTime);
    }
  }

  _acquireConnection(request: Lantern.NetworkRequest): TCPConnection|null {
    return this._connectionPool.acquire(request);
  }

  _getNodesSortedByStartPosition(): Graph.Node[] {
    // Make a copy so we don't skip nodes due to concurrent modification
    return Array.from(this._cachedNodeListByStartPosition);
  }

  _startNodeIfPossible(node: Graph.Node, totalElapsedTime: number): void {
    if (node.type === Graph.BaseNode.types.CPU) {
      // Start a CPU task if there's no other CPU task in process
      if (this._numberInProgress(node.type) === 0) {
        this._markNodeAsInProgress(node, totalElapsedTime);
      }

      return;
    }

    if (node.type !== Graph.BaseNode.types.NETWORK) {
      throw new Core.LanternError('Unsupported');
    }

    // If a network request is connectionless, we can always start it, so skip the connection checks
    if (!node.isConnectionless) {
      // Start a network request if we're not at max requests and a connection is available
      const numberOfActiveRequests = this._numberInProgress(node.type);
      if (numberOfActiveRequests >= this._maximumConcurrentRequests) {
        return;
      }
      const connection = this._acquireConnection(node.request);
      if (!connection) {
        return;
      }
    }

    this._markNodeAsInProgress(node, totalElapsedTime);
  }

  /**
   * Updates each connection in use with the available throughput based on the number of network requests
   * currently in flight.
   */
  _updateNetworkCapacity(): void {
    const inFlight = this._numberInProgress(Graph.BaseNode.types.NETWORK);
    if (inFlight === 0) {
      return;
    }

    for (const connection of this._connectionPool.connectionsInUse()) {
      connection.setThroughput(this._throughput / inFlight);
    }
  }

  /**
   * Estimates the number of milliseconds remaining given current condidtions before the node is complete.
   */
  _estimateTimeRemaining(node: Graph.Node): number {
    if (node.type === Graph.BaseNode.types.CPU) {
      return this._estimateCPUTimeRemaining(node);
    }
    if (node.type === Graph.BaseNode.types.NETWORK) {
      return this._estimateNetworkTimeRemaining(node);
    }
    throw new Core.LanternError('Unsupported');
  }

  _estimateCPUTimeRemaining(cpuNode: Graph.CPUNode): number {
    const timingData = this._nodeTimings.getCpuStarted(cpuNode);
    const multiplier = cpuNode.didPerformLayout() ? this._layoutTaskMultiplier : this._cpuSlowdownMultiplier;
    const totalDuration = Math.min(
        Math.round(cpuNode.duration / 1000 * multiplier),
        DEFAULT_MAXIMUM_CPU_TASK_DURATION,
    );
    const estimatedTimeElapsed = totalDuration - timingData.timeElapsed;
    this._nodeTimings.setCpuEstimated(cpuNode, {estimatedTimeElapsed});
    return estimatedTimeElapsed;
  }

  _estimateNetworkTimeRemaining(networkNode: Graph.NetworkNode): number {
    const request = networkNode.request;
    const timingData = this._nodeTimings.getNetworkStarted(networkNode);

    let timeElapsed = 0;
    if (networkNode.fromDiskCache) {
      // Rough access time for seeking to location on disk and reading sequentially.
      // 8ms per seek + 20ms/MB
      // @see http://norvig.com/21-days.html#answers
      const sizeInMb = (request.resourceSize || 0) / 1024 / 1024;
      timeElapsed = 8 + 20 * sizeInMb - timingData.timeElapsed;
    } else if (networkNode.isNonNetworkProtocol) {
      // Estimates for the overhead of a data URL in Chromium and the decoding time for base64-encoded data.
      // 2ms per request + 10ms/MB
      // @see traces on https://dopiaza.org/tools/datauri/examples/index.php
      const sizeInMb = (request.resourceSize || 0) / 1024 / 1024;
      timeElapsed = 2 + 10 * sizeInMb - timingData.timeElapsed;
    } else {
      const connection = this._connectionPool.acquireActiveConnectionFromRequest(request);
      const dnsResolutionTime = this._dns.getTimeUntilResolution(request, {
        requestedAt: timingData.startTime,
        shouldUpdateCache: true,
      });
      const timeAlreadyElapsed = timingData.timeElapsed;
      const calculation = connection.simulateDownloadUntil(
          request.transferSize - timingData.bytesDownloaded,
          {timeAlreadyElapsed, dnsResolutionTime, maximumTimeToElapse: Infinity},
      );

      timeElapsed = calculation.timeElapsed;
    }

    const estimatedTimeElapsed = timeElapsed + timingData.timeElapsedOvershoot;
    this._nodeTimings.setNetworkEstimated(networkNode, {estimatedTimeElapsed});
    return estimatedTimeElapsed;
  }

  /**
   * Computes and returns the minimum estimated completion time of the nodes currently in progress.
   */
  _findNextNodeCompletionTime(): number {
    let minimumTime = Infinity;
    for (const node of this._nodes[NodeState.InProgress]) {
      minimumTime = Math.min(minimumTime, this._estimateTimeRemaining(node));
    }

    return minimumTime;
  }

  /**
   * Given a time period, computes the progress toward completion that the node made durin that time.
   */
  _updateProgressMadeInTimePeriod(node: Graph.Node, timePeriodLength: number, totalElapsedTime: number): void {
    const timingData = this._nodeTimings.getInProgress(node);
    const isFinished = timingData.estimatedTimeElapsed === timePeriodLength;

    if (node.type === Graph.BaseNode.types.CPU || node.isConnectionless) {
      if (isFinished) {
        this._markNodeAsComplete(node, totalElapsedTime);
      } else {
        timingData.timeElapsed += timePeriodLength;
      }
      return;
    }

    if (node.type !== Graph.BaseNode.types.NETWORK) {
      throw new Core.LanternError('Unsupported');
    }
    if (!('bytesDownloaded' in timingData)) {
      throw new Core.LanternError('Invalid timing data');
    }

    const request = node.request;
    const connection = this._connectionPool.acquireActiveConnectionFromRequest(request);
    const dnsResolutionTime = this._dns.getTimeUntilResolution(request, {
      requestedAt: timingData.startTime,
      shouldUpdateCache: true,
    });
    const calculation = connection.simulateDownloadUntil(
        request.transferSize - timingData.bytesDownloaded,
        {
          dnsResolutionTime,
          timeAlreadyElapsed: timingData.timeElapsed,
          maximumTimeToElapse: timePeriodLength - timingData.timeElapsedOvershoot,
        },
    );

    connection.setCongestionWindow(calculation.congestionWindow);
    connection.setH2OverflowBytesDownloaded(calculation.extraBytesDownloaded);

    if (isFinished) {
      connection.setWarmed(true);
      this._connectionPool.release(request);
      this._markNodeAsComplete(node, totalElapsedTime, calculation.connectionTiming);
    } else {
      timingData.timeElapsed += calculation.timeElapsed;
      timingData.timeElapsedOvershoot += calculation.timeElapsed - timePeriodLength;
      timingData.bytesDownloaded += calculation.bytesDownloaded;
    }
  }

  _computeFinalNodeTimings(): {
    nodeTimings: Map<Graph.Node, Lantern.Simulation.NodeTiming>,
    completeNodeTimings: Map<Graph.Node, CompleteNodeTiming>,
  } {
    const completeNodeTimingEntries: Array<[Graph.Node, CompleteNodeTiming]> =
        this._nodeTimings.getNodes().map(node => {
          return [node, this._nodeTimings.getCompleted(node)];
        });

    // Most consumers will want the entries sorted by startTime, so insert them in that order
    completeNodeTimingEntries.sort((a, b) => a[1].startTime - b[1].startTime);

    // Trimmed version of type `Lantern.Simulation.NodeTiming`.
    const nodeTimingEntries: Array<[Graph.Node, Lantern.Simulation.NodeTiming]> =
        completeNodeTimingEntries.map(([node, timing]) => {
          return [
            node,
            {
              startTime: timing.startTime,
              endTime: timing.endTime,
              duration: timing.endTime - timing.startTime,
            },
          ];
        });

    return {
      nodeTimings: new Map(nodeTimingEntries),
      completeNodeTimings: new Map(completeNodeTimingEntries),
    };
  }

  getOptions(): Required<Lantern.Simulation.Options> {
    return this._options;
  }

  /**
   * Estimates the time taken to process all of the graph's nodes, returns the overall time along with
   * each node annotated by start/end times.
   *
   * Simulator/connection pool are allowed to deviate from what was
   * observed in the trace/devtoolsLog and start requests as soon as they are queued (i.e. do not
   * wait around for a warm connection to be available if the original request was fetched on a warm
   * connection).
   */
  simulate(graph: Graph.Node, options?: {label?: string}): Result<T> {
    if (Graph.BaseNode.hasCycle(graph)) {
      throw new Core.LanternError('Cannot simulate graph with cycle');
    }

    options = Object.assign(
        {
          label: undefined,
        },
        options);

    // initialize the necessary data containers
    this._dns = new DNSCache({rtt: this._rtt});
    this._initializeConnectionPool(graph);
    this._initializeAuxiliaryData();

    const nodesNotReadyToStart = this._nodes[NodeState.NotReadyToStart];
    const nodesReadyToStart = this._nodes[NodeState.ReadyToStart];
    const nodesInProgress = this._nodes[NodeState.InProgress];

    const rootNode = graph.getRootNode();
    rootNode.traverse(node => nodesNotReadyToStart.add(node));
    let totalElapsedTime = 0;
    let iteration = 0;

    // root node is always ready to start
    this._markNodeAsReadyToStart(rootNode, totalElapsedTime);

    // loop as long as we have nodes in the queue or currently in progress
    while (nodesReadyToStart.size || nodesInProgress.size) {
      // move all possible queued nodes to in progress
      for (const node of this._getNodesSortedByStartPosition()) {
        this._startNodeIfPossible(node, totalElapsedTime);
      }

      if (!nodesInProgress.size) {
        // Interplay between fromDiskCache and connectionReused can be incorrect,
        // have to give up.
        throw new Core.LanternError('Failed to start a node');
      }

      // set the available throughput for all connections based on # inflight
      this._updateNetworkCapacity();

      // find the time that the next node will finish
      const minimumTime = this._findNextNodeCompletionTime();
      totalElapsedTime += minimumTime;

      // While this is no longer strictly necessary, it's always better than hanging
      if (!Number.isFinite(minimumTime) || iteration > 100000) {
        throw new Core.LanternError('Simulation failed, depth exceeded');
      }

      iteration++;
      // update how far each node will progress until that point
      for (const node of nodesInProgress) {
        this._updateProgressMadeInTimePeriod(node, minimumTime, totalElapsedTime);
      }
    }

    // `nodeTimings` are used for simulator consumers, `completeNodeTimings` kept for debugging.
    const {nodeTimings, completeNodeTimings} = this._computeFinalNodeTimings();
    ALL_SIMULATION_NODE_TIMINGS.set(options.label || 'unlabeled', completeNodeTimings);

    return {
      timeInMs: totalElapsedTime,
      nodeTimings,
    };
  }

  computeWastedMsFromWastedBytes(wastedBytes: number): number {
    const {throughput, observedThroughput} = this._options;

    // https://github.com/GoogleChrome/lighthouse/pull/13323#issuecomment-962031709
    // 0 throughput means the no (additional) throttling is expected.
    // This is common for desktop + devtools throttling where throttling is additive and we don't want any additional.
    const bitsPerSecond = throughput === 0 ? observedThroughput : throughput;
    if (bitsPerSecond === 0) {
      return 0;
    }

    const wastedBits = wastedBytes * 8;
    const wastedMs = wastedBits / bitsPerSecond * 1000;

    // This is an estimate of wasted time, so we won't be more precise than 10ms.
    return Math.round(wastedMs / 10) * 10;
  }

  static get allNodeTimings(): Map<string, Map<Graph.Node, CompleteNodeTiming>> {
    return ALL_SIMULATION_NODE_TIMINGS;
  }

  /**
   * We attempt to start nodes by their observed start time using the request priority as a tie breaker.
   * When simulating, just because a low priority image started 5ms before a high priority image doesn't mean
   * it would have happened like that when the network was slower.
   */
  static _computeNodeStartPosition(node: Graph.Node): number {
    if (node.type === 'cpu') {
      return node.startTime;
    }
    return node.startTime + (PriorityStartTimePenalty[node.request.priority] * 1000 * 1000 || 0);
  }
}

export {Simulator};
