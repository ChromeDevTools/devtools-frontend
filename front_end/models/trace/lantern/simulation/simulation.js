// gen/front_end/models/trace/lantern/simulation/ConnectionPool.js
import * as Core from "./../core/core.js";

// gen/front_end/models/trace/lantern/simulation/TCPConnection.js
var INITIAL_CONGESTION_WINDOW = 10;
var TCP_SEGMENT_SIZE = 1460;
var TCPConnection = class _TCPConnection {
  warmed;
  ssl;
  h2;
  rtt;
  throughput;
  serverLatency;
  _congestionWindow;
  h2OverflowBytesDownloaded;
  constructor(rtt, throughput, serverLatency = 0, ssl = true, h2 = false) {
    this.warmed = false;
    this.ssl = ssl;
    this.h2 = h2;
    this.rtt = rtt;
    this.throughput = throughput;
    this.serverLatency = serverLatency;
    this._congestionWindow = INITIAL_CONGESTION_WINDOW;
    this.h2OverflowBytesDownloaded = 0;
  }
  static maximumSaturatedConnections(rtt, availableThroughput) {
    const roundTripsPerSecond = 1e3 / rtt;
    const bytesPerRoundTrip = TCP_SEGMENT_SIZE;
    const bytesPerSecond = roundTripsPerSecond * bytesPerRoundTrip;
    const minimumThroughputRequiredPerRequest = bytesPerSecond * 8;
    return Math.floor(availableThroughput / minimumThroughputRequiredPerRequest);
  }
  computeMaximumCongestionWindowInSegments() {
    const bytesPerSecond = this.throughput / 8;
    const secondsPerRoundTrip = this.rtt / 1e3;
    const bytesPerRoundTrip = bytesPerSecond * secondsPerRoundTrip;
    return Math.floor(bytesPerRoundTrip / TCP_SEGMENT_SIZE);
  }
  setThroughput(throughput) {
    this.throughput = throughput;
  }
  setCongestionWindow(congestion) {
    this._congestionWindow = congestion;
  }
  setWarmed(warmed) {
    this.warmed = warmed;
  }
  isH2() {
    return this.h2;
  }
  get congestionWindow() {
    return this._congestionWindow;
  }
  /**
   * Sets the number of excess bytes that are available to this connection on future downloads, only
   * applies to H2 connections.
   */
  setH2OverflowBytesDownloaded(bytes) {
    if (!this.h2) {
      return;
    }
    this.h2OverflowBytesDownloaded = bytes;
  }
  clone() {
    return Object.assign(new _TCPConnection(this.rtt, this.throughput), this);
  }
  /**
   * Simulates a network download of a particular number of bytes over an optional maximum amount of time
   * and returns information about the ending state.
   *
   * See https://hpbn.co/building-blocks-of-tcp/#three-way-handshake and
   *  https://hpbn.co/transport-layer-security-tls/#tls-handshake for details.
   */
  simulateDownloadUntil(bytesToDownload, options) {
    const { timeAlreadyElapsed = 0, maximumTimeToElapse = Infinity, dnsResolutionTime = 0 } = options || {};
    if (this.warmed && this.h2) {
      bytesToDownload -= this.h2OverflowBytesDownloaded;
    }
    const twoWayLatency = this.rtt;
    const oneWayLatency = twoWayLatency / 2;
    const maximumCongestionWindow = this.computeMaximumCongestionWindowInSegments();
    let handshakeAndRequest = oneWayLatency;
    if (!this.warmed) {
      handshakeAndRequest = // DNS lookup
      dnsResolutionTime + // SYN
      oneWayLatency + // SYN ACK
      oneWayLatency + // ACK + initial request
      oneWayLatency + // ClientHello/ServerHello assuming TLS False Start is enabled (https://istlsfastyet.com/#server-performance).
      (this.ssl ? twoWayLatency : 0);
    }
    let roundTrips = Math.ceil(handshakeAndRequest / twoWayLatency);
    let timeToFirstByte = handshakeAndRequest + this.serverLatency + oneWayLatency;
    if (this.warmed && this.h2) {
      timeToFirstByte = 0;
    }
    const timeElapsedForTTFB = Math.max(timeToFirstByte - timeAlreadyElapsed, 0);
    const maximumDownloadTimeToElapse = maximumTimeToElapse - timeElapsedForTTFB;
    let congestionWindow = Math.min(this._congestionWindow, maximumCongestionWindow);
    let totalBytesDownloaded = 0;
    if (timeElapsedForTTFB > 0) {
      totalBytesDownloaded = congestionWindow * TCP_SEGMENT_SIZE;
    } else {
      roundTrips = 0;
    }
    let downloadTimeElapsed = 0;
    let bytesRemaining = bytesToDownload - totalBytesDownloaded;
    while (bytesRemaining > 0 && downloadTimeElapsed <= maximumDownloadTimeToElapse) {
      roundTrips++;
      downloadTimeElapsed += twoWayLatency;
      congestionWindow = Math.max(Math.min(maximumCongestionWindow, congestionWindow * 2), 1);
      const bytesDownloadedInWindow = congestionWindow * TCP_SEGMENT_SIZE;
      totalBytesDownloaded += bytesDownloadedInWindow;
      bytesRemaining -= bytesDownloadedInWindow;
    }
    const timeElapsed = timeElapsedForTTFB + downloadTimeElapsed;
    const extraBytesDownloaded = this.h2 ? Math.max(totalBytesDownloaded - bytesToDownload, 0) : 0;
    const bytesDownloaded = Math.max(Math.min(totalBytesDownloaded, bytesToDownload), 0);
    let connectionTiming;
    if (!this.warmed) {
      connectionTiming = {
        dnsResolutionTime,
        connectionTime: handshakeAndRequest - dnsResolutionTime,
        sslTime: this.ssl ? twoWayLatency : void 0,
        timeToFirstByte
      };
    } else if (this.h2) {
      connectionTiming = {
        timeToFirstByte
      };
    } else {
      connectionTiming = {
        connectionTime: handshakeAndRequest,
        timeToFirstByte
      };
    }
    return {
      roundTrips,
      timeElapsed,
      bytesDownloaded,
      extraBytesDownloaded,
      congestionWindow,
      connectionTiming
    };
  }
};

