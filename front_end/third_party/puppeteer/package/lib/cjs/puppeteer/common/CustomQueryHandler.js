"use strict";
/**
 * Copyright 2023 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _CustomQueryHandlerRegistry_handlers;
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCustomQueryHandlers = exports.customQueryHandlerNames = exports.unregisterCustomQueryHandler = exports.registerCustomQueryHandler = exports.customQueryHandlers = exports.CustomQueryHandlerRegistry = void 0;
const assert_js_1 = require("../util/assert.js");
const Function_js_1 = require("../util/Function.js");
const QueryHandler_js_1 = require("./QueryHandler.js");
const ScriptInjector_js_1 = require("./ScriptInjector.js");
/**
 * The registry of {@link CustomQueryHandler | custom query handlers}.
 *
 * @example
 *
 * ```ts
 * Puppeteer.customQueryHandlers.register('lit', { … });
 * const aHandle = await page.$('lit/…');
 * ```
 *
 * @internal
 */
class CustomQueryHandlerRegistry {
    constructor() {
        _CustomQueryHandlerRegistry_handlers.set(this, new Map());
    }
    /**
     * @internal
     */
    get(name) {
        const handler = __classPrivateFieldGet(this, _CustomQueryHandlerRegistry_handlers, "f").get(name);
        return handler ? handler[1] : undefined;
    }
    /**
     * Registers a {@link CustomQueryHandler | custom query handler}.
     *
     * @remarks
     * After registration, the handler can be used everywhere where a selector is
     * expected by prepending the selection string with `<name>/`. The name is
     * only allowed to consist of lower- and upper case latin letters.
     *
     * @example
     *
     * ```ts
     * Puppeteer.customQueryHandlers.register('lit', { … });
     * const aHandle = await page.$('lit/…');
     * ```
     *
     * @param name - Name to register under.
     * @param queryHandler - {@link CustomQueryHandler | Custom query handler} to
     * register.
     *
     * @internal
     */
    register(name, handler) {
        var _a;
        if (__classPrivateFieldGet(this, _CustomQueryHandlerRegistry_handlers, "f").has(name)) {
            throw new Error(`Cannot register over existing handler: ${name}`);
        }
        (0, assert_js_1.assert)(!__classPrivateFieldGet(this, _CustomQueryHandlerRegistry_handlers, "f").has(name), `Cannot register over existing handler: ${name}`);
        (0, assert_js_1.assert)(/^[a-zA-Z]+$/.test(name), `Custom query handler names may only contain [a-zA-Z]`);
        (0, assert_js_1.assert)(handler.queryAll || handler.queryOne, `At least one query method must be implemented.`);
        const Handler = (_a = class extends QueryHandler_js_1.QueryHandler {
            },
            _a.querySelectorAll = (0, Function_js_1.interpolateFunction)((node, selector, PuppeteerUtil) => {
                return PuppeteerUtil.customQuerySelectors
                    .get(PLACEHOLDER('name'))
                    .querySelectorAll(node, selector);
            }, { name: JSON.stringify(name) }),
            _a.querySelector = (0, Function_js_1.interpolateFunction)((node, selector, PuppeteerUtil) => {
                return PuppeteerUtil.customQuerySelectors
                    .get(PLACEHOLDER('name'))
                    .querySelector(node, selector);
            }, { name: JSON.stringify(name) }),
            _a);
        const registerScript = (0, Function_js_1.interpolateFunction)((PuppeteerUtil) => {
            PuppeteerUtil.customQuerySelectors.register(PLACEHOLDER('name'), {
                queryAll: PLACEHOLDER('queryAll'),
                queryOne: PLACEHOLDER('queryOne'),
            });
        }, {
            name: JSON.stringify(name),
            queryAll: handler.queryAll
                ? (0, Function_js_1.stringifyFunction)(handler.queryAll)
                : String(undefined),
            queryOne: handler.queryOne
                ? (0, Function_js_1.stringifyFunction)(handler.queryOne)
                : String(undefined),
        }).toString();
        __classPrivateFieldGet(this, _CustomQueryHandlerRegistry_handlers, "f").set(name, [registerScript, Handler]);
        ScriptInjector_js_1.scriptInjector.append(registerScript);
    }
    /**
     * Unregisters the {@link CustomQueryHandler | custom query handler} for the
     * given name.
     *
     * @throws `Error` if there is no handler under the given name.
     *
     * @internal
     */
    unregister(name) {
        const handler = __classPrivateFieldGet(this, _CustomQueryHandlerRegistry_handlers, "f").get(name);
        if (!handler) {
            throw new Error(`Cannot unregister unknown handler: ${name}`);
        }
        ScriptInjector_js_1.scriptInjector.pop(handler[0]);
        __classPrivateFieldGet(this, _CustomQueryHandlerRegistry_handlers, "f").delete(name);
    }
    /**
     * Gets the names of all {@link CustomQueryHandler | custom query handlers}.
     *
     * @internal
     */
    names() {
        return [...__classPrivateFieldGet(this, _CustomQueryHandlerRegistry_handlers, "f").keys()];
    }
    /**
     * Unregisters all custom query handlers.
     *
     * @internal
     */
    clear() {
        for (const [registerScript] of __classPrivateFieldGet(this, _CustomQueryHandlerRegistry_handlers, "f")) {
            ScriptInjector_js_1.scriptInjector.pop(registerScript);
        }
        __classPrivateFieldGet(this, _CustomQueryHandlerRegistry_handlers, "f").clear();
    }
}
exports.CustomQueryHandlerRegistry = CustomQueryHandlerRegistry;
_CustomQueryHandlerRegistry_handlers = new WeakMap();
/**
 * @internal
 */
exports.customQueryHandlers = new CustomQueryHandlerRegistry();
/**
 * @deprecated Import {@link Puppeteer} and use the static method
 * {@link Puppeteer.registerCustomQueryHandler}
 *
 * @public
 */
function registerCustomQueryHandler(name, handler) {
    exports.customQueryHandlers.register(name, handler);
}
exports.registerCustomQueryHandler = registerCustomQueryHandler;
/**
 * @deprecated Import {@link Puppeteer} and use the static method
 * {@link Puppeteer.unregisterCustomQueryHandler}
 *
 * @public
 */
function unregisterCustomQueryHandler(name) {
    exports.customQueryHandlers.unregister(name);
}
exports.unregisterCustomQueryHandler = unregisterCustomQueryHandler;
/**
 * @deprecated Import {@link Puppeteer} and use the static method
 * {@link Puppeteer.customQueryHandlerNames}
 *
 * @public
 */
function customQueryHandlerNames() {
    return exports.customQueryHandlers.names();
}
exports.customQueryHandlerNames = customQueryHandlerNames;
/**
 * @deprecated Import {@link Puppeteer} and use the static method
 * {@link Puppeteer.clearCustomQueryHandlers}
 *
 * @public
 */
function clearCustomQueryHandlers() {
    exports.customQueryHandlers.clear();
}
exports.clearCustomQueryHandlers = clearCustomQueryHandlers;
//# sourceMappingURL=CustomQueryHandler.js.map