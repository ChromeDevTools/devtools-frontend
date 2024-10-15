// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview web-vitals.js doesn't provide a log of all interactions.
 * This solution is hacky but it was recommended by web-vitals devs:
 * b/371052022
 */

import * as WebVitals from '../../../third_party/web-vitals/web-vitals.js';

export function onEachInteraction(onReport: (metric: WebVitals.INPMetricWithAttribution) => void): void {
  WebVitals.entryPreProcessingCallbacks.push((entry: PerformanceEventTiming) => {
    // Wait a microtask so this "pre" processing callback actually
    // becomes a "post" processing callback.
    void Promise.resolve().then(() => {
      if (entry.interactionId) {
        const interaction = WebVitals.attributeINP({
          entries: [entry],
          // The only value we really need for `attributeINP` is `entries`
          // Everything else is included to fill out the type.
          name: 'INP',
          rating: 'good',
          value: entry.duration,
          delta: entry.duration,
          navigationType: 'navigate',
          id: 'N/A',
        });
        onReport(interaction);
      }
    });
  });
}
