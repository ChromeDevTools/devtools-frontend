// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Trace from '../../../models/trace/trace.js';

/**
 * This class holds the Insight that is active when the user has entered the
 * Ask AI flow from the Insights sidebar.
 * Ideally we would just use the InsightModel instance itself, but we need to
 * also store a reference to the parsed trace as we use that to populate the
 * data provided to the LLM, so we use this class as a container for the insight
 * and the parsed trace.
 */
export class ActiveInsight {
  #insight: Trace.Insights.Types.InsightModel<{}, {}>;
  // eslint-disable-next-line no-unused-private-class-members
  #parsedTrace: Trace.Handlers.Types.ParsedTrace;

  constructor(insight: Trace.Insights.Types.InsightModel<{}, {}>, parsedTrace: Trace.Handlers.Types.ParsedTrace) {
    this.#insight = insight;
    this.#parsedTrace = parsedTrace;
  }

  title(): string {
    return this.#insight.title;
  }
}
