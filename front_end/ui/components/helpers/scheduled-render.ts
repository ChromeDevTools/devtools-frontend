// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Coordinator from '../render_coordinator/render_coordinator.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
const scheduledRenders = new WeakSet<HTMLElement>();
const subsequentRender = new WeakMap<HTMLElement, () => void>();
export async function scheduleRender(component: HTMLElement, callback: () => void): Promise<void> {
  // If scheduleRender is called when there is already a render scheduled for this
  // component, store the callback against the renderer for after the current
  // call has finished.
  if (scheduledRenders.has(component)) {
    subsequentRender.set(component, callback);
    return;
  }

  // Track that there is render rendering, wait for it to finish, and stop tracking.
  scheduledRenders.add(component);
  await coordinator.write(callback);
  scheduledRenders.delete(component);

  // If during the render there was another schedule render call, get
  // the callback and schedule it to happen now.
  if (subsequentRender.has(component)) {
    const newCallback = subsequentRender.get(component);
    subsequentRender.delete(component);
    if (!newCallback) {
      return;
    }

    scheduleRender(component, newCallback);
  }
}

export function isScheduledRender(component: HTMLElement): boolean {
  return scheduledRenders.has(component);
}
