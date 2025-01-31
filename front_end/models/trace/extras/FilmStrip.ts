// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
import * as Platform from '../../../core/platform/platform.js';
import type * as Handlers from '../handlers/handlers.js';
import type * as Types from '../types/types.js';

export interface Data {
  zeroTime: Types.Timing.Micro;
  spanTime: Types.Timing.Micro;
  frames: readonly Frame[];
}

export interface Frame {
  screenshotEvent: Types.Events.LegacySyntheticScreenshot|Types.Events.Screenshot;
  index: number;
}

export type HandlersWithFilmStrip = Handlers.Types.HandlersWithMeta<{
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Screenshots: typeof Handlers.ModelHandlers.Screenshots,
}>;

export type HandlerDataWithScreenshots = Handlers.Types.EnabledHandlerDataWithMeta<{
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Screenshots: typeof Handlers.ModelHandlers.Screenshots,
}>;

// Cache film strips based on:
// 1. The trace parsed data object
// 2. The start time.
const filmStripCache = new WeakMap<HandlerDataWithScreenshots, Map<Types.Timing.Micro, Data>>();

export function fromParsedTrace(parsedTrace: HandlerDataWithScreenshots, customZeroTime?: Types.Timing.Micro): Data {
  const frames: Frame[] = [];

  const zeroTime = typeof customZeroTime !== 'undefined' ? customZeroTime : parsedTrace.Meta.traceBounds.min;
  const spanTime = parsedTrace.Meta.traceBounds.range;
  const fromCache = filmStripCache.get(parsedTrace)?.get(zeroTime);
  if (fromCache) {
    return fromCache;
  }

  const screenshots = parsedTrace.Screenshots.screenshots ?? parsedTrace.Screenshots.legacySyntheticScreenshots ?? [];

  for (const screenshotEvent of screenshots) {
    if (screenshotEvent.ts < zeroTime) {
      continue;
    }
    const frame: Frame = {
      index: frames.length,
      screenshotEvent,
    };
    frames.push(frame);
  }

  const result: Data = {
    zeroTime,
    spanTime,
    frames: Array.from(frames),
  };

  const cachedForData =
      Platform.MapUtilities.getWithDefault(filmStripCache, parsedTrace, () => new Map<Types.Timing.Micro, Data>());
  cachedForData.set(zeroTime, result);

  return result;
}

export function frameClosestToTimestamp(filmStrip: Data, searchTimestamp: Types.Timing.Micro): Frame|null {
  const closestFrameIndexBeforeTimestamp = Platform.ArrayUtilities.nearestIndexFromEnd(
      filmStrip.frames, frame => frame.screenshotEvent.ts < searchTimestamp);
  if (closestFrameIndexBeforeTimestamp === null) {
    return null;
  }
  return filmStrip.frames[closestFrameIndexBeforeTimestamp];
}
