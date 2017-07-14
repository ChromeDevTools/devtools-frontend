// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

/** @typedef {function(!Element, !ConsoleModel.ConsoleMessage=):string} */
ConsoleTestRunner.Formatter;

/**
 * @param {boolean=} printOriginatingCommand
 * @param {boolean=} dumpClassNames
 * @param {!ConsoleTestRunner.Formatter=} formatter
 */
ConsoleTestRunner.dumpConsoleMessages = function(printOriginatingCommand, dumpClassNames, formatter) {
  TestRunner.addResults(
      ConsoleTestRunner.dumpConsoleMessagesIntoArray(printOriginatingCommand, dumpClassNames, formatter));
};

/**
 * @param {boolean=} printOriginatingCommand
 * @param {boolean=} dumpClassNames
 * @param {!ConsoleTestRunner.Formatter=} formatter
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
 * @return {string}
 */
ConsoleTestRunner.prepareConsoleMessageText = function(messageElement) {
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

ConsoleTestRunner.selectMainExecutionContext = function() {
  var executionContexts = TestRunner.runtimeModel.executionContexts();
  for (var context of executionContexts) {
    if (context.isDefault) {
      UI.context.setFlavor(SDK.ExecutionContext, context);
      return;
    }
  }
};

/**
 * @param {string} code
 * @param {!Function=} callback
 * @param {boolean=} dontForceMainContext
 */
ConsoleTestRunner.evaluateInConsole = function(code, callback, dontForceMainContext) {
  if (!dontForceMainContext)
    ConsoleTestRunner.selectMainExecutionContext();
  callback = TestRunner.safeWrap(callback);

  var consoleView = Console.ConsoleView.instance();
  consoleView._prompt._appendCommand(code, true);
  ConsoleTestRunner.addConsoleViewSniffer(function(commandResult) {
    callback(commandResult.toMessageElement().deepTextContent());
  });
};

/**
 * @param {!Function} override
 * @param {boolean=} opt_sticky
 */
ConsoleTestRunner.addConsoleViewSniffer = function(override, opt_sticky) {
  TestRunner.addSniffer(Console.ConsoleView.prototype, '_consoleMessageAddedForTest', override, opt_sticky);
};

/**
 * @param {string} code
 * @param {!Function=} callback
 * @param {boolean=} dontForceMainContext
 */
ConsoleTestRunner.evaluateInConsoleAndDump = function(code, callback, dontForceMainContext) {
  /**
   * @param {string} text
   */
  function mycallback(text) {
    text = text.replace(/\bVM\d+/g, 'VM');
    TestRunner.addResult(code + ' = ' + text);
    callback(text);
  }
  ConsoleTestRunner.evaluateInConsole(code, mycallback, dontForceMainContext);
};

/**
 * @return {number}
 */
ConsoleTestRunner.consoleMessagesCount = function() {
  var consoleView = Console.ConsoleView.instance();
  return consoleView._consoleMessages.length;
};

/**
 * @param {function(!Element):string} messageFormatter
 * @param {!Element} node
 * @return {string}
 */
ConsoleTestRunner.formatterIgnoreStackFrameUrls = function(messageFormatter, node) {
  /**
   * @param {string} string
   */
  function isNotEmptyLine(string) {
    return string.trim().length > 0;
  }

  /**
   * @param {string} string
   */
  function ignoreStackFrameAndMutableData(string) {
    var buffer = string.replace(/\u200b/g, '');
    buffer = buffer.replace(/VM\d+/g, 'VM');
    return buffer.replace(/^\s+at [^\]]+(]?)$/, '$1');
  }

  messageFormatter = messageFormatter || TestRunner.textContentWithLineBreaks;
  var buffer = messageFormatter(node);
  return buffer.split('\n').map(ignoreStackFrameAndMutableData).filter(isNotEmptyLine).join('\n');
};

/**
 * @param {!Element} element
 * @param {!ConsoleModel.ConsoleMessage} message
 * @return {string}
 */
ConsoleTestRunner.simpleFormatter = function(element, message) {
  return message.messageText + ':' + message.line + ':' + message.column;
};

/**
 * @param {boolean=} printOriginatingCommand
 * @param {boolean=} dumpClassNames
 * @param {!ConsoleTestRunner.Formatter=} messageFormatter
 */
ConsoleTestRunner.dumpConsoleMessagesIgnoreErrorStackFrames = function(
    printOriginatingCommand, dumpClassNames, messageFormatter) {
  TestRunner.addResults(ConsoleTestRunner.dumpConsoleMessagesIntoArray(
      printOriginatingCommand, dumpClassNames,
      messageFormatter ? ConsoleTestRunner.formatterIgnoreStackFrameUrls.bind(this, messageFormatter) : undefined));
};

