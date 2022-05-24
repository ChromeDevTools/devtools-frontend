// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

type Response = {
  requestId: number,
  result: unknown,
  error: Error|null,
};

type Event = {
  event: string,
};

type Message = MessageEvent<Response|Event>;

export class ExtensionEndpoint {
  private readonly port: MessagePort;
  private nextRequestId: number = 0;
  private pendingRequests: Map<number, {
    resolve: (arg: unknown) => void,
    reject: (error: Error) => void,
  }>;

  constructor(port: MessagePort) {
    this.port = port;
    this.port.onmessage = this.onResponse.bind(this);
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

  private onResponse({data}: Message): void {
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

  protected handleEvent(_event: Event): void {
    throw new Error('handleEvent is not implemented');
  }
}
