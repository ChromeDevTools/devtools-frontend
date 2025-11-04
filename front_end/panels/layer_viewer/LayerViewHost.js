// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
const UIStrings = {
    /**
     * @description Text in Layer View Host of the Layers panel
     */
    showInternalLayers: 'Show internal layers',
};
const str_ = i18n.i18n.registerUIStrings('panels/layer_viewer/LayerViewHost.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class LayerView {
}
export class Selection {
    typeInternal;
    #layer;
    constructor(type, layer) {
        this.typeInternal = type;
        this.#layer = layer;
    }
    static isEqual(a, b) {
        return a && b ? a.isEqual(b) : a === b;
    }
    type() {
        return this.typeInternal;
    }
    layer() {
        return this.#layer;
    }
    isEqual(_other) {
        return false;
    }
}
export class LayerSelection extends Selection {
    constructor(layer) {
        console.assert(Boolean(layer), 'LayerSelection with empty layer');
        super("Layer" /* Type.LAYER */, layer);
    }
    isEqual(other) {
        return other.typeInternal === "Layer" /* Type.LAYER */ && other.layer().id() === this.layer().id();
    }
}
export class ScrollRectSelection extends Selection {
    scrollRectIndex;
    constructor(layer, scrollRectIndex) {
        super("ScrollRect" /* Type.SCROLL_RECT */, layer);
        this.scrollRectIndex = scrollRectIndex;
    }
    isEqual(other) {
        return other.typeInternal === "ScrollRect" /* Type.SCROLL_RECT */ && this.layer().id() === other.layer().id() &&
            this.scrollRectIndex === other.scrollRectIndex;
    }
}
export class SnapshotSelection extends Selection {
    #snapshot;
    constructor(layer, snapshot) {
        super("Snapshot" /* Type.SNAPSHOT */, layer);
        this.#snapshot = snapshot;
    }
    isEqual(other) {
        return other.typeInternal === "Snapshot" /* Type.SNAPSHOT */ && this.layer().id() === other.layer().id() &&
            this.#snapshot === other.#snapshot;
    }
    snapshot() {
        return this.#snapshot;
    }
}
export class LayerViewHost {
    views;
    selectedObject;
    hoveredObject;
    #showInternalLayersSetting;
    snapshotLayers;
    constructor() {
        this.views = [];
        this.selectedObject = null;
        this.hoveredObject = null;
        this.#showInternalLayersSetting =
            Common.Settings.Settings.instance().createSetting('layers-show-internal-layers', false);
        this.snapshotLayers = new Map();
    }
    registerView(layerView) {
        this.views.push(layerView);
    }
    setLayerSnapshotMap(snapshotLayers) {
        this.snapshotLayers = snapshotLayers;
    }
    getLayerSnapshotMap() {
        return this.snapshotLayers;
    }
    setLayerTree(layerTree) {
        if (!layerTree) {
            return;
        }
        const selectedLayer = this.selectedObject?.layer();
        if (selectedLayer && (!layerTree?.layerById(selectedLayer.id()))) {
            this.selectObject(null);
        }
        const hoveredLayer = this.hoveredObject?.layer();
        if (hoveredLayer && (!layerTree?.layerById(hoveredLayer.id()))) {
            this.hoverObject(null);
        }
        for (const view of this.views) {
            view.setLayerTree(layerTree);
        }
    }
    hoverObject(selection) {
        if (Selection.isEqual(this.hoveredObject, selection)) {
            return;
        }
        this.hoveredObject = selection;
        const layer = selection?.layer();
        this.toggleNodeHighlight(layer ? layer.nodeForSelfOrAncestor() : null);
        for (const view of this.views) {
            view.hoverObject(selection);
        }
    }
    selectObject(selection) {
        if (Selection.isEqual(this.selectedObject, selection)) {
            return;
        }
        this.selectedObject = selection;
        for (const view of this.views) {
            view.selectObject(selection);
        }
    }
    selection() {
        return this.selectedObject;
    }
    showContextMenu(contextMenu, selection) {
        contextMenu.defaultSection().appendCheckboxItem(i18nString(UIStrings.showInternalLayers), this.toggleShowInternalLayers.bind(this), {
            checked: this.#showInternalLayersSetting.get(),
            jslogContext: this.#showInternalLayersSetting.name,
        });
        const node = selection?.layer()?.nodeForSelfOrAncestor();
        if (node) {
            contextMenu.appendApplicableItems(node);
        }
        void contextMenu.show();
    }
    showInternalLayersSetting() {
        return this.#showInternalLayersSetting;
    }
    toggleShowInternalLayers() {
        this.#showInternalLayersSetting.set(!this.#showInternalLayersSetting.get());
    }
    toggleNodeHighlight(node) {
        if (node) {
            node.highlightForTwoSeconds();
            return;
        }
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
}
//# sourceMappingURL=LayerViewHost.js.map