// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

/**
 * @param {string} idValue
 * @param {!Function} callback
 */
ElementsTestRunner.selectNodeWithId = function(idValue, callback) {
  callback = TestRunner.safeWrap(callback);
  function onNodeFound(node) {
    ElementsTestRunner.selectNode(node).then(callback.bind(null, node));
  }
  ElementsTestRunner.nodeWithId(idValue, onNodeFound);
};

/**
 * @param {!Object} node
 * @return {!Promise.<undefined>}
 */
ElementsTestRunner.selectNode = function(node) {
  return Common.Revealer.revealPromise(node);
};

/**
 * @param {string} idValue
 * @param {!Function} callback
 */
ElementsTestRunner.nodeWithId = function(idValue, callback) {
  ElementsTestRunner.findNode(node => node.getAttribute('id') === idValue, callback);
};

/**
 * @param {function(!Element): boolean} matchFunction
 * @param {!Function} callback
 */
ElementsTestRunner.findNode = function(matchFunction, callback) {
  callback = TestRunner.safeWrap(callback);
  var result = null;
  var pendingRequests = 0;
  function processChildren(node) {
    try {
      if (result)
        return;

      var pseudoElementsMap = node.pseudoElements();
      var pseudoElements = pseudoElementsMap ? pseudoElementsMap.valuesArray() : [];
      var children = (node.children() || []).concat(node.shadowRoots()).concat(pseudoElements);
      if (node.templateContent())
        children.push(node.templateContent());
      else if (node.importedDocument())
        children.push(node.importedDocument());

      for (var i = 0; i < children.length; ++i) {
        var childNode = children[i];
        if (matchFunction(childNode)) {
          result = childNode;
          callback(result);
          return;
        }
        pendingRequests++;
        childNode.getChildNodes(processChildren.bind(null, childNode));
      }
    } finally {
      pendingRequests--;
    }

    if (!result && !pendingRequests)
      callback(null);
  }

  TestRunner.domModel.requestDocument(doc => {
    pendingRequests++;
    doc.getChildNodes(processChildren.bind(null, doc));
  });
};

/**
 * @param {!EventListeners.EventListenersView} eventListenersView
 * @param {function():void} callback
 * @param {boolean=} force
 */
ElementsTestRunner.expandAndDumpEventListeners = function(eventListenersView, callback, force) {
  function listenersArrived() {
    var listenerTypes = eventListenersView._treeOutline.rootElement().children();
    for (var i = 0; i < listenerTypes.length; ++i) {
      listenerTypes[i].expand();
      var listenerItems = listenerTypes[i].children();
      for (var j = 0; j < listenerItems.length; ++j)
        listenerItems[j].expand();
    }
    TestRunner.deprecatedRunAfterPendingDispatches(objectsExpanded);
  }

  function objectsExpanded() {
    var listenerTypes = eventListenersView._treeOutline.rootElement().children();
    for (var i = 0; i < listenerTypes.length; ++i) {
      if (!listenerTypes[i].children().length)
        continue;
      var eventType = listenerTypes[i]._title;
      TestRunner.addResult('');
      TestRunner.addResult('======== ' + eventType + ' ========');
      var listenerItems = listenerTypes[i].children();
      for (var j = 0; j < listenerItems.length; ++j) {
        TestRunner.addResult('== ' + listenerItems[j].eventListener().origin());
        TestRunner.dumpObjectPropertyTreeElement(listenerItems[j]);
      }
    }
    callback();
  }

  if (force) {
    listenersArrived();
  } else {
    TestRunner.addSniffer(
        EventListeners.EventListenersView.prototype, '_eventListenersArrivedForTest', listenersArrived);
  }
};

ElementsTestRunner.inlineStyleSection = function() {
  return UI.panels.elements._stylesWidget._sectionBlocks[0].sections[0];
};

ElementsTestRunner.computedStyleWidget = function() {
  return UI.panels.elements._computedStyleWidget;
};

