// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Lit from '../../third_party/lit/lit.js';
export class InterceptBindingDirective extends Lit.Directive.Directive {
    static #interceptedBindings = new WeakMap();
    static #attachedBindings = new WeakMap();
    update(part, [listener]) {
        if (part.type !== Lit.Directive.PartType.EVENT) {
            return listener;
        }
        let eventListeners = InterceptBindingDirective.#interceptedBindings.get(part.element);
        if (!eventListeners) {
            eventListeners = new Map();
            InterceptBindingDirective.#interceptedBindings.set(part.element, eventListeners);
        }
        eventListeners.set(part.name, listener);
        return this.render(listener);
    }
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-function-type */
    render(listener) {
        return listener;
    }
    static setEventListeners(templateElements, renderedElement) {
        const attachedListeners = InterceptBindingDirective.#attachedBindings.get(renderedElement);
        if (attachedListeners) {
            for (const [name, listeners] of attachedListeners) {
                for (const listener of listeners) {
                    renderedElement.removeEventListener(name, listener);
                }
            }
        }
        const elements = templateElements instanceof Element ? [templateElements] : templateElements;
        const newAttachedListeners = new Map();
        for (const templateElement of elements) {
            const newListeners = InterceptBindingDirective.#interceptedBindings.get(templateElement);
            if (newListeners) {
                for (const [name, listener] of newListeners) {
                    renderedElement.addEventListener(name, listener);
                    let listenersSet = newAttachedListeners.get(name);
                    if (!listenersSet) {
                        listenersSet = new Set();
                        newAttachedListeners.set(name, listenersSet);
                    }
                    listenersSet.add(listener);
                }
            }
        }
        if (newAttachedListeners.size) {
            InterceptBindingDirective.#attachedBindings.set(renderedElement, newAttachedListeners);
        }
        else {
            InterceptBindingDirective.#attachedBindings.delete(renderedElement);
        }
    }
    static registerListeners(element, listeners) {
        if (!listeners) {
            InterceptBindingDirective.#interceptedBindings.delete(element);
            return;
        }
        const map = new Map();
        for (const [name, listener] of Object.entries(listeners)) {
            map.set(name, typeof listener === 'function' ? listener :
                listener.handleEvent.bind(listener));
        }
        InterceptBindingDirective.#interceptedBindings.set(element, map);
    }
}
//# sourceMappingURL=Directives.js.map