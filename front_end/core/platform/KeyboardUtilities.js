"use strict";
export var ArrowKey = /* @__PURE__ */ ((ArrowKey2) => {
  ArrowKey2["UP"] = "ArrowUp";
  ArrowKey2["DOWN"] = "ArrowDown";
  ArrowKey2["LEFT"] = "ArrowLeft";
  ArrowKey2["RIGHT"] = "ArrowRight";
  return ArrowKey2;
})(ArrowKey || {});
export var PageKey = /* @__PURE__ */ ((PageKey2) => {
  PageKey2["UP"] = "PageUp";
  PageKey2["DOWN"] = "PageDown";
  return PageKey2;
})(PageKey || {});
export const ENTER_KEY = "Enter";
export const ESCAPE_KEY = "Escape";
export const TAB_KEY = "Tab";
export const ARROW_KEYS = /* @__PURE__ */ new Set([
  "ArrowUp" /* UP */,
  "ArrowDown" /* DOWN */,
  "ArrowLeft" /* LEFT */,
  "ArrowRight" /* RIGHT */
]);
export function keyIsArrowKey(key) {
  return ARROW_KEYS.has(key);
}
export function isEscKey(event) {
  return event.key === "Escape";
}
export function isEnterOrSpaceKey(event) {
  return event.key === "Enter" || event.key === " ";
}
//# sourceMappingURL=KeyboardUtilities.js.map
