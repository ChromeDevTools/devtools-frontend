const { isCustomElement } = require('./isCustomElement.js');
const { isInteractiveElement } = require('./isInteractiveElement.js');

/**
 * @param {import("parse5-htmlparser2-tree-adapter").Element} element
 * @return {boolean}
 */
function isNonInteractiveElement(element, options) {
  if (!isCustomElement(element)) return !isInteractiveElement(element); // keyboard-accesible by default

  // NOTE: nullish coalescing would be nice here
  const allowCustomElements = 'allowCustomElements' in options ? options.allowCustomElements : true;

  const allowList = options.allowList || [];

  return !allowCustomElements && !allowList.includes(element.name);
}

module.exports = {
  isNonInteractiveElement,
};
