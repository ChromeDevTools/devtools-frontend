// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Types from '../types/types.js';
import * as Handlers from '../handlers/handlers.js';

const enum Status {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  FINISHED_PARSING = 'FINISHED_PARSING',
  ERRORED_WHILE_PARSING = 'ERRORED_WHILE_PARSING',
}

export class TraceParseProgressEvent extends Event {
  static readonly eventName = 'traceparse';
  constructor(public data: TraceParseEventProgressData, init: EventInit = {bubbles: true}) {
    super(TraceParseProgressEvent.eventName, init);
  }
}

export type TraceParseEventProgressData = {
  index: number,
  total: number,
};

export class TraceProcessor<ModelHandlers extends {[key: string]: Handlers.Types.TraceEventHandler}> extends
    EventTarget {
  readonly #traceHandlers: {[key: string]: Handlers.Types.TraceEventHandler};
  #pauseDuration: number;
  #pauseFrequencyMs: number;
  #status = Status.IDLE;

  static create(): TraceProcessor<typeof Handlers.ModelHandlers> {
    return new TraceProcessor(Handlers.ModelHandlers);
  }

  private constructor(traceHandlers: ModelHandlers, {pauseDuration = 20, pauseFrequencyMs = 100} = {}) {
    super();

    this.#traceHandlers = traceHandlers;
    this.#pauseDuration = pauseDuration;
    this.#pauseFrequencyMs = pauseFrequencyMs;
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
    const traceEventIterator = new TraceEventIterator(traceEvents, this.#pauseDuration, this.#pauseFrequencyMs);

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

  get data(): Handlers.Types.HandlerData<ModelHandlers>|null {
    if (this.#status !== Status.FINISHED_PARSING) {
      return null;
    }

    const data = {};
    for (const [name, handler] of Object.entries(this.#traceHandlers)) {
      Object.assign(data, {[name]: handler.data()});
    }

    return data as Handlers.Types.HandlerData<ModelHandlers>;
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
  #time: number;

  constructor(
      private traceEvents: readonly Types.TraceEvents.TraceEventData[], private pauseDuration: number,
      private pauseFrequencyMs: number) {
    this.#time = performance.now();
  }

  async * [Symbol.asyncIterator](): AsyncGenerator<IteratorItem, void, void> {
    for (let i = 0, length = this.traceEvents.length; i < length; i++) {
      // Every so often we take a break just to render.
      if (performance.now() - this.#time > this.pauseFrequencyMs) {
        this.#time = performance.now();
        // Take the opportunity to provide status update events.
        yield {kind: IteratorItemType.STATUS_UPDATE, data: {index: i, total: length}};
        // Wait for rendering before resuming.
        await new Promise(resolve => setTimeout(resolve, this.pauseDuration));
      }

      yield {kind: IteratorItemType.TRACE_EVENT, data: this.traceEvents[i]};
    }
  }
}
