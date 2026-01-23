// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import type {HeapProfilerModel} from './HeapProfilerModel.js';
import {RuntimeModel} from './RuntimeModel.js';
import {type SDKModelObserver, TargetManager} from './TargetManager.js';

let isolateManagerInstance: IsolateManager;

export class IsolateManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    SDKModelObserver<RuntimeModel> {
  readonly #isolates = new Map<string, Isolate>();
  /**
   * Contains null while the isolateId is being retrieved.
   */
  #isolateIdByModel = new Map<RuntimeModel, string|null>();
  #observers = new Set<Observer>();
  #pollId = 0;

  constructor() {
    super();

    TargetManager.instance().observeModels(RuntimeModel, this);
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
    for (const isolate of this.#isolates.values()) {
      observer.isolateAdded(isolate);
    }
  }

  modelAdded(model: RuntimeModel): void {
    void this.#modelAdded(model);
  }

  async #modelAdded(model: RuntimeModel): Promise<void> {
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
    let isolate = this.#isolates.get(isolateId);
    if (!isolate) {
      isolate = new Isolate(isolateId);
      this.#isolates.set(isolateId, isolate);
    }
    isolate.models().add(model);
    if (isolate.models().size === 1) {
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
    const isolate = this.#isolates.get(isolateId);
    if (!isolate) {
      return;
    }
    isolate.models().delete(model);
    if (isolate.models().size) {
      for (const observer of this.#observers) {
        observer.isolateChanged(isolate);
      }
      return;
    }
    for (const observer of this.#observers) {
      observer.isolateRemoved(isolate);
    }
    this.#isolates.delete(isolateId);
  }

  isolateByModel(model: RuntimeModel): Isolate|null {
    return this.#isolates.get(this.#isolateIdByModel.get(model) || '') || null;
  }

  isolates(): Iterable<Isolate> {
    return this.#isolates.values();
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

export const enum Events {
  MEMORY_CHANGED = 'MemoryChanged',
}

export interface EventTypes {
  [Events.MEMORY_CHANGED]: Isolate;
}

export const MemoryTrendWindowMs = 120e3;
const PollIntervalMs = 2e3;

export class Isolate {
  readonly #id: string;
  readonly #models: Set<RuntimeModel>;
  #usedHeapSize: number;
  readonly #memoryTrend: MemoryTrend;

  constructor(id: string) {
    this.#id = id;
    this.#models = new Set();
    this.#usedHeapSize = 0;
    const count = MemoryTrendWindowMs / PollIntervalMs;
    this.#memoryTrend = new MemoryTrend(count);
  }

  id(): string {
    return this.#id;
  }

  models(): Set<RuntimeModel> {
    return this.#models;
  }

  runtimeModel(): RuntimeModel|null {
    return this.#models.values().next().value || null;
  }

  heapProfilerModel(): HeapProfilerModel|null {
    const runtimeModel = this.runtimeModel();
    return runtimeModel?.heapProfilerModel() ?? null;
  }

  async update(): Promise<void> {
    const model = this.runtimeModel();
    const usage = model && await model.heapUsage();
    if (!usage) {
      return;
    }
    this.#usedHeapSize = usage.usedSize + (usage.embedderHeapUsedSize ?? 0) + (usage.backingStorageSize ?? 0);
    this.#memoryTrend.add(this.#usedHeapSize);
    IsolateManager.instance().dispatchEventToListeners(Events.MEMORY_CHANGED, this);
  }

  samplesCount(): number {
    return this.#memoryTrend.count();
  }

  usedHeapSize(): number {
    return this.#usedHeapSize;
  }

  /**
   * bytes per millisecond
   */
  usedHeapSizeGrowRate(): number {
    return this.#memoryTrend.fitSlope();
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
