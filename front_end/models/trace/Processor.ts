// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Handlers from './handlers/handlers.js';
import * as Helpers from './helpers/helpers.js';
import * as Insights from './insights/insights.js';
import * as Lantern from './lantern/lantern.js';
import * as LanternComputationData from './LanternComputationData.js';
import type * as Model from './ModelImpl.js';
import * as Types from './types/types.js';

const enum Status {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  FINISHED_PARSING = 'FINISHED_PARSING',
  ERRORED_WHILE_PARSING = 'ERRORED_WHILE_PARSING',
}

export class TraceParseProgressEvent extends Event {
  static readonly eventName = 'traceparseprogress';
  constructor(public data: Model.TraceParseEventProgressData, init: EventInit = {bubbles: true}) {
    super(TraceParseProgressEvent.eventName, init);
  }
}

/**
 * Parsing a trace can take time. On large traces we see a breakdown of time like so:
 *   - handleEvent() loop:  ~20%
 *   - finalize() loop:     ~60%
 *   - shallowClone calls:  ~20%
 * The numbers below are set so we can report a progress percentage of [0...1]
 */
const enum ProgressPhase {
  HANDLE_EVENT = 0.2,
  FINALIZE = 0.8,
  CLONE = 1.0,
}
function calculateProgress(value: number, phase: ProgressPhase): number {
  // Finalize values should be [0.2...0.8]
  if (phase === ProgressPhase.FINALIZE) {
    return (value * (ProgressPhase.FINALIZE - ProgressPhase.HANDLE_EVENT)) + ProgressPhase.HANDLE_EVENT;
  }
  return value * phase;
}

declare global {
  interface HTMLElementEventMap {
    [TraceParseProgressEvent.eventName]: TraceParseProgressEvent;
  }
}

export interface ParseOptions {
  /**
   * If the trace was just recorded on the current page, rather than an imported file.
   * @default false
   */
  isFreshRecording?: boolean;
  /**
   * If the trace is a CPU Profile rather than a Chrome tracing trace.
   * @default false
   */
  isCPUProfile?: boolean;
}

export class TraceProcessor extends EventTarget {
  // We force the Meta handler to be enabled, so the TraceHandlers type here is
  // the model handlers the user passes in and the Meta handler.
  readonly #traceHandlers: Partial<Handlers.Types.Handlers>;
  #status = Status.IDLE;
  #modelConfiguration = Types.Configuration.defaults();
  #data: Handlers.Types.ParsedTrace|null = null;
  #insights: Insights.Types.TraceInsightSets|null = null;

  static createWithAllHandlers(): TraceProcessor {
    return new TraceProcessor(Handlers.ModelHandlers, Types.Configuration.defaults());
  }

  static getEnabledInsightRunners(parsedTrace: Handlers.Types.ParsedTrace): Partial<Insights.Types.InsightRunnersType> {
    const enabledInsights = {} as Insights.Types.InsightRunnersType;
    for (const [name, insight] of Object.entries(Insights.InsightRunners)) {
      const deps = insight.deps();
      if (deps.some(dep => !parsedTrace[dep])) {
        continue;
      }
      Object.assign(enabledInsights, {[name]: insight});
    }
    return enabledInsights;
  }

