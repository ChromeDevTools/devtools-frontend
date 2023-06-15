"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Binding_name, _Binding_fn;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Binding = void 0;
const JSHandle_js_1 = require("../api/JSHandle.js");
const ErrorLike_js_1 = require("../util/ErrorLike.js");
const util_js_1 = require("./util.js");
/**
 * @internal
 */
class Binding {
    constructor(name, fn) {
        _Binding_name.set(this, void 0);
        _Binding_fn.set(this, void 0);
        __classPrivateFieldSet(this, _Binding_name, name, "f");
        __classPrivateFieldSet(this, _Binding_fn, fn, "f");
    }
    get name() {
        return __classPrivateFieldGet(this, _Binding_name, "f");
    }
    /**
     * @param context - Context to run the binding in; the context should have
     * the binding added to it beforehand.
     * @param id - ID of the call. This should come from the CDP
     * `onBindingCalled` response.
     * @param args - Plain arguments from CDP.
     */
    async run(context, id, args, isTrivial) {
        const garbage = [];
        try {
            if (!isTrivial) {
                // Getting non-trivial arguments.
                const handles = await context.evaluateHandle((name, seq) => {
                    // @ts-expect-error Code is evaluated in a different context.
                    return globalThis[name].args.get(seq);
                }, __classPrivateFieldGet(this, _Binding_name, "f"), id);
                try {
                    const properties = await handles.getProperties();
                    for (const [index, handle] of properties) {
                        // This is not straight-forward since some arguments can stringify, but
                        // aren't plain objects so add subtypes when the use-case arises.
                        if (index in args) {
                            switch (handle.remoteObject().subtype) {
                                case 'node':
                                    args[+index] = handle;
                                    break;
                                default:
                                    garbage.push(handle.dispose());
                            }
                        }
                        else {
                            garbage.push(handle.dispose());
                        }
                    }
                }
                finally {
                    await handles.dispose();
                }
            }
            await context.evaluate((name, seq, result) => {
                // @ts-expect-error Code is evaluated in a different context.
                const callbacks = globalThis[name].callbacks;
                callbacks.get(seq).resolve(result);
                callbacks.delete(seq);
            }, __classPrivateFieldGet(this, _Binding_name, "f"), id, await __classPrivateFieldGet(this, _Binding_fn, "f").call(this, ...args));
            for (const arg of args) {
                if (arg instanceof JSHandle_js_1.JSHandle) {
                    garbage.push(arg.dispose());
                }
            }
        }
        catch (error) {
            if ((0, ErrorLike_js_1.isErrorLike)(error)) {
                await context
                    .evaluate((name, seq, message, stack) => {
                    const error = new Error(message);
                    error.stack = stack;
                    // @ts-expect-error Code is evaluated in a different context.
                    const callbacks = globalThis[name].callbacks;
                    callbacks.get(seq).reject(error);
                    callbacks.delete(seq);
                }, __classPrivateFieldGet(this, _Binding_name, "f"), id, error.message, error.stack)
                    .catch(util_js_1.debugError);
            }
            else {
                await context
                    .evaluate((name, seq, error) => {
                    // @ts-expect-error Code is evaluated in a different context.
                    const callbacks = globalThis[name].callbacks;
                    callbacks.get(seq).reject(error);
                    callbacks.delete(seq);
                }, __classPrivateFieldGet(this, _Binding_name, "f"), id, error)
                    .catch(util_js_1.debugError);
            }
        }
        finally {
            await Promise.all(garbage);
        }
    }
}
exports.Binding = Binding;
_Binding_name = new WeakMap(), _Binding_fn = new WeakMap();
//# sourceMappingURL=Binding.js.map