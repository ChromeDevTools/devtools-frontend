"use strict";
export const inverse = function(map) {
  const result = new Multimap();
  for (const [key, value] of map.entries()) {
    result.set(value, key);
  }
  return result;
};
export class Multimap {
  map = /* @__PURE__ */ new Map();
  set(key, value) {
    let set = this.map.get(key);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      this.map.set(key, set);
    }
    set.add(value);
  }
  get(key) {
    return this.map.get(key) || /* @__PURE__ */ new Set();
  }
  has(key) {
    return this.map.has(key);
  }
  hasValue(key, value) {
    const set = this.map.get(key);
    if (!set) {
      return false;
    }
    return set.has(value);
  }
  get size() {
    return this.map.size;
  }
  delete(key, value) {
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
  deleteAll(key) {
    this.map.delete(key);
  }
  keysArray() {
    return [...this.map.keys()];
  }
  keys() {
    return this.map.keys();
  }
  valuesArray() {
    const result = [];
    for (const set of this.map.values()) {
      result.push(...set.values());
    }
    return result;
  }
  clear() {
    this.map.clear();
  }
}
export function getWithDefault(map, key, defaultValueFactory) {
  let value = map.get(key);
  if (value === void 0 || value === null) {
    value = defaultValueFactory(key);
    map.set(key, value);
  }
  return value;
}
//# sourceMappingURL=MapUtilities.js.map
