// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import * as Spec from './web-vitals-injected/spec/spec.js';

const LIVE_METRICS_WORLD_NAME = 'live_metrics_world';

class InjectedScript {
  static #injectedScript?: string;
  static async get(): Promise<string> {
    if (!this.#injectedScript) {
      const url = new URL('./web-vitals-injected/web-vitals-injected.generated.js', import.meta.url);
      const result = await fetch(url);
      this.#injectedScript = await result.text();
    }
    return this.#injectedScript;
  }
}

export class LiveMetrics extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements SDK.TargetManager.Observer {
  #target?: SDK.Target.Target;
  #scriptIdentifier?: Protocol.Page.ScriptIdentifier;
  #lastResetContextId?: Protocol.Runtime.ExecutionContextId;
  #mutex = new Common.Mutex.Mutex();

  constructor() {
    super();
    SDK.TargetManager.TargetManager.instance().observeTargets(this);
  }

  /**
   * DOM nodes can't be sent over a runtime binding, so we have to retrieve
   * them separately.
   */
  async #resolveDomNode(index: number, executionContextId: Protocol.Runtime.ExecutionContextId):
      Promise<SDK.DOMModel.DOMNode|null> {
    if (!this.#target) {
      return null;
    }

    const runtimeModel = this.#target.model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      return null;
    }

    const domModel = this.#target.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      return null;
    }

    const {result} = await this.#target.runtimeAgent().invoke_evaluate({
      expression: `window.getNodeForIndex(${index})`,
      contextId: executionContextId,
    });

    if (!result) {
      return null;
    }

    const remoteObject = runtimeModel.createRemoteObject(result);
    return domModel.pushObjectAsNodeToFrontend(remoteObject);
  }

  async #handleWebVitalsEvent(
      webVitalsEvent: Spec.WebVitalsEvent, executionContextId: Protocol.Runtime.ExecutionContextId): Promise<void> {
    switch (webVitalsEvent.name) {
      case 'LCP': {
        const lcpEvent: LCPChangeEvent = {
          value: webVitalsEvent.value,
          rating: webVitalsEvent.rating,
        };
        if (webVitalsEvent.nodeIndex !== undefined) {
          const node = await this.#resolveDomNode(webVitalsEvent.nodeIndex, executionContextId);
          if (node) {
            lcpEvent.node = node;
          }
        }

        this.dispatchEventToListeners(Events.LCPChanged, lcpEvent);
        break;
      }
      case 'CLS': {
        this.dispatchEventToListeners(Events.CLSChanged, {
          value: webVitalsEvent.value,
          rating: webVitalsEvent.rating,
        });
        break;
      }
      case 'INP': {
        const inpEvent: INPChangeEvent = {
          value: webVitalsEvent.value,
          rating: webVitalsEvent.rating,
          interactionType: webVitalsEvent.interactionType,
        };
        if (webVitalsEvent.nodeIndex !== undefined) {
          const node = await this.#resolveDomNode(webVitalsEvent.nodeIndex, executionContextId);
          if (node) {
            inpEvent.node = node;
          }
        }

        this.dispatchEventToListeners(Events.INPChanged, inpEvent);
        break;
      }
      case 'Interaction': {
        const {nodeIndex, ...rest} = webVitalsEvent;
        const interactionEvent: InteractionEvent = rest;
        if (nodeIndex !== undefined) {
          const node = await this.#resolveDomNode(nodeIndex, executionContextId);
          if (node) {
            interactionEvent.node = node;
          }
        }

        this.dispatchEventToListeners(Events.Interaction, interactionEvent);
        break;
      }
      case 'reset': {
        this.dispatchEventToListeners(Events.Reset);
        break;
      }
    }
  }

  async #onBindingCalled(event: {data: Protocol.Runtime.BindingCalledEvent}): Promise<void> {
    const {data} = event;
    if (data.name !== Spec.EVENT_BINDING_NAME) {
      return;
    }

    const webVitalsEvent = JSON.parse(data.payload) as Spec.WebVitalsEvent;

    // Previously injected scripts will persist if DevTools is closed and reopened.
    // Ensure we only handle events from the same execution context as the most recent "reset" event.
    // "reset" events are only emitted once when the script is injected.
    if (webVitalsEvent.name === 'reset') {
      this.#lastResetContextId = data.executionContextId;
    } else if (this.#lastResetContextId !== data.executionContextId) {
      return;
    }

    // Async tasks can be performed while handling an event (e.g. resolving DOM node)
    // Use a mutex here to ensure the events are handled in the order they are received.
    await this.#mutex.run(async () => {
      await this.#handleWebVitalsEvent(webVitalsEvent, data.executionContextId);
    });
  }

  targetAdded(target: SDK.Target.Target): void {
    if (target !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    void this.enable(target);
  }

  targetRemoved(target: SDK.Target.Target): void {
    if (target !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    void this.disable();
  }

  async enable(target: SDK.Target.Target): Promise<void> {
    if (this.#target) {
      return;
    }

    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      return;
    }

    runtimeModel.addEventListener(SDK.RuntimeModel.Events.BindingCalled, this.#onBindingCalled, this);

    await runtimeModel.addBinding({
      name: Spec.EVENT_BINDING_NAME,
      executionContextName: LIVE_METRICS_WORLD_NAME,
    });

    const source = await InjectedScript.get();

    const {identifier} = await target.pageAgent().invoke_addScriptToEvaluateOnNewDocument({
      source,
      worldName: LIVE_METRICS_WORLD_NAME,
      runImmediately: true,
    });
    this.#scriptIdentifier = identifier;

    this.#target = target;
  }

  async disable(): Promise<void> {
    if (!this.#target) {
      return;
    }

    const runtimeModel = this.#target.model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      return;
    }

    if (this.#scriptIdentifier) {
      await this.#target.pageAgent().invoke_removeScriptToEvaluateOnNewDocument({
        identifier: this.#scriptIdentifier,
      });
    }

    await runtimeModel.removeBinding({
      name: Spec.EVENT_BINDING_NAME,
    });

    runtimeModel.removeEventListener(SDK.RuntimeModel.Events.BindingCalled, this.#onBindingCalled, this);

    this.#target = undefined;
  }
}

export const enum Events {
  LCPChanged = 'lcp_changed',
  CLSChanged = 'cls_changed',
  INPChanged = 'inp_changed',
  Interaction = 'interaction',
  Reset = 'reset',
}

export type MetricChangeEvent = Pick<Spec.MetricChangeEvent, 'value'|'rating'>;

export type Rating = Spec.MetricChangeEvent['rating'];

export interface LCPChangeEvent extends MetricChangeEvent {
  node?: SDK.DOMModel.DOMNode;
}

export interface INPChangeEvent extends MetricChangeEvent {
  interactionType: Spec.INPChangeEvent['interactionType'];
  node?: SDK.DOMModel.DOMNode;
}

export type CLSChangeEvent = MetricChangeEvent;

export type InteractionEvent = Pick<Spec.InteractionEvent, 'rating'|'interactionType'|'duration'>&{
  node?: SDK.DOMModel.DOMNode,
};

type EventTypes = {
  [Events.LCPChanged]: LCPChangeEvent,
  [Events.CLSChanged]: CLSChangeEvent,
  [Events.INPChanged]: INPChangeEvent,
  [Events.Interaction]: InteractionEvent,
  [Events.Reset]: void,
};
