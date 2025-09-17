// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';

import * as Handlers from './handlers/handlers.js';
import * as Helpers from './helpers/helpers.js';
import type * as Insights from './insights/insights.js';
import {TraceParseProgressEvent, TraceProcessor} from './Processor.js';
import * as Types from './types/types.js';

// Note: this model is implemented in a way that can support multiple trace
// processors. Currently there is only one implemented, but you will see
// references to "processors" plural because it can easily be extended in the future.

/**
 * The Model is responsible for parsing arrays of raw trace events and storing the
 * resulting data. It can store multiple traces at once, and can return the data for
 * any of them.
 *
 * Most uses of this class should be through `createWithAllHandlers`, but
 * `createWithSubsetOfHandlers` can be used to run just some handlers.
 **/
export class Model extends EventTarget {
  readonly #traces: ParsedTrace[] = [];
  readonly #nextNumberByDomain = new Map<string, number>();

  readonly #recordingsAvailable: string[] = [];
  #lastRecordingIndex = 0;
  #processor: TraceProcessor;
  #config: Types.Configuration.Configuration = Types.Configuration.defaults();

  static createWithAllHandlers(config?: Types.Configuration.Configuration): Model {
    return new Model(Handlers.ModelHandlers, config);
  }

  /**
   * Runs only the provided handlers.
   *
   * Callers must ensure they are providing all dependant handlers (although Meta is included automatically),
   * and must know that the result of `.parsedTrace` will be limited to the handlers provided, even though
   * the type won't reflect that.
   */
  static createWithSubsetOfHandlers(
      traceHandlers: Partial<Handlers.Types.Handlers>, config?: Types.Configuration.Configuration): Model {
    return new Model(traceHandlers as Handlers.Types.Handlers, config);
  }

  constructor(handlers: Handlers.Types.Handlers, config?: Types.Configuration.Configuration) {
    super();
    if (config) {
      this.#config = config;
    }
    this.#processor = new TraceProcessor(handlers, this.#config);
  }

  /**
   * Parses an array of trace events into a structured object containing all the
   * information parsed by the trace handlers.
   * You can `await` this function to pause execution until parsing is complete,
   * or instead rely on the `ModuleUpdateEvent` that is dispatched when the
   * parsing is finished.
   *
   * Once parsed, you then have to call the `parsedTrace` method, providing an
   * index of the trace you want to have the data for. This is because any model
   * can store a number of traces. Each trace is given an index, which starts at 0
   * and increments by one as a new trace is parsed.
   *
   * @example
   * // Awaiting the parse method() to block until parsing complete
   * await this.traceModel.parse(events);
   * const data = this.traceModel.parsedTrace(0)
   * @example
   * // Using an event listener to be notified when tracing is complete.
   * this.traceModel.addEventListener(Trace.ModelUpdateEvent.eventName, (event) => {
   *   if(event.data.data === 'done') {
   *     // trace complete
   *     const data = this.traceModel.parsedTrace(0);
   *   }
   * });
   * void this.traceModel.parse(events);
   **/
  async parse(traceEvents: readonly Types.Events.Event[], config?: Types.Configuration.ParseOptions): Promise<void> {
    const metadata = config?.metadata || {};
    // During parsing, periodically update any listeners on each processors'
    // progress (if they have any updates).
    const onTraceUpdate = (event: Event): void => {
      const {data} = event as TraceParseProgressEvent;
      this.dispatchEvent(new ModelUpdateEvent({type: ModelUpdateType.PROGRESS_UPDATE, data}));
    };

    this.#processor.addEventListener(TraceParseProgressEvent.eventName, onTraceUpdate);

    // TODO(cjamcl): this.#processor.parse needs this to work. So it should either take it as input, or create it itself.
    const syntheticEventsManager = Helpers.SyntheticEvents.SyntheticEventsManager.createAndActivate(traceEvents);

    try {
      // Wait for all outstanding promises before finishing the async execution,
      // but perform all tasks in parallel.
      await this.#processor.parse(traceEvents, config ?? {});
      if (!this.#processor.data) {
        throw new Error('processor did not parse trace');
      }
      const file = this.#storeAndCreateParsedTraceFile(
          syntheticEventsManager, traceEvents, metadata, this.#processor.data, this.#processor.insights);
      // We only push the file onto this.#traces here once we know it's valid
      // and there's been no errors in the parsing.
      this.#traces.push(file);
    } catch (e) {
      throw e;
    } finally {
      // All processors have finished parsing, no more updates are expected.
      this.#processor.removeEventListener(TraceParseProgressEvent.eventName, onTraceUpdate);
      // Finally, update any listeners that all processors are 'done'.
      this.dispatchEvent(new ModelUpdateEvent({type: ModelUpdateType.COMPLETE, data: 'done'}));
    }
  }

