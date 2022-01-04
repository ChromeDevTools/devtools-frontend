// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export type FinishCallback = (err: Error) => void;

export class Throttler {
  readonly #timeout: number;
  #isRunningProcess: boolean;
  #asSoonAsPossible: boolean;
  #process: (() => (Promise<unknown>))|null;
  #lastCompleteTime: number;
  #schedulePromise: Promise<unknown>;
  #scheduleResolve!: (value: unknown) => void;
  #processTimeout?: number;

  constructor(timeout: number) {
    this.#timeout = timeout;
    this.#isRunningProcess = false;
    this.#asSoonAsPossible = false;
    this.#process = null;
    this.#lastCompleteTime = 0;

    this.#schedulePromise = new Promise(fulfill => {
      this.#scheduleResolve = fulfill;
    });
  }

  private processCompleted(): void {
    this.#lastCompleteTime = this.getTime();
    this.#isRunningProcess = false;
    if (this.#process) {
      this.innerSchedule(false);
    }
    this.processCompletedForTests();
  }

  private processCompletedForTests(): void {
    // For sniffing in tests.
  }

  get process(): (() => (Promise<unknown>))|null {
    return this.#process;
  }

  private onTimeout(): void {
    this.#processTimeout = undefined;
    this.#asSoonAsPossible = false;
    this.#isRunningProcess = true;

    void Promise.resolve()
        .then(this.#process)
        .catch(console.error.bind(console))
        .then(this.processCompleted.bind(this))
        .then(this.#scheduleResolve);
    this.#schedulePromise = new Promise(fulfill => {
      this.#scheduleResolve = fulfill;
    });
    this.#process = null;
  }

  schedule(process: () => (Promise<unknown>), asSoonAsPossible?: boolean): Promise<void> {
    // Deliberately skip previous #process.
    this.#process = process;

    // Run the first scheduled task instantly.
    const hasScheduledTasks = Boolean(this.#processTimeout) || this.#isRunningProcess;
    const okToFire = this.getTime() - this.#lastCompleteTime > this.#timeout;
    asSoonAsPossible = Boolean(asSoonAsPossible) || (!hasScheduledTasks && okToFire);

    const forceTimerUpdate = asSoonAsPossible && !this.#asSoonAsPossible;
    this.#asSoonAsPossible = this.#asSoonAsPossible || asSoonAsPossible;

    this.innerSchedule(forceTimerUpdate);

    return this.#schedulePromise as Promise<void>;
  }

  private innerSchedule(forceTimerUpdate: boolean): void {
    if (this.#isRunningProcess) {
      return;
    }
    if (this.#processTimeout && !forceTimerUpdate) {
      return;
    }
    if (this.#processTimeout) {
      this.clearTimeout(this.#processTimeout);
    }

    const timeout = this.#asSoonAsPossible ? 0 : this.#timeout;
    this.#processTimeout = this.setTimeout(this.onTimeout.bind(this), timeout);
  }

  private clearTimeout(timeoutId: number): void {
    clearTimeout(timeoutId);
  }

  private setTimeout(operation: () => void, timeout: number): number {
    return window.setTimeout(operation, timeout);
  }

  private getTime(): number {
    return window.performance.now();
  }
}
