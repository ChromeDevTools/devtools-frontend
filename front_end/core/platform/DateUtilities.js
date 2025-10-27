"use strict";
export const isValid = (date) => {
  return !isNaN(date.getTime());
};
export const toISO8601Compact = (date) => {
  function leadZero(x) {
    return (x > 9 ? "" : "0") + x;
  }
  return date.getFullYear() + leadZero(date.getMonth() + 1) + leadZero(date.getDate()) + "T" + leadZero(date.getHours()) + leadZero(date.getMinutes()) + leadZero(date.getSeconds());
};
//# sourceMappingURL=DateUtilities.js.map
