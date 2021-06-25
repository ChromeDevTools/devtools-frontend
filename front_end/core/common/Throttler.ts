// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

export type FinishCallback = (err: Error) => void;

export class Throttler {
  private readonly timeout: number;
  private isRunningProcess: boolean;
  private asSoonAsPossible: boolean;
  private process: (() => (Promise<unknown>))|null;
  private lastCompleteTime: number;
  private schedulePromise: Promise<unknown>;
  private scheduleResolve!: (value: unknown) => void;
  private processTimeout?: number;

  constructor(timeout: number) {
    this.timeout = timeout;
    this.isRunningProcess = false;
    this.asSoonAsPossible = false;
    this.process = null;
    this.lastCompleteTime = 0;

    this.schedulePromise = new Promise(fulfill => {
      this.scheduleResolve = fulfill;
    });
  }

  _processCompleted(): void {
    this.lastCompleteTime = this._getTime();
    this.isRunningProcess = false;
    if (this.process) {
      this._innerSchedule(false);
    }
    this._processCompletedForTests();
  }

  _processCompletedForTests(): void {
    // For sniffing in tests.
  }

  _onTimeout(): void {
    delete this.processTimeout;
    this.asSoonAsPossible = false;
    this.isRunningProcess = true;

    Promise.resolve()
        .then(this.process)
        .catch(console.error.bind(console))
        .then(this._processCompleted.bind(this))
        .then(this.scheduleResolve);
    this.schedulePromise = new Promise(fulfill => {
      this.scheduleResolve = fulfill;
    });
    this.process = null;
  }

  schedule(process: () => (Promise<unknown>), asSoonAsPossible?: boolean): Promise<void> {
    // Deliberately skip previous process.
    this.process = process;

    // Run the first scheduled task instantly.
    const hasScheduledTasks = Boolean(this.processTimeout) || this.isRunningProcess;
    const okToFire = this._getTime() - this.lastCompleteTime > this.timeout;
    asSoonAsPossible = Boolean(asSoonAsPossible) || (!hasScheduledTasks && okToFire);

    const forceTimerUpdate = asSoonAsPossible && !this.asSoonAsPossible;
    this.asSoonAsPossible = this.asSoonAsPossible || asSoonAsPossible;

    this._innerSchedule(forceTimerUpdate);

    return this.schedulePromise as Promise<void>;
  }

  _innerSchedule(forceTimerUpdate: boolean): void {
    if (this.isRunningProcess) {
      return;
    }
    if (this.processTimeout && !forceTimerUpdate) {
      return;
    }
    if (this.processTimeout) {
      this._clearTimeout(this.processTimeout);
    }

    const timeout = this.asSoonAsPossible ? 0 : this.timeout;
    this.processTimeout = this._setTimeout(this._onTimeout.bind(this), timeout);
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
