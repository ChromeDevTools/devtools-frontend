// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @extends {Common.Object}
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

SDK.IsolateManager.Isolate = class {
  /**
   * @param {string} id
   */
  constructor(id) {
    this._id = id;
    /** @type {!Set<!SDK.RuntimeModel>} */
    this._models = new Set();
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
};

SDK.isolateManager = new SDK.IsolateManager();
