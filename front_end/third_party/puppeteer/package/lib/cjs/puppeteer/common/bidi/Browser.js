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
var _Browser_process, _Browser_closeCallback, _Browser_connection;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Browser = void 0;
const Browser_js_1 = require("../../api/Browser.js");
/**
 * @internal
 */
class Browser extends Browser_js_1.Browser {
    /**
     * @internal
     */
    constructor(opts) {
        super();
        _Browser_process.set(this, void 0);
        _Browser_closeCallback.set(this, void 0);
        _Browser_connection.set(this, void 0);
        __classPrivateFieldSet(this, _Browser_process, opts.process, "f");
        __classPrivateFieldSet(this, _Browser_closeCallback, opts.closeCallback, "f");
        __classPrivateFieldSet(this, _Browser_connection, opts.connection, "f");
    }
    /**
     * @internal
     */
    static async create(opts) {
        // TODO: await until the connection is established.
        return new Browser(opts);
    }
    async close() {
        var _a;
        await ((_a = __classPrivateFieldGet(this, _Browser_closeCallback, "f")) === null || _a === void 0 ? void 0 : _a.call(null));
        __classPrivateFieldGet(this, _Browser_connection, "f").dispose();
    }
    isConnected() {
        return !__classPrivateFieldGet(this, _Browser_connection, "f").closed;
    }
    process() {
        var _a;
        return (_a = __classPrivateFieldGet(this, _Browser_process, "f")) !== null && _a !== void 0 ? _a : null;
    }
}
exports.Browser = Browser;
_Browser_process = new WeakMap(), _Browser_closeCallback = new WeakMap(), _Browser_connection = new WeakMap();
//# sourceMappingURL=Browser.js.map