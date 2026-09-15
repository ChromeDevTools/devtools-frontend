// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as WorkerThreads from 'node:worker_threads';
class NodeWorkerScope {
    postMessage(message, transfer) {
        WorkerThreads.parentPort?.postMessage(message, transfer);
    }
    set onmessage(listener) {
        WorkerThreads.parentPort?.addEventListener('message', msg => {
            listener(msg);
        });
    }
}
class NodeWorker {
    #worker;
    #workerPromise;
    #disposed = false;
    #rejectWorkerPromise;
    constructor(url) {
        const worker = new WorkerThreads.Worker(new URL(url));
        this.#worker = worker;
        this.#workerPromise = new Promise((resolve, reject) => {
            this.#rejectWorkerPromise = reject;
            worker.once('message', (message) => {
                if (message === 'workerReady') {
                    resolve(worker);
                }
            });
            worker.on('error', reject);
        });
        // Prevent unhandled promise rejections if the worker is terminated early.
        this.#workerPromise.catch(() => { });
    }
    postMessage(message, transfer) {
        void this.#workerPromise.then(worker => {
            if (!this.#disposed) {
                worker.postMessage(message, transfer);
            }
        });
    }
    dispose() {
        this.#disposed = true;
        void this.#worker.terminate();
    }
    terminate(immediately) {
        if (immediately) {
            this.#rejectWorkerPromise?.(new Error('Worker terminated'));
        }
        this.dispose();
    }
    set onmessage(listener) {
        void this.#workerPromise.then(worker => {
            worker.on('message', (data) => {
                if (!this.#disposed) {
                    listener({ data, ports: [] });
                }
            });
        });
    }
    set onerror(listener) {
        void this.#workerPromise.then(worker => {
            worker.on('error', (error) => {
                if (!this.#disposed) {
                    listener({ type: 'error', ...error });
                }
            });
        });
    }
}
export const HOST_RUNTIME = {
    createWorker(url) {
        return new NodeWorker(url);
    },
    workerScope: new NodeWorkerScope(),
    getOnLine() {
        return true;
    },
    getUserAgent() {
        return 'Node.js';
    },
    getLocalStorage() {
        return undefined;
    },
    getDevicePixelRatio() {
        return 1;
    },
    async saveScreenshot(_options) { },
    revokeLastScreenshotUrl() { },
};
//# sourceMappingURL=HostRuntime.js.map