ElementsTestRunner.dumpComputedStyle = function(doNotAutoExpand) {
  var computed = ElementsTestRunner.computedStyleWidget();
  var treeOutline = computed._propertiesOutline;
  var children = treeOutline.rootElement().children();

  for (var treeElement of children) {
    var property = treeElement[Elements.ComputedStyleWidget._propertySymbol];

    if (property.name === 'width' || property.name === 'height')
      continue;

    var dumpText = '';
    dumpText += treeElement.title.querySelector('.property-name').textContent;
    dumpText += ' ';
    dumpText += treeElement.title.querySelector('.property-value').textContent;
    TestRunner.addResult(dumpText);

    if (doNotAutoExpand && !treeElement.expanded)
      continue;

    for (var trace of treeElement.children()) {
      var title = trace.title;
      var dumpText = '';

      if (trace.title.classList.contains('property-trace-inactive'))
        dumpText += 'OVERLOADED ';

      dumpText += title.querySelector('.property-trace-value').textContent;
      dumpText += ' - ';
      dumpText += title.querySelector('.property-trace-selector').textContent;
      var link = title.querySelector('.trace-link');

      if (link)
        dumpText += ' ' + extractLinkText(link);

      TestRunner.addResult('    ' + dumpText);
    }
  }
};

ElementsTestRunner.findComputedPropertyWithName = function(name) {
  var computed = ElementsTestRunner.computedStyleWidget();
  var treeOutline = computed._propertiesOutline;
  var children = treeOutline.rootElement().children();

  for (var treeElement of children) {
    var property = treeElement[Elements.ComputedStyleWidget._propertySymbol];

    if (property.name === name)
      return treeElement;
  }

  return null;
};

ElementsTestRunner.firstMatchedStyleSection = function() {
  return UI.panels.elements._stylesWidget._sectionBlocks[0].sections[1];
};

ElementsTestRunner.firstMediaTextElementInSection = function(section) {
  return section.element.querySelector('.media-text');
};

ElementsTestRunner.querySelector = async function(selector, callback) {
  var doc = await TestRunner.domModel.requestDocumentPromise();
  var nodeId = await TestRunner.domModel.querySelector(doc.id, selector);
  callback(TestRunner.domModel.nodeForId(nodeId));
};

ElementsTestRunner.shadowRootByHostId = function(idValue, callback) {
  function shadowRootMatches(node) {
    return node.isShadowRoot() && node.parentNode.getAttribute('id') === idValue;
  }

  ElementsTestRunner.findNode(shadowRootMatches, callback);
};

ElementsTestRunner.nodeWithClass = function(classValue, callback) {
  function nodeClassMatches(node) {
    var classAttr = node.getAttribute('class');
    return classAttr && classAttr.indexOf(classValue) > -1;
  }

  ElementsTestRunner.findNode(nodeClassMatches, callback);
};

ElementsTestRunner.expandedNodeWithId = function(idValue) {
  var result;
  ElementsTestRunner.nodeWithId(idValue, node => result = node);
  return result;
};

function waitForStylesRebuild(matchFunction, callback, requireRebuild) {
  (function sniff(node, rebuild) {
    if ((rebuild || !requireRebuild) && node && matchFunction(node)) {
      callback();
      return;
    }

    TestRunner.addSniffer(Elements.StylesSidebarPane.prototype, '_nodeStylesUpdatedForTest', sniff);
  })(null);
}

ElementsTestRunner.waitForStyles = function(idValue, callback, requireRebuild) {
  callback = TestRunner.safeWrap(callback);

  function nodeWithId(node) {
    return node.getAttribute('id') === idValue;
  }

  waitForStylesRebuild(nodeWithId, callback, requireRebuild);
};

ElementsTestRunner.waitForStylesForClass = function(classValue, callback, requireRebuild) {
  callback = TestRunner.safeWrap(callback);

  function nodeWithClass(node) {
    var classAttr = node.getAttribute('class');
    return classAttr && classAttr.indexOf(classValue) > -1;
  }

  waitForStylesRebuild(nodeWithClass, callback, requireRebuild);
};

ElementsTestRunner.waitForSelectorCommitted = function(callback) {
  TestRunner.addSniffer(Elements.StylePropertiesSection.prototype, '_editingSelectorCommittedForTest', callback);
};

ElementsTestRunner.waitForMediaTextCommitted = function(callback) {
  TestRunner.addSniffer(Elements.StylePropertiesSection.prototype, '_editingMediaTextCommittedForTest', callback);
};

ElementsTestRunner.waitForStyleApplied = function(callback) {
  TestRunner.addSniffer(Elements.StylePropertyTreeElement.prototype, 'styleTextAppliedForTest', callback);
};

