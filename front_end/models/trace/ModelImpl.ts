// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';

import * as Handlers from './handlers/handlers.js';
import * as Helpers from './helpers/helpers.js';
import {TraceParseProgressEvent, TraceProcessor} from './Processor.js';
import * as Types from './types/types.js';

// Note: this model is implemented in a way that can support multiple trace
// processors. Currently there is only one implemented, but you will see
// references to "processors" plural because it can easily be extended in the future.

export interface ParseConfig {
  metadata?: Types.File.MetaData;
  // Unused but will eventually be consumed by UIUtils Linkifier, etc.
  isFreshRecording?: boolean;
}

/**
 * The new trace engine model we are migrating to. The Model is responsible for
 * parsing arrays of raw trace events and storing the resulting data. It can
 * store multiple traces at once, and can return the data for any of them.
 * Currently as we migrate from the old engine to this, we are turning on the
 * model handlers incrementally as we need the data, to save performance costs
 * of running handlers that we do not use. Therefore, when the model is
 * constructed we pass through a set of handlers that should be used. Once we
 * have migrated all tracks in the Performance Panel to this model, we can
 * remove this ability to run a subset of handlers, as we will need all handlers
 * to be used at that point. For tests, if you want to construct a model with
 * all handlers, you can use the static `Model.createWithAllHandlers` method.
 **/
export class Model<EnabledModelHandlers extends {[key: string]: Handlers.Types.TraceEventHandler}> extends EventTarget {
  readonly #traces: ParsedTraceFile<EnabledModelHandlers>[] = [];
  readonly #nextNumberByDomain = new Map<string, number>();

  readonly #recordingsAvailable: string[] = [];
  #lastRecordingIndex = 0;
  #processor: TraceProcessor<Handlers.Types.HandlersWithMeta<EnabledModelHandlers>>;
  #config: Types.Configuration.Configuration = Types.Configuration.DEFAULT;

  static createWithAllHandlers(config?: Types.Configuration.Configuration): Model<typeof Handlers.ModelHandlers> {
    return new Model(Handlers.ModelHandlers, config);
  }

  static createWithRequiredHandlersForMigration(config?: Types.Configuration.Configuration): Model<{
    [K in keyof typeof Handlers.Migration.ENABLED_TRACE_HANDLERS]: typeof Handlers.Migration.ENABLED_TRACE_HANDLERS[K];
  }> {
    return new Model(Handlers.Migration.ENABLED_TRACE_HANDLERS, config);
  }

  constructor(handlers: EnabledModelHandlers, config?: Types.Configuration.Configuration) {
    super();
    if (config) {
      this.#config = config;
    }
    this.#processor = new TraceProcessor(handlers, this.#config);
  }

  /**
   * Updates the configuration. Useful if a user changes a setting - this lets
   * us update the model without having to destroy it and recreate it with the
   * new settings.
   */
  updateConfiguration(config: Types.Configuration.Configuration): void {
    this.#config = config;
    this.#processor.updateConfiguration(config);
  }

