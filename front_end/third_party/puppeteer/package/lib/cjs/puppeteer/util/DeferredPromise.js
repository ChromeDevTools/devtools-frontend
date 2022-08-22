"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeferredPromise = exports.createDeferredPromiseWithTimer = void 0;
const Errors_js_1 = require("../common/Errors.js");
/**
 * Creates an returns a promise along with the resolve/reject functions.
 *
 * If the promise has not been resolved/rejected withing the `timeout` period,
 * the promise gets rejected with a timeout error.
 *
 * @internal
 */
function createDeferredPromiseWithTimer(timeoutMessage, timeout = 5000) {
    let isResolved = false;
    let isRejected = false;
    let resolver = (_) => { };
    let rejector = (_) => { };
    const taskPromise = new Promise((resolve, reject) => {
        resolver = resolve;
        rejector = reject;
    });
    const timeoutId = setTimeout(() => {
        isRejected = true;
        rejector(new Errors_js_1.TimeoutError(timeoutMessage));
    }, timeout);
    return Object.assign(taskPromise, {
        resolved: () => {
            return isResolved;
        },
        finished: () => {
            return isResolved || isRejected;
        },
        resolve: (value) => {
            clearTimeout(timeoutId);
            isResolved = true;
            resolver(value);
        },
        reject: (err) => {
            clearTimeout(timeoutId);
            isRejected = true;
            rejector(err);
        },
    });
}
exports.createDeferredPromiseWithTimer = createDeferredPromiseWithTimer;
/**
 * Creates an returns a promise along with the resolve/reject functions.
 *
 * @internal
 */
function createDeferredPromise() {
    let isResolved = false;
    let isRejected = false;
    let resolver = (_) => { };
    let rejector = (_) => { };
    const taskPromise = new Promise((resolve, reject) => {
        resolver = resolve;
        rejector = reject;
    });
    return Object.assign(taskPromise, {
        resolved: () => {
            return isResolved;
        },
        finished: () => {
            return isResolved || isRejected;
        },
        resolve: (value) => {
            isResolved = true;
            resolver(value);
        },
        reject: (err) => {
            isRejected = true;
            rejector(err);
        },
    });
}
exports.createDeferredPromise = createDeferredPromise;
//# sourceMappingURL=DeferredPromise.js.map