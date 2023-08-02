// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {RPCInterface} from '../src/DevToolsPluginWorker.js';
import {ResourceLoader} from '../src/MEMFSResourceLoader.js';
import {type WasmValue} from '../src/WasmTypes.js';

export interface TestWorkerInterface {
  getWasmMemoryForTest(offset: number, length: number, stopId: unknown): Promise<ArrayBuffer>;
  getWasmLocalForTest(local: number, stopId: unknown): Promise<WasmValue>;
  getWasmGlobalForTest(global: number, stopId: unknown): Promise<WasmValue>;
  getWasmOpForTest(op: number, stopId: unknown): Promise<WasmValue>;
}

class TestWorker extends RPCInterface implements TestWorkerInterface {
  async getWasmLocalForTest(local: number, stopId: unknown): Promise<WasmValue> {
    return this.getWasmLocal(local, stopId);
  }
  async getWasmGlobalForTest(global: number, stopId: unknown): Promise<WasmValue> {
    return this.getWasmGlobal(global, stopId);
  }
  async getWasmOpForTest(op: number, stopId: unknown): Promise<WasmValue> {
    return this.getWasmOp(op, stopId);
  }
  async getWasmMemoryForTest(offset: number, length: number, stopId: unknown): Promise<ArrayBuffer> {
    return this.getWasmLinearMemory(offset, length, stopId);
  }
}

// @ts-expect-error
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  new TestWorker(self as any, new ResourceLoader());
}
