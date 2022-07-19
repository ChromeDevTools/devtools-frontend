
/**
 * @param {() => void} func
 * @returns void
 */

function innercall(func) {
  func();
}

/**
 * @param {() => void} func
 * @returns void
 */
export function callfunc(func) {
  innercall(func);
}
