"use strict";
export function assertNotNullOrUndefined(val, message) {
  if (val === null || val === void 0) {
    throw new Error(`Expected given value to not be null/undefined but it was: ${val}${message ? `
${message}` : ""}`);
  }
}
export function assertNever(_type, message) {
  throw new Error(message);
}
export function assertUnhandled(_caseVariable) {
  return _caseVariable;
}
//# sourceMappingURL=TypescriptUtilities.js.map
