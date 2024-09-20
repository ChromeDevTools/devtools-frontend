// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {HandlerState} from './types.js';

const animations: Types.Events.Animation[] = [];
const animationsSyntheticEvents: Types.Events.SyntheticAnimationPair[] = [];

export interface AnimationData {
  animations: readonly Types.Events.SyntheticAnimationPair[];
}
let handlerState = HandlerState.UNINITIALIZED;

export function reset(): void {
  animations.length = 0;
  animationsSyntheticEvents.length = 0;
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
  handlerState = HandlerState.FINALIZED;
}

export function data(): AnimationData {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('Animation handler is not finalized');
  }

  return {
    animations: animationsSyntheticEvents,
  };
}
