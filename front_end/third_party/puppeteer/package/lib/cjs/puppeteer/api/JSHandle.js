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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSHandle = void 0;
/**
 * Represents a reference to a JavaScript object. Instances can be created using
 * {@link Page.evaluateHandle}.
 *
 * Handles prevent the referenced JavaScript object from being garbage-collected
 * unless the handle is purposely {@link JSHandle.dispose | disposed}. JSHandles
 * are auto-disposed when their associated frame is navigated away or the parent
 * context gets destroyed.
 *
 * Handles can be used as arguments for any evaluation function such as
 * {@link Page.$eval}, {@link Page.evaluate}, and {@link Page.evaluateHandle}.
 * They are resolved to their referenced object.
 *
 * @example
 *
 * ```ts
 * const windowHandle = await page.evaluateHandle(() => window);
 * ```
 *
 * @public
 */
class JSHandle {
    /**
     * @internal
     */
    constructor() { }
    /**
     * @internal
     */
    get disposed() {
        throw new Error('Not implemented');
    }
    /**
     * @internal
     */
    executionContext() {
        throw new Error('Not implemented');
    }
    /**
     * @internal
     */
    get client() {
        throw new Error('Not implemented');
    }
    async evaluate() {
        throw new Error('Not implemented');
    }
    async evaluateHandle() {
        throw new Error('Not implemented');
    }
    async getProperty() {
        throw new Error('Not implemented');
    }
    /**
     * Gets a map of handles representing the properties of the current handle.
     *
     * @example
     *
     * ```ts
     * const listHandle = await page.evaluateHandle(() => document.body.children);
     * const properties = await listHandle.getProperties();
     * const children = [];
     * for (const property of properties.values()) {
     *   const element = property.asElement();
     *   if (element) {
     *     children.push(element);
     *   }
     * }
     * children; // holds elementHandles to all children of document.body
     * ```
     */
    async getProperties() {
        throw new Error('Not implemented');
    }
    /**
     * A vanilla object representing the serializable portions of the
     * referenced object.
     * @throws Throws if the object cannot be serialized due to circularity.
     *
     * @remarks
     * If the object has a `toJSON` function, it **will not** be called.
     */
    async jsonValue() {
        throw new Error('Not implemented');
    }
    /**
     * Either `null` or the handle itself if the handle is an
     * instance of {@link ElementHandle}.
     */
    asElement() {
        throw new Error('Not implemented');
    }
    /**
     * Releases the object referenced by the handle for garbage collection.
     */
    async dispose() {
        throw new Error('Not implemented');
    }
    /**
     * Returns a string representation of the JSHandle.
     *
     * @remarks
     * Useful during debugging.
     */
    toString() {
        throw new Error('Not implemented');
    }
    /**
     * @internal
     */
    get id() {
        throw new Error('Not implemented');
    }
    /**
     * Provides access to the
     * [Protocol.Runtime.RemoteObject](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#type-RemoteObject)
     * backing this handle.
     */
    remoteObject() {
        throw new Error('Not implemented');
    }
}
exports.JSHandle = JSHandle;
//# sourceMappingURL=JSHandle.js.map