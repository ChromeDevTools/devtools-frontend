// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  type SyntheticTraceEntry,
  type TraceEventArgs,
  type TraceEventData,
} from './TraceEvents.js';

export const enum ExtensionEntryType {
  TRACK_ENTRY = 'track-entry',
  MARKER = 'marker',
}

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
  metadata: {dataType: ExtensionEntryType, extensionName: string};
}
export interface ExtensionFlameChartEntryPayload extends ExtensionDataPayload {
  metadata: ExtensionDataPayload['metadata']&{dataType: ExtensionEntryType.TRACK_ENTRY};
  color: ExtensionColorFromPalette;
  track: string;
  detailsPairs?: [string, string][];
  hintText?: string;
}

export interface ExtensionMarkerPayload extends ExtensionDataPayload {
  metadata: ExtensionDataPayload['metadata']&{dataType: ExtensionEntryType.MARKER};
  color: ExtensionColorFromPalette;
  detailsPairs?: [string, string][];
  hintText?: string;
}

export interface SyntheticExtensionFlameChartEntry extends SyntheticTraceEntry {
  args: TraceEventArgs&ExtensionFlameChartEntryPayload;
}

export interface SyntheticExtensionMarker extends SyntheticTraceEntry {
  args: TraceEventArgs&ExtensionMarkerPayload;
}

export type SyntheticExtensionEntry = SyntheticExtensionFlameChartEntry|SyntheticExtensionMarker;

export function validateColorInPayload(payload: ExtensionDataPayload): boolean {
  if (!('color' in payload) || !payload.color) {
    return false;
  }
  const color = payload['color'] as ExtensionColorFromPalette;
  return colorIsValid(color);
}

export function isExtensionPayloadMarker(payload: ExtensionDataPayload): payload is ExtensionMarkerPayload {
  const colorIsValid = validateColorInPayload(payload);
  return payload.metadata.dataType === ExtensionEntryType.MARKER && colorIsValid;
}

export function isExtensionPayloadFlameChartEntry(payload: ExtensionDataPayload):
    payload is ExtensionFlameChartEntryPayload {
  const colorIsValid = validateColorInPayload(payload);
  const hasTrack = 'track' in payload && Boolean(payload.track);
  return payload.metadata.dataType === ExtensionEntryType.TRACK_ENTRY && hasTrack && colorIsValid;
}

export function isSyntheticExtensionEntry(entry: TraceEventData): entry is SyntheticExtensionEntry {
  return entry.cat === 'devtools.extension';
}

/**
 * Synthetic events created for extension tracks.
 */
export interface SyntheticExtensionFlameChartEntry extends SyntheticTraceEntry {
  args: TraceEventArgs&ExtensionFlameChartEntryPayload;
  cat: 'devtools.extension';
}

/**
 * Synthetic events created for extension marks.
 */
export interface SyntheticExtensionMarker extends SyntheticTraceEntry {
  args: TraceEventArgs&ExtensionMarkerPayload;
  cat: 'devtools.extension';
}

export interface ExtensionTrackData {
  name: string;
  extensionName: string;
  flameChartEntries: SyntheticExtensionFlameChartEntry[];
}
