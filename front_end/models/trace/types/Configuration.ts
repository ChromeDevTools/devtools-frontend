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
    eventsPerChunk: 15_000,
    pauseDuration: 1,
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
