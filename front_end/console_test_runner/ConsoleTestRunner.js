// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

/**
 * @param {boolean} printOriginatingCommand
 * @param {boolean} dumpClassNames
 * @param {function(!Element, !ConsoleModel.ConsoleMessage):string=} formatter
 */
ConsoleTestRunner.dumpConsoleMessages = function(printOriginatingCommand, dumpClassNames, formatter) {
  TestRunner.addResults(
      ConsoleTestRunner.dumpConsoleMessagesIntoArray(printOriginatingCommand, dumpClassNames, formatter));
};

/**
 * @param {boolean} printOriginatingCommand
 * @param {boolean} dumpClassNames
 * @param {function(!Element, !ConsoleModel.ConsoleMessage):string=} formatter
 * @return {!Array<string>}
 */
ConsoleTestRunner.dumpConsoleMessagesIntoArray = function(printOriginatingCommand, dumpClassNames, formatter) {
  formatter = formatter || ConsoleTestRunner.prepareConsoleMessageText;
  var result = [];
  ConsoleTestRunner.disableConsoleViewport();
  var consoleView = Console.ConsoleView.instance();
  if (consoleView._needsFullUpdate)
    consoleView._updateMessageList();
  var viewMessages = consoleView._visibleViewMessages;
  for (var i = 0; i < viewMessages.length; ++i) {
    var uiMessage = viewMessages[i];
    var message = uiMessage.consoleMessage();
    var element = uiMessage.element();

    if (dumpClassNames) {
      var classNames = [];
      for (var node = element.firstChild; node; node = node.traverseNextNode(element)) {
        if (node.nodeType === Node.ELEMENT_NODE && node.className) {
          classNames.push(node.className.replace('platform-linux', 'platform-*')
                              .replace('platform-mac', 'platform-*')
                              .replace('platform-windows', 'platform-*'));
        }
      }
    }

    if (ConsoleTestRunner.dumpConsoleTableMessage(uiMessage, false, result)) {
      if (dumpClassNames)
        result.push(classNames.join(' > '));
    } else {
      var messageText = formatter(element, message);
      messageText = messageText.replace(/VM\d+/g, 'VM');
      result.push(messageText + (dumpClassNames ? ' ' + classNames.join(' > ') : ''));
    }

    if (printOriginatingCommand && uiMessage.consoleMessage().originatingMessage())
      result.push('Originating from: ' + uiMessage.consoleMessage().originatingMessage().messageText);
  }
  return result;
};

/**
 * @param {!Element} messageElement
 * @param {!ConsoleModel.ConsoleMessage} consoleMessage
 * @return {string}
 */
ConsoleTestRunner.prepareConsoleMessageText = function(messageElement, consoleMessage) {
  var messageText = messageElement.deepTextContent().replace(/\u200b/g, '');
  // Replace scriptIds with generic scriptId string to avoid flakiness.
  messageText = messageText.replace(/VM\d+/g, 'VM');
  // Remove line and column of evaluate method.
  messageText = messageText.replace(/(at eval \(eval at evaluate) \(:\d+:\d+\)/, '$1');

  if (messageText.startsWith('Navigated to')) {
    var fileName = messageText.split(' ').pop().split('/').pop();
    messageText = 'Navigated to ' + fileName;
  }
  // The message might be extremely long in case of dumping stack overflow message.
  messageText = messageText.substring(0, 1024);
  return messageText;
};

/**
 * @param {!Console.ConsoleViewMessage} viewMessage
 * @param {boolean} forceInvalidate
 * @param {!Array<string>} results
 * @return {boolean}
 */
ConsoleTestRunner.dumpConsoleTableMessage = function(viewMessage, forceInvalidate, results) {
  if (forceInvalidate)
    Console.ConsoleView.instance()._viewport.invalidate();
  var table = viewMessage.element();
  var headers = table.querySelectorAll('th > div:first-child');
  if (!headers.length)
    return false;

  var headerLine = '';
  for (var i = 0; i < headers.length; i++)
    headerLine += headers[i].textContent + ' | ';

  addResult('HEADER ' + headerLine);

  var rows = table.querySelectorAll('.data-container tr');

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowLine = '';
    var items = row.querySelectorAll('td > span');
    for (var j = 0; j < items.length; j++)
      rowLine += items[j].textContent + ' | ';

    if (rowLine.trim())
      addResult('ROW ' + rowLine);
  }

  /**
   * @param {string} x
   */
  function addResult(x) {
    if (results)
      results.push(x);
    else
      TestRunner.addResult(x);
  }

  return true;
};

ConsoleTestRunner.disableConsoleViewport = function() {
  ConsoleTestRunner.fixConsoleViewportDimensions(600, 2000);
};

/**
 * @param {number} width
 * @param {number} height
 */
ConsoleTestRunner.fixConsoleViewportDimensions = function(width, height) {
  var viewport = Console.ConsoleView.instance()._viewport;
  viewport.element.style.width = width + 'px';
  viewport.element.style.height = height + 'px';
  viewport.element.style.position = 'absolute';
  viewport.invalidate();
};