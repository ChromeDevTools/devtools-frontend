var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/core/platform/node/HostRuntime.js
var HostRuntime_exports = {};
__export(HostRuntime_exports, {
  HOST_RUNTIME: () => HOST_RUNTIME
});
import * as WorkerThreads from "node:worker_threads";
var NodeWorkerScope = class {
  postMessage(message) {
    WorkerThreads.parentPort?.postMessage(message);
  }
  set onmessage(listener) {
    WorkerThreads.parentPort?.on("message", (data) => {
      listener({ data });
    });
  }
};
var NodeWorker = class {
  #workerPromise;
  #disposed = false;
  #rejectWorkerPromise;
  constructor(url) {
    this.#workerPromise = new Promise((resolve, reject) => {
      this.#rejectWorkerPromise = reject;
      const worker = new WorkerThreads.Worker(new URL(url));
      worker.once("message", (message) => {
        if (message === "workerReady") {
          resolve(worker);
        }
      });
      worker.on("error", reject);
    });
  }
  postMessage(message) {
    void this.#workerPromise.then((worker) => {
      if (!this.#disposed) {
        worker.postMessage(message);
      }
    });
  }
  dispose() {
    this.#disposed = true;
    void this.#workerPromise.then((worker) => worker.terminate());
  }
  terminate(immediately) {
    if (immediately) {
      this.#rejectWorkerPromise?.(new Error("Worker terminated"));
    }
    this.dispose();
  }
  set onmessage(listener) {
    void this.#workerPromise.then((worker) => {
      worker.on("message", (data) => {
        if (!this.#disposed) {
          listener({ data });
        }
      });
    });
  }
  set onerror(listener) {
    void this.#workerPromise.then((worker) => {
      worker.on("error", (error) => {
        if (!this.#disposed) {
          listener({ type: "error", ...error });
        }
      });
    });
  }
};
var HOST_RUNTIME = {
  createWorker(url) {
    return new NodeWorker(url);
  },
  workerScope: new NodeWorkerScope()
};
export {
  HostRuntime_exports as HostRuntime
};
//# sourceMappingURL=node.js.map
