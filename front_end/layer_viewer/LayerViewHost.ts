// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Text in Layer View Host of the Layers panel
  */
  showInternalLayers: 'Show internal layers',
};
const str_ = i18n.i18n.registerUIStrings('layer_viewer/LayerViewHost.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);


export abstract class LayerView {
  abstract hoverObject(selection: Selection|null): void;
  abstract selectObject(selection: Selection|null): void;
  abstract setLayerTree(layerTree: SDK.LayerTreeBase.LayerTreeBase|null): void;
}

export class Selection {
  _type: Type;
  _layer: SDK.LayerTreeBase.Layer;

  constructor(type: Type, layer: SDK.LayerTreeBase.Layer) {
    this._type = type;
    this._layer = layer;
  }

  static isEqual(a: Selection|null, b: Selection|null): boolean {
    return a && b ? a._isEqual(b) : a === b;
  }

  type(): Type {
    return this._type;
  }

  layer(): SDK.LayerTreeBase.Layer {
    return this._layer;
  }

  _isEqual(_other: Selection): boolean {
    return false;
  }
}

export const enum Type {
  Layer = 'Layer',
  ScrollRect = 'ScrollRect',
  Snapshot = 'Snapshot',
}


export class LayerSelection extends Selection {
  constructor(layer: SDK.LayerTreeBase.Layer) {
    console.assert(Boolean(layer), 'LayerSelection with empty layer');
    super(Type.Layer, layer);
  }

  _isEqual(other: Selection): boolean {
    return other._type === Type.Layer && other.layer().id() === this.layer().id();
  }
}

export class ScrollRectSelection extends Selection {
  scrollRectIndex: number;
  constructor(layer: SDK.LayerTreeBase.Layer, scrollRectIndex: number) {
    super(Type.ScrollRect, layer);
    this.scrollRectIndex = scrollRectIndex;
  }

  _isEqual(other: Selection): boolean {
    return other._type === Type.ScrollRect && this.layer().id() === other.layer().id() &&
        this.scrollRectIndex === (other as ScrollRectSelection).scrollRectIndex;
  }
}

export class SnapshotSelection extends Selection {
  _snapshot: SDK.PaintProfiler.SnapshotWithRect;
  constructor(layer: SDK.LayerTreeBase.Layer, snapshot: SDK.PaintProfiler.SnapshotWithRect) {
    super(Type.Snapshot, layer);
    this._snapshot = snapshot;
  }

  _isEqual(other: Selection): boolean {
    return other._type === Type.Snapshot && this.layer().id() === other.layer().id() &&
        this._snapshot === (other as SnapshotSelection)._snapshot;
  }

  snapshot(): SDK.PaintProfiler.SnapshotWithRect {
    return this._snapshot;
  }
}

export class LayerViewHost {
  _views: LayerView[];
  _selectedObject: Selection|null;
  _hoveredObject: Selection|null;
  _showInternalLayersSetting: Common.Settings.Setting<boolean>;
  _snapshotLayers: Map<SDK.LayerTreeBase.Layer, SnapshotSelection>;
  _target?: SDK.SDKModel.Target|null;
  constructor() {
    this._views = [];
    this._selectedObject = null;
    this._hoveredObject = null;
    this._showInternalLayersSetting =
        Common.Settings.Settings.instance().createSetting('layersShowInternalLayers', false);
    this._snapshotLayers = new Map();
  }

  registerView(layerView: LayerView): void {
    this._views.push(layerView);
  }

  setLayerSnapshotMap(snapshotLayers: Map<SDK.LayerTreeBase.Layer, SnapshotSelection>): void {
    this._snapshotLayers = snapshotLayers;
  }

  getLayerSnapshotMap(): Map<SDK.LayerTreeBase.Layer, SnapshotSelection> {
    return this._snapshotLayers;
  }

  setLayerTree(layerTree: SDK.LayerTreeBase.LayerTreeBase|null): void {
    if (!layerTree) {
      return;
    }
    this._target = layerTree.target();
    const selectedLayer = this._selectedObject && this._selectedObject.layer();
    if (selectedLayer && (!layerTree || !layerTree.layerById(selectedLayer.id()))) {
      this.selectObject(null);
    }
    const hoveredLayer = this._hoveredObject && this._hoveredObject.layer();
    if (hoveredLayer && (!layerTree || !layerTree.layerById(hoveredLayer.id()))) {
      this.hoverObject(null);
    }
    for (const view of this._views) {
      view.setLayerTree(layerTree);
    }
  }

  hoverObject(selection: Selection|null): void {
    if (Selection.isEqual(this._hoveredObject, selection)) {
      return;
    }
    this._hoveredObject = selection;
    const layer = selection && selection.layer();
    this._toggleNodeHighlight(layer ? layer.nodeForSelfOrAncestor() : null);
    for (const view of this._views) {
      view.hoverObject(selection);
    }
  }

  selectObject(selection: Selection|null): void {
    if (Selection.isEqual(this._selectedObject, selection)) {
      return;
    }
    this._selectedObject = selection;
    for (const view of this._views) {
      view.selectObject(selection);
    }
  }

  selection(): Selection|null {
    return this._selectedObject;
  }

  showContextMenu(contextMenu: UI.ContextMenu.ContextMenu, selection: Selection|null): void {
    contextMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.showInternalLayers), this._toggleShowInternalLayers.bind(this),
        this._showInternalLayersSetting.get());
    const node = selection && selection.layer() && selection.layer().nodeForSelfOrAncestor();
    if (node) {
      contextMenu.appendApplicableItems(node);
    }
    contextMenu.show();
  }

  showInternalLayersSetting(): Common.Settings.Setting<boolean> {
    return this._showInternalLayersSetting;
  }

  _toggleShowInternalLayers(): void {
    this._showInternalLayersSetting.set(!this._showInternalLayersSetting.get());
  }

  _toggleNodeHighlight(node: SDK.DOMModel.DOMNode|null): void {
    if (node) {
      node.highlightForTwoSeconds();
      return;
    }
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  }
}
