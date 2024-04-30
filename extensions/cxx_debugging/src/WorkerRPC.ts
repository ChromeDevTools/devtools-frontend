// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type Chrome} from '../../../extension-api/ExtensionAPI.js';

import {type ModuleConfigurations} from './ModuleConfiguration.js';

import {serializeWasmValue, type WasmValue, type SerializedWasmType} from './WasmTypes.js';

export interface WorkerInterface extends Chrome.DevTools.LanguageExtensionPlugin {
  hello(moduleConfigurations: ModuleConfigurations, logPluginApiCalls: boolean): void;
}

export interface AsyncHostInterface {
  getWasmLinearMemory(offset: number, length: number, stopId: unknown): Promise<ArrayBuffer>;
  getWasmLocal(local: number, stopId: unknown): Promise<WasmValue>;
  getWasmGlobal(global: number, stopId: unknown): Promise<WasmValue>;
  getWasmOp(op: number, stopId: unknown): Promise<WasmValue>;
}

export interface HostInterface {
  getWasmLinearMemory(offset: number, length: number, stopId: unknown): ArrayBuffer;
  getWasmLocal(local: number, stopId: unknown): WasmValue;
  getWasmGlobal(global: number, stopId: unknown): WasmValue;
  getWasmOp(op: number, stopId: unknown): WasmValue;
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type AllMessages<Interface extends Record<string, any>> = {
  [k in keyof Interface]: {method: k, params: Parameters<Interface[k]>}
};

type Message<Interface extends Object> = {
  requestId: number,
}&({request: AllMessages<Interface>[keyof AllMessages<Interface>]}|{
  /* eslint-disable-next-line @typescript-eslint/naming-convention */
  sync_request: {
    request: AllMessages<Interface>[keyof AllMessages<Interface>],
    /* eslint-disable-next-line @typescript-eslint/naming-convention */
    io_buffer: {semaphore: SharedArrayBuffer, data: SharedArrayBuffer},
  },
});

export interface Channel<LocalInterface extends Object, RemoteInterface extends Object> {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  postMessage(message: /* Response<LocalInterface>|Message<RemoteInterface>*/ any): any;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  onmessage: ((e: MessageEvent<Message<LocalInterface>|Response<RemoteInterface>>) => any)|null;
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type AllResponses<Interface extends Record<string, any>> = {
  [k in keyof Interface]: ReturnType<Interface[k]>
};

type Response<Interface extends Object> = {
  requestId: number,
}&({error: string}|{response: AllResponses<Interface>[keyof AllResponses<Interface>]});

export abstract class SynchronousIOMessage<T> {
  readonly buffer: SharedArrayBuffer;
  constructor(bufferSize: number) {
    this.buffer = new SharedArrayBuffer(bufferSize);
  }

  abstract deserialize(response: number): T;

  static serialize(value: ArrayBuffer|WasmValue, buffer: SharedArrayBuffer): SerializedWasmType {
    return serializeWasmValue(value, buffer);
  }
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export class WorkerRPC<LocalInterface extends Record<string, any>, RemoteInterface extends Record<string, any>> {
  private nextRequestId = 0;
  private readonly channel: Channel<LocalInterface, RemoteInterface>;
  private readonly localHandler: LocalInterface;
  private readonly requests: Map<number, {resolve: (params: unknown) => void, reject: (message: Error) => void}> =
      new Map();
  private readonly semaphore: Int32Array;

  constructor(channel: Channel<LocalInterface, RemoteInterface>, localHandler: LocalInterface) {
    this.channel = channel;
    this.channel.onmessage = this.onmessage.bind(this);
    this.localHandler = localHandler;
    this.semaphore = new Int32Array(new SharedArrayBuffer(4));
  }

  sendMessage<Method extends keyof RemoteInterface>(method: Method, ...params: Parameters<RemoteInterface[Method]>):
      ReturnType<RemoteInterface[Method]> {
    const requestId = this.nextRequestId++;
    const promise = new Promise((resolve, reject) => {
      this.requests.set(requestId, {resolve, reject});
    });
    this.channel.postMessage({requestId, request: {method, params}});
    return promise as ReturnType<RemoteInterface[Method]>;
  }

  sendMessageSync<Method extends keyof RemoteInterface>(
      message: SynchronousIOMessage<ReturnType<RemoteInterface[Method]>>, method: Method,
      ...params: Parameters<RemoteInterface[Method]>): ReturnType<RemoteInterface[Method]> {
    const requestId = this.nextRequestId++;
    Atomics.store(this.semaphore, 0, 0);
    this.channel.postMessage({
      requestId,
      sync_request: {
        request: {method, params},
        io_buffer: {semaphore: this.semaphore.buffer as SharedArrayBuffer, data: message.buffer},
      },
    });
    while (Atomics.wait(this.semaphore, 0, 0) !== 'not-equal') {
    }
    const [response] = this.semaphore;

    return message.deserialize(response);
  }

  private async onmessage(
      event: MessageEvent<Message<LocalInterface>|Message<LocalInterface>|Response<RemoteInterface>>): Promise<void> {
    if ('request' in event.data) {
      const {requestId, request} = event.data;
      try {
        const response = await this.localHandler[request.method](...request.params);
        this.channel.postMessage({requestId, response});
      } catch (error) {
        this.channel.postMessage({requestId, error: `${error}`});
      }
    } else if ('sync_request' in event.data) {
      /* eslint-disable-next-line @typescript-eslint/naming-convention */
      const {sync_request: {request, io_buffer}} = event.data;
      let signal = -1;
      try {
        const response = await this.localHandler[request.method](...request.params);
        signal = SynchronousIOMessage.serialize(response, io_buffer.data);
      } catch (error) {
        throw error;
      } finally {
        const semaphore = new Int32Array(io_buffer.semaphore);
        Atomics.store(semaphore, 0, signal);
        Atomics.notify(semaphore, 0);
      }
    } else {
      const {requestId} = event.data;
      const callbacks = this.requests.get(requestId);
      if (callbacks) {
        const {resolve, reject} = callbacks;
        if ('error' in event.data) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.response);
        }
      }
    }
  }
}
