// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {InsightModels, TraceInsightSets} from './types.js';

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
