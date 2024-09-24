// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type INPAttribution, type MetricType} from '../../../../third_party/web-vitals/web-vitals.js';

export const EVENT_BINDING_NAME = '__chromium_devtools_metrics_reporter';
export const INTERNAL_KILL_SWITCH = '__chromium_devtools_kill_live_metrics';

export type MetricChangeEvent = Pick<MetricType, 'name'|'value'>;

export interface LCPPhases {
  timeToFirstByte: number;
  resourceLoadDelay: number;
  resourceLoadTime: number;
  elementRenderDelay: number;
}

export interface LCPChangeEvent extends MetricChangeEvent {
  name: 'LCP';
  phases: LCPPhases;
  nodeIndex?: number;
}

export interface CLSChangeEvent extends MetricChangeEvent {
  name: 'CLS';
}

export interface INPChangeEvent extends MetricChangeEvent {
  name: 'INP';
  interactionType: INPAttribution['interactionType'];
  nodeIndex?: number;
}

export interface InteractionEvent {
  name: 'Interaction';
  interactionType: INPAttribution['interactionType'];
  interactionId: number;
  duration: number;
  nodeIndex?: number;
}

export interface ResetEvent {
  name: 'reset';
}

export type WebVitalsEvent = LCPChangeEvent|CLSChangeEvent|INPChangeEvent|InteractionEvent|ResetEvent;
