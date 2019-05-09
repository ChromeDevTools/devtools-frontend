// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {SDK.SDKModelObserver}
 */
SDK.IsolateManager = class extends Common.Object {
  constructor() {
    super();
    console.assert(!SDK.isolateManager, 'Use SDK.isolateManager singleton.');
    /** @type {!Map<string, !SDK.IsolateManager.Isolate>} */
    this._isolates = new Map();
    // _isolateIdByModel contains null while the isolateId is being retrieved.
    /** @type {!Map<!SDK.RuntimeModel, ?string>} */
    this._isolateIdByModel = new Map();
    /** @type {!Set<!SDK.IsolateManager.Observer>} */
    this._observers = new Set();
    SDK.targetManager.observeModels(SDK.RuntimeModel, this);
    this._poll();
  }

  /**
   * @param {!SDK.IsolateManager.Observer} observer
   */
  observeIsolates(observer) {
    if (this._observers.has(observer))
      throw new Error('Observer can only be registered once');
    this._observers.add(observer);
    for (const isolate of this._isolates.values())
      observer.isolateAdded(isolate);
  }

  /**
   * @param {!SDK.IsolateManager.Observer} observer
   */
  unobserveIsolates(observer) {
    this._observers.delete(observer);
  }

  /**
   * @override
   * @param {!SDK.RuntimeModel} model
   */
  modelAdded(model) {
    this._modelAdded(model);
  }

  /**
   * @param {!SDK.RuntimeModel} model
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
      isolate = new SDK.IsolateManager.Isolate(isolateId);
      this._isolates.set(isolateId, isolate);
    }
    isolate._models.add(model);
    if (isolate._models.size === 1) {
      for (const observer of this._observers)
        observer.isolateAdded(isolate);
    } else {
      for (const observer of this._observers)
        observer.isolateChanged(isolate);
    }
  }

  /**
   * @override
   * @param {!SDK.RuntimeModel} model
   */
  modelRemoved(model) {
    const isolateId = this._isolateIdByModel.get(model);
    this._isolateIdByModel.delete(model);
    if (!isolateId)
      return;
    const isolate = this._isolates.get(isolateId);
    isolate._models.delete(model);
    if (isolate._models.size) {
      for (const observer of this._observers)
        observer.isolateChanged(isolate);
      return;
    }
    for (const observer of this._observers)
      observer.isolateRemoved(isolate);
    this._isolates.delete(isolateId);
  }

  /**
   * @param {!SDK.RuntimeModel} model
   * @return {?SDK.IsolateManager.Isolate}
   */
  isolateByModel(model) {
    return this._isolates.get(this._isolateIdByModel.get(model) || '') || null;
  }

  /**
   * @return {!IteratorIterable<!SDK.IsolateManager.Isolate>}
   */
  isolates() {
    return this._isolates.values();
  }

  async _poll() {
    while (true) {
      await Promise.all(Array.from(this.isolates(), isolate => isolate._update()));
      await new Promise(r => setTimeout(r, SDK.IsolateManager.PollIntervalMs));
    }
  }
};

/**
 * @interface
 */
SDK.IsolateManager.Observer = function() {};

SDK.IsolateManager.Observer.prototype = {
  /**
   * @param {!SDK.IsolateManager.Isolate} isolate
   */
  isolateAdded(isolate) {},

  /**
   * @param {!SDK.IsolateManager.Isolate} isolate
   */
  isolateRemoved(isolate) {},
  /**
   * @param {!SDK.IsolateManager.Isolate} isolate
   */
  isolateChanged(isolate) {},
};

/** @enum {symbol} */
SDK.IsolateManager.Events = {
  MemoryChanged: Symbol('MemoryChanged')
};

SDK.IsolateManager.MemoryTrendWindowMs = 120e3;
SDK.IsolateManager.PollIntervalMs = 2e3;

SDK.IsolateManager.Isolate = class {
  /**
   * @param {string} id
   */
  constructor(id) {
    this._id = id;
    /** @type {!Set<!SDK.RuntimeModel>} */
    this._models = new Set();
    this._usedHeapSize = 0;
    const count = SDK.IsolateManager.MemoryTrendWindowMs / SDK.IsolateManager.PollIntervalMs;
    this._memoryTrend = new SDK.IsolateManager.MemoryTrend(count);
  }

  /**
   * @return {string}
   */
  id() {
    return this._id;
  }

  /**
   * @return {!Set<!SDK.RuntimeModel>}
   */
  models() {
    return this._models;
  }

  /**
   * @return {?SDK.RuntimeModel}
   */
  runtimeModel() {
    return this._models.values().next().value || null;
  }

  /**
   * @return {?SDK.HeapProfilerModel}
   */
  heapProfilerModel() {
    const runtimeModel = this.runtimeModel();
    return runtimeModel && runtimeModel.heapProfilerModel();
  }

  async _update() {
    const model = this.runtimeModel();
    const usage = model && await model.heapUsage();
    if (!usage)
      return;
    this._usedHeapSize = usage.usedSize;
    this._memoryTrend.add(this._usedHeapSize);
    SDK.isolateManager.dispatchEventToListeners(SDK.IsolateManager.Events.MemoryChanged, this);
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
};

/**
 * @unrestricted
 */
SDK.IsolateManager.MemoryTrend = class {
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
};

SDK.isolateManager = new SDK.IsolateManager();
