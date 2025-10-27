"use strict";
import * as Platform from "../platform/platform.js";
import { defineFormatter } from "./NumberFormatter.js";
const narrowMillisecondsInteger = defineFormatter({
  style: "unit",
  unit: "millisecond",
  unitDisplay: "narrow",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
const longMilliseconds = defineFormatter({
  style: "unit",
  unit: "millisecond",
  unitDisplay: "long",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
const narrowMicrosecondsInteger = defineFormatter({
  style: "unit",
  unit: "microsecond",
  unitDisplay: "narrow",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
const narrowMillisecondsDecimal = defineFormatter({
  style: "unit",
  unit: "millisecond",
  unitDisplay: "narrow",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const narrowSecondsDecimal = defineFormatter({
  style: "unit",
  unit: "second",
  unitDisplay: "narrow",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const shortMinutesDecimal = defineFormatter({
  style: "unit",
  unit: "minute",
  unitDisplay: "short",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});
const shortHoursDecimal = defineFormatter({
  style: "unit",
  unit: "hour",
  unitDisplay: "short",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});
const longDaysDecimal = defineFormatter({
  style: "unit",
  unit: "day",
  unitDisplay: "long",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});
export function formatMicroSecondsTime(time) {
  return millisToString(Platform.Timing.microSecondsToMilliSeconds(time), true);
}
export function formatMicroSecondsAsSeconds(time) {
  const milliseconds = Platform.Timing.microSecondsToMilliSeconds(time);
  const seconds = Platform.Timing.milliSecondsToSeconds(milliseconds);
  return narrowSecondsDecimal.format(seconds);
}
export function formatMicroSecondsAsMillisFixed(time) {
  const milliseconds = Platform.Timing.microSecondsToMilliSeconds(time);
  return narrowMillisecondsInteger.format(milliseconds);
}
export function formatMicroSecondsAsMillisFixedExpanded(time) {
  const milliseconds = Platform.Timing.microSecondsToMilliSeconds(time);
  return longMilliseconds.format(milliseconds);
}
export function millisToString(ms, higherResolution) {
  if (!isFinite(ms)) {
    return "-";
  }
  if (higherResolution && ms < 0.1) {
    return narrowMicrosecondsInteger.format(ms * 1e3);
  }
  if (higherResolution && ms < 1e3) {
    return narrowMillisecondsDecimal.format(ms);
  }
  if (ms < 1e3) {
    return narrowMillisecondsInteger.format(ms);
  }
  const seconds = ms / 1e3;
  if (seconds < 60) {
    return narrowSecondsDecimal.format(seconds);
  }
  const minutes = seconds / 60;
  if (minutes < 60) {
    return shortMinutesDecimal.format(minutes);
  }
  const hours = minutes / 60;
  if (hours < 24) {
    return shortHoursDecimal.format(hours);
  }
  const days = hours / 24;
  return longDaysDecimal.format(days);
}
const preciseMillisToStringFormattersCache = /* @__PURE__ */ new Map();
export function preciseMillisToString(ms, precision = 0, separator) {
  let formatter = preciseMillisToStringFormattersCache.get(precision);
  if (!formatter) {
    formatter = defineFormatter({
      style: "unit",
      unit: "millisecond",
      unitDisplay: "narrow",
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
    preciseMillisToStringFormattersCache.set(precision, formatter);
  }
  return formatter.format(ms, separator);
}
const preciseSecondsToStringFormattersCache = /* @__PURE__ */ new Map();
export function preciseSecondsToString(ms, precision = 0) {
  let formatter = preciseSecondsToStringFormattersCache.get(precision);
  if (!formatter) {
    formatter = defineFormatter({
      style: "unit",
      unit: "second",
      unitDisplay: "narrow",
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
    preciseSecondsToStringFormattersCache.set(precision, formatter);
  }
  return formatter.format(ms);
}
export function secondsToString(seconds, higherResolution) {
  if (!isFinite(seconds)) {
    return "-";
  }
  return millisToString(seconds * 1e3, higherResolution);
}
//# sourceMappingURL=time-utilities.js.map
