/**
 * @template {'html'|'svg'|'css'} Name
 * @typedef {import('estree').TaggedTemplateExpression & { tag: { type: 'Identifier'; name: Name } }} LitTaggedExpression
 */

/**
 * Whether a node is a lit-html html-tagged template expression
 * @param {import('eslint').Rule.Node} node
 * @param {import('./HasLitHtmlImportRuleExtension').LitA11yRuleContext} context
 * @returns {node is LitTaggedExpression<'html'>}
 */
function isHtmlTaggedTemplate(node, context) {
  if (node.type !== 'TaggedTemplateExpression') return false;
  const { litHtmlTags = ['html'], litHtmlNamespaces = [] } = context.parserServices || {};

  switch (node.tag.type) {
    case 'Identifier':
      return litHtmlTags.includes(node.tag.name);
    case 'MemberExpression':
      return (
        node.tag.property.type === 'Identifier' &&
        node.tag.property.name === 'html' &&
        node.tag.object.type === 'Identifier' &&
        litHtmlNamespaces.includes(node.tag.object.name)
      );
    default:
      return false;
  }
}

/**
 * Whether a node is a lit-element css-tagged template expression
 * @param {import('eslint').Rule.Node} node
 * @param {import('./HasLitHtmlImportRuleExtension').LitA11yRuleContext} context
 * @returns {node is LitTaggedExpression<'css'>}
 */
// future iterations might want to apply CSS a11y checks,
// at which point, imports should be checked against context just like for html
// see also `isSvgTaggedTemplate`
// eslint-disable-next-line no-unused-vars
function isCssTaggedTemplate(node, context) {
  return (
    node.type === 'TaggedTemplateExpression' &&
    node.tag.type === 'Identifier' &&
    node.tag.name === 'css'
  );
}

/**
 * Whether a node is a lit-html svg-tagged template expression
 * @param {import('eslint').Rule.Node} node
 * @param {import('./HasLitHtmlImportRuleExtension').LitA11yRuleContext} context
 * @returns {node is LitTaggedExpression<'svg'>}
 */
// eslint-disable-next-line no-unused-vars
function isSvgTaggedTemplate(node, context) {
  return (
    node.type === 'TaggedTemplateExpression' &&
    node.tag.type === 'Identifier' &&
    node.tag.name === 'svg'
  );
}

module.exports = {
  isCssTaggedTemplate,
  isHtmlTaggedTemplate,
  isSvgTaggedTemplate,
};
