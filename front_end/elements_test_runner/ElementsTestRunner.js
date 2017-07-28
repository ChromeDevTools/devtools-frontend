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
