// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as Lit from '../../third_party/lit/lit.js';

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type BindingEventListener = (arg: any) => any;

export class InterceptBindingDirective extends Lit.Directive.Directive {
  static readonly #interceptedBindings =
      new WeakMap<Element, {bindings: Map<string, BindingEventListener>, lastAttachment?: WeakRef<Element>}>();
  static readonly #attachedBindings = new WeakMap<Element, Map<string, Set<BindingEventListener>>>();

  override update(part: Lit.Directive.Part, [listener]: [BindingEventListener]): unknown {
    if (part.type !== Lit.Directive.PartType.EVENT) {
      return listener;
    }
    let eventListeners = InterceptBindingDirective.#interceptedBindings.get(part.element);
    if (!eventListeners) {
      eventListeners = {bindings: new Map()};
      InterceptBindingDirective.#interceptedBindings.set(part.element, eventListeners);
    }

    InterceptBindingDirective.#updateAttachedListener(part.element, part.name, listener);
    eventListeners.bindings.set(part.name, listener);

    return this.render(listener);
  }

  static #updateAttachedListener(templateElement: Element, name: string, listener: BindingEventListener): void {
    const binding = this.#interceptedBindings.get(templateElement);
    if (!binding) {
      return;
    }
    const lastAttachment = binding.lastAttachment?.deref();
    if (!lastAttachment) {
      return;
    }
    const oldListener = binding.bindings.get(name);
    if (oldListener === listener) {
      return;
    }
    const attachedBindings = this.#attachedBindings.get(lastAttachment);
    if (!attachedBindings) {
      return;
    }
    const attachedListeners = Platform.MapUtilities.getWithDefault(attachedBindings, name, () => new Set());
    if (oldListener) {
      lastAttachment.removeEventListener(name, oldListener);
      attachedListeners.delete(oldListener);
    }
    lastAttachment.addEventListener(name, listener);
    attachedListeners.add(listener);
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
        newListeners.lastAttachment = new WeakRef(renderedElement);
        for (const [name, listener] of newListeners.bindings) {
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
}
