// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
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

export type InteractionMap = Map<InteractionId, Interaction>;

export class LiveMetrics extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements SDK.TargetManager.Observer {
  #enabled = false;
  #target?: SDK.Target.Target;
  #scriptIdentifier?: Protocol.Page.ScriptIdentifier;
  #lastResetContextId?: Protocol.Runtime.ExecutionContextId;
  #lcpValue?: LCPValue;
  #clsValue?: CLSValue;
  #inpValue?: INPValue;
  #interactions: InteractionMap = new Map();
  #interactionsByGroupId = new Map<Spec.InteractionEntryGroupId, Interaction[]>();
  #layoutShifts: LayoutShift[] = [];
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

  get interactions(): InteractionMap {
    return this.#interactions;
  }

  get layoutShifts(): LayoutShift[] {
    return this.#layoutShifts;
  }

  /**
   * Will create a log message describing the interaction's LoAF scripts.
   * Returns true if the message is successfully logged.
   */
  async logInteractionScripts(interaction: Interaction): Promise<boolean> {
    if (!this.#target) {
      return false;
    }

    const executionContextId = this.#lastResetContextId;
    if (!executionContextId) {
      return false;
    }

    const scriptsTable = [];
    for (const loaf of interaction.longAnimationFrameTimings) {
      for (const script of loaf.scripts) {
        const scriptEndTime = script.startTime + script.duration;
        if (scriptEndTime < interaction.startTime) {
          continue;
        }

        const blockingDuration = Math.round(scriptEndTime - Math.max(interaction.startTime, script.startTime));

        // TODO: Use translated strings for the table
        scriptsTable.push({
          'Blocking duration': blockingDuration,
          'Invoker type': script.invokerType || null,
          Invoker: script.invoker || null,
          Function: script.sourceFunctionName || null,
          Source: script.sourceURL || null,
          'Char position': script.sourceCharPosition || null,
        });
      }
    }

    try {
      const scriptsLimit = Spec.LOAF_LIMIT * Spec.SCRIPTS_PER_LOAF_LIMIT;
      const scriptLimitText = scriptsTable.length === scriptsLimit ? ` (limited to ${scriptsLimit})` : '';
      const loafLimitText = interaction.longAnimationFrameTimings.length === Spec.LOAF_LIMIT ?
          ` (limited to last ${Spec.LOAF_LIMIT})` :
          '';
      await this.#target.runtimeAgent().invoke_evaluate({
        expression: `
          console.group('[DevTools] Long animation frames for ${interaction.duration}ms ${
            interaction.interactionType} interaction');
          console.log('Scripts${scriptLimitText}:');
          console.table(${JSON.stringify(scriptsTable)});
          console.log('Intersecting long animation frame events${loafLimitText}:', ${
            JSON.stringify(interaction.longAnimationFrameTimings)});
          console.groupEnd();
        `,
        contextId: executionContextId,
      });
    } catch {
      return false;
    }

    return true;
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

  #sendStatusUpdate(): void {
    this.dispatchEventToListeners(Events.STATUS, {
      lcp: this.#lcpValue,
      cls: this.#clsValue,
      inp: this.#inpValue,
      interactions: this.#interactions,
      layoutShifts: this.#layoutShifts,
    });
  }

  setStatusForTesting(status: StatusEvent): void {
    this.#lcpValue = status.lcp;
    this.#clsValue = status.cls;
    this.#inpValue = status.inp;
    this.#interactions = status.interactions;
    this.#layoutShifts = status.layoutShifts;
    this.#sendStatusUpdate();
  }

  /**
   * If there is a document update then any node handles we have already resolved will be invalid.
   * This function should re-resolve any relevant DOM nodes after a document update.
   */
  async #onDocumentUpdate(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMModel>): Promise<void> {
    const domModel = event.data;

    const allLayoutAffectedNodes = this.#layoutShifts.flatMap(shift => shift.affectedNodes);
    const toRefresh: Array<{node?: SDK.DOMModel.DOMNode}> =
        [this.#lcpValue || {}, ...this.#interactions.values(), ...allLayoutAffectedNodes];

    const allPromises = toRefresh.map(item => {
      const node = item.node;
      if (node === undefined) {
        return;
      }

      return this.#refreshNode(domModel, node).then(refreshedNode => {
        // In theory, it is possible for `node` to be undefined even though it was defined previously.
        // We should keep the affected nodes consistent from the user perspective, so we will just keep the stale node instead of removing it.
        // This is unlikely to happen in practice.
        if (refreshedNode) {
          item.node = refreshedNode;
        }
      });
    });

    await Promise.all(allPromises);

    this.#sendStatusUpdate();
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
          clusterShiftIds: webVitalsEvent.clusterShiftIds,
        };
        this.#clsValue = event;
        break;
      }
      case 'INP': {
        const inpEvent: INPValue = {
          value: webVitalsEvent.value,
          phases: webVitalsEvent.phases,
          interactionId: `interaction-${webVitalsEvent.entryGroupId}-${webVitalsEvent.startTime}`,
        };
        this.#inpValue = inpEvent;
        break;
      }
      case 'InteractionEntry': {
        const groupInteractions =
            Platform.MapUtilities.getWithDefault(this.#interactionsByGroupId, webVitalsEvent.entryGroupId, () => []);

        // `nextPaintTime` uses the event duration which is rounded to the nearest 8ms. The best we can do
        // is check if the `nextPaintTime`s are within 8ms.
        // https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEntry/duration#event
        let interaction = groupInteractions.find(
            interaction => Math.abs(interaction.nextPaintTime - webVitalsEvent.nextPaintTime) < 8);

        if (!interaction) {
          interaction = {
            interactionId: `interaction-${webVitalsEvent.entryGroupId}-${webVitalsEvent.startTime}`,
            interactionType: webVitalsEvent.interactionType,
            duration: webVitalsEvent.duration,
            eventNames: [],
            phases: webVitalsEvent.phases,
            startTime: webVitalsEvent.startTime,
            nextPaintTime: webVitalsEvent.nextPaintTime,
            longAnimationFrameTimings: webVitalsEvent.longAnimationFrameEntries,
          };

          groupInteractions.push(interaction);
          this.#interactions.set(interaction.interactionId, interaction);
        }

        // We can get multiple instances of the first input interaction since web-vitals.js installs
        // an extra listener for events of type `first-input`. This is a simple way to de-dupe those
        // events without adding complexity to the injected code.
        if (!interaction.eventNames.includes(webVitalsEvent.eventName)) {
          interaction.eventNames.push(webVitalsEvent.eventName);
        }

        if (webVitalsEvent.nodeIndex !== undefined) {
          const node = await this.#resolveDomNode(webVitalsEvent.nodeIndex, executionContextId);
          if (node) {
            interaction.node = node;
          }
        }
        break;
      }
      case 'LayoutShift': {
        const nodePromises = webVitalsEvent.affectedNodeIndices.map(nodeIndex => {
          return this.#resolveDomNode(nodeIndex, executionContextId);
        });

        const affectedNodes = (await Promise.all(nodePromises))
                                  .filter((node): node is SDK.DOMModel.DOMNode => Boolean(node))
                                  .map(node => ({node}));

        const layoutShift: LayoutShift = {
          score: webVitalsEvent.score,
          uniqueLayoutShiftId: webVitalsEvent.uniqueLayoutShiftId,
          affectedNodes,
        };
        this.#layoutShifts.push(layoutShift);
        break;
      }
      case 'reset': {
        this.#lcpValue = undefined;
        this.#clsValue = undefined;
        this.#inpValue = undefined;
        this.#interactions.clear();
        this.#layoutShifts = [];
        break;
      }
    }

    this.#sendStatusUpdate();
  }

  async #getFrameForExecutionContextId(executionContextId: Protocol.Runtime.ExecutionContextId):
      Promise<SDK.ResourceTreeModel.ResourceTreeFrame|null> {
    if (!this.#target) {
      return null;
    }

    const runtimeModel = this.#target.model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
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

    const frameManager = SDK.FrameManager.FrameManager.instance();
    return frameManager.getOrWaitForFrame(frameId);
  }

  async #onBindingCalled(event: {data: Protocol.Runtime.BindingCalledEvent}): Promise<void> {
    const {data} = event;
    if (data.name !== Spec.EVENT_BINDING_NAME) {
      return;
    }

    // Async tasks can be performed while handling an event (e.g. resolving DOM node)
    // Use a mutex here to ensure the events are handled in the order they are received.
    await this.#mutex.run(async () => {
      const frame = await this.#getFrameForExecutionContextId(data.executionContextId);
      if (!frame?.isPrimaryFrame()) {
        return;
      }

      const webVitalsEvent = JSON.parse(data.payload) as Spec.WebVitalsEvent;

      // Previously injected scripts shouldn't persist, this is just a defensive measure.
      // Ensure we only handle events from the same execution context as the most recent "reset" event.
      // "reset" events are only emitted once when the script is injected or a bfcache restoration.
      if (webVitalsEvent.name === 'reset') {
        this.#lastResetContextId = data.executionContextId;
      } else if (this.#lastResetContextId !== data.executionContextId) {
        return;
      }

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
    this.#interactions.clear();
    this.#sendStatusUpdate();
  }

  clearLayoutShifts(): void {
    this.#layoutShifts = [];
    this.#sendStatusUpdate();
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

    // If the user navigates to a page that was pre-rendered then the primary page target
    // will be swapped and the old target will be removed. We should ensure live metrics
    // remain enabled on the new primary page target.
    const primaryPageTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (primaryPageTarget) {
      this.#target = primaryPageTarget;
      await this.enable();
    }
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
    this.#scriptIdentifier = undefined;

    this.#enabled = false;
  }
}

