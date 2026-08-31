// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as WebVitals from '../../../../third_party/web-vitals/web-vitals.js';
import type * as Trace from '../../../trace/trace.js';

export const EVENT_BINDING_NAME = '__chromium_devtools_metrics_reporter';
export const INTERNAL_KILL_SWITCH = '__chromium_devtools_kill_live_metrics';

export const SCRIPTS_PER_LOAF_LIMIT = 10;
export const LOAF_LIMIT = 5;

export type InteractionEntryGroupId = number&{_tag: 'InteractionEntryGroupId'};
export type UniqueLayoutShiftId = `layout-shift-${number}-${number}`;

export function getUniqueLayoutShiftId(entry: LayoutShift): UniqueLayoutShiftId {
  return `layout-shift-${entry.value}-${entry.startTime}`;
}

export interface LcpSubparts {
  timeToFirstByte: Trace.Types.Timing.Milli;
  resourceLoadDelay: Trace.Types.Timing.Milli;
  resourceLoadTime: Trace.Types.Timing.Milli;
  elementRenderDelay: Trace.Types.Timing.Milli;
}

export interface InpSubparts {
  inputDelay: Trace.Types.Timing.Milli;
  processingDuration: Trace.Types.Timing.Milli;
  presentationDelay: Trace.Types.Timing.Milli;
}

export interface LcpChangeEvent {
  name: 'LCP';
  value: Trace.Types.Timing.Milli;
  subparts: LcpSubparts;
  startedHidden: boolean;
  nodeIndex?: number;
}

export interface ClsChangeEvent {
  name: 'CLS';
  value: number;
  clusterShiftIds: UniqueLayoutShiftId[];
}

export interface InpChangeEvent {
  name: 'INP';
  value: Trace.Types.Timing.Milli;
  interactionType: WebVitals.INPAttribution['interactionType'];
  subparts: InpSubparts;
  startTime?: number;
  entryGroupId?: InteractionEntryGroupId;
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
 * This event is not 1:1 with the interactions that the user sees in the
 * interactions log. It is 1:1 with a web-vitals entry.
 *
 * Note web-vitals can emit "fake" INP events without an interactionType nor a
 * nextPaintTime for small interactions after soft navs or bfcache restores.
 * For hardNavs these would have a FID event, but for soft navs or bfcache
 * restores there is no FID equivalent (it's only emitted once per page)
 * so dummy events without full details are used.
 */
export interface InteractionEntryEvent {
  name: 'InteractionEntry';
  interactionType?: WebVitals.INPAttribution['interactionType'];
  eventName?: string;
  entryGroupId?: InteractionEntryGroupId;
  startTime?: number;
  navigationId?: number;
  nextPaintTime?: number;
  duration: Trace.Types.Timing.Milli;
  subparts: InpSubparts;
  nodeIndex?: number;
  longAnimationFrameEntries: PerformanceLongAnimationFrameTimingJSON[];
}

export type NavigationType = WebVitals.Metric['navigationType'];

export interface LayoutShiftEvent {
  name: 'LayoutShift';
  score: number;
  uniqueLayoutShiftId: UniqueLayoutShiftId;
  affectedNodeIndices: number[];
}

export interface ResetEvent {
  name: 'reset';
  url?: string;
  navigationType?: NavigationType;
}

export function limitScripts(loafs: PerformanceLongAnimationFrameTimingJSON[]):
    PerformanceLongAnimationFrameTimingJSON[] {
  return loafs.map(loaf => {
    loaf.scripts = loaf.scripts.slice()
                       .sort((a, b) => b.duration - a.duration)
                       .slice(0, SCRIPTS_PER_LOAF_LIMIT)
                       .sort((a, b) => a.startTime - b.startTime);
    return loaf;
  });
}

export function createInteractionEntryEvent(interaction: WebVitals.INPMetricWithAttribution): InteractionEntryEvent {
  const event: InteractionEntryEvent = {
    name: 'InteractionEntry',
    duration: interaction.value as Trace.Types.Timing.Milli,
    subparts: {
      inputDelay: interaction.attribution.inputDelay as Trace.Types.Timing.Milli,
      processingDuration: interaction.attribution.processingDuration as Trace.Types.Timing.Milli,
      presentationDelay: interaction.attribution.presentationDelay as Trace.Types.Timing.Milli,
    },
    startTime: interaction.entries?.[0]?.startTime,
    navigationId: interaction.navigationId,
    entryGroupId: interaction.entries?.[0]?.interactionId as InteractionEntryGroupId | undefined,
    nextPaintTime: interaction.attribution.nextPaintTime,
    interactionType: interaction.attribution.interactionType,
    eventName: interaction.entries?.[0]?.name,
    // To limit the amount of events, just get the last 5 LoAFs
    longAnimationFrameEntries: limitScripts(
        interaction.attribution.longAnimationFrameEntries?.slice(-LOAF_LIMIT).map(loaf => loaf.toJSON()) ?? []),
  };
  const target = interaction.attribution.interactionTarget;
  if (target) {
    event.nodeIndex = Number(target);
  }
  return event;
}

export function createInpChangeEvent(metric: WebVitals.INPMetricWithAttribution): InpChangeEvent {
  return {
    name: 'INP',
    value: metric.value as Trace.Types.Timing.Milli,
    subparts: {
      inputDelay: metric.attribution.inputDelay as Trace.Types.Timing.Milli,
      processingDuration: metric.attribution.processingDuration as Trace.Types.Timing.Milli,
      presentationDelay: metric.attribution.presentationDelay as Trace.Types.Timing.Milli,
    },
    startTime: metric.entries?.[0]?.startTime,
    entryGroupId: metric.entries?.[0]?.interactionId as InteractionEntryGroupId | undefined,
    interactionType: metric.attribution.interactionType,
  };
}

export type WebVitalsEvent =
    LcpChangeEvent|ClsChangeEvent|InpChangeEvent|InteractionEntryEvent|LayoutShiftEvent|ResetEvent;
