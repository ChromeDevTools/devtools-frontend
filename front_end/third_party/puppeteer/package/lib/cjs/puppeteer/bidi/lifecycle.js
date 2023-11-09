"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewriteNavigationError = exports.getBiDiLifecycleEvent = exports.lifeCycleToSubscribedEvent = exports.getBiDiReadinessState = exports.lifeCycleToReadinessState = exports.getBiDiLifeCycles = void 0;
const rxjs_js_1 = require("../../third_party/rxjs/rxjs.js");
const Errors_js_1 = require("../common/Errors.js");
/**
 * @internal
 */
function getBiDiLifeCycles(event) {
    if (Array.isArray(event)) {
        const pageLifeCycle = event.some(lifeCycle => {
            return lifeCycle !== 'domcontentloaded';
        })
            ? 'load'
            : 'domcontentloaded';
        const networkLifeCycle = event.reduce((acc, lifeCycle) => {
            if (lifeCycle === 'networkidle0') {
                return lifeCycle;
            }
            else if (acc !== 'networkidle0' && lifeCycle === 'networkidle2') {
                return lifeCycle;
            }
            return acc;
        }, null);
        return [pageLifeCycle, networkLifeCycle];
    }
    if (event === 'networkidle0' || event === 'networkidle2') {
        return ['load', event];
    }
    return [event, null];
}
exports.getBiDiLifeCycles = getBiDiLifeCycles;
/**
 * @internal
 */
exports.lifeCycleToReadinessState = new Map([
    ['load', "complete" /* Bidi.BrowsingContext.ReadinessState.Complete */],
    ['domcontentloaded', "interactive" /* Bidi.BrowsingContext.ReadinessState.Interactive */],
]);
function getBiDiReadinessState(event) {
    const lifeCycles = getBiDiLifeCycles(event);
    const readiness = exports.lifeCycleToReadinessState.get(lifeCycles[0]);
    return [readiness, lifeCycles[1]];
}
exports.getBiDiReadinessState = getBiDiReadinessState;
/**
 * @internal
 */
exports.lifeCycleToSubscribedEvent = new Map([
    ['load', 'browsingContext.load'],
    ['domcontentloaded', 'browsingContext.domContentLoaded'],
]);
function getBiDiLifecycleEvent(event) {
    const lifeCycles = getBiDiLifeCycles(event);
    const bidiEvent = exports.lifeCycleToSubscribedEvent.get(lifeCycles[0]);
    return [bidiEvent, lifeCycles[1]];
}
exports.getBiDiLifecycleEvent = getBiDiLifecycleEvent;
function rewriteNavigationError(message, ms) {
    return (0, rxjs_js_1.catchError)(error => {
        if (error instanceof Errors_js_1.ProtocolError) {
            error.message += ` at ${message}`;
        }
        else if (error instanceof Errors_js_1.TimeoutError) {
            error.message = `Navigation timeout of ${ms} ms exceeded`;
        }
        throw error;
    });
}
exports.rewriteNavigationError = rewriteNavigationError;
//# sourceMappingURL=lifecycle.js.map