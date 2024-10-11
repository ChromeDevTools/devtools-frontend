// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Args, Event, Phase, SyntheticBased} from './TraceEvents.js';

export type ExtensionEntryType = 'track-entry'|'marker';

export const extensionPalette = [
  'primary',
  'primary-light',
  'primary-dark',
  'secondary',
  'secondary-light',
  'secondary-dark',
  'tertiary',
  'tertiary-light',
  'tertiary-dark',
  'error',
  'warning',
] as const;

export type ExtensionColorFromPalette = typeof extensionPalette[number];

export function colorIsValid(color: string): boolean {
  return (extensionPalette as readonly string[]).includes(color);
}

export interface ExtensionDataPayloadBase {
  color?: ExtensionColorFromPalette;
  properties?: [string, string][];
  tooltipText?: string;
}

export type ExtensionDataPayload = ExtensionTrackEntryPayload|ExtensionMarkerPayload;

export interface ExtensionTrackEntryPayload extends ExtensionDataPayloadBase {
  // Typed as possibly undefined since when no data type is provided
  // the entry is defaulted to a track entry
  dataType?: 'track-entry';
  // The name of the track the entry will be displayed in.
  // Entries intended to be displayed in the same track must contain the
  // same value in this property.
  // If undefined, measurement is added to the Timings track
  track: string;
  // The track group an entry’s track belongs to.
  // Entries intended to be displayed in the same track must contain the
  // same value in this property as well as the same value in the track
  // property.
  trackGroup?: string;
}

export interface ExtensionMarkerPayload extends ExtensionDataPayloadBase {
  dataType: 'marker';
}

/**
 * Synthetic events created for extension tracks.
 */
export interface SyntheticExtensionTrackEntry extends SyntheticBased<Phase.COMPLETE> {
  args: Args&ExtensionTrackEntryPayload;
}

/**
 * Synthetic events created for extension marks.
 */
export interface SyntheticExtensionMarker extends SyntheticBased<Phase.COMPLETE> {
  args: Args&ExtensionMarkerPayload;
}

export type SyntheticExtensionEntry = SyntheticExtensionTrackEntry|SyntheticExtensionMarker;

export function isExtensionPayloadMarker(payload: {dataType?: string}): payload is ExtensionMarkerPayload {
  return payload.dataType === 'marker';
}

export function isExtensionPayloadTrackEntry(payload: {track?: string, dataType?: string}):
    payload is ExtensionTrackEntryPayload {
  const hasTrack = 'track' in payload && Boolean(payload.track);
  const validEntryType = payload.dataType === 'track-entry' || payload.dataType === undefined;
  return validEntryType && hasTrack;
}

export function isValidExtensionPayload(payload: {track?: string, dataType?: string}): payload is ExtensionDataPayload {
  return isExtensionPayloadMarker(payload) || isExtensionPayloadTrackEntry(payload);
}

export function isSyntheticExtensionEntry(entry: Event): entry is SyntheticExtensionEntry {
  return entry.cat === 'devtools.extension';
}

export interface ExtensionTrackData {
  // Name of the top level track. If it's a track group then this value
  // has the name of the group, otherwise it has the name of the track.
  name: string;
  isTrackGroup: boolean;
  // If this contains the data of a track group, this property contains
  // the entries of each of the tracks in the the group. If this is a
  // standalone track, then this contains that track's entries only.
  entriesByTrack: {
    [x: string]: SyntheticExtensionTrackEntry[],
  };
}
