/**
 * Retrieves the literal value of an attribute
 * @param {import('eslint-plugin-lit/lib/template-analyzer').TemplateAnalyzer} analyzer
 * @param {import('estree').Element} element
 * @param {string} attr
 * @param {import('eslint').SourceCode} source
 * @returns {string|undefined}
 */
function getLiteralAttributeValue(analyzer, element, attr, source) {
  const expr = analyzer.getAttributeValue(element, attr, source);

  if (expr === null) {
    return undefined;
  }

  if (typeof expr !== 'string') {
    if (expr.type === 'Literal') {
      return expr.value;
    }
    return undefined;
  }

  return expr;
}

module.exports = {
  getLiteralAttributeValue,
};
