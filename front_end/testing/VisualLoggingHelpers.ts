// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as VisualLogging from '../ui/visual_logging/visual_logging-testing.js';

export function getVeId(loggable: VisualLogging.Loggable.Loggable|string): number {
  if (typeof loggable === 'string') {
    loggable = document.querySelector(loggable)!;
  }
  return VisualLogging.LoggingState.getLoggingState(loggable)!.veid;
}
