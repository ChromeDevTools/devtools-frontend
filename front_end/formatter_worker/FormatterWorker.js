/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @param {string} mimeType
 * @return {function(string, function(string, ?string, number, number):(!Object|undefined))}
 */
FormatterWorker.createTokenizer = function(mimeType) {
  const mode = CodeMirror.getMode({indentUnit: 2}, mimeType);
  const state = CodeMirror.startState(mode);
  /**
   * @param {string} line
   * @param {function(string, ?string, number, number):?} callback
   */
  function tokenize(line, callback) {
    const stream = new CodeMirror.StringStream(line);
    while (!stream.eol()) {
      const style = mode.token(stream, state);
      const value = stream.current();
      if (callback(value, style, stream.start, stream.start + value.length) === FormatterWorker.AbortTokenization)
        return;
      stream.start = stream.pos;
    }
  }
  return tokenize;
};

FormatterWorker.AbortTokenization = {};

self.onmessage = function(event) {
  const method = /** @type {string} */ (event.data.method);
  const params = /** @type !{indentString: string, content: string, mimeType: string} */ (event.data.params);
  if (!method)
    return;

  switch (method) {
    case 'format':
      FormatterWorker.format(params.mimeType, params.content, params.indentString);
      break;
    case 'parseCSS':
      FormatterWorker.parseCSS(params.content);
      break;
    case 'parseSCSS':
      FormatterWorker.FormatterWorkerContentParser.parse(params.content, 'text/x-scss');
      break;
    case 'javaScriptOutline':
      FormatterWorker.javaScriptOutline(params.content);
      break;
    case 'javaScriptIdentifiers':
      FormatterWorker.javaScriptIdentifiers(params.content);
      break;
    case 'evaluatableJavaScriptSubstring':
      FormatterWorker.evaluatableJavaScriptSubstring(params.content);
      break;
    case 'parseJSONRelaxed':
      FormatterWorker.parseJSONRelaxed(params.content);
      break;
    case 'preprocessTopLevelAwaitExpressions':
      FormatterWorker.preprocessTopLevelAwaitExpressions(params.content);
      break;
    default:
      console.error('Unsupport method name: ' + method);
  }
};

/**
 * @param {string} content
 */
FormatterWorker.parseJSONRelaxed = function(content) {
  postMessage(FormatterWorker.RelaxedJSONParser.parse(content));
};

/**
 * @param {string} content
 */
FormatterWorker.evaluatableJavaScriptSubstring = function(content) {
  const tokenizer = acorn.tokenizer(content, {ecmaVersion: 9});
  let result = '';
  try {
    let token = tokenizer.getToken();
    while (token.type !== acorn.tokTypes.eof && FormatterWorker.AcornTokenizer.punctuator(token))
      token = tokenizer.getToken();

    const startIndex = token.start;
    let endIndex = token.end;
    let openBracketsCounter = 0;
    while (token.type !== acorn.tokTypes.eof) {
      const isIdentifier = FormatterWorker.AcornTokenizer.identifier(token);
      const isThis = FormatterWorker.AcornTokenizer.keyword(token, 'this');
      const isString = token.type === acorn.tokTypes.string;
      if (!isThis && !isIdentifier && !isString)
        break;

      endIndex = token.end;
      token = tokenizer.getToken();
      while (FormatterWorker.AcornTokenizer.punctuator(token, '.[]')) {
        if (FormatterWorker.AcornTokenizer.punctuator(token, '['))
          openBracketsCounter++;

        if (FormatterWorker.AcornTokenizer.punctuator(token, ']')) {
          endIndex = openBracketsCounter > 0 ? token.end : endIndex;
          openBracketsCounter--;
        }

        token = tokenizer.getToken();
      }
    }
    result = content.substring(startIndex, endIndex);
  } catch (e) {
    console.error(e);
  }
  postMessage(result);
};

/**
 * @param {string} content
 */
