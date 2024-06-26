// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// TODO(crbug.com/348449529): refactor to proper devtools module

import * as Metrics from './MetricsModule.js';
import * as Simulation from './SimulationModule.js';

export {BaseNode, type Node} from './BaseNode.js';
export {CPUNode} from './CPUNode.js';
export {LanternError as Error} from './LanternError.js';
export {NetworkNode} from './NetworkNode.js';
export {PageDependencyGraph} from './PageDependencyGraph.js';
export type {
  NetworkRequest,
  ParsedURL,
  ResourcePriority,
  ResourceTiming,
  ResourceType,
  Trace,
  TraceEvent,
} from './types/lantern.js';

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

export {
  Metrics,
  Simulation,
};
