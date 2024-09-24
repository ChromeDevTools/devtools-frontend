// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import * as Spec from './web-vitals-injected/spec/spec.js';

const LIVE_METRICS_WORLD_NAME = 'DevTools Performance Metrics';

let liveMetricsInstance: LiveMetrics;

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
  #enabled = false;
  #target?: SDK.Target.Target;
  #scriptIdentifier?: Protocol.Page.ScriptIdentifier;
  #lastResetContextId?: Protocol.Runtime.ExecutionContextId;
  #lcpValue?: LCPValue;
  #clsValue?: CLSValue;
  #inpValue?: INPValue;
  #interactions: InteractionValue[] = [];
  #mutex = new Common.Mutex.Mutex();

  private constructor() {
    super();
    SDK.TargetManager.TargetManager.instance().observeTargets(this);
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): LiveMetrics {
    const {forceNew} = opts;
    if (!liveMetricsInstance || forceNew) {
      liveMetricsInstance = new LiveMetrics();
    }

    return liveMetricsInstance;
  }

  get lcpValue(): LCPValue|undefined {
    return this.#lcpValue;
  }

  get clsValue(): CLSValue|undefined {
    return this.#clsValue;
  }

  get inpValue(): INPValue|undefined {
    return this.#inpValue;
  }

  get interactions(): InteractionValue[] {
    return this.#interactions;
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

  async #refreshNode(domModel: SDK.DOMModel.DOMModel, node: SDK.DOMModel.DOMNode):
      Promise<SDK.DOMModel.DOMNode|undefined> {
    const backendNodeId = node.backendNodeId();
    const nodes = await domModel.pushNodesByBackendIdsToFrontend(new Set([backendNodeId]));
    return nodes?.get(backendNodeId) || undefined;
  }

  /**
   * If there is a document update then any node handles we have already resolved will be invalid.
   * This function should re-resolve any relevant DOM nodes after a document update.
   */
  async #onDocumentUpdate(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMModel>): Promise<void> {
    const domModel = event.data;

    if (this.lcpValue?.node) {
      this.lcpValue.node = await this.#refreshNode(domModel, this.lcpValue.node);
    }

    for (const interaction of this.interactions) {
      if (interaction.node) {
        interaction.node = await this.#refreshNode(domModel, interaction.node);
      }
    }

    this.dispatchEventToListeners(Events.STATUS, {
      lcp: this.#lcpValue,
      cls: this.#clsValue,
      inp: this.#inpValue,
      interactions: this.#interactions,
    });
  }

  async #handleWebVitalsEvent(
      webVitalsEvent: Spec.WebVitalsEvent, executionContextId: Protocol.Runtime.ExecutionContextId): Promise<void> {
    switch (webVitalsEvent.name) {
      case 'LCP': {
        const lcpEvent: LCPValue = {
          value: webVitalsEvent.value,
          phases: webVitalsEvent.phases,
        };
        if (webVitalsEvent.nodeIndex !== undefined) {
          const node = await this.#resolveDomNode(webVitalsEvent.nodeIndex, executionContextId);
          if (node) {
            lcpEvent.node = node;
          }
        }

        this.#lcpValue = lcpEvent;
        break;
      }
      case 'CLS': {
        const event: CLSValue = {
          value: webVitalsEvent.value,
        };
        this.#clsValue = event;
        break;
      }
      case 'INP': {
        const inpEvent: INPValue = {
          value: webVitalsEvent.value,
        };
        this.#inpValue = inpEvent;
        break;
      }
      case 'Interaction': {
        const interactionEvent: InteractionValue = webVitalsEvent;
        if (webVitalsEvent.nodeIndex !== undefined) {
          const node = await this.#resolveDomNode(webVitalsEvent.nodeIndex, executionContextId);
          if (node) {
            interactionEvent.node = node;
          }
        }

        this.#interactions.push(interactionEvent);
        break;
      }
      case 'reset': {
        this.#lcpValue = undefined;
        this.#clsValue = undefined;
        this.#inpValue = undefined;
        this.#interactions = [];
        break;
      }
    }
    this.dispatchEventToListeners(Events.STATUS, {
      lcp: this.#lcpValue,
      cls: this.#clsValue,
      inp: this.#inpValue,
      interactions: this.#interactions,
    });
  }

  #getFrameForExecutionContextId(executionContextId: Protocol.Runtime.ExecutionContextId):
      SDK.ResourceTreeModel.ResourceTreeFrame|null {
    if (!this.#target) {
      return null;
    }

    const runtimeModel = this.#target.model(SDK.RuntimeModel.RuntimeModel);
    const resourceTreeModel = this.#target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!runtimeModel || !resourceTreeModel) {
      return null;
    }

    const executionContext = runtimeModel.executionContext(executionContextId);
    if (!executionContext) {
      return null;
    }

    const frameId = executionContext.frameId;
    if (!frameId) {
      return null;
    }

    const frame = resourceTreeModel.frameForId(frameId);
    if (!frame) {
      return null;
    }

    return frame;
  }

  async #onBindingCalled(event: {data: Protocol.Runtime.BindingCalledEvent}): Promise<void> {
    const {data} = event;
    if (data.name !== Spec.EVENT_BINDING_NAME) {
      return;
    }

    const frame = this.#getFrameForExecutionContextId(data.executionContextId);
    if (!frame?.isMainFrame()) {
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

  async #killAllLiveMetricContexts(): Promise<void> {
    const target = this.#target;
    if (!target) {
      return;
    }

    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      return;
    }

    const killPromises = runtimeModel.executionContexts()
                             .filter(e => e.name === LIVE_METRICS_WORLD_NAME && !e.isDefault)
                             .map(e => target.runtimeAgent().invoke_evaluate({
                               // On the off chance something else creates execution contexts with the exact same name
                               // this expression should just be a noop.
                               expression: `window?.${Spec.INTERNAL_KILL_SWITCH}?.()`,
                               contextId: e.id,
                             }));

    await Promise.all(killPromises);
  }

  clearInteractions(): void {
    this.#interactions = [];
    this.dispatchEventToListeners(Events.STATUS, {
      lcp: this.#lcpValue,
      cls: this.#clsValue,
      inp: this.#inpValue,
      interactions: this.#interactions,
    });
  }

  async targetAdded(target: SDK.Target.Target): Promise<void> {
    if (target !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.#target = target;
    await this.enable();
  }

  async targetRemoved(target: SDK.Target.Target): Promise<void> {
    if (target !== this.#target) {
      return;
    }
    await this.disable();
    this.#target = undefined;
  }

  async enable(): Promise<void> {
    if (!Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_OBSERVATIONS)) {
      return;
    }

    if (Host.InspectorFrontendHost.isUnderTest()) {
      // Enabling this impacts a lot of layout tests; we will work on fixing
      // them but for now it is easier to not run this page in layout tests.
      // b/360064852
      return;
    }

    if (!this.#target || this.#enabled) {
      return;
    }

    const domModel = this.#target.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      return;
    }

    domModel.addEventListener(SDK.DOMModel.Events.DocumentUpdated, this.#onDocumentUpdate, this);

    const runtimeModel = this.#target.model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      return;
    }

    runtimeModel.addEventListener(SDK.RuntimeModel.Events.BindingCalled, this.#onBindingCalled, this);

    await runtimeModel.addBinding({
      name: Spec.EVENT_BINDING_NAME,
      executionContextName: LIVE_METRICS_WORLD_NAME,
    });

    // If DevTools is closed and reopened, the live metrics context from the previous
    // session will persist. We should ensure any old live metrics contexts are killed
    // before starting a new one.
    await this.#killAllLiveMetricContexts();

    const source = await InjectedScript.get();

    const {identifier} = await this.#target.pageAgent().invoke_addScriptToEvaluateOnNewDocument({
      source,
      worldName: LIVE_METRICS_WORLD_NAME,
      runImmediately: true,
    });
    this.#scriptIdentifier = identifier;

    this.#enabled = true;
  }

  async disable(): Promise<void> {
    if (!this.#target || !this.#enabled) {
      return;
    }

    await this.#killAllLiveMetricContexts();

    const runtimeModel = this.#target.model(SDK.RuntimeModel.RuntimeModel);
    if (runtimeModel) {
      await runtimeModel.removeBinding({
        name: Spec.EVENT_BINDING_NAME,
      });

      runtimeModel.removeEventListener(SDK.RuntimeModel.Events.BindingCalled, this.#onBindingCalled, this);
    }

    const domModel = this.#target.model(SDK.DOMModel.DOMModel);
    if (domModel) {
      domModel.removeEventListener(SDK.DOMModel.Events.DocumentUpdated, this.#onDocumentUpdate, this);
    }

    if (this.#scriptIdentifier) {
      await this.#target.pageAgent().invoke_removeScriptToEvaluateOnNewDocument({
        identifier: this.#scriptIdentifier,
      });
    }

    this.#enabled = false;
  }
}

export const enum Events {
  STATUS = 'status',
}

export type MetricValue = Pick<Spec.MetricChangeEvent, 'value'>;

export interface LCPValue extends MetricValue {
  phases: Spec.LCPPhases;
  node?: SDK.DOMModel.DOMNode;
}

export type INPValue = MetricValue;
export type CLSValue = MetricValue;

export type InteractionValue = Pick<Spec.InteractionEvent, 'interactionType'|'duration'>&{
  node?: SDK.DOMModel.DOMNode,
};

export interface StatusEvent {
  lcp?: LCPValue;
  cls?: CLSValue;
  inp?: INPValue;
  interactions: InteractionValue[];
}

type EventTypes = {
  [Events.STATUS]: StatusEvent,
};
