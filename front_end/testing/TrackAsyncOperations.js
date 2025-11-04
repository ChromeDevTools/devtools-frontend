// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * Capture the original at point in creation of the module
 * Unless something before this is loaded
 * This should always be the original
 */
const originals = {
    Promise,
    requestAnimationFrame: requestAnimationFrame.bind(window),
    requestIdleCallback: requestIdleCallback.bind(window),
    setInterval: setInterval.bind(window),
    setTimeout: setTimeout.bind(window),
    cancelAnimationFrame: cancelAnimationFrame.bind(window),
    clearInterval: clearInterval.bind(window),
    clearTimeout: clearTimeout.bind(window),
    cancelIdleCallback: cancelIdleCallback.bind(window)
};
const asyncActivity = [];
export async function checkForPendingActivity(testName = '') {
    let stillPending = [];
    const wait = 5;
    let retries = 20;
    // We will perform multiple iteration of waiting and forced completions to see
    // if all promises are eventually resolved.
    while (retries > 0) {
        const pendingCount = asyncActivity.filter(a => a.pending).length;
        const totalCount = asyncActivity.length;
        try {
            const PromiseConstructor = originals.Promise;
            // First we wait for the pending async activity to finish normally
            await PromiseConstructor.all(asyncActivity.filter(a => a.pending).map(a => PromiseConstructor.race([
                a.promise,
                new PromiseConstructor((resolve, reject) => originals.setTimeout(() => {
                    if (!a.pending) {
                        resolve();
                        return;
                    }
                    // If something is still pending after some time, we try to
                    // force the completion by running timeout and animation frame
                    // handlers
                    if (a.cancelDelayed && a.runImmediate) {
                        a.cancelDelayed();
                        a.runImmediate();
                    }
                    else {
                        reject();
                    }
                }, wait)),
            ])));
            // If the above didn't throw, all the original pending activity has
            // completed, but it could have triggered more
            stillPending = asyncActivity.filter(a => a.pending);
            if (!stillPending.length) {
                break;
            }
            --retries;
        }
        catch {
            stillPending = asyncActivity.filter(a => a.pending);
            const newTotalCount = asyncActivity.length;
            // Something is still pending. It might get resolved by force completion
            // of new activity added during the iteration, so let's retry a couple of
            // times.
            if (newTotalCount === totalCount && stillPending.length === pendingCount) {
                --retries;
            }
        }
    }
    if (stillPending.length) {
        throw new Error(`The test "${testName}" has completed, but there are still pending async operations\n` +
            stillPending.map(a => `Pending '${a.type}' created at: \n${a.stack}`).join('\n\n'));
    }
}
export function stopTrackingAsyncActivity() {
    asyncActivity.length = 0;
    restoreAll();
}
function trackingRequestAnimationFrame(fn) {
    const activity = { type: 'requestAnimationFrame', pending: true, stack: getStack(new Error()) };
    let id = 0;
    activity.promise = new originals.Promise(resolve => {
        activity.runImmediate = () => {
            fn(performance.now());
            activity.pending = false;
            resolve();
        };
        id = originals.requestAnimationFrame(activity.runImmediate);
        activity.id = 'a' + id;
        activity.cancelDelayed = () => {
            originals.cancelAnimationFrame(id);
            activity.pending = false;
            resolve();
        };
    });
    asyncActivity.push(activity);
    return id;
}
function trackingRequestIdleCallback(fn, opts) {
    const activity = { type: 'requestIdleCallback', pending: true, stack: getStack(new Error()) };
    let id = 0;
    activity.promise = new originals.Promise(resolve => {
        activity.runImmediate = (idleDeadline) => {
            fn(idleDeadline ?? { didTimeout: true, timeRemaining: () => 0 });
            activity.pending = false;
            resolve();
        };
        id = originals.requestIdleCallback(activity.runImmediate, opts);
        activity.id = 'd' + id;
        activity.cancelDelayed = () => {
            originals.cancelIdleCallback(id);
            activity.pending = false;
            resolve();
        };
    });
    asyncActivity.push(activity);
    return id;
}
function trackingSetTimeout(arg, time, ...params) {
    const activity = { type: 'setTimeout', pending: true, stack: getStack(new Error()) };
    let id;
    activity.promise = new originals.Promise(resolve => {
        activity.runImmediate = () => {
            originals.clearTimeout(id);
            if (typeof (arg) === 'function') {
                arg(...params);
            }
            else {
                eval(arg);
            }
            activity.pending = false;
            resolve();
        };
        id = originals.setTimeout(activity.runImmediate, time);
        activity.id = 't' + id;
        activity.cancelDelayed = () => {
            originals.clearTimeout(id);
            activity.pending = false;
            resolve();
        };
    });
    asyncActivity.push(activity);
    return id;
}
function trackingSetInterval(arg, time, ...params) {
    const activity = {
        type: 'setInterval',
        pending: true,
        stack: getStack(new Error()),
    };
    let id = 0;
    activity.promise = new originals.Promise(resolve => {
        id = originals.setInterval(arg, time, ...params);
        activity.id = 'i' + id;
        activity.cancelDelayed = () => {
            originals.clearInterval(id);
            activity.pending = false;
            resolve();
        };
    });
    asyncActivity.push(activity);
    return id;
}
function cancelTrackingActivity(id) {
    const activity = asyncActivity.find(a => a.id === id);
    if (activity?.cancelDelayed) {
        activity.cancelDelayed();
    }
}
/**
 * Extracted into separate object which will make TypeScript
 * check fail if new properties are added.
 */
