// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../../generated/protocol.js';

export const NetworkRequestTypes = {
  XHR: 'XHR',
  Fetch: 'Fetch',
  EventSource: 'EventSource',
  Script: 'Script',
  Stylesheet: 'Stylesheet',
  Image: 'Image',
  Media: 'Media',
  Font: 'Font',
  Document: 'Document',
  TextTrack: 'TextTrack',
  WebSocket: 'WebSocket',
  Other: 'Other',
  Manifest: 'Manifest',
  SignedExchange: 'SignedExchange',
  Ping: 'Ping',
  Preflight: 'Preflight',
  CSPViolationReport: 'CSPViolationReport',
  Prefetch: 'Prefetch',
} as const;

export type TraceEvent = {
  name: string,
  args: {
    name?: string,
    data?: {
      frame?: string,
      readyState?: number,
      stackTrace?: {
        url: string,
      }[],
      url?: string,
    },
  },
  pid: number,
  tid: number,
  /** Timestamp of the event in microseconds. */
  ts: number,
  dur: number,
};
export type Trace = {
  traceEvents: TraceEvent[],
};
export type ResourcePriority = ('VeryLow'|'Low'|'Medium'|'High'|'VeryHigh');
export type ResourceType = keyof typeof NetworkRequestTypes;
type InitiatorType = ('parser'|'script'|'preload'|'SignedExchange'|'preflight'|'other');
export type ResourceTiming = Protocol.Network.ResourceTiming;
type CallStack = {
  callFrames: Array<{
    scriptId: string,
    url: string,
    lineNumber: number,
    columnNumber: number,
    functionName: string,
  }>,
  parent?: CallStack,
};

export type ParsedURL = {
  /**
   * Equivalent to a `new URL(url).protocol` BUT w/o the trailing colon (:)
   */
  scheme: string,
  /**
   * Equivalent to a `new URL(url).hostname`
   */
  host: string,
  securityOrigin: string,
};

// When Lantern NetworkRequests are constructed, the source-of-truth of the network record is given as `rawRequest`.
// Internally Lantern doesn't care about the type of this field, so a default type is given to simplify internal code
// by avoiding unnecessary typescript overhead.
// If callers want to access the underlying network record, they are expected to make use of this generic on top-level
// interfaces like Simulator.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyNetworkObject = any;

export type NetworkRequest<T = AnyNetworkObject> = {
  requestId: string,
  connectionId: number,
  connectionReused: boolean,
  url: string,
  protocol: string,
  parsedURL: ParsedURL,
  documentURL: string,
  /** When the renderer process initially discovers a network request, in milliseconds. */
  rendererStartTime: number,
  /**
   * When the network service is about to handle a request, ie. just before going to the
   * HTTP cache or going to the network for DNS/connection setup, in milliseconds.
   */
  networkRequestTime: number,
  /**
   * When the last byte of the response headers is received, in milliseconds.
   * Equal to networkRequestTime if no data is recieved over the
   * network (ex: cached requests or data urls).
   */
  responseHeadersEndTime: number,
  /** When the last byte of the response body is received, in milliseconds. */
  networkEndTime: number,
  transferSize: number,
  resourceSize: number,
  fromDiskCache: boolean,
  fromMemoryCache: boolean,
  isLinkPreload: boolean,
  finished: boolean,
  failed: boolean,
  statusCode: number,
  /** The network request that redirected to this one */
  redirectSource: NetworkRequest<T>|undefined,
  /** The network request that this one redirected to */
  redirectDestination: NetworkRequest<T>|undefined,
  // TODO: can't use Protocol.Network.Initiator because of type mismatch in Lighthouse initiator.
  initiator: {
    type: InitiatorType,
    url?: string,
    stack?: CallStack,
  },
  initiatorRequest: NetworkRequest<T>|undefined,
  /** The chain of network requests that redirected to this one */
  redirects: NetworkRequest[]|undefined,
  timing: Protocol.Network.ResourceTiming|undefined,
  resourceType: ResourceType|undefined,
  mimeType: string,
  priority: ResourcePriority,
  frameId: string|undefined,
  fromWorker: boolean,
  /**
   * Optional value for how long the server took to respond to this request.
   * When not provided, the server response time is derived from the timing object.
   */
  serverResponseTime?: number,
  /**
   * Implementation-specific canoncial data structure that this Lantern NetworkRequest
   * was derived from.
   * Users of Lantern create a NetworkRequest matching this interface,
   * but can store the source-of-truth for their network model in this property.
   * This is then accessible as a read-only property on NetworkNode.
   */
  rawRequest?: T,
};

export namespace Simulation {
  export interface URL {
    /** URL of the initially requested URL */
    requestedUrl?: string;
    /** URL of the last document request */
    mainDocumentUrl?: string;
  }

  /** Simulation settings that control the amount of network & cpu throttling in the run. */
  export interface ThrottlingSettings {
    /** The round trip time in milliseconds. */
    rttMs?: number;
    /** The network throughput in kilobits per second. */
    throughputKbps?: number;
    // devtools settings
    /** The network request latency in milliseconds. */
    requestLatencyMs?: number;
    /** The network download throughput in kilobits per second. */
    downloadThroughputKbps?: number;
    /** The network upload throughput in kilobits per second. */
    uploadThroughputKbps?: number;
    // used by both
    /** The amount of slowdown applied to the cpu (1/<cpuSlowdownMultiplier>). */
    cpuSlowdownMultiplier?: number;
  }

  export interface PrecomputedLanternData {
    additionalRttByOrigin: {[origin: string]: number};
    serverResponseTimeByOrigin: {[origin: string]: number};
  }

  export interface Settings {
    networkAnalysis: {
      rtt: number,
      additionalRttByOrigin: Map<string, number>,
      serverResponseTimeByOrigin: Map<string, number>,
      throughput: number,
    };
    /** The method used to throttle the network. */
    throttlingMethod: 'devtools'|'simulate'|'provided';
    /** The throttling config settings. */
    throttling?: Required<ThrottlingSettings>;
    /** Precomputed lantern estimates to use instead of observed analysis. */
    precomputedLanternData?: PrecomputedLanternData|null;
  }

  export interface Options {
    rtt?: number;
    throughput?: number;
    observedThroughput: number;
    maximumConcurrentRequests?: number;
    cpuSlowdownMultiplier?: number;
    layoutTaskMultiplier?: number;
    additionalRttByOrigin?: Map<string, number>;
    serverResponseTimeByOrigin?: Map<string, number>;
  }

  export interface ProcessedNavigation {
    timestamps: {
      firstContentfulPaint: number,
      largestContentfulPaint?: number,
    };
  }

  export interface NodeTiming {
    startTime: number;
    endTime: number;
    duration: number;
  }
}
