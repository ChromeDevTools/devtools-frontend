// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  type SyntheticTraceEntry,
  type TraceEventArgs,
  type TraceEventData,
} from './TraceEvents.js';

export type ExtensionEntryType = 'track-entry'|'marker';

const extensionPalette = [
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
] as const;

export type ExtensionColorFromPalette = typeof extensionPalette[number];

export function colorIsValid(color: string): boolean {
  return (extensionPalette as readonly string[]).includes(color);
}

export interface ExtensionDataPayload {
  dataType?: 'track-entry'|'marker';
  color?: ExtensionColorFromPalette;
  track?: string;
  detailsPairs?: [string, string][];
  hintText?: string;
}

export interface ExtensionTrackEntryPayload extends ExtensionDataPayload {
  // Typed as possibly undefined since when no data type is provided
  // the entry is defaulted to a track entry
  dataType?: 'track-entry';
  track: string;
}

export interface ExtensionMarkerPayload extends ExtensionDataPayload {
  dataType: 'marker';
  track: undefined;
}

/**
 * Synthetic events created for extension tracks.
 */
export interface SyntheticExtensionTrackChartEntry extends SyntheticTraceEntry {
  args: TraceEventArgs&ExtensionTrackEntryPayload;
  cat: 'devtools.extension';
}

/**
 * Synthetic events created for extension marks.
 */
export interface SyntheticExtensionMarker extends SyntheticTraceEntry {
  args: TraceEventArgs&ExtensionMarkerPayload;
  cat: 'devtools.extension';
}

export type SyntheticExtensionEntry = SyntheticExtensionTrackChartEntry|SyntheticExtensionMarker;

export function isExtensionPayloadMarker(payload: ExtensionDataPayload): payload is ExtensionMarkerPayload {
  return payload.dataType === 'marker';
}

export function isExtensionPayloadTrackEntry(payload: ExtensionDataPayload): payload is ExtensionTrackEntryPayload {
  const hasTrack = 'track' in payload && Boolean(payload.track);
  const validEntryType = payload.dataType === 'track-entry' || payload.dataType === undefined;
  return validEntryType && hasTrack;
}

export function isSyntheticExtensionEntry(entry: TraceEventData): entry is SyntheticExtensionEntry {
  return entry.cat === 'devtools.extension';
}

export interface ExtensionTrackData {
  name: string;
  flameChartEntries: SyntheticExtensionTrackChartEntry[];
}
