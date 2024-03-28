// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export {};

declare global {
  namespace globalThis {
    var enableReactNativePerfMetrics: boolean|undefined;
    var enableReactNativePerfMetricsGlobalPostMessage: boolean|undefined;
    var reactNativeDocLink: string|undefined;
    var FB_ONLY__reactNativeFeedbackLink: string|undefined;
  }
}