ElementsTestRunner.selectNodeAndWaitForStyles = function(idValue, callback) {
  callback = TestRunner.safeWrap(callback);
  var targetNode;
  ElementsTestRunner.waitForStyles(idValue, stylesUpdated, true);
  ElementsTestRunner.selectNodeWithId(idValue, nodeSelected);

  function nodeSelected(node) {
    targetNode = node;
  }

  function stylesUpdated() {
    callback(targetNode);
  }
};

ElementsTestRunner.selectPseudoElementAndWaitForStyles = function(parentId, pseudoType, callback) {
  callback = TestRunner.safeWrap(callback);
  var targetNode;
  waitForStylesRebuild(isPseudoElement, stylesUpdated, true);
  ElementsTestRunner.findNode(isPseudoElement, nodeFound);

  function nodeFound(node) {
    targetNode = node;
    Common.Revealer.reveal(node);
  }

  function stylesUpdated() {
    callback(targetNode);
  }

  function isPseudoElement(node) {
    return node.parentNode && node.parentNode.getAttribute('id') === parentId && node.pseudoType() === pseudoType;
  }
};

ElementsTestRunner.selectNodeAndWaitForStylesWithComputed = function(idValue, callback) {
  callback = TestRunner.safeWrap(callback);
  ElementsTestRunner.selectNodeAndWaitForStyles(idValue, onSidebarRendered);

  function onSidebarRendered(node) {
    ElementsTestRunner.computedStyleWidget().doUpdate().then(callback.bind(null, node));
  }
};

ElementsTestRunner.firstElementsTreeOutline = function() {
  return UI.panels.elements._treeOutlines[0];
};

ElementsTestRunner.filterMatchedStyles = function(text) {
  var regex = (text ? new RegExp(text, 'i') : null);
  TestRunner.addResult('Filtering styles by: ' + text);
  UI.panels.elements._stylesWidget._onFilterChanged(regex);
};

ElementsTestRunner.dumpRenderedMatchedStyles = function() {
  var sectionBlocks = UI.panels.elements._stylesWidget._sectionBlocks;

  for (var block of sectionBlocks) {
    for (var section of block.sections) {
      if (section.element.classList.contains('hidden'))
        continue;

      dumpRenderedSection(section);
    }
  }

  function dumpRenderedSection(section) {
    TestRunner.addResult(section._selectorElement.textContent + ' {');
    var rootElement = section.propertiesTreeOutline.rootElement();

    for (var i = 0; i < rootElement.childCount(); ++i)
      dumpRenderedProperty(rootElement.childAt(i));

    TestRunner.addResult('}');
  }

  function dumpRenderedProperty(property) {
    var text = new Array(4).join(' ');
    text += property.nameElement.textContent;
    text += ':';

    if (property.isExpandable())
      text += (property.expanded ? 'v' : '>');
    else
      text += ' ';

    text += property.valueElement.textContent;

    if (property.listItemElement.classList.contains('filter-match'))
      text = 'F' + text.substring(1);

    TestRunner.addResult(text);

    if (!property.expanded)
      return;

    var indent = new Array(8).join(' ');

    for (var i = 0; i < property.childCount(); ++i) {
      var childProperty = property.childAt(i);
      var text = indent;
      text += String.sprintf('%s: %s', childProperty.nameElement.textContent, childProperty.valueElement.textContent);

      if (childProperty.listItemElement.classList.contains('filter-match'))
        text = 'F' + text.substring(1);

      TestRunner.addResult(text);
    }
  }
};

ElementsTestRunner.dumpSelectedElementStyles = function(
    excludeComputed, excludeMatched, omitLonghands, includeSelectorGroupMarks) {
  var sectionBlocks = UI.panels.elements._stylesWidget._sectionBlocks;

  if (!excludeComputed)
    ElementsTestRunner.dumpComputedStyle();

  for (var block of sectionBlocks) {
    for (var section of block.sections) {
      if (section.style().parentRule && excludeMatched)
        continue;

      if (section.element.previousSibling && section.element.previousSibling.className === 'sidebar-separator') {
        var nodeDescription = '';

        if (section.element.previousSibling.firstElementChild)
          nodeDescription = section.element.previousSibling.firstElementChild.shadowRoot.lastChild.textContent;

        TestRunner.addResult('======== ' + section.element.previousSibling.textContent + nodeDescription + ' ========');
      }

      printStyleSection(section, omitLonghands, includeSelectorGroupMarks);
    }
  }
};

