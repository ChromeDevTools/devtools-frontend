"use strict";
import * as Lit from "../../third_party/lit/lit.js";
const templates = /* @__PURE__ */ new WeakMap();
export function html(strings, ...values) {
  let stripped = templates.get(strings);
  if (!stripped) {
    if (strings.some((s) => s.includes("\n"))) {
      stripped = strip(strings);
    } else {
      stripped = strings;
    }
  }
  templates.set(strings, stripped);
  return Lit.html(stripped, ...values);
}
function strip(strings) {
  let inTag = false;
  const stripped = strings.map((s) => s.replace(/[<>]|\n\s*/g, (s2) => {
    if (s2 === "<") {
      inTag = true;
    } else if (inTag && s2 === ">") {
      inTag = false;
    } else if (!inTag) {
      return "";
    }
    return s2;
  }));
  stripped.raw = strings.raw;
  return stripped;
}
//# sourceMappingURL=strip-whitespace.js.map
