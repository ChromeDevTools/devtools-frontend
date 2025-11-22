// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as WorkerThreads from 'node:worker_threads';
class NodeWorkerScope {
    postMessage(message) {
        WorkerThreads.parentPort?.postMessage(message);
    }
    set onmessage(listener) {
        WorkerThreads.parentPort?.on('message', data => {
            listener({ data });
        });
    }
}
class NodeWorker {
    #workerPromise;
    #disposed = false;
    #rejectWorkerPromise;
    constructor(url) {
        this.#workerPromise = new Promise((resolve, reject) => {
            this.#rejectWorkerPromise = reject;
            const worker = new WorkerThreads.Worker(new URL(url));
            worker.once('message', (message) => {
                if (message === 'workerReady') {
                    resolve(worker);
                }
            });
            worker.on('error', reject);
        });
    }
    postMessage(message) {
        void this.#workerPromise.then(worker => {
            if (!this.#disposed) {
                worker.postMessage(message);
            }
        });
    }
    dispose() {
        this.#disposed = true;
        void this.#workerPromise.then(worker => worker.terminate());
    }
    terminate(immediately) {
        if (immediately) {
            this.#rejectWorkerPromise?.(new Error('Worker terminated'));
        }
        this.dispose();
    }
    set onmessage(listener) {
        void this.#workerPromise.then(worker => {
            worker.on('message', data => {
                if (!this.#disposed) {
                    listener({ data });
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
};
//# sourceMappingURL=HostRuntime.js.map