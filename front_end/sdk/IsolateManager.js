// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import {HeapProfilerModel} from './HeapProfilerModel.js';  // eslint-disable-line no-unused-vars
import {RuntimeModel} from './RuntimeModel.js';
import {SDKModelObserver, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {SDKModelObserver}
 */
export class IsolateManager extends Common.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();
    console.assert(!self.SDK.isolateManager, 'Use self.SDK.isolateManager singleton.');
    /** @type {!Map<string, !Isolate>} */
    this._isolates = new Map();
    // _isolateIdByModel contains null while the isolateId is being retrieved.
    /** @type {!Map<!RuntimeModel, ?string>} */
    this._isolateIdByModel = new Map();
    /** @type {!Set<!Observer>} */
    this._observers = new Set();
    TargetManager.instance().observeModels(RuntimeModel, this);
    this._pollId = 0;
  }

  /**
   * @param {!Observer} observer
   */
  observeIsolates(observer) {
    if (this._observers.has(observer)) {
      throw new Error('Observer can only be registered once');
    }
    if (!this._observers.size) {
      this._poll();
    }
    this._observers.add(observer);
    for (const isolate of this._isolates.values()) {
      observer.isolateAdded(isolate);
    }
  }

  /**
   * @param {!Observer} observer
   */
  unobserveIsolates(observer) {
    this._observers.delete(observer);
    if (!this._observers.size) {
      ++this._pollId;
    }  // Stops the current polling loop.
  }

  /**
   * @override
   * @param {!RuntimeModel} model
   */
  modelAdded(model) {
    this._modelAdded(model);
  }

  /**
   * @param {!RuntimeModel} model
   */
  async _modelAdded(model) {
    this._isolateIdByModel.set(model, null);
    const isolateId = await model.isolateId();
    if (!this._isolateIdByModel.has(model)) {
      // The model has been removed during await.
      return;
    }
    if (!isolateId) {
      this._isolateIdByModel.delete(model);
      return;
    }
    this._isolateIdByModel.set(model, isolateId);
    let isolate = this._isolates.get(isolateId);
    if (!isolate) {
      isolate = new Isolate(isolateId);
      this._isolates.set(isolateId, isolate);
    }
    isolate._models.add(model);
    if (isolate._models.size === 1) {
      for (const observer of this._observers) {
        observer.isolateAdded(isolate);
      }
    } else {
      for (const observer of this._observers) {
        observer.isolateChanged(isolate);
      }
    }
  }

  /**
   * @override
   * @param {!RuntimeModel} model
   */
  modelRemoved(model) {
    const isolateId = this._isolateIdByModel.get(model);
    this._isolateIdByModel.delete(model);
    if (!isolateId) {
      return;
    }
    const isolate = this._isolates.get(isolateId);
    isolate._models.delete(model);
    if (isolate._models.size) {
      for (const observer of this._observers) {
        observer.isolateChanged(isolate);
      }
      return;
    }
    for (const observer of this._observers) {
      observer.isolateRemoved(isolate);
    }
    this._isolates.delete(isolateId);
  }

  /**
   * @param {!RuntimeModel} model
   * @return {?Isolate}
   */
  isolateByModel(model) {
    return this._isolates.get(this._isolateIdByModel.get(model) || '') || null;
  }

  /**
   * @return {!IteratorIterable<!Isolate>}
   */
  isolates() {
    return this._isolates.values();
  }

  async _poll() {
    const pollId = this._pollId;
    while (pollId === this._pollId) {
      await Promise.all(Array.from(this.isolates(), isolate => isolate._update()));
      await new Promise(r => setTimeout(r, PollIntervalMs));
    }
  }
}

/**
 * @interface
 */
export class Observer {
  /**
   * @param {!Isolate} isolate
   */
  isolateAdded(isolate) {
  }

  /**
   * @param {!Isolate} isolate
   */
  isolateRemoved(isolate) {
  }
  /**
   * @param {!Isolate} isolate
   */
  isolateChanged(isolate) {
  }
}

/** @enum {symbol} */
export const Events = {
  MemoryChanged: Symbol('MemoryChanged')
};

export const MemoryTrendWindowMs = 120e3;
const PollIntervalMs = 2e3;

export class Isolate {
  /**
   * @param {string} id
   */
  constructor(id) {
    this._id = id;
    /** @type {!Set<!RuntimeModel>} */
    this._models = new Set();
    this._usedHeapSize = 0;
    const count = MemoryTrendWindowMs / PollIntervalMs;
    this._memoryTrend = new MemoryTrend(count);
  }

  /**
   * @return {string}
   */
  id() {
    return this._id;
  }

  /**
   * @return {!Set<!RuntimeModel>}
   */
  models() {
    return this._models;
  }

  /**
   * @return {?RuntimeModel}
   */
  runtimeModel() {
    return this._models.values().next().value || null;
  }

  /**
   * @return {?HeapProfilerModel}
   */
  heapProfilerModel() {
    const runtimeModel = this.runtimeModel();
    return runtimeModel && runtimeModel.heapProfilerModel();
  }

  async _update() {
    const model = this.runtimeModel();
    const usage = model && await model.heapUsage();
    if (!usage) {
      return;
    }
    this._usedHeapSize = usage.usedSize;
    this._memoryTrend.add(this._usedHeapSize);
    self.SDK.isolateManager.dispatchEventToListeners(Events.MemoryChanged, this);
  }

  /**
   * @return {number}
   */
  samplesCount() {
    return this._memoryTrend.count();
  }

  /**
   * @return {number}
   */
  usedHeapSize() {
    return this._usedHeapSize;
  }

  /**
   * @return {number} bytes per millisecond
   */
  usedHeapSizeGrowRate() {
    return this._memoryTrend.fitSlope();
  }

  /**
   * @return {boolean}
   */
  isMainThread() {
    return this.runtimeModel().target().id() === 'main';
  }

}

/**
 * @unrestricted
 */
export class MemoryTrend {
  /**
   * @param {number} maxCount
   */
  constructor(maxCount) {
    this._maxCount = maxCount | 0;
    this.reset();
  }

  reset() {
    this._base = Date.now();
    this._index = 0;
    /** @type {!Array<number>} */
    this._x = [];
    /** @type {!Array<number>} */
    this._y = [];
    this._sx = 0;
    this._sy = 0;
    this._sxx = 0;
    this._sxy = 0;
  }

  /**
   * @return {number}
   */
  count() {
    return this._x.length;
  }

  /**
   * @param {number} heapSize
   * @param {number=} timestamp
   */
  add(heapSize, timestamp) {
    const x = typeof timestamp === 'number' ? timestamp : Date.now() - this._base;
    const y = heapSize;
    if (this._x.length === this._maxCount) {
      // Turns into a cyclic buffer once it reaches the |_maxCount|.
      const x0 = this._x[this._index];
      const y0 = this._y[this._index];
      this._sx -= x0;
      this._sy -= y0;
      this._sxx -= x0 * x0;
      this._sxy -= x0 * y0;
    }
    this._sx += x;
    this._sy += y;
    this._sxx += x * x;
    this._sxy += x * y;
    this._x[this._index] = x;
    this._y[this._index] = y;
    this._index = (this._index + 1) % this._maxCount;
  }

  /**
   * @return {number}
   */
  fitSlope() {
    // We use the linear regression model to find the slope.
    const n = this.count();
    return n < 2 ? 0 : (this._sxy - this._sx * this._sy / n) / (this._sxx - this._sx * this._sx / n);
  }
}
