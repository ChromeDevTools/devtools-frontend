// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../models/trace/trace.js';

import {type Client} from './TimelineController.js';

const UIStrings = {
  /**
   *@description Text in Timeline Loader of the Performance panel
   *@example {Unknown JSON format} PH1
   */
  malformedTimelineDataS: 'Malformed timeline data: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineLoader.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * This class handles loading traces from file and URL, and from the Lighthouse panel
 * It also handles loading cpuprofiles from file, url and console.profileEnd()
 *
 * Meanwhile, the normal trace recording flow bypasses TimelineLoader entirely,
 * as it's handled from TracingManager => TimelineController.
 */
export class TimelineLoader implements Common.StringOutputStream.OutputStream {
  private client: Client|null;
  private tracingModel: TraceEngine.Legacy.TracingModel|null;
  private canceledCallback: (() => void)|null;
  private buffer: string;
  private firstRawChunk: boolean;
  private totalSize!: number;
  private filter: TimelineModel.TimelineModelFilter.TimelineModelFilter|null;
  #traceIsCPUProfile: boolean;
  #collectedEvents: TraceEngine.Types.TraceEvents.TraceEventData[] = [];
  #metadata: TraceEngine.Types.File.MetaData|null;

  #traceFinalizedCallbackForTest?: () => void;
  #traceFinalizedPromiseForTest: Promise<void>;

  constructor(client: Client, title?: string) {
    this.client = client;
    this.tracingModel = new TraceEngine.Legacy.TracingModel(title);
    this.canceledCallback = null;
    this.buffer = '';
    this.firstRawChunk = true;
    this.filter = null;
    this.#traceIsCPUProfile = false;
    this.#metadata = null;

    this.#traceFinalizedPromiseForTest = new Promise<void>(resolve => {
      this.#traceFinalizedCallbackForTest = resolve;
    });
  }

  static async loadFromFile(file: File, client: Client): Promise<TimelineLoader> {
    const loader = new TimelineLoader(client);
    const fileReader = new Bindings.FileUtils.ChunkedFileReader(file);
    loader.canceledCallback = fileReader.cancel.bind(fileReader);
    loader.totalSize = file.size;
    // We'll resolve and return the loader instance before finalizing the trace.
    setTimeout(async () => {
      const success = await fileReader.read(loader);
      if (!success && fileReader.error()) {
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        loader.reportErrorAndCancelLoading((fileReader.error() as any).message);
      }
    });
    return loader;
  }

  static loadFromEvents(events: TraceEngine.TracingManager.EventPayload[], client: Client): TimelineLoader {
    const loader = new TimelineLoader(client);
    window.setTimeout(async () => {
      void loader.addEvents(events);
    });
    return loader;
  }

  static loadFromCpuProfile(profile: Protocol.Profiler.Profile|null, client: Client, title?: string): TimelineLoader {
    const loader = new TimelineLoader(client, title);
    loader.#traceIsCPUProfile = true;

    try {
      const events = TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.createFakeTraceFromCpuProfile(
          profile, /* tid */ 1, /* injectPageEvent */ true);

      window.setTimeout(async () => {
        void loader.addEvents(events);
      });
    } catch (e) {
      console.error(e.stack);
    }
    return loader;
  }

  static async loadFromURL(url: Platform.DevToolsPath.UrlString, client: Client): Promise<TimelineLoader> {
    const loader = new TimelineLoader(client);
    const stream = new Common.StringOutputStream.StringOutputStream();
    await client.loadingStarted();

    const allowRemoteFilePaths =
        Common.Settings.Settings.instance().moduleSetting('network.enable-remote-file-loading').get();
    Host.ResourceLoader.loadAsStream(url, null, stream, finishedCallback, allowRemoteFilePaths);

    async function finishedCallback(
        success: boolean, _headers: {[x: string]: string},
        errorDescription: Host.ResourceLoader.LoadErrorDescription): Promise<void> {
      if (!success) {
        return loader.reportErrorAndCancelLoading(errorDescription.message);
      }
      const txt = stream.data();
      const trace = JSON.parse(txt);
      if (Array.isArray(trace.nodes)) {
        loader.#traceIsCPUProfile = true;
        loader.buffer = txt;
        await loader.close();
        return;
      }
      const events = Array.isArray(trace.traceEvents) ? trace.traceEvents : trace;
      void loader.addEvents(events);
    }

    return loader;
  }

  async addEvents(events: TraceEngine.TracingManager.EventPayload[]): Promise<void> {
    await this.client?.loadingStarted();
    /**
     * See the `eventsPerChunk` comment in `models/trace/types/Configuration.ts`.
     *
     * This value is different though. Why? `The addEvents()` work below is different
     * (and much faster!) than running `handleEvent()` on all handlers.
     */
    const eventsPerChunk = 150_000;
    for (let i = 0; i < events.length; i += eventsPerChunk) {
      const chunk = events.slice(i, i + eventsPerChunk);
      this.#collectEvents(chunk);
      (this.tracingModel as TraceEngine.Legacy.TracingModel).addEvents(chunk);
      await this.client?.loadingProgress((i + chunk.length) / events.length);
      await new Promise(r => window.setTimeout(r, 0));  // Yield event loop to paint.
    }
    void this.close();
  }

  async cancel(): Promise<void> {
    this.tracingModel = null;
    if (this.client) {
      await this.client.loadingComplete(
          /* collectedEvents */[], /* tracingModel= */ null, /* exclusiveFilter= */ null, /* isCpuProfile= */ false,
          /* recordingStartTime= */ null, /* metadata= */ null);
      this.client = null;
    }
    if (this.canceledCallback) {
      this.canceledCallback();
    }
  }

  /**
   * As TimelineLoader implements `Common.StringOutputStream.OutputStream`, `write()` is called when a
   * Common.StringOutputStream.StringOutputStream instance has decoded a chunk. This path is only used
   * by `loadFromURL()`; it's NOT used by `loadFromEvents` or `loadFromFile`.
   */
  async write(chunk: string, endOfFile: boolean): Promise<void> {
    if (!this.client) {
      return Promise.resolve();
    }
    this.buffer += chunk;
    if (this.firstRawChunk) {
      await this.client.loadingStarted();
      // Ensure we paint the loading dialog before continuing
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      this.firstRawChunk = false;
    } else {
      let progress = undefined;
      progress = this.buffer.length / this.totalSize;
      // For compressed traces, we can't provide a definite progress percentage. So, just keep it moving.
      // For other traces, calculate a laoded part.
      progress = progress > 1 ? progress - Math.floor(progress) : progress;
      await this.client.loadingProgress(progress);
    }

    if (endOfFile) {
      let trace;
      try {
        trace = JSON.parse(this.buffer);
      } catch (e) {
        this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedTimelineDataS, {PH1: e.toString()}));
        return;
      }
      if (trace.traceEvents || Array.isArray(trace)) {
        const items = Array.isArray(trace) ? trace : (trace.traceEvents as TraceEngine.TracingManager.EventPayload[]);
        (this.tracingModel as TraceEngine.Legacy.TracingModel).addEvents(items);
        this.#collectEvents(items);
      } else if (trace.nodes) {
        this.parseCPUProfileFormat(trace);
        this.#traceIsCPUProfile = true;
      } else {
        this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedTimelineDataS));
        return;
      }

      if (trace.metadata) {
        this.#metadata = trace.metadata as TraceEngine.Types.File.MetaData;
      }
      return Promise.resolve();
    }
  }

  private reportErrorAndCancelLoading(message?: string): void {
    if (message) {
      Common.Console.Console.instance().error(message);
    }
    void this.cancel();
  }

  async close(): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.processingStarted();
    await this.finalizeTrace();
  }

  private isCpuProfile(): boolean {
    return this.#traceIsCPUProfile;
  }

  private async finalizeTrace(): Promise<void> {
    (this.tracingModel as TraceEngine.Legacy.TracingModel).tracingComplete();
    await (this.client as Client)
        .loadingComplete(
            this.#collectedEvents, this.tracingModel, this.filter, this.isCpuProfile(), /* recordingStartTime=*/ null,
            this.#metadata);
    this.#traceFinalizedCallbackForTest?.();
  }

  traceFinalizedForTest(): Promise<void> {
    return this.#traceFinalizedPromiseForTest;
  }

  private parseCPUProfileFormat(parsedTrace: string): void {
    const traceEvents = TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.createFakeTraceFromCpuProfile(
        parsedTrace, /* tid */ 1, /* injectPageEvent */ true);
    (this.tracingModel as TraceEngine.Legacy.TracingModel).addEvents(traceEvents);
    this.#collectEvents(traceEvents);
  }

  #collectEvents(events: TraceEngine.TracingManager.EventPayload[]): void {
    // Once the old engine is removed, this can be updated to use the types from the new engine and avoid the `as unknown`.
    this.#collectedEvents =
        this.#collectedEvents.concat(events as unknown as TraceEngine.Types.TraceEvents.TraceEventData);
  }
}
