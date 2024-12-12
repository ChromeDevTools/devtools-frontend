// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as CrUXManager from '../../crux-manager/crux-manager.js';
import * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

import {getLogNormalScore} from './Statistics.js';
import type {InsightModels, InsightSet, TraceInsightSets} from './types.js';

export function getInsight<InsightName extends keyof InsightModels>(
    insightName: InsightName, insights: TraceInsightSets|null, key: string|null): InsightModels[InsightName]|null {
  if (!insights || !key) {
    return null;
  }

  const insightSets = insights.get(key);
  if (!insightSets) {
    return null;
  }

  const insight = insightSets.model[insightName];
  if (insight instanceof Error) {
    return null;
  }

  // For some reason typescript won't narrow the type by removing Error, so do it manually.
  return insight as InsightModels[InsightName];
}

export function getLCP(insights: TraceInsightSets|null, key: string|null):
    {value: Types.Timing.MicroSeconds, event: Types.Events.LargestContentfulPaintCandidate}|null {
  const insight = getInsight('LCPPhases', insights, key);
  if (!insight || !insight.lcpMs || !insight.lcpEvent) {
    return null;
  }

  const value = Helpers.Timing.millisecondsToMicroseconds(insight.lcpMs);
  return {value, event: insight.lcpEvent};
}

export function getINP(insights: TraceInsightSets|null, key: string|null):
    {value: Types.Timing.MicroSeconds, event: Types.Events.SyntheticInteractionPair}|null {
  const insight = getInsight('InteractionToNextPaint', insights, key);
  if (!insight?.longestInteractionEvent?.dur) {
    return null;
  }

  const value = insight.longestInteractionEvent.dur;
  return {value, event: insight.longestInteractionEvent};
}

export function getCLS(
    insights: TraceInsightSets|null, key: string|null): {value: number, worstShiftEvent: Types.Events.Event|null} {
  const insight = getInsight('CLSCulprits', insights, key);
  if (!insight) {
    // Unlike the other metrics, there is always a value for CLS even with no data.
    return {value: 0, worstShiftEvent: null};
  }

  // TODO(cjamcl): the CLS insight should be doing this for us.
  let maxScore = 0;
  let worstCluster;
  for (const cluster of insight.clusters) {
    if (cluster.clusterCumulativeScore > maxScore) {
      maxScore = cluster.clusterCumulativeScore;
      worstCluster = cluster;
    }
  }

  return {value: maxScore, worstShiftEvent: worstCluster?.worstShiftEvent ?? null};
}

export function evaluateLCPMetricScore(value: number): number {
  return getLogNormalScore({p10: 2500, median: 4000}, value);
}

export function evaluateINPMetricScore(value: number): number {
  return getLogNormalScore({p10: 200, median: 500}, value);
}

export function evaluateCLSMetricScore(value: number): number {
  return getLogNormalScore({p10: 0.1, median: 0.25}, value);
}

export function calculateMetricWeightsForSorting(
    insightSet: InsightSet, metadata: Types.File.MetaData|null): {lcp: number, inp: number, cls: number} {
  const weights = {
    lcp: 1 / 3,
    inp: 1 / 3,
    cls: 1 / 3,
  };

  const cruxFieldData = metadata?.cruxFieldData;
  if (!cruxFieldData) {
    return weights;
  }

  const getPageResult = (url: string, origin: string): CrUXManager.PageResult|undefined => {
    return cruxFieldData.find(result => {
      const key = (result['url-ALL'] || result['origin-ALL'])?.record.key;
      return (key?.url && key.url === url) || (key?.origin && key.origin === origin);
    });
  };
  const getMetricValue = (pageResult: CrUXManager.PageResult, name: CrUXManager.StandardMetricNames): number|null => {
    const score = pageResult['url-ALL']?.record.metrics[name]?.percentiles?.p75 ??
        pageResult['origin-ALL']?.record.metrics[name]?.percentiles?.p75;
    if (typeof score === 'number') {
      return score;
    }
    if (typeof score === 'string' && Number.isFinite(Number(score))) {
      return Number(score);
    }
    return null;
  };

  const pageResult = getPageResult(insightSet.url.href, insightSet.url.origin);
  if (!pageResult) {
    return weights;
  }

  const fieldLcp = getMetricValue(pageResult, 'largest_contentful_paint');
  const fieldInp = getMetricValue(pageResult, 'interaction_to_next_paint');
  const fieldCls = getMetricValue(pageResult, 'cumulative_layout_shift');
  const fieldLcpScore = fieldLcp !== null ? evaluateLCPMetricScore(fieldLcp) : 0;
  const fieldInpScore = fieldInp !== null ? evaluateINPMetricScore(fieldInp) : 0;
  const fieldClsScore = fieldCls !== null ? evaluateCLSMetricScore(fieldCls) : 0;
  const fieldLcpScoreInverted = 1 - fieldLcpScore;
  const fieldInpScoreInverted = 1 - fieldInpScore;
  const fieldClsScoreInverted = 1 - fieldClsScore;
  const invertedSum = fieldLcpScoreInverted + fieldInpScoreInverted + fieldClsScoreInverted;
  if (!invertedSum) {
    return weights;
  }

  weights.lcp = fieldLcpScoreInverted / invertedSum;
  weights.inp = fieldInpScoreInverted / invertedSum;
  weights.cls = fieldClsScoreInverted / invertedSum;

  return weights;
}
