// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Handlers from './handlers/handlers.js';
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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly #traceHandlers: Handlers.Types.HandlersWithMeta<EnabledModelHandlers>;
  #status = Status.IDLE;
  #modelConfiguration = Types.Configuration.DEFAULT;

  static createWithAllHandlers(): TraceProcessor<typeof Handlers.ModelHandlers> {
    return new TraceProcessor(Handlers.ModelHandlers, Types.Configuration.DEFAULT);
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

  updateConfiguration(config: Types.Configuration.Configuration): void {
    this.#modelConfiguration = config;
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
    } catch (e) {
      this.#status = Status.ERRORED_WHILE_PARSING;
      throw e;
    }
  }

  async #parse(traceEvents: readonly Types.TraceEvents.TraceEventData[], freshRecording: boolean): Promise<void> {
    // This iterator steps through all events, periodically yielding back to the
    // main thread to avoid blocking execution. It uses `dispatchEvent` to
    // provide status update events, and other various bits of config like the
    // pause duration and frequency.
    const {pauseDuration, eventsPerChunk} = this.#modelConfiguration.processing;
    const traceEventIterator = new TraceEventIterator(traceEvents, pauseDuration, eventsPerChunk);

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
    for await (const item of traceEventIterator) {
      if (item.kind === IteratorItemType.STATUS_UPDATE) {
        this.dispatchEvent(new TraceParseProgressEvent(item.data));
        continue;
      }
      for (const handler of sortedHandlers) {
        handler.handleEvent(item.data);
      }
    }

    // Finalize.
    for (const handler of sortedHandlers) {
      await handler.finalize?.();
    }
  }

  get data(): Handlers.Types.EnabledHandlerDataWithMeta<EnabledModelHandlers>|null {
    if (this.#status !== Status.FINISHED_PARSING) {
      return null;
    }

    const data = {};
    for (const [name, handler] of Object.entries(this.#traceHandlers)) {
      Object.assign(data, {[name]: handler.data()});
    }

    return data as Handlers.Types.EnabledHandlerDataWithMeta<EnabledModelHandlers>;
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

const enum IteratorItemType {
  TRACE_EVENT = 1,
  STATUS_UPDATE = 2,
}

type IteratorItem = IteratorTraceEventItem|IteratorStatusUpdateItem;

type IteratorTraceEventItem = {
  kind: IteratorItemType.TRACE_EVENT,
  data: Types.TraceEvents.TraceEventData,
};

type IteratorStatusUpdateItem = {
  kind: IteratorItemType.STATUS_UPDATE,
  data: TraceParseEventProgressData,
};

class TraceEventIterator {
  #eventCount: number;

  constructor(
      private traceEvents: readonly Types.TraceEvents.TraceEventData[], private pauseDuration: number,
      private eventsPerChunk: number) {
    this.#eventCount = 0;
  }

  async * [Symbol.asyncIterator](): AsyncGenerator<IteratorItem, void, void> {
    for (let i = 0, length = this.traceEvents.length; i < length; i++) {
      // Every so often we take a break just to render.
      if (++this.#eventCount % this.eventsPerChunk === 0) {
        // Take the opportunity to provide status update events.
        yield {kind: IteratorItemType.STATUS_UPDATE, data: {index: i, total: length}};
        // Wait for rendering before resuming.
        await new Promise(resolve => setTimeout(resolve, this.pauseDuration));
      }

      yield {kind: IteratorItemType.TRACE_EVENT, data: this.traceEvents[i]};
    }
  }
}
