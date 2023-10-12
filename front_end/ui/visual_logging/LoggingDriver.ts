// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Coordinator from '../components/render_coordinator/render_coordinator.js';

import {getDomState, isVisible} from './DomState.js';
import {logChange, logClick, logImpressions, logKeyDown} from './LoggingEvents.js';
import {getLoggingState} from './LoggingState.js';

const PROCESS_DOM_INTERVAL = 500;
const KEYBOARD_LOG_INTERVAL = 3000;

let domProcessingThrottler: Common.Throttler.Throttler;
let keyboardLogThrottler: Common.Throttler.Throttler;

function observeMutations(root: Node): void {
  new MutationObserver(scheduleProcessDom).observe(root, {attributes: true, childList: true, subtree: true});
}

export async function startLogging(
    options?: {domProcessingThrottler?: Common.Throttler.Throttler, keyboardLogThrottler?: Common.Throttler.Throttler}):
    Promise<void> {
  domProcessingThrottler = options?.domProcessingThrottler || new Common.Throttler.Throttler(PROCESS_DOM_INTERVAL);
  keyboardLogThrottler = options?.keyboardLogThrottler || new Common.Throttler.Throttler(KEYBOARD_LOG_INTERVAL);
  if (['interactive', 'complete'].includes(document.readyState)) {
    await processDom();
  }
  document.addEventListener('visibilitychange', scheduleProcessDom);
  window.addEventListener('scroll', scheduleProcessDom);
  observeMutations(document.body);
}

function scheduleProcessDom(): void {
  void domProcessingThrottler.schedule(
      () => Coordinator.RenderCoordinator.RenderCoordinator.instance().read('processDomForLogging', processDom));
}

const observedShadowRoots = new WeakSet<ShadowRoot>();

function observeMutationsInShadowRoots(shadowRoots: ShadowRoot[]): void {
  for (const shadowRoot of shadowRoots) {
    if (!observedShadowRoots.has(shadowRoot)) {
      observeMutations(shadowRoot);
      observedShadowRoots.add(shadowRoot);
    }
  }
}

async function processDom(): Promise<void> {
  if (document.hidden) {
    return;
  }
  const {loggables, shadowRoots} = getDomState();
  const visibleElements: Element[] = [];
  const viewportRect = new DOMRect(0, 0, document.documentElement.clientWidth, document.documentElement.clientHeight);
  observeMutationsInShadowRoots(shadowRoots);
  for (const {element, parent} of loggables) {
    const loggingState = getLoggingState(element, parent);
    if (!loggingState.impressionLogged) {
      if (isVisible(element, viewportRect)) {
        visibleElements.push(element);
        loggingState.impressionLogged = true;
      }
    }
    if (!loggingState.processed) {
      if (loggingState.config.track?.has('click')) {
        element.addEventListener('click', logClick, {capture: true});
      }
      if (loggingState.config.track?.has('change')) {
        element.addEventListener('change', logChange, {capture: true});
      }
      const trackKeyDown = loggingState.config.track?.has('keydown');
      const codes = loggingState.config.track?.get('keydown')?.split(',') || [];
      if (trackKeyDown) {
        element.addEventListener('keydown', logKeyDown(codes, keyboardLogThrottler), {capture: true});
      }
      loggingState.processed = true;
    }
  }
  await logImpressions(visibleElements);
}
