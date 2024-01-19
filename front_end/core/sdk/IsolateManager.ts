// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import {type HeapProfilerModel} from './HeapProfilerModel.js';
import {RuntimeModel} from './RuntimeModel.js';

import {TargetManager, type SDKModelObserver} from './TargetManager.js';

let isolateManagerInstance: IsolateManager;

export class IsolateManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    SDKModelObserver<RuntimeModel> {
  readonly #isolatesInternal: Map<string, Isolate>;
  #isolateIdByModel: Map<RuntimeModel, string|null>;
  #observers: Set<Observer>;
  #pollId: number;

  constructor() {
    super();
    this.#isolatesInternal = new Map();
    // #isolateIdByModel contains null while the isolateId is being retrieved.
    this.#isolateIdByModel = new Map();
    this.#observers = new Set();
    TargetManager.instance().observeModels(RuntimeModel, this);
    this.#pollId = 0;
  }

  static instance({forceNew}: {
    forceNew: boolean,
  } = {forceNew: false}): IsolateManager {
    if (!isolateManagerInstance || forceNew) {
      isolateManagerInstance = new IsolateManager();
    }

    return isolateManagerInstance;
  }

  observeIsolates(observer: Observer): void {
    if (this.#observers.has(observer)) {
      throw new Error('Observer can only be registered once');
    }
    if (!this.#observers.size) {
      void this.poll();
    }
    this.#observers.add(observer);
    for (const isolate of this.#isolatesInternal.values()) {
      observer.isolateAdded(isolate);
    }
  }

  unobserveIsolates(observer: Observer): void {
    this.#observers.delete(observer);
    if (!this.#observers.size) {
      ++this.#pollId;
    }  // Stops the current polling loop.
  }

  modelAdded(model: RuntimeModel): void {
    void this.modelAddedInternal(model);
  }

  private async modelAddedInternal(model: RuntimeModel): Promise<void> {
    this.#isolateIdByModel.set(model, null);
    const isolateId = await model.isolateId();
    if (!this.#isolateIdByModel.has(model)) {
      // The model has been removed during await.
      return;
    }
    if (!isolateId) {
      this.#isolateIdByModel.delete(model);
      return;
    }
    this.#isolateIdByModel.set(model, isolateId);
    let isolate = this.#isolatesInternal.get(isolateId);
    if (!isolate) {
      isolate = new Isolate(isolateId);
      this.#isolatesInternal.set(isolateId, isolate);
    }
    isolate.modelsInternal.add(model);
    if (isolate.modelsInternal.size === 1) {
      for (const observer of this.#observers) {
        observer.isolateAdded(isolate);
      }
    } else {
      for (const observer of this.#observers) {
        observer.isolateChanged(isolate);
      }
    }
  }

  modelRemoved(model: RuntimeModel): void {
    const isolateId = this.#isolateIdByModel.get(model);
    this.#isolateIdByModel.delete(model);
    if (!isolateId) {
      return;
    }
    const isolate = this.#isolatesInternal.get(isolateId);
    if (!isolate) {
      return;
    }
    isolate.modelsInternal.delete(model);
    if (isolate.modelsInternal.size) {
      for (const observer of this.#observers) {
        observer.isolateChanged(isolate);
      }
      return;
    }
    for (const observer of this.#observers) {
      observer.isolateRemoved(isolate);
    }
    this.#isolatesInternal.delete(isolateId);
  }

  isolateByModel(model: RuntimeModel): Isolate|null {
    return this.#isolatesInternal.get(this.#isolateIdByModel.get(model) || '') || null;
  }

  isolates(): Iterable<Isolate> {
    return this.#isolatesInternal.values();
  }

  private async poll(): Promise<void> {
    const pollId = this.#pollId;
    while (pollId === this.#pollId) {
      await Promise.all(Array.from(this.isolates(), isolate => isolate.update()));
      await new Promise(r => window.setTimeout(r, PollIntervalMs));
    }
  }
}

