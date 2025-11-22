// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
class WebWorkerScope {
    postMessage(message) {
        self.postMessage(message);
    }
    set onmessage(listener) {
        self.onmessage = listener;
    }
}
class WebWorker {
    #workerPromise;
    #disposed;
    #rejectWorkerPromise;
    constructor(workerLocation) {
        this.#workerPromise = new Promise((fulfill, reject) => {
            this.#rejectWorkerPromise = reject;
            const worker = new Worker(new URL(workerLocation), { type: 'module' });
            worker.onerror = event => {
                console.error(`Failed to load worker for ${workerLocation}:`, event);
            };
            worker.onmessage = (event) => {
                console.assert(event.data === 'workerReady');
                worker.onmessage = null;
                fulfill(worker);
            };
        });
    }
    postMessage(message, transfer) {
        void this.#workerPromise.then(worker => {
            if (!this.#disposed) {
                worker.postMessage(message, transfer ?? []);
            }
        });
    }
    dispose() {
        this.#disposed = true;
        void this.#workerPromise.then(worker => worker.terminate());
    }
    terminate(immediately = false) {
        if (immediately) {
            this.#rejectWorkerPromise?.(new Error('Worker terminated'));
        }
        this.dispose();
    }
    set onmessage(listener) {
        void this.#workerPromise.then(worker => {
            worker.onmessage = listener;
        });
    }
    set onerror(listener) {
        void this.#workerPromise.then(worker => {
            worker.onerror = listener;
        });
    }
}
export const HOST_RUNTIME = {
    createWorker(url) {
        return new WebWorker(url);
    },
    workerScope: new WebWorkerScope(),
};
//# sourceMappingURL=HostRuntime.js.map