// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {ConnectionTiming} from './SimulationTimingMap.js';

interface DownloadOptions {
  dnsResolutionTime?: number;
  timeAlreadyElapsed?: number;
  maximumTimeToElapse?: number;
}

interface DownloadResults {
  roundTrips: number;
  timeElapsed: number;
  bytesDownloaded: number;
  extraBytesDownloaded: number;
  congestionWindow: number;
  connectionTiming: ConnectionTiming;
}

const INITIAL_CONGESTION_WINDOW = 10;
const TCP_SEGMENT_SIZE = 1460;

class TCPConnection {
  warmed: boolean;
  ssl: boolean;
  h2: boolean;
  rtt: number;
  throughput: number;
  serverLatency: number;
  _congestionWindow: number;
  h2OverflowBytesDownloaded: number;

  constructor(rtt: number, throughput: number, serverLatency = 0, ssl = true, h2 = false) {
    this.warmed = false;
    this.ssl = ssl;
    this.h2 = h2;
    this.rtt = rtt;
    this.throughput = throughput;
    this.serverLatency = serverLatency;
    this._congestionWindow = INITIAL_CONGESTION_WINDOW;
    this.h2OverflowBytesDownloaded = 0;
  }

  static maximumSaturatedConnections(rtt: number, availableThroughput: number): number {
    const roundTripsPerSecond = 1000 / rtt;
    const bytesPerRoundTrip = TCP_SEGMENT_SIZE;
    const bytesPerSecond = roundTripsPerSecond * bytesPerRoundTrip;
    const minimumThroughputRequiredPerRequest = bytesPerSecond * 8;
    return Math.floor(availableThroughput / minimumThroughputRequiredPerRequest);
  }

  computeMaximumCongestionWindowInSegments(): number {
    const bytesPerSecond = this.throughput / 8;
    const secondsPerRoundTrip = this.rtt / 1000;
    const bytesPerRoundTrip = bytesPerSecond * secondsPerRoundTrip;
    return Math.floor(bytesPerRoundTrip / TCP_SEGMENT_SIZE);
  }

  setThroughput(throughput: number): void {
    this.throughput = throughput;
  }

  setCongestionWindow(congestion: number): void {
    this._congestionWindow = congestion;
  }

  setWarmed(warmed: boolean): void {
    this.warmed = warmed;
  }

  isWarm(): boolean {
    return this.warmed;
  }

  isH2(): boolean {
    return this.h2;
  }

  get congestionWindow(): number {
    return this._congestionWindow;
  }

  /**
   * Sets the number of excess bytes that are available to this connection on future downloads, only
   * applies to H2 connections.
   */
  setH2OverflowBytesDownloaded(bytes: number): void {
    if (!this.h2) {
      return;
    }
    this.h2OverflowBytesDownloaded = bytes;
  }

  clone(): TCPConnection {
    return Object.assign(new TCPConnection(this.rtt, this.throughput), this);
  }

  /**
   * Simulates a network download of a particular number of bytes over an optional maximum amount of time
   * and returns information about the ending state.
   *
   * See https://hpbn.co/building-blocks-of-tcp/#three-way-handshake and
   *  https://hpbn.co/transport-layer-security-tls/#tls-handshake for details.
   */
  simulateDownloadUntil(bytesToDownload: number, options?: DownloadOptions): DownloadResults {
    const {timeAlreadyElapsed = 0, maximumTimeToElapse = Infinity, dnsResolutionTime = 0} = options || {};

    if (this.warmed && this.h2) {
      bytesToDownload -= this.h2OverflowBytesDownloaded;
    }
    const twoWayLatency = this.rtt;
    const oneWayLatency = twoWayLatency / 2;
    const maximumCongestionWindow = this.computeMaximumCongestionWindowInSegments();

    let handshakeAndRequest = oneWayLatency;
    if (!this.warmed) {
      handshakeAndRequest =
          // DNS lookup
          dnsResolutionTime +
          // SYN
          oneWayLatency +
          // SYN ACK
          oneWayLatency +
          // ACK + initial request
          oneWayLatency +
          // ClientHello/ServerHello assuming TLS False Start is enabled (https://istlsfastyet.com/#server-performance).
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

    let connectionTiming: ConnectionTiming;
    if (!this.warmed) {
      connectionTiming = {
        dnsResolutionTime,
        connectionTime: handshakeAndRequest - dnsResolutionTime,
        sslTime: this.ssl ? twoWayLatency : undefined,
        timeToFirstByte,
      };
    } else if (this.h2) {
      // TODO: timing information currently difficult to model for warm h2 connections.
      connectionTiming = {
        timeToFirstByte,
      };
    } else {
      connectionTiming = {
        connectionTime: handshakeAndRequest,
        timeToFirstByte,
      };
    }

    return {
      roundTrips,
      timeElapsed,
      bytesDownloaded,
      extraBytesDownloaded,
      congestionWindow,
      connectionTiming,
    };
  }
}

export {TCPConnection};
