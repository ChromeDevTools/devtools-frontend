// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/** @typedef {function(!Error=):void} */
// @ts-ignore Typedef.
export let FinishCallback;

/**
 * @unrestricted
 */
export class Throttler {
  /**
   * @param {number} timeout
   */
  constructor(timeout) {
    this._timeout = timeout;
    this._isRunningProcess = false;
    /** @type {boolean} */
    this._asSoonAsPossible = false;
    /** @type {?function():(!Promise<void>)} */
    this._process = null;
    this._lastCompleteTime = 0;

    this._schedulePromise = new Promise(fulfill => {
      this._scheduleResolve = fulfill;
    });
  }

  _processCompleted() {
    this._lastCompleteTime = this._getTime();
    this._isRunningProcess = false;
    if (this._process) {
      this._innerSchedule(false);
    }
    this._processCompletedForTests();
  }

  _processCompletedForTests() {
    // For sniffing in tests.
  }

  _onTimeout() {
    delete this._processTimeout;
    this._asSoonAsPossible = false;
    this._isRunningProcess = true;

    Promise.resolve()
        .then(this._process)
        .catch(console.error.bind(console))
        .then(this._processCompleted.bind(this))
        .then(this._scheduleResolve);
    this._schedulePromise = new Promise(fulfill => {
      this._scheduleResolve = fulfill;
    });
    this._process = null;
  }

  /**
   * @param {function():(!Promise<?>)} process
   * @param {boolean=} asSoonAsPossible
   * @return {!Promise<void>}
   */
  schedule(process, asSoonAsPossible) {
    // Deliberately skip previous process.
    this._process = process;

    // Run the first scheduled task instantly.
    const hasScheduledTasks = !!this._processTimeout || this._isRunningProcess;
    const okToFire = this._getTime() - this._lastCompleteTime > this._timeout;
    asSoonAsPossible = !!asSoonAsPossible || (!hasScheduledTasks && okToFire);

    const forceTimerUpdate = asSoonAsPossible && !this._asSoonAsPossible;
    this._asSoonAsPossible = this._asSoonAsPossible || asSoonAsPossible;

    this._innerSchedule(forceTimerUpdate);

    return this._schedulePromise;
  }

  /**
   * @param {boolean} forceTimerUpdate
   */
  _innerSchedule(forceTimerUpdate) {
    if (this._isRunningProcess) {
      return;
    }
    if (this._processTimeout && !forceTimerUpdate) {
      return;
    }
    if (this._processTimeout) {
      this._clearTimeout(this._processTimeout);
    }

    const timeout = this._asSoonAsPossible ? 0 : this._timeout;
    this._processTimeout = this._setTimeout(this._onTimeout.bind(this), timeout);
  }

  /**
   *  @param {number} timeoutId
   */
  _clearTimeout(timeoutId) {
    clearTimeout(timeoutId);
  }

  /**
   * @param {function():void} operation
   * @param {number} timeout
   * @return {number}
   */
  _setTimeout(operation, timeout) {
    return window.setTimeout(operation, timeout);
  }

  /**
   * @return {number}
   */
  _getTime() {
    return window.performance.now();
  }
}
