/**
 *
 * @param {string[]} attributes - Array of the specific elements' attributes
 * @param {string} attribute - the attribute we want to find
 * @returns {boolean}
 */
function hasAttr(attributes, attribute) {
  return Object.keys(attributes).includes(attribute);
}

module.exports = {
  hasAttr,
};
