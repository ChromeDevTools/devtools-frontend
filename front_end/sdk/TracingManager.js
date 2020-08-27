// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars
import {ObjectSnapshot} from './TracingModel.js';            // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class TracingManager extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);
    this._tracingAgent = target.tracingAgent();
    target.registerTracingDispatcher(new TracingDispatcher(this));

    /** @type {?TracingManagerClient} */
    this._activeClient = null;
    /** @type {?number} */
    this._eventBufferSize = 0;
    this._eventsRetrieved = 0;
  }

  /**
   * @param {number=} usage
   * @param {number=} eventCount
   * @param {number=} percentFull
   */
  _bufferUsage(usage, eventCount, percentFull) {
    this._eventBufferSize = eventCount === undefined ? null : eventCount;
    if (this._activeClient) {
      this._activeClient.tracingBufferUsage(usage || percentFull || 0);
    }
  }

  /**
   * @param {!Array.<!EventPayload>} events
   */
  _eventsCollected(events) {
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

  _tracingComplete() {
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
  /**
   * @param {!TracingManagerClient} client
   * @param {string} categoryFilter
   * @param {string} options
   * @return {!Promise<!Object>}
   */
  async start(client, categoryFilter, options) {
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

  stop() {
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
export class TracingManagerClient {
  /**
   * @param {!Array.<!EventPayload>} events
   */
  traceEventsCollected(events) {
  }

  tracingComplete() {
  }
  /**
   * @param {number} usage
   */
  tracingBufferUsage(usage) {
  }
  /**
   * @param {number} progress
   */
  eventsRetrievalProgress(progress) {
  }
}

/**
 * @implements {ProtocolProxyApi.TracingDispatcher}
 * @unrestricted
 */
class TracingDispatcher {
  /**
   * @param {!TracingManager} tracingManager
   */
  constructor(tracingManager) {
    this._tracingManager = tracingManager;
  }

  /**
   * @override
   * @param {!Protocol.Tracing.BufferUsageEvent} event
   */
  bufferUsage({value, eventCount, percentFull}) {
    this._tracingManager._bufferUsage(value, eventCount, percentFull);
  }

  /**
   * @override
   * @param {!Protocol.Tracing.DataCollectedEvent} event
   */
  dataCollected({value}) {
    this._tracingManager._eventsCollected(value);
  }

  /**
   * @override
   */
  tracingComplete() {
    this._tracingManager._tracingComplete();
  }

  /**
   * @return {!Protocol.UsesObjectNotation}
   */
  usesObjectNotation() {
    return true;
  }
}

SDKModel.register(TracingManager, Capability.Tracing, false);

/** @typedef {!{
        cat: (string|undefined),
        pid: number,
        tid: number,
        ts: number,
        ph: string,
        name: string,
        args: !{
          sort_index: number,
          name: string,
          snapshot: ObjectSnapshot,
          data: ?Object
        },
        dur: number,
        id: string,
        id2: (!{global: (string|undefined), local: (string|undefined)}|undefined),
        scope: string,
        bind_id: string,
        s: string
    }}
 */
// @ts-ignore typedef
export let EventPayload;
