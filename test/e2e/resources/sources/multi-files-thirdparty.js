
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

/**
 * @param {() => void} func
 * @returns () => Promise<void>
 */
export function bindTimeoutTestCase(wrappedFunc) {
  return () => Promise.resolve()
      .then(() => setTimeout(() => {}, 0))  // Ignore listing should prevent pause here
      .then(wrappedFunc);
}