// gen/front_end/models/trace/lantern/simulation/ConnectionPool.js
var DEFAULT_SERVER_RESPONSE_TIME = 30;
var TLS_SCHEMES = ["https", "wss"];
var CONNECTIONS_PER_ORIGIN = 6;
var ConnectionPool = class {
  options;
  records;
  connectionsByOrigin;
  connectionsByRequest;
  _connectionsInUse;
  connectionReusedByRequestId;
  constructor(records, options) {
    this.options = options;
    this.records = records;
    this.connectionsByOrigin = /* @__PURE__ */ new Map();
    this.connectionsByRequest = /* @__PURE__ */ new Map();
    this._connectionsInUse = /* @__PURE__ */ new Set();
    this.connectionReusedByRequestId = Core.NetworkAnalyzer.estimateIfConnectionWasReused(records, {
      forceCoarseEstimates: true
    });
    this.initializeConnections();
  }
  connectionsInUse() {
    return Array.from(this._connectionsInUse);
  }
  initializeConnections() {
    const connectionReused = this.connectionReusedByRequestId;
    const additionalRttByOrigin = this.options.additionalRttByOrigin;
    const serverResponseTimeByOrigin = this.options.serverResponseTimeByOrigin;
    const recordsByOrigin = Core.NetworkAnalyzer.groupByOrigin(this.records);
    for (const [origin, requests] of recordsByOrigin.entries()) {
      const connections = [];
      const additionalRtt = additionalRttByOrigin.get(origin) || 0;
      const responseTime = serverResponseTimeByOrigin.get(origin) || DEFAULT_SERVER_RESPONSE_TIME;
      for (const request of requests) {
        if (connectionReused.get(request.requestId)) {
          continue;
        }
        const isTLS = TLS_SCHEMES.includes(request.parsedURL.scheme);
        const isH2 = request.protocol === "h2";
        const connection = new TCPConnection(this.options.rtt + additionalRtt, this.options.throughput, responseTime, isTLS, isH2);
        connections.push(connection);
      }
      if (!connections.length) {
        throw new Core.LanternError(`Could not find a connection for origin: ${origin}`);
      }
      const minConnections = connections[0].isH2() ? 1 : CONNECTIONS_PER_ORIGIN;
      while (connections.length < minConnections) {
        connections.push(connections[0].clone());
      }
      this.connectionsByOrigin.set(origin, connections);
    }
  }
  findAvailableConnectionWithLargestCongestionWindow(connections) {
    let maxConnection = null;
    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];
      if (this._connectionsInUse.has(connection)) {
        continue;
      }
      const currentMax = maxConnection?.congestionWindow || -Infinity;
      if (connection.congestionWindow > currentMax) {
        maxConnection = connection;
      }
    }
    return maxConnection;
  }
  /**
   * This method finds an available connection to the origin specified by the network request or null
   * if no connection was available. If returned, connection will not be available for other network
   * records until release is called.
   */
  acquire(request) {
    if (this.connectionsByRequest.has(request)) {
      throw new Core.LanternError("Record already has a connection");
    }
    const origin = request.parsedURL.securityOrigin;
    const connections = this.connectionsByOrigin.get(origin) || [];
    const connectionToUse = this.findAvailableConnectionWithLargestCongestionWindow(connections);
    if (!connectionToUse) {
      return null;
    }
    this._connectionsInUse.add(connectionToUse);
    this.connectionsByRequest.set(request, connectionToUse);
    return connectionToUse;
  }
  /**
   * Return the connection currently being used to fetch a request. If no connection
   * currently being used for this request, an error will be thrown.
   */
  acquireActiveConnectionFromRequest(request) {
    const activeConnection = this.connectionsByRequest.get(request);
    if (!activeConnection) {
      throw new Core.LanternError("Could not find an active connection for request");
    }
    return activeConnection;
  }
  release(request) {
    const connection = this.connectionsByRequest.get(request);
    this.connectionsByRequest.delete(request);
    if (connection) {
      this._connectionsInUse.delete(connection);
    }
  }
};