const BasePromise = {
    all: Promise.all,
    allSettled: Promise.allSettled,
    any: Promise.any,
    race: Promise.race,
    reject: Promise.reject,
    resolve: Promise.resolve,
    withResolvers: Promise.withResolvers,
};
// We can't subclass native Promise here as this will cause all derived promises
// (e.g. those returned by `then`) to also be subclass instances. This results
// in a new asyncActivity entry on each iteration of checkForPendingActivity
// which never settles.
const TrackingPromise = Object.assign(function (arg) {
    const promise = new originals.Promise(arg);
    const activity = {
        type: 'Promise',
        promise,
        stack: getStack(new Error()),
        pending: false,
    };
    promise.then = function (onFulfilled, onRejected) {
        activity.pending = true;
        return originals.Promise.prototype.then.apply(this, [
            result => {
                if (!onFulfilled) {
                    return this;
                }
                activity.pending = false;
                return onFulfilled(result);
            },
            result => {
                if (!onRejected) {
                    return this;
                }
                activity.pending = false;
                return onRejected(result);
            },
        ]);
    };
    asyncActivity.push(activity);
    return promise;
}, BasePromise);
const stubMethods = {
    requestAnimationFrame: trackingRequestAnimationFrame,
    setTimeout: trackingSetTimeout,
    setInterval: trackingSetInterval,
    requestIdleCallback: trackingRequestIdleCallback,
    cancelAnimationFrame: id => cancelTrackingActivity('a' + id),
    clearTimeout: id => cancelTrackingActivity('t' + id),
    clearInterval: id => cancelTrackingActivity('i' + id),
    cancelIdleCallback: id => cancelTrackingActivity('d' + id),
    Promise: TrackingPromise,
};
export function startTrackingAsyncActivity() {
    // Reset everything before starting a new tracking session.
    // Do this in case something went wrong with cleanup
    stopTrackingAsyncActivity();
    // We are tracking all asynchronous activity but let it run normally during
    // the test.
    stub('requestAnimationFrame');
    stub('setTimeout');
    stub('setInterval');
    stub('requestIdleCallback');
    stub('cancelAnimationFrame');
    stub('clearTimeout');
    stub('clearInterval');
    stub('cancelIdleCallback');
    stub('Promise');
}
const stubs = new Set();
function stub(name) {
    window[name] = stubMethods[name];
    stubs.add(name);
}
function restoreAll() {
    for (const name of stubs) {
        if (window[name] !== stubMethods[name]) {
            throw new Error(`Unexpected stub for method ${name} found`);
        }
        window[name] = originals[name];
    }
    stubs.clear();
}
function getStack(error) {
    return (error.stack ?? 'No stack').split('\n').slice(2).join('\n');
}
//# sourceMappingURL=TrackAsyncOperations.js.map