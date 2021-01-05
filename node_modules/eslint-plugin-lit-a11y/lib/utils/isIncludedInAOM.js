const { isAriaHidden } = require('./aria.js');
const { isHiddenFromScreenReader } = require('./isHiddenFromScreenReader.js');
const { isPresentationRole } = require('./isPresentationRole.js');

/**
 * @param {import("parse5-htmlparser2-tree-adapter").Element} element
 * @return {boolean}
 */
function isIncludedInAOM(element) {
  return (
    !isHiddenFromScreenReader(element) &&
    !isPresentationRole(element.attribs) &&
    !isAriaHidden(element)
  );
}

module.exports = {
  isIncludedInAOM,
};
