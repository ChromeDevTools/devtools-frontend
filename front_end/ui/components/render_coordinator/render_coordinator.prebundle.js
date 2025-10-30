// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
class WorkItem {
    promise;
    trigger;
    cancel;
    label;
    handler;
    constructor(label, handler) {
        const { promise, resolve, reject } = Promise.withResolvers();
        this.promise = promise.then(() => this.handler());
        this.trigger = resolve;
        this.cancel = reject;
        this.label = label;
        this.handler = handler;
    }
}
export class RenderCoordinatorQueueEmptyEvent extends Event {
    static eventName = 'renderqueueempty';
    constructor() {
        super(RenderCoordinatorQueueEmptyEvent.eventName);
    }
}
export class RenderCoordinatorNewFrameEvent extends Event {
    static eventName = 'newframe';
    constructor() {
        super(RenderCoordinatorNewFrameEvent.eventName);
    }
}
let loggingEnabled = null;
const loggingRecords = [];
export function setLoggingEnabled(enabled, options = {}) {
    if (enabled) {
        loggingEnabled = {
            onlyNamed: options.onlyNamed,
            storageLimit: options.storageLimit,
        };
    }
    else {
        loggingEnabled = null;
        loggingRecords.length = 0;
    }
}
const UNNAMED_READ = 'Unnamed read';
const UNNAMED_WRITE = 'Unnamed write';
const UNNAMED_SCROLL = 'Unnamed scroll';
const DEADLOCK_TIMEOUT = 1500;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.__getRenderCoordinatorPendingFrames = function () {
    return hasPendingWork() ? 1 : 0;
};
let pendingReaders = [];
let pendingWriters = [];
let scheduledWorkId = 0;
export function hasPendingWork() {
    return pendingReaders.length + pendingWriters.length !== 0;
}
export function done(options) {
    if (!hasPendingWork() && !options?.waitForWork) {
        logIfEnabled('[Queue empty]');
        return Promise.resolve();
    }
    return new Promise(resolve => window.addEventListener(RenderCoordinatorQueueEmptyEvent.eventName, () => resolve(), { once: true }));
}
export async function read(labelOrCallback, callback) {
    if (typeof labelOrCallback === 'string') {
        if (!callback) {
            throw new Error('Read called with label but no callback');
        }
        return await enqueueHandler("read" /* ACTION.READ */, labelOrCallback, callback);
    }
    return await enqueueHandler("read" /* ACTION.READ */, UNNAMED_READ, labelOrCallback);
}
export async function write(labelOrCallback, callback) {
    if (typeof labelOrCallback === 'string') {
        if (!callback) {
            throw new Error('Write called with label but no callback');
        }
        return await enqueueHandler("write" /* ACTION.WRITE */, labelOrCallback, callback);
    }
    return await enqueueHandler("write" /* ACTION.WRITE */, UNNAMED_WRITE, labelOrCallback);
}
export function takeLoggingRecords() {
    const logs = [...loggingRecords];
    loggingRecords.length = 0;
    return logs;
}
export async function scroll(labelOrCallback, callback) {
    if (typeof labelOrCallback === 'string') {
        if (!callback) {
            throw new Error('Scroll called with label but no callback');
        }
        return await enqueueHandler("read" /* ACTION.READ */, labelOrCallback, callback);
    }
    return await enqueueHandler("read" /* ACTION.READ */, UNNAMED_SCROLL, labelOrCallback);
}
function enqueueHandler(action, label, callback) {
    const hasName = ![UNNAMED_READ, UNNAMED_WRITE, UNNAMED_SCROLL].includes(label);
    label = `${action === "read" /* ACTION.READ */ ? '[Read]' : '[Write]'}: ${label}`;
    let workItems = null;
    switch (action) {
        case "read" /* ACTION.READ */:
            workItems = pendingReaders;
            break;
        case "write" /* ACTION.WRITE */:
            workItems = pendingWriters;
            break;
        default:
            throw new Error(`Unknown action: ${action}`);
    }
    let workItem = hasName ? workItems.find(w => w.label === label) : undefined;
    if (!workItem) {
        workItem = new WorkItem(label, callback);
        workItems.push(workItem);
    }
    else {
        // We are always using the latest handler, so that we don't end up with a
        // stale results. We are reusing the promise to avoid blocking the first invocation, when
        // it is being "overridden" by another one.
        workItem.handler = callback;
    }
    scheduleWork();
    return workItem.promise;
}
function scheduleWork() {
    if (scheduledWorkId !== 0) {
        return;
    }
    scheduledWorkId = requestAnimationFrame(async () => {
        if (!hasPendingWork()) {
            // All pending work has completed.
            // The events dispatched below are mostly for testing contexts.
            window.dispatchEvent(new RenderCoordinatorQueueEmptyEvent());
            logIfEnabled('[Queue empty]');
            scheduledWorkId = 0;
            return;
        }
        window.dispatchEvent(new RenderCoordinatorNewFrameEvent());
        logIfEnabled('[New frame]');
        const readers = pendingReaders;
        pendingReaders = [];
        const writers = pendingWriters;
        pendingWriters = [];
        // Start with all the readers and allow them
        // to proceed together.
        for (const reader of readers) {
            logIfEnabled(reader.label);
            reader.trigger();
        }
        // Wait for them all to be done.
        try {
            await Promise.race([
                Promise.all(readers.map(r => r.promise)),
                new Promise((_, reject) => {
                    window.setTimeout(() => reject(new Error(`Readers took over ${DEADLOCK_TIMEOUT}ms. Possible deadlock?`)), DEADLOCK_TIMEOUT);
                }),
            ]);
        }
        catch (err) {
            rejectAll(readers, err);
        }
        // Next do all the writers as a block.
        for (const writer of writers) {
            logIfEnabled(writer.label);
            writer.trigger();
        }
        // And wait for them to be done, too.
        try {
            await Promise.race([
                Promise.all(writers.map(w => w.promise)),
                new Promise((_, reject) => {
                    window.setTimeout(() => reject(new Error(`Writers took over ${DEADLOCK_TIMEOUT}ms. Possible deadlock?`)), DEADLOCK_TIMEOUT);
                }),
            ]);
        }
        catch (err) {
            rejectAll(writers, err);
        }
        // Since there may have been more work requested in
        // the callback of a reader / writer, we attempt to schedule
        // it at this point.
        scheduledWorkId = 0;
        scheduleWork();
    });
}
function rejectAll(handlers, error) {
    for (const handler of handlers) {
        handler.cancel(error);
    }
}
export function cancelPending() {
    const error = new Error();
    rejectAll(pendingReaders, error);
    rejectAll(pendingWriters, error);
}
function logIfEnabled(value) {
    if (loggingEnabled === null) {
        return;
    }
    if (loggingEnabled.onlyNamed) {
        if (value.endsWith(UNNAMED_READ) || value.endsWith(UNNAMED_WRITE) || value.endsWith(UNNAMED_SCROLL)) {
            return;
        }
    }
    loggingRecords.push({ time: performance.now(), value });
    // Keep the log at the log size.
    const loggingLimit = loggingEnabled.storageLimit ?? 100;
    while (loggingRecords.length > loggingLimit) {
        loggingRecords.shift();
    }
}
//# sourceMappingURL=render_coordinator.prebundle.js.map