import { catchError } from '../../third_party/rxjs/rxjs.js';
import { ProtocolError, TimeoutError } from '../common/Errors.js';
/**
 * @internal
 */
export function getBiDiLifeCycles(event) {
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
/**
 * @internal
 */
export const lifeCycleToReadinessState = new Map([
    ['load', "complete" /* Bidi.BrowsingContext.ReadinessState.Complete */],
    ['domcontentloaded', "interactive" /* Bidi.BrowsingContext.ReadinessState.Interactive */],
]);
export function getBiDiReadinessState(event) {
    const lifeCycles = getBiDiLifeCycles(event);
    const readiness = lifeCycleToReadinessState.get(lifeCycles[0]);
    return [readiness, lifeCycles[1]];
}
/**
 * @internal
 */
export const lifeCycleToSubscribedEvent = new Map([
    ['load', 'browsingContext.load'],
    ['domcontentloaded', 'browsingContext.domContentLoaded'],
]);
/**
 * @internal
 */
export function getBiDiLifecycleEvent(event) {
    const lifeCycles = getBiDiLifeCycles(event);
    const bidiEvent = lifeCycleToSubscribedEvent.get(lifeCycles[0]);
    return [bidiEvent, lifeCycles[1]];
}
/**
 * @internal
 */
export function rewriteNavigationError(message, ms) {
    return catchError(error => {
        if (error instanceof ProtocolError) {
            error.message += ` at ${message}`;
        }
        else if (error instanceof TimeoutError) {
            error.message = `Navigation timeout of ${ms} ms exceeded`;
        }
        throw error;
    });
}
//# sourceMappingURL=lifecycle.js.map