export interface Observer {
  isolateAdded(isolate: Isolate): void;

  isolateRemoved(isolate: Isolate): void;
  isolateChanged(isolate: Isolate): void;
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  MemoryChanged = 'MemoryChanged',
}

export type EventTypes = {
  [Events.MemoryChanged]: Isolate,
};

export const MemoryTrendWindowMs = 120e3;
const PollIntervalMs = 2e3;

export class Isolate {
  readonly #idInternal: string;
  readonly modelsInternal: Set<RuntimeModel>;
  #usedHeapSizeInternal: number;
  readonly #memoryTrend: MemoryTrend;

  constructor(id: string) {
    this.#idInternal = id;
    this.modelsInternal = new Set();
    this.#usedHeapSizeInternal = 0;
    const count = MemoryTrendWindowMs / PollIntervalMs;
    this.#memoryTrend = new MemoryTrend(count);
  }

  id(): string {
    return this.#idInternal;
  }

  models(): Set<RuntimeModel> {
    return this.modelsInternal;
  }

  runtimeModel(): RuntimeModel|null {
    return this.modelsInternal.values().next().value || null;
  }

  heapProfilerModel(): HeapProfilerModel|null {
    const runtimeModel = this.runtimeModel();
    return runtimeModel && runtimeModel.heapProfilerModel();
  }

  async update(): Promise<void> {
    const model = this.runtimeModel();
    const usage = model && await model.heapUsage();
    if (!usage) {
      return;
    }
    this.#usedHeapSizeInternal = usage.usedSize;
    this.#memoryTrend.add(this.#usedHeapSizeInternal);
    IsolateManager.instance().dispatchEventToListeners(Events.MemoryChanged, this);
  }

  samplesCount(): number {
    return this.#memoryTrend.count();
  }

  usedHeapSize(): number {
    return this.#usedHeapSizeInternal;
  }

  /**
   * bytes per millisecond
   */
  usedHeapSizeGrowRate(): number {
    return this.#memoryTrend.fitSlope();
  }

  isMainThread(): boolean {
    const model = this.runtimeModel();
    return model ? model.target().id() === 'main' : false;
  }
}

export class MemoryTrend {
  #maxCount: number;
  #base!: number;
  #index!: number;
  #x!: number[];
  #y!: number[];
  #sx!: number;
  #sy!: number;
  #sxx!: number;
  #sxy!: number;
  constructor(maxCount: number) {
    this.#maxCount = maxCount | 0;
    this.reset();
  }

  reset(): void {
    this.#base = Date.now();
    this.#index = 0;
    this.#x = [];
    this.#y = [];
    this.#sx = 0;
    this.#sy = 0;
    this.#sxx = 0;
    this.#sxy = 0;
  }

  count(): number {
    return this.#x.length;
  }

  add(heapSize: number, timestamp?: number): void {
    const x = typeof timestamp === 'number' ? timestamp : Date.now() - this.#base;
    const y = heapSize;
    if (this.#x.length === this.#maxCount) {
      // Turns into a cyclic buffer once it reaches the |#maxCount|.
      const x0 = this.#x[this.#index];
      const y0 = this.#y[this.#index];
      this.#sx -= x0;
      this.#sy -= y0;
      this.#sxx -= x0 * x0;
      this.#sxy -= x0 * y0;
    }
    this.#sx += x;
    this.#sy += y;
    this.#sxx += x * x;
    this.#sxy += x * y;
    this.#x[this.#index] = x;
    this.#y[this.#index] = y;
    this.#index = (this.#index + 1) % this.#maxCount;
  }

  fitSlope(): number {
    // We use the linear regression model to find the slope.
    const n = this.count();
    return n < 2 ? 0 : (this.#sxy - this.#sx * this.#sy / n) / (this.#sxx - this.#sx * this.#sx / n);
  }
}
