var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/layer_viewer/LayerDetailsView.js
var LayerDetailsView_exports = {};
__export(LayerDetailsView_exports, {
  LayerDetailsView: () => LayerDetailsView,
  slowScrollRectNames: () => slowScrollRectNames
});
import * as Common2 from "./../../core/common/common.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/layer_viewer/layerDetailsView.css.js
var layerDetailsView_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.layer-details-container:has(.empty-view-scroller) {
  display: flex;
}

table {
  border-spacing: 0;
}

table td {
  font: var(--sys-typescale-body4-regular);
  line-height: 18px;
  padding: var(--sys-size-3) var(--sys-size-5);
  vertical-align: top;
}

table td:first-child {
  color: var(--sys-color-on-surface-subtle);
  font: var(--sys-typescale-body5-medium);
  line-height:  18px;
  white-space: nowrap;
}

.scroll-rect.active {
  background-color: var(--sys-color-neutral-container);
}

ul {
  list-style: none;
  padding-inline-start: 0;
  margin-block: 0;
}

.devtools-link.link-margin {
  margin: 8px;
  display: inline-block;
}

/*# sourceURL=${import.meta.resolve("./layerDetailsView.css")} */`;

// gen/front_end/panels/layer_viewer/LayerViewHost.js
var LayerViewHost_exports = {};
__export(LayerViewHost_exports, {
  LayerSelection: () => LayerSelection,
  LayerView: () => LayerView,
  LayerViewHost: () => LayerViewHost,
  ScrollRectSelection: () => ScrollRectSelection,
  Selection: () => Selection,
  SnapshotSelection: () => SnapshotSelection
});
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as SDK from "./../../core/sdk/sdk.js";
var UIStrings = {
  /**
   * @description Text in Layer View Host of the Layers panel
   */
  showInternalLayers: "Show internal layers"
};
var str_ = i18n.i18n.registerUIStrings("panels/layer_viewer/LayerViewHost.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var LayerView = class {
};
var Selection = class {
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
};
var LayerSelection = class extends Selection {
  constructor(layer) {
    console.assert(Boolean(layer), "LayerSelection with empty layer");
    super("Layer", layer);
  }
  isEqual(other) {
    return other.typeInternal === "Layer" && other.layer().id() === this.layer().id();
  }
};
var ScrollRectSelection = class extends Selection {
  scrollRectIndex;
  constructor(layer, scrollRectIndex) {
    super("ScrollRect", layer);
    this.scrollRectIndex = scrollRectIndex;
  }
  isEqual(other) {
    return other.typeInternal === "ScrollRect" && this.layer().id() === other.layer().id() && this.scrollRectIndex === other.scrollRectIndex;
  }
};
var SnapshotSelection = class extends Selection {
  #snapshot;
  constructor(layer, snapshot) {
    super("Snapshot", layer);
    this.#snapshot = snapshot;
  }
  isEqual(other) {
    return other.typeInternal === "Snapshot" && this.layer().id() === other.layer().id() && this.#snapshot === other.#snapshot;
  }
  snapshot() {
    return this.#snapshot;
  }
};
var LayerViewHost = class {
  views;
  selectedObject;
  hoveredObject;
  #showInternalLayersSetting;
  snapshotLayers;
  constructor() {
    this.views = [];
    this.selectedObject = null;
    this.hoveredObject = null;
    this.#showInternalLayersSetting = Common.Settings.Settings.instance().createSetting("layers-show-internal-layers", false);
    this.snapshotLayers = /* @__PURE__ */ new Map();
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
    if (selectedLayer && !layerTree?.layerById(selectedLayer.id())) {
      this.selectObject(null);
    }
    const hoveredLayer = this.hoveredObject?.layer();
    if (hoveredLayer && !layerTree?.layerById(hoveredLayer.id())) {
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
      jslogContext: this.#showInternalLayersSetting.name
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
};

// gen/front_end/panels/layer_viewer/LayerDetailsView.js
var UIStrings2 = {
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  selectALayerToSeeItsDetails: "Select a layer to see its details",
  /**
   * @description Text in Layer Details View of the Layers panel if no layer is selected for viewing its content
   */
  noLayerSelected: "No layer selected",
  /**
   * @description Element text content in Layer Details View of the Layers panel
   * @example {Touch event handler} PH1
   * @example {10} PH2
   * @example {10} PH3
   * @example {10} PH4
   * @example {10} PH5
   */
  scrollRectangleDimensions: "{PH1} {PH2} \xD7 {PH3} (at {PH4}, {PH5})",
  /**
   * @description Text in Layer Details View of the Layers panel. Used to indicate that a particular
   * layer of the website is unnamed (was not given a name/doesn't have one).
   */
  unnamed: "<unnamed>",
  /**
   * @description Text in Layer Details View of the Layers panel
   * @example {Nearest Layer Shifting Sticky Box} PH1
   * @example {&lt;unnamed&gt;} PH2
   * @example {5} PH3
   */
  stickyAncestorLayersS: "{PH1}: {PH2} ({PH3})",
  /**
   * @description Sticky box rect element text content in Layer Details View of the Layers panel
   * @example {10} PH1
   * @example {10} PH2
   * @example {10} PH3
   * @example {10} PH4
   */
  stickyBoxRectangleDimensions: "Sticky Box {PH1} \xD7 {PH2} (at {PH3}, {PH4})",
  /**
   * @description Containing block rect element text content in Layer Details View of the Layers panel.
   * The placeholder are width, height, x position, and y position respectively.
   * @example {10} PH1
   * @example {10} PH2
   * @example {10} PH3
   * @example {10} PH4
   */
  containingBlocRectangleDimensions: "Containing Block {PH1} \xD7 {PH2} (at {PH3}, {PH4})",
  /**
   * @description Text in Layer Details View of the Layers panel. This also means "The nearest sticky
   * box that causes a layer shift".
   */
  nearestLayerShiftingStickyBox: "Nearest Layer Shifting Sticky Box",
  /**
   * @description Text in Layer Details View of the Layers panel. This also means "The nearest block
   * that causes a layer shift".
   */
  nearestLayerShiftingContaining: "Nearest Layer Shifting Containing Block",
  /**
   * @description Size cell text content in Layer Details View of the Layers panel
   * @example {10} PH1
   * @example {10} PH2
   * @example {10} PH3
   * @example {10} PH4
   */
  updateRectangleDimensions: "{PH1} \xD7 {PH2} (at {PH3}, {PH4})",
  /**
   * @description Text for the size of something
   */
  size: "Size",
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  compositingReasons: "Compositing Reasons",
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  memoryEstimate: "Memory estimate",
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  paintCount: "Paint count",
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  slowScrollRegions: "Slow scroll regions",
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  stickyPositionConstraint: "Sticky position constraint",
  /**
   * @description Title of the paint profiler, old name of the performance pane
   */
  paintProfiler: "Paint Profiler",
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  nonFastScrollable: "Non fast scrollable",
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  touchEventHandler: "Touch event handler",
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  wheelEventHandler: "Wheel event handler",
  /**
   * @description Text in Layer Details View of the Layers panel. Means that this rectangle needs to
   * be repainted when the webpage is scrolled. 'repaints' means that the browser engine needs to
   * draw the pixels for this rectangle to the user's monitor again.
   */
  repaintsOnScroll: "Repaints on scroll",
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  mainThreadScrollingReason: "Main thread scrolling reason"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/layer_viewer/LayerDetailsView.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var i18nLazyString = i18n3.i18n.getLazilyComputedLocalizedString.bind(void 0, str_2);
var LayerDetailsView = class extends Common2.ObjectWrapper.eventMixin(UI.Widget.Widget) {
  layerViewHost;
  emptyWidget;
  layerSnapshotMap;
  tableElement;
  tbodyElement;
  sizeCell;
  compositingReasonsCell;
  memoryEstimateCell;
  paintCountCell;
  scrollRectsCell;
  stickyPositionConstraintCell;
  paintProfilerLink;
  selection;
  constructor(layerViewHost) {
    super({
      jslog: `${VisualLogging.pane("layers-details")}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(layerDetailsView_css_default);
    this.contentElement.classList.add("layer-details-container");
    this.layerViewHost = layerViewHost;
    this.layerViewHost.registerView(this);
    this.emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString2(UIStrings2.noLayerSelected), i18nString2(UIStrings2.selectALayerToSeeItsDetails));
    this.layerSnapshotMap = this.layerViewHost.getLayerSnapshotMap();
    this.buildContent();
    this.selection = null;
  }
  hoverObject(_selection) {
  }
  selectObject(selection) {
    this.selection = selection;
    if (this.isShowing()) {
      this.update();
    }
  }
  setLayerTree(_layerTree) {
  }
  wasShown() {
    super.wasShown();
    this.update();
  }
  onScrollRectClicked(index, event) {
    if (event.which !== 1) {
      return;
    }
    if (!this.selection) {
      return;
    }
    this.layerViewHost.selectObject(new ScrollRectSelection(this.selection.layer(), index));
  }
  invokeProfilerLink() {
    if (!this.selection) {
      return;
    }
    const snapshotSelection = this.selection.type() === "Snapshot" ? this.selection : this.layerSnapshotMap.get(this.selection.layer());
    if (snapshotSelection) {
      this.dispatchEventToListeners("PaintProfilerRequested", snapshotSelection);
    }
  }
  createScrollRectElement(scrollRect, index) {
    if (index) {
      UI.UIUtils.createTextChild(this.scrollRectsCell, ", ");
    }
    const element = this.scrollRectsCell.createChild("span", "scroll-rect");
    if (this.selection && this.selection.scrollRectIndex === index) {
      element.classList.add("active");
    }
    element.textContent = i18nString2(UIStrings2.scrollRectangleDimensions, {
      PH1: String(slowScrollRectNames.get(scrollRect.type)?.()),
      PH2: scrollRect.rect.width,
      PH3: scrollRect.rect.height,
      PH4: scrollRect.rect.x,
      PH5: scrollRect.rect.y
    });
    element.addEventListener("click", this.onScrollRectClicked.bind(this, index), false);
    element.setAttribute("jslog", `${VisualLogging.action("layers.select-object").track({ click: true })}`);
  }
  formatStickyAncestorLayer(title, layer) {
    if (!layer) {
      return "";
    }
    const node = layer.nodeForSelfOrAncestor();
    const name = node ? node.simpleSelector() : i18nString2(UIStrings2.unnamed);
    return i18nString2(UIStrings2.stickyAncestorLayersS, { PH1: title, PH2: name, PH3: layer.id() });
  }
  createStickyAncestorChild(title, layer) {
    if (!layer) {
      return;
    }
    UI.UIUtils.createTextChild(this.stickyPositionConstraintCell, ", ");
    const child = this.stickyPositionConstraintCell.createChild("span");
    child.textContent = this.formatStickyAncestorLayer(title, layer);
  }
  populateStickyPositionConstraintCell(constraint) {
    this.stickyPositionConstraintCell.removeChildren();
    if (!constraint) {
      return;
    }
    const stickyBoxRect = constraint.stickyBoxRect();
    const stickyBoxRectElement = this.stickyPositionConstraintCell.createChild("span");
    stickyBoxRectElement.textContent = i18nString2(UIStrings2.stickyBoxRectangleDimensions, { PH1: stickyBoxRect.width, PH2: stickyBoxRect.height, PH3: stickyBoxRect.x, PH4: stickyBoxRect.y });
    UI.UIUtils.createTextChild(this.stickyPositionConstraintCell, ", ");
    const containingBlockRect = constraint.containingBlockRect();
    const containingBlockRectElement = this.stickyPositionConstraintCell.createChild("span");
    containingBlockRectElement.textContent = i18nString2(UIStrings2.containingBlocRectangleDimensions, {
      PH1: containingBlockRect.width,
      PH2: containingBlockRect.height,
      PH3: containingBlockRect.x,
      PH4: containingBlockRect.y
    });
    this.createStickyAncestorChild(i18nString2(UIStrings2.nearestLayerShiftingStickyBox), constraint.nearestLayerShiftingStickyBox());
    this.createStickyAncestorChild(i18nString2(UIStrings2.nearestLayerShiftingContaining), constraint.nearestLayerShiftingContainingBlock());
  }
  update() {
    const layer = this.selection?.layer();
    if (!layer) {
      this.tableElement.remove();
      this.paintProfilerLink.remove();
      this.emptyWidget.show(this.contentElement);
      return;
    }
    this.emptyWidget.detach();
    this.contentElement.appendChild(this.tableElement);
    this.contentElement.appendChild(this.paintProfilerLink);
    this.sizeCell.textContent = i18nString2(UIStrings2.updateRectangleDimensions, { PH1: layer.width(), PH2: layer.height(), PH3: layer.offsetX(), PH4: layer.offsetY() });
    if (this.paintCountCell.parentElement) {
      this.paintCountCell.parentElement.classList.toggle("hidden", !layer.paintCount());
    }
    this.paintCountCell.textContent = String(layer.paintCount());
    this.memoryEstimateCell.textContent = i18n3.ByteUtilities.bytesToString(layer.gpuMemoryUsage());
    void layer.requestCompositingReasons().then(this.updateCompositingReasons.bind(this));
    this.scrollRectsCell.removeChildren();
    layer.scrollRects().forEach(this.createScrollRectElement.bind(this));
    this.populateStickyPositionConstraintCell(layer.stickyPositionConstraint());
    const snapshot = this.selection && this.selection.type() === "Snapshot" ? this.selection.snapshot() : null;
    this.paintProfilerLink.classList.toggle("hidden", !(this.layerSnapshotMap.has(layer) || snapshot));
  }
  buildContent() {
    this.tableElement = this.contentElement.createChild("table");
    this.tbodyElement = this.tableElement.createChild("tbody");
    this.sizeCell = this.createRow(i18nString2(UIStrings2.size));
    this.compositingReasonsCell = this.createRow(i18nString2(UIStrings2.compositingReasons));
    this.memoryEstimateCell = this.createRow(i18nString2(UIStrings2.memoryEstimate));
    this.paintCountCell = this.createRow(i18nString2(UIStrings2.paintCount));
    this.scrollRectsCell = this.createRow(i18nString2(UIStrings2.slowScrollRegions));
    this.stickyPositionConstraintCell = this.createRow(i18nString2(UIStrings2.stickyPositionConstraint));
    this.paintProfilerLink = this.contentElement.createChild("button", "hidden devtools-link link-margin text-button link-style");
    UI.ARIAUtils.markAsLink(this.paintProfilerLink);
    this.paintProfilerLink.textContent = i18nString2(UIStrings2.paintProfiler);
    this.paintProfilerLink.tabIndex = 0;
    this.paintProfilerLink.addEventListener("click", (e) => {
      e.consume(true);
      this.invokeProfilerLink();
    });
    this.paintProfilerLink.setAttribute("jslog", `${VisualLogging.action("layers.paint-profiler").track({ click: true, keydown: "Enter" })}`);
  }
  createRow(title) {
    const tr = this.tbodyElement.createChild("tr");
    const titleCell = tr.createChild("td");
    titleCell.textContent = title;
    return tr.createChild("td");
  }
  updateCompositingReasons(compositingReasons) {
    if (!compositingReasons?.length) {
      this.compositingReasonsCell.textContent = "n/a";
      return;
    }
    this.compositingReasonsCell.removeChildren();
    const list = this.compositingReasonsCell.createChild("ul");
    for (const compositingReason of compositingReasons) {
      list.createChild("li").textContent = compositingReason;
    }
  }
};
var slowScrollRectNames = /* @__PURE__ */ new Map([
  ["NonFastScrollable", i18nLazyString(UIStrings2.nonFastScrollable)],
  ["TouchEventHandler", i18nLazyString(UIStrings2.touchEventHandler)],
  ["WheelEventHandler", i18nLazyString(UIStrings2.wheelEventHandler)],
  ["RepaintsOnScroll", i18nLazyString(UIStrings2.repaintsOnScroll)],
  [
    "MainThreadScrollingReason",
    i18nLazyString(UIStrings2.mainThreadScrollingReason)
  ]
]);

