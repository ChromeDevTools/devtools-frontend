const { aria, roles } = require('aria-query');

/**
 * @param {string} string
 * @return {string is import("aria-query").ARIARoleDefintionKey}
 */
function isAriaRole(string) {
  // @ts-expect-error: we need to disambiguate from the string type here.
  return roles.get(string) !== undefined;
}

/**
 * @param {string} string
 * @return {string is import("aria-query").ARIARoleDefintionKey}
 */
function isConcreteAriaRole(string) {
  return (
    isAriaRole(string) &&
    [...roles.keys()].some(role => roles.get(role).abstract === false && role === string)
  );
}

/**
 * @param {string} string
 * @return {string is import('aria-query').ARIAProperty}
 */
function isAriaPropertyName(string) {
  // @ts-expect-error: we need to disambiguate the string type here.
  return aria.get(string) !== undefined;
}

/**
 * Identifies invalid aria-* attributes
 * @param {string} attr
 * @return {boolean}
 */
function isInvalidAriaAttribute(attr) {
  const lower = attr.toLowerCase();
  return lower.startsWith('aria-') && !isAriaPropertyName(lower);
}

/**
 * Is the element excluded from the AOM by means of the `aria-hidden` attribute?
 * @param {import('parse5-htmlparser2-tree-adapter').Element} element
 * @return {boolean}
 */
function isAriaHidden(element) {
  return (
    (Object.keys(element.attribs).includes('aria-hidden') &&
      element.attribs['aria-hidden'] === 'true') ||
    (element.attribs['aria-hidden'] && element.attribs['aria-hidden'].startsWith('{{')) ||
    element.attribs['aria-hidden'] === ''
  );
}

/**
 * Gets the ARIA attribute names in use on the element
 * @param {import("parse5-htmlparser2-tree-adapter").Element} element
 */
function getElementAriaAttributes(element) {
  return Object.keys(element.attribs)
    .map(attr => attr.toLowerCase())
    .filter(isAriaPropertyName);
}

module.exports = {
  isAriaRole,
  isAriaPropertyName,
  isInvalidAriaAttribute,
  isAriaHidden,
  isConcreteAriaRole,
  getElementAriaAttributes,
};
