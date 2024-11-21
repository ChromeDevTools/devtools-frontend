// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../../models/trace/trace.js';

export function shouldRenderForCategory(options: {
  activeCategory: Trace.Insights.Types.InsightCategory,
  insightCategory: Trace.Insights.Types.InsightCategory,
}): boolean {
  return options.activeCategory === Trace.Insights.Types.InsightCategory.ALL ||
      options.activeCategory === options.insightCategory;
}