export const enum Events {
  STATUS = 'status',
}

export type InteractionId = `interaction-${number}-${number}`;

export type MetricValue = Pick<Spec.MetricChangeEvent, 'value'>;

export interface LCPValue extends MetricValue {
  phases: Spec.LCPPhases;
  node?: SDK.DOMModel.DOMNode;
}

export interface INPValue extends MetricValue {
  phases: Spec.INPPhases;
  interactionId: InteractionId;
}

export interface CLSValue extends MetricValue {
  clusterShiftIds: Spec.UniqueLayoutShiftId[];
}

export interface LayoutShift {
  score: number;
  uniqueLayoutShiftId: Spec.UniqueLayoutShiftId;
  affectedNodes: Array<{node: SDK.DOMModel.DOMNode}>;
}

export interface Interaction {
  interactionId: InteractionId;
  interactionType: Spec.InteractionEntryEvent['interactionType'];
  eventNames: string[];
  duration: number;
  startTime: number;
  nextPaintTime: number;
  phases: Spec.INPPhases;
  longAnimationFrameTimings: Spec.PerformanceLongAnimationFrameTimingJSON[];
  node?: SDK.DOMModel.DOMNode;
}

export interface StatusEvent {
  lcp?: LCPValue;
  cls?: CLSValue;
  inp?: INPValue;
  interactions: InteractionMap;
  layoutShifts: LayoutShift[];
}

type EventTypes = {
  [Events.STATUS]: StatusEvent,
};
