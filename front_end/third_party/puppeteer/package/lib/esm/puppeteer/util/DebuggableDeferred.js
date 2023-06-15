import { DEFERRED_PROMISE_DEBUG_TIMEOUT } from '../environment.js';
import { Deferred } from './Deferred.js';
/**
 * Creates and returns a deferred promise using DEFERRED_PROMISE_DEBUG_TIMEOUT
 * if it's specified or a normal deferred promise otherwise.
 *
 * @internal
 */
export function createDebuggableDeferred(message) {
    if (DEFERRED_PROMISE_DEBUG_TIMEOUT > 0) {
        return Deferred.create({
            message,
            timeout: DEFERRED_PROMISE_DEBUG_TIMEOUT,
        });
    }
    return Deferred.create();
}
//# sourceMappingURL=DebuggableDeferred.js.map