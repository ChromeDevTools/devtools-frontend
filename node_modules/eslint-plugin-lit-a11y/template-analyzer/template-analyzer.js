/* eslint-disable camelcase, strict */

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const parse5 = require('parse5');
const treeAdapter = require('parse5-htmlparser2-tree-adapter');
const {
  isDocumentFragment,
  isCommentNode,
  isTextNode,
  isElementNode,
  getExpressionPlaceholder,
  isExpressionPlaceholder,
  isLiteral,
} = require('./util');

const analyzerCache = new WeakMap();

/** @typedef {import('../lib/utils/isLitHtmlTemplate').LitTaggedExpression<'html'|'css'|'svg'>} GenericLitTaggedExpression */

/**
 * @template {treeAdapter.Node} NodeType
 * @typedef {(node: NodeType, parent: treeAdapter.Node | treeAdapter.DocumentFragment) => void} NodeVisitorCallback
 */

/**
 * @typedef {object} Visitor
 * @property {NodeVisitorCallback<treeAdapter.Node>} [enter]
 * @property {NodeVisitorCallback<treeAdapter.DocumentFragment>} [enterDocumentFragment]
 * @property {NodeVisitorCallback<treeAdapter.CommentNode>} [enterCommentNode]
 * @property {NodeVisitorCallback<treeAdapter.TextNode>} [enterTextNode]
 * @property {NodeVisitorCallback<treeAdapter.Element>} [enterElement]
 * @property {NodeVisitorCallback<treeAdapter.Node>} [exit]
 */

/**
 * @typedef {object} LitAttributeValueDescriptor
 * @property {boolean} isLiteralExpression is the attribute value a simple literal e.g. string or number literal
 * @property {string} source the attribute value's text in the parsed source
 * @property {import('estree').SimpleLiteral['value']} value the literal value of the attribute
 * @property {import('estree').Expression} expression the Expression for the attribute value
 */

/**
 * Analyzes a given template expression for traversing its contained
 * HTML tree.
 */
class TemplateAnalyzer {
  /**
   * Constructor
   *
   * @param {GenericLitTaggedExpression} node Node to analyze
   */
  constructor(node) {
    /** @type{Error[]} */
    this.errors = [];

    this._node = node;

    /**
     * Map cache of placeholder strings to expression values
     * @type {Map<string, import('estree').Expression>}
     */
    this.expressionValues = new Map();

    /** @type {treeAdapter.DocumentType} */
    // TODO: This is not ideal
    // @ts-expect-error: parse5.DocumentFragment is a union with {}, so let's fudge this type for convenience
    this._ast = parse5.parseFragment(this.templateExpressionToHtml(node), {
      treeAdapter,
      sourceCodeLocationInfo: true,
      onParseError: err => {
        this.errors.push(err);
      },
    });
  }

  /**
   * Create an analyzer instance for a given node
   *
   * @param {GenericLitTaggedExpression} node Node to use
   * @return {!TemplateAnalyzer}
   */
  static create(node) {
    let cached = analyzerCache.get(node);
    if (!cached) {
      cached = new TemplateAnalyzer(node);
      analyzerCache.set(node, cached);
    }
    return cached;
  }

