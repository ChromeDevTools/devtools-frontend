import { needsLogging } from './LoggingConfig.js';
const state = new WeakMap();
function nextVeId() {
    const result = new BigInt64Array(1);
    crypto.getRandomValues(result);
    return Number(result[0] >> (64n - 53n));
}
export function getOrCreateLoggingState(loggable, config, parent) {
    if (config.parent && parentProviders.has(config.parent) && loggable instanceof Element) {
        parent = parentProviders.get(config.parent)?.(loggable);
        while (parent instanceof Element && !needsLogging(parent)) {
            parent = parent.parentElementOrShadowHost() ?? undefined;
        }
    }
    if (state.has(loggable)) {
        const currentState = state.get(loggable);
        if (parent && currentState.parent !== getLoggingState(parent)) {
            currentState.parent = getLoggingState(parent);
        }
        return currentState;
    }
    const loggableState = {
        impressionLogged: false,
        processed: false,
        config,
        veid: nextVeId(),
        parent: parent ? getLoggingState(parent) : null,
        size: new DOMRect(0, 0, 0, 0),
    };
    state.set(loggable, loggableState);
    return loggableState;
}
export function getLoggingState(loggable) {
    return state.get(loggable) || null;
}
const parentProviders = new Map();
export function registerParentProvider(name, provider) {
    if (parentProviders.has(name)) {
        throw new Error(`Parent provider with the name '${name} is already registered'`);
    }
    parentProviders.set(name, provider);
}
/** MUST NOT BE EXPORTED */
const PARENT = Symbol('veParent');
registerParentProvider('mapped', (e) => e[PARENT]);
export function setMappedParent(element, parent) {
    element[PARENT] = parent;
}
//# sourceMappingURL=LoggingState.js.map