// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Trace from '../../models/trace/trace.js';

import * as RecordingMetadata from './RecordingMetadata.js';
import type {Client} from './TimelineController.js';

const UIStrings = {
  /**
   * @description Text in Timeline Loader of the Performance panel
   * @example {Unknown JSON format} PH1
   */
  malformedTimelineDataS: 'Malformed timeline data: {PH1}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineLoader.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * This class handles loading traces from URL, and from the Lighthouse panel
 * It also handles loading cpuprofiles from url and console.profileEnd()
 */
export class TimelineLoader {
  private client: Client|null;
  private canceledCallback: (() => void)|null;
  private filter: Trace.Extras.TraceFilter.TraceFilter|null;
  #traceIsCPUProfile: boolean;
  #collectedEvents: Trace.Types.Events.Event[] = [];
  #metadata: Trace.Types.File.MetaData|null;

  #traceLoadedCallback?: (state: LoadingState) => void;
  #traceLoadedPromise: Promise<LoadingState>;

  constructor(client: Client) {
    this.client = client;
    this.canceledCallback = null;
    this.filter = null;
    this.#traceIsCPUProfile = false;
    this.#metadata = null;

    this.#traceLoadedPromise = new Promise<LoadingState>(resolve => {
      this.#traceLoadedCallback = resolve;
    });
  }

  static loadFromParsedJsonFile(contents: ParsedJSONFile, client: Client): TimelineLoader {
    const loader = new TimelineLoader(client);

    window.setTimeout(async () => {
      client.loadingStarted();
      try {
        loader.#processParsedFile(contents);
        await loader.complete();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : '';
        loader.reportErrorAndCancelLoading(i18nString(UIStrings.malformedTimelineDataS, {PH1: message}));
      }
    });

    return loader;
  }

  static loadFromEvents(events: Trace.Types.Events.Event[], client: Client): TimelineLoader {
    const loader = new TimelineLoader(client);
    window.setTimeout(async () => {
      try {
        await loader.addEvents(events, null);
      } catch (e: unknown) {
        loader.reportErrorAndCancelLoading(e instanceof Error ? e.message : undefined);
      }
    });
    return loader;
  }

  static loadFromTraceFile(traceFile: Trace.Types.File.TraceFile, client: Client): TimelineLoader {
    const loader = new TimelineLoader(client);
    window.setTimeout(async () => {
      try {
        await loader.addEvents(traceFile.traceEvents, traceFile.metadata);
      } catch (e: unknown) {
        loader.reportErrorAndCancelLoading(e instanceof Error ? e.message : undefined);
      }
    });
    return loader;
  }

  static loadFromCpuProfile(profile: Protocol.Profiler.Profile, client: Client, title?: string): TimelineLoader {
    const loader = new TimelineLoader(client);
    loader.#traceIsCPUProfile = true;

    try {
      const contents = Trace.Helpers.SamplesIntegrator.SamplesIntegrator.createFakeTraceFromCpuProfile(
          profile, Trace.Types.Events.ThreadID(1));

      window.setTimeout(async () => {
        try {
          await loader.addEvents(contents.traceEvents, title ? {title} : null);
        } catch (e: unknown) {
          loader.reportErrorAndCancelLoading(e instanceof Error ? e.message : undefined);
        }
      });
    } catch (e: unknown) {
      console.error(e instanceof Error ? e.stack : e);
      loader.reportErrorAndCancelLoading(e instanceof Error ? e.message : undefined);
    }
    return loader;
  }

  static async loadFromURL(url: Platform.DevToolsPath.UrlString, client: Client): Promise<TimelineLoader> {
    const loader = new TimelineLoader(client);
    const stream = new Common.StringOutputStream.StringOutputStream();
    client.loadingStarted();

    const allowRemoteFilePaths =
        Common.Settings.Settings.instance().moduleSetting('network.enable-remote-file-loading').get();
    Host.ResourceLoader.loadAsStream(url, null, stream, finishedCallback, allowRemoteFilePaths);

    async function finishedCallback(success: boolean, _headers: Record<string, string>,
                                    errorDescription: Host.ResourceLoader.LoadErrorDescription): Promise<void> {
      if (!success) {
        return loader.reportErrorAndCancelLoading(errorDescription.message);
      }
      try {
        const txt = stream.data();
        const trace = JSON.parse(txt);
        loader.#processParsedFile(trace);
        await loader.complete();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : '';
        return loader.reportErrorAndCancelLoading(i18nString(UIStrings.malformedTimelineDataS, {PH1: message}));
      }
    }

    return loader;
  }

  #processParsedFile(trace: ParsedJSONFile): void {
    if ('traceEvents' in trace || Array.isArray(trace)) {
      // We know that this is NOT a raw CPU Profile because it has traceEvents
      // (either at the top level, or nested under the traceEvents key)
      const items = Array.isArray(trace) ? trace : trace.traceEvents;

      this.#collectEvents(items);
    } else if (trace.nodes) {
      // We know it's a raw Protocol CPU Profile.
      this.#parseCPUProfileFormatFromFile(trace);
      this.#traceIsCPUProfile = true;
    } else {
      this.reportErrorAndCancelLoading(i18nString(UIStrings.malformedTimelineDataS));
      return;
    }

    if (!Array.isArray(trace) && 'traceEvents' in trace) {
      this.#metadata = trace.metadata ?? {};
      // Older traces set these fields even when throttling is not active, while newer traces do not.
      // Clear them out on load to simplify usage.
      if (this.#metadata.cpuThrottling === 1) {
        this.#metadata.cpuThrottling = undefined;
      }
      // This string is translated, so this only covers the english case and the current locale.
      // Due to this, older traces in other locales will end up displaying "No throttling" in the trace history selector.
      const noThrottlingString = typeof SDK.NetworkManager.NoThrottlingConditions.title === 'string' ?
          SDK.NetworkManager.NoThrottlingConditions.title :
          SDK.NetworkManager.NoThrottlingConditions.title();
      if (this.#metadata.networkThrottling === 'No throttling' ||
          this.#metadata.networkThrottling === noThrottlingString) {
        this.#metadata.networkThrottling = undefined;
      }
    }
  }

  async addEvents(events: readonly Trace.Types.Events.Event[],
                  metadata: Trace.Types.File.MetaData|null): Promise<void> {
    try {
      this.#metadata = metadata;
      this.client?.loadingStarted();
      /**
       * See the `eventsPerChunk` comment in `models/trace/types/Configuration.ts`.
       *
       * This value is different though. Why? `The addEvents()` work below is different
       * (and much faster!) than running `handleEvent()` on all handlers.
       */
      const eventsPerChunk = 150_000;
      for (let i = 0; i < events.length; i += eventsPerChunk) {
        const chunk = events.slice(i, i + eventsPerChunk);
        this.#collectEvents(chunk as unknown as Trace.Types.Events.Event[]);
        this.client?.loadingProgress((i + chunk.length) / events.length);
        await new Promise(r => window.setTimeout(r, 0));  // Yield event loop to paint.
      }
      await this.complete();
    } catch (e: unknown) {
      this.reportErrorAndCancelLoading(e instanceof Error ? e.message : undefined);
    }
  }

  async #cleanup(): Promise<void> {
    if (this.client) {
      await this.client.loadingComplete(
          /* collectedEvents */[], /* exclusiveFilter= */ null, /* metadata= */ null);
      this.client = null;
    }
    if (this.canceledCallback) {
      this.canceledCallback();
    }
  }

  async cancel(): Promise<void> {
    await this.#cleanup();
    this.#traceLoadedCallback?.(LoadingState.CANCELLED);
  }

  private reportErrorAndCancelLoading(message?: string): void {
    if (message) {
      Common.Console.Console.instance().error(message);
    }
    this.#traceLoadedCallback?.(LoadingState.ERROR);
    void this.#cleanup();
  }

  async complete(): Promise<void> {
    if (!this.client) {
      return;
    }
    this.client.processingStarted();
    try {
      await this.finalizeTrace();
    } catch (e: unknown) {
      this.reportErrorAndCancelLoading(e instanceof Error ? e.message : undefined);
    }
  }

  private async finalizeTrace(): Promise<void> {
    if (!this.#metadata && this.#traceIsCPUProfile) {
      this.#metadata = RecordingMetadata.forCPUProfile();
    }

    await (this.client as Client).loadingComplete(this.#collectedEvents, this.filter, this.#metadata);
    this.#traceLoadedCallback?.(LoadingState.SUCCESS);
  }

  traceLoaded(): Promise<LoadingState> {
    return this.#traceLoadedPromise;
  }

  #parseCPUProfileFormatFromFile(parsedTrace: Protocol.Profiler.Profile): void {
    const traceFile = Trace.Helpers.SamplesIntegrator.SamplesIntegrator.createFakeTraceFromCpuProfile(
        parsedTrace, Trace.Types.Events.ThreadID(1));

    this.#collectEvents(traceFile.traceEvents);
  }

  #collectEvents(events: readonly Trace.Types.Events.Event[]): void {
    this.#collectedEvents = this.#collectedEvents.concat(events);
  }
}

/**
 * Used when we parse the input, but do not yet know if it is a raw CPU Profile or a Trace
 **/
export type ParsedJSONFile = Trace.Types.File.Contents|Protocol.Profiler.Profile;

export const enum LoadingState {
  SUCCESS = 'SUCCESS',
  CANCELLED = 'CANCELLED',
  ERROR = 'ERROR',
}
