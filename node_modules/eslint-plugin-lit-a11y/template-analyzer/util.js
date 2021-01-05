/* eslint-disable strict */

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const TreeAdapter = require('parse5-htmlparser2-tree-adapter');

/**
 * Get the name of a node
 *
 * @param {import('estree').Node} node Node to retrieve name of
 * @return {?string}
 */
function getIdentifierName(node) {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'Literal') {
    return node.raw;
  }
  if (node.type === 'CallExpression') {
    return getIdentifierName(node.callee);
  }
  return undefined;
}

exports.getIdentifierName = getIdentifierName;

/**
 * @param {import("estree").Statement} statement
 * @return {statement is import('estree').ReturnStatement}
 */
function isReturnStatement(statement) {
  return statement.type === 'ReturnStatement';
}

/**
 * @param {import("estree").Statement} statement
 * @return {statement is import('estree').ReturnStatement & { argument: { type: 'ObjectExpression' }}}
 */
function isReturnStatementWithObjectExpression(statement) {
  return (
    isReturnStatement(statement) &&
    statement.argument != null &&
    statement.argument.type === 'ObjectExpression'
  );
}

/**
 * @typedef {import('estree').ExpressionStatement} DecoratorExpression
 */

/**
 * @param {import("estree").MethodDefinition} member
 * @return {member is import('estree').MethodDefinition & { decorators: DecoratorExpression[] }}
 */
function hasDecorators(member) {
  // @ts-expect-error: probably not typed because it's a stage-2 proposal ?
  return Array.isArray(member.decorators);
}

/**
 * @param {import("estree").Property|import("estree").SpreadElement} property
 * @return {property is import('estree').SpreadElement}
 */
function isSpreadElement(property) {
  return property.type === 'SpreadElement';
}

/**
 * Get the properties object of an element class
 *
 * @param {import('estree').Class} node Class to retrieve map from
 * @return {ReadonlyMap<string, import("estree").ObjectExpression>}
 */
function getPropertyMap(node) {
  const result = new Map();
  for (const member of node.body.body) {
    if (
      member.static &&
      member.kind === 'get' &&
      member.key.type === 'Identifier' &&
      member.key.name === 'properties' &&
      member.value.body
    ) {
      const ret = member.value.body.body.find(isReturnStatementWithObjectExpression);
      if (ret) {
        const arg = ret.argument;
        for (const prop of arg.properties) {
          if (!isSpreadElement(prop)) {
            const name = getIdentifierName(prop.key);
            if (name && prop.value.type === 'ObjectExpression') {
              result.set(name, prop.value);
            }
          }
        }
      }
    }
    const babelProp = member;
    const memberName = getIdentifierName(member.key);
    if (memberName && hasDecorators(babelProp)) {
      for (const decorator of babelProp.decorators) {
        if (
          decorator.expression.type === 'CallExpression' &&
          decorator.expression.callee.type === 'Identifier' &&
          decorator.expression.callee.name === 'property' &&
          decorator.expression.arguments.length > 0
        ) {
          const dArg = decorator.expression.arguments[0];
          if (dArg.type === 'ObjectExpression') {
            result.set(memberName, dArg);
          }
        }
      }
    }
  }
  return result;
}

exports.getPropertyMap = getPropertyMap;

/**
 * Generates a placeholder string for a given quasi
 *
 * @param {import("estree").TaggedTemplateExpression} node Root node
 * @param {import("estree").TemplateElement} quasi Quasi to generate placeholder
 * for
 * @return {string}
 */
function getExpressionPlaceholder(node, quasi) {
  const i = node.quasi.quasis.indexOf(quasi);
  if (/=$/.test(quasi.value.raw)) {
    return `"{{__Q:${i}__}}"`;
  }
  return `{{__Q:${i}__}}`;
}

exports.getExpressionPlaceholder = getExpressionPlaceholder;

/**
 * Tests whether a string is a placeholder or not
 *
 * @param {string} value Value to test
 * @return {boolean}
 */
function isExpressionPlaceholder(value) {
  return /^\{\{__Q:\d+__\}\}$/.test(value);
}

exports.isExpressionPlaceholder = isExpressionPlaceholder;

/**
 * Is the expression a simple literal e.g. string or number literal?
 * @param {import("estree").Expression} expr
 * @return {expr is import("estree").SimpleLiteral}
 */
function isLiteral(expr) {
  return expr && expr.type === 'Literal';
}

exports.isLiteral = isLiteral;

/**
 * @param {TreeAdapter.Node} node
 * @return {node is TreeAdapter.Element}
 */
function isElementNode(node) {
  return TreeAdapter.isElementNode(node);
}

exports.isElementNode = isElementNode;

/**
 * @param {TreeAdapter.Node} node
 * @return {node is TreeAdapter.DocumentFragment}
 */
function isDocumentFragment(node) {
  return node.type === 'root';
}

exports.isDocumentFragment = isDocumentFragment;

/**
 * @param {TreeAdapter.Node} node
 * @return {node is TreeAdapter.CommentNode}
 */
function isCommentNode(node) {
  return TreeAdapter.isCommentNode(node);
}

exports.isCommentNode = isCommentNode;

/**
 * @param {TreeAdapter.Node} node
 * @return {node is TreeAdapter.TextNode}
 */
function isTextNode(node) {
  return TreeAdapter.isTextNode(node);
}

exports.isTextNode = isTextNode;
