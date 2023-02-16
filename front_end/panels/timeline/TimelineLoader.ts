// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';

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
export class TimelineLoader implements Common.StringOutputStream.OutputStream {
  private client: Client|null;
  private readonly backingStorage: Bindings.TempFile.TempFileBackingStorage;
  private tracingModel: SDK.TracingModel.TracingModel|null;
  private canceledCallback: (() => void)|null;
  private state: State;
  private buffer: string;
  private firstRawChunk: boolean;
  private firstChunk: boolean;
  private loadedBytes: number;
  private totalSize!: number;
  private readonly jsonTokenizer: TextUtils.TextUtils.BalancedJSONTokenizer;
  constructor(client: Client, shouldSaveTraceEventsToFile: boolean, title?: string) {
    this.client = client;

    this.backingStorage = new Bindings.TempFile.TempFileBackingStorage();
    this.tracingModel = new SDK.TracingModel.TracingModel(this.backingStorage, shouldSaveTraceEventsToFile, title);

    this.canceledCallback = null;
    this.state = State.Initial;
    this.buffer = '';
    this.firstRawChunk = true;
    this.firstChunk = true;
    this.loadedBytes = 0;
    this.jsonTokenizer = new TextUtils.TextUtils.BalancedJSONTokenizer(this.writeBalancedJSON.bind(this), true);
  }

  static async loadFromFile(file: File, client: Client): Promise<TimelineLoader> {
    const loader = new TimelineLoader(client, /* shouldSaveTraceEventsToFile= */ true);
    const fileReader = new Bindings.FileUtils.ChunkedFileReader(file, TransferChunkLengthBytes);
    loader.canceledCallback = fileReader.cancel.bind(fileReader);
    loader.totalSize = file.size;
    const success = await fileReader.read(loader);
    if (!success && fileReader.error()) {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      loader.reportErrorAndCancelLoading((fileReader.error() as any).message);
    }
    return loader;
  }

  static loadFromEvents(events: SDK.TracingManager.EventPayload[], client: Client): TimelineLoader {
    const loader = new TimelineLoader(client, /* shouldSaveTraceEventsToFile= */ true);
    window.setTimeout(async () => {
      void loader.addEvents(events);
    });
    return loader;
  }

  static loadFromCpuProfile(profile: Protocol.Profiler.Profile|null, client: Client, title?: string): TimelineLoader {
    const loader = new TimelineLoader(client, /* shouldSaveTraceEventsToFile= */ false, title);

    try {
      const events = TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.buildTraceProfileFromCpuProfile(
          profile, /* tid */ 1, /* injectPageEvent */ true);

      loader.backingStorage.appendString(JSON.stringify(profile));
      loader.backingStorage.finishWriting();

      window.setTimeout(async () => {
        void loader.addEvents(events);
      });
    } catch (e) {
      console.error(e.stack);
    }
    return loader;
  }

  static loadFromURL(url: Platform.DevToolsPath.UrlString, client: Client): TimelineLoader {
    const loader = new TimelineLoader(client, /* shouldSaveTraceEventsToFile= */ true);
    const stream = new Common.StringOutputStream.StringOutputStream();
    client.loadingStarted();

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
        loader.state = State.LoadingCPUProfileFormat;
        loader.buffer = txt;
        await loader.close();
        return;
      }
      const events = Array.isArray(trace.traceEvents) ? trace.traceEvents : trace;
      void loader.addEvents(events);
    }

    return loader;
  }

  async addEvents(events: SDK.TracingManager.EventPayload[]): Promise<void> {
    this.client?.loadingStarted();
    const eventsPerChunk = 5000;
    for (let i = 0; i < events.length; i += eventsPerChunk) {
      const chunk = events.slice(i, i + eventsPerChunk);
      (this.tracingModel as SDK.TracingModel.TracingModel).addEvents(chunk);
      this.client?.loadingProgress((i + chunk.length) / events.length);
      await new Promise(r => window.setTimeout(r));  // Yield event loop to paint.
    }
    void this.close();
  }

  cancel(): void {
    this.tracingModel = null;
    this.backingStorage.reset();
    if (this.client) {
      this.client.loadingComplete(null);
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
        this.state = State.LoadingCPUProfileFormat;
      } else if (chunk[0] === '{') {
        this.state = State.LookingForEvents;
      } else if (chunk[0] === '[') {
        this.state = State.ReadingEvents;
      } else {
        this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedTimelineDataUnknownJson));
        return Promise.resolve();
      }
    }

    if (this.state === State.LoadingCPUProfileFormat) {
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
      items = (JSON.parse(json) as SDK.TracingManager.EventPayload[]);
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
      (this.tracingModel as SDK.TracingModel.TracingModel).addEvents(items);
    } catch (e) {
      this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedTimelineDataS, {PH1: e.toString()}));
    }
  }

  private reportErrorAndCancelLoading(message?: string): void {
    if (message) {
      Common.Console.Console.instance().error(message);
    }
    this.cancel();
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
    this.client.processingStarted();
    await this.finalizeTrace();
  }

  private async finalizeTrace(): Promise<void> {
    if (this.state === State.LoadingCPUProfileFormat) {
      this.parseCPUProfileFormat(this.buffer);
      this.buffer = '';
    }
    (this.tracingModel as SDK.TracingModel.TracingModel).tracingComplete();
    await (this.client as Client).loadingComplete(this.tracingModel);
  }

  private parseCPUProfileFormat(text: string): void {
    let traceEvents;
    try {
      const profile = JSON.parse(text);
      traceEvents = TimelineModel.TimelineJSProfile.TimelineJSProfileProcessor.buildTraceProfileFromCpuProfile(
          profile, /* tid */ 1, /* injectPageEvent */ true);
    } catch (e) {
      this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedCpuProfileFormat));
      return;
    }
    (this.tracingModel as SDK.TracingModel.TracingModel).addEvents(traceEvents);
  }
}

export const TransferChunkLengthBytes = 5000000;

export interface Client {
  loadingStarted(): void;

  loadingProgress(progress?: number): void;

  processingStarted(): void;

  loadingComplete(tracingModel: SDK.TracingModel.TracingModel|null): void;
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum State {
  Initial = 'Initial',
  LookingForEvents = 'LookingForEvents',
  ReadingEvents = 'ReadingEvents',
  SkippingTail = 'SkippingTail',
  LoadingCPUProfileFormat = 'LoadingCPUProfileFormat',
}
