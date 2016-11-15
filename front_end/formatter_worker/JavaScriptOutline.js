// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @param {string} content
 */
FormatterWorker.javaScriptOutline = function(content) {
  var chunkSize = 100000;  // characters per data chunk
  var outlineChunk = [];
  var previousIdentifier = null;
  var previousToken = null;
  var processedChunkCharacters = 0;
  var addedFunction = false;
  var isReadingArguments = false;
  var argumentsText = '';
  var currentFunction = null;
  var tokenizer = new FormatterWorker.AcornTokenizer(content);
  var AT = FormatterWorker.AcornTokenizer;

  while (tokenizer.peekToken()) {
    var token = /** @type {!Acorn.TokenOrComment} */ (tokenizer.nextToken());
    if (AT.lineComment(token) || AT.blockComment(token))
      continue;

    var tokenValue = content.substring(token.start, token.end);

    if (AT.identifier(token) && previousToken &&
        (AT.identifier(previousToken, 'get') || AT.identifier(previousToken, 'set'))) {
      currentFunction = {
        line: tokenizer.tokenLineStart(),
        column: tokenizer.tokenColumnStart(),
        name: previousToken.value + ' ' + tokenValue
      };
      addedFunction = true;
      previousIdentifier = null;
    } else if (AT.identifier(token)) {
      previousIdentifier = tokenValue;
      if (tokenValue && previousToken && AT.keyword(previousToken, 'function')) {
        // A named function: "function f...".
        currentFunction = {line: tokenizer.tokenLineStart(), column: tokenizer.tokenColumnStart(), name: tokenValue};
        addedFunction = true;
        previousIdentifier = null;
      }
    } else if (
        AT.keyword(token, 'function') && previousIdentifier && previousToken && AT.punctuator(previousToken, ':=')) {
      // Anonymous function assigned to an identifier: "...f = function..."
      // or "funcName: function...".
      currentFunction = {
        line: tokenizer.tokenLineStart(),
        column: tokenizer.tokenColumnStart(),
        name: previousIdentifier
      };
      addedFunction = true;
      previousIdentifier = null;
    } else if (AT.punctuator(token, '.') && previousToken && AT.identifier(previousToken)) {
      previousIdentifier += '.';
    } else if (AT.punctuator(token, '(') && addedFunction) {
      isReadingArguments = true;
    }
    if (isReadingArguments && tokenValue)
      argumentsText += tokenValue;

    if (AT.punctuator(token, ')') && isReadingArguments) {
      addedFunction = false;
      isReadingArguments = false;
      currentFunction.arguments = argumentsText.replace(/,[\r\n\s]*/g, ', ').replace(/([^,])[\r\n\s]+/g, '$1');
      argumentsText = '';
      outlineChunk.push(currentFunction);
    }

    previousToken = token;
    processedChunkCharacters += token.end - token.start;

    if (processedChunkCharacters >= chunkSize) {
      postMessage({chunk: outlineChunk, isLastChunk: false});
      outlineChunk = [];
      processedChunkCharacters = 0;
    }
  }

  postMessage({chunk: outlineChunk, isLastChunk: true});
};
