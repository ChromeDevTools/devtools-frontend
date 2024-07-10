// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Handlers from './handlers/handlers.js';
import * as Insights from './insights/insights.js';
import * as Lantern from './lantern/lantern.js';
import * as LanternComputationData from './LanternComputationData.js';
import * as Types from './types/types.js';

const enum Status {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  FINISHED_PARSING = 'FINISHED_PARSING',
  ERRORED_WHILE_PARSING = 'ERRORED_WHILE_PARSING',
}

export type TraceParseEventProgressData = {
  index: number,
  total: number,
};

export class TraceParseProgressEvent extends Event {
  static readonly eventName = 'traceparseprogress';
  constructor(public data: TraceParseEventProgressData, init: EventInit = {bubbles: true}) {
    super(TraceParseProgressEvent.eventName, init);
  }
}
declare global {
  interface HTMLElementEventMap {
    [TraceParseProgressEvent.eventName]: TraceParseProgressEvent;
  }
}

export class TraceProcessor<EnabledModelHandlers extends {[key: string]: Handlers.Types.TraceEventHandler}> extends
    EventTarget {
  // We force the Meta handler to be enabled, so the TraceHandlers type here is
  // the model handlers the user passes in and the Meta handler.
  readonly #traceHandlers: Handlers.Types.HandlersWithMeta<EnabledModelHandlers>;
  #status = Status.IDLE;
  #modelConfiguration = Types.Configuration.defaults();
  #data: Handlers.Types.EnabledHandlerDataWithMeta<EnabledModelHandlers>|null = null;
  #insights: Insights.Types.TraceInsightData<EnabledModelHandlers>|null = null;

  static createWithAllHandlers(): TraceProcessor<typeof Handlers.ModelHandlers> {
    return new TraceProcessor(Handlers.ModelHandlers, Types.Configuration.defaults());
  }

  static getEnabledInsightRunners<EnabledModelHandlers extends {[key: string]: Handlers.Types.TraceEventHandler}>(
      traceParsedData: Handlers.Types.EnabledHandlerDataWithMeta<EnabledModelHandlers>):
      Insights.Types.EnabledInsightRunners<EnabledModelHandlers> {
    const enabledInsights = {} as Insights.Types.EnabledInsightRunners<EnabledModelHandlers>;
    for (const [name, insight] of Object.entries(Insights.InsightRunners)) {
      const deps = insight.deps();
      if (deps.some(dep => !traceParsedData[dep])) {
        continue;
      }
      Object.assign(enabledInsights, {[name]: insight.generateInsight});
    }
    return enabledInsights;
  }

  constructor(traceHandlers: EnabledModelHandlers, modelConfiguration?: Types.Configuration.Configuration) {
    super();

    this.#verifyHandlers(traceHandlers);
    this.#traceHandlers = {
      Meta: Handlers.ModelHandlers.Meta,
      ...traceHandlers,
    };
    if (modelConfiguration) {
      this.#modelConfiguration = modelConfiguration;
    }
    this.#passConfigToHandlers();
  }

  #passConfigToHandlers(): void {
    for (const handler of Object.values(this.#traceHandlers)) {
      // Bit of an odd double check, but without this TypeScript refuses to let
      // you call the function as it thinks it might be undefined.
      if ('handleUserConfig' in handler && handler.handleUserConfig) {
        handler.handleUserConfig(this.#modelConfiguration);
      }
    }
  }

  /**
   * When the user passes in a set of handlers, we want to ensure that we have all
   * the required handlers. Handlers can depend on other handlers, so if the user
   * passes in FooHandler which depends on BarHandler, they must also pass in
   * BarHandler too. This method verifies that all dependencies are met, and
   * throws if not.
   **/
  #verifyHandlers(providedHandlers: EnabledModelHandlers): void {
    // Tiny optimisation: if the amount of provided handlers matches the amount
    // of handlers in the Handlers.ModelHandlers object, that means that the
    // user has passed in every handler we have. So therefore they cannot have
    // missed any, and there is no need to iterate through the handlers and
    // check the dependencies.
    if (Object.keys(providedHandlers).length === Object.keys(Handlers.ModelHandlers).length) {
      return;
    }
    const requiredHandlerKeys: Set<Handlers.Types.TraceEventHandlerName> = new Set();
    for (const [handlerName, handler] of Object.entries(providedHandlers)) {
      requiredHandlerKeys.add(handlerName as Handlers.Types.TraceEventHandlerName);
      for (const depName of (handler.deps?.() || [])) {
        requiredHandlerKeys.add(depName);
      }
    }

    const providedHandlerKeys = new Set(Object.keys(providedHandlers));
    // We always force the Meta handler to be enabled when creating the
    // Processor, so if it is missing from the set the user gave us that is OK,
    // as we will have enabled it anyway.
    requiredHandlerKeys.delete('Meta');

    for (const requiredKey of requiredHandlerKeys) {
      if (!providedHandlerKeys.has(requiredKey)) {
        throw new Error(`Required handler ${requiredKey} not provided.`);
      }
    }
  }

  reset(): void {
    if (this.#status === Status.PARSING) {
      throw new Error('Trace processor can\'t reset while parsing.');
    }

    const handlers = Object.values(this.#traceHandlers);
    for (const handler of handlers) {
      handler.reset();
    }

    this.#data = null;
    this.#insights = null;
    this.#status = Status.IDLE;
  }

  async parse(traceEvents: readonly Types.TraceEvents.TraceEventData[], freshRecording = false): Promise<void> {
    if (this.#status !== Status.IDLE) {
      throw new Error(`Trace processor can't start parsing when not idle. Current state: ${this.#status}`);
    }
    try {
      this.#status = Status.PARSING;
      await this.#parse(traceEvents, freshRecording);
      this.#status = Status.FINISHED_PARSING;

      // TODO(crbug.com/313905799): `this.traceParsedData` is needed to compute insights, and that getter requires
      // `Status.FINISHED_PARSING`. Consider doing what `this.#computeInsights` does (sets #data)
      // inside #parse to simplify this method.

      // Not actually possible for this to be null.
      const traceParsedData = this.traceParsedData;
      if (traceParsedData) {
        this.#computeInsights(traceParsedData, traceEvents);
      }
    } catch (e) {
      this.#status = Status.ERRORED_WHILE_PARSING;
      throw e;
    }
  }

  async #parse(traceEvents: readonly Types.TraceEvents.TraceEventData[], freshRecording: boolean): Promise<void> {
    /**
     * We want to yield regularly to maintain responsiveness. If we yield too often, we're wasting idle time.
     * We could do this by checking `performance.now()` regularly, but it's an expensive call in such a hot loop.
     * `eventsPerChunk` is an approximated proxy metric.
     * But how big a chunk? We're aiming for long tasks that are no smaller than 100ms and not bigger than 200ms.
     * It's CPU dependent, so it should be calibrated on oldish hardware.
     * Illustration of a previous change to `eventsPerChunk`: https://imgur.com/wzp8BnR
     */
    const eventsPerChunk = 50_000;
    // Convert to array so that we are able to iterate all handlers multiple times.
    const sortedHandlers = [...sortHandlers(this.#traceHandlers).values()];

    // Reset.
    for (const handler of sortedHandlers) {
      handler.reset();
    }

    // Initialize.
    for (const handler of sortedHandlers) {
      handler.initialize?.(freshRecording);
    }

    // Handle each event.
    for (let i = 0; i < traceEvents.length; ++i) {
      // Every so often we take a break just to render.
      if (i % eventsPerChunk === 0 && i) {
        // Take the opportunity to provide status update events.
        this.dispatchEvent(new TraceParseProgressEvent({index: i, total: traceEvents.length}));
        // TODO(paulirish): consider using `scheduler.yield()` or `scheduler.postTask(() => {}, {priority: 'user-blocking'})`
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const event = traceEvents[i];
      for (let j = 0; j < sortedHandlers.length; ++j) {
        sortedHandlers[j].handleEvent(event);
      }
    }

    // Finalize.
    for (const handler of sortedHandlers) {
      if (handler.finalize) {
        // Yield to the UI because finalize() calls can be expensive
        // TODO(jacktfranklin): consider using `scheduler.yield()` or `scheduler.postTask(() => {}, {priority: 'user-blocking'})`
        await new Promise(resolve => setTimeout(resolve, 0));
        await handler.finalize();
      }
    }
  }

  get traceParsedData(): Handlers.Types.EnabledHandlerDataWithMeta<EnabledModelHandlers>|null {
    if (this.#status !== Status.FINISHED_PARSING) {
      return null;
    }

    if (this.#data) {
      return this.#data;
    }

    // Handlers that depend on other handlers do so via .data(), which used to always
    // return a shallow clone of its internal data structures. However, that pattern
    // easily results in egregious amounts of allocation. Now .data() does not do any
    // cloning, and it happens here instead so that users of the trace processor may
    // still assume that the parsed data is theirs.
    // See: crbug/41484172
    const shallowClone = (value: unknown, recurse = true): unknown => {
      if (value instanceof Map) {
        return new Map(value);
      }
      if (value instanceof Set) {
        return new Set(value);
      }
      if (Array.isArray(value)) {
        return [...value];
      }
      if (typeof value === 'object' && value && recurse) {
        const obj: Record<string, unknown> = {};
        for (const [key, v] of Object.entries(value)) {
          obj[key] = shallowClone(v, false);
        }
        return obj;
      }
      return value;
    };

    const traceParsedData = {};
    for (const [name, handler] of Object.entries(this.#traceHandlers)) {
      const data = shallowClone(handler.data());
      Object.assign(traceParsedData, {[name]: data});
    }

    this.#data = traceParsedData as Handlers.Types.EnabledHandlerDataWithMeta<EnabledModelHandlers>;
    return this.#data;
  }

  get insights(): Insights.Types.TraceInsightData<EnabledModelHandlers>|null {
    return this.#insights;
  }

  #createLanternContext(
      traceParsedData: Handlers.Types.EnabledHandlerDataWithMeta<EnabledModelHandlers>,
      traceEvents: readonly Types.TraceEvents.TraceEventData[]): Insights.Types.LanternContext|undefined {
    const requiredHandlers = ['NetworkRequests', 'Workers', 'Meta', 'PageLoadMetrics'];
    for (const requiredHandler of requiredHandlers) {
      if (!(requiredHandler in traceParsedData)) {
        return;
      }
    }

    // Lantern.Types.TraceEvent and Types.TraceEvents.TraceEventData represent the same
    // object - a trace event - but one is more flexible than the other. It should be safe to cast between them.
    const trace: Lantern.Types.Trace = {
      traceEvents: traceEvents as unknown as Lantern.Types.TraceEvent[],
    };
    // NOTE: this isn't typesound - Insights.Types.TraceInsightData would need to be a Record of nullable
    // properties with each possible handler, rather than an empty bag filled with a template parameter.
    // Then the type could be narrowed safely.
    const traceEngineDataNarrowed = this.#data as Handlers.Types.EnabledHandlerDataWithMeta<{
      /* eslint-disable @typescript-eslint/naming-convention */
      Meta: typeof Handlers.ModelHandlers.Meta,
      NetworkRequests: typeof Handlers.ModelHandlers.NetworkRequests,
      PageLoadMetrics: typeof Handlers.ModelHandlers.PageLoadMetrics,
      Workers: typeof Handlers.ModelHandlers.Workers,
      /* eslint-enable @typescript-eslint/naming-convention */
    }>;
    if (!traceEngineDataNarrowed.NetworkRequests.byTime.length) {
      throw new Lantern.Core.LanternError('No network requests found in trace');
    }

    const requests = LanternComputationData.createNetworkRequests(trace, traceEngineDataNarrowed);
    const graph = LanternComputationData.createGraph(requests, trace, traceEngineDataNarrowed);
    const processedNavigation = LanternComputationData.createProcessedNavigation(traceEngineDataNarrowed);

    const networkAnalysis = Lantern.Core.NetworkAnalyzer.analyze(requests);
    const simulator: Lantern.Simulation.Simulator<Types.TraceEvents.SyntheticNetworkRequest> =
        Lantern.Simulation.Simulator.createSimulator({
          networkAnalysis,
          throttlingMethod: 'simulate',
        });

    const computeData = {graph, simulator, processedNavigation};
    const fcpResult = Lantern.Metrics.FirstContentfulPaint.compute(computeData);
    const lcpResult = Lantern.Metrics.LargestContentfulPaint.compute(computeData, {fcpResult});
    const interactiveResult = Lantern.Metrics.Interactive.compute(computeData, {lcpResult});
    const tbtResult = Lantern.Metrics.TotalBlockingTime.compute(computeData, {fcpResult, interactiveResult});
    const metrics = {
      firstContentfulPaint: fcpResult,
      interactive: interactiveResult,
      largestContentfulPaint: lcpResult,
      totalBlockingTime: tbtResult,
    };

    return {graph, simulator, metrics};
  }

  #computeInsights(
      traceParsedData: Handlers.Types.EnabledHandlerDataWithMeta<EnabledModelHandlers>,
      traceEvents: readonly Types.TraceEvents.TraceEventData[]): void {
    this.#insights = new Map();

    const enabledInsightRunners = TraceProcessor.getEnabledInsightRunners(traceParsedData);

    // The lantern sub-context is optional on NavigationInsightContext, so not setting it is OK.
    // This is also a hedge against an error inside Lantern resulting in breaking the entire performance panel.
    // Additionally, many trace fixtures are too old to be processed by Lantern.
    // TODO(crbug.com/313905799): should be created and scoped per-navigation.
    let lantern;
    try {
      lantern = this.#createLanternContext(traceParsedData, traceEvents);
    } catch (e) {
      // Don't allow an error in constructing the Lantern graphs to break the rest of the trace processor.
      // Log unexpected errors, but suppress anything that occurs from a trace being too old.
      // Otherwise tests using old fixtures become way too noisy.
      const expectedErrors = [
        'mainDocumentRequest not found',
        'missing metric scores for main frame',
        'missing metric: FCP',
        'missing metric: LCP',
        'No network requests found in trace',
        'Trace is too old',
      ];
      if (!(e instanceof Lantern.Core.LanternError)) {
        // If this wasn't a managed LanternError, the stack trace is likely needed for debugging.
        console.error(e);
      } else if (!expectedErrors.some(err => e.message === err)) {
        // To reduce noise from tests, only print errors that are not expected to occur because a trace is
        // too old (for which there is no single check).
        console.error(e.message);
      }
    }

    for (const nav of traceParsedData.Meta.mainFrameNavigations) {
      if (!nav.args.frame || !nav.args.data?.navigationId) {
        continue;
      }

      const context: Insights.Types.NavigationInsightContext = {
        frameId: nav.args.frame,
        navigationId: nav.args.data.navigationId,
        lantern,
      };

      const navInsightData = {} as Insights.Types.NavigationInsightData<EnabledModelHandlers>;
      for (const [name, generateInsight] of Object.entries(enabledInsightRunners)) {
        let insightResult;
        try {
          insightResult = generateInsight(traceParsedData, context);
        } catch (err) {
          insightResult = err;
        }
        Object.assign(navInsightData, {[name]: insightResult});
      }

      this.#insights.set(context.navigationId, navInsightData);
    }
  }
}

