// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';

interface Response {
  requestId: number;
  result: unknown;
  error: Error|null;
}

interface EventMessage {
  event: string;
}

export class ExtensionEndpoint {
  private readonly port: Platform.HostRuntime.WorkerMessagePort;
  private nextRequestId = 0;
  private pendingRequests: Map<number, {
    resolve: (arg: unknown) => void,
    reject: (error: Error) => void,
  }>;

  constructor(port: Platform.HostRuntime.WorkerMessagePort) {
    this.port = port;
    this.port.addEventListener('message', (event: unknown) => this.onResponse(event as MessageEvent));
    (this.port as {start?: () => void}).start?.();
    (this.port as {unref?: () => void}).unref?.();
    this.pendingRequests = new Map();
  }

  sendRequest<ReturnType>(method: string, parameters: unknown): Promise<ReturnType> {
    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId++;
      this.pendingRequests.set(requestId, {resolve: resolve as (arg: unknown) => void, reject});
      this.port.postMessage({requestId, method, parameters});
    });
  }

  protected disconnect(): void {
    for (const {reject} of this.pendingRequests.values()) {
      reject(new Error('Extension endpoint disconnected'));
    }
    this.pendingRequests.clear();
    this.port.close();
  }

  private onResponse(event: MessageEvent): void {
    const data = event.data as Response | EventMessage;
    if ('event' in data) {
      this.handleEvent(data);
      return;
    }
    const {requestId, result, error} = data;
    const pendingRequest = this.pendingRequests.get(requestId);
    if (!pendingRequest) {
      console.error(`No pending request ${requestId}`);
      return;
    }
    this.pendingRequests.delete(requestId);
    if (error) {
      pendingRequest.reject(new Error(error.message));
    } else {
      pendingRequest.resolve(result);
    }
  }

  protected handleEvent(_event: EventMessage): void {
    throw new Error('handleEvent is not implemented');
  }
}
