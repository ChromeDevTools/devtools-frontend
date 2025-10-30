let registry = new WeakMap();
function getLoggables(parent) {
    return registry.get(parent || nullParent) || [];
}
export function registerLoggable(loggable, config, parent, size) {
    const values = getLoggables(parent);
    values.push({ loggable, config, parent, size });
    registry.set(parent || nullParent, values);
}
export function hasNonDomLoggables(parent) {
    return registry.has(parent || nullParent);
}
export function getNonDomLoggables(parent) {
    return [...getLoggables(parent)];
}
export function unregisterLoggables(parent) {
    registry.delete(parent || nullParent);
}
export function unregisterAllLoggables() {
    registry = new WeakMap();
}
const nullParent = {};
//# sourceMappingURL=NonDomState.js.map