FormatterWorker.preprocessTopLevelAwaitExpressions = function(content) {
  let wrapped = '(async () => {' + content + '})()';
  const root = acorn.parse(wrapped, {ecmaVersion: 9});
  const body = root.body[0].expression.callee.body;
  const changes = [];
  let containsAwait = false;
  let containsReturn = false;
  class Visitor {
    ClassDeclaration(node) {
      if (node.parent === body)
        changes.push({text: node.id.name + '=', start: node.start, end: node.start});
    }
    FunctionDeclaration(node) {
      changes.push({text: node.id.name + '=', start: node.start, end: node.start});
      return FormatterWorker.ESTreeWalker.SkipSubtree;
    }
    FunctionExpression(node) {
      return FormatterWorker.ESTreeWalker.SkipSubtree;
    }
    ArrowFunctionExpression(node) {
      return FormatterWorker.ESTreeWalker.SkipSubtree;
    }
    MethodDefinition(node) {
      return FormatterWorker.ESTreeWalker.SkipSubtree;
    }
    AwaitExpression(node) {
      containsAwait = true;
    }
    ReturnStatement(node) {
      containsReturn = true;
    }
    VariableDeclaration(node) {
      if (node.kind !== 'var' && node.parent !== body)
        return;
      const onlyOneDeclaration = node.declarations.length === 1;
      changes.push(
          {text: onlyOneDeclaration ? 'void' : 'void (', start: node.start, end: node.start + node.kind.length});
      for (const declaration of node.declarations) {
        if (!declaration.init) {
          changes.push({text: '(', start: declaration.start, end: declaration.start});
          changes.push({text: '=undefined)', start: declaration.end, end: declaration.end});
          continue;
        }
        changes.push({text: '(', start: declaration.start, end: declaration.start});
        changes.push({text: ')', start: declaration.end, end: declaration.end});
      }
      if (!onlyOneDeclaration) {
        const last = node.declarations.peekLast();
        changes.push({text: ')', start: last.end, end: last.end});
      }
    }
  }
  const walker = new FormatterWorker.ESTreeWalker(visit.bind(new Visitor()));
  walker.walk(body);
  /**
   * @param {!ESTree.Node} node
   * @this {Object}
   */
  function visit(node) {
    if (node.type in this)
      return this[node.type](node);
  }
  // Top-level return is not allowed.
  if (!containsAwait || containsReturn) {
    postMessage('');
    return;
  }
  const last = body.body[body.body.length - 1];
  if (last.type === 'ExpressionStatement') {
    changes.push({text: 'return (', start: last.start, end: last.start});
    if (wrapped[last.end - 1] !== ';')
      changes.push({text: ')', start: last.end, end: last.end});
    else
      changes.push({text: ')', start: last.end - 1, end: last.end - 1});
  }
  while (changes.length) {
    const change = changes.pop();
    wrapped = wrapped.substr(0, change.start) + change.text + wrapped.substr(change.end);
  }
  postMessage(wrapped);
};

/**
 * @param {string} content
 */
FormatterWorker.javaScriptIdentifiers = function(content) {
  const root = acorn.parse(content, {ranges: false, ecmaVersion: 9});

  /** @type {!Array<!ESTree.Node>} */
  const identifiers = [];
  const walker = new FormatterWorker.ESTreeWalker(beforeVisit);

  /**
   * @param {!ESTree.Node} node
   * @return {boolean}
   */
  function isFunction(node) {
    return node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression';
  }

  /**
   * @param {!ESTree.Node} node
   */
  function beforeVisit(node) {
    if (isFunction(node)) {
      if (node.id)
        identifiers.push(node.id);
      return FormatterWorker.ESTreeWalker.SkipSubtree;
    }

    if (node.type !== 'Identifier')
      return;

    if (node.parent && node.parent.type === 'MemberExpression' && node.parent.property === node &&
        !node.parent.computed)
      return;
    identifiers.push(node);
  }

  if (!root || root.type !== 'Program' || root.body.length !== 1 || !isFunction(root.body[0])) {
    postMessage([]);
    return;
  }

  const functionNode = root.body[0];
  for (const param of functionNode.params)
    walker.walk(param);
  walker.walk(functionNode.body);
  const reduced = identifiers.map(id => ({name: id.name, offset: id.start}));
  postMessage(reduced);
};

/**
 * @param {string} mimeType
 * @param {string} text
 * @param {string=} indentString
 */
FormatterWorker.format = function(mimeType, text, indentString) {
  // Default to a 4-space indent.
  indentString = indentString || '    ';
  const result = {};
  const builder = new FormatterWorker.FormattedContentBuilder(indentString);
  const lineEndings = text.computeLineEndings();
  try {
    switch (mimeType) {
      case 'text/html': {
        const formatter = new FormatterWorker.HTMLFormatter(builder);
        formatter.format(text, lineEndings);
        break;
      }
      case 'text/css': {
        const formatter = new FormatterWorker.CSSFormatter(builder);
        formatter.format(text, lineEndings, 0, text.length);
        break;
      }
      case 'text/javascript': {
        const formatter = new FormatterWorker.JavaScriptFormatter(builder);
        formatter.format(text, lineEndings, 0, text.length);
        break;
      }
      default: {
        const formatter = new FormatterWorker.IdentityFormatter(builder);
        formatter.format(text, lineEndings, 0, text.length);
      }
    }
    result.mapping = builder.mapping();
    result.content = builder.content();
  } catch (e) {
    console.error(e);
    result.mapping = {original: [0], formatted: [0]};
    result.content = text;
  }
  postMessage(result);
};

/**
 * @interface
 */
FormatterWorker.FormatterWorkerContentParser = function() {};

FormatterWorker.FormatterWorkerContentParser.prototype = {
  /**
   * @param {string} content
   * @return {!Object}
   */
  parse(content) {}
};

/**
 * @param {string} content
 * @param {string} mimeType
 */
FormatterWorker.FormatterWorkerContentParser.parse = function(content, mimeType) {
  const extension = self.runtime.extensions(FormatterWorker.FormatterWorkerContentParser).find(findExtension);
  console.assert(extension);
  extension.instance().then(instance => instance.parse(content)).catchException(null).then(postMessage);

  /**
   * @param {!Runtime.Extension} extension
   * @return {boolean}
   */
  function findExtension(extension) {
    return extension.descriptor()['mimeType'] === mimeType;
  }
};

(function disableLoggingForTest() {
  if (Runtime.queryParam('test'))
    console.error = () => undefined;
})();
