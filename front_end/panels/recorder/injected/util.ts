// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/es_modules_import */
import {type Schema} from '../../../third_party/puppeteer-replay/puppeteer-replay.js';

export function assert<Condition>(condition: Condition): asserts condition {
  if (!condition) {
    throw new Error('Assertion failed!');
  }
}

export const haultImmediateEvent = (event: Event): void => {
  event.preventDefault();
  event.stopImmediatePropagation();
};

export const getMouseEventOffsets = (event: MouseEvent, target: Element): {offsetX: number, offsetY: number} => {
  const rect = target.getBoundingClientRect();
  return {offsetX: event.clientX - rect.x, offsetY: event.clientY - rect.y};
};

/**
 * @returns the element that emitted the event.
 */
export const getClickableTargetFromEvent = (event: Event): Element => {
  for (const element of event.composedPath()) {
    if (!(element instanceof Element)) {
      continue;
    }
    // If an element has no width or height, we skip this target.
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      continue;
    }
    return element;
  }
  throw new Error(`No target is found in event of type ${event.type}`);
};

export const createClickAttributes = (event: MouseEvent, target: Element): Schema.ClickAttributes|undefined => {
  let deviceType: 'pen'|'touch'|undefined;
  if (event instanceof PointerEvent) {
    switch (event.pointerType) {
      case 'mouse':
        // Default device.
        break;
      case 'pen':
      case 'touch':
        deviceType = event.pointerType;
        break;
      default:
        // Unsupported device type.
        return;
    }
  }
  const {offsetX, offsetY} = getMouseEventOffsets(event, target);
  if (offsetX < 0 || offsetY < 0) {
    // Event comes from outside the viewport. Can happen as a result of a
    // simulated click (through a keyboard event e.g.).
    return;
  }
  return {
    button: (['auxiliary', 'secondary', 'back', 'forward'] as const)[event.button - 1],
    deviceType,
    offsetX,
    offsetY,
  };
};