ConsoleTestRunner.dumpConsoleMessagesWithStyles = function() {
  var messageViews = Console.ConsoleView.instance()._visibleViewMessages;
  for (var i = 0; i < messageViews.length; ++i) {
    var element = messageViews[i].element();
    var messageText = ConsoleTestRunner.prepareConsoleMessageText(element);
    TestRunner.addResult(messageText);
    var spans = element.querySelectorAll('.console-message-text *');
    for (var j = 0; j < spans.length; ++j)
      TestRunner.addResult('Styled text #' + j + ': ' + (spans[j].style.cssText || 'NO STYLES DEFINED'));
  }
};

/**
 * @param {boolean=} sortMessages
 */
ConsoleTestRunner.dumpConsoleMessagesWithClasses = function(sortMessages) {
  var result = [];
  var messageViews = Console.ConsoleView.instance()._visibleViewMessages;
  for (var i = 0; i < messageViews.length; ++i) {
    var element = messageViews[i].element();
    var contentElement = messageViews[i].contentElement();
    var messageText = ConsoleTestRunner.prepareConsoleMessageText(element);
    result.push(messageText + ' ' + element.getAttribute('class') + ' > ' + contentElement.getAttribute('class'));
  }
  if (sortMessages)
    result.sort();
  TestRunner.addResults(result);
};

ConsoleTestRunner.dumpConsoleClassesBrief = function() {
  var messageViews = Console.ConsoleView.instance()._visibleViewMessages;
  for (var i = 0; i < messageViews.length; ++i)
    TestRunner.addResult(messageViews[i].toMessageElement().className);
};

ConsoleTestRunner.dumpConsoleCounters = function() {
  var counter = Main.Main.WarningErrorCounter._instanceForTest;
  for (var index = 0; index < counter._titles.length; ++index)
    TestRunner.addResult(counter._titles[index]);
  ConsoleTestRunner.dumpConsoleClassesBrief();
};

/**
 * @param {!Function} callback
 * @param {function(!Element):boolean} deepFilter
 * @param {function(!ObjectUI.ObjectPropertiesSection):boolean} sectionFilter
 */
ConsoleTestRunner.expandConsoleMessages = function(callback, deepFilter, sectionFilter) {
  Console.ConsoleView.instance()._invalidateViewport();
  var messageViews = Console.ConsoleView.instance()._visibleViewMessages;

  // Initiate round-trips to fetch necessary data for further rendering.
  for (var i = 0; i < messageViews.length; ++i)
    messageViews[i].element();

  TestRunner.deprecatedRunAfterPendingDispatches(expandTreeElements);

  function expandTreeElements() {
    for (var i = 0; i < messageViews.length; ++i) {
      var element = messageViews[i].element();
      for (var node = element; node; node = node.traverseNextNode(element)) {
        if (node.treeElementForTest)
          node.treeElementForTest.expand();
        if (node._expandStackTraceForTest)
          node._expandStackTraceForTest();
        if (!node._section)
          continue;
        if (sectionFilter && !sectionFilter(node._section))
          continue;
        node._section.expand();

        if (!deepFilter)
          continue;
        var treeElements = node._section.rootElement().children();
        for (var j = 0; j < treeElements.length; ++j) {
          for (var treeElement = treeElements[j]; treeElement;
               treeElement = treeElement.traverseNextTreeElement(true, null, true)) {
            if (deepFilter(treeElement))
              treeElement.expand();
          }
        }
      }
    }
    TestRunner.deprecatedRunAfterPendingDispatches(callback);
  }
};

/**
 * @param {!Function} callback
 */
ConsoleTestRunner.expandGettersInConsoleMessages = function(callback) {
  var messageViews = Console.ConsoleView.instance()._visibleViewMessages;
  var properties = [];
  var propertiesCount = 0;
  TestRunner.addSniffer(ObjectUI.ObjectPropertyTreeElement.prototype, '_updateExpandable', propertyExpandableUpdated);
  for (var i = 0; i < messageViews.length; ++i) {
    var element = messageViews[i].element();
    for (var node = element; node; node = node.traverseNextNode(element)) {
      if (node.classList && node.classList.contains('object-value-calculate-value-button')) {
        ++propertiesCount;
        node.click();
        properties.push(node.parentElement.parentElement);
      }
    }
  }

  function propertyExpandableUpdated() {
    --propertiesCount;
    if (propertiesCount === 0) {
      for (var i = 0; i < properties.length; ++i)
        properties[i].click();
      TestRunner.deprecatedRunAfterPendingDispatches(callback);
    } else {
      TestRunner.addSniffer(
          ObjectUI.ObjectPropertyTreeElement.prototype, '_updateExpandable', propertyExpandableUpdated);
    }
  }
};

/**
 * @param {!Function} callback
 */