/**
 * Some Handlers need data provided by others. Dependencies of a handler handler are
 * declared in the `deps` field.
 * @returns A map from trace event handler name to trace event hander whose entries
 * iterate in such a way that each handler is visited after its dependencies.
 */
export function sortHandlers(
    traceHandlers: Partial<{[key in Handlers.Types.TraceEventHandlerName]: Handlers.Types.TraceEventHandler}>):
    Map<Handlers.Types.TraceEventHandlerName, Handlers.Types.TraceEventHandler> {
  const sortedMap = new Map<Handlers.Types.TraceEventHandlerName, Handlers.Types.TraceEventHandler>();
  const visited = new Set<Handlers.Types.TraceEventHandlerName>();
  const visitHandler = (handlerName: Handlers.Types.TraceEventHandlerName): void => {
    if (sortedMap.has(handlerName)) {
      return;
    }
    if (visited.has(handlerName)) {
      let stackPath = '';
      for (const handler of visited) {
        if (stackPath || handler === handlerName) {
          stackPath += `${handler}->`;
        }
      }
      stackPath += handlerName;
      throw new Error(`Found dependency cycle in trace event handlers: ${stackPath}`);
    }
    visited.add(handlerName);
    const handler = traceHandlers[handlerName];
    if (!handler) {
      return;
    }
    const deps = handler.deps?.();
    if (deps) {
      deps.forEach(visitHandler);
    }
    sortedMap.set(handlerName, handler);
  };

  for (const handlerName of Object.keys(traceHandlers)) {
    visitHandler(handlerName as Handlers.Types.TraceEventHandlerName);
  }
  return sortedMap;
}
