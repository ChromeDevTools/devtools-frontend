// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import type {Target} from './SDKModel.js';
import {Capability, SDKModel} from './SDKModel.js';    // eslint-disable-line no-unused-vars
import type {ObjectSnapshot} from './TracingModel.js'; // eslint-disable-line no-unused-vars

export class TracingManager extends SDKModel {
  _tracingAgent: ProtocolProxyApi.TracingApi;
  _activeClient: TracingManagerClient|null;
  _eventBufferSize: number|null;
  _eventsRetrieved: number;
  _finishing?: boolean;
  constructor(target: Target) {
    super(target);
    this._tracingAgent = target.tracingAgent();
    target.registerTracingDispatcher(new TracingDispatcher(this));

    this._activeClient = null;
    this._eventBufferSize = 0;
    this._eventsRetrieved = 0;
  }

  _bufferUsage(usage?: number, eventCount?: number, percentFull?: number): void {
    this._eventBufferSize = eventCount === undefined ? null : eventCount;
    if (this._activeClient) {
      this._activeClient.tracingBufferUsage(usage || percentFull || 0);
    }
  }

  _eventsCollected(events: EventPayload[]): void {
    if (!this._activeClient) {
      return;
    }
    this._activeClient.traceEventsCollected(events);
    this._eventsRetrieved += events.length;
    if (!this._eventBufferSize) {
      this._activeClient.eventsRetrievalProgress(0);
      return;
    }

    if (this._eventsRetrieved > this._eventBufferSize) {
      this._eventsRetrieved = this._eventBufferSize;
    }
    this._activeClient.eventsRetrievalProgress(this._eventsRetrieved / this._eventBufferSize);
  }

  _tracingComplete(): void {
    this._eventBufferSize = 0;
    this._eventsRetrieved = 0;
    if (this._activeClient) {
      this._activeClient.tracingComplete();
      this._activeClient = null;
    }
    this._finishing = false;
  }

  // TODO(petermarshall): Use the traceConfig argument instead of deprecated
  // categories + options.
  async start(client: TracingManagerClient, categoryFilter: string, options: string):
      Promise<Protocol.ProtocolResponseWithError> {
    if (this._activeClient) {
      throw new Error('Tracing is already started');
    }
    const bufferUsageReportingIntervalMs = 500;
    this._activeClient = client;
    const args = {
      bufferUsageReportingInterval: bufferUsageReportingIntervalMs,
      categories: categoryFilter,
      options: options,
      transferMode: Protocol.Tracing.StartRequestTransferMode.ReportEvents,
    };
    const response = await this._tracingAgent.invoke_start(args);
    if (response.getError()) {
      this._activeClient = null;
    }
    return response;
  }

  stop(): void {
    if (!this._activeClient) {
      throw new Error('Tracing is not started');
    }
    if (this._finishing) {
      throw new Error('Tracing is already being stopped');
    }
    this._finishing = true;
    this._tracingAgent.invoke_end();
  }
}

/**
 * @interface
 */
export interface TracingManagerClient {
  traceEventsCollected(events: EventPayload[]): void;

  tracingComplete(): void;
  tracingBufferUsage(usage: number): void;
  eventsRetrievalProgress(progress: number): void;
}

class TracingDispatcher implements ProtocolProxyApi.TracingDispatcher {
  _tracingManager: TracingManager;
  constructor(tracingManager: TracingManager) {
    this._tracingManager = tracingManager;
  }

  bufferUsage({value, eventCount, percentFull}: Protocol.Tracing.BufferUsageEvent): void {
    this._tracingManager._bufferUsage(value, eventCount, percentFull);
  }

  dataCollected({value}: Protocol.Tracing.DataCollectedEvent): void {
    this._tracingManager._eventsCollected(value);
  }

  tracingComplete(): void {
    this._tracingManager._tracingComplete();
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
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  bind_id: string;
  s: string;
}
