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
    /** @type {!Map<string, !SDK.IsolateManager.Isolate>} */
    this._isolates = new Map();
    // _isolateIdByModel contains null while the isolateId is being retrieved.
    /** @type {!Map<!SDK.RuntimeModel, ?string>} */
    this._isolateIdByModel = new Map();
    SDK.targetManager.observeModels(SDK.RuntimeModel, this);
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
    this._isolateIdByModel.delete(model);
    if (!isolateId)
      return;
    this._isolateIdByModel.set(model, isolateId);
    let isolate = this._isolates.get(isolateId);
    if (!isolate) {
      isolate = new SDK.IsolateManager.Isolate(isolateId);
      this._isolates.set(isolateId, isolate);
    }
    const event =
        !isolate._models.size ? SDK.IsolateManager.Events.IsolateAdded : SDK.IsolateManager.Events.IsolateChanged;
    isolate._models.add(model);
    this.dispatchEventToListeners(event, isolate);
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
      this.dispatchEventToListeners(SDK.IsolateManager.Events.IsolateChanged, isolate);
    } else {
      this.dispatchEventToListeners(SDK.IsolateManager.Events.IsolateRemoved, isolate);
      this._isolates.delete(isolateId);
    }
  }

  /**
   * @param {!SDK.RuntimeModel} model
   * @return {?SDK.IsolateManager.Isolate}
   */
  isolateByModel(model) {
    return this._isolates.get(this._isolateIdByModel.get(model) || '') || null;
  }
};

/** @enum {symbol} */
SDK.IsolateManager.Events = {
  IsolateAdded: Symbol('IsolateAdded'),
  IsolateRemoved: Symbol('IsolateRemoved'),
  IsolateChanged: Symbol('IsolateChanged')
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
