// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as WebVitals from '../../../third_party/web-vitals/web-vitals.js';

import * as OnEachInteraction from './OnEachInteraction.js';
import * as Spec from './spec/spec.js';

const {onLCP, onCLS, onINP} = WebVitals.Attribution;
const {onEachInteraction} = OnEachInteraction;

declare const window: Window&{
  getNodeForIndex: (index: number) => Node | undefined,
  [Spec.EVENT_BINDING_NAME]: (payload: string) => void,
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

function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function initialize(): void {
  // `Page.addScriptToEvaluateOnNewDocument` will create a script that runs
  // in all frames. We only want metrics from the main frame so the filter
  // has to be here.
  if (inIframe()) {
    return;
  }

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
    };
    sendEventToDevTools(event);
  }, {reportAllChanges: true});

  onINP(metric => {
    const event: Spec.INPChangeEvent = {
      name: 'INP',
      value: metric.value,
      interactionType: metric.attribution.interactionType,
    };
    const element = metric.attribution.interactionTargetElement;
    if (element) {
      event.nodeIndex = establishNodeIndex(element);
    }
    sendEventToDevTools(event);
  }, {reportAllChanges: true});

  onEachInteraction(interaction => {
    const event: Spec.InteractionEvent = {
      name: 'Interaction',
      duration: interaction.value,
      interactionId: interaction.attribution.interactionId,
      interactionType: interaction.attribution.interactionType,
    };
    const node = interaction.attribution.interactionTargetElement;
    if (node) {
      event.nodeIndex = establishNodeIndex(node);
    }
    sendEventToDevTools(event);
  });
}
initialize();
