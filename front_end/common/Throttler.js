// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Common.Throttler = class {
  /**
   * @param {number} timeout
   */
  constructor(timeout) {
    this._timeout = timeout;
    this._isRunningProcess = false;
    this._asSoonAsPossible = false;
    /** @type {?function():(!Promise.<?>)} */
    this._process = null;
    this._lastCompleteTime = 0;
  }

  _processCompleted() {
    this._lastCompleteTime = window.performance.now();
    this._isRunningProcess = false;
    if (this._process)
      this._innerSchedule(false);
    this._processCompletedForTests();
  }

  _processCompletedForTests() {
    // For sniffing in tests.
  }

  _onTimeout() {
    delete this._processTimeout;
    this._asSoonAsPossible = false;
    this._isRunningProcess = true;

    Promise.resolve().then(this._process).catch(console.error.bind(console)).then(this._processCompleted.bind(this));
    this._process = null;
  }

  /**
   * @param {function():(!Promise.<?>)} process
   * @param {boolean=} asSoonAsPossible
   */
  schedule(process, asSoonAsPossible) {
    // Deliberately skip previous process.
    this._process = process;

    // Run the first scheduled task instantly.
    var hasScheduledTasks = !!this._processTimeout || this._isRunningProcess;
    var okToFire = window.performance.now() - this._lastCompleteTime > this._timeout;
    asSoonAsPossible = !!asSoonAsPossible || (!hasScheduledTasks && okToFire);

    var forceTimerUpdate = asSoonAsPossible && !this._asSoonAsPossible;
    this._asSoonAsPossible = this._asSoonAsPossible || asSoonAsPossible;

    this._innerSchedule(forceTimerUpdate);
  }

  flush() {
    if (this._process)
      this._onTimeout();
  }

  /**
   * @param {boolean} forceTimerUpdate
   */
  _innerSchedule(forceTimerUpdate) {
    if (this._isRunningProcess)
      return;
    if (this._processTimeout && !forceTimerUpdate)
      return;
    if (this._processTimeout)
      this._clearTimeout(this._processTimeout);

    var timeout = this._asSoonAsPossible ? 0 : this._timeout;
    this._processTimeout = this._setTimeout(this._onTimeout.bind(this), timeout);
  }

  /**
   *  @param {number} timeoutId
   */
  _clearTimeout(timeoutId) {
    clearTimeout(timeoutId);
  }

  /**
   * @param {function()} operation
   * @param {number} timeout
   * @return {number}
   */
  _setTimeout(operation, timeout) {
    return setTimeout(operation, timeout);
  }
};

/** @typedef {function(!Error=)} */
Common.Throttler.FinishCallback;
