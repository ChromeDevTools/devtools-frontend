"use strict";
export const debounce = function(func, delay) {
  let timer = 0;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => func(...args), delay);
  };
  return debounced;
};
//# sourceMappingURL=Debouncer.js.map
