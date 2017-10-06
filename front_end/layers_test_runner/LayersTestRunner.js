// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

LayersTestRunner.layerTreeModel = function() {
  if (!LayersTestRunner._layerTreeModel)
    LayersTestRunner._layerTreeModel = TestRunner.mainTarget.model(Layers.LayerTreeModel);

  return LayersTestRunner._layerTreeModel;
};

LayersTestRunner.labelForLayer = function(layer) {
  var node = layer.nodeForSelfOrAncestor();
  var label = (node ? Components.DOMPresentationUtils.fullQualifiedSelector(node, false) : '<invalid node id>');
  var height = layer.height();
  var width = layer.width();

  if (height <= 200 && width <= 200)
    label += ' ' + height + 'x' + width;

  if (typeof layer.__extraData !== 'undefined')
    label += ' (' + layer.__extraData + ')';

  return label;
};

LayersTestRunner.dumpLayerTree = function(prefix, root) {
  if (!prefix)
    prefix = '';

  if (!root) {
    root = LayersTestRunner.layerTreeModel().layerTree().contentRoot();

    if (!root) {
      TestRunner.addResult('No layer root, perhaps not in the composited mode! ');
      TestRunner.completeTest();
      return;
    }
  }

  TestRunner.addResult(prefix + LayersTestRunner.labelForLayer(root));
  root.children().forEach(LayersTestRunner.dumpLayerTree.bind(LayersTestRunner, prefix + '    '));
};

LayersTestRunner.dumpLayers3DView = function(prefix, root) {
  if (!prefix)
    prefix = '';

  if (!root)
    root = UI.panels.layers._layers3DView._rotatingContainerElement;

  if (root.__layer)
    TestRunner.addResult(prefix + LayersTestRunner.labelForLayer(root.__layer));

  for (var element = root.firstElementChild; element; element = element.nextSibling)
    LayersTestRunner.dumpLayers3DView(prefix + '    ', element);
};

LayersTestRunner.evaluateAndRunWhenTreeChanges = async function(expression, callback) {
  function eventHandler() {
    LayersTestRunner.layerTreeModel().removeEventListener(Layers.LayerTreeModel.Events.LayerTreeChanged, eventHandler);
    callback();
  }

  await TestRunner.evaluateInPageAnonymously(expression);
  LayersTestRunner.layerTreeModel().addEventListener(Layers.LayerTreeModel.Events.LayerTreeChanged, eventHandler);
};

LayersTestRunner.findLayerByNodeIdAttribute = function(nodeIdAttribute) {
  var result;

  function testLayer(layer) {
    var node = layer.node();

    if (!node)
      return false;

    if (!node || node.getAttribute('id') !== nodeIdAttribute)
      return false;

    result = layer;
    return true;
  }

  LayersTestRunner.layerTreeModel().layerTree().forEachLayer(testLayer);

  if (!result)
    TestRunner.addResult('ERROR: No layer for ' + nodeIdAttribute);

  return result;
};

LayersTestRunner.requestLayers = function(callback) {
  LayersTestRunner.layerTreeModel().addEventListener(Layers.LayerTreeModel.Events.LayerTreeChanged, onLayerTreeChanged);
  LayersTestRunner.layerTreeModel().enable();

  function onLayerTreeChanged() {
    LayersTestRunner.layerTreeModel().removeEventListener(
        Layers.LayerTreeModel.Events.LayerTreeChanged, onLayerTreeChanged);
    callback();
  }
};

LayersTestRunner.dumpModelScrollRects = function() {
  function dumpScrollRectsForLayer(layer) {
    if (layer._scrollRects.length > 0)
      TestRunner.addObject(layer._scrollRects);
  }

  TestRunner.addResult('Model elements dump');
  LayersTestRunner.layerTreeModel().layerTree().forEachLayer(dumpScrollRectsForLayer.bind(this));
};

LayersTestRunner.dumpModelStickyPositionConstraint = function() {
  function dumpModelStickyPositionConstraintForLayer(layer) {
    var stickyFormatters = {
      '_nearestLayerShiftingContainingBlock': 'formatAsTypeNameOrNull',
      '_nearestLayerShiftingStickyBox': 'formatAsTypeNameOrNull'
    };

    if (layer._stickyPositionConstraint)
      TestRunner.addObject(layer._stickyPositionConstraint, stickyFormatters);
  }

  TestRunner.addResult('Model elements dump');
  LayersTestRunner.layerTreeModel().layerTree().forEachLayer(dumpModelStickyPositionConstraintForLayer.bind(this));
};

LayersTestRunner.dispatchMouseEvent = function(eventType, button, element, offsetX, offsetY) {
  var totalOffset = element.totalOffset();

  var eventArguments = {
    bubbles: true,
    cancelable: true,
    view: window,
    screenX: totalOffset.left - element.scrollLeft + offsetX,
    screenY: totalOffset.top - element.scrollTop + offsetY,
    clientX: totalOffset.left + offsetX,
    clientY: totalOffset.top + offsetY,
    button: button
  };

  if (eventType === 'mouseout') {
    eventArguments.screenX = 0;
    eventArguments.screenY = 0;
    eventArguments.clientX = 0;
    eventArguments.clientY = 0;
  }

  element.dispatchEvent(new MouseEvent(eventType, eventArguments));
};
