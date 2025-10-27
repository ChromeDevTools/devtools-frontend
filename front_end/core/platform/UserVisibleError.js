"use strict";
export class UserVisibleError extends Error {
  message;
  constructor(message) {
    super(message);
    this.message = message;
  }
}
export function isUserVisibleError(error) {
  if (typeof error === "object" && error !== null) {
    return error instanceof UserVisibleError;
  }
  return false;
}
//# sourceMappingURL=UserVisibleError.js.map
