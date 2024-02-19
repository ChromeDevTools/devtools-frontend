// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const enum ArrowKey {
  UP = 'ArrowUp',
  DOWN = 'ArrowDown',
  LEFT = 'ArrowLeft',
  RIGHT = 'ArrowRight',
}

export const enum PageKey {
  UP = 'PageUp',
  DOWN = 'PageDown',
}

export const ENTER_KEY = 'Enter';
export const ESCAPE_KEY = 'Escape';
export const TAB_KEY = 'Tab';

export const ARROW_KEYS = new Set<ArrowKey>([
  ArrowKey.UP,
  ArrowKey.DOWN,
  ArrowKey.LEFT,
  ArrowKey.RIGHT,
]);

export function keyIsArrowKey(key: string): key is ArrowKey {
  return ARROW_KEYS.has(key as ArrowKey);
}

export function isEscKey(event: KeyboardEvent): boolean {
  return event.key === 'Escape';
}

export function isEnterOrSpaceKey(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key === ' ';
}
