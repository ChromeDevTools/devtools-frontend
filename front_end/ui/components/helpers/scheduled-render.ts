// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Coordinator from '../render_coordinator/render_coordinator.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
const pendingRenders = new WeakSet<HTMLElement>();
const activeRenders = new WeakSet<HTMLElement>();
const subsequentRender = new WeakMap<HTMLElement, () => void>();
const wrappedCallbacks = new WeakMap<() => void, () => void>();
export async function scheduleRender(component: HTMLElement, callback: () => void): Promise<void> {
  // If scheduleRender is called when there is already a render scheduled for this
  // component, store the callback against the renderer for after the current
  // call has finished.
  if (activeRenders.has(component)) {
    subsequentRender.set(component, callback);
    return;
  }

  // If this render was already scheduled but hasn't started yet, just return.
  if (pendingRenders.has(component)) {
    return;
  }

  pendingRenders.add(component);

  // Create a wrapper around the callback so that we know that it has moved from
  // pending to active. When it has completed we remove it from the active renderers.
  let wrappedCallback = wrappedCallbacks.get(callback);
  if (!wrappedCallback) {
    wrappedCallback = async () => {
      pendingRenders.delete(component);
      activeRenders.add(component);
      try {
        await callback.call(component);
      } catch (error: unknown) {
        console.error(`ScheduledRender: rendering ${component.nodeName.toLowerCase()}:`);
        console.error(error);
        throw error;
      } finally {
        activeRenders.delete(component);
      }
    };

    // Store it for next time so we aren't creating wrappers unnecessarily.
    wrappedCallbacks.set(callback, wrappedCallback);
  }

  // Track that there is render rendering, wait for it to finish, and stop tracking.
  await coordinator.write(wrappedCallback);

  // If during the render there was another schedule render call, get
  // the callback and schedule it to happen now.
  if (subsequentRender.has(component)) {
    const newCallback = subsequentRender.get(component);
    subsequentRender.delete(component);
    if (!newCallback) {
      return;
    }

    void scheduleRender(component, newCallback);
  }
}

export function isScheduledRender(component: HTMLElement): boolean {
  return activeRenders.has(component);
}
