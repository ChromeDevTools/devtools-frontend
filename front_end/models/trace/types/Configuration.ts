// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export type Configuration = Readonly<{
  settings: {
      // Currently empty but defining here as we will migrate more settings into this.
  },
  experiments: {
    /**
     * Include V8 RCS in the timeline
     */
    timelineV8RuntimeCallStats: boolean,
    /**
     * Show all events: disable the default filtering which hides and excludes some events.
     */
    timelineShowAllEvents: boolean,
  },
  processing: {
    /**
     * How long the processor should pause between event chunks.
     */
    pauseDuration: number,
    /**
     * How many events should be processed before yielding to the main thread for a pause.
     */
    eventsPerChunk: number,
  },
}>;

export const DEFAULT: Configuration = {
  settings: {},
  experiments: {
    timelineV8RuntimeCallStats: false,
    timelineShowAllEvents: false,
  },
  processing: {

    /**
     * We want to yield regularly to maintain responsiveness. If we yield too often, we're wasting idle time.
     * We could do this by checking `performance.now()` regularly, but it's an expensive call in such a hot loop.
     * `eventsPerChunk` is an approximated proxy metric.
     * But how big a chunk? We're aiming for long tasks that are no smaller than 100ms and not bigger than 200ms.
     * It's CPU dependent, so it should be calibrated on oldish hardware.
     * Illustration of a previous change to `eventsPerChunk`: https://imgur.com/wzp8BnR
     */
    eventsPerChunk: 50_000,
    pauseDuration: 0,
  },
};

/**
 * Generates a key that can be used to represent this config in a cache. This is
 * used mainly in tests, where we want to avoid re-parsing a file if we have
 * already processed it with the same configuration. This cache key purposefully
 * does not include all settings in the configuration; the processing settings
 * do not impact the actual resulting data. Only new flags in the config that
 * alter parsing should be added to this cache key.
 */
export function configToCacheKey(config: Configuration): string {
  return [
    `experiments.timelineShowAllEvents:${config.experiments.timelineShowAllEvents}`,
    `experiments.timelineV8RuntimeCallStats:${config.experiments.timelineV8RuntimeCallStats}`,
  ].join('-');
}
