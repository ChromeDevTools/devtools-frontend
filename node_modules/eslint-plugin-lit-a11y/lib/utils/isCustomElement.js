const CE_TAGNAME_RE = /^[a-z]\w+-\w+/;

/**
 * Is the element a custom element (i.e. does it contain a '-')?
 * @param {import('parse5-htmlparser2-tree-adapter').Element} element
 */
function isCustomElement(element) {
  return !!(element && typeof element.name === 'string' && CE_TAGNAME_RE.test(element.name));
}

module.exports = {
  isCustomElement,
};