  #storeAndCreateParsedTraceFile(
      syntheticEventsManager: Helpers.SyntheticEvents.SyntheticEventsManager,
      traceEvents: readonly Types.Events.Event[], metadata: Types.File.MetaData, data: Handlers.Types.HandlerData,
      traceInsights: Insights.Types.TraceInsightSets|null): ParsedTrace {
    this.#lastRecordingIndex++;
    let recordingName = `Trace ${this.#lastRecordingIndex}`;
    const origin = Helpers.Trace.extractOriginFromTrace(data.Meta.mainFrameURL);
    if (origin) {
      const nextSequenceForDomain = Platform.MapUtilities.getWithDefault(this.#nextNumberByDomain, origin, () => 1);
      recordingName = `${origin} (${nextSequenceForDomain})`;
      this.#nextNumberByDomain.set(origin, nextSequenceForDomain + 1);
    }
    this.#recordingsAvailable.push(recordingName);

    return {
      traceEvents,
      metadata,
      data,
      insights: traceInsights,
      syntheticEventsManager,
    };
  }

  lastTraceIndex(): number {
    return this.size() - 1;
  }

  /**
   * Returns the parsed trace data indexed by the order in which it was stored.
   * If no index is given, the last stored parsed data is returned.
   */
  parsedTrace(index: number = this.#traces.length - 1): ParsedTrace|null {
    return this.#traces.at(index) ?? null;
  }

  overrideModifications(index: number, newModifications: Types.File.Modifications): void {
    if (this.#traces[index]) {
      this.#traces[index].metadata.modifications = newModifications;
    }
  }

  syntheticTraceEventsManager(index: number = this.#traces.length - 1): Helpers.SyntheticEvents.SyntheticEventsManager
      |null {
    return this.#traces.at(index)?.syntheticEventsManager ?? null;
  }

  size(): number {
    return this.#traces.length;
  }

  deleteTraceByIndex(recordingIndex: number): void {
    this.#traces.splice(recordingIndex, 1);
    this.#recordingsAvailable.splice(recordingIndex, 1);
  }

  getRecordingsAvailable(): string[] {
    return this.#recordingsAvailable;
  }

  resetProcessor(): void {
    this.#processor.reset();
  }
}

/**
 * This parsed trace is used by the Model. It keeps multiple instances
 * of these so that the user can swap between them. The key is that it is
 * essentially the TraceFile plus whatever the model has parsed from it.
 */
export type ParsedTrace = Types.File.TraceFile&{
  data: Handlers.Types.HandlerData,
  /** Is null for CPU profiles. */
  insights: Insights.Types.TraceInsightSets | null,
  syntheticEventsManager: Helpers.SyntheticEvents.SyntheticEventsManager,
};

export const enum ModelUpdateType {
  COMPLETE = 'COMPLETE',
  PROGRESS_UPDATE = 'PROGRESS_UPDATE',
}

export type ModelUpdateEventData = ModelUpdateEventComplete|ModelUpdateEventProgress;

export interface ModelUpdateEventComplete {
  type: ModelUpdateType.COMPLETE;
  data: 'done';
}
export interface ModelUpdateEventProgress {
  type: ModelUpdateType.PROGRESS_UPDATE;
  data: TraceParseEventProgressData;
}

export interface TraceParseEventProgressData {
  percent: number;
}

export class ModelUpdateEvent extends Event {
  static readonly eventName = 'modelupdate';
  constructor(public data: ModelUpdateEventData) {
    super(ModelUpdateEvent.eventName);
  }
}

declare global {
  interface HTMLElementEventMap {
    [ModelUpdateEvent.eventName]: ModelUpdateEvent;
  }
}

export function isModelUpdateDataComplete(eventData: ModelUpdateEventData): eventData is ModelUpdateEventComplete {
  return eventData.type === ModelUpdateType.COMPLETE;
}
