/**
 * Does the element have the attribute?
 * @param {import("parse5-htmlparser2-tree-adapter").Element} element
 * @param {string} attr
 */
function elementHasAttribute(element, attr) {
  return Object.keys(element.attribs).includes(attr);
}

/**
 * Does the element have the attribute?
 * @param {import("parse5-htmlparser2-tree-adapter").Element} element
 * @param {string[]} attrs
 */
function elementHasSomeAttribute(element, attrs) {
  return attrs.some(elementHasAttribute.bind(attrs, element));
}

module.exports = {
  elementHasAttribute,
  elementHasSomeAttribute,
};
