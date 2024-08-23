// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Coordinator from '../components/render_coordinator/render_coordinator.js';

import {processForDebugging, processStartLoggingForDebugging} from './Debugging.js';
import {getDomState, visibleOverlap} from './DomState.js';
import {type Loggable} from './Loggable.js';
import {getLoggingConfig} from './LoggingConfig.js';
import {logChange, logClick, logDrag, logHover, logImpressions, logKeyDown, logResize} from './LoggingEvents.js';
import {getLoggingState, getOrCreateLoggingState, type LoggingState} from './LoggingState.js';
import {getNonDomLoggables, hasNonDomLoggables, unregisterAllLoggables, unregisterLoggables} from './NonDomState.js';

const PROCESS_DOM_INTERVAL = 500;
const KEYBOARD_LOG_INTERVAL = 3000;
const HOVER_LOG_INTERVAL = 1000;
const DRAG_LOG_INTERVAL = 1250;
const DRAG_REPORT_THRESHOLD = 50;
const CLICK_LOG_INTERVAL = 500;
const RESIZE_LOG_INTERVAL = 200;
const RESIZE_REPORT_THRESHOLD = 50;

const noOpThrottler = {
  schedule: async () => {},
} as unknown as Common.Throttler.Throttler;

let processingThrottler = noOpThrottler;
export let keyboardLogThrottler = noOpThrottler;
let hoverLogThrottler = noOpThrottler;
let dragLogThrottler = noOpThrottler;
export let clickLogThrottler = noOpThrottler;
export let resizeLogThrottler = noOpThrottler;

const mutationObserver = new MutationObserver(scheduleProcessing);
const resizeObserver = new ResizeObserver(onResizeOrIntersection);
const intersectionObserver = new IntersectionObserver(onResizeOrIntersection);
const documents: Document[] = [];
const pendingResize = new Map<Element, DOMRect>();
const pendingChange = new Set<Element>();

function observeMutations(roots: Node[]): void {
  for (const root of roots) {
    mutationObserver.observe(root, {attributes: true, childList: true, subtree: true});
  }
}

let logging = false;

export function isLogging(): boolean {
  return logging;
}

export async function startLogging(options?: {
  processingThrottler?: Common.Throttler.Throttler,
  keyboardLogThrottler?: Common.Throttler.Throttler,
  hoverLogThrottler?: Common.Throttler.Throttler,
  dragLogThrottler?: Common.Throttler.Throttler,
  clickLogThrottler?: Common.Throttler.Throttler,
  resizeLogThrottler?: Common.Throttler.Throttler,
}): Promise<void> {
  logging = true;
  processingThrottler = options?.processingThrottler || new Common.Throttler.Throttler(PROCESS_DOM_INTERVAL);
  keyboardLogThrottler = options?.keyboardLogThrottler || new Common.Throttler.Throttler(KEYBOARD_LOG_INTERVAL);
  hoverLogThrottler = options?.hoverLogThrottler || new Common.Throttler.Throttler(HOVER_LOG_INTERVAL);
  dragLogThrottler = options?.dragLogThrottler || new Common.Throttler.Throttler(DRAG_LOG_INTERVAL);
  clickLogThrottler = options?.clickLogThrottler || new Common.Throttler.Throttler(CLICK_LOG_INTERVAL);
  resizeLogThrottler = options?.resizeLogThrottler || new Common.Throttler.Throttler(RESIZE_LOG_INTERVAL);
  processStartLoggingForDebugging();
  await addDocument(document);
}

export async function addDocument(document: Document): Promise<void> {
  documents.push(document);
  if (['interactive', 'complete'].includes(document.readyState)) {
    await process();
  }
  document.addEventListener('visibilitychange', scheduleProcessing);
  document.addEventListener('scroll', scheduleProcessing);
  observeMutations([document.body]);
}

export async function stopLogging(): Promise<void> {
  await keyboardLogThrottler.process?.();
  logging = false;
  unregisterAllLoggables();
  for (const document of documents) {
    document.removeEventListener('visibilitychange', scheduleProcessing);
    document.removeEventListener('scroll', scheduleProcessing);
  }
  mutationObserver.disconnect();
  resizeObserver.disconnect();
  intersectionObserver.disconnect();
  documents.length = 0;
  viewportRects.clear();
  processingThrottler = noOpThrottler;
  pendingResize.clear();
  pendingChange.clear();
}

export function pendingWorkComplete(): Promise<void> {
  return Promise
      .all([
        processingThrottler,
        keyboardLogThrottler,
        hoverLogThrottler,
        dragLogThrottler,
        clickLogThrottler,
        resizeLogThrottler,
      ].map(async throttler => {
        for (let i = 0; throttler.process && i < 3; ++i) {
          await throttler.processCompleted;
        }
      }))
      .then(() => {});
}

