// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const inverse = function<K, V>(map: Map<K, V>): Multimap<V, K> {
  const result = new Multimap<V, K>();
  for (const [key, value] of map.entries()) {
    result.set(value, key);
  }
  return result;
};

export class Multimap<K, V> {
  private map = new Map<K, Set<V>>();

  set(key: K, value: V): void {
    let set = this.map.get(key);
    if (!set) {
      set = new Set();
      this.map.set(key, set);
    }
    set.add(value);
  }

  get(key: K): Set<V> {
    return this.map.get(key) || new Set();
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  hasValue(key: K, value: V): boolean {
    const set = this.map.get(key);
    if (!set) {
      return false;
    }
    return set.has(value);
  }

  get size(): number {
    return this.map.size;
  }

  delete(key: K, value: V): boolean {
    const values = this.get(key);
    if (!values) {
      return false;
    }
    const result = values.delete(value);
    if (!values.size) {
      this.map.delete(key);
    }
    return result;
  }

  deleteAll(key: K): void {
    this.map.delete(key);
  }

  keysArray(): K[] {
    return [...this.map.keys()];
  }

  valuesArray(): V[] {
    const result = [];
    for (const set of this.map.values()) {
      result.push(...set.values());
    }
    return result;
  }

  clear(): void {
    this.map.clear();
  }
}

/**
 * Gets value for key, assigning a default if value is falsy.
 */
export function getWithDefault<K extends {}, V>(
    map: WeakMap<K, V>|Map<K, V>, key: K, defaultValueFactory: (key?: K) => V): V {
  let value = map.get(key);
  if (!value) {
    value = defaultValueFactory(key);
    map.set(key, value);
  }

  return value;
}