  /**
   * Parses an array of trace events into a structured object containing all the
   * information parsed by the trace handlers.
   * You can `await` this function to pause execution until parsing is complete,
   * or instead rely on the `ModuleUpdateEvent` that is dispatched when the
   * parsing is finished.
   *
   * Once parsed, you then have to call the `traceParsedData` method, providing an
   * index of the trace you want to have the data for. This is because any model
   * can store a number of traces. Each trace is given an index, which starts at 0
   * and increments by one as a new trace is parsed.
   *
   * @example
   * // Awaiting the parse method() to block until parsing complete
   * await this.traceModel.parse(events);
   * const data = this.traceModel.traceParsedData(0)
   *
   * @example
   * // Using an event listener to be notified when tracing is complete.
   * this.traceModel.addEventListener(Trace.ModelUpdateEvent.eventName, (event) => {
   *   if(event.data.data === 'done') {
   *     // trace complete
   *     const data = this.traceModel.traceParsedData(0);
   *   }
   * });
   * void this.traceModel.parse(events);
   **/
  async parse(traceEvents: readonly Types.TraceEvents.TraceEventData[], config?: ParseConfig): Promise<void> {
    const metadata = config?.metadata || {};
    const isFreshRecording = config?.isFreshRecording || false;
    // During parsing, periodically update any listeners on each processors'
    // progress (if they have any updates).
    const onTraceUpdate = (event: Event): void => {
      const {data} = event as TraceParseProgressEvent;
      this.dispatchEvent(new ModelUpdateEvent({type: ModelUpdateType.PROGRESS_UPDATE, data: data}));
    };

    this.#processor.addEventListener(TraceParseProgressEvent.eventName, onTraceUpdate);

    // Create a parsed trace file.  It will be populated with data from the processor.
    const file: ParsedTraceFile<EnabledModelHandlers> = {
      traceEvents,
      metadata,
      traceParsedData: null,
    };

    try {
      // Wait for all outstanding promises before finishing the async execution,
      // but perform all tasks in parallel.
      await this.#processor.parse(traceEvents, isFreshRecording);
      this.#storeParsedFileData(file, this.#processor.data);
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

  #storeParsedFileData(
      file: ParsedTraceFile<EnabledModelHandlers>,
      data: Handlers.Types.EnabledHandlerDataWithMeta<EnabledModelHandlers>|null): void {
    file.traceParsedData = data;
    this.#lastRecordingIndex++;
    let recordingName = `Trace ${this.#lastRecordingIndex}`;
    let origin: string|null = null;
    if (file.traceParsedData) {
      origin = Helpers.Trace.extractOriginFromTrace(file.traceParsedData.Meta.mainFrameURL);
      if (origin) {
        const nextSequenceForDomain = Platform.MapUtilities.getWithDefault(this.#nextNumberByDomain, origin, () => 1);
        recordingName = `${origin} (${nextSequenceForDomain})`;
        this.#nextNumberByDomain.set(origin, nextSequenceForDomain + 1);
      }
    }
    this.#recordingsAvailable.push(recordingName);
  }

  /**
   * Returns the parsed trace data indexed by the order in which it was stored.
   * If no index is given, the last stored parsed data is returned.
   */
  traceParsedData(index: number = this.#traces.length - 1):
      Handlers.Types.EnabledHandlerDataWithMeta<EnabledModelHandlers>|null {
    if (!this.#traces[index]) {
      return null;
    }

    return this.#traces[index].traceParsedData;
  }

  metadata(index: number): Types.File.MetaData|null {
    if (!this.#traces[index]) {
      return null;
    }

    return this.#traces[index].metadata;
  }

  traceEvents(index: number): readonly Types.TraceEvents.TraceEventData[]|null {
    if (!this.#traces[index]) {
      return null;
    }

    return this.#traces[index].traceEvents;
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
 * This parsed trace file is used by the Model. It keeps multiple instances
 * of these so that the user can swap between them. The key is that it is
 * essentially the TraceFile plus whatever the model has parsed from it.
 */
export type ParsedTraceFile<Handlers extends {[key: string]: Handlers.Types.TraceEventHandler}> = Types.File.TraceFile&{
  traceParsedData: Handlers.Types.EnabledHandlerDataWithMeta<Handlers>| null,
};

export const enum ModelUpdateType {
  COMPLETE = 'COMPLETE',
  PROGRESS_UPDATE = 'PROGRESS_UPDATE',
}

export type ModelUpdateEventData = ModelUpdateEventComplete|ModelUpdateEventProgress;

export type ModelUpdateEventComplete = {
  type: ModelUpdateType.COMPLETE,
  data: 'done',
};
export type ModelUpdateEventProgress = {
  type: ModelUpdateType.PROGRESS_UPDATE,
  data: TraceParseEventProgressData,
};

export type TraceParseEventProgressData = {
  index: number,
  total: number,
};

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

export function isModelUpdateDataProgress(eventData: ModelUpdateEventData): eventData is ModelUpdateEventProgress {
  return eventData.type === ModelUpdateType.PROGRESS_UPDATE;
}
