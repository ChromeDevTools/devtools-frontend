// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as Lit from '../../third_party/lit/lit.js';
const renderOptions = new WeakMap();
export function render(template, container, options) {
    if (container instanceof HTMLElement) {
        const oldAttributes = renderOptions.get(container)?.container?.attributes;
        const newAttributes = options?.container?.attributes;
        if (newAttributes) {
            for (const [name, value] of Object.entries(newAttributes)) {
                if (oldAttributes?.[name] === value) {
                    continue;
                }
                if (value === null || value === undefined) {
                    container.removeAttribute(name);
                }
                else if (typeof value === 'boolean') {
                    container.toggleAttribute(name, value);
                }
                else {
                    container.setAttribute(name, value.toString());
                }
            }
        }
        if (oldAttributes) {
            for (const name of Object.keys(oldAttributes)) {
                if (!newAttributes || !(name in newAttributes)) {
                    container.removeAttribute(name);
                }
            }
        }
        const oldClasses = renderOptions.get(container)?.container?.classes;
        const newClasses = options?.container?.classes;
        if (oldClasses) {
            for (const cls of oldClasses) {
                if (!newClasses?.includes(cls)) {
                    container.classList.remove(cls);
                }
            }
        }
        if (newClasses) {
            for (const cls of newClasses) {
                if (!oldClasses?.includes(cls)) {
                    container.classList.add(cls);
                }
            }
        }
    }
    const oldListeners = renderOptions.get(container)?.container?.listeners;
    const newListeners = options?.container?.listeners;
    if (oldListeners) {
        for (const [name, listener] of Object.entries(oldListeners)) {
            if (newListeners?.[name] !== listener) {
                container.removeEventListener(name, listener);
            }
        }
    }
    if (newListeners) {
        for (const [name, listener] of Object.entries(newListeners)) {
            if (oldListeners?.[name] !== listener) {
                container.addEventListener(name, listener);
            }
        }
    }
    renderOptions.set(container, options);
    return Lit.render(template, container, options);
}
//# sourceMappingURL=render.js.map