function printStyleSection(section, omitLonghands, includeSelectorGroupMarks) {
  if (!section)
    return;

  TestRunner.addResult(
      '[expanded] ' + ((section.propertiesTreeOutline.element.classList.contains('no-affect') ? '[no-affect] ' : '')));
  var medias = section._titleElement.querySelectorAll('.media-list .media');

  for (var i = 0; i < medias.length; ++i) {
    var media = medias[i];
    TestRunner.addResult(media.textContent);
  }

  var selector =
      section._titleElement.querySelector('.selector') || section._titleElement.querySelector('.keyframe-key');
  var selectorText = (includeSelectorGroupMarks ? buildMarkedSelectors(selector) : selector.textContent);
  selectorText += selector.nextSibling.textContent;
  var anchor = section._titleElement.querySelector('.styles-section-subtitle');

  if (anchor) {
    var anchorText = extractLinkText(anchor);
    selectorText += String.sprintf(' (%s)', anchorText);
  }

  TestRunner.addResult(selectorText);
  ElementsTestRunner.dumpStyleTreeOutline(section.propertiesTreeOutline, (omitLonghands ? 1 : 2));
  TestRunner.addResult('');
}

function extractLinkText(element) {
  var anchor = element.querySelector('.devtools-link');

  if (!anchor)
    return element.textContent;

  var anchorText = anchor.textContent;
  var info = Components.Linkifier._linkInfo(anchor);
  var uiLocation = info && info.uiLocation;
  var anchorTarget =
      (uiLocation ?
           uiLocation.uiSourceCode.name() + ':' + (uiLocation.lineNumber + 1) + ':' + (uiLocation.columnNumber + 1) :
           '');
  return anchorText + ' -> ' + anchorTarget;
}

function buildMarkedSelectors(element) {
  var result = '';

  for (var node = element.firstChild; node; node = node.nextSibling) {
    if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('selector-matches'))
      result += '[$' + node.textContent + '$]';
    else
      result += node.textContent;
  }

  return result;
}

ElementsTestRunner.toggleStyleProperty = function(propertyName, checked) {
  var treeItem = ElementsTestRunner.getElementStylePropertyTreeItem(propertyName);

  treeItem._toggleEnabled({
    target: {checked: checked},

    consume: function() {}
  });
};

ElementsTestRunner.toggleMatchedStyleProperty = function(propertyName, checked) {
  var treeItem = ElementsTestRunner.getMatchedStylePropertyTreeItem(propertyName);

  treeItem._toggleEnabled({
    target: {checked: checked},

    consume: function() {}
  });
};

ElementsTestRunner.eventListenersWidget = function() {
  UI.viewManager.showView('elements.eventListeners');
  return self.runtime.sharedInstance(Elements.EventListenersWidget);
};

ElementsTestRunner.showEventListenersWidget = function() {
  return UI.viewManager.showView('elements.eventListeners');
};

ElementsTestRunner.expandAndDumpSelectedElementEventListeners = function(callback, force) {
  ElementsTestRunner.expandAndDumpEventListeners(
      ElementsTestRunner.eventListenersWidget()._eventListenersView, callback, force);
};

ElementsTestRunner.removeFirstEventListener = function() {
  var treeOutline = ElementsTestRunner.eventListenersWidget()._eventListenersView._treeOutline;
  var listenerTypes = treeOutline.rootElement().children();

  for (var i = 0; i < listenerTypes.length; i++) {
    var listeners = listenerTypes[i].children();

    if (listeners.length && !listenerTypes[i].hidden) {
      listeners[0].eventListener().remove();
      listeners[0]._removeListenerBar();
      break;
    }
  }
};

ElementsTestRunner.dumpObjectPropertySectionDeep = function(section) {
  function domNodeToString(node) {
    if (node)
      return '\'' + node.textContent + '\'';
    else
      return 'null';
  }

  function dumpTreeElementRecursively(treeElement, prefix) {
    if ('nameElement' in treeElement) {
      TestRunner.addResult(
          prefix + domNodeToString(treeElement.nameElement) + ' => ' + domNodeToString(treeElement.valueElement));
    } else {
      TestRunner.addResult(prefix + treeElement.title);
    }

    for (var i = 0; i < treeElement.childCount(); i++)
      dumpTreeElementRecursively(treeElement.childAt(i), prefix + '    ');
  }

  var childNodes = section.propertiesTreeOutline.rootElement().children();

  for (var i = 0; i < childNodes.length; i++)
    dumpTreeElementRecursively(childNodes[i], '');

};

