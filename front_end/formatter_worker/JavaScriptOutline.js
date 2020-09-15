// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as AcornLoose from '../third_party/acorn-loose/package/dist/acorn-loose.mjs';
import * as Acorn from '../third_party/acorn/acorn.js';

import {ECMA_VERSION} from './AcornTokenizer.js';
import {ESTreeWalker} from './ESTreeWalker.js';

/** @typedef {{name: string, line: number, column: number, arguments: (string|undefined)}} */
// @ts-ignore typedef
export let Chunk;

/**
 * @param {string} content
 * @return {{chunk: !Array<!Chunk>, isLastChunk: boolean}}
 */
export function javaScriptOutline(content) {
  const chunkSize = 100000;
  /** @type {!Array<!Chunk>} */
  let outlineChunk = [];
  let lastReportedOffset = 0;

  let ast;
  try {
    ast = Acorn.parse(content, {ecmaVersion: ECMA_VERSION, ranges: false});
  } catch (e) {
    ast = AcornLoose.parse(content, {ecmaVersion: ECMA_VERSION, ranges: false});
  }

  const contentLineEndings = Platform.StringUtilities.findLineEndingIndexes(content);
  const textCursor = new TextUtils.TextCursor.TextCursor(contentLineEndings);
  const walker = new ESTreeWalker(beforeVisit);

  // @ts-ignore Technically, the acorn Node type is a subclass of ESTree.Node.
  // However, the acorn package currently exports its type without specifying
  // this relationship. So while this is allowed on runtime, we can't properly
  // typecheck it.
  walker.walk(ast);

  return {chunk: outlineChunk, isLastChunk: true};

  /**
   * @param {!ESTree.Node} node
   */
  function beforeVisit(node) {
    if (node.type === 'ClassDeclaration') {
      reportClass(/** @type {!ESTree.Node} */ (node.id));
    } else if (node.type === 'VariableDeclarator' && node.init && isClassNode(node.init)) {
      reportClass(/** @type {!ESTree.Node} */ (node.id));
    } else if (node.type === 'AssignmentExpression' && isNameNode(node.left) && isClassNode(node.right)) {
      reportClass(/** @type {!ESTree.Node} */ (node.left));
    } else if (node.type === 'Property' && isNameNode(node.key) && isClassNode(node.value)) {
      reportClass(/** @type {!ESTree.Node} */ (node.key));
    } else if (node.type === 'FunctionDeclaration') {
      reportFunction(/** @type {!ESTree.Node} */ (node.id), node);
    } else if (node.type === 'VariableDeclarator' && node.init && isFunctionNode(node.init)) {
      reportFunction(/** @type {!ESTree.Node} */ (node.id), /** @type {!ESTree.Node} */ (node.init));
    } else if (node.type === 'AssignmentExpression' && isNameNode(node.left) && isFunctionNode(node.right)) {
      reportFunction(/** @type {!ESTree.Node} */ (node.left), /** @type {!ESTree.Node} */ (node.right));
    } else if (
        (node.type === 'MethodDefinition' || node.type === 'Property') && isNameNode(node.key) &&
        isFunctionNode(node.value)) {
      const namePrefix = [];
      if (node.kind === 'get' || node.kind === 'set') {
        namePrefix.push(node.kind);
      }
      if ('static' in node && node.static) {
        namePrefix.push('static');
      }
      reportFunction(/** @type {!ESTree.Node} */ (node.key), node.value, namePrefix.join(' '));
    }

    return undefined;
  }

  /**
   * @param {!ESTree.Node} nameNode
   */
  function reportClass(nameNode) {
    const name = 'class ' + stringifyNameNode(nameNode);
    textCursor.advance(nameNode.start);
    addOutlineItem(
        {name: name, line: textCursor.lineNumber(), column: textCursor.columnNumber(), arguments: undefined});
  }

  /**
   * @param {!ESTree.Node} nameNode
   * @param {!ESTree.Node} functionNode
   * @param {string=} namePrefix
   */
  function reportFunction(nameNode, functionNode, namePrefix) {
    let name = stringifyNameNode(nameNode);
    const functionDeclarationNode = /** @type {!ESTree.FunctionDeclaration} */ (functionNode);
    if (functionDeclarationNode.generator) {
      name = '*' + name;
    }
    if (namePrefix) {
      name = namePrefix + ' ' + name;
    }
    if (functionDeclarationNode.async) {
      name = 'async ' + name;
    }

    textCursor.advance(nameNode.start);
    addOutlineItem({
      name: name,
      line: textCursor.lineNumber(),
      column: textCursor.columnNumber(),
      arguments: stringifyArguments(/** @type {!Array<!ESTree.Node>} */ (functionDeclarationNode.params))
    });
  }

  /**
   * @param {(!ESTree.Node|undefined)} node
   * @return {boolean}
   */
  function isNameNode(node) {
    if (!node) {
      return false;
    }
    if (node.type === 'MemberExpression') {
      return !node.computed && node.property.type === 'Identifier';
    }
    return node.type === 'Identifier';
  }

  /**
   * @param {(!ESTree.Node|undefined)} node
   * @return {boolean}
   */
  function isFunctionNode(node) {
    if (!node) {
      return false;
    }
    return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
  }

  /**
   * @param {(!ESTree.Node|undefined)} node
   * @return {boolean}
   */
  function isClassNode(node) {
    return !!node && node.type === 'ClassExpression';
  }

  /**
   * @param {!ESTree.Node} node
   * @return {string}
   */
  function stringifyNameNode(node) {
    if (node.type === 'MemberExpression') {
      node = /** @type {!ESTree.Node} */ (node.property);
    }
    console.assert(node.type === 'Identifier', 'Cannot extract identifier from unknown type: ' + node.type);
    const identifier = /** @type {!ESTree.Identifier} */ (node);
    return identifier.name;
  }

  /**
   * @param {!Array<!ESTree.Node>} params
   * @return {string}
   */
  function stringifyArguments(params) {
    const result = [];
    for (const param of params) {
      if (param.type === 'Identifier') {
        result.push(param.name);
      } else if (param.type === 'RestElement' && param.argument.type === 'Identifier') {
        result.push('...' + param.argument.name);
      } else {
        console.error('Error: unexpected function parameter type: ' + param.type);
      }
    }
    return '(' + result.join(', ') + ')';
  }

  /**
   * @param {!Chunk} item
   */
  function addOutlineItem(item) {
    outlineChunk.push(item);
    if (textCursor.offset() - lastReportedOffset < chunkSize) {
      return;
    }

    // @ts-ignore Worker.postMessage signature is different to Window.postMessage; lib.dom.ts assumes this code is on window.
    postMessage({chunk: outlineChunk, isLastChunk: false});
    outlineChunk = [];
    lastReportedOffset = textCursor.offset();
  }
}
