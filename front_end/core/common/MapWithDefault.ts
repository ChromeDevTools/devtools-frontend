// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Polyfill of https://github.com/tc39/proposal-upsert with a subclass.
//
// TODO: Once the proposal is merged, just replace `MapWithDefault` with `Map` and remove it.
export class MapWithDefault<K, V> extends Map<K, V> {
  getOrInsert(key: K, defaultValue: V): V {
    if (!this.has(key)) {
      this.set(key, defaultValue);
    }

    return this.get(key) as V;
  }

  getOrInsertComputed(key: K, callbackFunction: (key: K) => V): V {
    if (!this.has(key)) {
      this.set(key, callbackFunction(key));
    }

    return this.get(key) as V;
  }
}