ElementsTestRunner.getElementStylePropertyTreeItem = function(propertyName) {
  return ElementsTestRunner.getFirstPropertyTreeItemForSection(ElementsTestRunner.inlineStyleSection(), propertyName);
};

ElementsTestRunner.getMatchedStylePropertyTreeItem = function(propertyName) {
  var sectionBlocks = UI.panels.elements._stylesWidget._sectionBlocks;

  for (var block of sectionBlocks) {
    for (var section of block.sections) {
      var treeItem = ElementsTestRunner.getFirstPropertyTreeItemForSection(section, propertyName);

      if (treeItem)
        return treeItem;
    }
  }

  return null;
};

ElementsTestRunner.getFirstPropertyTreeItemForSection = function(section, propertyName) {
  var outline = section.propertiesTreeOutline.rootElement();

  for (var i = 0; i < outline.childCount(); ++i) {
    var treeItem = outline.childAt(i);

    if (treeItem.name === propertyName)
      return treeItem;
  }

  return null;
};

ElementsTestRunner.dumpStyleTreeOutline = function(treeItem, depth) {
  var children = treeItem.rootElement().children();

  for (var i = 0; i < children.length; ++i)
    ElementsTestRunner.dumpStyleTreeItem(children[i], '', depth || 2);
};

ElementsTestRunner.dumpStyleTreeItem = function(treeItem, prefix, depth) {
  if (treeItem.listItemElement.textContent.indexOf(' width:') !== -1 ||
      treeItem.listItemElement.textContent.indexOf(' height:') !== -1)
    return;

  if (treeItem.listItemElement.classList.contains('inherited'))
    return;

  var typePrefix = '';

  if (treeItem.listItemElement.classList.contains('overloaded') ||
      treeItem.listItemElement.classList.contains('inactive') ||
      treeItem.listItemElement.classList.contains('not-parsed-ok'))
    typePrefix += '/-- overloaded --/ ';

  if (treeItem.listItemElement.classList.contains('disabled'))
    typePrefix += '/-- disabled --/ ';

  var textContent = treeItem.listItemElement.textContent;
  TestRunner.addResult(prefix + typePrefix + textContent);

  if (--depth) {
    treeItem.expand();
    var children = treeItem.children();

    for (var i = 0; children && i < children.length; ++i)
      ElementsTestRunner.dumpStyleTreeItem(children[i], prefix + '    ', depth);
  }
};

ElementsTestRunner.dumpElementsTree = function(rootNode, depth, resultsArray) {
  function beautify(element) {
    return element.innerText.replace(/\u200b/g, '').replace(/\n/g, '\\n').trim();
  }

  function dumpMap(name, map) {
    var result = [];

    for (var id of map.keys())
      result.push(id + '=' + map.get(id));

    if (!result.length)
      return '';

    return name + ':[' + result.join(',') + ']';
  }

  function markersDataDump(treeItem) {
    if (treeItem._elementCloseTag)
      return '';

    var markers = '';
    var node = treeItem._node;

    if (node) {
      markers += dumpMap('markers', node._markers);
      var dump = (node._subtreeMarkerCount ? 'subtreeMarkerCount:' + node._subtreeMarkerCount : '');

      if (dump) {
        if (markers)
          markers += ', ';

        markers += dump;
      }

      if (markers)
        markers = ' [' + markers + ']';
    }

    return markers;
  }

  function print(treeItem, prefix, depth) {
    if (!treeItem.root) {
      var expander;

      if (treeItem.isExpandable()) {
        if (treeItem.expanded)
          expander = '- ';
        else
          expander = '+ ';
      } else {
        expander = '  ';
      }

      var markers = markersDataDump(treeItem);
      var value = prefix + expander + beautify(treeItem.listItemElement) + markers;

      if (treeItem.shadowHostToolbar) {
        value = prefix + expander + 'shadow-root ';

        for (var i = 0; i < treeItem.shadowHostToolbar.children.length; ++i) {
          var button = treeItem.shadowHostToolbar.children[i];
          var toggled = button.disabled;
          var name = ((toggled ? '<' : '')) + button.textContent + ((toggled ? '>' : ''));
          value += name + ' ';
        }
      }

      if (resultsArray)
        resultsArray.push(value);
      else
        TestRunner.addResult(value);
    }

    if (!treeItem.expanded)
      return;

    var children = treeItem.children();
    var newPrefix = (treeItem.root ? '' : prefix + '    ');

    for (var i = 0; depth && children && i < children.length; ++i) {
      if (!children[i]._elementCloseTag)
        print(children[i], newPrefix, depth - 1);
      else
        print(children[i], prefix, depth);
    }
  }

  var treeOutline = ElementsTestRunner.firstElementsTreeOutline();
  treeOutline.runPendingUpdates();
  print((rootNode ? treeOutline.findTreeElement(rootNode) : treeOutline.rootElement()), '', depth || 10000);
};