  constructor(traceHandlers: Partial<Handlers.Types.Handlers>, modelConfiguration?: Types.Configuration.Configuration) {
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
  #verifyHandlers(providedHandlers: Partial<Handlers.Types.Handlers>): void {
    // Tiny optimisation: if the amount of provided handlers matches the amount
    // of handlers in the Handlers.ModelHandlers object, that means that the
    // user has passed in every handler we have. So therefore they cannot have
    // missed any, and there is no need to iterate through the handlers and
    // check the dependencies.
    if (Object.keys(providedHandlers).length === Object.keys(Handlers.ModelHandlers).length) {
      return;
    }
    const requiredHandlerKeys: Set<Handlers.Types.HandlerName> = new Set();
    for (const [handlerName, handler] of Object.entries(providedHandlers)) {
      requiredHandlerKeys.add(handlerName as Handlers.Types.HandlerName);
      const deps = 'deps' in handler ? handler.deps() : [];
      for (const depName of deps) {
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

  async parse(traceEvents: readonly Types.Events.Event[], options: ParseOptions): Promise<void> {
    if (this.#status !== Status.IDLE) {
      throw new Error(`Trace processor can't start parsing when not idle. Current state: ${this.#status}`);
    }
    try {
      this.#status = Status.PARSING;
      await this.#computeParsedTrace(traceEvents, Boolean(options.isFreshRecording));
      if (this.#data && !options.isCPUProfile) {  // We do not calculate insights for CPU Profiles.
        this.#computeInsights(this.#data, traceEvents);
      }
      this.#status = Status.FINISHED_PARSING;
    } catch (e) {
      this.#status = Status.ERRORED_WHILE_PARSING;
      throw e;
    }
  }

  /**
   * Run all the handlers and set the result to `#data`.
   */
  async #computeParsedTrace(traceEvents: readonly Types.Events.Event[], freshRecording: boolean): Promise<void> {
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
        const percent = calculateProgress(i / traceEvents.length, ProgressPhase.HANDLE_EVENT);
        this.dispatchEvent(new TraceParseProgressEvent({percent}));
        // TODO(paulirish): consider using `scheduler.yield()` or `scheduler.postTask(() => {}, {priority: 'user-blocking'})`
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const event = traceEvents[i];
      for (let j = 0; j < sortedHandlers.length; ++j) {
        sortedHandlers[j].handleEvent(event);
      }
    }

    // Finalize.
    for (const [i, handler] of sortedHandlers.entries()) {
      if (handler.finalize) {
        // Yield to the UI because finalize() calls can be expensive
        // TODO(jacktfranklin): consider using `scheduler.yield()` or `scheduler.postTask(() => {}, {priority: 'user-blocking'})`
        await new Promise(resolve => setTimeout(resolve, 0));
        await handler.finalize();
      }
      const percent = calculateProgress(i / sortedHandlers.length, ProgressPhase.FINALIZE);
      this.dispatchEvent(new TraceParseProgressEvent({percent}));
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

    const parsedTrace = {};
    for (const [name, handler] of Object.entries(this.#traceHandlers)) {
      const data = shallowClone(handler.data());
      Object.assign(parsedTrace, {[name]: data});
    }
    this.dispatchEvent(new TraceParseProgressEvent({percent: ProgressPhase.CLONE}));

    this.#data = parsedTrace as Handlers.Types.ParsedTrace;
  }

  get parsedTrace(): Handlers.Types.ParsedTrace|null {
    if (this.#status !== Status.FINISHED_PARSING) {
      return null;
    }

    return this.#data;
  }

  get insights(): Insights.Types.TraceInsightSets|null {
    if (this.#status !== Status.FINISHED_PARSING) {
      return null;
    }

    return this.#insights;
  }

  #createLanternContext(
      parsedTrace: Handlers.Types.ParsedTrace, traceEvents: readonly Types.Events.Event[], frameId: string,
      navigationId: string): Insights.Types.LanternContext|undefined {
    // Check for required handlers.
    if (!parsedTrace.NetworkRequests || !parsedTrace.Workers || !parsedTrace.PageLoadMetrics) {
      return;
    }
    if (!parsedTrace.NetworkRequests.byTime.length) {
      throw new Lantern.Core.LanternError('No network requests found in trace');
    }

    const navStarts = parsedTrace.Meta.navigationsByFrameId.get(frameId);
    const navStartIndex = navStarts?.findIndex(n => n.args.data?.navigationId === navigationId);
    if (!navStarts || navStartIndex === undefined || navStartIndex === -1) {
      throw new Lantern.Core.LanternError('Could not find navigation start');
    }

    const startTime = navStarts[navStartIndex].ts;
    const endTime = navStartIndex + 1 < navStarts.length ? navStarts[navStartIndex + 1].ts : Number.POSITIVE_INFINITY;
    const boundedTraceEvents = traceEvents.filter(e => e.ts >= startTime && e.ts < endTime);

    // Lantern.Types.TraceEvent and Types.Events.Event represent the same
    // object - a trace event - but one is more flexible than the other. It should be safe to cast between them.
    const trace: Lantern.Types.Trace = {
      traceEvents: boundedTraceEvents as unknown as Lantern.Types.TraceEvent[],
    };

    const requests = LanternComputationData.createNetworkRequests(trace, parsedTrace, startTime, endTime);
    const graph = LanternComputationData.createGraph(requests, trace, parsedTrace);
    const processedNavigation = LanternComputationData.createProcessedNavigation(parsedTrace, frameId, navigationId);

    const networkAnalysis = Lantern.Core.NetworkAnalyzer.analyze(requests);
    const simulator: Lantern.Simulation.Simulator<Types.Events.SyntheticNetworkRequest> =
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

  #computeInsightSets(
      insights: Insights.Types.TraceInsightSets, parsedTrace: Handlers.Types.ParsedTrace,
      insightRunners: Partial<typeof Insights.InsightRunners>, context: Insights.Types.InsightSetContext): void {
    const data = {} as Insights.Types.InsightSets['data'];

    for (const [name, insight] of Object.entries(insightRunners)) {
      let insightResult;
      try {
        insightResult = insight.generateInsight(parsedTrace, context);
      } catch (err) {
        insightResult = err;
      }
      Object.assign(data, {[name]: insightResult});
    }

    let id, urlString, navigation;
    if (context.navigation) {
      id = context.navigationId;
      urlString = context.navigation.args.data?.documentLoaderURL ?? parsedTrace.Meta.mainFrameURL;
      navigation = context.navigation;
    } else {
      id = Types.Events.NO_NAVIGATION;
      urlString = parsedTrace.Meta.mainFrameURL;
    }

    let url;
    try {
      url = new URL(urlString);
    } catch {
      // We're pretty sure this only happens for our test fixture: missing-url.json.gz. Shouldn't
      // happen for real traces.
      return;
    }

    const insightSets = {
      id,
      url,
      navigation,
      frameId: context.frameId,
      bounds: context.bounds,
      data,
    };
    insights.set(insightSets.id, insightSets);
  }

  /**
   * Run all the insights and set the result to `#insights`.
   */
  #computeInsights(parsedTrace: Handlers.Types.ParsedTrace, traceEvents: readonly Types.Events.Event[]): void {
    this.#insights = new Map();

    const enabledInsightRunners = TraceProcessor.getEnabledInsightRunners(parsedTrace);

    const navigations = parsedTrace.Meta.mainFrameNavigations.filter(
        navigation => navigation.args.frame && navigation.args.data?.navigationId);

    // Check if there is a meaningful chunk of work happening prior to the first navigation.
    // If so, we run the insights on that initial bounds.
    // Otherwise, there are no navigations and we do a no-navigation insights pass on the entire trace.
    if (navigations.length) {
      const bounds = Helpers.Timing.traceWindowFromMicroSeconds(parsedTrace.Meta.traceBounds.min, navigations[0].ts);
      // When using "Record and reload" option, it typically takes ~5ms. So use 50ms to be safe.
      const threshold = Helpers.Timing.millisecondsToMicroseconds(50 as Types.Timing.MilliSeconds);
      if (bounds.range > threshold) {
        const context: Insights.Types.InsightSetContext = {
          bounds,
          frameId: parsedTrace.Meta.mainFrameId,
        };
        this.#computeInsightSets(this.#insights, parsedTrace, enabledInsightRunners, context);
      }
      // If threshold is not met, then the very beginning of the trace is ignored by the insights engine.
    } else {
      const context: Insights.Types.InsightSetContext = {
        bounds: parsedTrace.Meta.traceBounds,
        frameId: parsedTrace.Meta.mainFrameId,
      };
      this.#computeInsightSets(this.#insights, parsedTrace, enabledInsightRunners, context);
    }

    // Now run the insights for each navigation in isolation.
    for (const [i, navigation] of navigations.entries()) {
      // The above filter guarantees these are present.
      const frameId = navigation.args.frame;
      const navigationId = navigation.args.data?.navigationId as string;

      // The lantern sub-context is optional on InsightSetContext, so not setting it is OK.
      // This is also a hedge against an error inside Lantern resulting in breaking the entire performance panel.
      // Additionally, many trace fixtures are too old to be processed by Lantern.
      let lantern;
      try {
        lantern = this.#createLanternContext(parsedTrace, traceEvents, frameId, navigationId);
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

      const min = navigation.ts;
      const max = i + 1 < navigations.length ? navigations[i + 1].ts : parsedTrace.Meta.traceBounds.max;
      const bounds = Helpers.Timing.traceWindowFromMicroSeconds(min, max);
      const context: Insights.Types.InsightSetContext = {
        bounds,
        frameId,
        navigation,
        navigationId,
        lantern,
      };

      this.#computeInsightSets(this.#insights, parsedTrace, enabledInsightRunners, context);
    }
  }
}

/**
 * Some Handlers need data provided by others. Dependencies of a handler handler are
 * declared in the `deps` field.
 * @returns A map from trace event handler name to trace event hander whose entries
 * iterate in such a way that each handler is visited after its dependencies.
 */
export function sortHandlers(traceHandlers: Partial<{[key in Handlers.Types.HandlerName]: Handlers.Types.Handler}>):
    Map<Handlers.Types.HandlerName, Handlers.Types.Handler> {
  const sortedMap = new Map<Handlers.Types.HandlerName, Handlers.Types.Handler>();
  const visited = new Set<Handlers.Types.HandlerName>();
  const visitHandler = (handlerName: Handlers.Types.HandlerName): void => {
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
    visitHandler(handlerName as Handlers.Types.HandlerName);
  }
  return sortedMap;
}
