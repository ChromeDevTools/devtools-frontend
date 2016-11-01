/*
 * Copyright 2015 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
/**
 * @interface
 */
WebInspector.LayerView = function() {};

WebInspector.LayerView.prototype = {
  /**
   * @param {?WebInspector.LayerView.Selection} selection
   */
  hoverObject: function(selection) {},

  /**
   * @param {?WebInspector.LayerView.Selection} selection
   */
  selectObject: function(selection) {},

  /**
   * @param {?WebInspector.LayerTreeBase} layerTree
   */
  setLayerTree: function(layerTree) {}
};

/**
 * @unrestricted
 */
WebInspector.LayerView.Selection = class {
  /**
   * @param {!WebInspector.LayerView.Selection.Type} type
   * @param {!WebInspector.Layer} layer
   */
  constructor(type, layer) {
    this._type = type;
    this._layer = layer;
  }

  /**
   * @param {?WebInspector.LayerView.Selection} a
   * @param {?WebInspector.LayerView.Selection} b
   * @return {boolean}
   */
  static isEqual(a, b) {
    return a && b ? a._isEqual(b) : a === b;
  }

  /**
   * @return {!WebInspector.LayerView.Selection.Type}
   */
  type() {
    return this._type;
  }

  /**
   * @return {!WebInspector.Layer}
   */
  layer() {
    return this._layer;
  }

  /**
   * @param {!WebInspector.LayerView.Selection} other
   * @return {boolean}
   */
  _isEqual(other) {
    return false;
  }
};

/**
 * @enum {symbol}
 */
WebInspector.LayerView.Selection.Type = {
  Layer: Symbol('Layer'),
  ScrollRect: Symbol('ScrollRect'),
  Snapshot: Symbol('Snapshot')
};


/**
 * @unrestricted
 */
WebInspector.LayerView.LayerSelection = class extends WebInspector.LayerView.Selection {
  /**
   * @param {!WebInspector.Layer} layer
   */
  constructor(layer) {
    console.assert(layer, 'LayerSelection with empty layer');
    super(WebInspector.LayerView.Selection.Type.Layer, layer);
  }

  /**
   * @override
   * @param {!WebInspector.LayerView.Selection} other
   * @return {boolean}
   */
  _isEqual(other) {
    return other._type === WebInspector.LayerView.Selection.Type.Layer && other.layer().id() === this.layer().id();
  }
};

/**
 * @unrestricted
 */
WebInspector.LayerView.ScrollRectSelection = class extends WebInspector.LayerView.Selection {
  /**
   * @param {!WebInspector.Layer} layer
   * @param {number} scrollRectIndex
   */
  constructor(layer, scrollRectIndex) {
    super(WebInspector.LayerView.Selection.Type.ScrollRect, layer);
    this.scrollRectIndex = scrollRectIndex;
  }

  /**
   * @override
   * @param {!WebInspector.LayerView.Selection} other
   * @return {boolean}
   */
  _isEqual(other) {
    return other._type === WebInspector.LayerView.Selection.Type.ScrollRect &&
        this.layer().id() === other.layer().id() && this.scrollRectIndex === other.scrollRectIndex;
  }
};

/**
 * @unrestricted
 */
WebInspector.LayerView.SnapshotSelection = class extends WebInspector.LayerView.Selection {
  /**
   * @param {!WebInspector.Layer} layer
   * @param {!WebInspector.SnapshotWithRect} snapshot
   */
  constructor(layer, snapshot) {
    super(WebInspector.LayerView.Selection.Type.Snapshot, layer);
    this._snapshot = snapshot;
  }

  /**
   * @override
   * @param {!WebInspector.LayerView.Selection} other
   * @return {boolean}
   */
  _isEqual(other) {
    return other._type === WebInspector.LayerView.Selection.Type.Snapshot && this.layer().id() === other.layer().id() &&
        this._snapshot === other._snapshot;
  }

  /**
   * @return {!WebInspector.SnapshotWithRect}
   */
  snapshot() {
    return this._snapshot;
  }
};

/**
 * @unrestricted
 */
WebInspector.LayerViewHost = class {
  constructor() {
    /** @type {!Array.<!WebInspector.LayerView>} */
    this._views = [];
    this._selectedObject = null;
    this._hoveredObject = null;
    this._showInternalLayersSetting = WebInspector.settings.createSetting('layersShowInternalLayers', false);
  }

  /**
   * @param {!WebInspector.LayerView} layerView
   */
  registerView(layerView) {
    this._views.push(layerView);
  }

  /**
   * @param {?WebInspector.LayerTreeBase} layerTree
   */
  setLayerTree(layerTree) {
    this._target = layerTree.target();
    var selectedLayer = this._selectedObject && this._selectedObject.layer();
    if (selectedLayer && (!layerTree || !layerTree.layerById(selectedLayer.id())))
      this.selectObject(null);
    var hoveredLayer = this._hoveredObject && this._hoveredObject.layer();
    if (hoveredLayer && (!layerTree || !layerTree.layerById(hoveredLayer.id())))
      this.hoverObject(null);
    for (var view of this._views)
      view.setLayerTree(layerTree);
  }

  /**
   * @param {?WebInspector.LayerView.Selection} selection
   */
  hoverObject(selection) {
    if (WebInspector.LayerView.Selection.isEqual(this._hoveredObject, selection))
      return;
    this._hoveredObject = selection;
    var layer = selection && selection.layer();
    this._toggleNodeHighlight(layer ? layer.nodeForSelfOrAncestor() : null);
    for (var view of this._views)
      view.hoverObject(selection);
  }

  /**
   * @param {?WebInspector.LayerView.Selection} selection
   */
  selectObject(selection) {
    if (WebInspector.LayerView.Selection.isEqual(this._selectedObject, selection))
      return;
    this._selectedObject = selection;
    for (var view of this._views)
      view.selectObject(selection);
  }

  /**
   * @return {?WebInspector.LayerView.Selection}
   */
  selection() {
    return this._selectedObject;
  }

  /**
   * @param {!WebInspector.ContextMenu} contextMenu
   * @param {?WebInspector.LayerView.Selection} selection
   */
  showContextMenu(contextMenu, selection) {
    contextMenu.appendCheckboxItem(
        WebInspector.UIString('Show internal layers'), this._toggleShowInternalLayers.bind(this),
        this._showInternalLayersSetting.get());
    var node = selection && selection.layer() && selection.layer().nodeForSelfOrAncestor();
    if (node)
      contextMenu.appendApplicableItems(node);
    contextMenu.show();
  }

  /**
   * @return {!WebInspector.Setting}
   */
  showInternalLayersSetting() {
    return this._showInternalLayersSetting;
  }

  _toggleShowInternalLayers() {
    this._showInternalLayersSetting.set(!this._showInternalLayersSetting.get());
  }

  /**
   * @param {?WebInspector.DOMNode} node
   */
  _toggleNodeHighlight(node) {
    if (node) {
      node.highlightForTwoSeconds();
      return;
    }
    WebInspector.DOMModel.hideDOMNodeHighlight();
  }
};
