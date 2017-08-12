// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

TestRunner.dumpSyntaxHighlight = function(str, mimeType) {
  var node = document.createElement('span');
  node.textContent = str;
  var javascriptSyntaxHighlighter = new UI.SyntaxHighlighter(mimeType);
  return javascriptSyntaxHighlighter.syntaxHighlightNode(node).then(dumpSyntax);

  function dumpSyntax() {
    var node_parts = [];

    for (var i = 0; i < node.childNodes.length; i++) {
      if (node.childNodes[i].getAttribute)
        node_parts.push(node.childNodes[i].getAttribute('class'));
      else
        node_parts.push('*');
    }

    TestRunner.addResult(str + ': ' + node_parts.join(', '));
  }
};
