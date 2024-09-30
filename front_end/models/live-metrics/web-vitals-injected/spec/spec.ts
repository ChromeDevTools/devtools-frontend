// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type INPAttribution, type MetricType} from '../../../../third_party/web-vitals/web-vitals.js';

export const EVENT_BINDING_NAME = '__chromium_devtools_metrics_reporter';
export const INTERNAL_KILL_SWITCH = '__chromium_devtools_kill_live_metrics';

export type MetricChangeEvent = Pick<MetricType, 'name'|'value'>;

export type UniqueInteractionId = `interaction-${number}-${number}`;
export type UniqueLayoutShiftId = `layout-shift-${number}-${number}`;

/**
 * An interaction can have multiple associated `PerformanceEventTiming`s.
 * The `interactionId` available on `PerformanceEventTiming` isn't guaranteed to be unique. (e.g. a `keyup` event issued long after a `keydown` event will have the same `interactionId`).
 * Double-keying with the start time of the longest entry should uniquely identify each interaction.
 */
export function getUniqueInteractionId(entries: PerformanceEventTiming[]): UniqueInteractionId {
  const longestEntry = entries.reduce((prev, curr) => {
    if (prev.duration === curr.duration) {
      return prev.startTime < curr.startTime ? prev : curr;
    }
    return prev.duration > curr.duration ? prev : curr;
  });
  return `interaction-${longestEntry.interactionId}-${longestEntry.startTime}`;
}

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
  uniqueInteractionId: UniqueInteractionId;
}

export interface InteractionEvent {
  name: 'Interaction';
  interactionType: INPAttribution['interactionType'];
  uniqueInteractionId: UniqueInteractionId;
  duration: number;
  nodeIndex?: number;
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

export type WebVitalsEvent = LCPChangeEvent|CLSChangeEvent|INPChangeEvent|InteractionEvent|LayoutShiftEvent|ResetEvent;
