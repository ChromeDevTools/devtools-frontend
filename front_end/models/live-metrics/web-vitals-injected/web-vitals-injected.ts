// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as WebVitals from '../../../third_party/web-vitals/web-vitals.js';

import * as OnEachInteraction from './OnEachInteraction.js';
import * as OnEachLayoutShift from './OnEachLayoutShift.js';
import * as Spec from './spec/spec.js';

const {onLCP, onCLS, onINP} = WebVitals.Attribution;
const {onEachInteraction} = OnEachInteraction;
const {onEachLayoutShift} = OnEachLayoutShift;

declare const window: Window&{
  getNodeForIndex: (index: number) => Node | undefined,
  [Spec.INTERNAL_KILL_SWITCH]: () => void,
  [Spec.EVENT_BINDING_NAME]: (payload: string) => void,
};

type ListenerArgs = Parameters<typeof globalThis['addEventListener']>;

const windowListeners: ListenerArgs[] = [];
const documentListeners: ListenerArgs[] = [];
const observers: PerformanceObserver[] = [];

const originalWindowAddListener = Window.prototype.addEventListener;
Window.prototype.addEventListener = function(...args: ListenerArgs) {
  windowListeners.push(args);
  return originalWindowAddListener.call(this, ...args);
};

const originalDocumentAddListener = Document.prototype.addEventListener;
Document.prototype.addEventListener = function(...args: ListenerArgs) {
  documentListeners.push(args);
  return originalDocumentAddListener.call(this, ...args);
};

class InternalPerformanceObserver extends PerformanceObserver {
  constructor(...args: ConstructorParameters<typeof PerformanceObserver>) {
    super(...args);
    observers.push(this);
  }
}
globalThis.PerformanceObserver = InternalPerformanceObserver;

let killed = false;

/**
 * This is a hack solution to remove any listeners that were added by web-vitals.js
 * or additional services in this bundle. Once this function is called, the execution
 * context should be considered dead and a new one will need to be created for live metrics
 * to be served again.
 */
window[Spec.INTERNAL_KILL_SWITCH] = () => {
  if (killed) {
    return;
  }

  for (const observer of observers) {
    observer.disconnect();
  }

  for (const args of windowListeners) {
    window.removeEventListener(...args);
  }

  for (const args of documentListeners) {
    document.removeEventListener(...args);
  }

  killed = true;
};

function sendEventToDevTools(event: Spec.WebVitalsEvent): void {
  const payload = JSON.stringify(event);
  window[Spec.EVENT_BINDING_NAME](payload);
}

const nodeList: Node[] = [];

function establishNodeIndex(node: Node): number {
  const index = nodeList.length;
  nodeList.push(node);
  return index;
}

/**
 * The data sent over the event binding needs to be JSON serializable, so we
 * can't send DOM nodes directly. Instead we create an ID for each node (see
 * `establishNodeIndex`) that we can later use to retrieve a remote object
 * for that node.
 *
 * This function is used by `Runtime.evaluate` calls to get a remote object
 * for the specified index.
 */
window.getNodeForIndex = (index: number): Node|undefined => {
  return nodeList[index];
};

function limitScripts(loafs: Spec.PerformanceLongAnimationFrameTimingJSON[]):
    Spec.PerformanceLongAnimationFrameTimingJSON[] {
  return loafs.map(loaf => {
    const longestScripts: Spec.PerformanceScriptTimingJSON[] = [];
    for (const script of loaf.scripts) {
      if (longestScripts.length < Spec.SCRIPTS_PER_LOAF_LIMIT) {
        longestScripts.push(script);
        continue;
      }

      const shorterIndex = longestScripts.findIndex(s => s.duration < script.duration);
      if (shorterIndex === -1) {
        continue;
      }

      longestScripts[shorterIndex] = script;
    }
    longestScripts.sort((a, b) => a.startTime - b.startTime);
    loaf.scripts = longestScripts;
    return loaf;
  });
}

function initialize(): void {
  sendEventToDevTools({name: 'reset'});

  // We want to treat bfcache navigations like a standard navigations, so emit
  // a reset event when bfcache is restored.
  //
  // Metric functions will also re-emit their values using this listener's callback.
  // To ensure this event is fired before those values are emitted, register this
  // callback before any others.
  WebVitals.onBFCacheRestore(() => {
    sendEventToDevTools({name: 'reset'});
  });

  onLCP(metric => {
    const event: Spec.LCPChangeEvent = {
      name: 'LCP',
      value: metric.value,
      phases: {
        timeToFirstByte: metric.attribution.timeToFirstByte,
        resourceLoadDelay: metric.attribution.resourceLoadDelay,
        resourceLoadTime: metric.attribution.resourceLoadDuration,
        elementRenderDelay: metric.attribution.elementRenderDelay,
      },
    };

    const element = metric.attribution.lcpEntry?.element;
    if (element) {
      event.nodeIndex = establishNodeIndex(element);
    }
    sendEventToDevTools(event);
  }, {reportAllChanges: true});

  onCLS(metric => {
    const event: Spec.CLSChangeEvent = {
      name: 'CLS',
      value: metric.value,
      clusterShiftIds: metric.entries.map(Spec.getUniqueLayoutShiftId),
    };
    sendEventToDevTools(event);
  }, {reportAllChanges: true});

  onINP(metric => {
    const event: Spec.INPChangeEvent = {
      name: 'INP',
      value: metric.value,
      phases: {
        inputDelay: metric.attribution.inputDelay,
        processingDuration: metric.attribution.processingDuration,
        presentationDelay: metric.attribution.presentationDelay,
      },
      startTime: metric.entries[0].startTime,
      entryGroupId: metric.entries[0].interactionId as Spec.InteractionEntryGroupId,
      interactionType: metric.attribution.interactionType,
    };
    sendEventToDevTools(event);
  }, {reportAllChanges: true, durationThreshold: 0});

  onEachInteraction(interaction => {
    // Multiple `InteractionEntry` events can be emitted for the same `uniqueInteractionId`
    // However, it is easier to combine these entries in the DevTools client rather than in
    // this injected code.
    const event: Spec.InteractionEntryEvent = {
      name: 'InteractionEntry',
      duration: interaction.value,
      phases: {
        inputDelay: interaction.attribution.inputDelay,
        processingDuration: interaction.attribution.processingDuration,
        presentationDelay: interaction.attribution.presentationDelay,
      },
      startTime: interaction.entries[0].startTime,
      entryGroupId: interaction.entries[0].interactionId as Spec.InteractionEntryGroupId,
      nextPaintTime: interaction.attribution.nextPaintTime,
      interactionType: interaction.attribution.interactionType,
      eventName: interaction.entries[0].name,
      // To limit the amount of events, just get the last 5 LoAFs
      longAnimationFrameEntries: limitScripts(
          interaction.attribution.longAnimationFrameEntries.slice(-Spec.LOAF_LIMIT).map(loaf => loaf.toJSON())),
    };
    const node = interaction.attribution.interactionTargetElement;
    if (node) {
      event.nodeIndex = establishNodeIndex(node);
    }
    sendEventToDevTools(event);
  });

  onEachLayoutShift(layoutShift => {
    const event: Spec.LayoutShiftEvent = {
      name: 'LayoutShift',
      score: layoutShift.value,
      uniqueLayoutShiftId: Spec.getUniqueLayoutShiftId(layoutShift.entry),
      affectedNodeIndices: layoutShift.attribution.affectedNodes.map(establishNodeIndex),
    };

    sendEventToDevTools(event);
  });
}
initialize();
