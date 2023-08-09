// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../models/trace/trace.js';

import {type Client} from './TimelineController.js';

const UIStrings = {
  /**
   *@description Text in Timeline Loader of the Performance panel
   */
  malformedTimelineDataUnknownJson: 'Malformed timeline data: Unknown JSON format',
  /**
   *@description Text in Timeline Loader of the Performance panel
   */
  malformedTimelineInputWrongJson: 'Malformed timeline input, wrong JSON brackets balance',
  /**
   *@description Text in Timeline Loader of the Performance panel
   *@example {Unknown JSON format} PH1
   */
  malformedTimelineDataS: 'Malformed timeline data: {PH1}',
  /**
   *@description Text in Timeline Loader of the Performance panel
   */
  legacyTimelineFormatIsNot: 'Legacy Timeline format is not supported.',
  /**
   *@description Text in Timeline Loader of the Performance panel
   */
  malformedCpuProfileFormat: 'Malformed CPU profile format',
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
  private state: State;
  private buffer: string;
  private firstRawChunk: boolean;
  private firstChunk: boolean;
  private loadedBytes: number;
  private totalSize!: number;
  private readonly jsonTokenizer: TextUtils.TextUtils.BalancedJSONTokenizer;
  private filter: TimelineModel.TimelineModelFilter.TimelineModelFilter|null;

  #traceFinalizedCallbackForTest?: () => void;
  #traceFinalizedPromiseForTest: Promise<void>;

  constructor(client: Client, title?: string) {
    this.client = client;
    this.tracingModel = new TraceEngine.Legacy.TracingModel(title);
    this.canceledCallback = null;
    this.state = State.Initial;
    this.buffer = '';
    this.firstRawChunk = true;
    this.firstChunk = true;
    this.loadedBytes = 0;
    this.jsonTokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(this.writeBalancedJSON.bind(this), true);
    this.filter = null;

    this.#traceFinalizedPromiseForTest = new Promise<void>(resolve => {
      this.#traceFinalizedCallbackForTest = resolve;
    });
  }

  static async loadFromFile(file: File, client: Client): Promise<TimelineLoader> {
    const loader = new TimelineLoader(client);
    const fileReader = new Bindings.FileUtils.ChunkedFileReader(file, TransferChunkLengthBytes);
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

  static getCpuProfileFilter(): TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter {
    const visibleTypes = [];
    visibleTypes.push(TimelineModel.TimelineModel.RecordType.JSFrame);
    visibleTypes.push(TimelineModel.TimelineModel.RecordType.JSIdleFrame);
    visibleTypes.push(TimelineModel.TimelineModel.RecordType.JSSystemFrame);
    return new TimelineModel.TimelineModelFilter.TimelineVisibleEventsFilter(visibleTypes);
  }

  static loadFromCpuProfile(profile: Protocol.Profiler.Profile|null, client: Client, title?: string): TimelineLoader {
    const loader = new TimelineLoader(client, title);
    loader.state = State.LoadingCPUProfileFromRecording;

    try {
      const events = TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.createFakeTraceFromCpuProfile(
          profile, /* tid */ 1, /* injectPageEvent */ true);

      loader.filter = TimelineLoader.getCpuProfileFilter();

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
        loader.state = State.LoadingCPUProfileFromFile;
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
    const eventsPerChunk = 15_000;
    for (let i = 0; i < events.length; i += eventsPerChunk) {
      const chunk = events.slice(i, i + eventsPerChunk);
      (this.tracingModel as TraceEngine.Legacy.TracingModel).addEvents(chunk);
      await this.client?.loadingProgress((i + chunk.length) / events.length);
      await new Promise(r => window.setTimeout(r));  // Yield event loop to paint.
    }
    void this.close();
  }

  async cancel(): Promise<void> {
    this.tracingModel = null;
    if (this.client) {
      await this.client.loadingComplete(
          /* tracingModel= */ null, /* exclusiveFilter= */ null, /* isCpuProfile= */ false);
      this.client = null;
    }
    if (this.canceledCallback) {
      this.canceledCallback();
    }
  }

  async write(chunk: string): Promise<void> {
    if (!this.client) {
      return Promise.resolve();
    }
    this.loadedBytes += chunk.length;
    if (this.firstRawChunk) {
      await this.client.loadingStarted();
      // Ensure we paint the loading dialog before continuing
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    } else {
      let progress = undefined;
      if (this.totalSize) {
        progress = this.loadedBytes / this.totalSize;
        // For compressed traces, we can't provide a definite progress percentage. So, just keep it moving.
        progress = progress > 1 ? progress - Math.floor(progress) : progress;
      }
      await this.client.loadingProgress(progress);
    }
    this.firstRawChunk = false;

    if (this.state === State.Initial) {
      if (chunk.match(/^{(\s)*"nodes":(\s)*\[/)) {
        this.state = State.LoadingCPUProfileFromFile;
      } else if (chunk[0] === '{') {
        this.state = State.LookingForEvents;
      } else if (chunk[0] === '[') {
        this.state = State.ReadingEvents;
      } else {
        this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedTimelineDataUnknownJson));
        return Promise.resolve();
      }
    }

    if (this.state === State.LoadingCPUProfileFromFile) {
      this.buffer += chunk;
      return Promise.resolve();
    }

    if (this.state === State.LookingForEvents) {
      const objectName = '"traceEvents":';
      const startPos = this.buffer.length - objectName.length;
      this.buffer += chunk;
      const pos = this.buffer.indexOf(objectName, startPos);
      if (pos === -1) {
        return Promise.resolve();
      }
      chunk = this.buffer.slice(pos + objectName.length);
      this.state = State.ReadingEvents;
    }

    if (this.state !== State.ReadingEvents) {
      return Promise.resolve();
    }
    // This is where we actually do the loading of events from JSON: the JSON
    // Tokenizer writes the JSON to a buffer, and then as a callback the
    // writeBalancedJSON method below is invoked. It then parses this chunk
    // of JSON as a set of events, and adds them to the TracingModel via
    // addEvents()
    if (this.jsonTokenizer.write(chunk)) {
      return Promise.resolve();
    }
    this.state = State.SkippingTail;
    if (this.firstChunk) {
      this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedTimelineInputWrongJson));
    }
    return Promise.resolve();
  }

  private writeBalancedJSON(data: string): void {
    let json: string = data + ']';

    if (!this.firstChunk) {
      const commaIndex = json.indexOf(',');
      if (commaIndex !== -1) {
        json = json.slice(commaIndex + 1);
      }
      json = '[' + json;
    }

    let items;
    try {
      items = (JSON.parse(json) as TraceEngine.TracingManager.EventPayload[]);
    } catch (e) {
      this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedTimelineDataS, {PH1: e.toString()}));
      return;
    }

    if (this.firstChunk) {
      this.firstChunk = false;
      if (this.looksLikeAppVersion(items[0])) {
        this.reportErrorAndCancelLoading(i18nString(UIStrings.legacyTimelineFormatIsNot));
        return;
      }
    }

    try {
      (this.tracingModel as TraceEngine.Legacy.TracingModel).addEvents(items);
    } catch (e) {
      this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedTimelineDataS, {PH1: e.toString()}));
    }
  }

  private reportErrorAndCancelLoading(message?: string): void {
    if (message) {
      Common.Console.Console.instance().error(message);
    }
    void this.cancel();
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private looksLikeAppVersion(item: any): boolean {
    return typeof item === 'string' && item.indexOf('Chrome') !== -1;
  }

  async close(): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.processingStarted();
    await this.finalizeTrace();
  }

  private isCpuProfile(): boolean {
    return this.state === State.LoadingCPUProfileFromFile || this.state === State.LoadingCPUProfileFromRecording;
  }

  private async finalizeTrace(): Promise<void> {
    if (this.state === State.LoadingCPUProfileFromFile) {
      this.parseCPUProfileFormat(this.buffer);
      this.buffer = '';
    }
    (this.tracingModel as TraceEngine.Legacy.TracingModel).tracingComplete();
    await (this.client as Client).loadingComplete(this.tracingModel, this.filter, this.isCpuProfile());
    this.#traceFinalizedCallbackForTest?.();
  }

  traceFinalizedForTest(): Promise<void> {
    return this.#traceFinalizedPromiseForTest;
  }

  private parseCPUProfileFormat(text: string): void {
    let traceEvents;
    try {
      const profile = JSON.parse(text);
      traceEvents = TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.createFakeTraceFromCpuProfile(
          profile, /* tid */ 1, /* injectPageEvent */ true);
    } catch (e) {
      this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedCpuProfileFormat));
      return;
    }
    this.filter = TimelineLoader.getCpuProfileFilter();
    (this.tracingModel as TraceEngine.Legacy.TracingModel).addEvents(traceEvents);
  }
}

export const TransferChunkLengthBytes = 5000000;

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum State {
  Initial = 'Initial',
  LookingForEvents = 'LookingForEvents',
  ReadingEvents = 'ReadingEvents',
  SkippingTail = 'SkippingTail',
  LoadingCPUProfileFromFile = 'LoadingCPUProfileFromFile',
  LoadingCPUProfileFromRecording = 'LoadingCPUProfileFromRecording',
}
