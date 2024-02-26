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

/**
 * Contains insights for a specific navigation.
 */
export type NavigationInsightData = {
  [I in keyof InsightRunnersType]?: ReturnType<InsightRunnersType[I]['generateInsight']>;
};

/**
 * Contains insights for the entire trace. Insights are grouped by `navigationId`.
 */
export type TraceInsightData = Map<string, NavigationInsightData>;

/**
 * Maps each enabled insight name to its generate function. Insights that are disabled (i.e. missing one or more dependencies) will be unset/undefined.
 */
export type EnabledInsightRunners<EnabledModelHandlers extends {[key: string]: Handlers.Types.TraceEventHandler}> = {
  [I in keyof InsightRunnersType]?: (
      traceParsedData: Handlers.Types.EnabledHandlerDataWithMeta<EnabledModelHandlers>,
      context: NavigationInsightContext) => ReturnType<InsightRunnersType[I]['generateInsight']>;
};

/**
 * Represents the narrow set of dependencies defined by an insight's `deps()` function.
 */
export type RequiredData<D extends() => Array<keyof typeof Handlers.ModelHandlers>> =
    Pick<Handlers.Types.EnabledHandlerDataWithMeta<typeof Handlers.ModelHandlers>, ReturnType<D>[number]>;