async function yieldToResize(): Promise<void> {
  while (resizeLogThrottler.process) {
    await resizeLogThrottler.processCompleted;
  }
}

async function yieldToInteractions(): Promise<void> {
  while (clickLogThrottler.process) {
    await clickLogThrottler.processCompleted;
  }
  while (keyboardLogThrottler.process) {
    await keyboardLogThrottler.processCompleted;
  }
}

function flushPendingChangeEvents(): void {
  for (const element of pendingChange) {
    logPendingChange(element);
  }
}

export async function scheduleProcessing(): Promise<void> {
  if (!processingThrottler) {
    return;
  }
  void processingThrottler.schedule(
      () => Coordinator.RenderCoordinator.RenderCoordinator.instance().read('processForLogging', process));
}

const viewportRects = new Map<Document, DOMRect>();
const viewportRectFor = (element: Element): DOMRect => {
  const ownerDocument = element.ownerDocument;
  const viewportRect = viewportRects.get(ownerDocument) ||
      new DOMRect(0, 0, ownerDocument.defaultView?.innerWidth || 0, ownerDocument.defaultView?.innerHeight || 0);
  viewportRects.set(ownerDocument, viewportRect);
  return viewportRect;
};

async function process(): Promise<void> {
  if (document.hidden) {
    return;
  }
  const startTime = performance.now();
  const {loggables, shadowRoots} = getDomState(documents);
  const visibleLoggables: Loggable[] = [];
  observeMutations(shadowRoots);
  const nonDomRoots: (Loggable|undefined)[] = [undefined];

  for (const {element, parent} of loggables) {
    const loggingState = getOrCreateLoggingState(element, getLoggingConfig(element), parent);
    if (!loggingState.impressionLogged) {
      const overlap = visibleOverlap(element, viewportRectFor(element));
      const visibleSelectOption = element.tagName === 'OPTION' && loggingState.parent?.selectOpen;
      const visible = overlap && (!parent || loggingState.parent?.impressionLogged);
      if (visible || visibleSelectOption) {
        if (overlap) {
          loggingState.size = overlap;
        }
        visibleLoggables.push(element);
        loggingState.impressionLogged = true;
      }
    }
    if (loggingState.impressionLogged && hasNonDomLoggables(element)) {
      nonDomRoots.push(element);
    }
    if (!loggingState.processed) {
      const clickLikeHandler = (doubleClick: boolean) => (e: Event) => {
        const loggable = e.currentTarget as Element;
        maybeCancelDrag(e);
        logClick(clickLogThrottler)(loggable, e, {doubleClick});
      };
      if (loggingState.config.track?.click) {
        element.addEventListener('click', clickLikeHandler(false), {capture: true});
        element.addEventListener('auxclick', clickLikeHandler(false), {capture: true});
        element.addEventListener('contextmenu', clickLikeHandler(false), {capture: true});
      }
      if (loggingState.config.track?.dblclick) {
        element.addEventListener('dblclick', clickLikeHandler(true), {capture: true});
      }
      const trackHover = loggingState.config.track?.hover;
      if (trackHover) {
        element.addEventListener('mouseover', logHover(hoverLogThrottler), {capture: true});
        element.addEventListener(
            'mouseout',
            () => hoverLogThrottler.schedule(cancelLogging, Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE),
            {capture: true});
      }
      const trackDrag = loggingState.config.track?.drag;
      if (trackDrag) {
        element.addEventListener('pointerdown', onDragStart, {capture: true});
        document.addEventListener('pointerup', maybeCancelDrag, {capture: true});
        document.addEventListener('dragend', maybeCancelDrag, {capture: true});
      }
      if (loggingState.config.track?.change) {
        element.addEventListener('input', (event: Event) => {
          if (!(event instanceof InputEvent)) {
            return;
          }
          if (loggingState.lastInputEventType && loggingState.lastInputEventType !== event.inputType) {
            void logPendingChange(element);
          }
          loggingState.lastInputEventType = event.inputType;
          pendingChange.add(element);
        }, {capture: true});
        element.addEventListener('change', () => logPendingChange(element), {capture: true});
        element.addEventListener('focusout', () => {
          if (loggingState.lastInputEventType) {
            void logPendingChange(element);
          }
        }, {capture: true});
      }
      const trackKeyDown = loggingState.config.track?.keydown;
      if (trackKeyDown) {
        element.addEventListener('keydown', e => logKeyDown(keyboardLogThrottler)(e.currentTarget, e), {capture: true});
      }
      if (loggingState.config.track?.resize) {
        resizeObserver.observe(element);
        intersectionObserver.observe(element);
      }
      if (element.tagName === 'SELECT') {
        const onSelectOpen = (e: Event): void => {
          void logClick(clickLogThrottler)(element, e);
          if (loggingState.selectOpen) {
            return;
          }
          loggingState.selectOpen = true;
          void scheduleProcessing();
        };
        element.addEventListener('click', onSelectOpen, {capture: true});
        // Based on MenuListSelectType::ShouldOpenPopupForKey{Down,Press}Event
        element.addEventListener('keydown', event => {
          const e = event as KeyboardEvent;
          if ((Host.Platform.isMac() || e.altKey) && (e.code === 'ArrowDown' || e.code === 'ArrowUp') ||
              (!e.altKey && !e.ctrlKey && e.code === 'F4')) {
            onSelectOpen(event);
          }
        }, {capture: true});
        element.addEventListener('keypress', event => {
          const e = event as KeyboardEvent;
          if (e.key === ' ' || !Host.Platform.isMac() && e.key === '\r') {
            onSelectOpen(event);
          }
        }, {capture: true});
        element.addEventListener('change', e => {
          for (const option of (element as HTMLSelectElement).selectedOptions) {
            if (getLoggingState(option)?.config.track?.click) {
              void logClick(clickLogThrottler)(option, e);
            }
          }
        }, {capture: true});
      }
      loggingState.processed = true;
    }
    processForDebugging(element);
  }
  for (let i = 0; i < nonDomRoots.length; ++i) {
    const root = nonDomRoots[i];
    for (const {loggable, config, parent} of getNonDomLoggables(root)) {
      const loggingState = getOrCreateLoggingState(loggable, config, parent);
      processForDebugging(loggable);
      visibleLoggables.push(loggable);
      loggingState.impressionLogged = true;
      if (hasNonDomLoggables(loggable)) {
        nonDomRoots.push(loggable);
      }
    }
    // No need to track loggable as soon as we've logged the impression
    // We can still log interaction events with a handle to a loggable
    unregisterLoggables(root);
  }
  if (visibleLoggables.length) {
    await yieldToInteractions();
    await yieldToResize();
    flushPendingChangeEvents();
    await logImpressions(visibleLoggables);
  }
  Host.userMetrics.visualLoggingProcessingDone(performance.now() - startTime);
}

