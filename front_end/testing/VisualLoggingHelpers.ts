// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as VisualLogging from '../ui/visual_logging/visual_logging-testing.js';

export function getVeId(loggable: VisualLogging.Loggable.Loggable|string): number {
  if (typeof loggable === 'string') {
    loggable = document.querySelector(loggable)!;
  }
  return VisualLogging.LoggingState.getLoggingState(loggable)!.veid;
}

/**
 * Returns the 32-bit integer hash generated for a visual logging string identifier.
 */
export async function getVeHash(context: string): Promise<number> {
  const hash = await VisualLogging.LoggingEvents.contextAsNumber(context);
  if (hash === undefined) {
    throw new Error(`Failed to hash ${context}`);
  }
  return hash;
}
