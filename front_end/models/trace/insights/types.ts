// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Handlers from '../handlers/handlers.js';

import type * as InsightsRunners from './InsightRunners.js';

/**
 * Context for which navigation an insight should look at.
 */
export interface NavigationInsightContext {
  frameId: string;
  navigationId: string;
}

type InsightRunnersType = typeof InsightsRunners;

export enum InsightWarning {
  NO_FP = 'NO_FP',
}

export type InsightResult<R extends Record<string, unknown>> = R&{
  warnings?: InsightWarning[],
};

/**
 * Contains insights for a specific navigation.
 */
export type NavigationInsightData<H extends {[key: string]: Handlers.Types.TraceEventHandler}> = {
  [I in keyof EnabledInsightRunners<H>]: ReturnType<EnabledInsightRunners<H>[I]>|Error;
};

/**
 * Contains insights for the entire trace. Insights are grouped by `navigationId`.
 */
export type TraceInsightData<H extends {[key: string]: Handlers.Types.TraceEventHandler}> =
    Map<string, NavigationInsightData<H>>;

/**
 * Maps each enabled insight name to its generate function. Insights that are disabled (i.e. missing one or more dependencies) will be unset.
 */
export type EnabledInsightRunners<H extends {[key: string]: Handlers.Types.TraceEventHandler}> = {
  [I in keyof InsightRunnersType]:
      [Handlers.Types.EnabledHandlerDataWithMeta<H>] extends [Parameters<InsightRunnersType[I]['generateInsight']>[0]] ?
      (traceParsedData: Handlers.Types.EnabledHandlerDataWithMeta<H>, context: NavigationInsightContext) =>
          ReturnType<InsightRunnersType[I]['generateInsight']>:
      never;
};

/**
 * Represents the narrow set of dependencies defined by an insight's `deps()` function. `Meta` is always included regardless of `deps()`.
 */
export type RequiredData<D extends() => Array<keyof typeof Handlers.ModelHandlers>> =
    Handlers.Types.EnabledHandlerDataWithMeta<Pick<typeof Handlers.ModelHandlers, ReturnType<D>[number]>>;
