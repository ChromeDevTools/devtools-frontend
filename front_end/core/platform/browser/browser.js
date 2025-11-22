var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/core/platform/browser/HostRuntime.js
var HostRuntime_exports = {};
__export(HostRuntime_exports, {
  HOST_RUNTIME: () => HOST_RUNTIME
});
var WebWorkerScope = class {
  postMessage(message) {
    self.postMessage(message);
  }
  set onmessage(listener) {
    self.onmessage = listener;
  }
};
var WebWorker = class {
  #workerPromise;
  #disposed;
  #rejectWorkerPromise;
  constructor(workerLocation) {
    this.#workerPromise = new Promise((fulfill, reject) => {
      this.#rejectWorkerPromise = reject;
      const worker = new Worker(new URL(workerLocation), { type: "module" });
      worker.onerror = (event) => {
        console.error(`Failed to load worker for ${workerLocation}:`, event);
      };
      worker.onmessage = (event) => {
        console.assert(event.data === "workerReady");
        worker.onmessage = null;
        fulfill(worker);
      };
    });
  }
  postMessage(message, transfer) {
    void this.#workerPromise.then((worker) => {
      if (!this.#disposed) {
        worker.postMessage(message, transfer ?? []);
      }
    });
  }
  dispose() {
    this.#disposed = true;
    void this.#workerPromise.then((worker) => worker.terminate());
  }
  terminate(immediately = false) {
    if (immediately) {
      this.#rejectWorkerPromise?.(new Error("Worker terminated"));
    }
    this.dispose();
  }
  set onmessage(listener) {
    void this.#workerPromise.then((worker) => {
      worker.onmessage = listener;
    });
  }
  set onerror(listener) {
    void this.#workerPromise.then((worker) => {
      worker.onerror = listener;
    });
  }
};
var HOST_RUNTIME = {
  createWorker(url) {
    return new WebWorker(url);
  },
  workerScope: new WebWorkerScope()
};
export {
  HostRuntime_exports as HostRuntime
};
//# sourceMappingURL=browser.js.map
