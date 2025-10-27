"use strict";
import { DevToolsLocale } from "./DevToolsLocale.js";
export function defineFormatter(options) {
  let intlNumberFormat;
  return {
    format(value, separator) {
      if (!intlNumberFormat) {
        intlNumberFormat = new Intl.NumberFormat(DevToolsLocale.instance().locale, options);
      }
      return formatAndEnsureSpace(intlNumberFormat, value, separator);
    },
    formatToParts(value) {
      if (!intlNumberFormat) {
        intlNumberFormat = new Intl.NumberFormat(DevToolsLocale.instance().locale, options);
      }
      return intlNumberFormat.formatToParts(value);
    }
  };
}
function formatAndEnsureSpace(formatter, value, separator = "\xA0") {
  const parts = formatter.formatToParts(value);
  let hasSpace = false;
  for (const part of parts) {
    if (part.type === "literal") {
      if (part.value === " ") {
        hasSpace = true;
        part.value = separator;
      } else if (part.value === separator) {
        hasSpace = true;
      }
    }
  }
  if (hasSpace) {
    return parts.map((part) => part.value).join("");
  }
  const unitIndex = parts.findIndex((part) => part.type === "unit");
  if (unitIndex === -1) {
    return parts.map((part) => part.value).join("");
  }
  if (unitIndex === 0) {
    return parts[0].value + separator + parts.slice(1).map((part) => part.value).join("");
  }
  return parts.slice(0, unitIndex).map((part) => part.value).join("") + separator + parts.slice(unitIndex).map((part) => part.value).join("");
}
//# sourceMappingURL=NumberFormatter.js.map