ConsoleTestRunner.expandConsoleMessagesErrorParameters = function(callback) {
  var messageViews = Console.ConsoleView.instance()._visibleViewMessages;
  // Initiate round-trips to fetch necessary data for further rendering.
  for (var i = 0; i < messageViews.length; ++i)
    messageViews[i].element();
  TestRunner.deprecatedRunAfterPendingDispatches(callback);
};

/**
 * @param {!Function} callback
 */
ConsoleTestRunner.waitForRemoteObjectsConsoleMessages = function(callback) {
  var messages = Console.ConsoleView.instance()._visibleViewMessages;
  for (var i = 0; i < messages.length; ++i)
    messages[i].toMessageElement();
  TestRunner.deprecatedRunAfterPendingDispatches(callback);
};

/**
 * @return {!Promise}
 */
ConsoleTestRunner.waitUntilConsoleEditorLoaded = function() {
  var fulfill;
  var promise = new Promise(x => (fulfill = x));
  var editor = Console.ConsoleView.instance()._prompt._editor;
  if (editor)
    fulfill(editor);
  else
    TestRunner.addSniffer(Console.ConsolePrompt.prototype, '_editorSetForTest', _ => fulfill(editor));
  return promise;
};

/**
 * @param {!Function} callback
 */
ConsoleTestRunner.waitUntilMessageReceived = function(callback) {
  TestRunner.addSniffer(ConsoleModel.consoleModel, 'addMessage', callback, false);
};

/**
 * @return {!Promise}
 */
ConsoleTestRunner.waitUntilMessageReceivedPromise = function() {
  return new Promise(fulfill => ConsoleTestRunner.waitUntilMessageReceived(fulfill));
};

/**
 * @param {number} count
 * @param {!Function} callback
 */
ConsoleTestRunner.waitUntilNthMessageReceived = function(count, callback) {
  function override() {
    if (--count === 0)
      TestRunner.safeWrap(callback)();
    else
      TestRunner.addSniffer(ConsoleModel.consoleModel, 'addMessage', override, false);
  }
  TestRunner.addSniffer(ConsoleModel.consoleModel, 'addMessage', override, false);
};

/**
 * @param {number} count
 * @return {!Promise}
 */
ConsoleTestRunner.waitUntilNthMessageReceivedPromise = function(count) {
  return new Promise(fulfill => ConsoleTestRunner.waitUntilNthMessageReceived(count, fulfill));
};

/**
 * @param {string} namePrefix
 */
ConsoleTestRunner.changeExecutionContext = function(namePrefix) {
  var selector = Console.ConsoleView.instance()._consoleContextSelector;
  for (var executionContext of selector._items) {
    if (selector.titleFor(executionContext).startsWith(namePrefix)) {
      UI.context.setFlavor(SDK.ExecutionContext, executionContext);
      return;
    }
  }
  TestRunner.addResult('FAILED: context with prefix: ' + namePrefix + ' not found in the context list');
};

/**
 * @param {number} expectedCount
 * @param {!Function} callback
 */
ConsoleTestRunner.waitForConsoleMessages = function(expectedCount, callback) {
  var consoleView = Console.ConsoleView.instance();
  checkAndReturn();

  function checkAndReturn() {
    if (consoleView._visibleViewMessages.length === expectedCount) {
      TestRunner.addResult('Message count: ' + expectedCount);
      callback();
    } else {
      TestRunner.addSniffer(consoleView, '_messageAppendedForTests', checkAndReturn);
    }
  }
};

/**
 * @param {number} fromMessage
 * @param {number} fromTextOffset
 * @param {number} toMessage
 * @param {number} toTextOffset
 * @suppressGlobalPropertiesCheck
 */
ConsoleTestRunner.selectConsoleMessages = function(fromMessage, fromTextOffset, toMessage, toTextOffset) {
  var consoleView = Console.ConsoleView.instance();
  var from = selectionContainerAndOffset(consoleView.itemElement(fromMessage).element(), fromTextOffset);
  var to = selectionContainerAndOffset(consoleView.itemElement(toMessage).element(), toTextOffset);
  window.getSelection().setBaseAndExtent(from.container, from.offset, to.container, to.offset);

  /**
   * @param {!Node} container
   * @param {number} offset
   * @return {?{container: !Node, offset: number}}
   */
  function selectionContainerAndOffset(container, offset) {
    /** @type {?Node} */
    var node = container;
    if (offset === 0 && container.nodeType !== Node.TEXT_NODE) {
      container = /** @type {!Node} */ (container.traverseNextTextNode());
      node = container;
    }
    var charCount = 0;
    while ((node = node.traverseNextTextNode(container))) {
      var length = node.textContent.length;
      if (charCount + length >= offset)
        return {container: node, offset: offset - charCount};

      charCount += length;
    }
    return null;
  }
};
