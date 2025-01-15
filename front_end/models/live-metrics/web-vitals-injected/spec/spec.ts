// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {INPAttribution, MetricType} from '../../../../third_party/web-vitals/web-vitals.js';

export const EVENT_BINDING_NAME = '__chromium_devtools_metrics_reporter';
export const INTERNAL_KILL_SWITCH = '__chromium_devtools_kill_live_metrics';

export const SCRIPTS_PER_LOAF_LIMIT = 10;
export const LOAF_LIMIT = 5;

export type MetricChangeEvent = Pick<MetricType, 'name'|'value'>;

export type InteractionEntryGroupId = number&{_tag: 'InteractionEntryGroupId'};
export type UniqueLayoutShiftId = `layout-shift-${number}-${number}`;

export function getUniqueLayoutShiftId(entry: LayoutShift): UniqueLayoutShiftId {
  return `layout-shift-${entry.value}-${entry.startTime}`;
}

export interface LcpPhases {
  timeToFirstByte: number;
  resourceLoadDelay: number;
  resourceLoadTime: number;
  elementRenderDelay: number;
}

export interface InpPhases {
  inputDelay: number;
  processingDuration: number;
  presentationDelay: number;
}

export interface LcpChangeEvent extends MetricChangeEvent {
  name: 'LCP';
  phases: LcpPhases;
  nodeIndex?: number;
}

export interface ClsChangeEvent extends MetricChangeEvent {
  name: 'CLS';
  clusterShiftIds: UniqueLayoutShiftId[];
}

export interface InpChangeEvent extends MetricChangeEvent {
  name: 'INP';
  interactionType: INPAttribution['interactionType'];
  phases: InpPhases;
  startTime: number;
  entryGroupId: InteractionEntryGroupId;
}

// These object keys will be user visible
// TODO: Translate these keys before they are logged to console
/* eslint-disable  @typescript-eslint/naming-convention */
export interface LoAFScript {
  Duration: number;
  'Invoker Type': string|null;
  Invoker: string|null;
  Function: string|null;
  Source: string|null;
  'Char position': number|null;
}
/* eslint-enable  @typescript-eslint/naming-convention */

export interface PerformanceScriptTimingJSON {
  startTime: number;
  duration: number;
  invoker?: string;
  invokerType?: string;
  sourceFunctionName?: string;
  sourceURL?: string;
  sourceCharPosition?: number;
}

export interface PerformanceLongAnimationFrameTimingJSON {
  renderStart: DOMHighResTimeStamp;
  duration: DOMHighResTimeStamp;
  scripts: PerformanceScriptTimingJSON[];
}

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
  phases: InpPhases;
  nodeIndex?: number;
  longAnimationFrameEntries: PerformanceLongAnimationFrameTimingJSON[];
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
    LcpChangeEvent|ClsChangeEvent|InpChangeEvent|InteractionEntryEvent|LayoutShiftEvent|ResetEvent;
