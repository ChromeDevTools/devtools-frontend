// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import type * as Types from '../types/types.js';

import {sortTraceEventsInPlace} from './Trace.js';
import {canBuildTreesFromEvents, type TraceEntryNode, treify} from './TreeHelpers.js';

export function buildTrackDataFromExtensionEntries(
    extensionEntries: Types.Extensions.SyntheticExtensionTrackEntry[],
    extensionTrackData: Types.Extensions.ExtensionTrackData[],
    entryToNode: Map<Types.Events.Event, TraceEntryNode>,
    ): {
  extensionTrackData: Types.Extensions.ExtensionTrackData[],
  entryToNode?: Map<Types.Events.Event, TraceEntryNode>,
} {
  const dataByTrack = new Map<string, Types.Extensions.ExtensionTrackData>();
  for (const entry of extensionEntries) {
    // Batch data by track group. For each batch, add the data of every
    // track in the group. In cases where no track group is provided,
    // we use the standalone track data, but use a fixed prefix in the
    // batch key to prevent collisions where a track group has the
    // same name as a standalone track.
    const key = entry.devtoolsObj.trackGroup || `track-name-${entry.devtoolsObj.track}`;
    const batchedData = Platform.MapUtilities.getWithDefault(
        dataByTrack, key, () => ({
                            name: entry.devtoolsObj.trackGroup || entry.devtoolsObj.track,
                            isTrackGroup: Boolean(entry.devtoolsObj.trackGroup),
                            entriesByTrack: {[entry.devtoolsObj.track]: []},
                          }));

    if (!batchedData.entriesByTrack[entry.devtoolsObj.track]) {
      batchedData.entriesByTrack[entry.devtoolsObj.track] = [];
    }
    const entriesInTrack = batchedData.entriesByTrack[entry.devtoolsObj.track];
    entriesInTrack.push(entry);
  }
  // Calculate self time if possible for track entries, on a track
  // by track basis.
  for (const trackData of dataByTrack.values()) {
    for (const entries of Object.values(trackData.entriesByTrack)) {
      sortTraceEventsInPlace(entries);
      if (canBuildTreesFromEvents(entries)) {
        for (const [entry, node] of treify(entries).entryToNode) {
          entryToNode.set(entry, node);
        }
      }
    }
    extensionTrackData.push(trackData);
  }
  return {extensionTrackData, entryToNode};
}
