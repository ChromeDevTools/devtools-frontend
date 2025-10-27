"use strict";
const UNINITIALIZED = Symbol("uninitialized");
const ERROR_STATE = Symbol("error");
export function lazy(producer) {
  let value = UNINITIALIZED;
  let error = new Error("Initial");
  return () => {
    if (value === ERROR_STATE) {
      throw error;
    } else if (value !== UNINITIALIZED) {
      return value;
    }
    try {
      value = producer();
      return value;
    } catch (err) {
      error = err instanceof Error ? err : new Error(err);
      value = ERROR_STATE;
      throw error;
    }
  };
}
//# sourceMappingURL=Lazy.js.map
