// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * Container for singletons scoped to a single DevTools universe.
 *
 * When wiring up dependencies, strongly prefer to pass all direct dependencies
 * via constructor, and not just pass a {@link DevToolsContext} around. That would hide
 * dependencies and we want to be explicit.
 */
export class DevToolsContext {
    #instances = new Map();
    get(ctor) {
        const instance = this.#instances.get(ctor);
        if (!instance) {
            throw new Error(`No instance for ${ctor.name}. Ensure the bootstrapper creates it.`);
        }
        return instance;
    }
    /** @deprecated Should only be used by existing `instance` accessors. */
    has(ctor) {
        return this.#instances.has(ctor);
    }
    /**
     * @deprecated Should only be used by existing `instance` accessors and the bootstrapper.
     * Exists on the public interface only for migration purposes for now.
     */
    set(ctor, instance) {
        // TODO(crbug.com/458180550): We need to throw here if an instance was already set!
        this.#instances.set(ctor, instance);
    }
    /** @deprecated Should only be used by existing `removeInstance` static methods. */
    delete(ctor) {
        this.#instances.delete(ctor);
    }
}
let gInstance = null;
/**
 * @deprecated Exists to migrate instance() methods.
 */
export function globalInstance() {
    if (!gInstance) {
        // TODO(crbug.com/458180550): This should really throw to prevent side-effects and globals
        //                            from leaking all over the place.
        gInstance = new DevToolsContext();
    }
    return gInstance;
}
/**
 * @deprecated Should only be called by test setup and MainImpl
 */
export function setGlobalInstance(context) {
    gInstance = context;
}
//# sourceMappingURL=DevToolsContext.js.map