function logPendingChange(element: Element): void {
  const loggingState = getLoggingState(element);
  if (!loggingState) {
    return;
  }
  void logChange(element);
  delete loggingState.lastInputEventType;
  pendingChange.delete(element);
}

async function cancelLogging(): Promise<void> {
}

let dragStartX = 0, dragStartY = 0;

function onDragStart(event: Event): void {
  if (!(event instanceof MouseEvent)) {
    return;
  }
  dragStartX = event.screenX;
  dragStartY = event.screenY;
  void logDrag(dragLogThrottler)(event);
}

function maybeCancelDrag(event: Event): void {
  if (!(event instanceof MouseEvent)) {
    return;
  }
  if (Math.abs(event.screenX - dragStartX) >= DRAG_REPORT_THRESHOLD ||
      Math.abs(event.screenY - dragStartY) >= DRAG_REPORT_THRESHOLD) {
    return;
  }
  void dragLogThrottler.schedule(cancelLogging, Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE);
}

function isAncestorOf(state1: LoggingState|null, state2: LoggingState|null): boolean {
  while (state2) {
    if (state2 === state1) {
      return true;
    }
    state2 = state2.parent;
  }
  return false;
}

async function onResizeOrIntersection(entries: ResizeObserverEntry[]|IntersectionObserverEntry[]): Promise<void> {
  for (const entry of entries) {
    const element = entry.target;
    const loggingState = getLoggingState(element);
    const overlap = visibleOverlap(element, viewportRectFor(element)) || new DOMRect(0, 0, 0, 0);
    if (!loggingState?.size) {
      continue;
    }

    let hasPendingParent = false;
    for (const pendingElement of pendingResize.keys()) {
      if (pendingElement === element) {
        continue;
      }
      const pendingState = getLoggingState(pendingElement);
      if (isAncestorOf(pendingState, loggingState)) {
        hasPendingParent = true;
        break;
      }
      if (isAncestorOf(loggingState, pendingState)) {
        pendingResize.delete(pendingElement);
      }
    }
    if (hasPendingParent) {
      continue;
    }
    pendingResize.set(element, overlap);
    void resizeLogThrottler.schedule(async () => {
      if (pendingResize.size) {
        await yieldToInteractions();
        flushPendingChangeEvents();
      }
      for (const [element, overlap] of pendingResize.entries()) {
        const loggingState = getLoggingState(element);
        if (!loggingState) {
          continue;
        }
        if (Math.abs(overlap.width - loggingState.size.width) >= RESIZE_REPORT_THRESHOLD ||
            Math.abs(overlap.height - loggingState.size.height) >= RESIZE_REPORT_THRESHOLD) {
          logResize(element, overlap);
        }
      }
      pendingResize.clear();
    }, Common.Throttler.Scheduling.DELAYED);
  }
}
