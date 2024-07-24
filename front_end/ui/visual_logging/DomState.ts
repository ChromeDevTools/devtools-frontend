// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {needsLogging} from './LoggingConfig.js';

interface ElementWithParent {
  element: Element;
  parent?: Element;
  slot?: Element;
}

export function getDomState(documents: Document[]): {loggables: ElementWithParent[], shadowRoots: ShadowRoot[]} {
  const loggables: ElementWithParent[] = [];
  const shadowRoots: ShadowRoot[] = [];
  const queue: ElementWithParent[] = [];
  const enqueue = (children: HTMLCollection|Element[], parent?: Element, slot?: Element): void => {
    for (const child of children) {
      queue.push({element: child, parent, slot});
    }
  };
  for (const document of documents) {
    enqueue(document.body.children);
  }

  let head = 0;
  const dequeue = (): ElementWithParent => queue[head++];
  while (true) {
    const top = dequeue();
    if (!top) {
      break;
    }
    const {element, slot} = top;
    let {parent} = top;
    if (element.assignedSlot && element.assignedSlot !== slot) {
      continue;
    }
    if (needsLogging(element)) {
      loggables.push({element, parent});
      parent = element;
    }
    if (element.localName === 'slot' && (element as HTMLSlotElement).assignedElements().length) {
      enqueue((element as HTMLSlotElement).assignedElements(), parent, element);
    } else {
      enqueue(element.children, parent);
    }
    if (element.shadowRoot) {
      shadowRoots.push(element.shadowRoot);
      enqueue(element.shadowRoot.children, parent);
    }
  }
  return {loggables, shadowRoots};
}

const MIN_ELEMENT_SIZE_FOR_IMPRESSIONS = 10;

export function visibleOverlap(element: Element, viewportRect: DOMRect): DOMRect|null {
  const elementRect = element.getBoundingClientRect();
  const overlap = intersection(viewportRect, elementRect);

  const sizeThreshold = Math.max(Math.min(MIN_ELEMENT_SIZE_FOR_IMPRESSIONS, elementRect.width, elementRect.height), 1);

  if (!overlap || overlap.width < sizeThreshold || overlap.height < sizeThreshold) {
    return null;
  }
  return overlap;
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
