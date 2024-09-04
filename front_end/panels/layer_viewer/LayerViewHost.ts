// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';

import type * as UI from '../../ui/legacy/legacy.js';

const UIStrings = {
  /**
   *@description Text in Layer View Host of the Layers panel
   */
  showInternalLayers: 'Show internal layers',
};
const str_ = i18n.i18n.registerUIStrings('panels/layer_viewer/LayerViewHost.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export abstract class LayerView {
  abstract hoverObject(selection: Selection|null): void;
  abstract selectObject(selection: Selection|null): void;
  abstract setLayerTree(layerTree: SDK.LayerTreeBase.LayerTreeBase|null): void;
}

export class Selection {
  readonly typeInternal: Type;
  private readonly layerInternal: SDK.LayerTreeBase.Layer;

  constructor(type: Type, layer: SDK.LayerTreeBase.Layer) {
    this.typeInternal = type;
    this.layerInternal = layer;
  }

  static isEqual(a: Selection|null, b: Selection|null): boolean {
    return a && b ? a.isEqual(b) : a === b;
  }

  type(): Type {
    return this.typeInternal;
  }

  layer(): SDK.LayerTreeBase.Layer {
    return this.layerInternal;
  }

  isEqual(_other: Selection): boolean {
    return false;
  }
}

export const enum Type {
  LAYER = 'Layer',
  SCROLL_RECT = 'ScrollRect',
  SNAPSHOT = 'Snapshot',
}

export class LayerSelection extends Selection {
  constructor(layer: SDK.LayerTreeBase.Layer) {
    console.assert(Boolean(layer), 'LayerSelection with empty layer');
    super(Type.LAYER, layer);
  }

  override isEqual(other: Selection): boolean {
    return other.typeInternal === Type.LAYER && other.layer().id() === this.layer().id();
  }
}

export class ScrollRectSelection extends Selection {
  scrollRectIndex: number;
  constructor(layer: SDK.LayerTreeBase.Layer, scrollRectIndex: number) {
    super(Type.SCROLL_RECT, layer);
    this.scrollRectIndex = scrollRectIndex;
  }

  override isEqual(other: Selection): boolean {
    return other.typeInternal === Type.SCROLL_RECT && this.layer().id() === other.layer().id() &&
        this.scrollRectIndex === (other as ScrollRectSelection).scrollRectIndex;
  }
}

export class SnapshotSelection extends Selection {
  private readonly snapshotInternal: SDK.PaintProfiler.SnapshotWithRect;
  constructor(layer: SDK.LayerTreeBase.Layer, snapshot: SDK.PaintProfiler.SnapshotWithRect) {
    super(Type.SNAPSHOT, layer);
    this.snapshotInternal = snapshot;
  }

  override isEqual(other: Selection): boolean {
    return other.typeInternal === Type.SNAPSHOT && this.layer().id() === other.layer().id() &&
        this.snapshotInternal === (other as SnapshotSelection).snapshotInternal;
  }

  snapshot(): SDK.PaintProfiler.SnapshotWithRect {
    return this.snapshotInternal;
  }
}

export class LayerViewHost {
  private readonly views: LayerView[];
  private selectedObject: Selection|null;
  private hoveredObject: Selection|null;
  private showInternalLayersSettingInternal: Common.Settings.Setting<boolean>;
  private snapshotLayers: Map<SDK.LayerTreeBase.Layer, SnapshotSelection>;
  private target?: SDK.Target.Target|null;
  constructor() {
    this.views = [];
    this.selectedObject = null;
    this.hoveredObject = null;
    this.showInternalLayersSettingInternal =
        Common.Settings.Settings.instance().createSetting('layers-show-internal-layers', false);
    this.snapshotLayers = new Map();
  }

  registerView(layerView: LayerView): void {
    this.views.push(layerView);
  }

  setLayerSnapshotMap(snapshotLayers: Map<SDK.LayerTreeBase.Layer, SnapshotSelection>): void {
    this.snapshotLayers = snapshotLayers;
  }

  getLayerSnapshotMap(): Map<SDK.LayerTreeBase.Layer, SnapshotSelection> {
    return this.snapshotLayers;
  }

  setLayerTree(layerTree: SDK.LayerTreeBase.LayerTreeBase|null): void {
    if (!layerTree) {
      return;
    }
    this.target = layerTree.target();
    const selectedLayer = this.selectedObject && this.selectedObject.layer();
    if (selectedLayer && (!layerTree || !layerTree.layerById(selectedLayer.id()))) {
      this.selectObject(null);
    }
    const hoveredLayer = this.hoveredObject && this.hoveredObject.layer();
    if (hoveredLayer && (!layerTree || !layerTree.layerById(hoveredLayer.id()))) {
      this.hoverObject(null);
    }
    for (const view of this.views) {
      view.setLayerTree(layerTree);
    }
  }

  hoverObject(selection: Selection|null): void {
    if (Selection.isEqual(this.hoveredObject, selection)) {
      return;
    }
    this.hoveredObject = selection;
    const layer = selection && selection.layer();
    this.toggleNodeHighlight(layer ? layer.nodeForSelfOrAncestor() : null);
    for (const view of this.views) {
      view.hoverObject(selection);
    }
  }

  selectObject(selection: Selection|null): void {
    if (Selection.isEqual(this.selectedObject, selection)) {
      return;
    }
    this.selectedObject = selection;
    for (const view of this.views) {
      view.selectObject(selection);
    }
  }

  selection(): Selection|null {
    return this.selectedObject;
  }

  showContextMenu(contextMenu: UI.ContextMenu.ContextMenu, selection: Selection|null): void {
    contextMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.showInternalLayers), this.toggleShowInternalLayers.bind(this), {
          checked: this.showInternalLayersSettingInternal.get(),
          jslogContext: this.showInternalLayersSettingInternal.name,
        });
    const node = selection && selection.layer() && selection.layer().nodeForSelfOrAncestor();
    if (node) {
      contextMenu.appendApplicableItems(node);
    }
    void contextMenu.show();
  }

  showInternalLayersSetting(): Common.Settings.Setting<boolean> {
    return this.showInternalLayersSettingInternal;
  }

  private toggleShowInternalLayers(): void {
    this.showInternalLayersSettingInternal.set(!this.showInternalLayersSettingInternal.get());
  }

  private toggleNodeHighlight(node: SDK.DOMModel.DOMNode|null): void {
    if (node) {
      node.highlightForTwoSeconds();
      return;
    }
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  }
}
