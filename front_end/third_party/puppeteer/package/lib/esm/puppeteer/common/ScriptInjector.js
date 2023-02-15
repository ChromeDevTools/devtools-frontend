var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _ScriptInjector_instances, _ScriptInjector_updated, _ScriptInjector_amendments, _ScriptInjector_update, _ScriptInjector_get;
import { source as injectedSource } from '../generated/injected.js';
class ScriptInjector {
    constructor() {
        _ScriptInjector_instances.add(this);
        _ScriptInjector_updated.set(this, false);
        _ScriptInjector_amendments.set(this, new Set());
    }
    // Appends a statement of the form `(PuppeteerUtil) => {...}`.
    append(statement) {
        __classPrivateFieldGet(this, _ScriptInjector_instances, "m", _ScriptInjector_update).call(this, () => {
            __classPrivateFieldGet(this, _ScriptInjector_amendments, "f").add(statement);
        });
    }
    pop(statement) {
        __classPrivateFieldGet(this, _ScriptInjector_instances, "m", _ScriptInjector_update).call(this, () => {
            __classPrivateFieldGet(this, _ScriptInjector_amendments, "f").delete(statement);
        });
    }
    inject(inject, force = false) {
        if (__classPrivateFieldGet(this, _ScriptInjector_updated, "f") || force) {
            inject(__classPrivateFieldGet(this, _ScriptInjector_instances, "m", _ScriptInjector_get).call(this));
        }
        __classPrivateFieldSet(this, _ScriptInjector_updated, false, "f");
    }
}
_ScriptInjector_updated = new WeakMap(), _ScriptInjector_amendments = new WeakMap(), _ScriptInjector_instances = new WeakSet(), _ScriptInjector_update = function _ScriptInjector_update(callback) {
    callback();
    __classPrivateFieldSet(this, _ScriptInjector_updated, true, "f");
}, _ScriptInjector_get = function _ScriptInjector_get() {
    return `(() => {
      const module = {};
      ${injectedSource}
      ${[...__classPrivateFieldGet(this, _ScriptInjector_amendments, "f")]
        .map(statement => {
        return `(${statement})(module.exports.default);`;
    })
        .join('')}
      return module.exports.default;
    })()`;
};
/**
 * @internal
 */
export const scriptInjector = new ScriptInjector();
//# sourceMappingURL=ScriptInjector.js.map