// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {assertNotNullOrUndefined} from '../../core/platform/platform.js';
import * as Coordinator from '../components/render_coordinator/render_coordinator.js';

import {getDomState, isVisible} from './DomState.js';
import {debugString, getLoggingConfig} from './LoggingConfig.js';
import {logChange, logClick, logDrag, logHover, logImpressions, logKeyDown} from './LoggingEvents.js';
import {getOrCreateLoggingState} from './LoggingState.js';

const PROCESS_DOM_INTERVAL = 500;
const KEYBOARD_LOG_INTERVAL = 3000;
const HOVER_LOG_INTERVAL = 1000;
const DRAG_LOG_INTERVAL = 500;

let domProcessingThrottler: Common.Throttler.Throttler;
let keyboardLogThrottler: Common.Throttler.Throttler;
let hoverLogThrottler: Common.Throttler.Throttler;
let dragLogThrottler: Common.Throttler.Throttler;

const mutationObservers = new WeakMap<Node, MutationObserver>();
const documents: Document[] = [];

function observeMutations(roots: Node[]): void {
  for (const root of roots) {
    if (!mutationObservers.has(root)) {
      const observer = new MutationObserver(scheduleProcessDom);
      observer.observe(root, {attributes: true, childList: true, subtree: true});
      mutationObservers.set(root, observer);
    }
  }
}

export async function startLogging(options?: {
  domProcessingThrottler?: Common.Throttler.Throttler,
  keyboardLogThrottler?: Common.Throttler.Throttler,
  hoverLogThrottler?: Common.Throttler.Throttler,
  dragLogThrottler?: Common.Throttler.Throttler,
}): Promise<void> {
  domProcessingThrottler = options?.domProcessingThrottler || new Common.Throttler.Throttler(PROCESS_DOM_INTERVAL);
  keyboardLogThrottler = options?.keyboardLogThrottler || new Common.Throttler.Throttler(KEYBOARD_LOG_INTERVAL);
  hoverLogThrottler = options?.hoverLogThrottler || new Common.Throttler.Throttler(HOVER_LOG_INTERVAL);
  dragLogThrottler = options?.dragLogThrottler || new Common.Throttler.Throttler(DRAG_LOG_INTERVAL);
  await addDocument(document);
}

export async function addDocument(document: Document): Promise<void> {
  documents.push(document);
  if (['interactive', 'complete'].includes(document.readyState)) {
    await processDom();
  }
  document.addEventListener('visibilitychange', scheduleProcessDom);
  document.addEventListener('scroll', scheduleProcessDom);
  observeMutations([document.body]);
}

export function stopLogging(): void {
  for (const document of documents) {
    document.removeEventListener('visibilitychange', scheduleProcessDom);
    document.removeEventListener('scroll', scheduleProcessDom);
    mutationObservers.get(document.body)?.disconnect();
    mutationObservers.delete(document.body);
  }
  const {shadowRoots} = getDomState(documents);
  for (const shadowRoot of shadowRoots) {
    mutationObservers.get(shadowRoot)?.disconnect();
    mutationObservers.delete(shadowRoot);
  }
  documents.length = 0;
}

function scheduleProcessDom(): void {
  void domProcessingThrottler.schedule(
      () => Coordinator.RenderCoordinator.RenderCoordinator.instance().read('processDomForLogging', processDom));
}

let veDebuggingEnabled = false;
let debugPopover: HTMLElement|null = null;

function setVeDebuggingEnabled(enabled: boolean): void {
  veDebuggingEnabled = enabled;
  if (enabled && !debugPopover) {
    debugPopover = document.createElement('div');
    debugPopover.style.position = 'absolute';
    debugPopover.style.bottom = '100px';
    debugPopover.style.left = '100px';
    debugPopover.style.background = 'black';
    debugPopover.style.color = 'white';
    debugPopover.style.zIndex = '100000';
    document.body.appendChild(debugPopover);
  }
}

// @ts-ignore
globalThis.setVeDebuggingEnabled = setVeDebuggingEnabled;

async function processDom(): Promise<void> {
  if (document.hidden) {
    return;
  }
  const startTime = performance.now();
  const {loggables, shadowRoots} = getDomState(documents);
  const visibleElements: Element[] = [];
  const viewportRect = new DOMRect(0, 0, document.documentElement.clientWidth, document.documentElement.clientHeight);
  observeMutations(shadowRoots);
  for (const {element, parent} of loggables) {
    const loggingState = getOrCreateLoggingState(element, getLoggingConfig(element), parent);
    if (!loggingState.impressionLogged) {
      if (isVisible(element, viewportRect)) {
        visibleElements.push(element);
        loggingState.impressionLogged = true;
      }
    }
    if (!loggingState.processed) {
      if (loggingState.config.track?.has('click')) {
        element.addEventListener('click', e => logClick(e.currentTarget as Element, e), {capture: true});
      }
      if (loggingState.config.track?.has('dblclick')) {
        element.addEventListener(
            'dblclick', e => logClick(e.currentTarget as Element, e, {doubleClick: true}), {capture: true});
      }
      const trackHover = loggingState.config.track?.has('hover');
      if (trackHover) {
        element.addEventListener('mouseover', logHover(hoverLogThrottler), {capture: true});
        const cancelLogging = (): Promise<void> => Promise.resolve();
        element.addEventListener('mouseout', () => hoverLogThrottler.schedule(cancelLogging), {capture: true});
      }
      const trackDrag = loggingState.config.track?.has('drag');
      if (trackDrag) {
        element.addEventListener('pointerdown', logDrag(dragLogThrottler), {capture: true});
        const cancelLogging = (): Promise<void> => Promise.resolve();
        element.addEventListener('pointerup', () => dragLogThrottler.schedule(cancelLogging), {capture: true});
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
    if (veDebuggingEnabled && !loggingState.processedForDebugging) {
      (element as HTMLElement).style.outline = 'solid 1px red';
      element.addEventListener('mouseenter', () => {
        assertNotNullOrUndefined(debugPopover);
        debugPopover.style.display = 'block';
        const pathToRoot = [loggingState];
        let ancestor = loggingState.parent;
        while (ancestor) {
          pathToRoot.push(ancestor);
          ancestor = ancestor.parent;
        }
        debugPopover.innerHTML = pathToRoot.map(s => debugString(s.config)).join('<br>');
      }, {capture: true});
      element.addEventListener('mouseleave', () => {
        assertNotNullOrUndefined(debugPopover);
        debugPopover.style.display = 'none';
      }, {capture: true});
      loggingState.processedForDebugging = true;
    }
  }
  await logImpressions(visibleElements);
  Host.userMetrics.visualLoggingProcessingDone(performance.now() - startTime);
}
