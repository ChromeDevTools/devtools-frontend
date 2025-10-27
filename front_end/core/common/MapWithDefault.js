"use strict";
export class MapWithDefault extends Map {
  getOrInsert(key, defaultValue) {
    if (!this.has(key)) {
      this.set(key, defaultValue);
    }
    return this.get(key);
  }
  getOrInsertComputed(key, callbackFunction) {
    if (!this.has(key)) {
      this.set(key, callbackFunction(key));
    }
    return this.get(key);
  }
}
//# sourceMappingURL=MapWithDefault.js.map
