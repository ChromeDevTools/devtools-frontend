// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import type * as Protocol from '../../../generated/protocol.js';
import type * as Handlers from '../handlers/handlers.js';
import type * as Lantern from '../lantern/lantern.js';
import type * as Types from '../types/types.js';

import type * as Models from './Models.js';

/**
 * Context for the portion of the trace an insight should look at.
 */
export type InsightSetContext = InsightSetContextWithoutNavigation|InsightSetContextWithNavigation;

export interface InsightSetContextWithoutNavigation {
  bounds: Types.Timing.TraceWindowMicro;
  frameId: string;
  navigation?: never;
}

export interface InsightSetContextWithNavigation {
  bounds: Types.Timing.TraceWindowMicro;
  frameId: string;
  navigation: Types.Events.NavigationStart;
  navigationId: string;
  lantern?: LanternContext;
}

export interface LanternContext {
  graph: Lantern.Graph.Node<Types.Events.SyntheticNetworkRequest>;
  simulator: Lantern.Simulation.Simulator<Types.Events.SyntheticNetworkRequest>;
  metrics: Record<string, Lantern.Metrics.MetricResult>;
}

export interface ForcedReflowAggregatedData {
  topLevelFunctionCall: Types.Events.CallFrame|Protocol.Runtime.CallFrame;
  totalReflowTime: number;
  bottomUpData: Set<string>;
  topLevelFunctionCallEvents: Types.Events.Event[];
}

export interface BottomUpCallStack {
  bottomUpData: Types.Events.CallFrame|Protocol.Runtime.CallFrame;
  totalTime: number;
  relatedEvents: Types.Events.Event[];
}

export type InsightModelsType = typeof Models;

export enum InsightWarning {
  NO_FP = 'NO_FP',
  NO_LCP = 'NO_LCP',
  // No network request could be identified as the primary HTML document.
  NO_DOCUMENT_REQUEST = 'NO_DOCUMENT_REQUEST',
  NO_LAYOUT = 'NO_LAYOUT',
}

export interface MetricSavings {
  /* eslint-disable @typescript-eslint/naming-convention */
  FCP?: Types.Timing.Milli;
  LCP?: Types.Timing.Milli;
  TBT?: Types.Timing.Milli;
  CLS?: number;
  INP?: Types.Timing.Milli;
  /* eslint-enable @typescript-eslint/naming-convention */
}

export enum InsightCategory {
  ALL = 'All',
  INP = 'INP',
  LCP = 'LCP',
  CLS = 'CLS',
}

export type RelatedEventsMap = Map<Types.Events.Event, string[]>;

export type InsightModel<UIStrings extends Record<string, string>, R extends Record<string, unknown>> = R&{
  /** Not used within DevTools - this is for external consumers (like Lighthouse). */
  strings: UIStrings,
  title: Common.UIString.LocalizedString,
  description: Common.UIString.LocalizedString,
  category: InsightCategory,
  /** True if there is anything of interest to display to the user. */
  shouldShow: boolean,
  relatedEvents?: RelatedEventsMap | Types.Events.Event[],
  warnings?: InsightWarning[],
  metricSavings?: MetricSavings,
};

export type PartialInsightModel<T> = Omit<T, 'strings'|'title'|'description'|'category'|'shouldShow'>;

/**
 * Contains insights for a specific navigation. If a trace began after a navigation already started,
 * this could instead represent the duration from the beginning of the trace up to the first recorded
 * navigation (or the end of the trace).
 */
export interface InsightSet {
  /** If for a navigation, this is the navigationId. Else it is Trace.Types.Events.NO_NAVIGATION. */
  id: Types.Events.NavigationId;
  /** The URL to show in the accordion list. */
  url: URL;
  frameId: string;
  bounds: Types.Timing.TraceWindowMicro;
  model: InsightModels;
  navigation?: Types.Events.NavigationStart;
}

/**
 * Contains insights for a specific insight set.
 */
export type InsightModels = {
  [I in keyof InsightModelsType]: ReturnType<InsightModelsType[I]['generateInsight']>;
};

/**
 * Contains insights for the entire trace. Insights are mostly grouped by `navigationId`, with one exception:
 *
 * If the analyzed trace started after the navigation, and has meaningful work with that span, there is no
 * navigation to map it to. In this case `Types.Events.NO_NAVIGATION` is used for the key.
 */
export type TraceInsightSets = Map<Types.Events.NavigationId, InsightSet>;

/**
 * Represents the narrow set of dependencies defined by an insight's `deps()` function. `Meta` is always included regardless of `deps()`.
 */
export type RequiredData<D extends() => Array<keyof typeof Handlers.ModelHandlers>> =
    Handlers.Types.EnabledHandlerDataWithMeta<Pick<typeof Handlers.ModelHandlers, ReturnType<D>[number]>>;