ElementsTestRunner.dumpDOMUpdateHighlights = function(rootNode, callback, depth) {
  var hasHighlights = false;
  TestRunner.addSniffer(Elements.ElementsTreeOutline.prototype, '_updateModifiedNodes', didUpdate);

  function didUpdate() {
    var treeOutline = ElementsTestRunner.firstElementsTreeOutline();
    print((rootNode ? treeOutline.findTreeElement(rootNode) : treeOutline.rootElement()), '', depth || 10000);

    if (!hasHighlights)
      TestRunner.addResult('<No highlights>');

    if (callback)
      callback();
  }

  function print(treeItem, prefix, depth) {
    if (!treeItem.root) {
      var elementXPath = Components.DOMPresentationUtils.xPath(treeItem.node(), true);
      var highlightedElements = treeItem.listItemElement.querySelectorAll('.dom-update-highlight');

      for (var i = 0; i < highlightedElements.length; ++i) {
        var element = highlightedElements[i];
        var classList = element.classList;
        var xpath = elementXPath;

        if (classList.contains('webkit-html-attribute-name')) {
          xpath += '/@' + element.textContent + ' (empty)';
        } else if (classList.contains('webkit-html-attribute-value')) {
          name = element.parentElement.querySelector('.webkit-html-attribute-name').textContent;
          xpath += '/@' + name + ' ' + element.textContent;
        } else if (classList.contains('webkit-html-text-node')) {
          xpath += '/text() "' + element.textContent + '"';
        }

        TestRunner.addResult(prefix + xpath);
        hasHighlights = true;
      }
    }

    if (!treeItem.expanded)
      return;

    var children = treeItem.children();
    var newPrefix = (treeItem.root ? '' : prefix + '    ');

    for (var i = 0; depth && children && i < children.length; ++i) {
      if (!children[i]._elementCloseTag)
        print(children[i], newPrefix, depth - 1);
    }
  }
};

ElementsTestRunner.expandElementsTree = function(callback) {
  var expandedSomething = false;
  callback = TestRunner.safeWrap(callback);

  function expand(treeItem) {
    var children = treeItem.children();

    for (var i = 0; children && i < children.length; ++i) {
      var child = children[i];

      if (child.isExpandable() && !child.expanded) {
        child.expand();
        expandedSomething = true;
      }

      expand(child);
    }
  }

  function onAllNodesAvailable() {
    ElementsTestRunner.firstElementsTreeOutline().runPendingUpdates();
    expand(ElementsTestRunner.firstElementsTreeOutline().rootElement());
    setTimeout(callback.bind(null, expandedSomething));
  }

  ElementsTestRunner.findNode(function() {
    return false;
  }, onAllNodesAvailable);
};

ElementsTestRunner.dumpDOMAgentTree = function(node) {
  if (!TestRunner.domModel._document)
    return;

  function dump(node, prefix) {
    TestRunner.addResult(prefix + node.nodeName());
    prefix = prefix + '    ';

    if (node.templateContent())
      dump(node.templateContent(), prefix);

    if (node.importedDocument())
      dump(node.importedDocument(), prefix);

    var shadowRoots = node.shadowRoots();

    for (var i = 0; i < shadowRoots.length; ++i)
      dump(shadowRoots[i], prefix);

    var children = node.children();

    for (var i = 0; children && i < children.length; ++i)
      dump(children[i], prefix);
  }

  dump(node, '');
};

ElementsTestRunner.rangeText = function(range) {
  if (!range)
    return '[undefined-undefined]';

  return '[' + range.startLine + ':' + range.startColumn + '-' + range.endLine + ':' + range.endColumn + ']';
};