// gen/front_end/models/trace/lantern/simulation/Constants.js
var DEVTOOLS_RTT_ADJUSTMENT_FACTOR = 3.75;
var DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR = 0.9;
var throttling = {
  DEVTOOLS_RTT_ADJUSTMENT_FACTOR,
  DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
  // These values align with WebPageTest's definition of "Fast 3G"
  // But offer similar characteristics to roughly the 75th percentile of 4G connections.
  mobileSlow4G: {
    rttMs: 150,
    throughputKbps: 1.6 * 1024,
    requestLatencyMs: 150 * DEVTOOLS_RTT_ADJUSTMENT_FACTOR,
    downloadThroughputKbps: 1.6 * 1024 * DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
    uploadThroughputKbps: 750 * DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
    cpuSlowdownMultiplier: 4
  },
  // These values partially align with WebPageTest's definition of "Regular 3G".
  // These values are meant to roughly align with Chrome UX report's 3G definition which are based
  // on HTTP RTT of 300-1400ms and downlink throughput of <700kbps.
  mobileRegular3G: {
    rttMs: 300,
    throughputKbps: 700,
    requestLatencyMs: 300 * DEVTOOLS_RTT_ADJUSTMENT_FACTOR,
    downloadThroughputKbps: 700 * DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
    uploadThroughputKbps: 700 * DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
    cpuSlowdownMultiplier: 4
  },
  // Using a "broadband" connection type
  // Corresponds to "Dense 4G 25th percentile" in https://docs.google.com/document/d/1Ft1Bnq9-t4jK5egLSOc28IL4TvR-Tt0se_1faTA4KTY/edit#heading=h.bb7nfy2x9e5v
  desktopDense4G: {
    rttMs: 40,
    throughputKbps: 10 * 1024,
    cpuSlowdownMultiplier: 1,
    requestLatencyMs: 0,
    // 0 means unset
    downloadThroughputKbps: 0,
    uploadThroughputKbps: 0
  }
};
var Constants = { throttling };

// gen/front_end/models/trace/lantern/simulation/DNSCache.js
var DNS_RESOLUTION_RTT_MULTIPLIER = 2;
var DNSCache = class _DNSCache {
  static rttMultiplier = DNS_RESOLUTION_RTT_MULTIPLIER;
  rtt;
  resolvedDomainNames;
  constructor({ rtt }) {
    this.rtt = rtt;
    this.resolvedDomainNames = /* @__PURE__ */ new Map();
  }
  getTimeUntilResolution(request, options) {
    const { requestedAt = 0, shouldUpdateCache = false } = options || {};
    const domain = request.parsedURL.host;
    const cacheEntry = this.resolvedDomainNames.get(domain);
    let timeUntilResolved = this.rtt * _DNSCache.rttMultiplier;
    if (cacheEntry) {
      const timeUntilCachedIsResolved = Math.max(cacheEntry.resolvedAt - requestedAt, 0);
      timeUntilResolved = Math.min(timeUntilCachedIsResolved, timeUntilResolved);
    }
    const resolvedAt = requestedAt + timeUntilResolved;
    if (shouldUpdateCache) {
      this.updateCacheResolvedAtIfNeeded(request, resolvedAt);
    }
    return timeUntilResolved;
  }
  updateCacheResolvedAtIfNeeded(request, resolvedAt) {
    const domain = request.parsedURL.host;
    const cacheEntry = this.resolvedDomainNames.get(domain) || { resolvedAt };
    cacheEntry.resolvedAt = Math.min(cacheEntry.resolvedAt, resolvedAt);
    this.resolvedDomainNames.set(domain, cacheEntry);
  }
  /**
   * Forcefully sets the DNS resolution time for a request.
   * Useful for testing and alternate execution simulations.
   */
  setResolvedAt(domain, resolvedAt) {
    this.resolvedDomainNames.set(domain, { resolvedAt });
  }
};

