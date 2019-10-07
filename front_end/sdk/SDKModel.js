/*
 * Copyright 2019 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/** @type {!Map<function(new:SDK.SDKModel, !SDK.Target), !{capabilities: number, autostart: boolean}>} */
const _registeredModels = new Map();

/**
 * @unrestricted
 */
export default class SDKModel extends Common.Object {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super();
    this._target = target;
  }

  /**
   * @return {!SDK.Target}
   */
  target() {
    return this._target;
  }

  /**
   * Override this method to perform tasks that are required to suspend the
   * model and that still need other models in an unsuspended state.
   * @param {string=} reason - optionally provide a reason, the model can respond accordingly
   * @return {!Promise}
   */
  preSuspendModel(reason) {
    return Promise.resolve();
  }

  /**
   * @param {string=} reason - optionally provide a reason, the model can respond accordingly
   * @return {!Promise}
   */
  suspendModel(reason) {
    return Promise.resolve();
  }

  /**
   * @return {!Promise}
   */
  resumeModel() {
    return Promise.resolve();
  }

  /**
   * Override this method to perform tasks that are required to after resuming
   * the model and that require all models already in an unsuspended state.
   * @return {!Promise}
   */
  postResumeModel() {
    return Promise.resolve();
  }

  dispose() {
  }

  /**
   * @param {function(new:SDKModel, !SDK.Target)} modelClass
   * @param {number} capabilities
   * @param {boolean} autostart
   */
  static register(modelClass, capabilities, autostart) {
    _registeredModels.set(modelClass, {capabilities, autostart});
  }

  static get registeredModels() {
    return _registeredModels;
  }
}

/* Legacy exported object */
self.SDK = self.SDK || {};

/* Legacy exported object */
SDK = SDK || {};

/** @constructor */
SDK.SDKModel = SDKModel;
