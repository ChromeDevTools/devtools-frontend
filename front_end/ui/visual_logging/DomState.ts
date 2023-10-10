// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {needsLogging} from './LoggingConfig.js';

interface ElementWithParent {
  element: Element;
  parent?: Element;
}

export function getDomState(): {loggables: ElementWithParent[], shadowRoots: ShadowRoot[]} {
  const loggables: ElementWithParent[] = [];
  const shadowRoots: ShadowRoot[] = [];
  const stack: ElementWithParent[] = [];
  const putOnStack = (children: HTMLCollection, parent?: Element): void => {
    for (const child of children) {
      stack.push({element: child, parent});
    }
  };
  putOnStack(document.body.children);
  while (stack.length > 0) {
    const top = stack.pop();
    if (!top) {
      break;
    }
    const {element} = top;
    let {parent} = top;
    if (needsLogging(element)) {
      loggables.push({element, parent});
      parent = element;
    }
    putOnStack(element.children, parent);
    if (element.shadowRoot) {
      shadowRoots.push(element.shadowRoot);
      putOnStack(element.shadowRoot.children, parent);
    }
  }
  return {loggables, shadowRoots};
}

const MIN_ELEMENT_SIZE_FOR_IMPRESSIONS = 10;

export function isVisible(element: Element, viewportRect: DOMRect): boolean {
  const elementRect = element.getBoundingClientRect();
  const overlap = intersection(viewportRect, elementRect);

  return Boolean(
      overlap && overlap.width >= MIN_ELEMENT_SIZE_FOR_IMPRESSIONS &&
      overlap.height >= MIN_ELEMENT_SIZE_FOR_IMPRESSIONS);
}

function intersection(a: DOMRect, b: DOMRect): DOMRect|null {
  const x0 = Math.max(a.left, b.left);
  const x1 = Math.min(a.left + a.width, b.left + b.width);

  if (x0 <= x1) {
    const y0 = Math.max(a.top, b.top);
    const y1 = Math.min(a.top + a.height, b.top + b.height);

    if (y0 <= y1) {
      return new DOMRect(x0, y0, x1 - x0, y1 - y0);
    }
  }
  return null;
}
