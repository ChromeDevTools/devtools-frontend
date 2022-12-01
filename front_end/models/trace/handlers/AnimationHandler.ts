// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Types from '../types/types.js';

export interface AnimationData {
  animations: readonly Types.TraceEvents.TraceEventAnimation[];
}

const animations: Types.TraceEvents.TraceEventAnimation[] = [];

export function reset(): void {
  animations.length = 0;
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (Types.TraceEvents.isTraceEventAnimation(event)) {
    animations.push(event);
    return;
  }
}

export function data(): AnimationData {
  return {animations};
}
