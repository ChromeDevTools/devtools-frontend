// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

export type FinishCallback = (err: Error) => void;

export class Throttler {
  _timeout: number;
  _isRunningProcess: boolean;
  _asSoonAsPossible: boolean;
  _process: (() => (Promise<unknown>))|null;
  _lastCompleteTime: number;
  _schedulePromise: Promise<unknown>;
  _scheduleResolve!: (value: unknown) => void;
  _processTimeout?: number;

  constructor(timeout: number) {
    this._timeout = timeout;
    this._isRunningProcess = false;
    this._asSoonAsPossible = false;
    this._process = null;
    this._lastCompleteTime = 0;

    this._schedulePromise = new Promise(fulfill => {
      this._scheduleResolve = fulfill;
    });
  }

  _processCompleted(): void {
    this._lastCompleteTime = this._getTime();
    this._isRunningProcess = false;
    if (this._process) {
      this._innerSchedule(false);
    }
    this._processCompletedForTests();
  }

  _processCompletedForTests(): void {
    // For sniffing in tests.
  }

  _onTimeout(): void {
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

  schedule(process: () => (Promise<unknown>), asSoonAsPossible?: boolean): Promise<void> {
    // Deliberately skip previous process.
    this._process = process;

    // Run the first scheduled task instantly.
    const hasScheduledTasks = Boolean(this._processTimeout) || this._isRunningProcess;
    const okToFire = this._getTime() - this._lastCompleteTime > this._timeout;
    asSoonAsPossible = Boolean(asSoonAsPossible) || (!hasScheduledTasks && okToFire);

    const forceTimerUpdate = asSoonAsPossible && !this._asSoonAsPossible;
    this._asSoonAsPossible = this._asSoonAsPossible || asSoonAsPossible;

    this._innerSchedule(forceTimerUpdate);

    return this._schedulePromise as Promise<void>;
  }

  _innerSchedule(forceTimerUpdate: boolean): void {
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

  _clearTimeout(timeoutId: number): void {
    clearTimeout(timeoutId);
  }

  _setTimeout(operation: () => void, timeout: number): number {
    return window.setTimeout(operation, timeout);
  }

  _getTime(): number {
    return window.performance.now();
  }
}
