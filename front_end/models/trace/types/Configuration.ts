// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export type Configuration = Readonly<{
  settings: {
    showNativeFunctionsInJSProfile: boolean,
  },
  processing: {
    pauseDuration: number,
    eventsPerChunk: number,
  },
}>;

export const DEFAULT: Configuration = {
  settings: {
    showNativeFunctionsInJSProfile: false,
  },
  processing: {
    // How many events should be processed before yielding to the main thread for a pause.
    eventsPerChunk: 15_000,
    // How long the processor should pause between event chunks.
    pauseDuration: 1,
  },
};
