// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../core/common/common.js';

export class MockStore implements Common.Settings.SettingsBackingStore {
  #store = new Map();
  register() {
  }
  set(key: string, value: string) {
    this.#store.set(key, value);
  }
  get(key: string) {
    return this.#store.get(key);
  }
  remove(key: string) {
    this.#store.delete(key);
  }
  clear() {
    this.#store.clear();
  }
}
