// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import type * as Types from './types/types.js';

export class TracingManager extends SDK.SDKModel.SDKModel<void> {
  readonly #tracingAgent: ProtocolProxyApi.TracingApi;
  #activeClient: TracingManagerClient|null;
  #eventsRetrieved: number;
  #finishing?: boolean;
  constructor(target: SDK.Target.Target) {
    super(target);
    this.#tracingAgent = target.tracingAgent();
    target.registerTracingDispatcher(new TracingDispatcher(this));

    this.#activeClient = null;
    this.#eventsRetrieved = 0;
  }

  bufferUsage(usage?: number, eventCount?: number, percentFull?: number): void {
    if (this.#activeClient) {
      this.#activeClient.tracingBufferUsage(usage || percentFull || 0);
    }
  }

  eventsCollected(events: Types.Events.Event[]): void {
    if (!this.#activeClient) {
      return;
    }
    this.#activeClient.traceEventsCollected(events);
    this.#eventsRetrieved += events.length;

    // CDP no longer provides an approximate_event_count AKA eventCount. It's always 0.
    // To give some idea of progress we'll compare to a large (900k event) trace.
    // And we'll clamp both sides so the user sees some progress, and never maxed at 99%
    const progress = Math.min((this.#eventsRetrieved / 900_000) + 0.15, 0.90);
    this.#activeClient.eventsRetrievalProgress(progress);
  }

  tracingComplete(): void {
    this.#eventsRetrieved = 0;
    if (this.#activeClient) {
      this.#activeClient.tracingComplete();
      this.#activeClient = null;
    }
    this.#finishing = false;
  }

  async reset(): Promise<void> {
    // If we have an active client, we should try to stop
    // it before resetting it, else we will leave the
    // backend in a broken state where it thinks we are in
    // the middle of tracing, but we think we are not.
    // Then, any subsequent attempts to record will fail
    // because the backend will not let us start a second
    // tracing session.
    if (this.#activeClient) {
      await this.#tracingAgent.invoke_end();
    }
    this.#eventsRetrieved = 0;
    this.#activeClient = null;
    this.#finishing = false;
  }

  // TODO(petermarshall): Use the traceConfig argument instead of deprecated
  // categories + options.
  async start(client: TracingManagerClient, categoryFilter: string, options: string):
      Promise<Protocol.ProtocolResponseWithError> {
    if (this.#activeClient) {
      throw new Error('Tracing is already started');
    }
    const bufferUsageReportingIntervalMs = 500;
    this.#activeClient = client;
    const args = {
      bufferUsageReportingInterval: bufferUsageReportingIntervalMs,
      categories: categoryFilter,
      options,
      transferMode: Protocol.Tracing.StartRequestTransferMode.ReportEvents,
    };
    const response = await this.#tracingAgent.invoke_start(args);
    if (response.getError()) {
      this.#activeClient = null;
    }
    return response;
  }

  stop(): void {
    if (!this.#activeClient) {
      throw new Error('Tracing is not started');
    }
    if (this.#finishing) {
      throw new Error('Tracing is already being stopped');
    }
    this.#finishing = true;
    void this.#tracingAgent.invoke_end();
  }
}

export interface TracingManagerClient {
  traceEventsCollected(events: Types.Events.Event[]): void;

  tracingComplete(): void;
  tracingBufferUsage(usage: number): void;
  eventsRetrievalProgress(progress: number): void;
}

class TracingDispatcher implements ProtocolProxyApi.TracingDispatcher {
  readonly #tracingManager: TracingManager;
  constructor(tracingManager: TracingManager) {
    this.#tracingManager = tracingManager;
  }

  // `eventCount` will always be 0 as perfetto no longer calculates `approximate_event_count`
  bufferUsage({value, eventCount, percentFull}: Protocol.Tracing.BufferUsageEvent): void {
    this.#tracingManager.bufferUsage(value, eventCount, percentFull);
  }

  dataCollected({value}: Protocol.Tracing.DataCollectedEvent): void {
    this.#tracingManager.eventsCollected(value);
  }

  tracingComplete(): void {
    this.#tracingManager.tracingComplete();
  }
}

SDK.SDKModel.SDKModel.register(TracingManager, {capabilities: SDK.Target.Capability.TRACING, autostart: false});
