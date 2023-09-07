// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export type Configuration = Readonly<{
  settings: {
    showNativeFunctionsInJSProfile: boolean,
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
  settings: {
    showNativeFunctionsInJSProfile: false,
  },
  experiments: {
    timelineV8RuntimeCallStats: false,
    timelineShowAllEvents: false,
  },
  processing: {
    eventsPerChunk: 15_000,
    pauseDuration: 1,
  },
};
