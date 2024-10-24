// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {INPAttribution, MetricType} from '../../../../third_party/web-vitals/web-vitals.js';

export const EVENT_BINDING_NAME = '__chromium_devtools_metrics_reporter';
export const INTERNAL_KILL_SWITCH = '__chromium_devtools_kill_live_metrics';

export type MetricChangeEvent = Pick<MetricType, 'name'|'value'>;

export type InteractionEntryGroupId = number&{_tag: 'InteractionEntryGroupId'};
export type UniqueLayoutShiftId = `layout-shift-${number}-${number}`;

export function getUniqueLayoutShiftId(entry: LayoutShift): UniqueLayoutShiftId {
  return `layout-shift-${entry.value}-${entry.startTime}`;
}

export interface LCPPhases {
  timeToFirstByte: number;
  resourceLoadDelay: number;
  resourceLoadTime: number;
  elementRenderDelay: number;
}

export interface INPPhases {
  inputDelay: number;
  processingDuration: number;
  presentationDelay: number;
}

export interface LCPChangeEvent extends MetricChangeEvent {
  name: 'LCP';
  phases: LCPPhases;
  nodeIndex?: number;
}

export interface CLSChangeEvent extends MetricChangeEvent {
  name: 'CLS';
  clusterShiftIds: UniqueLayoutShiftId[];
}

export interface INPChangeEvent extends MetricChangeEvent {
  name: 'INP';
  interactionType: INPAttribution['interactionType'];
  phases: INPPhases;
  startTime: number;
  entryGroupId: InteractionEntryGroupId;
}

// These object keys will be user visible
// TODO: Translate these keys before they are logged to console
/* eslint-disable  @typescript-eslint/naming-convention */
export interface LoAFScript {
  'Duration': number;
  'Invoker Type': string|null;
  'Invoker': string|null;
  'Function': string|null;
  'Source': string|null;
  'Char position': number|null;
}
/* eslint-enable  @typescript-eslint/naming-convention */

/**
 * This event is not 1:1 with the interactions that the user sees in the interactions log.
 * It is 1:1 with a `PerformanceEventTiming` entry.
 */
export interface InteractionEntryEvent {
  name: 'InteractionEntry';
  interactionType: INPAttribution['interactionType'];
  eventName: string;
  entryGroupId: InteractionEntryGroupId;
  startTime: number;
  nextPaintTime: number;
  duration: number;
  phases: INPPhases;
  nodeIndex?: number;
  scripts: LoAFScript[];
}

export interface LayoutShiftEvent {
  name: 'LayoutShift';
  score: number;
  uniqueLayoutShiftId: UniqueLayoutShiftId;
  affectedNodeIndices: number[];
}

export interface ResetEvent {
  name: 'reset';
}

export type WebVitalsEvent =
    LCPChangeEvent|CLSChangeEvent|INPChangeEvent|InteractionEntryEvent|LayoutShiftEvent|ResetEvent;
