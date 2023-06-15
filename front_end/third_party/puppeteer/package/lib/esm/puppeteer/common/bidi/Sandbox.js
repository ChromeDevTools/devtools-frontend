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
var _Sandbox_document, _Sandbox_context;
import { withSourcePuppeteerURLIfNone } from '../common.js';
/**
 * A unique key for {@link SandboxChart} to denote the default world.
 * Realms are automatically created in the default sandbox.
 *
 * @internal
 */
export const MAIN_SANDBOX = Symbol('mainSandbox');
/**
 * A unique key for {@link SandboxChart} to denote the puppeteer sandbox.
 * This world contains all puppeteer-internal bindings/code.
 *
 * @internal
 */
export const PUPPETEER_SANDBOX = Symbol('puppeteerSandbox');
/**
 * @internal
 */
export class Sandbox {
    constructor(context) {
        _Sandbox_document.set(this, void 0);
        _Sandbox_context.set(this, void 0);
        __classPrivateFieldSet(this, _Sandbox_context, context, "f");
    }
    async document() {
        if (__classPrivateFieldGet(this, _Sandbox_document, "f")) {
            return __classPrivateFieldGet(this, _Sandbox_document, "f");
        }
        __classPrivateFieldSet(this, _Sandbox_document, await __classPrivateFieldGet(this, _Sandbox_context, "f").evaluateHandle(() => {
            return document;
        }), "f");
        return __classPrivateFieldGet(this, _Sandbox_document, "f");
    }
    async $(selector) {
        const document = await this.document();
        return document.$(selector);
    }
    async $$(selector) {
        const document = await this.document();
        return document.$$(selector);
    }
    async $eval(selector, pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.$eval.name, pageFunction);
        const document = await this.document();
        return document.$eval(selector, pageFunction, ...args);
    }
    async $$eval(selector, pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.$$eval.name, pageFunction);
        const document = await this.document();
        return document.$$eval(selector, pageFunction, ...args);
    }
    async $x(expression) {
        const document = await this.document();
        return document.$x(expression);
    }
}
_Sandbox_document = new WeakMap(), _Sandbox_context = new WeakMap();
//# sourceMappingURL=Sandbox.js.map