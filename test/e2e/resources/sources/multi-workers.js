/**
 * @fileoverview Worker that launches debugger if messaged.
 */

self.onmessage = () => {
  debugger;
};

function anotherFunc(a, b) {
  return a + b;
}