  /**
   * Converts a template expression into HTML, and caches any literal expressions for later analysis
   *
   * @param {import("estree").TaggedTemplateExpression} node Node to convert
   * @return {string}
   */
  templateExpressionToHtml(node) {
    return node.quasi.quasis.reduce((html, quasi, i) => {
      const expr = node.quasi.expressions[i];
      const placeholder = getExpressionPlaceholder(node, quasi);
      // cache literal expressions for later analysis
      this.expressionValues.set(placeholder.replace(/"|'/g, ''), expr);
      return `${html}${quasi.value.raw}${placeholder}`;
    }, '');
  }

  /**
   * Returns the ESTree location equivalent of a given parsed location.
   *
   * @param {treeAdapter.Node} node Node to retrieve location of
   * @return {?import("estree").SourceLocation}
   */
  getLocationFor(node) {
    if (isElementNode(node)) {
      const loc = node.sourceCodeLocation;
      if (loc) {
        return this.resolveLocation(loc.startTag);
      }
    } else if (isCommentNode(node) || isTextNode(node)) {
      const loc = node.sourceCodeLocation;
      if (loc) {
        return this.resolveLocation(loc);
      }
    }
    return this._node.loc;
  }

  /**
   * Retrieve the cached expression value for a given placeholder
   * @param {string} placeholder
   */
  getExpressionFromPlaceholder(placeholder) {
    return this.expressionValues.get(placeholder);
  }

  /**
   * Only returns values of simple literal expressions, e.g. number or string literals
   * Otherwise returns null.
   * @param {string} placeholder
   * @return {import("estree").SimpleLiteral['value']}
   */
  getExpressionValue(placeholder) {
    if (!this.isLiteralExpressionPlaceholder(placeholder))
      throw new Error('Cannot analyze non-literal expressions');

    /** @type {import('estree').SimpleLiteral} */
    const expr = /** @type {import('estree').SimpleLiteral} */ (this.getExpressionFromPlaceholder(
      // thanks, prettier
      placeholder,
    ));

    return expr.value;
  }

  /**
   * Get a descriptor of a lit-html template expression.
   * @param {string} source
   * @return {LitAttributeValueDescriptor}
   */
  describeAttribute(source) {
    let value;
    let isLiteralExpression = false;
    const expression = this.getExpressionFromPlaceholder(source);
    if (isExpressionPlaceholder(source)) {
      if (this.isLiteralExpressionPlaceholder(source)) {
        // if the value is interpolated with a literal expression e.g. string or number literal
        // then we can analyze it
        value = this.getExpressionValue(source);
        isLiteralExpression = true;
      }
    } else {
      value = source;
    }

    return {
      source,
      value,
      isLiteralExpression,
      expression,
    };
  }

  /**
   * Is the expression for the placeholder string a literal expression (e.g. string or number literal)
   * @param {string} placeholder
   * @return {boolean}
   */
  isLiteralExpressionPlaceholder(placeholder) {
    if (!isExpressionPlaceholder(placeholder)) return false;
    return isLiteral(this.getExpressionFromPlaceholder(placeholder));
  }

  /**
   * Returns the ESTree location equivalent of a given attribute
   *
   * @param {treeAdapter.Element} element Element which owns this attribute
   * @param {string} attr Attribute name to retrieve
   * @return {?import("estree").SourceLocation}
   */
  getLocationForAttribute(element, attr) {
    if (!element.sourceCodeLocation) {
      return null;
    }
    const loc = element.sourceCodeLocation.attrs[attr.toLowerCase()];
    return loc ? this.resolveLocation(loc) : null;
  }

  /**
   * Returns the raw attribute source of a given attribute
   *
   * @param {treeAdapter.Element} element Element which owns this attribute
   * @param {string} attr Attribute name to retrieve
   * @return {string}
   */
  getRawAttributeValue(element, attr) {
    if (!element.sourceCodeLocation) {
      return null;
    }
    const xAttribs = element['x-attribsPrefix'];
    let originalAttr = attr.toLowerCase();
    if (xAttribs && xAttribs[attr]) {
      originalAttr = `${xAttribs[attr]}:${attr}`;
    }
    if (element.attribs[attr] === '') {
      return '';
    }
    const loc = element.sourceCodeLocation.attrs[originalAttr];
    let str = '';
    for (const quasi of this._node.quasi.quasis) {
      const placeholder = getExpressionPlaceholder(this._node, quasi);
      const val = quasi.value.raw + placeholder;
      str += val;
      if (loc.endOffset < str.length) {
        const fullAttr = str.substring(loc.startOffset + attr.length + 1, loc.endOffset);
        if (fullAttr.startsWith('"') && fullAttr.endsWith('"')) {
          return fullAttr.replace(/(^"|"$)/g, '');
        }
        if (fullAttr.startsWith("'") && fullAttr.endsWith("'")) {
          return fullAttr.replace(/(^'|'$)/g, '');
        }
        return fullAttr;
      }
    }
    return null;
  }

  /**
   * Resolves a Parse5 location into an ESTree location
   *
   * @param {parse5.Location} loc Location to convert
   * @return {import("estree").SourceLocation}
   */
  resolveLocation(loc) {
    let offset = 0;
    let expression;
    let height = 0;

    for (const quasi of this._node.quasi.quasis) {
      const placeholder = getExpressionPlaceholder(this._node, quasi);
      offset += quasi.value.raw.length + placeholder.length;

      const i = this._node.quasi.quasis.indexOf(quasi);
      if (i !== 0) {
        expression = this._node.quasi.expressions[i - 1];
        height += expression.loc.end.line - expression.loc.start.line;
      }

      if (loc.startOffset < offset) {
        break;
      }
    }

    let startOffset;
    let endOffset;
    if (loc.startLine === 1) {
      startOffset = loc.startCol + this._node.quasi.loc.start.column;
      endOffset = loc.endCol + this._node.quasi.loc.start.column;
    } else {
      startOffset = loc.startCol - 1;
      endOffset = loc.endCol;
    }

    return {
      start: { line: loc.startLine - 1 + this._node.loc.start.line + height, column: startOffset },
      end: { line: loc.endLine - 1 + this._node.loc.start.line + height, column: endOffset },
    };
  }

  /**
   * Traverse the inner HTML tree with a given visitor
   *
   * @param {Visitor} visitor Visitor to apply
   * @return {void}
   */
  traverse(visitor) {
    /**
     * @param {treeAdapter.Node | treeAdapter.DocumentFragment} node
     * @param {treeAdapter.Node | treeAdapter.DocumentFragment} parent
     */
    const visit = (node, parent) => {
      if (!node) {
        return;
      }

      if (visitor.enter) {
        visitor.enter(node, parent);
      }

      if (isDocumentFragment(node) && visitor.enterDocumentFragment) {
        visitor.enterDocumentFragment(node, parent);
      } else if (isCommentNode(node) && visitor.enterCommentNode) {
        visitor.enterCommentNode(node, parent);
      } else if (isTextNode(node) && visitor.enterTextNode) {
        visitor.enterTextNode(node, parent);
      } else if (isElementNode(node) && visitor.enterElement) {
        visitor.enterElement(node, parent);
      }

      if (isElementNode(node) || isDocumentFragment(node)) {
        const children = node.childNodes;
        if (children && children.length > 0) {
          children.forEach(child => {
            visit(child, node);
          });
        }
      }
      if (visitor.exit) {
        visitor.exit(node, parent);
      }
    };
    visit(this._ast, null);
  }
}

exports.TemplateAnalyzer = TemplateAnalyzer;
