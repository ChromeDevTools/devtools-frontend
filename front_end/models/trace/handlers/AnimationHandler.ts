// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

let animations: Types.Events.Animation[] = [];
let animationsSyntheticEvents: Types.Events.SyntheticAnimationPair[] = [];

export interface AnimationData {
  animations: readonly Types.Events.SyntheticAnimationPair[];
}

export function reset(): void {
  animations = [];
  animationsSyntheticEvents = [];
}

export function handleEvent(event: Types.Events.Event): void {
  if (Types.Events.isAnimation(event)) {
    animations.push(event);
    return;
  }
}

export async function finalize(): Promise<void> {
  const syntheticEvents = Helpers.Trace.createMatchedSortedSyntheticEvents(animations);
  animationsSyntheticEvents.push(...syntheticEvents);
}

export function data(): AnimationData {
  return {
    animations: animationsSyntheticEvents,
  };
}