// gen/front_end/models/trace/lantern/simulation/SimulationTimingMap.js
import * as Core2 from "./../core/core.js";
import * as Graph from "./../graph/graph.js";
var SimulatorTimingMap = class {
  nodeTimings;
  constructor() {
    this.nodeTimings = /* @__PURE__ */ new Map();
  }
  getNodes() {
    return Array.from(this.nodeTimings.keys());
  }
  setReadyToStart(node, values) {
    this.nodeTimings.set(node, values);
  }
  setInProgress(node, values) {
    const nodeTiming = {
      ...this.getQueued(node),
      startTime: values.startTime,
      timeElapsed: 0
    };
    this.nodeTimings.set(node, node.type === Graph.BaseNode.types.NETWORK ? { ...nodeTiming, timeElapsedOvershoot: 0, bytesDownloaded: 0 } : nodeTiming);
  }
  setCompleted(node, values) {
    const nodeTiming = {
      ...this.getInProgress(node),
      endTime: values.endTime,
      connectionTiming: values.connectionTiming
    };
    this.nodeTimings.set(node, nodeTiming);
  }
  setCpu(node, values) {
    const nodeTiming = {
      ...this.getCpuStarted(node),
      timeElapsed: values.timeElapsed
    };
    this.nodeTimings.set(node, nodeTiming);
  }
  setCpuEstimated(node, values) {
    const nodeTiming = {
      ...this.getCpuStarted(node),
      estimatedTimeElapsed: values.estimatedTimeElapsed
    };
    this.nodeTimings.set(node, nodeTiming);
  }
  setNetwork(node, values) {
    const nodeTiming = {
      ...this.getNetworkStarted(node),
      timeElapsed: values.timeElapsed,
      timeElapsedOvershoot: values.timeElapsedOvershoot,
      bytesDownloaded: values.bytesDownloaded
    };
    this.nodeTimings.set(node, nodeTiming);
  }
  setNetworkEstimated(node, values) {
    const nodeTiming = {
      ...this.getNetworkStarted(node),
      estimatedTimeElapsed: values.estimatedTimeElapsed
    };
    this.nodeTimings.set(node, nodeTiming);
  }
  getQueued(node) {
    const timing = this.nodeTimings.get(node);
    if (!timing) {
      throw new Core2.LanternError(`Node ${node.id} not yet queued`);
    }
    return timing;
  }
  getCpuStarted(node) {
    const timing = this.nodeTimings.get(node);
    if (!timing) {
      throw new Core2.LanternError(`Node ${node.id} not yet queued`);
    }
    if (!("startTime" in timing)) {
      throw new Core2.LanternError(`Node ${node.id} not yet started`);
    }
    if ("bytesDownloaded" in timing) {
      throw new Core2.LanternError(`Node ${node.id} timing not valid`);
    }
    return timing;
  }
  getNetworkStarted(node) {
    const timing = this.nodeTimings.get(node);
    if (!timing) {
      throw new Core2.LanternError(`Node ${node.id} not yet queued`);
    }
    if (!("startTime" in timing)) {
      throw new Core2.LanternError(`Node ${node.id} not yet started`);
    }
    if (!("bytesDownloaded" in timing)) {
      throw new Core2.LanternError(`Node ${node.id} timing not valid`);
    }
    return timing;
  }
  getInProgress(node) {
    const timing = this.nodeTimings.get(node);
    if (!timing) {
      throw new Core2.LanternError(`Node ${node.id} not yet queued`);
    }
    if (!("startTime" in timing)) {
      throw new Core2.LanternError(`Node ${node.id} not yet started`);
    }
    if (!("estimatedTimeElapsed" in timing)) {
      throw new Core2.LanternError(`Node ${node.id} not yet in progress`);
    }
    return timing;
  }
  getCompleted(node) {
    const timing = this.nodeTimings.get(node);
    if (!timing) {
      throw new Core2.LanternError(`Node ${node.id} not yet queued`);
    }
    if (!("startTime" in timing)) {
      throw new Core2.LanternError(`Node ${node.id} not yet started`);
    }
    if (!("estimatedTimeElapsed" in timing)) {
      throw new Core2.LanternError(`Node ${node.id} not yet in progress`);
    }
    if (!("endTime" in timing)) {
      throw new Core2.LanternError(`Node ${node.id} not yet completed`);
    }
    return timing;
  }
};

