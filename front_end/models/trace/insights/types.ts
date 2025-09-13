// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
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
  requests: Array<Lantern.Types.NetworkRequest<Types.Events.SyntheticNetworkRequest>>;
  graph: Lantern.Graph.Node<Types.Events.SyntheticNetworkRequest>;
  simulator: Lantern.Simulation.Simulator<Types.Events.SyntheticNetworkRequest>;
  metrics: Record<string, Lantern.Metrics.MetricResult>;
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

export type Checklist<Keys extends string> = Record<Keys, {label: Common.UIString.LocalizedString, value: boolean}>;

export type InsightModel<UIStrings extends Record<string, string> = Record<string, string>,
                                           ExtraDetail extends Record<string, unknown> = Record<string, unknown>> =
    ExtraDetail&{
      /** Used internally to identify the type of a model, not shown visibly to users **/
      insightKey: keyof InsightModelsType,
      /** Not used within DevTools - this is for external consumers (like Lighthouse). */
      strings: UIStrings,
      title: Common.UIString.LocalizedString,
      description: Common.UIString.LocalizedString,
      category: InsightCategory,
      state: 'pass' | 'fail' | 'informative',
      /** Used by RelatedInsightChips.ts */
      relatedEvents?: RelatedEventsMap | Types.Events.Event[],
      warnings?: InsightWarning[],
      metricSavings?: MetricSavings,
      /**
       * An estimate for the number of bytes that this insight deems to have been wasted.
       * Bytes are in terms of transfer size: for each component of savings related to an
       * individual request, the insight will estimate its impact on transfer size by using
       * the compression ratio of the resource.
       *
       * This field is only displayed for informational purposes.
       */
      wastedBytes?: number,
      frameId?: string,
      /**
       * If this insight is attached to a navigation, this stores its ID.
       */
      navigationId?: string,
      /** This is lazily-generated because some insights may create many overlays. */
      createOverlays?: () => Types.Overlays.Overlay[],
    };

export type PartialInsightModel<T> =
    Omit<T, 'strings'|'title'|'description'|'category'|'state'|'insightKey'|'navigationId'|'frameId'>;

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

export const enum InsightKeys {
  LCP_BREAKDOWN = 'LCPBreakdown',
  INP_BREAKDOWN = 'INPBreakdown',
  CLS_CULPRITS = 'CLSCulprits',
  THIRD_PARTIES = 'ThirdParties',
  DOCUMENT_LATENCY = 'DocumentLatency',
  DOM_SIZE = 'DOMSize',
  DUPLICATE_JAVASCRIPT = 'DuplicatedJavaScript',
  FONT_DISPLAY = 'FontDisplay',
  FORCED_REFLOW = 'ForcedReflow',
  IMAGE_DELIVERY = 'ImageDelivery',
  LCP_DISCOVERY = 'LCPDiscovery',
  LEGACY_JAVASCRIPT = 'LegacyJavaScript',
  NETWORK_DEPENDENCY_TREE = 'NetworkDependencyTree',
  RENDER_BLOCKING = 'RenderBlocking',
  SLOW_CSS_SELECTOR = 'SlowCSSSelector',
  VIEWPORT = 'Viewport',
  MODERN_HTTP = 'ModernHTTP',
  CACHE = 'Cache',
}