ElementsTestRunner.generateUndoTest = function(testBody) {
  function result(next) {
    var testNode = ElementsTestRunner.expandedNodeWithId(/function\s([^(]*)/.exec(testBody)[1]);
    TestRunner.addResult('Initial:');
    ElementsTestRunner.dumpElementsTree(testNode);
    testBody(undo);

    function undo() {
      TestRunner.addResult('Post-action:');
      ElementsTestRunner.dumpElementsTree(testNode);
      ElementsTestRunner.expandElementsTree(expandedCallback);

      function expandedCallback(expandedSomething) {
        if (expandedSomething) {
          TestRunner.addResult('== Expanded: ==');
          ElementsTestRunner.dumpElementsTree(testNode);
        }

        TestRunner.domModel.undo().then(redo);
      }
    }

    function redo() {
      TestRunner.addResult('Post-undo (initial):');
      ElementsTestRunner.dumpElementsTree(testNode);
      ElementsTestRunner.expandElementsTree(expandedCallback);

      function expandedCallback(expandedSomething) {
        if (expandedSomething) {
          TestRunner.addResult('== Expanded: ==');
          ElementsTestRunner.dumpElementsTree(testNode);
        }

        TestRunner.domModel.redo().then(done);
      }
    }

    function done() {
      TestRunner.addResult('Post-redo (action):');
      ElementsTestRunner.dumpElementsTree(testNode);
      ElementsTestRunner.expandElementsTree(expandedCallback);

      function expandedCallback(expandedSomething) {
        if (expandedSomething) {
          TestRunner.addResult('== Expanded: ==');
          ElementsTestRunner.dumpElementsTree(testNode);
        }

        next();
      }
    }
  }

  result.toString = function() {
    return testBody.toString();
  };

  return result;
};

const indent = '    ';

ElementsTestRunner.dumpRulesArray = function(rules, currentIndent) {
  if (!rules)
    return;

  currentIndent = currentIndent || '';

  for (var i = 0; i < rules.length; ++i)
    ElementsTestRunner.dumpRule(rules[i], currentIndent);
};

ElementsTestRunner.dumpRuleMatchesArray = function(matches, currentIndent) {
  if (!matches)
    return;

  currentIndent = currentIndent || '';

  for (var i = 0; i < matches.length; ++i)
    ElementsTestRunner.dumpRule(matches[i].rule, currentIndent);
};

ElementsTestRunner.dumpRule = function(rule, currentIndent) {
  function selectorRange() {
    var selectors = rule.selectorList.selectors;

    if (!selectors || !selectors[0].range)
      return '';

    var ranges = [];

    for (var i = 0; i < selectors.length; ++i) {
      var range = selectors[i].range;
      ranges.push(range.startLine + ':' + range.startColumn + '-' + range.endLine + ':' + range.endColumn);
    }

    return ', ' + ranges.join('; ');
  }

  currentIndent = currentIndent || '';

  if (!rule.type || rule.type === 'style') {
    TestRunner.addResult(currentIndent + rule.selectorList.text + ': [' + rule.origin + selectorRange() + '] {');
    ElementsTestRunner.dumpStyle(rule.style, currentIndent + indent);
    TestRunner.addResult(currentIndent + '}');
    return;
  }

  if (rule.type === 'media') {
    TestRunner.addResult(currentIndent + '@media ' + rule.mediaText + ' {');
    ElementsTestRunner.dumpRulesArray(rule.childRules, currentIndent + indent);
    TestRunner.addResult(currentIndent + '}');
    return;
  }

  if (rule.type === 'import') {
    TestRunner.addResult(
        currentIndent + '@import: header=' + ElementsTestRunner.rangeText(rule.headerRange) +
        ', body=' + ElementsTestRunner.rangeText(rule.bodyRange));

    return;
  }

  if (rule.type === 'page' || rule.type === 'font-face') {
    if (rule.type === 'page') {
      TestRunner.addResult(currentIndent + rule.selectorList.text + ' {');
    } else {
      TestRunner.addResult(
          currentIndent + '@' + rule.type + ' ' + ((rule.selectorList.text ? rule.selectorList.text + ' ' : '')) + '{');
    }

    ElementsTestRunner.dumpStyle(rule.style, currentIndent + indent);
    TestRunner.addResult(currentIndent + '}');
    return;
  }

  if (rule.type === 'charset') {
    TestRunner.addResult('@charset');
    return;
  }

  TestRunner.addResult(
      currentIndent + '[UNKNOWN RULE]: header=' + ElementsTestRunner.rangeText(rule.headerRange) +
      ', body=' + ElementsTestRunner.rangeText(rule.bodyRange));
};

ElementsTestRunner.dumpStyle = function(style, currentIndent) {
  currentIndent = currentIndent || '';

  if (!style) {
    TestRunner.addResult(currentIndent + '[NO STYLE]');
    return;
  }

  for (var i = 0; i < style.cssProperties.length; ++i) {
    var property = style.cssProperties[i];

    if (!property.disabled) {
      TestRunner.addResult(
          currentIndent + '[\'' + property.name + '\':\'' + property.value + '\'' +
          ((property.important ? ' is-important' : '')) + (('parsedOk' in property ? ' non-parsed' : '')) + '] @' +
          ElementsTestRunner.rangeText(property.range) + ' ');
    } else {
      TestRunner.addResult(currentIndent + '[text=\'' + property.text + '\'] disabled');
    }
  }
};

ElementsTestRunner.dumpCSSStyleDeclaration = function(style, currentIndent) {
  currentIndent = currentIndent || '';

  if (!style) {
    TestRunner.addResult(currentIndent + '[NO STYLE]');
    return;
  }

  var properties = style.allProperties();

  for (var i = 0; i < properties.length; ++i) {
    var property = properties[i];

    if (!property.disabled) {
      TestRunner.addResult(
          currentIndent + '[\'' + property.name + '\':\'' + property.value + '\'' +
          ((property.important ? ' is-important' : '')) + ((!property['parsedOk'] ? ' non-parsed' : '')) + '] @' +
          ElementsTestRunner.rangeText(property.range) + ' ');
    } else {
      TestRunner.addResult(currentIndent + '[text=\'' + property.text + '\'] disabled');
    }
  }
};

ElementsTestRunner.dumpBreadcrumb = function(message) {
  if (message)
    TestRunner.addResult(message + ':');

  var result = [];
  var crumbs = UI.panels.elements._breadcrumbs.crumbsElement;
  var crumb = crumbs.lastChild;

  while (crumb) {
    result.unshift(crumb.textContent);
    crumb = crumb.previousSibling;
  }

  TestRunner.addResult(result.join(' > '));
};

ElementsTestRunner.matchingSelectors = function(matchedStyles, rule) {
  var selectors = [];
  var matchingSelectors = matchedStyles.matchingSelectors(rule);

  for (var i = 0; i < matchingSelectors.length; ++i)
    selectors.push(rule.selectors[matchingSelectors[i]].text);

  return '[' + selectors.join(', ') + ']';
};

ElementsTestRunner.addNewRuleInStyleSheet = function(styleSheetHeader, selector, callback) {
  TestRunner.addSniffer(
      Elements.StylesSidebarPane.prototype, '_addBlankSection', onBlankSection.bind(null, selector, callback));
  UI.panels.elements._stylesWidget._createNewRuleInStyleSheet(styleSheetHeader);
};

ElementsTestRunner.addNewRule = function(selector, callback) {
  UI.panels.elements._stylesWidget.contentElement.querySelector('.styles-pane-toolbar')
      .shadowRoot.querySelector('.largeicon-add')
      .click();
  TestRunner.addSniffer(
      Elements.StylesSidebarPane.prototype, '_addBlankSection', onBlankSection.bind(null, selector, callback));
};

function onBlankSection(selector, callback) {
  var section = ElementsTestRunner.firstMatchedStyleSection();

  if (typeof selector === 'string')
    section._selectorElement.textContent = selector;

  section._selectorElement.dispatchEvent(TestRunner.createKeyEvent('Enter'));
  ElementsTestRunner.waitForSelectorCommitted(callback.bind(null, section));
}

ElementsTestRunner.dumpInspectorHighlightJSON = function(idValue, callback) {
  ElementsTestRunner.nodeWithId(idValue, nodeResolved);

  async function nodeResolved(node) {
    var result = await TestRunner.OverlayAgent.getHighlightObjectForTest(node.id);
    TestRunner.addResult(idValue + JSON.stringify(result, null, 2));
    callback();
  }
};

ElementsTestRunner.waitForAnimationAdded = function(callback) {
  TestRunner.addSniffer(Animation.AnimationTimeline.prototype, '_addAnimationGroup', callback);
};

ElementsTestRunner.dumpAnimationTimeline = function(timeline) {
  for (var ui of timeline._uiAnimations) {
    TestRunner.addResult(ui.animation().type());
    TestRunner.addResult(ui._nameElement.innerHTML);
    TestRunner.addResult(ui._svg.innerHTML);
  }
};
