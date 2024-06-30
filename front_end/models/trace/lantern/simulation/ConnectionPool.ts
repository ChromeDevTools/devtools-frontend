// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Core from '../core/core.js';
import type * as Lantern from '../types/types.js';

import {TCPConnection} from './TCPConnection.js';

const DEFAULT_SERVER_RESPONSE_TIME = 30;
const TLS_SCHEMES = ['https', 'wss'];

// Each origin can have 6 simulatenous connections open
// https://cs.chromium.org/chromium/src/net/socket/client_socket_pool_manager.cc?type=cs&q="int+g_max_sockets_per_group"
const CONNECTIONS_PER_ORIGIN = 6;

export class ConnectionPool {
  options: Required<Lantern.Simulation.Options>;
  records: Lantern.NetworkRequest[];
  connectionsByOrigin: Map<string, TCPConnection[]>;
  connectionsByRequest: Map<Lantern.NetworkRequest, TCPConnection>;
  _connectionsInUse: Set<TCPConnection>;
  connectionReusedByRequestId: Map<string, boolean>;

  constructor(records: Lantern.NetworkRequest[], options: Required<Lantern.Simulation.Options>) {
    this.options = options;

    this.records = records;
    this.connectionsByOrigin = new Map();
    this.connectionsByRequest = new Map();
    this._connectionsInUse = new Set();
    this.connectionReusedByRequestId = Core.NetworkAnalyzer.estimateIfConnectionWasReused(records, {
      forceCoarseEstimates: true,
    });

    this.initializeConnections();
  }

  connectionsInUse(): TCPConnection[] {
    return Array.from(this._connectionsInUse);
  }

  initializeConnections(): void {
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
        const isH2 = request.protocol === 'h2';
        const connection = new TCPConnection(
            this.options.rtt + additionalRtt,
            this.options.throughput,
            responseTime,
            isTLS,
            isH2,
        );

        connections.push(connection);
      }

      if (!connections.length) {
        throw new Core.LanternError(`Could not find a connection for origin: ${origin}`);
      }

      // Make sure each origin has minimum number of connections available for max throughput.
      // But only if it's not over H2 which maximizes throughput already.
      const minConnections = connections[0].isH2() ? 1 : CONNECTIONS_PER_ORIGIN;
      while (connections.length < minConnections) {
        connections.push(connections[0].clone());
      }

      this.connectionsByOrigin.set(origin, connections);
    }
  }

  findAvailableConnectionWithLargestCongestionWindow(connections: TCPConnection[]): TCPConnection|null {
    let maxConnection: TCPConnection|null = null;
    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];

      // Connections that are in use are never available.
      if (this._connectionsInUse.has(connection)) {
        continue;
      }

      // This connection is a match and is available! Update our max if it has a larger congestionWindow
      const currentMax = (maxConnection?.congestionWindow) || -Infinity;
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
  acquire(request: Lantern.NetworkRequest): TCPConnection|null {
    if (this.connectionsByRequest.has(request)) {
      throw new Core.LanternError('Record already has a connection');
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
  acquireActiveConnectionFromRequest(request: Lantern.NetworkRequest): TCPConnection {
    const activeConnection = this.connectionsByRequest.get(request);
    if (!activeConnection) {
      throw new Core.LanternError('Could not find an active connection for request');
    }

    return activeConnection;
  }

  release(request: Lantern.NetworkRequest): void {
    const connection = this.connectionsByRequest.get(request);
    this.connectionsByRequest.delete(request);
    if (connection) {
      this._connectionsInUse.delete(connection);
    }
  }
}
