"use strict";
import { defineFormatter } from "./NumberFormatter.js";
const narrowBytes = defineFormatter({
  style: "unit",
  unit: "byte",
  unitDisplay: "narrow",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
const narrowKilobytesDecimal = defineFormatter({
  style: "unit",
  unit: "kilobyte",
  unitDisplay: "narrow",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});
const narrowKilobytesInteger = defineFormatter({
  style: "unit",
  unit: "kilobyte",
  unitDisplay: "narrow",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
const narrowMegabytesDecimal = defineFormatter({
  style: "unit",
  unit: "megabyte",
  unitDisplay: "narrow",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});
const narrowMegabytesInteger = defineFormatter({
  style: "unit",
  unit: "megabyte",
  unitDisplay: "narrow",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
export const bytesToString = (bytes) => {
  if (bytes < 1e3) {
    return narrowBytes.format(bytes);
  }
  const kilobytes = bytes / 1e3;
  if (kilobytes < 100) {
    return narrowKilobytesDecimal.format(kilobytes);
  }
  if (kilobytes < 1e3) {
    return narrowKilobytesInteger.format(kilobytes);
  }
  const megabytes = kilobytes / 1e3;
  if (megabytes < 100) {
    return narrowMegabytesDecimal.format(megabytes);
  }
  return narrowMegabytesInteger.format(megabytes);
};
export const formatBytesToKb = (bytes) => {
  const kilobytes = bytes / 1e3;
  if (kilobytes < 100) {
    return narrowKilobytesDecimal.format(kilobytes);
  }
  return narrowKilobytesInteger.format(kilobytes);
};
//# sourceMappingURL=ByteUtilities.js.map
