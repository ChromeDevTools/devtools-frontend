// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Represents a selector that pierces shadow roots. Each selector before the
 * last one is matches a shadow root for which we pierce through.
 */
export type DeepSelector = string[];

/**
 * Represents a selector.
 */
export type Selector = string|DeepSelector;

export class SelectorPart {
  value: string;
  optimized: boolean;
  constructor(value: string, optimized: boolean) {
    this.value = value;
    this.optimized = optimized || false;
  }

  toString(): string {
    return this.value;
  }
}