// gen/front_end/models/trace/lantern/simulation/Simulator.js
import * as Core3 from "./../core/core.js";
import * as Graph2 from "./../graph/graph.js";
var defaultThrottling = Constants.throttling.mobileSlow4G;
var DEFAULT_MAXIMUM_CONCURRENT_REQUESTS = 10;
var DEFAULT_LAYOUT_TASK_MULTIPLIER = 0.5;
var DEFAULT_MAXIMUM_CPU_TASK_DURATION = 1e4;
var NodeState = {
  NotReadyToStart: 0,
  ReadyToStart: 1,
  InProgress: 2,
  Complete: 3
};
var PriorityStartTimePenalty = {
  VeryHigh: 0,
  High: 0.25,
  Medium: 0.5,
  Low: 1,
  VeryLow: 2
};
var ALL_SIMULATION_NODE_TIMINGS = /* @__PURE__ */ new Map();
var Simulator = class _Simulator {
  static createSimulator(settings) {
    const { throttlingMethod, throttling: throttling2, precomputedLanternData, networkAnalysis } = settings;
    const options = {
      additionalRttByOrigin: networkAnalysis.additionalRttByOrigin,
      serverResponseTimeByOrigin: networkAnalysis.serverResponseTimeByOrigin,
      observedThroughput: networkAnalysis.throughput
    };
    if (precomputedLanternData) {
      options.additionalRttByOrigin = new Map(Object.entries(precomputedLanternData.additionalRttByOrigin));
      options.serverResponseTimeByOrigin = new Map(Object.entries(precomputedLanternData.serverResponseTimeByOrigin));
    }
    switch (throttlingMethod) {
      case "provided":
        options.rtt = networkAnalysis.rtt;
        options.throughput = networkAnalysis.throughput;
        options.cpuSlowdownMultiplier = 1;
        options.layoutTaskMultiplier = 1;
        break;
      case "devtools":
        if (throttling2) {
          options.rtt = throttling2.requestLatencyMs / Constants.throttling.DEVTOOLS_RTT_ADJUSTMENT_FACTOR;
          options.throughput = throttling2.downloadThroughputKbps * 1024 / Constants.throttling.DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR;
        }
        options.cpuSlowdownMultiplier = 1;
        options.layoutTaskMultiplier = 1;
        break;
      case "simulate":
        if (throttling2) {
          options.rtt = throttling2.rttMs;
          options.throughput = throttling2.throughputKbps * 1024;
          options.cpuSlowdownMultiplier = throttling2.cpuSlowdownMultiplier;
        }
        break;
      default:
        break;
    }
    return new _Simulator(options);
  }
  options;
  _rtt;
  throughput;
  maximumConcurrentRequests;
  cpuSlowdownMultiplier;
  layoutTaskMultiplier;
  cachedNodeListByStartPosition;
  nodeTimings;
  numberInProgressByType;
  nodes;
  dns;
  connectionPool;
  constructor(options) {
    this.options = Object.assign({
      rtt: defaultThrottling.rttMs,
      throughput: defaultThrottling.throughputKbps * 1024,
      maximumConcurrentRequests: DEFAULT_MAXIMUM_CONCURRENT_REQUESTS,
      cpuSlowdownMultiplier: defaultThrottling.cpuSlowdownMultiplier,
      layoutTaskMultiplier: DEFAULT_LAYOUT_TASK_MULTIPLIER,
      additionalRttByOrigin: /* @__PURE__ */ new Map(),
      serverResponseTimeByOrigin: /* @__PURE__ */ new Map()
    }, options);
    this._rtt = this.options.rtt;
    this.throughput = this.options.throughput;
    this.maximumConcurrentRequests = Math.max(Math.min(TCPConnection.maximumSaturatedConnections(this._rtt, this.throughput), this.options.maximumConcurrentRequests), 1);
    this.cpuSlowdownMultiplier = this.options.cpuSlowdownMultiplier;
    this.layoutTaskMultiplier = this.cpuSlowdownMultiplier * this.options.layoutTaskMultiplier;
    this.cachedNodeListByStartPosition = [];
    this.nodeTimings = new SimulatorTimingMap();
    this.numberInProgressByType = /* @__PURE__ */ new Map();
    this.nodes = {};
    this.dns = new DNSCache({ rtt: this._rtt });
    this.connectionPool = null;
    if (!Number.isFinite(this._rtt)) {
      throw new Core3.LanternError(`Invalid rtt ${this._rtt}`);
    }
    if (!Number.isFinite(this.throughput)) {
      throw new Core3.LanternError(`Invalid throughput ${this.throughput}`);
    }
  }
  get rtt() {
    return this._rtt;
  }
  initializeConnectionPool(graph) {
    const records = [];
    graph.getRootNode().traverse((node) => {
      if (node.type === Graph2.BaseNode.types.NETWORK) {
        records.push(node.request);
      }
    });
    this.connectionPool = new ConnectionPool(records, this.options);
  }
  /**
   * Initializes the various state data structures such _nodeTimings and the _node Sets by state.
   */
  initializeAuxiliaryData() {
    this.nodeTimings = new SimulatorTimingMap();
    this.numberInProgressByType = /* @__PURE__ */ new Map();
    this.nodes = {};
    this.cachedNodeListByStartPosition = [];
    for (const state of Object.values(NodeState)) {
      this.nodes[state] = /* @__PURE__ */ new Set();
    }
  }
  numberInProgress(type) {
    return this.numberInProgressByType.get(type) || 0;
  }
  markNodeAsReadyToStart(node, queuedTime) {
    const nodeStartPosition = _Simulator.computeNodeStartPosition(node);
    const firstNodeIndexWithGreaterStartPosition = this.cachedNodeListByStartPosition.findIndex((candidate) => _Simulator.computeNodeStartPosition(candidate) > nodeStartPosition);
    const insertionIndex = firstNodeIndexWithGreaterStartPosition === -1 ? this.cachedNodeListByStartPosition.length : firstNodeIndexWithGreaterStartPosition;
    this.cachedNodeListByStartPosition.splice(insertionIndex, 0, node);
    this.nodes[NodeState.ReadyToStart].add(node);
    this.nodes[NodeState.NotReadyToStart].delete(node);
    this.nodeTimings.setReadyToStart(node, { queuedTime });
  }
  markNodeAsInProgress(node, startTime) {
    const indexOfNodeToStart = this.cachedNodeListByStartPosition.indexOf(node);
    this.cachedNodeListByStartPosition.splice(indexOfNodeToStart, 1);
    this.nodes[NodeState.InProgress].add(node);
    this.nodes[NodeState.ReadyToStart].delete(node);
    this.numberInProgressByType.set(node.type, this.numberInProgress(node.type) + 1);
    this.nodeTimings.setInProgress(node, { startTime });
  }
  markNodeAsComplete(node, endTime, connectionTiming) {
    this.nodes[NodeState.Complete].add(node);
    this.nodes[NodeState.InProgress].delete(node);
    this.numberInProgressByType.set(node.type, this.numberInProgress(node.type) - 1);
    this.nodeTimings.setCompleted(node, { endTime, connectionTiming });
    for (const dependent of node.getDependents()) {
      const dependencies = dependent.getDependencies();
      if (dependencies.some((dep) => !this.nodes[NodeState.Complete].has(dep))) {
        continue;
      }
      this.markNodeAsReadyToStart(dependent, endTime);
    }
  }
  acquireConnection(request) {
    return this.connectionPool.acquire(request);
  }
  getNodesSortedByStartPosition() {
    return Array.from(this.cachedNodeListByStartPosition);
  }
  startNodeIfPossible(node, totalElapsedTime) {
    if (node.type === Graph2.BaseNode.types.CPU) {
      if (this.numberInProgress(node.type) === 0) {
        this.markNodeAsInProgress(node, totalElapsedTime);
      }
      return;
    }
    if (node.type !== Graph2.BaseNode.types.NETWORK) {
      throw new Core3.LanternError("Unsupported");
    }
    if (!node.isConnectionless) {
      const numberOfActiveRequests = this.numberInProgress(node.type);
      if (numberOfActiveRequests >= this.maximumConcurrentRequests) {
        return;
      }
      const connection = this.acquireConnection(node.request);
      if (!connection) {
        return;
      }
    }
    this.markNodeAsInProgress(node, totalElapsedTime);
  }
  /**
   * Updates each connection in use with the available throughput based on the number of network requests
   * currently in flight.
   */
  updateNetworkCapacity() {
    const inFlight = this.numberInProgress(Graph2.BaseNode.types.NETWORK);
    if (inFlight === 0) {
      return;
    }
    for (const connection of this.connectionPool.connectionsInUse()) {
      connection.setThroughput(this.throughput / inFlight);
    }
  }
  /**
   * Estimates the number of milliseconds remaining given current conditions before the node is complete.
   */
  estimateTimeRemaining(node) {
    if (node.type === Graph2.BaseNode.types.CPU) {
      return this.estimateCPUTimeRemaining(node);
    }
    if (node.type === Graph2.BaseNode.types.NETWORK) {
      return this.estimateNetworkTimeRemaining(node);
    }
    throw new Core3.LanternError("Unsupported");
  }
  estimateCPUTimeRemaining(cpuNode) {
    const timingData = this.nodeTimings.getCpuStarted(cpuNode);
    const multiplier = cpuNode.didPerformLayout() ? this.layoutTaskMultiplier : this.cpuSlowdownMultiplier;
    const totalDuration = Math.min(Math.round(cpuNode.duration / 1e3 * multiplier), DEFAULT_MAXIMUM_CPU_TASK_DURATION);
    const estimatedTimeElapsed = totalDuration - timingData.timeElapsed;
    this.nodeTimings.setCpuEstimated(cpuNode, { estimatedTimeElapsed });
    return estimatedTimeElapsed;
  }
  estimateNetworkTimeRemaining(networkNode) {
    const request = networkNode.request;
    const timingData = this.nodeTimings.getNetworkStarted(networkNode);
    let timeElapsed = 0;
    if (networkNode.fromDiskCache) {
      const sizeInMb = (request.resourceSize || 0) / 1024 / 1024;
      timeElapsed = 8 + 20 * sizeInMb - timingData.timeElapsed;
    } else if (networkNode.isNonNetworkProtocol) {
      const sizeInMb = (request.resourceSize || 0) / 1024 / 1024;
      timeElapsed = 2 + 10 * sizeInMb - timingData.timeElapsed;
    } else {
      const connection = this.connectionPool.acquireActiveConnectionFromRequest(request);
      const dnsResolutionTime = this.dns.getTimeUntilResolution(request, {
        requestedAt: timingData.startTime,
        shouldUpdateCache: true
      });
      const timeAlreadyElapsed = timingData.timeElapsed;
      const calculation = connection.simulateDownloadUntil(request.transferSize - timingData.bytesDownloaded, { timeAlreadyElapsed, dnsResolutionTime, maximumTimeToElapse: Infinity });
      timeElapsed = calculation.timeElapsed;
    }
    const estimatedTimeElapsed = timeElapsed + timingData.timeElapsedOvershoot;
    this.nodeTimings.setNetworkEstimated(networkNode, { estimatedTimeElapsed });
    return estimatedTimeElapsed;
  }
  /**
   * Computes and returns the minimum estimated completion time of the nodes currently in progress.
   */
  findNextNodeCompletionTime() {
    let minimumTime = Infinity;
    for (const node of this.nodes[NodeState.InProgress]) {
      minimumTime = Math.min(minimumTime, this.estimateTimeRemaining(node));
    }
    return minimumTime;
  }
  /**
   * Given a time period, computes the progress toward completion that the node made during that time.
   */
  updateProgressMadeInTimePeriod(node, timePeriodLength, totalElapsedTime) {
    const timingData = this.nodeTimings.getInProgress(node);
    const isFinished = timingData.estimatedTimeElapsed === timePeriodLength;
    if (node.type === Graph2.BaseNode.types.CPU || node.isConnectionless) {
      if (isFinished) {
        this.markNodeAsComplete(node, totalElapsedTime);
      } else {
        timingData.timeElapsed += timePeriodLength;
      }
      return;
    }
    if (node.type !== Graph2.BaseNode.types.NETWORK) {
      throw new Core3.LanternError("Unsupported");
    }
    if (!("bytesDownloaded" in timingData)) {
      throw new Core3.LanternError("Invalid timing data");
    }
    const request = node.request;
    const connection = this.connectionPool.acquireActiveConnectionFromRequest(request);
    const dnsResolutionTime = this.dns.getTimeUntilResolution(request, {
      requestedAt: timingData.startTime,
      shouldUpdateCache: true
    });
    const calculation = connection.simulateDownloadUntil(request.transferSize - timingData.bytesDownloaded, {
      dnsResolutionTime,
      timeAlreadyElapsed: timingData.timeElapsed,
      maximumTimeToElapse: timePeriodLength - timingData.timeElapsedOvershoot
    });
    connection.setCongestionWindow(calculation.congestionWindow);
    connection.setH2OverflowBytesDownloaded(calculation.extraBytesDownloaded);
    if (isFinished) {
      connection.setWarmed(true);
      this.connectionPool.release(request);
      this.markNodeAsComplete(node, totalElapsedTime, calculation.connectionTiming);
    } else {
      timingData.timeElapsed += calculation.timeElapsed;
      timingData.timeElapsedOvershoot += calculation.timeElapsed - timePeriodLength;
      timingData.bytesDownloaded += calculation.bytesDownloaded;
    }
  }
  computeFinalNodeTimings() {
    const completeNodeTimingEntries = this.nodeTimings.getNodes().map((node) => {
      return [node, this.nodeTimings.getCompleted(node)];
    });
    completeNodeTimingEntries.sort((a, b) => a[1].startTime - b[1].startTime);
    const nodeTimingEntries = completeNodeTimingEntries.map(([node, timing]) => {
      return [
        node,
        {
          startTime: timing.startTime,
          endTime: timing.endTime,
          duration: timing.endTime - timing.startTime
        }
      ];
    });
    return {
      nodeTimings: new Map(nodeTimingEntries),
      completeNodeTimings: new Map(completeNodeTimingEntries)
    };
  }
  getOptions() {
    return this.options;
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
  simulate(graph, options) {
    if (Graph2.BaseNode.findCycle(graph)) {
      throw new Core3.LanternError("Cannot simulate graph with cycle");
    }
    options = Object.assign({
      label: void 0
    }, options);
    this.dns = new DNSCache({ rtt: this._rtt });
    this.initializeConnectionPool(graph);
    this.initializeAuxiliaryData();
    const nodesNotReadyToStart = this.nodes[NodeState.NotReadyToStart];
    const nodesReadyToStart = this.nodes[NodeState.ReadyToStart];
    const nodesInProgress = this.nodes[NodeState.InProgress];
    const rootNode = graph.getRootNode();
    rootNode.traverse((node) => nodesNotReadyToStart.add(node));
    let totalElapsedTime = 0;
    let iteration = 0;
    this.markNodeAsReadyToStart(rootNode, totalElapsedTime);
    while (nodesReadyToStart.size || nodesInProgress.size) {
      for (const node of this.getNodesSortedByStartPosition()) {
        this.startNodeIfPossible(node, totalElapsedTime);
      }
      if (!nodesInProgress.size) {
        throw new Core3.LanternError("Failed to start a node");
      }
      this.updateNetworkCapacity();
      const minimumTime = this.findNextNodeCompletionTime();
      totalElapsedTime += minimumTime;
      if (!Number.isFinite(minimumTime) || iteration > 1e5) {
        throw new Core3.LanternError("Simulation failed, depth exceeded");
      }
      iteration++;
      for (const node of nodesInProgress) {
        this.updateProgressMadeInTimePeriod(node, minimumTime, totalElapsedTime);
      }
    }
    const { nodeTimings, completeNodeTimings } = this.computeFinalNodeTimings();
    ALL_SIMULATION_NODE_TIMINGS.set(options.label || "unlabeled", completeNodeTimings);
    return {
      timeInMs: totalElapsedTime,
      nodeTimings
    };
  }
  computeWastedMsFromWastedBytes(wastedBytes) {
    const { throughput, observedThroughput } = this.options;
    const bitsPerSecond = throughput === 0 ? observedThroughput : throughput;
    if (bitsPerSecond === 0) {
      return 0;
    }
    const wastedBits = wastedBytes * 8;
    const wastedMs = wastedBits / bitsPerSecond * 1e3;
    return Math.round(wastedMs / 10) * 10;
  }
  // Used by Lighthouse asset-saver
  static get allNodeTimings() {
    return ALL_SIMULATION_NODE_TIMINGS;
  }
  /**
   * We attempt to start nodes by their observed start time using the request priority as a tie breaker.
   * When simulating, just because a low priority image started 5ms before a high priority image doesn't mean
   * it would have happened like that when the network was slower.
   */
  static computeNodeStartPosition(node) {
    if (node.type === "cpu") {
      return node.startTime;
    }
    return node.startTime + (PriorityStartTimePenalty[node.request.priority] * 1e3 * 1e3 || 0);
  }
};
export {
  ConnectionPool,
  Constants,
  DNSCache,
  Simulator,
  SimulatorTimingMap,
  TCPConnection
};
//# sourceMappingURL=simulation.js.map
