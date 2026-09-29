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

interface Message {
  data: Response|EventMessage;
}
type ResultValidator<T> = (result: unknown) => result is T;

const isUndefined = (result: unknown): result is undefined => result === undefined;

export class ExtensionEndpoint {
  private readonly port: Platform.HostRuntime.WorkerMessagePort;
  private nextRequestId = 0;
  private pendingRequests: Map<number, {
    resolve: (arg: unknown) => void,
    reject: (error: Error) => void,
  }>;

  constructor(port: Platform.HostRuntime.WorkerMessagePort) {
    this.port = port;
    this.port.addEventListener('message', (event: unknown) => this.onResponse(event as Message));
    (this.port as {start?: () => void}).start?.();
    (this.port as {unref?: () => void}).unref?.();
    this.pendingRequests = new Map();
  }

  sendRequest(method: string, parameters: unknown): Promise<void>;
  sendRequest<ReturnType>(method: string, parameters: unknown,
                          validate: ResultValidator<ReturnType>): Promise<ReturnType>;
  sendRequest<ReturnType>(method: string, parameters: unknown,
                          validate: ResultValidator<ReturnType>|
                          ResultValidator<undefined> = isUndefined): Promise<ReturnType|void> {
    return new Promise<ReturnType|void>((resolve, reject) => {
      const requestId = this.nextRequestId++;
      this.pendingRequests.set(requestId, {
        resolve: (result: unknown) => {
          if (!validate(result)) {
            reject(new Error(`Extension returned malformed ${method} result`));
            return;
          }
          resolve(result);
        },
        reject,
      });
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

  private onResponse(event: Message): void {
    const data = event.data;
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
