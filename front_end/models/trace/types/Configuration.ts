// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export type Configuration = {
  /**
   * Include V8 RCS functions in the JS stacks
   */
  includeRuntimeCallStats: boolean,
  /**
   * Show all events: disable the default filtering which hides and excludes some events.
   */
  showAllEvents: boolean,
  /**
   * Extra detail for RPP developers (eg Trace Event json in Summary, and individual JS Sample events)
   */
  debugMode: boolean,
  /**
   * How many invalidation events will be stored for a layout (or similar) event.
   * On large sites with a lot of DOM there can be thousands of invalidations
   * associated with any given event. It is not useful to show the user 1000s of
   * invalidations in the UI, but it is also expensive for us to hold onto them
   * all, and it helps prevents OOM issues when running in NodeJS
   * [https://github.com/GoogleChrome/lighthouse/issues/16111].
   * Therefore, instead, we store only the latest 20 per event. We do also store
   * the total count, so we can show that, but we'll only ever hold on to the
   * last 20 invalidations (in DESC trace order - so the latest 20 in the trace file)
   *
   * If you set this to 0, we will skip the Invalidations processing entirely.
   * 0 effectively disables the InvalidationsHandler and it will not even
   * attempt to gather or track invalidations.
   */
  maxInvalidationEventsPerEvent: number,
};

export const defaults = (): Configuration => ({
  includeRuntimeCallStats: false,
  showAllEvents: false,
  debugMode: false,
  maxInvalidationEventsPerEvent: 20,
});

/**
 * Generates a key that can be used to represent this config in a cache. This is
 * used mainly in tests, where we want to avoid re-parsing a file if we have
 * already processed it with the same configuration.
 */
export function configToCacheKey(config: Configuration): string {
  return JSON.stringify(config);
}
