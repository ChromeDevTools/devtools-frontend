// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../third_party/lit/lit.js';

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type BindingEventListener = (arg: any) => any;

export class InterceptBindingDirective extends Lit.Directive.Directive {
  static readonly #interceptedBindings = new WeakMap<Element, Map<string, BindingEventListener>>();
  static readonly #attachedBindings = new WeakMap<Element, Map<string, Set<BindingEventListener>>>();

  override update(part: Lit.Directive.Part, [listener]: [BindingEventListener]): unknown {
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
  render(listener: Function): Function {
    return listener;
  }

  static setEventListeners(templateElements: Element|Iterable<Element>, renderedElement: Element): void {
    const attachedListeners = InterceptBindingDirective.#attachedBindings.get(renderedElement);
    if (attachedListeners) {
      for (const [name, listeners] of attachedListeners) {
        for (const listener of listeners) {
          renderedElement.removeEventListener(name, listener);
        }
      }
    }

    const elements = templateElements instanceof Element ? [templateElements] : templateElements;
    const newAttachedListeners = new Map<string, Set<BindingEventListener>>();
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
    } else {
      InterceptBindingDirective.#attachedBindings.delete(renderedElement);
    }
  }

  static registerListeners(element: Element, listeners?: Record<string, EventListenerOrEventListenerObject>): void {
    if (!listeners) {
      InterceptBindingDirective.#interceptedBindings.delete(element);
      return;
    }
    const map = new Map<string, BindingEventListener>();
    for (const [name, listener] of Object.entries(listeners)) {
      map.set(name,
              typeof listener === 'function' ? listener as BindingEventListener :
                                               listener.handleEvent.bind(listener) as BindingEventListener);
    }
    InterceptBindingDirective.#interceptedBindings.set(element, map);
  }
}