// gen/front_end/panels/layer_viewer/LayerTreeOutline.js
var LayerTreeOutline_exports = {};
__export(LayerTreeOutline_exports, {
  LayerTreeElement: () => LayerTreeElement,
  LayerTreeOutline: () => LayerTreeOutline,
  layerToTreeElement: () => layerToTreeElement
});
import * as Common3 from "./../../core/common/common.js";
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as UI2 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/layer_viewer/layerTreeOutline.css.js
var layerTreeOutline_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.layer-summary {
  border-top: 1px solid var(--sys-color-divider);
  justify-content: space-between;
  padding: 4px 10px;
  flex-shrink: 0;
}

.layer-count {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-tree-wrapper {
  flex-grow: 1;
}

/*# sourceURL=${import.meta.resolve("./layerTreeOutline.css")} */`;

// gen/front_end/panels/layer_viewer/LayerTreeOutline.js
var UIStrings3 = {
  /**
   * @description A count of the number of rendering layers in Layer Tree Outline of the Layers panel
   * @example {10} PH1
   */
  layerCount: "{PH1} layers",
  /**
   * @description Label for layers sidepanel tree
   */
  layersTreePane: "Layers Tree Pane",
  /**
   * @description A context menu item in the DView of the Layers panel
   */
  showPaintProfiler: "Show Paint Profiler",
  /**
   * @description Details text content in Layer Tree Outline of the Layers panel
   * @example {10} PH1
   * @example {10} PH2
   */
  updateChildDimension: " ({PH1} \xD7 {PH2})"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/layer_viewer/LayerTreeOutline.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var LayerTreeOutline = class extends Common3.ObjectWrapper.eventMixin(UI2.TreeOutline.TreeOutline) {
  layerViewHost;
  treeOutline;
  lastHoveredNode;
  layerCountElement;
  layerMemoryElement;
  element;
  layerTree;
  layerSnapshotMap;
  constructor(layerViewHost) {
    super();
    this.layerViewHost = layerViewHost;
    this.layerViewHost.registerView(this);
    this.treeOutline = new UI2.TreeOutline.TreeOutlineInShadow();
    this.treeOutline.element.classList.add("layer-tree", "overflow-auto");
    this.treeOutline.element.addEventListener("mousemove", this.onMouseMove.bind(this), false);
    this.treeOutline.element.addEventListener("mouseout", this.onMouseMove.bind(this), false);
    this.treeOutline.element.addEventListener("contextmenu", this.onContextMenu.bind(this), true);
    UI2.ARIAUtils.setLabel(this.treeOutline.contentElement, i18nString3(UIStrings3.layersTreePane));
    this.lastHoveredNode = null;
    const summaryElement = document.createElement("div");
    summaryElement.classList.add("hbox", "layer-summary");
    this.layerCountElement = document.createElement("span");
    this.layerCountElement.classList.add("layer-count");
    this.layerMemoryElement = document.createElement("span");
    summaryElement.appendChild(this.layerCountElement);
    summaryElement.appendChild(this.layerMemoryElement);
    const wrapperElement = document.createElement("div");
    wrapperElement.classList.add("vbox", "layer-tree-wrapper");
    wrapperElement.appendChild(this.treeOutline.element);
    wrapperElement.appendChild(summaryElement);
    this.element = wrapperElement;
    Platform.DOMUtilities.appendStyle(this.element, layerTreeOutline_css_default);
    this.layerViewHost.showInternalLayersSetting().addChangeListener(this.update, this);
  }
  focus() {
    this.treeOutline.focus();
  }
  selectObject(selection) {
    this.hoverObject(null);
    const layer = selection?.layer();
    const node = layer && layerToTreeElement.get(layer);
    if (node) {
      node.revealAndSelect(true);
    } else if (this.treeOutline.selectedTreeElement) {
      this.treeOutline.selectedTreeElement.deselect();
    }
  }
  hoverObject(selection) {
    const layer = selection?.layer();
    const node = layer && layerToTreeElement.get(layer);
    if (node === this.lastHoveredNode) {
      return;
    }
    if (this.lastHoveredNode) {
      this.lastHoveredNode.setHovered(false);
    }
    if (node) {
      node.setHovered(true);
    }
    this.lastHoveredNode = node;
  }
  setLayerTree(layerTree) {
    this.layerTree = layerTree;
    this.update();
  }
  update() {
    const showInternalLayers = this.layerViewHost.showInternalLayersSetting().get();
    const seenLayers = /* @__PURE__ */ new Map();
    let root = null;
    if (this.layerTree) {
      if (!showInternalLayers) {
        root = this.layerTree.contentRoot();
      }
      if (!root) {
        root = this.layerTree.root();
      }
    }
    let layerCount = 0;
    let totalLayerMemory = 0;
    function updateLayer(layer) {
      if (!layer.drawsContent() && !showInternalLayers) {
        return;
      }
      if (seenLayers.get(layer)) {
        console.assert(false, "Duplicate layer: " + layer.id());
      }
      seenLayers.set(layer, true);
      layerCount++;
      totalLayerMemory += layer.gpuMemoryUsage();
      let node = layerToTreeElement.get(layer) || null;
      let parentLayer = layer.parent();
      while (parentLayer && parentLayer !== root && !parentLayer.drawsContent() && !showInternalLayers) {
        parentLayer = parentLayer.parent();
      }
      const parent = layer === root ? this.treeOutline.rootElement() : parentLayer && layerToTreeElement.get(parentLayer);
      if (!parent) {
        console.assert(false, "Parent is not in the tree");
        return;
      }
      if (!node) {
        node = new LayerTreeElement(this, layer);
        parent.appendChild(node);
        if (!layer.drawsContent()) {
          node.expand();
        }
      } else {
        if (node.parent !== parent) {
          const oldSelection = this.treeOutline.selectedTreeElement;
          if (node.parent) {
            node.parent.removeChild(node);
          }
          parent.appendChild(node);
          if (oldSelection && oldSelection !== this.treeOutline.selectedTreeElement) {
            oldSelection.select();
          }
        }
        node.update();
      }
    }
    if (root && this.layerTree) {
      this.layerTree.forEachLayer(updateLayer.bind(this), root);
    }
    const rootElement = this.treeOutline.rootElement();
    for (let node = rootElement.firstChild(); node instanceof LayerTreeElement && !node.root; ) {
      if (seenLayers.get(node.layer)) {
        node = node.traverseNextTreeElement(false);
      } else {
        const nextNode = node.nextSibling || node.parent;
        if (node.parent) {
          node.parent.removeChild(node);
        }
        if (node === this.lastHoveredNode) {
          this.lastHoveredNode = null;
        }
        node = nextNode;
      }
    }
    if (!this.treeOutline.selectedTreeElement && this.layerTree) {
      const elementToSelect = this.layerTree.contentRoot() || this.layerTree.root();
      if (elementToSelect) {
        const layer = layerToTreeElement.get(elementToSelect);
        if (layer) {
          layer.revealAndSelect(true);
        }
      }
    }
    this.layerCountElement.textContent = i18nString3(UIStrings3.layerCount, { PH1: layerCount });
    this.layerMemoryElement.textContent = i18n5.ByteUtilities.bytesToString(totalLayerMemory);
  }
  onMouseMove(event) {
    const node = this.treeOutline.treeElementFromEvent(event);
    if (node === this.lastHoveredNode) {
      return;
    }
    this.layerViewHost.hoverObject(this.selectionForNode(node));
  }
  selectedNodeChanged(node) {
    this.layerViewHost.selectObject(this.selectionForNode(node));
  }
  onContextMenu(event) {
    const selection = this.selectionForNode(this.treeOutline.treeElementFromEvent(event));
    const contextMenu = new UI2.ContextMenu.ContextMenu(event);
    const layer = selection?.layer();
    if (selection && layer) {
      this.layerSnapshotMap = this.layerViewHost.getLayerSnapshotMap();
      if (this.layerSnapshotMap.has(layer)) {
        contextMenu.defaultSection().appendItem(i18nString3(UIStrings3.showPaintProfiler), () => this.dispatchEventToListeners("PaintProfilerRequested", selection), { jslogContext: "layers.paint-profiler" });
      }
    }
    this.layerViewHost.showContextMenu(contextMenu, selection);
  }
  selectionForNode(node) {
    return node?.layer ? new LayerSelection(node.layer) : null;
  }
};
var LayerTreeElement = class extends UI2.TreeOutline.TreeElement {
  // Watch out: This is different from treeOutline that
  // LayerTreeElement inherits from UI.TreeOutline.TreeElement.
  #treeOutline;
  layer;
  constructor(tree, layer) {
    super();
    this.#treeOutline = tree;
    this.layer = layer;
    layerToTreeElement.set(layer, this);
    this.update();
  }
  update() {
    const node = this.layer.nodeForSelfOrAncestor();
    const title = document.createDocumentFragment();
    UI2.UIUtils.createTextChild(title, node ? node.simpleSelector() : "#" + this.layer.id());
    const details = title.createChild("span", "dimmed");
    details.textContent = i18nString3(UIStrings3.updateChildDimension, { PH1: this.layer.width(), PH2: this.layer.height() });
    this.title = title;
  }
  onselect() {
    this.#treeOutline.selectedNodeChanged(this);
    return false;
  }
  setHovered(hovered) {
    this.listItemElement.classList.toggle("hovered", hovered);
  }
};
var layerToTreeElement = /* @__PURE__ */ new WeakMap();

// gen/front_end/panels/layer_viewer/Layers3DView.js
var Layers3DView_exports = {};
__export(Layers3DView_exports, {
  BorderColor: () => BorderColor,
  BorderWidth: () => BorderWidth,
  FragmentShader: () => FragmentShader,
  HoveredBorderColor: () => HoveredBorderColor,
  HoveredImageMaskColor: () => HoveredImageMaskColor,
  LayerSpacing: () => LayerSpacing,
  LayerTextureManager: () => LayerTextureManager,
  Layers3DView: () => Layers3DView,
  OutlineType: () => OutlineType,
  Rectangle: () => Rectangle,
  ScrollRectBackgroundColor: () => ScrollRectBackgroundColor,
  ScrollRectSpacing: () => ScrollRectSpacing,
  SelectedBorderColor: () => SelectedBorderColor,
  SelectedBorderWidth: () => SelectedBorderWidth,
  Tile: () => Tile,
  VertexShader: () => VertexShader,
  ViewportBorderColor: () => ViewportBorderColor,
  ViewportBorderWidth: () => ViewportBorderWidth
});
import * as Common5 from "./../../core/common/common.js";
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as Platform3 from "./../../core/platform/platform.js";
import * as Geometry from "./../../models/geometry/geometry.js";
import * as uiI18n from "./../../ui/i18n/i18n.js";
import * as UI4 from "./../../ui/legacy/legacy.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/layer_viewer/layers3DView.css.js
var layers3DView_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.layers-3d-view {
  overflow: hidden;
  user-select: none;

  > .empty-view-scroller{
    inset: 0;
    position: absolute;
    background-color: var(--sys-color-cdt-base-container);
  }
}

devtools-toolbar {
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);
}

canvas {
  flex: 1 1;
}

.layers-3d-view > canvas:focus-visible {
  outline: auto 5px -webkit-focus-ring-color;
}

/*# sourceURL=${import.meta.resolve("./layers3DView.css")} */`;

// gen/front_end/panels/layer_viewer/TransformController.js
var TransformController_exports = {};
__export(TransformController_exports, {
  TransformController: () => TransformController
});
import "./../../ui/legacy/legacy.js";
import * as Common4 from "./../../core/common/common.js";
import * as i18n7 from "./../../core/i18n/i18n.js";
import * as Platform2 from "./../../core/platform/platform.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";
var UIStrings4 = {
  /**
   * @description Tooltip text that appears when hovering over largeicon pan button in Transform Controller of the Layers panel
   */
  panModeX: "Pan mode (X)",
  /**
   * @description Tooltip text that appears when hovering over largeicon rotate button in Transform Controller of the Layers panel
   */
  rotateModeV: "Rotate mode (V)",
  /**
   * @description Tooltip text that appears when hovering over the largeicon center button in the Transform Controller of the Layers panel
   */
  resetTransform: "Reset transform (0)"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/layer_viewer/TransformController.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var TransformController = class extends Common4.ObjectWrapper.ObjectWrapper {
  mode;
  #scale;
  #offsetX;
  #offsetY;
  #rotateX;
  #rotateY;
  oldRotateX;
  oldRotateY;
  originX;
  originY;
  element;
  minScale;
  maxScale;
  controlPanelToolbar;
  modeButtons;
  /**
   * @param element The HTML element to apply transformations to.
   * @param disableRotate Optional. If true, pan and rotate will be disabled. Defaults to false.
   * @param preventDefaultOnMousedown Optional. If true, mousedown events will be prevented from their default behavior (including focus). Defaults to true.
   */
  constructor(element, disableRotate, preventDefaultOnMouseDown = true) {
    super();
    this.#scale = 1;
    this.#offsetX = 0;
    this.#offsetY = 0;
    this.#rotateX = 0;
    this.#rotateY = 0;
    this.oldRotateX = 0;
    this.oldRotateY = 0;
    this.originX = 0;
    this.originY = 0;
    this.element = element;
    this.registerShortcuts();
    UI3.UIUtils.installDragHandle(element, this.onDragStart.bind(this), this.onDrag.bind(this), this.onDragEnd.bind(this), "move", null, 0, preventDefaultOnMouseDown);
    element.addEventListener("wheel", this.onMouseWheel.bind(this), false);
    this.minScale = 0;
    this.maxScale = Infinity;
    this.controlPanelToolbar = document.createElement("devtools-toolbar");
    this.controlPanelToolbar.classList.add("transform-control-panel");
    this.controlPanelToolbar.setAttribute("jslog", `${VisualLogging2.toolbar()}`);
    this.modeButtons = {};
    if (!disableRotate) {
      const panModeButton = new UI3.Toolbar.ToolbarToggle(
        i18nString4(UIStrings4.panModeX),
        "3d-pan",
        void 0,
        "layers.3d-pan",
        /* toggleOnClick */
        false
      );
      panModeButton.addEventListener("Click", this.setMode.bind(
        this,
        "Pan"
        /* Modes.PAN */
      ));
      this.modeButtons[
        "Pan"
        /* Modes.PAN */
      ] = panModeButton;
      this.controlPanelToolbar.appendToolbarItem(panModeButton);
      const rotateModeButton = new UI3.Toolbar.ToolbarToggle(
        i18nString4(UIStrings4.rotateModeV),
        "3d-rotate",
        void 0,
        "layers.3d-rotate",
        /* toggleOnClick */
        false
      );
      rotateModeButton.addEventListener("Click", this.setMode.bind(
        this,
        "Rotate"
        /* Modes.ROTATE */
      ));
      this.modeButtons[
        "Rotate"
        /* Modes.ROTATE */
      ] = rotateModeButton;
      this.controlPanelToolbar.appendToolbarItem(rotateModeButton);
    }
    this.setMode(
      "Pan"
      /* Modes.PAN */
    );
    const resetButton = new UI3.Toolbar.ToolbarButton(i18nString4(UIStrings4.resetTransform), "3d-center", void 0, "layers.3d-center");
    resetButton.addEventListener("Click", this.resetAndNotify.bind(this, void 0));
    this.controlPanelToolbar.appendToolbarItem(resetButton);
    this.reset();
  }
  toolbar() {
    return this.controlPanelToolbar;
  }
  registerShortcuts() {
    const zoomFactor = 1.1;
    UI3.ShortcutRegistry.ShortcutRegistry.instance().addShortcutListener(this.element, {
      "layers.reset-view": async () => {
        this.resetAndNotify();
        return true;
      },
      "layers.pan-mode": async () => {
        this.setMode(
          "Pan"
          /* Modes.PAN */
        );
        return true;
      },
      "layers.rotate-mode": async () => {
        this.setMode(
          "Rotate"
          /* Modes.ROTATE */
        );
        return true;
      },
      "layers.zoom-in": this.onKeyboardZoom.bind(this, zoomFactor),
      "layers.zoom-out": this.onKeyboardZoom.bind(this, 1 / zoomFactor),
      "layers.up": this.onKeyboardPanOrRotate.bind(this, 0, -1),
      "layers.down": this.onKeyboardPanOrRotate.bind(this, 0, 1),
      "layers.left": this.onKeyboardPanOrRotate.bind(this, -1, 0),
      "layers.right": this.onKeyboardPanOrRotate.bind(this, 1, 0)
    });
  }
  postChangeEvent() {
    this.dispatchEventToListeners(
      "TransformChanged"
      /* Events.TRANSFORM_CHANGED */
    );
  }
  reset() {
    this.#scale = 1;
    this.#offsetX = 0;
    this.#offsetY = 0;
    this.#rotateX = 0;
    this.#rotateY = 0;
  }
  setMode(mode) {
    if (this.mode === mode) {
      return;
    }
    this.mode = mode;
    this.updateModeButtons();
  }
  updateModeButtons() {
    for (const mode in this.modeButtons) {
      this.modeButtons[mode].setToggled(mode === this.mode);
    }
  }
  resetAndNotify(event) {
    this.reset();
    this.postChangeEvent();
    if (event) {
      event.preventDefault();
    }
    this.element.focus();
  }
  setScaleConstraints(minScale, maxScale) {
    this.minScale = minScale;
    this.maxScale = maxScale;
    this.#scale = Platform2.NumberUtilities.clamp(this.#scale, minScale, maxScale);
  }
  clampOffsets(minX, maxX, minY, maxY) {
    this.#offsetX = Platform2.NumberUtilities.clamp(this.#offsetX, minX, maxX);
    this.#offsetY = Platform2.NumberUtilities.clamp(this.#offsetY, minY, maxY);
  }
  scale() {
    return this.#scale;
  }
  offsetX() {
    return this.#offsetX;
  }
  offsetY() {
    return this.#offsetY;
  }
  rotateX() {
    return this.#rotateX;
  }
  rotateY() {
    return this.#rotateY;
  }
  onScale(scaleFactor, x, y) {
    scaleFactor = Platform2.NumberUtilities.clamp(this.#scale * scaleFactor, this.minScale, this.maxScale) / this.#scale;
    this.#scale *= scaleFactor;
    this.#offsetX -= (x - this.#offsetX) * (scaleFactor - 1);
    this.#offsetY -= (y - this.#offsetY) * (scaleFactor - 1);
    this.postChangeEvent();
  }
  onPan(offsetX, offsetY) {
    this.#offsetX += offsetX;
    this.#offsetY += offsetY;
    this.postChangeEvent();
  }
  onRotate(rotateX, rotateY) {
    this.#rotateX = rotateX;
    this.#rotateY = rotateY;
    this.postChangeEvent();
  }
  async onKeyboardZoom(zoomFactor) {
    this.onScale(zoomFactor, this.element.clientWidth / 2, this.element.clientHeight / 2);
    return true;
  }
  async onKeyboardPanOrRotate(xMultiplier, yMultiplier) {
    const panStepInPixels = 6;
    const rotateStepInDegrees = 5;
    if (this.mode === "Rotate") {
      this.onRotate(this.#rotateX + yMultiplier * rotateStepInDegrees, this.#rotateY + xMultiplier * rotateStepInDegrees);
    } else {
      this.onPan(xMultiplier * panStepInPixels, yMultiplier * panStepInPixels);
    }
    return true;
  }
  onMouseWheel(event) {
    const zoomFactor = 1.1;
    const wheelZoomSpeed = 1 / 53;
    const mouseEvent = event;
    const scaleFactor = Math.pow(zoomFactor, -mouseEvent.deltaY * wheelZoomSpeed);
    this.onScale(scaleFactor, mouseEvent.clientX - this.element.getBoundingClientRect().left, mouseEvent.clientY - this.element.getBoundingClientRect().top);
  }
  onDrag(event) {
    const { clientX, clientY } = event;
    if (this.mode === "Rotate") {
      this.onRotate(this.oldRotateX + (this.originY - clientY) / this.element.clientHeight * 180, this.oldRotateY - (this.originX - clientX) / this.element.clientWidth * 180);
    } else {
      this.onPan(clientX - this.originX, clientY - this.originY);
      this.originX = clientX;
      this.originY = clientY;
    }
  }
  onDragStart(event) {
    this.element.focus();
    this.originX = event.clientX;
    this.originY = event.clientY;
    this.oldRotateX = this.#rotateX;
    this.oldRotateY = this.#rotateY;
    return true;
  }
  onDragEnd() {
    this.originX = 0;
    this.originY = 0;
    this.oldRotateX = 0;
    this.oldRotateY = 0;
  }
};

// gen/front_end/panels/layer_viewer/Layers3DView.js
var UIStrings5 = {
  /**
   * @description Text of a DOM element in DView of the Layers panel
   */
  noLayerInformation: "No layers detected yet",
  /**
   * @description Text of a DOM element in DView of the Layers panel that explains the panel
   */
  layerExplanation: "On this page you will be able to view and inspect document layers.",
  /**
   * @description Accessibility label for canvas view in Layers tool
   */
  dLayersView: "3D Layers View",
  /**
   * @description Text in DView of the Layers panel
   */
  cantDisplayLayers: "Can't display layers",
  /**
   * @description Text in DView of the Layers panel
   */
  webglSupportIsDisabledInYour: "WebGL support is disabled in your browser.",
  /**
   * @description Text in DView of the Layers panel
   * @example {about:gpu} PH1
   */
  checkSForPossibleReasons: "Check {PH1} for possible reasons.",
  /**
   * @description Text for a checkbox in the toolbar of the Layers panel to show the area of slow scroll rect
   */
  slowScrollRects: "Slow scroll rects",
  /**
   * @description Text for a checkbox in the toolbar of the Layers panel. This is a noun, for a
   * setting meaning 'display paints in the layers viewer'. 'Paints' here means 'paint events' i.e.
   * when the browser draws pixels to the screen.
   */
  paints: "Paints",
  /**
   * @description A context menu item in the DView of the Layers panel
   */
  resetView: "Reset View",
  /**
   * @description A context menu item in the DView of the Layers panel
   */
  showPaintProfiler: "Show Paint Profiler"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/layer_viewer/Layers3DView.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var vertexPositionAttributes = /* @__PURE__ */ new Map();
var vertexColorAttributes = /* @__PURE__ */ new Map();
var textureCoordAttributes = /* @__PURE__ */ new Map();
var uniformMatrixLocations = /* @__PURE__ */ new Map();
var uniformSamplerLocations = /* @__PURE__ */ new Map();
var imageForTexture = /* @__PURE__ */ new Map();
var Layers3DView = class extends Common5.ObjectWrapper.eventMixin(UI4.Widget.VBox) {
  failBanner;
  layerViewHost;
  transformController;
  canvasElement;
  lastSelection;
  layerTree;
  textureManager;
  chromeTextures;
  rects;
  snapshotLayers;
  shaderProgram;
  oldTextureScale;
  depthByLayerId;
  visibleLayers;
  maxDepth;
  scale;
  layerTexture;
  projectionMatrix;
  whiteTexture;
  gl;
  dimensionsForAutoscale;
  needsUpdate;
  updateScheduled;
  panelToolbar;
  showSlowScrollRectsSetting;
  showPaintsSetting;
  mouseDownX;
  mouseDownY;
  constructor(layerViewHost) {
    super({
      jslog: `${VisualLogging3.pane("layers-3d-view")}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(layers3DView_css_default);
    this.contentElement.classList.add("layers-3d-view");
    this.failBanner = new UI4.EmptyWidget.EmptyWidget(i18nString5(UIStrings5.noLayerInformation), i18nString5(UIStrings5.layerExplanation));
    this.layerViewHost = layerViewHost;
    this.layerViewHost.registerView(this);
    this.transformController = new TransformController(
      this.contentElement,
      false,
      false
      /* preventDefaultOnMouseDown */
    );
    this.transformController.addEventListener("TransformChanged", this.update, this);
    this.initToolbar();
    this.canvasElement = this.contentElement.createChild("canvas");
    this.canvasElement.tabIndex = 0;
    this.canvasElement.addEventListener("dblclick", this.onDoubleClick.bind(this), false);
    this.canvasElement.addEventListener("mousedown", this.onMouseDown.bind(this), false);
    this.canvasElement.addEventListener("mouseup", this.onMouseUp.bind(this), false);
    this.canvasElement.addEventListener("mouseleave", this.onMouseMove.bind(this), false);
    this.canvasElement.addEventListener("mousemove", this.onMouseMove.bind(this), false);
    this.canvasElement.addEventListener("contextmenu", this.onContextMenu.bind(this), false);
    this.canvasElement.setAttribute("jslog", `${VisualLogging3.canvas("layers").track({ click: true, drag: true })}`);
    UI4.ARIAUtils.setLabel(this.canvasElement, i18nString5(UIStrings5.dLayersView));
    this.lastSelection = {};
    this.layerTree = null;
    this.updateScheduled = false;
    this.textureManager = new LayerTextureManager(this.update.bind(this));
    this.chromeTextures = [];
    this.rects = [];
    this.snapshotLayers = /* @__PURE__ */ new Map();
    this.layerViewHost.setLayerSnapshotMap(this.snapshotLayers);
    this.layerViewHost.showInternalLayersSetting().addChangeListener(this.update, this);
  }
  setLayerTree(layerTree) {
    this.layerTree = layerTree;
    this.layerTexture = null;
    delete this.oldTextureScale;
    if (this.showPaints()) {
      this.textureManager.setLayerTree(layerTree);
    }
    this.update();
  }
  showImageForLayer(layer, imageURL) {
    if (!imageURL) {
      this.layerTexture = null;
      this.update();
      return;
    }
    void UI4.UIUtils.loadImage(imageURL).then((image) => {
      const texture = image && LayerTextureManager.createTextureForImage(this.gl || null, image);
      this.layerTexture = texture ? { layer, texture } : null;
      this.update();
    });
  }
  onResize() {
    this.resizeCanvas();
    this.update();
  }
  willHide() {
    super.willHide();
    this.textureManager.suspend();
  }
  wasShown() {
    super.wasShown();
    this.textureManager.resume();
    if (!this.needsUpdate) {
      return;
    }
    this.resizeCanvas();
    this.update();
  }
  updateLayerSnapshot(layer) {
    this.textureManager.layerNeedsUpdate(layer);
  }
  setOutline(type, selection) {
    this.lastSelection[type] = selection;
    this.update();
  }
  hoverObject(selection) {
    this.setOutline(OutlineType.Hovered, selection);
  }
  selectObject(selection) {
    this.setOutline(OutlineType.Hovered, null);
    this.setOutline(OutlineType.Selected, selection);
  }
  snapshotForSelection(selection) {
    if (selection.type() === "Snapshot") {
      const snapshotWithRect = selection.snapshot();
      snapshotWithRect.snapshot.addReference();
      return Promise.resolve(snapshotWithRect);
    }
    if (selection.layer()) {
      const promise = selection.layer().snapshots()[0];
      if (promise !== void 0) {
        return promise;
      }
    }
    return Promise.resolve(null);
  }
  initGL(canvas2) {
    const gl = canvas2.getContext("webgl");
    if (!gl) {
      return null;
    }
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.DEPTH_TEST);
    return gl;
  }
  createShader(type, script) {
    if (!this.gl) {
      return;
    }
    const shader = this.gl.createShader(type);
    if (shader && this.shaderProgram) {
      this.gl.shaderSource(shader, script);
      this.gl.compileShader(shader);
      this.gl.attachShader(this.shaderProgram, shader);
    }
  }
  initShaders() {
    if (!this.gl) {
      return;
    }
    this.shaderProgram = this.gl.createProgram();
    if (!this.shaderProgram) {
      return;
    }
    this.createShader(this.gl.FRAGMENT_SHADER, FragmentShader);
    this.createShader(this.gl.VERTEX_SHADER, VertexShader);
    this.gl.linkProgram(this.shaderProgram);
    this.gl.useProgram(this.shaderProgram);
    const aVertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
    this.gl.enableVertexAttribArray(aVertexPositionAttribute);
    vertexPositionAttributes.set(this.shaderProgram, aVertexPositionAttribute);
    const aVertexColorAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexColor");
    this.gl.enableVertexAttribArray(aVertexColorAttribute);
    vertexColorAttributes.set(this.shaderProgram, aVertexColorAttribute);
    const aTextureCoordAttribute = this.gl.getAttribLocation(this.shaderProgram, "aTextureCoord");
    this.gl.enableVertexAttribArray(aTextureCoordAttribute);
    textureCoordAttributes.set(this.shaderProgram, aTextureCoordAttribute);
    const uMatrixLocation = this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
    uniformMatrixLocations.set(this.shaderProgram, uMatrixLocation);
    const uSamplerLocation = this.gl.getUniformLocation(this.shaderProgram, "uSampler");
    uniformSamplerLocations.set(this.shaderProgram, uSamplerLocation);
  }
  resizeCanvas() {
    this.canvasElement.width = this.canvasElement.offsetWidth * window.devicePixelRatio;
    this.canvasElement.height = this.canvasElement.offsetHeight * window.devicePixelRatio;
  }
  updateTransformAndConstraints() {
    const paddingFraction = 0.1;
    const dimensionsForAutoscale = this.dimensionsForAutoscale || { width: 0, height: 0 };
    const viewport = this.layerTree ? this.layerTree.viewportSize() : null;
    const baseWidth = viewport ? viewport.width : dimensionsForAutoscale.width;
    const baseHeight = viewport ? viewport.height : dimensionsForAutoscale.height;
    const canvasWidth = this.canvasElement.width;
    const canvasHeight = this.canvasElement.height;
    const paddingX = canvasWidth * paddingFraction;
    const paddingY = canvasHeight * paddingFraction;
    const scaleX = (canvasWidth - 2 * paddingX) / baseWidth;
    const scaleY = (canvasHeight - 2 * paddingY) / baseHeight;
    const viewScale = Math.min(scaleX, scaleY);
    const minScaleConstraint = Math.min(baseWidth / dimensionsForAutoscale.width, baseHeight / dimensionsForAutoscale.width) / 2;
    this.transformController.setScaleConstraints(minScaleConstraint, 10 / viewScale);
    const scale = this.transformController.scale();
    const rotateX = this.transformController.rotateX();
    const rotateY = this.transformController.rotateY();
    this.scale = scale * viewScale;
    const textureScale = Platform3.NumberUtilities.clamp(this.scale, 0.1, 1);
    if (textureScale !== this.oldTextureScale) {
      this.oldTextureScale = textureScale;
      this.textureManager.setScale(textureScale);
      this.dispatchEventToListeners("ScaleChanged", textureScale);
    }
    const scaleAndRotationMatrix = new WebKitCSSMatrix().scale(scale, scale, scale).translate(canvasWidth / 2, canvasHeight / 2, 0).rotate(rotateX, rotateY, 0).scale(viewScale, viewScale, viewScale).translate(-baseWidth / 2, -baseHeight / 2, 0);
    let bounds;
    for (let i = 0; i < this.rects.length; ++i) {
      bounds = Geometry.boundsForTransformedPoints(scaleAndRotationMatrix, this.rects[i].vertices, bounds);
    }
    if (bounds) {
      this.transformController.clampOffsets((paddingX - bounds.maxX) / window.devicePixelRatio, (canvasWidth - paddingX - bounds.minX) / window.devicePixelRatio, (paddingY - bounds.maxY) / window.devicePixelRatio, (canvasHeight - paddingY - bounds.minY) / window.devicePixelRatio);
    }
    const offsetX = this.transformController.offsetX() * window.devicePixelRatio;
    const offsetY = this.transformController.offsetY() * window.devicePixelRatio;
    this.projectionMatrix = new WebKitCSSMatrix().translate(offsetX, offsetY, 0).multiply(scaleAndRotationMatrix);
    const glProjectionMatrix = new WebKitCSSMatrix().scale(1, -1, -1).translate(-1, -1, 0).scale(2 / this.canvasElement.width, 2 / this.canvasElement.height, 1 / 1e6).multiply(this.projectionMatrix);
    if (this.shaderProgram) {
      const pMatrixUniform = uniformMatrixLocations.get(this.shaderProgram);
      if (this.gl && pMatrixUniform) {
        this.gl.uniformMatrix4fv(pMatrixUniform, false, this.arrayFromMatrix(glProjectionMatrix));
      }
    }
  }
  arrayFromMatrix(m) {
    return new Float32Array([
      m.m11,
      m.m12,
      m.m13,
      m.m14,
      m.m21,
      m.m22,
      m.m23,
      m.m24,
      m.m31,
      m.m32,
      m.m33,
      m.m34,
      m.m41,
      m.m42,
      m.m43,
      m.m44
    ]);
  }
  initWhiteTexture() {
    if (!this.gl) {
      return;
    }
    this.whiteTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.whiteTexture);
    const whitePixel = new Uint8Array([255, 255, 255, 255]);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, whitePixel);
  }
  initChromeTextures() {
    function loadChromeTexture(index, url) {
      void UI4.UIUtils.loadImage(url).then((image) => {
        this.chromeTextures[index] = image && LayerTextureManager.createTextureForImage(this.gl || null, image) || void 0;
      });
    }
    loadChromeTexture.call(this, 0, "Images/chromeLeft.avif");
    loadChromeTexture.call(this, 1, "Images/chromeMiddle.avif");
    loadChromeTexture.call(this, 2, "Images/chromeRight.avif");
  }
  initGLIfNecessary() {
    if (this.gl) {
      return this.gl;
    }
    this.gl = this.initGL(this.canvasElement);
    if (!this.gl) {
      return null;
    }
    this.initShaders();
    this.initWhiteTexture();
    this.initChromeTextures();
    this.textureManager.setContext(this.gl);
    return this.gl;
  }
  calculateDepthsAndVisibility() {
    this.depthByLayerId = /* @__PURE__ */ new Map();
    let depth = 0;
    const showInternalLayers = this.layerViewHost.showInternalLayersSetting().get();
    if (!this.layerTree) {
      return;
    }
    const root = showInternalLayers ? this.layerTree.root() : this.layerTree.contentRoot() || this.layerTree.root();
    if (!root) {
      return;
    }
    const queue = [root];
    this.depthByLayerId.set(root.id(), 0);
    this.visibleLayers = /* @__PURE__ */ new Set();
    while (queue.length > 0) {
      const layer = queue.shift();
      if (!layer) {
        break;
      }
      if (showInternalLayers || layer.drawsContent()) {
        this.visibleLayers.add(layer);
      }
      const children = layer.children();
      for (let i = 0; i < children.length; ++i) {
        this.depthByLayerId.set(children[i].id(), ++depth);
        queue.push(children[i]);
      }
    }
    this.maxDepth = depth;
  }
  depthForLayer(layer) {
    return (this.depthByLayerId.get(layer.id()) || 0) * LayerSpacing;
  }
  calculateScrollRectDepth(layer, index) {
    return this.depthForLayer(layer) + index * ScrollRectSpacing + 1;
  }
  updateDimensionsForAutoscale(layer) {
    if (!this.dimensionsForAutoscale) {
      this.dimensionsForAutoscale = { width: 0, height: 0 };
    }
    this.dimensionsForAutoscale.width = Math.max(layer.width(), this.dimensionsForAutoscale.width);
    this.dimensionsForAutoscale.height = Math.max(layer.height(), this.dimensionsForAutoscale.height);
  }
  calculateLayerRect(layer) {
    if (!this.visibleLayers.has(layer)) {
      return;
    }
    const selection = new LayerSelection(layer);
    const rect = new Rectangle(selection);
    rect.setVertices(layer.quad(), this.depthForLayer(layer));
    this.appendRect(rect);
    this.updateDimensionsForAutoscale(layer);
  }
  appendRect(rect) {
    const selection = rect.relatedObject;
    const isSelected = Selection.isEqual(this.lastSelection[OutlineType.Selected], selection);
    const isHovered = Selection.isEqual(this.lastSelection[OutlineType.Hovered], selection);
    if (isSelected) {
      rect.borderColor = SelectedBorderColor;
    } else if (isHovered) {
      rect.borderColor = HoveredBorderColor;
      const fillColor = rect.fillColor || [255, 255, 255, 1];
      const maskColor = HoveredImageMaskColor;
      rect.fillColor = [
        fillColor[0] * maskColor[0] / 255,
        fillColor[1] * maskColor[1] / 255,
        fillColor[2] * maskColor[2] / 255,
        fillColor[3] * maskColor[3]
      ];
    } else {
      rect.borderColor = BorderColor;
    }
    rect.lineWidth = isSelected ? SelectedBorderWidth : BorderWidth;
    this.rects.push(rect);
  }
  calculateLayerScrollRects(layer) {
    const scrollRects = layer.scrollRects();
    for (let i = 0; i < scrollRects.length; ++i) {
      const selection = new ScrollRectSelection(layer, i);
      const rect = new Rectangle(selection);
      rect.calculateVerticesFromRect(layer, scrollRects[i].rect, this.calculateScrollRectDepth(layer, i));
      rect.fillColor = ScrollRectBackgroundColor;
      this.appendRect(rect);
    }
  }
  calculateLayerTileRects(layer) {
    const tiles = this.textureManager.tilesForLayer(layer);
    for (let i = 0; i < tiles.length; ++i) {
      const tile = tiles[i];
      if (!tile.texture) {
        continue;
      }
      const selection = new SnapshotSelection(layer, { rect: tile.rect, snapshot: tile.snapshot });
      const rect = new Rectangle(selection);
      if (!this.snapshotLayers.has(layer)) {
        this.snapshotLayers.set(layer, selection);
      }
      rect.calculateVerticesFromRect(layer, tile.rect, this.depthForLayer(layer) + 1);
      rect.texture = tile.texture;
      this.appendRect(rect);
    }
  }
  calculateRects() {
    this.rects = [];
    this.snapshotLayers.clear();
    this.dimensionsForAutoscale = { width: 0, height: 0 };
    if (this.layerTree) {
      this.layerTree.forEachLayer(this.calculateLayerRect.bind(this));
    }
    if (this.showSlowScrollRectsSetting && this.showSlowScrollRectsSetting.get() && this.layerTree) {
      this.layerTree.forEachLayer(this.calculateLayerScrollRects.bind(this));
    }
    if (this.layerTexture && this.visibleLayers.has(this.layerTexture.layer)) {
      const layer = this.layerTexture.layer;
      const selection = new LayerSelection(layer);
      const rect = new Rectangle(selection);
      rect.setVertices(layer.quad(), this.depthForLayer(layer));
      rect.texture = this.layerTexture.texture;
      this.appendRect(rect);
    } else if (this.showPaints() && this.layerTree) {
      this.layerTree.forEachLayer(this.calculateLayerTileRects.bind(this));
    }
  }
  makeColorsArray(color) {
    let colors = [];
    const normalizedColor = [color[0] / 255, color[1] / 255, color[2] / 255, color[3]];
    for (let i = 0; i < 4; i++) {
      colors = colors.concat(normalizedColor);
    }
    return colors;
  }
  setVertexAttribute(attribute, array, length) {
    const gl = this.gl;
    if (!gl) {
      return;
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);
    gl.vertexAttribPointer(attribute, length, gl.FLOAT, false, 0, 0);
  }
  // This view currently draws every rect, every frame
  // It'd be far more effectient to retain the buffers created in setVertexAttribute,
  // and manipulate them as needed.
  // TODO(crbug.com/1473451): consider those optimizations or porting to 3D css transforms
  drawRectangle(vertices, mode, color, texture) {
    const gl = this.gl;
    const white = [255, 255, 255, 1];
    color = color || white;
    if (!this.shaderProgram) {
      return;
    }
    const vertexPositionAttribute = vertexPositionAttributes.get(this.shaderProgram);
    const textureCoordAttribute = textureCoordAttributes.get(this.shaderProgram);
    const vertexColorAttribute = vertexColorAttributes.get(this.shaderProgram);
    if (typeof vertexPositionAttribute !== "undefined") {
      this.setVertexAttribute(vertexPositionAttribute, vertices, 3);
    }
    if (typeof textureCoordAttribute !== "undefined") {
      this.setVertexAttribute(textureCoordAttribute, [0, 1, 1, 1, 1, 0, 0, 0], 2);
    }
    if (typeof vertexColorAttribute !== "undefined") {
      this.setVertexAttribute(vertexColorAttribute, this.makeColorsArray(color), color.length);
    }
    if (!gl) {
      return;
    }
    const samplerUniform = uniformSamplerLocations.get(this.shaderProgram);
    if (texture) {
      if (samplerUniform) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(samplerUniform, 0);
      }
    } else if (this.whiteTexture) {
      gl.bindTexture(gl.TEXTURE_2D, this.whiteTexture);
    }
    const numberOfVertices = vertices.length / 3;
    gl.drawArrays(mode, 0, numberOfVertices);
  }
  drawTexture(vertices, texture, color) {
    if (!this.gl) {
      return;
    }
    this.drawRectangle(vertices, this.gl.TRIANGLE_FAN, color, texture);
  }
  drawViewportAndChrome() {
    if (!this.layerTree) {
      return;
    }
    const viewport = this.layerTree.viewportSize();
    if (!viewport) {
      return;
    }
    const drawChrome = !Common5.Settings.Settings.instance().moduleSetting("frame-viewer-hide-chrome-window").get() && this.chromeTextures.length >= 3 && this.chromeTextures.indexOf(void 0) < 0;
    const z = (this.maxDepth + 1) * LayerSpacing;
    const borderWidth = Math.ceil(ViewportBorderWidth * this.scale);
    let vertices = [viewport.width, 0, z, viewport.width, viewport.height, z, 0, viewport.height, z, 0, 0, z];
    if (!this.gl) {
      return;
    }
    this.gl.lineWidth(borderWidth);
    this.drawRectangle(vertices, drawChrome ? this.gl.LINE_STRIP : this.gl.LINE_LOOP, ViewportBorderColor);
    if (!drawChrome) {
      return;
    }
    const viewportSize = this.layerTree.viewportSize();
    if (!viewportSize) {
      return;
    }
    const borderAdjustment = ViewportBorderWidth / 2;
    const viewportWidth = viewportSize.width + 2 * borderAdjustment;
    if (this.chromeTextures[0] && this.chromeTextures[2]) {
      const chromeTextureImage = imageForTexture.get(this.chromeTextures[0]) || { naturalHeight: 0, naturalWidth: 0 };
      const chromeHeight = chromeTextureImage.naturalHeight;
      const middleTextureImage = imageForTexture.get(this.chromeTextures[2]) || { naturalHeight: 0, naturalWidth: 0 };
      const middleFragmentWidth = viewportWidth - chromeTextureImage.naturalWidth - middleTextureImage.naturalWidth;
      let x = -borderAdjustment;
      const y = -chromeHeight;
      for (let i = 0; i < this.chromeTextures.length; ++i) {
        const texture = this.chromeTextures[i];
        if (!texture) {
          continue;
        }
        const image = imageForTexture.get(texture);
        if (!image) {
          continue;
        }
        const width = i === 1 ? middleFragmentWidth : image.naturalWidth;
        if (width < 0 || x + width > viewportWidth) {
          break;
        }
        vertices = [x, y, z, x + width, y, z, x + width, y + chromeHeight, z, x, y + chromeHeight, z];
        this.drawTexture(vertices, this.chromeTextures[i]);
        x += width;
      }
    }
  }
  drawViewRect(rect) {
    if (!this.gl) {
      return;
    }
    const vertices = rect.vertices;
    if (rect.texture) {
      this.drawTexture(vertices, rect.texture, rect.fillColor || void 0);
    } else if (rect.fillColor) {
      this.drawRectangle(vertices, this.gl.TRIANGLE_FAN, rect.fillColor);
    }
    this.gl.lineWidth(rect.lineWidth);
    if (rect.borderColor) {
      this.drawRectangle(vertices, this.gl.LINE_LOOP, rect.borderColor);
    }
  }
  update() {
    if (!this.isShowing()) {
      this.needsUpdate = true;
      return;
    }
    if (!this.updateScheduled) {
      this.updateScheduled = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        this.updateScheduled = false;
        this.#update();
      }));
    }
  }
  #update() {
    if (!this.layerTree?.root()) {
      this.failBanner.show(this.contentElement);
      return;
    }
    const gl = this.initGLIfNecessary();
    if (!gl) {
      this.failBanner.detach();
      this.failBanner = this.webglDisabledBanner();
      this.failBanner.show(this.contentElement);
      return;
    }
    this.failBanner.detach();
    const viewportWidth = this.canvasElement.width;
    const viewportHeight = this.canvasElement.height;
    this.calculateDepthsAndVisibility();
    this.calculateRects();
    this.updateTransformAndConstraints();
    gl.viewport(0, 0, viewportWidth, viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.rects.forEach(this.drawViewRect.bind(this));
    this.drawViewportAndChrome();
  }
  webglDisabledBanner() {
    const emptyWidget = new UI4.EmptyWidget.EmptyWidget(i18nString5(UIStrings5.cantDisplayLayers), i18nString5(UIStrings5.webglSupportIsDisabledInYour));
    emptyWidget.contentElement.appendChild(uiI18n.getFormatLocalizedString(str_5, UIStrings5.checkSForPossibleReasons, { PH1: UI4.XLink.XLink.create("about:gpu", void 0, void 0, void 0, "about-gpu") }));
    return emptyWidget;
  }
  selectionFromEventPoint(event) {
    const mouseEvent = event;
    if (!this.layerTree) {
      return null;
    }
    let closestIntersectionPoint = Infinity;
    let closestObject = null;
    const projectionMatrix = new WebKitCSSMatrix().scale(1, -1, -1).translate(-1, -1, 0).multiply(this.projectionMatrix);
    const x0 = (mouseEvent.clientX - this.canvasElement.getBoundingClientRect().left) * window.devicePixelRatio;
    const y0 = -(mouseEvent.clientY - this.canvasElement.getBoundingClientRect().top) * window.devicePixelRatio;
    function checkIntersection(rect) {
      if (!rect.relatedObject) {
        return;
      }
      const t = rect.intersectWithLine(projectionMatrix, x0, y0);
      if (t && t < closestIntersectionPoint) {
        closestIntersectionPoint = t;
        closestObject = rect.relatedObject;
      }
    }
    this.rects.forEach(checkIntersection);
    return closestObject;
  }
  createVisibilitySetting(caption, name, value, toolbar2) {
    const setting = Common5.Settings.Settings.instance().createSetting(name, value);
    setting.setTitle(caption);
    setting.addChangeListener(this.update, this);
    toolbar2.appendToolbarItem(new UI4.Toolbar.ToolbarSettingCheckbox(setting));
    return setting;
  }
  initToolbar() {
    this.panelToolbar = this.transformController.toolbar();
    this.contentElement.appendChild(this.panelToolbar);
    this.showPaintsSetting = this.createVisibilitySetting(i18nString5(UIStrings5.paints), "frame-viewer-show-paints", false, this.panelToolbar);
    this.showSlowScrollRectsSetting = this.createVisibilitySetting(i18nString5(UIStrings5.slowScrollRects), "frame-viewer-show-slow-scroll-rects", true, this.panelToolbar);
    this.showPaintsSetting.addChangeListener(this.updatePaints, this);
    Common5.Settings.Settings.instance().moduleSetting("frame-viewer-hide-chrome-window").addChangeListener(this.update, this);
  }
  onContextMenu(event) {
    const contextMenu = new UI4.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString5(UIStrings5.resetView), () => this.transformController.resetAndNotify(), {
      jslogContext: "layers.3d-center"
    });
    const selection = this.selectionFromEventPoint(event);
    if (selection && selection.type() === "Snapshot") {
      contextMenu.defaultSection().appendItem(i18nString5(UIStrings5.showPaintProfiler), () => this.dispatchEventToListeners("PaintProfilerRequested", selection), {
        jslogContext: "layers.paint-profiler"
      });
    }
    this.layerViewHost.showContextMenu(contextMenu, selection);
  }
  onMouseMove(event) {
    const mouseEvent = event;
    if (mouseEvent.which) {
      return;
    }
    this.layerViewHost.hoverObject(this.selectionFromEventPoint(event));
  }
  onMouseDown(event) {
    const mouseEvent = event;
    this.mouseDownX = mouseEvent.clientX;
    this.mouseDownY = mouseEvent.clientY;
  }
  onMouseUp(event) {
    const mouseEvent = event;
    const maxDistanceInPixels = 6;
    if (this.mouseDownX && Math.abs(mouseEvent.clientX - this.mouseDownX) < maxDistanceInPixels && Math.abs(mouseEvent.clientY - (this.mouseDownY || 0)) < maxDistanceInPixels) {
      this.canvasElement.focus();
      this.layerViewHost.selectObject(this.selectionFromEventPoint(event));
    }
    delete this.mouseDownX;
    delete this.mouseDownY;
  }
  onDoubleClick(event) {
    const selection = this.selectionFromEventPoint(event);
    if (selection && (selection.type() === "Snapshot" || selection.layer())) {
      this.dispatchEventToListeners("PaintProfilerRequested", selection);
    }
    event.stopPropagation();
  }
  updatePaints() {
    if (this.showPaints()) {
      this.textureManager.setLayerTree(this.layerTree);
      this.textureManager.forceUpdate();
    } else {
      this.textureManager.reset();
    }
    this.update();
  }
  showPaints() {
    return this.showPaintsSetting ? this.showPaintsSetting.get() : false;
  }
};
var OutlineType;
(function(OutlineType2) {
  OutlineType2["Hovered"] = "hovered";
  OutlineType2["Selected"] = "selected";
})(OutlineType || (OutlineType = {}));
var FragmentShader = "precision mediump float;\nvarying vec4 vColor;\nvarying vec2 vTextureCoord;\nuniform sampler2D uSampler;\nvoid main(void)\n{\n    gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t)) * vColor;\n}";
var VertexShader = "attribute vec3 aVertexPosition;\nattribute vec2 aTextureCoord;\nattribute vec4 aVertexColor;\nuniform mat4 uPMatrix;\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nvoid main(void)\n{\ngl_Position = uPMatrix * vec4(aVertexPosition, 1.0);\nvColor = aVertexColor;\nvTextureCoord = aTextureCoord;\n}";
var HoveredBorderColor = [0, 0, 255, 1];
var SelectedBorderColor = [0, 255, 0, 1];
var BorderColor = [0, 0, 0, 1];
var ViewportBorderColor = [160, 160, 160, 1];
var ScrollRectBackgroundColor = [178, 100, 100, 0.6];
var HoveredImageMaskColor = [200, 200, 255, 1];
var BorderWidth = 1;
var SelectedBorderWidth = 2;
var ViewportBorderWidth = 3;
var LayerSpacing = 20;
var ScrollRectSpacing = 4;
var LayerTextureManager = class {
  textureUpdatedCallback;
  throttler;
  scale;
  active;
  queue;
  tilesByLayer;
  gl;
  constructor(textureUpdatedCallback) {
    this.textureUpdatedCallback = textureUpdatedCallback;
    this.throttler = new Common5.Throttler.Throttler(0);
    this.scale = 0;
    this.active = false;
    this.reset();
  }
  static createTextureForImage(gl, image) {
    if (!gl) {
      throw new Error("WebGLRenderingContext not provided");
    }
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error("Unable to create texture");
    }
    imageForTexture.set(texture, image);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  }
  reset() {
    if (this.tilesByLayer) {
      this.setLayerTree(null);
    }
    this.tilesByLayer = /* @__PURE__ */ new Map();
    this.queue = [];
  }
  setContext(glContext) {
    this.gl = glContext;
    if (this.scale) {
      this.updateTextures();
    }
  }
  suspend() {
    this.active = false;
  }
  resume() {
    this.active = true;
    if (this.queue.length) {
      void this.update();
    }
  }
  setLayerTree(layerTree) {
    const newLayers = /* @__PURE__ */ new Set();
    const oldLayers = Array.from(this.tilesByLayer.keys());
    if (layerTree) {
      layerTree.forEachLayer((layer) => {
        if (!layer.drawsContent()) {
          return;
        }
        newLayers.add(layer);
        if (!this.tilesByLayer.has(layer)) {
          this.tilesByLayer.set(layer, []);
          this.layerNeedsUpdate(layer);
        }
      });
    }
    if (!oldLayers.length) {
      this.forceUpdate();
    }
    for (const layer of oldLayers) {
      if (newLayers.has(layer)) {
        continue;
      }
      const tiles = this.tilesByLayer.get(layer);
      if (tiles) {
        tiles.forEach((tile) => tile.dispose());
      }
      this.tilesByLayer.delete(layer);
    }
  }
  setSnapshotsForLayer(layer, snapshots) {
    const oldSnapshotsToTiles = new Map((this.tilesByLayer.get(layer) || []).map((tile) => [tile.snapshot, tile]));
    const newTiles = [];
    const reusedTiles = [];
    for (const snapshot of snapshots) {
      const oldTile = oldSnapshotsToTiles.get(snapshot.snapshot);
      if (oldTile) {
        reusedTiles.push(oldTile);
        oldSnapshotsToTiles.delete(snapshot.snapshot);
      } else {
        newTiles.push(new Tile(snapshot));
      }
    }
    this.tilesByLayer.set(layer, reusedTiles.concat(newTiles));
    for (const tile of oldSnapshotsToTiles.values()) {
      tile.dispose();
    }
    const gl = this.gl;
    if (!gl || !this.scale) {
      return Promise.resolve();
    }
    return Promise.all(newTiles.map((tile) => tile.update(gl, this.scale))).then(this.textureUpdatedCallback);
  }
  setScale(scale) {
    if (this.scale && this.scale >= scale) {
      return;
    }
    this.scale = scale;
    this.updateTextures();
  }
  tilesForLayer(layer) {
    return this.tilesByLayer.get(layer) || [];
  }
  layerNeedsUpdate(layer) {
    if (this.queue.indexOf(layer) < 0) {
      this.queue.push(layer);
    }
    if (this.active) {
      void this.throttler.schedule(this.update.bind(this));
    }
  }
  forceUpdate() {
    this.queue.forEach((layer) => this.updateLayer(layer));
    this.queue = [];
    void this.update();
  }
  update() {
    const layer = this.queue.shift();
    if (!layer) {
      return Promise.resolve();
    }
    if (this.queue.length) {
      void this.throttler.schedule(this.update.bind(this));
    }
    return this.updateLayer(layer);
  }
  updateLayer(layer) {
    return Promise.all(layer.snapshots()).then((snapshots) => this.setSnapshotsForLayer(layer, snapshots.filter((snapshot) => snapshot !== null)));
  }
  updateTextures() {
    if (!this.gl) {
      return;
    }
    if (!this.scale) {
      return;
    }
    for (const tiles of this.tilesByLayer.values()) {
      for (const tile of tiles) {
        const promise = tile.updateScale(this.gl, this.scale);
        if (promise) {
          void promise.then(this.textureUpdatedCallback);
        }
      }
    }
  }
};
var Rectangle = class {
  relatedObject;
  lineWidth;
  borderColor;
  fillColor;
  texture;
  vertices;
  constructor(relatedObject) {
    this.relatedObject = relatedObject;
    this.lineWidth = 1;
    this.borderColor = null;
    this.fillColor = null;
    this.texture = null;
  }
  setVertices(quad, z) {
    this.vertices = [quad[0], quad[1], z, quad[2], quad[3], z, quad[4], quad[5], z, quad[6], quad[7], z];
  }
  /**
   * Finds coordinates of point on layer quad, having offsets (ratioX * width) and (ratioY * height)
   * from the left corner of the initial layer rect, where width and heigth are layer bounds.
   */
  calculatePointOnQuad(quad, ratioX, ratioY) {
    const x0 = quad[0];
    const y0 = quad[1];
    const x1 = quad[2];
    const y1 = quad[3];
    const x2 = quad[4];
    const y2 = quad[5];
    const x3 = quad[6];
    const y3 = quad[7];
    const firstSidePointX = x0 + ratioX * (x1 - x0);
    const firstSidePointY = y0 + ratioX * (y1 - y0);
    const thirdSidePointX = x3 + ratioX * (x2 - x3);
    const thirdSidePointY = y3 + ratioX * (y2 - y3);
    const x = firstSidePointX + ratioY * (thirdSidePointX - firstSidePointX);
    const y = firstSidePointY + ratioY * (thirdSidePointY - firstSidePointY);
    return [x, y];
  }
  calculateVerticesFromRect(layer, rect, z) {
    const quad = layer.quad();
    const rx1 = rect.x / layer.width();
    const rx2 = (rect.x + rect.width) / layer.width();
    const ry1 = rect.y / layer.height();
    const ry2 = (rect.y + rect.height) / layer.height();
    const rectQuad = this.calculatePointOnQuad(quad, rx1, ry1).concat(this.calculatePointOnQuad(quad, rx2, ry1)).concat(this.calculatePointOnQuad(quad, rx2, ry2)).concat(this.calculatePointOnQuad(quad, rx1, ry2));
    this.setVertices(rectQuad, z);
  }
  /**
   * Intersects quad with given transform matrix and line l(t) = (x0, y0, t)
   */
  intersectWithLine(matrix, x0, y0) {
    let i;
    const points = [];
    for (i = 0; i < 4; ++i) {
      points[i] = Geometry.multiplyVectorByMatrixAndNormalize(new Geometry.Vector(this.vertices[i * 3], this.vertices[i * 3 + 1], this.vertices[i * 3 + 2]), matrix);
    }
    const normal = Geometry.crossProduct(Geometry.subtract(points[1], points[0]), Geometry.subtract(points[2], points[1]));
    const A = normal.x;
    const B = normal.y;
    const C = normal.z;
    const D = -(A * points[0].x + B * points[0].y + C * points[0].z);
    const t = -(D + A * x0 + B * y0) / C;
    const pt = new Geometry.Vector(x0, y0, t);
    const tVects = points.map(Geometry.subtract.bind(null, pt));
    for (i = 0; i < tVects.length; ++i) {
      const product = Geometry.scalarProduct(normal, Geometry.crossProduct(tVects[i], tVects[(i + 1) % tVects.length]));
      if (product < 0) {
        return void 0;
      }
    }
    return t;
  }
};
var Tile = class {
  snapshot;
  rect;
  scale;
  texture;
  gl;
  constructor(snapshotWithRect) {
    this.snapshot = snapshotWithRect.snapshot;
    this.rect = snapshotWithRect.rect;
    this.scale = 0;
    this.texture = null;
  }
  dispose() {
    this.snapshot.release();
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
  }
  updateScale(glContext, scale) {
    if (this.texture && this.scale >= scale) {
      return null;
    }
    return this.update(glContext, scale);
  }
  async update(glContext, scale) {
    this.gl = glContext;
    this.scale = scale;
    const imageURL = await this.snapshot.replay(scale);
    const image = imageURL ? await UI4.UIUtils.loadImage(imageURL) : null;
    this.texture = image ? LayerTextureManager.createTextureForImage(glContext, image) : null;
  }
};

// gen/front_end/panels/layer_viewer/PaintProfilerView.js
var PaintProfilerView_exports = {};
__export(PaintProfilerView_exports, {
  LogPropertyTreeElement: () => LogPropertyTreeElement,
  LogTreeElement: () => LogTreeElement,
  PaintProfilerCategory: () => PaintProfilerCategory,
  PaintProfilerCommandLogView: () => PaintProfilerCommandLogView,
  PaintProfilerView: () => PaintProfilerView
});
import * as Common6 from "./../../core/common/common.js";
import * as i18n11 from "./../../core/i18n/i18n.js";
import * as Platform4 from "./../../core/platform/platform.js";
import * as PerfUI from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as UI5 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/layer_viewer/paintProfiler.css.js
var paintProfiler_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.paint-profiler-overview {
  background-color: var(--sys-color-cdt-base-container);
}

.paint-profiler-canvas-container {
  flex: auto;
  position: relative;
}

.paint-profiler-pie-chart {
  width: 60px !important; /* stylelint-disable-line declaration-no-important */
  height: 60px !important; /* stylelint-disable-line declaration-no-important */
  padding: 2px;
  overflow: hidden;
  font-size: 10px;
}

.paint-profiler-canvas-container canvas {
  z-index: 200;
  background-color: var(--sys-color-cdt-base-container);
  opacity: 95%;
  height: 100%;
  width: 100%;
}

.paint-profiler-canvas-container .overview-grid-window-resizer {
  z-index: 2000;
}

/*# sourceURL=${import.meta.resolve("./paintProfiler.css")} */`;

// gen/front_end/panels/layer_viewer/PaintProfilerView.js
var UIStrings6 = {
  /**
   * @description Text to indicate the progress of a profile
   */
  profiling: "Profiling\u2026",
  /**
   * @description Text in Paint Profiler View of the Layers panel
   */
  shapes: "Shapes",
  /**
   * @description Text in Paint Profiler View of the Layers panel
   */
  bitmap: "Bitmap",
  /**
   * @description Generic label for any text
   */
  text: "Text",
  /**
   * @description Text in Paint Profiler View of the Layers panel
   */
  misc: "Misc",
  /**
   * @description ARIA label for a pie chart that shows the results of the paint profiler
   */
  profilingResults: "Profiling results",
  /**
   * @description Label for command log tree in the Profiler tab
   */
  commandLog: "Command Log"
};
var str_6 = i18n11.i18n.registerUIStrings("panels/layer_viewer/PaintProfilerView.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var categories = null;
var logItemCategoriesMap = null;
var PaintProfilerView = class _PaintProfilerView extends Common6.ObjectWrapper.eventMixin(UI5.Widget.HBox) {
  canvasContainer;
  progressBanner;
  pieChart;
  showImageCallback;
  canvas;
  context;
  #selectionWindow;
  innerBarWidth;
  minBarHeight;
  barPaddingWidth;
  outerBarWidth;
  pendingScale;
  scale;
  samplesPerBar;
  log;
  snapshot;
  logCategories;
  profiles;
  updateImageTimer;
  constructor(showImageCallback) {
    super({ useShadowDom: true });
    this.registerRequiredCSS(paintProfiler_css_default);
    this.contentElement.classList.add("paint-profiler-overview");
    this.canvasContainer = this.contentElement.createChild("div", "paint-profiler-canvas-container");
    this.progressBanner = this.contentElement.createChild("div", "empty-state hidden");
    this.progressBanner.textContent = i18nString6(UIStrings6.profiling);
    this.pieChart = new PerfUI.PieChart.PieChart();
    this.populatePieChart(0, []);
    this.pieChart.classList.add("paint-profiler-pie-chart");
    this.contentElement.appendChild(this.pieChart);
    this.showImageCallback = showImageCallback;
    this.canvas = this.canvasContainer.createChild("canvas", "fill");
    this.context = this.canvas.getContext("2d");
    this.#selectionWindow = new PerfUI.OverviewGrid.Window(this.canvasContainer);
    this.#selectionWindow.addEventListener("WindowChanged", this.onWindowChanged, this);
    this.innerBarWidth = 4 * window.devicePixelRatio;
    this.minBarHeight = window.devicePixelRatio;
    this.barPaddingWidth = 2 * window.devicePixelRatio;
    this.outerBarWidth = this.innerBarWidth + this.barPaddingWidth;
    this.pendingScale = 1;
    this.scale = this.pendingScale;
    this.samplesPerBar = 0;
    this.log = [];
    this.reset();
  }
  static categories() {
    if (!categories) {
      categories = {
        shapes: new PaintProfilerCategory("shapes", i18nString6(UIStrings6.shapes), "rgb(255, 161, 129)"),
        bitmap: new PaintProfilerCategory("bitmap", i18nString6(UIStrings6.bitmap), "rgb(136, 196, 255)"),
        text: new PaintProfilerCategory("text", i18nString6(UIStrings6.text), "rgb(180, 255, 137)"),
        misc: new PaintProfilerCategory("misc", i18nString6(UIStrings6.misc), "rgb(206, 160, 255)")
      };
    }
    return categories;
  }
  static initLogItemCategories() {
    if (!logItemCategoriesMap) {
      const categories2 = _PaintProfilerView.categories();
      const logItemCategories = {};
      logItemCategories["Clear"] = categories2["misc"];
      logItemCategories["DrawPaint"] = categories2["misc"];
      logItemCategories["DrawData"] = categories2["misc"];
      logItemCategories["SetMatrix"] = categories2["misc"];
      logItemCategories["PushCull"] = categories2["misc"];
      logItemCategories["PopCull"] = categories2["misc"];
      logItemCategories["Translate"] = categories2["misc"];
      logItemCategories["Scale"] = categories2["misc"];
      logItemCategories["Concat"] = categories2["misc"];
      logItemCategories["Restore"] = categories2["misc"];
      logItemCategories["SaveLayer"] = categories2["misc"];
      logItemCategories["Save"] = categories2["misc"];
      logItemCategories["BeginCommentGroup"] = categories2["misc"];
      logItemCategories["AddComment"] = categories2["misc"];
      logItemCategories["EndCommentGroup"] = categories2["misc"];
      logItemCategories["ClipRect"] = categories2["misc"];
      logItemCategories["ClipRRect"] = categories2["misc"];
      logItemCategories["ClipPath"] = categories2["misc"];
      logItemCategories["ClipRegion"] = categories2["misc"];
      logItemCategories["DrawPoints"] = categories2["shapes"];
      logItemCategories["DrawRect"] = categories2["shapes"];
      logItemCategories["DrawOval"] = categories2["shapes"];
      logItemCategories["DrawRRect"] = categories2["shapes"];
      logItemCategories["DrawPath"] = categories2["shapes"];
      logItemCategories["DrawVertices"] = categories2["shapes"];
      logItemCategories["DrawDRRect"] = categories2["shapes"];
      logItemCategories["DrawBitmap"] = categories2["bitmap"];
      logItemCategories["DrawBitmapRectToRect"] = categories2["bitmap"];
      logItemCategories["DrawBitmapMatrix"] = categories2["bitmap"];
      logItemCategories["DrawBitmapNine"] = categories2["bitmap"];
      logItemCategories["DrawSprite"] = categories2["bitmap"];
      logItemCategories["DrawPicture"] = categories2["bitmap"];
      logItemCategories["DrawText"] = categories2["text"];
      logItemCategories["DrawPosText"] = categories2["text"];
      logItemCategories["DrawPosTextH"] = categories2["text"];
      logItemCategories["DrawTextOnPath"] = categories2["text"];
      logItemCategoriesMap = logItemCategories;
    }
    return logItemCategoriesMap;
  }
  static categoryForLogItem(logItem) {
    const method = Platform4.StringUtilities.toTitleCase(logItem.method);
    const logItemCategories = _PaintProfilerView.initLogItemCategories();
    let result = logItemCategories[method];
    if (!result) {
      result = _PaintProfilerView.categories()["misc"];
      logItemCategories[method] = result;
    }
    return result;
  }
  onResize() {
    this.update();
  }
  async setSnapshotAndLog(snapshot, log, clipRect) {
    this.reset();
    this.snapshot = snapshot;
    if (this.snapshot) {
      this.snapshot.addReference();
    }
    this.log = log;
    this.logCategories = this.log.map(_PaintProfilerView.categoryForLogItem);
    if (!snapshot) {
      this.update();
      this.populatePieChart(0, []);
      this.#selectionWindow.setResizeEnabled(false);
      return;
    }
    this.#selectionWindow.setResizeEnabled(true);
    this.progressBanner.classList.remove("hidden");
    this.updateImage();
    const profiles = await snapshot.profile(clipRect);
    this.progressBanner.classList.add("hidden");
    this.profiles = profiles;
    this.update();
    this.updatePieChart();
  }
  setScale(scale) {
    const needsUpdate = scale > this.scale;
    const predictiveGrowthFactor = 2;
    this.pendingScale = Math.min(1, scale * predictiveGrowthFactor);
    if (needsUpdate && this.snapshot) {
      this.updateImage();
    }
  }
  update() {
    this.canvas.width = this.canvasContainer.clientWidth * window.devicePixelRatio;
    this.canvas.height = this.canvasContainer.clientHeight * window.devicePixelRatio;
    this.samplesPerBar = 0;
    if (!this.profiles?.length || !this.logCategories) {
      return;
    }
    const maxBars = Math.floor((this.canvas.width - 2 * this.barPaddingWidth) / this.outerBarWidth);
    const sampleCount = this.log.length;
    this.samplesPerBar = Math.ceil(sampleCount / maxBars);
    let maxBarTime = 0;
    const barTimes = [];
    const barHeightByCategory = [];
    let heightByCategory = {};
    for (let i = 0, lastBarIndex = 0, lastBarTime = 0; i < sampleCount; ) {
      let categoryName = this.logCategories[i]?.name || "misc";
      const sampleIndex = this.log[i].commandIndex;
      for (let row = 0; row < this.profiles.length; row++) {
        const sample = this.profiles[row][sampleIndex];
        lastBarTime += sample;
        heightByCategory[categoryName] = (heightByCategory[categoryName] || 0) + sample;
      }
      ++i;
      if (i - lastBarIndex === this.samplesPerBar || i === sampleCount) {
        const factor = this.profiles.length * (i - lastBarIndex);
        lastBarTime /= factor;
        for (categoryName in heightByCategory) {
          heightByCategory[categoryName] /= factor;
        }
        barTimes.push(lastBarTime);
        barHeightByCategory.push(heightByCategory);
        if (lastBarTime > maxBarTime) {
          maxBarTime = lastBarTime;
        }
        lastBarTime = 0;
        heightByCategory = {};
        lastBarIndex = i;
      }
    }
    const paddingHeight = 4 * window.devicePixelRatio;
    const scale = (this.canvas.height - paddingHeight - this.minBarHeight) / maxBarTime;
    for (let i = 0; i < barTimes.length; ++i) {
      for (const categoryName in barHeightByCategory[i]) {
        barHeightByCategory[i][categoryName] *= (barTimes[i] * scale + this.minBarHeight) / barTimes[i];
      }
      this.renderBar(i, barHeightByCategory[i]);
    }
  }
  renderBar(index, heightByCategory) {
    const categories2 = _PaintProfilerView.categories();
    let currentHeight = 0;
    const x = this.barPaddingWidth + index * this.outerBarWidth;
    for (const categoryName in categories2) {
      if (!heightByCategory[categoryName]) {
        continue;
      }
      currentHeight += heightByCategory[categoryName];
      const y = this.canvas.height - currentHeight;
      this.context.fillStyle = categories2[categoryName].color;
      this.context.fillRect(x, y, this.innerBarWidth, heightByCategory[categoryName]);
    }
  }
  onWindowChanged() {
    this.dispatchEventToListeners(
      "WindowChanged"
      /* Events.WINDOW_CHANGED */
    );
    this.updatePieChart();
    if (this.updateImageTimer) {
      return;
    }
    this.updateImageTimer = window.setTimeout(this.updateImage.bind(this), 100);
  }
  updatePieChart() {
    const { total, slices } = this.calculatePieChart();
    this.populatePieChart(total, slices);
  }
  calculatePieChart() {
    const window2 = this.selectionWindow();
    if (!this.profiles?.length || !window2) {
      return { total: 0, slices: [] };
    }
    let totalTime = 0;
    const timeByCategory = {};
    for (let i = window2.left; i < window2.right; ++i) {
      const logEntry = this.log[i];
      const category = _PaintProfilerView.categoryForLogItem(logEntry);
      timeByCategory[category.color] = timeByCategory[category.color] || 0;
      for (let j = 0; j < this.profiles.length; ++j) {
        const time = this.profiles[j][logEntry.commandIndex];
        totalTime += time;
        timeByCategory[category.color] += time;
      }
    }
    const slices = [];
    for (const color in timeByCategory) {
      slices.push({ value: timeByCategory[color] / this.profiles.length, color, title: "" });
    }
    return { total: totalTime / this.profiles.length, slices };
  }
  populatePieChart(total, slices) {
    this.pieChart.data = {
      chartName: i18nString6(UIStrings6.profilingResults),
      size: 55,
      formatter: this.formatPieChartTime.bind(this),
      showLegend: false,
      total,
      slices
    };
  }
  formatPieChartTime(value) {
    return i18n11.TimeUtilities.millisToString(value * 1e3, true);
  }
  selectionWindow() {
    if (!this.log) {
      return null;
    }
    const screenLeft = (this.#selectionWindow.windowLeftRatio || 0) * this.canvas.width;
    const screenRight = (this.#selectionWindow.windowRightRatio || 0) * this.canvas.width;
    const barLeft = Math.floor(screenLeft / this.outerBarWidth);
    const barRight = Math.floor((screenRight + this.innerBarWidth - this.barPaddingWidth / 2) / this.outerBarWidth);
    const stepLeft = Platform4.NumberUtilities.clamp(barLeft * this.samplesPerBar, 0, this.log.length - 1);
    const stepRight = Platform4.NumberUtilities.clamp(barRight * this.samplesPerBar, 0, this.log.length);
    return { left: stepLeft, right: stepRight };
  }
  updateImage() {
    delete this.updateImageTimer;
    let left;
    let right;
    const window2 = this.selectionWindow();
    if (this.profiles?.length && window2) {
      left = this.log[window2.left].commandIndex;
      right = this.log[window2.right - 1].commandIndex;
    }
    const scale = this.pendingScale;
    if (!this.snapshot) {
      return;
    }
    void this.snapshot.replay(scale, left, right).then((image) => {
      if (!image) {
        return;
      }
      this.scale = scale;
      this.showImageCallback(image);
    });
  }
  reset() {
    if (this.snapshot) {
      this.snapshot.release();
    }
    this.snapshot = null;
    this.profiles = null;
    this.#selectionWindow.reset();
    this.#selectionWindow.setResizeEnabled(false);
  }
};
var PaintProfilerCommandLogView = class extends UI5.Widget.VBox {
  treeOutline;
  log;
  treeItemCache;
  selectionWindow;
  constructor() {
    super();
    this.setMinimumSize(100, 25);
    this.element.classList.add("overflow-auto");
    this.treeOutline = new UI5.TreeOutline.TreeOutlineInShadow();
    UI5.ARIAUtils.setLabel(this.treeOutline.contentElement, i18nString6(UIStrings6.commandLog));
    this.element.appendChild(this.treeOutline.element);
    this.setDefaultFocusedElement(this.treeOutline.contentElement);
    this.log = [];
    this.treeItemCache = /* @__PURE__ */ new Map();
  }
  setCommandLog(log) {
    this.log = log;
    this.updateWindow({ left: 0, right: this.log.length });
  }
  appendLogItem(logItem) {
    let treeElement = this.treeItemCache.get(logItem);
    if (!treeElement) {
      treeElement = new LogTreeElement(logItem);
      this.treeItemCache.set(logItem, treeElement);
    } else if (treeElement.parent) {
      return;
    }
    this.treeOutline.appendChild(treeElement);
  }
  updateWindow(selectionWindow) {
    this.selectionWindow = selectionWindow;
    this.requestUpdate();
  }
  performUpdate() {
    if (!this.selectionWindow || !this.log.length) {
      this.treeOutline.removeChildren();
      return Promise.resolve();
    }
    const root = this.treeOutline.rootElement();
    for (; ; ) {
      const child = root.firstChild();
      if (!child || child.logItem.commandIndex >= this.selectionWindow.left) {
        break;
      }
      root.removeChildAtIndex(0);
    }
    for (; ; ) {
      const child = root.lastChild();
      if (!child || child.logItem.commandIndex < this.selectionWindow.right) {
        break;
      }
      root.removeChildAtIndex(root.children().length - 1);
    }
    for (let i = this.selectionWindow.left, right = this.selectionWindow.right; i < right; ++i) {
      this.appendLogItem(this.log[i]);
    }
    return Promise.resolve();
  }
};
var LogTreeElement = class extends UI5.TreeOutline.TreeElement {
  logItem;
  constructor(logItem) {
    super("", Boolean(logItem.params));
    this.logItem = logItem;
  }
  onattach() {
    this.update();
  }
  async onpopulate() {
    for (const param in this.logItem.params) {
      LogPropertyTreeElement.appendLogPropertyItem(this, param, this.logItem.params[param]);
    }
  }
  paramToString(param, name) {
    if (typeof param !== "object") {
      return typeof param === "string" && param.length > 100 ? name : JSON.stringify(param);
    }
    let str = "";
    let keyCount = 0;
    for (const key in param) {
      const paramKey = param[key];
      if (++keyCount > 4 || paramKey === "object" || paramKey === "string" && paramKey.length > 100) {
        return name;
      }
      if (str) {
        str += ", ";
      }
      str += paramKey;
    }
    return str;
  }
  paramsToString(params) {
    let str = "";
    for (const key in params) {
      if (str) {
        str += ", ";
      }
      str += this.paramToString(params[key], key);
    }
    return str;
  }
  update() {
    const title = document.createDocumentFragment();
    UI5.UIUtils.createTextChild(title, this.logItem.method + "(" + this.paramsToString(this.logItem.params) + ")");
    this.title = title;
  }
};
var LogPropertyTreeElement = class _LogPropertyTreeElement extends UI5.TreeOutline.TreeElement {
  property;
  constructor(property) {
    super();
    this.property = property;
  }
  static appendLogPropertyItem(element, name, value) {
    const treeElement = new _LogPropertyTreeElement({ name, value });
    element.appendChild(treeElement);
    if (value && typeof value === "object") {
      for (const property in value) {
        _LogPropertyTreeElement.appendLogPropertyItem(treeElement, property, value[property]);
      }
    }
  }
  onattach() {
    const title = document.createDocumentFragment();
    const nameElement = title.createChild("span", "name");
    nameElement.textContent = this.property.name;
    const separatorElement = title.createChild("span", "separator");
    separatorElement.textContent = ": ";
    if (this.property.value === null || typeof this.property.value !== "object") {
      const valueElement = title.createChild("span", "value");
      valueElement.textContent = JSON.stringify(this.property.value);
      valueElement.classList.add("cm-js-" + (this.property.value === null ? "null" : typeof this.property.value));
    }
    this.title = title;
  }
};
var PaintProfilerCategory = class {
  name;
  title;
  color;
  constructor(name, title, color) {
    this.name = name;
    this.title = title;
    this.color = color;
  }
};
export {
  LayerDetailsView_exports as LayerDetailsView,
  LayerTreeOutline_exports as LayerTreeOutline,
  LayerViewHost_exports as LayerViewHost,
  Layers3DView_exports as Layers3DView,
  PaintProfilerView_exports as PaintProfilerView,
  TransformController_exports as TransformController
};
//# sourceMappingURL=layer_viewer.js.map
