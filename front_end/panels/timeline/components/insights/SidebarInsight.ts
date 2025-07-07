// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {InsightModel} from '../../../../models/trace/insights/types.js';
import type * as Trace from '../../../../models/trace/trace.js';
import type * as Overlays from '../../overlays/overlays.js';

export interface InsightDetails {
  title: string;
  description: string;
  internalName: string;
  expanded: boolean;
  estimatedSavingsTime?: Trace.Types.Timing.Milli;
  estimatedSavingsBytes?: number;
}

export class InsightActivated extends Event {
  static readonly eventName = 'insightactivated';

  constructor(public model: InsightModel, public insightSetKey: string) {
    super(InsightActivated.eventName, {bubbles: true, composed: true});
  }
}

export class InsightDeactivated extends Event {
  static readonly eventName = 'insightdeactivated';
  constructor() {
    super(InsightDeactivated.eventName, {bubbles: true, composed: true});
  }
}

export class InsightSetHovered extends Event {
  static readonly eventName = 'insightsethovered';
  constructor(public bounds?: Trace.Types.Timing.TraceWindowMicro) {
    super(InsightSetHovered.eventName, {bubbles: true, composed: true});
  }
}

export class InsightSetZoom extends Event {
  static readonly eventName = 'insightsetzoom';
  constructor(public bounds: Trace.Types.Timing.TraceWindowMicro) {
    super(InsightSetZoom.eventName, {bubbles: true, composed: true});
  }
}

export class InsightProvideOverlays extends Event {
  static readonly eventName = 'insightprovideoverlays';

  constructor(
      public overlays: Trace.Types.Overlays.Overlay[], public options: Overlays.Overlays.TimelineOverlaySetOptions) {
    super(InsightProvideOverlays.eventName, {bubbles: true, composed: true});
  }
}

declare global {
  interface GlobalEventHandlersEventMap {
    [InsightActivated.eventName]: InsightActivated;
    [InsightDeactivated.eventName]: InsightDeactivated;
    [InsightSetHovered.eventName]: InsightSetHovered;
    [InsightSetZoom.eventName]: InsightSetZoom;
    [InsightProvideOverlays.eventName]: InsightProvideOverlays;
  }
}
