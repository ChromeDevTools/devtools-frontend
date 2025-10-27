"use strict";
export class Throttler {
  #timeout;
  #isRunningProcess;
  #asSoonAsPossible;
  #process;
  #lastCompleteTime;
  #scheduler = Promise.withResolvers();
  #processTimeout;
  constructor(timeout) {
    this.#timeout = timeout;
    this.#isRunningProcess = false;
    this.#asSoonAsPossible = false;
    this.#process = null;
    this.#lastCompleteTime = 0;
  }
  #processCompleted() {
    this.#lastCompleteTime = this.#getTime();
    this.#isRunningProcess = false;
    if (this.#process) {
      this.#schedule(false);
    }
  }
  get process() {
    return this.#process;
  }
  get processCompleted() {
    return this.#process ? this.#scheduler.promise : null;
  }
  #onTimeout() {
    this.#processTimeout = void 0;
    this.#asSoonAsPossible = false;
    this.#isRunningProcess = true;
    void Promise.resolve().then(this.#process).catch(console.error.bind(console)).then(this.#processCompleted.bind(this)).then(this.#scheduler.resolve);
    this.#scheduler = Promise.withResolvers();
    this.#process = null;
  }
  async schedule(process, scheduling = "Default" /* DEFAULT */) {
    this.#process = process;
    const hasScheduledTasks = Boolean(this.#processTimeout) || this.#isRunningProcess;
    const okToFire = this.#getTime() - this.#lastCompleteTime > this.#timeout;
    const asSoonAsPossible = scheduling === "AsSoonAsPossible" /* AS_SOON_AS_POSSIBLE */ || scheduling === "Default" /* DEFAULT */ && !hasScheduledTasks && okToFire;
    const forceTimerUpdate = asSoonAsPossible && !this.#asSoonAsPossible;
    this.#asSoonAsPossible = this.#asSoonAsPossible || asSoonAsPossible;
    this.#schedule(forceTimerUpdate);
    await this.#scheduler.promise;
  }
  #schedule(forceTimerUpdate) {
    if (this.#isRunningProcess) {
      return;
    }
    if (this.#processTimeout && !forceTimerUpdate) {
      return;
    }
    clearTimeout(this.#processTimeout);
    const timeout = this.#asSoonAsPossible ? 0 : this.#timeout;
    this.#processTimeout = window.setTimeout(this.#onTimeout.bind(this), timeout);
  }
  #getTime() {
    return window.performance.now();
  }
}
export var Scheduling = /* @__PURE__ */ ((Scheduling2) => {
  Scheduling2["DEFAULT"] = "Default";
  Scheduling2["AS_SOON_AS_POSSIBLE"] = "AsSoonAsPossible";
  Scheduling2["DELAYED"] = "Delayed";
  return Scheduling2;
})(Scheduling || {});
//# sourceMappingURL=Throttler.js.map
