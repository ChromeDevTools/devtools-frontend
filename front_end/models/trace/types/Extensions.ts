// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';

import type {
  Args, ConsoleTimeStamp, Event, PerformanceMark, PerformanceMeasureBegin, Phase, SyntheticBased} from
  './TraceEvents.js';

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

export interface ExtensionDataPayloadBase {
  color?: ExtensionColorFromPalette;
  /**
   * We document to users that we support only string values here, but because
   * this is coming from user code the values could be anything, so we ensure we
   * deal with bad data by typing this as unknown.
   */
  properties?: Array<[string, unknown]>;
  tooltipText?: string;
}

export type ExtensionDataPayload = ExtensionTrackEntryPayload|ExtensionMarkerPayload;

export interface ExtensionTrackEntryPayloadDeeplink {
  // The URL (deep-link) to show in the summary for the track.
  url: Platform.DevToolsPath.UrlString;
  // The label to show in front of the URL when the deep-link is shown in the
  // graph.
  description: string;
}

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
  // Additional context (deep-link URL) that can be shown in the summary for the
  // track.
  additionalContext?: ExtensionTrackEntryPayloadDeeplink;
}

export interface ExtensionMarkerPayload extends ExtensionDataPayloadBase {
  dataType: 'marker';
}

/**
 * Synthetic events created for extension tracks.
 */
export interface SyntheticExtensionTrackEntry extends
    SyntheticBased<Phase.COMPLETE, PerformanceMeasureBegin|PerformanceMark|ConsoleTimeStamp> {
  args: Args&ExtensionTrackEntryPayload;
}

/**
 * Synthetic events created for extension marks.
 */
export interface SyntheticExtensionMarker extends SyntheticBased<Phase.INSTANT, PerformanceMark> {
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

export function isConsoleTimestampPayloadTrackEntry(payload: {description?: string, url?: string}):
    payload is ExtensionTrackEntryPayloadDeeplink {
  return payload.url !== undefined && payload.description !== undefined;
}

export function isValidExtensionPayload(
    payload: {track?: string, dataType?: string, description?: string, url?: string}): payload is ExtensionDataPayload|
    ExtensionTrackEntryPayloadDeeplink {
  return isExtensionPayloadMarker(payload) || isExtensionPayloadTrackEntry(payload) ||
      isConsoleTimestampPayloadTrackEntry(payload);
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
  entriesByTrack: Record<string, SyntheticExtensionTrackEntry[]>;
}
