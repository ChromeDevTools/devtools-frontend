// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import type * as Types from '../types/types.js';

import {sortTraceEventsInPlace} from './Trace.js';
import {canBuildTreesFromEvents, treify} from './TreeHelpers.js';

export function buildTrackDataFromExtensionEntries(
    extensionEntries: Types.Extensions.SyntheticExtensionTrackChartEntry[],
    extensionTrackData: Types.Extensions.ExtensionTrackData[]): Types.Extensions.ExtensionTrackData[] {
  const dataByTrack = new Map<string, Omit<Types.Extensions.ExtensionTrackData, 'tree'|'entryToNode'>>();
  for (const entry of extensionEntries) {
    const trackData = Platform.MapUtilities.getWithDefault(dataByTrack, entry.args.track, () => ({
                                                                                            name: entry.args.track,
                                                                                            flameChartEntries: [],
                                                                                          }));
    trackData.flameChartEntries.push(entry);
  }
  for (const trackData of dataByTrack.values()) {
    sortTraceEventsInPlace(trackData.flameChartEntries);
    if (canBuildTreesFromEvents(trackData.flameChartEntries)) {
      treify(trackData.flameChartEntries);
    }
    extensionTrackData.push(trackData);
  }
  return extensionTrackData;
}
