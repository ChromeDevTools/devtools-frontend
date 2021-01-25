// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const enum ArrowKey {
  UP = 'ArrowUp',
  DOWN = 'ArrowDown',
  LEFT = 'ArrowLeft',
  RIGHT = 'ArrowRight',
}
export const ARROW_KEYS = new Set<ArrowKey>([
  ArrowKey.UP,
  ArrowKey.DOWN,
  ArrowKey.LEFT,
  ArrowKey.RIGHT,
]);

export function keyIsArrowKey(key: string): key is ArrowKey {
  return ARROW_KEYS.has(key as ArrowKey);
}
