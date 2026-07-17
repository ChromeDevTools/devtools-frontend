// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as Lit from '../../third_party/lit/lit.js';
const renderOptions = new WeakMap();
const containerListeners = new WeakMap();
export function render(template, container, options) {
    const host = container instanceof ShadowRoot ? container.host : container;
    if (host instanceof Element) {
        const oldAttributes = renderOptions.get(container)?.container?.attributes;
        const newAttributes = options?.container?.attributes;
        if (newAttributes) {
            for (const [name, value] of Object.entries(newAttributes)) {
                if (oldAttributes?.[name] === value) {
                    continue;
                }
                if (value === null || value === undefined) {
                    host.removeAttribute(name);
                }
                else if (typeof value === 'boolean') {
                    host.toggleAttribute(name, value);
                }
                else {
                    host.setAttribute(name, value.toString());
                }
            }
        }
        if (oldAttributes) {
            for (const name of Object.keys(oldAttributes)) {
                if (!newAttributes || !(name in newAttributes)) {
                    host.removeAttribute(name);
                }
            }
        }
        const oldClasses = renderOptions.get(container)?.container?.classes;
        const newClasses = options?.container?.classes;
        if (oldClasses) {
            for (const cls of oldClasses) {
                if (!newClasses?.includes(cls)) {
                    host.classList.remove(cls);
                }
            }
        }
        if (newClasses) {
            for (const cls of newClasses) {
                if (!oldClasses?.includes(cls)) {
                    host.classList.add(cls);
                }
            }
        }
    }
    let listenersMap = containerListeners.get(container);
    if (!listenersMap) {
        listenersMap = new Map();
        containerListeners.set(container, listenersMap);
    }
    const newListeners = options?.container?.listeners;
    if (newListeners) {
        for (const [name, listener] of Object.entries(newListeners)) {
            const entry = listenersMap.get(name);
            if (entry) {
                entry.listener = listener;
            }
            else {
                let currentListener = listener;
                const newEntry = {
                    get listener() {
                        return currentListener;
                    },
                    set listener(val) {
                        currentListener = val;
                    },
                    wrapper: (event) => {
                        if (typeof currentListener === 'function') {
                            return currentListener.call(host, event);
                        }
                        if (currentListener && 'handleEvent' in currentListener) {
                            return currentListener.handleEvent(event);
                        }
                    }
                };
                listenersMap.set(name, newEntry);
                host.addEventListener(name, newEntry.wrapper);
            }
        }
    }
    // Remove old listeners that are no longer present
    for (const [name, entry] of listenersMap.entries()) {
        if (!newListeners || !(name in newListeners)) {
            host.removeEventListener(name, entry.wrapper);
            listenersMap.delete(name);
        }
    }
    renderOptions.set(container, options);
    return Lit.render(template, container, options);
}
//# sourceMappingURL=render.js.map