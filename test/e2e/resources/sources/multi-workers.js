/**
 * @fileoverview Worker that launches debugger if messaged.
 */

self.onmessage = ({data}) => {
  if (data.command === 'break') {
    debugger;
  }
};

function anotherFunc(a, b) {
  return a + b;
}
