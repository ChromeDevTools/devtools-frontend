// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

let enabled = false;

export function setEnabled(value: boolean): void {
  enabled = value;
}

export function logger(...args: unknown[]): void {
  if (enabled) {
    console.log(...args);
  }
}
