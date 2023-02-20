// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';
import {type ObjectSnapshot} from './TracingModel.js';

export class TracingManager extends SDKModel<void> {
  readonly #tracingAgent: ProtocolProxyApi.TracingApi;
  #activeClient: TracingManagerClient|null;
  #eventBufferSize: number|null;
  #eventsRetrieved: number;
  #finishing?: boolean;
  constructor(target: Target) {
    super(target);
    this.#tracingAgent = target.tracingAgent();
    target.registerTracingDispatcher(new TracingDispatcher(this));

    this.#activeClient = null;
    this.#eventBufferSize = 0;
    this.#eventsRetrieved = 0;
  }

  bufferUsage(usage?: number, eventCount?: number, percentFull?: number): void {
    this.#eventBufferSize = eventCount === undefined ? null : eventCount;
    if (this.#activeClient) {
      this.#activeClient.tracingBufferUsage(usage || percentFull || 0);
    }
  }

  eventsCollected(events: EventPayload[]): void {
    if (!this.#activeClient) {
      return;
    }
    this.#activeClient.traceEventsCollected(events);
    this.#eventsRetrieved += events.length;
    if (!this.#eventBufferSize) {
      this.#activeClient.eventsRetrievalProgress(0);
      return;
    }

    if (this.#eventsRetrieved > this.#eventBufferSize) {
      this.#eventsRetrieved = this.#eventBufferSize;
    }
    this.#activeClient.eventsRetrievalProgress(this.#eventsRetrieved / this.#eventBufferSize);
  }

  tracingComplete(): void {
    this.#eventBufferSize = 0;
    this.#eventsRetrieved = 0;
    if (this.#activeClient) {
      this.#activeClient.tracingComplete();
      this.#activeClient = null;
    }
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
      options: options,
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
  traceEventsCollected(events: EventPayload[]): void;

  tracingComplete(): void;
  tracingBufferUsage(usage: number): void;
  eventsRetrievalProgress(progress: number): void;
}

class TracingDispatcher implements ProtocolProxyApi.TracingDispatcher {
  readonly #tracingManager: TracingManager;
  constructor(tracingManager: TracingManager) {
    this.#tracingManager = tracingManager;
  }

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

SDKModel.register(TracingManager, {capabilities: Capability.Tracing, autostart: false});
export interface EventPayload {
  cat?: string;
  pid: number;
  tid: number;
  ts: number;
  ph: string;
  name: string;
  args: {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/naming-convention
    sort_index: number,
    name: string,
    snapshot: ObjectSnapshot,
    data: Object|null,
  };
  dur: number;
  id: string;
  id2?: {
    global: (string|undefined),
    local: (string|undefined),
  };
  scope: string;
}
