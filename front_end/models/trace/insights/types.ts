// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Handlers from '../handlers/handlers.js';
import type * as Lantern from '../lantern/lantern.js';
import type * as Types from '../types/types.js';

import type * as InsightsRunners from './InsightRunners.js';

/**
 * Context for which navigation an insight should look at.
 */
export interface NavigationInsightContext {
  frameId: string;
  navigationId: string;
  lantern?: LanternContext;
}

export interface LanternContext {
  graph: Lantern.Graph.Node<Types.TraceEvents.SyntheticNetworkRequest>;
  simulator: Lantern.Simulation.Simulator<Types.TraceEvents.SyntheticNetworkRequest>;
  metrics: Record<string, Lantern.Metrics.MetricResult>;
}

export type InsightRunnersType = typeof InsightsRunners;

export enum InsightWarning {
  NO_FP = 'NO_FP',
  NO_LCP = 'NO_LCP',
  // No network request could be identified as the primary HTML document.
  NO_DOCUMENT_REQUEST = 'NO_DOCUMENT_REQUEST',
  NO_LAYOUT = 'NO_LAYOUT',
}

export type InsightResult<R extends Record<string, unknown>> = R&{
  warnings?: InsightWarning[],
  metricSavings?: {
    /* eslint-disable @typescript-eslint/naming-convention */
    FCP?: number,
    LCP?: number,
    TBT?: number,
    CLS?: number,
    INP?: number,
    /* eslint-enable @typescript-eslint/naming-convention */
  },
};

export type LCPInsightResult = InsightResult<{
  lcpMs?: Types.Timing.MilliSeconds,
  lcpTs?: Types.Timing.MilliSeconds,
  phases?: InsightsRunners.LargestContentfulPaint.LCPPhases,
  shouldRemoveLazyLoading?: boolean,
  shouldIncreasePriorityHint?: boolean,
  shouldPreloadImage?: boolean,
}>;

/**
 * Contains insights for a specific navigation.
 */
export type NavigationInsightData = {
  [I in keyof InsightRunnersType]: ReturnType<InsightRunnersType[I]['generateInsight']>|Error;
};

/**
 * Contains insights for the entire trace. Insights are grouped by `navigationId`.
 */
export type TraceInsightData = Map<string, NavigationInsightData>;

/**
 * Represents the narrow set of dependencies defined by an insight's `deps()` function. `Meta` is always included regardless of `deps()`.
 */
export type RequiredData<D extends() => Array<keyof typeof Handlers.ModelHandlers>> =
    Handlers.Types.EnabledHandlerDataWithMeta<Pick<typeof Handlers.ModelHandlers, ReturnType<D>[number]>>;
