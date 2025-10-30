// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
let contextInstance;
export class Context {
    #flavors = new Map();
    #eventDispatchers = new Map();
    constructor() {
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!contextInstance || forceNew) {
            contextInstance = new Context();
        }
        return contextInstance;
    }
    static removeInstance() {
        contextInstance = undefined;
    }
    setFlavor(flavorType, flavorValue) {
        const value = this.#flavors.get(flavorType) || null;
        if (value === flavorValue) {
            return;
        }
        if (flavorValue) {
            this.#flavors.set(flavorType, flavorValue);
        }
        else {
            this.#flavors.delete(flavorType);
        }
        this.#dispatchFlavorChange(flavorType, flavorValue);
    }
    #dispatchFlavorChange(flavorType, flavorValue) {
        for (const extension of getRegisteredListeners()) {
            if (extension.contextTypes().includes(flavorType)) {
                void extension.loadListener().then(instance => instance.flavorChanged(flavorValue));
            }
        }
        const dispatcher = this.#eventDispatchers.get(flavorType);
        if (!dispatcher) {
            return;
        }
        dispatcher.dispatchEventToListeners("FlavorChanged" /* Events.FLAVOR_CHANGED */, flavorValue);
    }
    addFlavorChangeListener(flavorType, listener, thisObject) {
        let dispatcher = this.#eventDispatchers.get(flavorType);
        if (!dispatcher) {
            dispatcher = new Common.ObjectWrapper.ObjectWrapper();
            this.#eventDispatchers.set(flavorType, dispatcher);
        }
        dispatcher.addEventListener("FlavorChanged" /* Events.FLAVOR_CHANGED */, listener, thisObject);
    }
    removeFlavorChangeListener(flavorType, listener, thisObject) {
        const dispatcher = this.#eventDispatchers.get(flavorType);
        if (!dispatcher) {
            return;
        }
        dispatcher.removeEventListener("FlavorChanged" /* Events.FLAVOR_CHANGED */, listener, thisObject);
        if (!dispatcher.hasEventListeners("FlavorChanged" /* Events.FLAVOR_CHANGED */)) {
            this.#eventDispatchers.delete(flavorType);
        }
    }
    flavor(flavorType) {
        return this.#flavors.get(flavorType) || null;
    }
    flavors() {
        return new Set(this.#flavors.keys());
    }
}
const registeredListeners = [];
export function registerListener(registration) {
    registeredListeners.push(registration);
}
function getRegisteredListeners() {
    return registeredListeners;
}
//# sourceMappingURL=Context.js.map