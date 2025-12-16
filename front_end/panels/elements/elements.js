var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/elements/InspectElementModeController.js
var InspectElementModeController_exports = {};
__export(InspectElementModeController_exports, {
  InspectElementModeController: () => InspectElementModeController,
  ToggleSearchActionDelegate: () => ToggleSearchActionDelegate
});
import * as Common15 from "./../../core/common/common.js";
import * as Root8 from "./../../core/root/root.js";
import * as SDK20 from "./../../core/sdk/sdk.js";
import * as UI23 from "./../../ui/legacy/legacy.js";
import * as VisualLogging13 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/ElementsPanel.js
var ElementsPanel_exports = {};
__export(ElementsPanel_exports, {
  CSSPropertyRevealer: () => CSSPropertyRevealer,
  ContextMenuProvider: () => ContextMenuProvider,
  DOMNodeRevealer: () => DOMNodeRevealer,
  ElementsActionDelegate: () => ElementsActionDelegate,
  ElementsPanel: () => ElementsPanel,
  PseudoStateMarkerDecorator: () => PseudoStateMarkerDecorator
});
import * as Common14 from "./../../core/common/common.js";
import * as Host5 from "./../../core/host/host.js";
import * as i18n31 from "./../../core/i18n/i18n.js";
import * as Platform10 from "./../../core/platform/platform.js";
import * as Root7 from "./../../core/root/root.js";
import * as SDK19 from "./../../core/sdk/sdk.js";
import * as Annotations from "./../../models/annotations/annotations.js";
import * as PanelCommon from "./../common/common.js";
import * as Buttons4 from "./../../ui/components/buttons/buttons.js";
import * as TreeOutline13 from "./../../ui/components/tree_outline/tree_outline.js";
import * as UI22 from "./../../ui/legacy/legacy.js";
import * as VisualLogging12 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/AccessibilityTreeView.js
var AccessibilityTreeView_exports = {};
__export(AccessibilityTreeView_exports, {
  AccessibilityTreeView: () => AccessibilityTreeView
});
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as TreeOutline from "./../../ui/components/tree_outline/tree_outline.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/AccessibilityTreeUtils.js
var AccessibilityTreeUtils_exports = {};
__export(AccessibilityTreeUtils_exports, {
  accessibilityNodeRenderer: () => accessibilityNodeRenderer,
  getNodeAndAncestorsFromDOMNode: () => getNodeAndAncestorsFromDOMNode,
  getNodeId: () => getNodeId,
  getRootNode: () => getRootNode,
  sdkNodeToAXTreeNodes: () => sdkNodeToAXTreeNodes
});
import "./components/components.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Lit from "./../../ui/lit/lit.js";
var { html } = Lit;
function isLeafNode(node) {
  return node.numChildren() === 0 && node.role()?.value !== "Iframe";
}
function getModel(frameId) {
  const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
  const model = frame?.resourceTreeModel().target().model(SDK.AccessibilityModel.AccessibilityModel);
  if (!model) {
    throw new Error("Could not instantiate model for frameId");
  }
  return model;
}
async function getRootNode(frameId) {
  const model = getModel(frameId);
  const root = await model.requestRootNode(frameId);
  if (!root) {
    throw new Error("No accessibility root for frame");
  }
  return root;
}
function getFrameIdForNodeOrDocument(node) {
  let frameId;
  if (node instanceof SDK.DOMModel.DOMDocument) {
    frameId = node.body?.frameId();
  } else {
    frameId = node.frameId();
  }
  if (!frameId) {
    throw new Error("No frameId for DOM node");
  }
  return frameId;
}
async function getNodeAndAncestorsFromDOMNode(domNode) {
  let frameId = getFrameIdForNodeOrDocument(domNode);
  const model = getModel(frameId);
  const result = await model.requestAndLoadSubTreeToNode(domNode);
  if (!result) {
    throw new Error("Could not retrieve accessibility node for inspected DOM node");
  }
  const outermostFrameId = SDK.FrameManager.FrameManager.instance().getOutermostFrame()?.id;
  if (!outermostFrameId) {
    return result;
  }
  while (frameId !== outermostFrameId) {
    const node = await SDK.FrameManager.FrameManager.instance().getFrame(frameId)?.getOwnerDOMNodeOrDocument();
    if (!node) {
      break;
    }
    frameId = getFrameIdForNodeOrDocument(node);
    const model2 = getModel(frameId);
    const ancestors = await model2.requestAndLoadSubTreeToNode(node);
    result.push(...ancestors || []);
  }
  return result;
}
async function getChildren(node) {
  if (node.role()?.value === "Iframe") {
    const domNode = await node.deferredDOMNode()?.resolvePromise();
    if (!domNode) {
      throw new Error("Could not find corresponding DOMNode");
    }
    const frameId = domNode.frameOwnerFrameId();
    if (!frameId) {
      throw new Error("No owner frameId on iframe node");
    }
    const localRoot = await getRootNode(frameId);
    return [localRoot];
  }
  return await node.accessibilityModel().requestAXChildren(node.id(), node.getFrameId() || void 0);
}
async function sdkNodeToAXTreeNodes(sdkNode) {
  const treeNodeData = sdkNode;
  if (isLeafNode(sdkNode)) {
    return [{
      treeNodeData,
      id: getNodeId(sdkNode)
    }];
  }
  return [{
    treeNodeData,
    children: async () => {
      const childNodes = await getChildren(sdkNode);
      const childTreeNodes = await Promise.all(childNodes.map((childNode) => sdkNodeToAXTreeNodes(childNode)));
      return childTreeNodes.flat(1);
    },
    id: getNodeId(sdkNode)
  }];
}
function accessibilityNodeRenderer(node) {
  const sdkNode = node.treeNodeData;
  const name = sdkNode.name()?.value || "";
  const role = sdkNode.role()?.value || "";
  const properties = sdkNode.properties() || [];
  const ignored = sdkNode.ignored();
  const id = getNodeId(sdkNode);
  return html`<devtools-accessibility-tree-node .data=${{
    name,
    role,
    ignored,
    properties,
    id
  }}></devtools-accessibility-tree-node>`;
}
function getNodeId(node) {
  return node.getFrameId() + "#" + node.id();
}

// gen/front_end/panels/elements/accessibilityTreeView.css.js
var accessibilityTreeView_css_default = `/**
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.accessibility-tree-view-container {
  height: 100%;
  overflow: auto;
}

/*# sourceURL=${import.meta.resolve("./accessibilityTreeView.css")} */`;

// gen/front_end/panels/elements/AccessibilityTreeView.js
var AccessibilityTreeView = class extends UI.Widget.VBox {
  accessibilityTreeComponent;
  toggleButton;
  inspectedDOMNode = null;
  root = null;
  constructor(toggleButton, accessibilityTreeComponent) {
    super();
    this.registerRequiredCSS(accessibilityTreeView_css_default);
    this.toggleButton = toggleButton;
    this.accessibilityTreeComponent = accessibilityTreeComponent;
    const container = this.contentElement.createChild("div");
    container.classList.add("accessibility-tree-view-container");
    container.setAttribute("jslog", `${VisualLogging.tree("full-accessibility")}`);
    container.appendChild(this.toggleButton);
    container.appendChild(this.accessibilityTreeComponent);
    SDK2.TargetManager.TargetManager.instance().observeModels(SDK2.AccessibilityModel.AccessibilityModel, this, { scoped: true });
    this.accessibilityTreeComponent.addEventListener("itemselected", (event) => {
      const evt = event;
      const axNode = evt.data.node.treeNodeData;
      if (!axNode.isDOMNode()) {
        return;
      }
      const deferredNode = axNode.deferredDOMNode();
      if (deferredNode) {
        deferredNode.resolve((domNode) => {
          if (domNode) {
            this.inspectedDOMNode = domNode;
            void ElementsPanel.instance().revealAndSelectNode(domNode, { showPanel: true, focusNode: true, highlightInOverlay: true });
          }
        });
      }
    });
    this.accessibilityTreeComponent.addEventListener("itemmouseover", (event) => {
      const evt = event;
      evt.data.node.treeNodeData.highlightDOMNode();
    });
    this.accessibilityTreeComponent.addEventListener("itemmouseout", () => {
      SDK2.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    });
  }
  async wasShown() {
    super.wasShown();
    await this.refreshAccessibilityTree();
    if (this.inspectedDOMNode) {
      await this.loadSubTreeIntoAccessibilityModel(this.inspectedDOMNode);
    }
  }
  async refreshAccessibilityTree() {
    if (!this.root) {
      const frameId = SDK2.FrameManager.FrameManager.instance().getOutermostFrame()?.id;
      if (!frameId) {
        throw new Error("No top frame");
      }
      this.root = await getRootNode(frameId);
      if (!this.root) {
        throw new Error("No root");
      }
    }
    await this.renderTree();
    await this.accessibilityTreeComponent.expandRecursively(1);
  }
  async renderTree() {
    if (!this.root) {
      return;
    }
    const treeData = await sdkNodeToAXTreeNodes(this.root);
    this.accessibilityTreeComponent.data = {
      defaultRenderer: accessibilityNodeRenderer,
      tree: treeData,
      filter: (node) => {
        return node.ignored() || node.role()?.value === "generic" && !node.name()?.value ? "FLATTEN" : "SHOW";
      }
    };
  }
  // Given a selected DOM node, asks the model to load the missing subtree from the root to the
  // selected node and then re-renders the tree.
  async loadSubTreeIntoAccessibilityModel(selectedNode) {
    const ancestors = await getNodeAndAncestorsFromDOMNode(selectedNode);
    const inspectedAXNode = ancestors.find((node) => node.backendDOMNodeId() === selectedNode.backendNodeId());
    if (!inspectedAXNode) {
      return;
    }
    await this.accessibilityTreeComponent.expandNodeIds(ancestors.map((node) => node.getFrameId() + "#" + node.id()));
    await this.accessibilityTreeComponent.focusNodeId(getNodeId(inspectedAXNode));
  }
  // A node was revealed through the elements picker.
  async revealAndSelectNode(inspectedNode) {
    if (inspectedNode === this.inspectedDOMNode) {
      return;
    }
    this.inspectedDOMNode = inspectedNode;
    if (this.isShowing()) {
      await this.loadSubTreeIntoAccessibilityModel(inspectedNode);
    }
  }
  // Selected node in the DOM tree has changed.
  async selectedNodeChanged(inspectedNode) {
    if (this.isShowing() || inspectedNode === this.inspectedDOMNode) {
      return;
    }
    if (inspectedNode.ownerDocument && (inspectedNode.nodeName() === "HTML" || inspectedNode.nodeName() === "BODY")) {
      this.inspectedDOMNode = inspectedNode.ownerDocument;
    } else {
      this.inspectedDOMNode = inspectedNode;
    }
  }
  treeUpdated({ data }) {
    if (!this.isShowing()) {
      return;
    }
    if (!data.root) {
      void this.renderTree();
      return;
    }
    const outermostFrameId = SDK2.FrameManager.FrameManager.instance().getOutermostFrame()?.id;
    if (data.root?.getFrameId() !== outermostFrameId) {
      void this.renderTree();
      return;
    }
    this.root = data.root;
    void this.accessibilityTreeComponent.collapseAllNodes();
    void this.refreshAccessibilityTree();
  }
  modelAdded(model) {
    model.addEventListener("TreeUpdated", this.treeUpdated, this);
  }
  modelRemoved(model) {
    model.removeEventListener("TreeUpdated", this.treeUpdated, this);
  }
};

// gen/front_end/panels/elements/ColorSwatchPopoverIcon.js
var ColorSwatchPopoverIcon_exports = {};
__export(ColorSwatchPopoverIcon_exports, {
  BezierPopoverIcon: () => BezierPopoverIcon,
  ColorSwatchPopoverIcon: () => ColorSwatchPopoverIcon,
  FontEditorSectionManager: () => FontEditorSectionManager,
  ShadowSwatchPopoverHelper: () => ShadowSwatchPopoverHelper
});
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as Bindings from "./../../models/bindings/bindings.js";
import * as ColorPicker from "./../../ui/legacy/components/color_picker/color_picker.js";
import * as InlineEditor from "./../../ui/legacy/components/inline_editor/inline_editor.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description Tooltip text for an icon that opens the cubic bezier editor, which is a tool that
   * allows the user to edit cubic-bezier CSS properties directly.
   */
  openCubicBezierEditor: "Open cubic bezier editor",
  /**
   * @description Tooltip text for an icon that opens shadow editor. The shadow editor is a tool
   * which allows the user to edit CSS shadow properties.
   */
  openShadowEditor: "Open shadow editor"
};
var str_ = i18n.i18n.registerUIStrings("panels/elements/ColorSwatchPopoverIcon.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var BezierPopoverIcon = class {
  treeElement;
  swatchPopoverHelper;
  swatch;
  bezierText;
  boundBezierChanged;
  boundOnScroll;
  bezierEditor;
  scrollerElement;
  originalPropertyText;
  constructor({ treeElement, swatchPopoverHelper, swatch, bezierText }) {
    this.treeElement = treeElement;
    this.swatchPopoverHelper = swatchPopoverHelper;
    this.swatch = swatch;
    this.bezierText = bezierText;
    UI2.Tooltip.Tooltip.install(this.swatch, i18nString(UIStrings.openCubicBezierEditor));
    this.swatch.addEventListener("click", this.iconClick.bind(this), false);
    this.swatch.addEventListener("keydown", this.iconClick.bind(this), false);
    this.swatch.addEventListener("mousedown", (event) => event.consume(), false);
    this.boundBezierChanged = this.bezierChanged.bind(this);
    this.boundOnScroll = this.onScroll.bind(this);
  }
  iconClick(event) {
    if (event instanceof KeyboardEvent && !Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      return;
    }
    event.consume(true);
    if (this.swatchPopoverHelper.isShowing()) {
      this.swatchPopoverHelper.hide(true);
      return;
    }
    const model = InlineEditor.AnimationTimingModel.AnimationTimingModel.parse(this.bezierText.innerText) || InlineEditor.AnimationTimingModel.LINEAR_BEZIER;
    this.bezierEditor = new InlineEditor.BezierEditor.BezierEditor(model);
    this.bezierEditor.addEventListener("BezierChanged", this.boundBezierChanged);
    this.swatchPopoverHelper.show(this.bezierEditor, this.swatch, this.onPopoverHidden.bind(this));
    this.scrollerElement = this.swatch.enclosingNodeOrSelfWithClass("style-panes-wrapper");
    if (this.scrollerElement) {
      this.scrollerElement.addEventListener("scroll", this.boundOnScroll, false);
    }
    this.originalPropertyText = this.treeElement.property.propertyText;
    this.treeElement.parentPane().setEditingStyle(true);
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(
      this.treeElement.property,
      false
      /* forName */
    );
    if (uiLocation) {
      void Common.Revealer.reveal(
        uiLocation,
        true
        /* omitFocus */
      );
    }
  }
  bezierChanged(event) {
    this.bezierText.textContent = event.data;
    void this.treeElement.applyStyleText(this.treeElement.renderedPropertyText(), false);
  }
  onScroll(_event) {
    this.swatchPopoverHelper.hide(true);
  }
  onPopoverHidden(commitEdit) {
    if (this.scrollerElement) {
      this.scrollerElement.removeEventListener("scroll", this.boundOnScroll, false);
    }
    if (this.bezierEditor) {
      this.bezierEditor.removeEventListener("BezierChanged", this.boundBezierChanged);
    }
    this.bezierEditor = void 0;
    const propertyText = commitEdit ? this.treeElement.renderedPropertyText() : this.originalPropertyText || "";
    void this.treeElement.applyStyleText(propertyText, true);
    this.treeElement.parentPane().setEditingStyle(false);
    delete this.originalPropertyText;
  }
};
var ColorSwatchPopoverIcon = class _ColorSwatchPopoverIcon extends Common.ObjectWrapper.ObjectWrapper {
  treeElement;
  swatchPopoverHelper;
  swatch;
  contrastInfo;
  boundSpectrumChanged;
  boundOnScroll;
  spectrum;
  scrollerElement;
  originalPropertyText;
  constructor(treeElement, swatchPopoverHelper, swatch) {
    super();
    this.treeElement = treeElement;
    this.swatchPopoverHelper = swatchPopoverHelper;
    this.swatch = swatch;
    this.swatch.addEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, this.iconClick.bind(this));
    this.contrastInfo = null;
    this.boundSpectrumChanged = this.spectrumChanged.bind(this);
    this.boundOnScroll = this.onScroll.bind(this);
  }
  generateCSSVariablesPalette() {
    const matchedStyles = this.treeElement.matchedStyles();
    const style = this.treeElement.property.ownerStyle;
    const cssVariables = matchedStyles.availableCSSVariables(style);
    const colors = [];
    const colorNames = [];
    for (const cssVariable of cssVariables) {
      if (cssVariable === this.treeElement.property.name) {
        continue;
      }
      const value5 = matchedStyles.computeCSSVariable(style, cssVariable);
      if (!value5) {
        continue;
      }
      const color = Common.Color.parse(value5.value);
      if (!color) {
        continue;
      }
      colors.push(value5.value);
      colorNames.push(cssVariable);
    }
    return { title: "CSS Variables", mutable: false, matchUserFormat: true, colors, colorNames };
  }
  setContrastInfo(contrastInfo) {
    this.contrastInfo = contrastInfo;
  }
  iconClick(event) {
    event.consume(true);
    this.showPopover();
  }
  async toggleEyeDropper() {
    await this.spectrum?.toggleColorPicker();
  }
  showPopover() {
    if (this.swatchPopoverHelper.isShowing()) {
      this.swatchPopoverHelper.hide(true);
      return;
    }
    const color = this.swatch.color;
    if (!color) {
      return;
    }
    this.spectrum = new ColorPicker.Spectrum.Spectrum(this.contrastInfo);
    this.spectrum.setColor(color);
    this.spectrum.addPalette(this.generateCSSVariablesPalette());
    this.spectrum.addEventListener("SizeChanged", this.spectrumResized, this);
    this.spectrum.addEventListener("ColorChanged", this.boundSpectrumChanged);
    this.swatchPopoverHelper.show(this.spectrum, this.swatch, this.onPopoverHidden.bind(this));
    this.scrollerElement = this.swatch.enclosingNodeOrSelfWithClass("style-panes-wrapper");
    if (this.scrollerElement) {
      this.scrollerElement.addEventListener("scroll", this.boundOnScroll, false);
    }
    this.originalPropertyText = this.treeElement.property.propertyText;
    this.treeElement.parentPane().setEditingStyle(true);
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(
      this.treeElement.property,
      false
      /* forName */
    );
    if (uiLocation) {
      void Common.Revealer.reveal(
        uiLocation,
        true
        /* omitFocus */
      );
    }
    UI2.Context.Context.instance().setFlavor(_ColorSwatchPopoverIcon, this);
  }
  spectrumResized() {
    this.swatchPopoverHelper.reposition();
  }
  async spectrumChanged(event) {
    const getColor = (colorText) => {
      const color2 = Common.Color.parse(colorText);
      const customProperty = this.spectrum?.colorName()?.startsWith("--") && `var(${this.spectrum.colorName()})`;
      if (!color2 || !customProperty) {
        return color2;
      }
      if (color2.is(
        "hex"
        /* Common.Color.Format.HEX */
      ) || color2.is(
        "hexa"
        /* Common.Color.Format.HEXA */
      ) || color2.is(
        "rgb"
        /* Common.Color.Format.RGB */
      ) || color2.is(
        "rgba"
        /* Common.Color.Format.RGBA */
      )) {
        return new Common.Color.Legacy(color2.rgba(), color2.format(), customProperty);
      }
      if (color2.is(
        "hsl"
        /* Common.Color.Format.HSL */
      )) {
        return new Common.Color.HSL(color2.h, color2.s, color2.l, color2.alpha, customProperty);
      }
      if (color2.is(
        "hwb"
        /* Common.Color.Format.HWB */
      )) {
        return new Common.Color.HWB(color2.h, color2.w, color2.b, color2.alpha, customProperty);
      }
      if (color2.is(
        "lch"
        /* Common.Color.Format.LCH */
      )) {
        return new Common.Color.LCH(color2.l, color2.c, color2.h, color2.alpha, customProperty);
      }
      if (color2.is(
        "oklch"
        /* Common.Color.Format.OKLCH */
      )) {
        return new Common.Color.Oklch(color2.l, color2.c, color2.h, color2.alpha, customProperty);
      }
      if (color2.is(
        "lab"
        /* Common.Color.Format.LAB */
      )) {
        return new Common.Color.Lab(color2.l, color2.a, color2.b, color2.alpha, customProperty);
      }
      if (color2.is(
        "oklab"
        /* Common.Color.Format.OKLAB */
      )) {
        return new Common.Color.Oklab(color2.l, color2.a, color2.b, color2.alpha, customProperty);
      }
      if (color2.is(
        "srgb"
        /* Common.Color.Format.SRGB */
      ) || color2.is(
        "srgb-linear"
        /* Common.Color.Format.SRGB_LINEAR */
      ) || color2.is(
        "display-p3"
        /* Common.Color.Format.DISPLAY_P3 */
      ) || color2.is(
        "a98-rgb"
        /* Common.Color.Format.A98_RGB */
      ) || color2.is(
        "prophoto-rgb"
        /* Common.Color.Format.PROPHOTO_RGB */
      ) || color2.is(
        "rec2020"
        /* Common.Color.Format.REC_2020 */
      ) || color2.is(
        "xyz"
        /* Common.Color.Format.XYZ */
      ) || color2.is(
        "xyz-d50"
        /* Common.Color.Format.XYZ_D50 */
      ) || color2.is(
        "xyz-d65"
        /* Common.Color.Format.XYZ_D65 */
      )) {
        return new Common.Color.ColorFunction(color2.colorSpace, color2.p0, color2.p1, color2.p2, color2.alpha, customProperty);
      }
      throw new Error(`Forgot to handle color format ${color2.format()}`);
    };
    const color = getColor(event.data);
    if (!color) {
      return;
    }
    this.swatch.color = color;
    this.dispatchEventToListeners("colorchanged", color);
  }
  onScroll(_event) {
    this.swatchPopoverHelper.hide(true);
  }
  onPopoverHidden(commitEdit) {
    if (this.scrollerElement) {
      this.scrollerElement.removeEventListener("scroll", this.boundOnScroll, false);
    }
    if (this.spectrum) {
      this.spectrum.removeEventListener("ColorChanged", this.boundSpectrumChanged);
    }
    this.spectrum = void 0;
    const propertyText = commitEdit ? this.treeElement.renderedPropertyText() : this.originalPropertyText || "";
    void this.treeElement.applyStyleText(propertyText, true);
    this.treeElement.parentPane().setEditingStyle(false);
    delete this.originalPropertyText;
    UI2.Context.Context.instance().setFlavor(_ColorSwatchPopoverIcon, null);
  }
};
var ShadowSwatchPopoverHelper = class extends Common.ObjectWrapper.ObjectWrapper {
  treeElement;
  swatchPopoverHelper;
  shadowSwatch;
  iconElement;
  boundShadowChanged;
  boundOnScroll;
  cssShadowEditor;
  scrollerElement;
  originalPropertyText;
  constructor(treeElement, swatchPopoverHelper, shadowSwatch) {
    super();
    this.treeElement = treeElement;
    this.swatchPopoverHelper = swatchPopoverHelper;
    this.shadowSwatch = shadowSwatch;
    this.iconElement = shadowSwatch.iconElement();
    UI2.Tooltip.Tooltip.install(this.iconElement, i18nString(UIStrings.openShadowEditor));
    this.iconElement.addEventListener("click", this.iconClick.bind(this), false);
    this.iconElement.addEventListener("keydown", this.keyDown.bind(this), false);
    this.iconElement.addEventListener("mousedown", (event) => event.consume(), false);
    this.boundShadowChanged = this.shadowChanged.bind(this);
    this.boundOnScroll = this.onScroll.bind(this);
  }
  keyDown(event) {
    if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      event.consume(true);
      this.showPopover();
    }
  }
  iconClick(event) {
    event.consume(true);
    this.showPopover();
  }
  showPopover() {
    if (this.swatchPopoverHelper.isShowing()) {
      this.swatchPopoverHelper.hide(true);
      return;
    }
    this.cssShadowEditor = new InlineEditor.CSSShadowEditor.CSSShadowEditor();
    this.cssShadowEditor.element.classList.toggle("with-padding", true);
    this.cssShadowEditor.setModel(this.shadowSwatch.model());
    this.cssShadowEditor.addEventListener("ShadowChanged", this.boundShadowChanged);
    this.swatchPopoverHelper.show(this.cssShadowEditor, this.iconElement, this.onPopoverHidden.bind(this));
    this.scrollerElement = this.iconElement.enclosingNodeOrSelfWithClass("style-panes-wrapper");
    if (this.scrollerElement) {
      this.scrollerElement.addEventListener("scroll", this.boundOnScroll, false);
    }
    this.originalPropertyText = this.treeElement.property.propertyText;
    this.treeElement.parentPane().setEditingStyle(true);
    const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(
      this.treeElement.property,
      false
      /* forName */
    );
    if (uiLocation) {
      void Common.Revealer.reveal(
        uiLocation,
        true
        /* omitFocus */
      );
    }
  }
  shadowChanged(event) {
    this.dispatchEventToListeners("shadowChanged", event.data);
  }
  onScroll(_event) {
    this.swatchPopoverHelper.hide(true);
  }
  onPopoverHidden(commitEdit) {
    if (this.scrollerElement) {
      this.scrollerElement.removeEventListener("scroll", this.boundOnScroll, false);
    }
    if (this.cssShadowEditor) {
      this.cssShadowEditor.removeEventListener("ShadowChanged", this.boundShadowChanged);
    }
    this.cssShadowEditor = void 0;
    const propertyText = commitEdit ? this.treeElement.renderedPropertyText() : this.originalPropertyText || "";
    void this.treeElement.applyStyleText(propertyText, true);
    this.treeElement.parentPane().setEditingStyle(false);
    delete this.originalPropertyText;
  }
};
var FontEditorSectionManager = class {
  treeElementMap;
  swatchPopoverHelper;
  section;
  parentPane;
  fontEditor;
  scrollerElement;
  boundFontChanged;
  boundOnScroll;
  boundResized;
  constructor(swatchPopoverHelper, section3) {
    this.treeElementMap = /* @__PURE__ */ new Map();
    this.swatchPopoverHelper = swatchPopoverHelper;
    this.section = section3;
    this.parentPane = null;
    this.fontEditor = null;
    this.scrollerElement = null;
    this.boundFontChanged = this.fontChanged.bind(this);
    this.boundOnScroll = this.onScroll.bind(this);
    this.boundResized = this.fontEditorResized.bind(this);
  }
  fontChanged(event) {
    const { propertyName, value: value5 } = event.data;
    const treeElement = this.treeElementMap.get(propertyName);
    void this.updateFontProperty(propertyName, value5, treeElement);
  }
  async updateFontProperty(propertyName, value5, treeElement) {
    if (treeElement?.treeOutline && treeElement.valueElement && treeElement.property.parsedOk && treeElement.property.range) {
      let elementRemoved = false;
      treeElement.valueElement.textContent = value5;
      treeElement.property.value = value5;
      let styleText;
      const propertyName2 = treeElement.property.name;
      if (value5.length) {
        styleText = treeElement.renderedPropertyText();
      } else {
        styleText = "";
        elementRemoved = true;
        this.fixIndex(treeElement.property.index);
      }
      this.treeElementMap.set(propertyName2, treeElement);
      await treeElement.applyStyleText(styleText, true);
      if (elementRemoved) {
        this.treeElementMap.delete(propertyName2);
      }
    } else if (value5.length) {
      const newProperty = this.section.addNewBlankProperty();
      if (newProperty) {
        newProperty.property.name = propertyName;
        newProperty.property.value = value5;
        newProperty.updateTitle();
        await newProperty.applyStyleText(newProperty.renderedPropertyText(), true);
        this.treeElementMap.set(newProperty.property.name, newProperty);
      }
    }
    this.section.onpopulate();
    this.swatchPopoverHelper.reposition();
    return;
  }
  fontEditorResized() {
    this.swatchPopoverHelper.reposition();
  }
  fixIndex(removedIndex) {
    for (const treeElement of this.treeElementMap.values()) {
      if (treeElement.property.index > removedIndex) {
        treeElement.property.index -= 1;
      }
    }
  }
  createPropertyValueMap() {
    const propertyMap = /* @__PURE__ */ new Map();
    for (const fontProperty of this.treeElementMap) {
      const propertyName = fontProperty[0];
      const treeElement = fontProperty[1];
      if (treeElement.property.value.length) {
        propertyMap.set(propertyName, treeElement.property.value);
      } else {
        this.treeElementMap.delete(propertyName);
      }
    }
    return propertyMap;
  }
  registerFontProperty(treeElement) {
    const propertyName = treeElement.property.name;
    if (this.treeElementMap.has(propertyName)) {
      const treeElementFromMap = this.treeElementMap.get(propertyName);
      if (!treeElement.overloaded() || treeElementFromMap?.overloaded()) {
        this.treeElementMap.set(propertyName, treeElement);
      }
    } else {
      this.treeElementMap.set(propertyName, treeElement);
    }
  }
  async showPopover(iconElement, parentPane) {
    if (this.swatchPopoverHelper.isShowing()) {
      this.swatchPopoverHelper.hide(true);
      return;
    }
    this.parentPane = parentPane;
    const propertyValueMap = this.createPropertyValueMap();
    this.fontEditor = new InlineEditor.FontEditor.FontEditor(propertyValueMap);
    this.fontEditor.addEventListener("FontChanged", this.boundFontChanged);
    this.fontEditor.addEventListener("FontEditorResized", this.boundResized);
    this.swatchPopoverHelper.show(this.fontEditor, iconElement, this.onPopoverHidden.bind(this));
    this.scrollerElement = iconElement.enclosingNodeOrSelfWithClass("style-panes-wrapper");
    if (this.scrollerElement) {
      this.scrollerElement.addEventListener("scroll", this.boundOnScroll, false);
    }
    this.parentPane.setEditingStyle(true);
  }
  onScroll() {
    this.swatchPopoverHelper.hide(true);
  }
  onPopoverHidden() {
    if (this.scrollerElement) {
      this.scrollerElement.removeEventListener("scroll", this.boundOnScroll, false);
    }
    this.section.onpopulate();
    if (this.fontEditor) {
      this.fontEditor.removeEventListener("FontChanged", this.boundFontChanged);
    }
    this.fontEditor = null;
    if (this.parentPane) {
      this.parentPane.setEditingStyle(false);
    }
    this.section.resetToolbars();
    this.section.onpopulate();
  }
};

// gen/front_end/panels/elements/ElementsPanel.js
import * as ElementsComponents7 from "./components/components.js";

// gen/front_end/panels/elements/ComputedStyleModel.js
var ComputedStyleModel_exports = {};
__export(ComputedStyleModel_exports, {
  ComputedStyle: () => ComputedStyle,
  ComputedStyleModel: () => ComputedStyleModel
});
import * as Common8 from "./../../core/common/common.js";
import * as Root5 from "./../../core/root/root.js";
import * as SDK11 from "./../../core/sdk/sdk.js";
import * as UI14 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/elements/ComputedStyleWidget.js
var ComputedStyleWidget_exports = {};
__export(ComputedStyleWidget_exports, {
  ComputedStyleWidget: () => ComputedStyleWidget
});
import "./../../ui/legacy/legacy.js";
import * as Common7 from "./../../core/common/common.js";
import * as i18n17 from "./../../core/i18n/i18n.js";
import * as Platform6 from "./../../core/platform/platform.js";
import * as SDK10 from "./../../core/sdk/sdk.js";
import * as TreeOutline6 from "./../../ui/components/tree_outline/tree_outline.js";
import * as InlineEditor4 from "./../../ui/legacy/components/inline_editor/inline_editor.js";
import * as Components4 from "./../../ui/legacy/components/utils/utils.js";
import * as UI13 from "./../../ui/legacy/legacy.js";
import * as Lit5 from "./../../ui/lit/lit.js";
import * as ElementsComponents4 from "./components/components.js";

// gen/front_end/panels/elements/computedStyleSidebarPane.css.js
var computedStyleSidebarPane_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.styles-sidebar-pane-toolbar {
  border-bottom: 1px solid var(--sys-color-divider);
  flex-shrink: 0;
}

.styles-sidebar-computed-style-widget {
  min-height: auto;
}

.styles-pane-toolbar {
  width: 100%;
}

/*# sourceURL=${import.meta.resolve("./computedStyleSidebarPane.css")} */`;

// gen/front_end/panels/elements/ImagePreviewPopover.js
import * as Components from "./../../ui/legacy/components/utils/utils.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
var ImagePreviewPopover = class {
  getLinkElement;
  getDOMNode;
  popover;
  constructor(container, getLinkElement, getDOMNode) {
    this.getLinkElement = getLinkElement;
    this.getDOMNode = getDOMNode;
    this.popover = new UI3.PopoverHelper.PopoverHelper(container, this.handleRequest.bind(this), "elements.image-preview");
    this.popover.setTimeout(0, 100);
  }
  handleRequest(event) {
    const link2 = this.getLinkElement(event);
    if (!link2) {
      return null;
    }
    const href = elementToURLMap.get(link2);
    if (!href) {
      return null;
    }
    return {
      box: link2.boxInWindow(),
      hide: void 0,
      show: async (popover) => {
        const node = this.getDOMNode(link2);
        if (!node) {
          return false;
        }
        const precomputedFeatures = await Components.ImagePreview.ImagePreview.loadDimensionsForNode(node);
        const preview = await Components.ImagePreview.ImagePreview.build(href, true, {
          imageAltText: void 0,
          precomputedFeatures,
          align: "center"
        });
        if (preview) {
          popover.contentElement.appendChild(preview);
        }
        return Boolean(preview);
      }
    };
  }
  hide() {
    this.popover.hidePopover();
  }
  static setImageUrl(element, url) {
    elementToURLMap.set(element, url);
    return element;
  }
  static getImageURL(element) {
    return elementToURLMap.get(element);
  }
};
var elementToURLMap = /* @__PURE__ */ new WeakMap();

// gen/front_end/panels/elements/PlatformFontsWidget.js
var PlatformFontsWidget_exports = {};
__export(PlatformFontsWidget_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  PlatformFontsWidget: () => PlatformFontsWidget
});
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as UI4 from "./../../ui/legacy/legacy.js";
import { html as html2, render } from "./../../ui/lit/lit.js";

// gen/front_end/panels/elements/platformFontsWidget.css.js
var platformFontsWidget_css_default = `/**
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (devtools-widget > *) {
  :scope {
    user-select: text;
  }

  .platform-fonts {
    flex-shrink: 0;
  }

  .font-usage {
    color: var(--sys-color-token-subtle);
    padding-left: 3px;
  }

  .title {
    padding: 0 5px;
    border-top: 1px solid;
    border-bottom: 1px solid;
    border-color: var(--sys-color-divider);
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    height: 24px;
    background-color: var(--sys-color-surface2);
    display: flex;
    align-items: center;
  }

  .font-stats-item {
    padding: 5px 1em;

    div {
      margin-bottom: 2px;
    }

    &:not(:last-child) {
      border-bottom: 1px solid var(--sys-color-divider);
    }
  }
}

/*# sourceURL=${import.meta.resolve("./platformFontsWidget.css")} */`;

// gen/front_end/panels/elements/PlatformFontsWidget.js
var UIStrings2 = {
  /**
   * @description Section title text content in Platform Fonts Widget of the Elements panel
   */
  renderedFonts: "Rendered Fonts",
  /**
   * @description Font property title text content in Platform Fonts Widget of the Elements panel
   */
  familyName: "Family name",
  /**
   * @description Font property title text content in Platform Fonts Widget of the Elements panel
   */
  postScriptName: "PostScript name",
  /**
   * @description Font property title text content in Platform Fonts Widget of the Elements panel
   */
  fontOrigin: "Font origin",
  /**
   * @description Text in Platform Fonts Widget of the Elements panel
   */
  networkResource: "Network resource",
  /**
   * @description Text in Platform Fonts Widget of the Elements panel
   */
  localFile: "Local file",
  /**
   * @description Text in Platform Fonts Widget of the Elements panel. Indicates a number of glyphs (characters) .
   */
  dGlyphs: "{n, plural, =1 {(# glyph)} other {(# glyphs)}}"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/elements/PlatformFontsWidget.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var DEFAULT_VIEW = (input, _output, target) => {
  const isEmptySection = !input.platformFonts?.length;
  render(html2`
    <style>${platformFontsWidget_css_default}</style>
    <div class="platform-fonts">
      ${isEmptySection ? "" : html2`
        <div class="title">${i18nString2(UIStrings2.renderedFonts)}</div>
        <div class="stats-section">
          ${input.platformFonts?.map((platformFont) => {
    const fontOrigin = platformFont.isCustomFont ? i18nString2(UIStrings2.networkResource) : i18nString2(UIStrings2.localFile);
    const usage = platformFont.glyphCount;
    return html2`
              <div class="font-stats-item">
                <div><span class="font-property-name">${i18nString2(UIStrings2.familyName)}</span>: ${platformFont.familyName}</div>
                <div><span class="font-property-name">${i18nString2(UIStrings2.postScriptName)}</span>: ${platformFont.postScriptName}</div>
                <div><span class="font-property-name">${i18nString2(UIStrings2.fontOrigin)}</span>: ${fontOrigin}<span class="font-usage">${i18nString2(UIStrings2.dGlyphs, { n: usage })}</span></div>
              </div>
            `;
  })}
        </div>
      `}
    </div>`, target);
};
var PlatformFontsWidget = class extends UI4.Widget.VBox {
  sharedModel;
  #view;
  constructor(sharedModel, view = DEFAULT_VIEW) {
    super({ useShadowDom: true });
    this.#view = view;
    this.registerRequiredCSS(platformFontsWidget_css_default);
    this.sharedModel = sharedModel;
    this.sharedModel.addEventListener("CSSModelChanged", this.requestUpdate, this);
    this.sharedModel.addEventListener("ComputedStyleChanged", this.requestUpdate, this);
  }
  async performUpdate() {
    const cssModel = this.sharedModel.cssModel();
    const node = this.sharedModel.node();
    if (!node || !cssModel) {
      this.#view({ platformFonts: null }, {}, this.contentElement);
      return;
    }
    const platformFonts = await cssModel.getPlatformFonts(node.id);
    const sortedPlatformFonts = platformFonts?.sort((a, b) => b.glyphCount - a.glyphCount) || null;
    this.#view({ platformFonts: sortedPlatformFonts }, {}, this.contentElement);
  }
};

// gen/front_end/panels/elements/PropertyNameCategories.js
import * as SDK3 from "./../../core/sdk/sdk.js";
var DefaultCategoryOrder = [
  "Layout",
  "Text",
  "Appearance",
  "Animation",
  "CSS Variables",
  "Grid",
  "Flex",
  "Table",
  "Generated Content",
  "Other"
];
var CategorizedProperties = /* @__PURE__ */ new Map([
  [
    "Layout",
    [
      "display",
      "margin",
      "padding",
      "height",
      "width",
      "position",
      "top",
      "right",
      "bottom",
      "left",
      "z-index",
      "float",
      "clear",
      "overflow",
      "resize",
      "clip",
      "visibility",
      "box-sizing",
      "align-content",
      "align-items",
      "align-self",
      "flex",
      "flex-basis",
      "flex-direction",
      "flex-flow",
      "flex-grow",
      "flex-shrink",
      "flex-wrap",
      "justify-content",
      "order",
      "inline-size",
      "block-size",
      "min-inline-size",
      "min-block-size",
      "max-inline-size",
      "max-block-size",
      "min-width",
      "max-width",
      "min-height",
      "max-height"
    ]
  ],
  [
    "Text",
    [
      "font",
      "font-family",
      "font-size",
      "font-size-adjust",
      "font-stretch",
      "font-style",
      "font-variant",
      "font-weight",
      "font-smoothing",
      "direction",
      "tab-size",
      "text-align",
      "text-align-last",
      "text-decoration",
      "text-decoration-color",
      "text-decoration-line",
      "text-decoration-style",
      "text-indent",
      "text-justify",
      "text-overflow",
      "text-shadow",
      "text-transform",
      "text-size-adjust",
      "line-height",
      "vertical-align",
      "letter-spacing",
      "word-spacing",
      "white-space",
      "word-break",
      "word-wrap"
    ]
  ],
  [
    "Appearance",
    [
      "color",
      "outline",
      "outline-color",
      "outline-offset",
      "outline-style",
      "Outline-width",
      "border",
      "border-image",
      "background",
      "cursor",
      "box-shadow",
      "\u2248",
      "tap-highlight-color"
    ]
  ],
  [
    "Animation",
    [
      "animation",
      "animation-delay",
      "animation-direction",
      "animation-duration",
      "animation-fill-mode",
      "animation-iteration-count",
      "animation-name",
      "animation-play-state",
      "animation-timing-function",
      "transition",
      "transition-delay",
      "transition-duration",
      "transition-property",
      "transition-timing-function"
    ]
  ],
  [
    "Grid",
    [
      "grid",
      "grid-column",
      "grid-row",
      "order",
      "place-items",
      "place-content",
      "place-self"
    ]
  ],
  [
    "Flex",
    [
      "flex",
      "order",
      "place-items",
      "place-content",
      "place-self"
    ]
  ],
  [
    "Table",
    [
      "border-collapse",
      "border-spacing",
      "caption-side",
      "empty-cells",
      "table-layout"
    ]
  ],
  [
    "Generated Content",
    [
      "content",
      "quotes",
      "counter-reset",
      "counter-increment"
    ]
  ]
]);
var CategoriesByPropertyName = /* @__PURE__ */ new Map();
for (const [category, styleNames] of CategorizedProperties) {
  for (const styleName of styleNames) {
    if (!CategoriesByPropertyName.has(styleName)) {
      CategoriesByPropertyName.set(styleName, []);
    }
    const categories = CategoriesByPropertyName.get(styleName);
    categories.push(category);
  }
}
var matchCategoriesByPropertyName = (propertyName) => {
  if (CategoriesByPropertyName.has(propertyName)) {
    return CategoriesByPropertyName.get(propertyName);
  }
  if (propertyName.startsWith("--")) {
    return [
      "CSS Variables"
      /* Category.CSS_VARIABLES */
    ];
  }
  return [];
};
var categorizePropertyName = (propertyName) => {
  const cssMetadata = SDK3.CSSMetadata.cssMetadata();
  const canonicalName = cssMetadata.canonicalPropertyName(propertyName);
  const categories = matchCategoriesByPropertyName(canonicalName);
  if (categories.length > 0) {
    return categories;
  }
  const shorthands = cssMetadata.getShorthands(canonicalName);
  if (shorthands) {
    for (const shorthand of shorthands) {
      const shorthandCategories = matchCategoriesByPropertyName(shorthand);
      if (shorthandCategories.length > 0) {
        return shorthandCategories;
      }
    }
  }
  return [
    "Other"
    /* Category.OTHER */
  ];
};

// gen/front_end/panels/elements/PropertyRenderer.js
var PropertyRenderer_exports = {};
__export(PropertyRenderer_exports, {
  BinOpRenderer: () => BinOpRenderer,
  Highlighting: () => Highlighting,
  Renderer: () => Renderer,
  RenderingContext: () => RenderingContext,
  StringRenderer: () => StringRenderer,
  TracingContext: () => TracingContext,
  URLRenderer: () => URLRenderer,
  rendererBase: () => rendererBase
});
import * as Common6 from "./../../core/common/common.js";
import * as i18n15 from "./../../core/i18n/i18n.js";
import * as SDK9 from "./../../core/sdk/sdk.js";
import * as Components3 from "./../../ui/legacy/components/utils/utils.js";
import * as UI12 from "./../../ui/legacy/legacy.js";
import * as VisualLogging6 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/StylesSidebarPane.js
var StylesSidebarPane_exports = {};
__export(StylesSidebarPane_exports, {
  AT_RULE_SECTION_NAME: () => AT_RULE_SECTION_NAME,
  ActionDelegate: () => ActionDelegate,
  ButtonProvider: () => ButtonProvider2,
  CSSPropertyPrompt: () => CSSPropertyPrompt,
  FUNCTION_SECTION_NAME: () => FUNCTION_SECTION_NAME,
  IdleCallbackManager: () => IdleCallbackManager,
  REGISTERED_PROPERTY_SECTION_NAME: () => REGISTERED_PROPERTY_SECTION_NAME,
  SectionBlock: () => SectionBlock,
  StylesSidebarPane: () => StylesSidebarPane,
  escapeUrlAsCssComment: () => escapeUrlAsCssComment,
  quoteFamilyName: () => quoteFamilyName,
  unescapeCssString: () => unescapeCssString
});
import "./../../ui/legacy/legacy.js";
import * as Common5 from "./../../core/common/common.js";
import * as Host3 from "./../../core/host/host.js";
import * as i18n13 from "./../../core/i18n/i18n.js";
import * as Platform5 from "./../../core/platform/platform.js";
import { assertNotNullOrUndefined } from "./../../core/platform/platform.js";
import * as Root4 from "./../../core/root/root.js";
import * as SDK8 from "./../../core/sdk/sdk.js";
import * as Bindings4 from "./../../models/bindings/bindings.js";
import * as TextUtils4 from "./../../models/text_utils/text_utils.js";
import { createIcon as createIcon3, Icon as Icon2 } from "./../../ui/kit/kit.js";
import * as InlineEditor3 from "./../../ui/legacy/components/inline_editor/inline_editor.js";
import * as Components2 from "./../../ui/legacy/components/utils/utils.js";
import * as UI11 from "./../../ui/legacy/legacy.js";
import * as VisualLogging5 from "./../../ui/visual_logging/visual_logging.js";
import * as PanelsCommon2 from "./../common/common.js";
import * as ElementsComponents3 from "./components/components.js";

// gen/front_end/panels/elements/ElementsSidebarPane.js
var ElementsSidebarPane_exports = {};
__export(ElementsSidebarPane_exports, {
  ElementsSidebarPane: () => ElementsSidebarPane
});
import * as Common2 from "./../../core/common/common.js";
import * as UI5 from "./../../ui/legacy/legacy.js";
var ElementsSidebarPane = class extends UI5.Widget.VBox {
  computedStyleModelInternal;
  updateThrottler;
  updateWhenVisible;
  constructor(computedStyleModel, delegatesFocus) {
    super({ useShadowDom: true, delegatesFocus, classes: ["flex-none"] });
    this.computedStyleModelInternal = computedStyleModel;
    this.computedStyleModelInternal.addEventListener("CSSModelChanged", this.onCSSModelChanged, this);
    this.computedStyleModelInternal.addEventListener("ComputedStyleChanged", this.onComputedStyleChanged, this);
    this.updateThrottler = new Common2.Throttler.Throttler(100);
    this.updateWhenVisible = false;
  }
  node() {
    return this.computedStyleModelInternal.node();
  }
  cssModel() {
    return this.computedStyleModelInternal.cssModel();
  }
  computedStyleModel() {
    return this.computedStyleModelInternal;
  }
  async doUpdate() {
    return;
  }
  update() {
    this.updateWhenVisible = !this.isShowing();
    if (this.updateWhenVisible) {
      return;
    }
    void this.updateThrottler.schedule(innerUpdate.bind(this));
    function innerUpdate() {
      return this.isShowing() ? this.doUpdate() : Promise.resolve();
    }
  }
  wasShown() {
    super.wasShown();
    if (this.updateWhenVisible) {
      this.update();
    }
  }
  onCSSModelChanged(_event) {
  }
  onComputedStyleChanged() {
  }
};

// gen/front_end/panels/elements/LayersWidget.js
var LayersWidget_exports = {};
__export(LayersWidget_exports, {
  ButtonProvider: () => ButtonProvider,
  LayersWidget: () => LayersWidget
});
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as SDK4 from "./../../core/sdk/sdk.js";
import * as Lit2 from "./../../third_party/lit/lit.js";
import * as TreeOutline2 from "./../../ui/components/tree_outline/tree_outline.js";
import * as UI6 from "./../../ui/legacy/legacy.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/layersWidget.css.js
var layersWidget_css_default = `/**
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.layers-widget {
  overflow: hidden;
  padding-left: 2px;
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);
  margin-top: 0;
  padding-bottom: 2px;
}

.layers-widget > .layers-widget-title {
  font-weight: bold;
  margin: 8px 4px 6px;
}

/*# sourceURL=${import.meta.resolve("./layersWidget.css")} */`;

// gen/front_end/panels/elements/LayersWidget.js
var { render: render2, html: html3, Directives: { ref } } = Lit2;
var UIStrings3 = {
  /**
   * @description Title of a section in the Element State Pane Widget of the Elements panel.
   * The widget shows the layers present in the context of the currently selected node.
   * */
  cssLayersTitle: "CSS layers",
  /**
   * @description Tooltip text in Element State Pane Widget of the Elements panel.
   * For a button that opens a tool that shows the layers present in the current document.
   */
  toggleCSSLayers: "Toggle CSS Layers view"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/elements/LayersWidget.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var DEFAULT_VIEW2 = (input, output, target) => {
  const makeTreeNode = (parentId) => (layer) => {
    const subLayers = layer.subLayers;
    const name = SDK4.CSSModel.CSSModel.readableLayerName(layer.name);
    const treeNodeData = layer.order + ": " + name;
    const id = parentId ? parentId + "." + name : name;
    if (!subLayers) {
      return { treeNodeData, id };
    }
    return {
      treeNodeData,
      id,
      children: async () => subLayers.sort((layer1, layer2) => layer1.order - layer2.order).map(makeTreeNode(id))
    };
  };
  const { defaultRenderer } = TreeOutline2.TreeOutline;
  const tree3 = [makeTreeNode("")(input.rootLayer)];
  const data = {
    defaultRenderer,
    tree: tree3
  };
  const captureTreeOutline = (e) => {
    output.treeOutline = e;
  };
  const template = html3`
  <style>${layersWidget_css_default}</style>
  <div class="layers-widget">
    <div class="layers-widget-title">${UIStrings3.cssLayersTitle}</div>
    <devtools-tree-outline ${ref(captureTreeOutline)}
                           .data=${data}></devtools-tree-outline>
  </div>
  `;
  render2(template, target);
};
var layersWidgetInstance;
var LayersWidget = class _LayersWidget extends UI6.Widget.Widget {
  #node = null;
  #view;
  #layerToReveal = null;
  constructor(view = DEFAULT_VIEW2) {
    super({ jslog: `${VisualLogging2.pane("css-layers")}` });
    this.#view = view;
  }
  wasShown() {
    super.wasShown();
    UI6.Context.Context.instance().addFlavorChangeListener(SDK4.DOMModel.DOMNode, this.#onDOMNodeChanged, this);
    this.#onDOMNodeChanged({ data: UI6.Context.Context.instance().flavor(SDK4.DOMModel.DOMNode) });
  }
  wasHidden() {
    UI6.Context.Context.instance().addFlavorChangeListener(SDK4.DOMModel.DOMNode, this.#onDOMNodeChanged, this);
    this.#onDOMNodeChanged({ data: null });
    super.wasHidden();
  }
  #onDOMNodeChanged(event) {
    const node = event.data?.enclosingElementOrSelf();
    if (this.#node === node) {
      return;
    }
    if (this.#node) {
      this.#node.domModel().cssModel().removeEventListener(SDK4.CSSModel.Events.StyleSheetChanged, this.requestUpdate, this);
    }
    this.#node = event.data;
    if (this.#node) {
      this.#node.domModel().cssModel().addEventListener(SDK4.CSSModel.Events.StyleSheetChanged, this.requestUpdate, this);
    }
    if (this.isShowing()) {
      this.requestUpdate();
    }
  }
  async performUpdate() {
    if (!this.#node) {
      return;
    }
    const rootLayer = await this.#node.domModel().cssModel().getRootLayer(this.#node.id);
    const input = { rootLayer };
    const output = { treeOutline: void 0 };
    this.#view(input, output, this.contentElement);
    if (output.treeOutline) {
      await output.treeOutline.expandRecursively(5);
      if (this.#layerToReveal) {
        await output.treeOutline.expandToAndSelectTreeNodeId(this.#layerToReveal);
        this.#layerToReveal = null;
      }
    }
  }
  async revealLayer(layerName) {
    if (!this.isShowing()) {
      ElementsPanel.instance().showToolbarPane(this, ButtonProvider.instance().item());
    }
    this.#layerToReveal = `implicit outer layer.${layerName}`;
    this.requestUpdate();
    await this.updateComplete;
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!layersWidgetInstance || forceNew) {
      layersWidgetInstance = new _LayersWidget();
    }
    return layersWidgetInstance;
  }
};
var buttonProviderInstance;
var ButtonProvider = class _ButtonProvider {
  button;
  constructor() {
    this.button = new UI6.Toolbar.ToolbarToggle(i18nString3(UIStrings3.toggleCSSLayers), "layers", "layers-filled");
    this.button.setVisible(false);
    this.button.addEventListener("Click", this.clicked, this);
    this.button.element.classList.add("monospace");
    this.button.element.setAttribute("jslog", `${VisualLogging2.toggleSubpane("css-layers").track({ click: true })}`);
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!buttonProviderInstance || forceNew) {
      buttonProviderInstance = new _ButtonProvider();
    }
    return buttonProviderInstance;
  }
  clicked() {
    const view = LayersWidget.instance();
    ElementsPanel.instance().showToolbarPane(!view.isShowing() ? view : null, this.button);
  }
  item() {
    return this.button;
  }
};

// gen/front_end/panels/elements/StyleEditorWidget.js
var StyleEditorWidget_exports = {};
__export(StyleEditorWidget_exports, {
  StyleEditorWidget: () => StyleEditorWidget
});
import { createIcon as createIcon2 } from "./../../ui/kit/kit.js";
import * as UI9 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/elements/StylePropertyTreeElement.js
var StylePropertyTreeElement_exports = {};
__export(StylePropertyTreeElement_exports, {
  AnchorFunctionRenderer: () => AnchorFunctionRenderer,
  AngleRenderer: () => AngleRenderer,
  AttributeRenderer: () => AttributeRenderer,
  AutoBaseRenderer: () => AutoBaseRenderer,
  BaseFunctionRenderer: () => BaseFunctionRenderer,
  BezierRenderer: () => BezierRenderer,
  CSSWideKeywordRenderer: () => CSSWideKeywordRenderer,
  ColorMixRenderer: () => ColorMixRenderer,
  ColorRenderer: () => ColorRenderer,
  CustomFunctionRenderer: () => CustomFunctionRenderer,
  EnvFunctionRenderer: () => EnvFunctionRenderer,
  FlexGridRenderer: () => FlexGridRenderer,
  FontRenderer: () => FontRenderer,
  GridTemplateRenderer: () => GridTemplateRenderer,
  LengthRenderer: () => LengthRenderer,
  LightDarkColorRenderer: () => LightDarkColorRenderer,
  LinearGradientRenderer: () => LinearGradientRenderer,
  LinkableNameRenderer: () => LinkableNameRenderer,
  MathFunctionRenderer: () => MathFunctionRenderer,
  PositionAnchorRenderer: () => PositionAnchorRenderer,
  PositionTryRenderer: () => PositionTryRenderer,
  RelativeColorChannelRenderer: () => RelativeColorChannelRenderer,
  SHORTHANDS_FOR_PERCENTAGES: () => SHORTHANDS_FOR_PERCENTAGES,
  ShadowModel: () => ShadowModel,
  ShadowRenderer: () => ShadowRenderer,
  StylePropertyTreeElement: () => StylePropertyTreeElement,
  VariableRenderer: () => VariableRenderer,
  getPropertyRenderers: () => getPropertyRenderers
});
import * as Common3 from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as Platform2 from "./../../core/platform/platform.js";
import * as Root from "./../../core/root/root.js";
import * as SDK6 from "./../../core/sdk/sdk.js";
import * as Badges from "./../../models/badges/badges.js";
import * as Bindings2 from "./../../models/bindings/bindings.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as Tooltips from "./../../ui/components/tooltips/tooltips.js";
import { createIcon, Icon } from "./../../ui/kit/kit.js";
import * as ColorPicker2 from "./../../ui/legacy/components/color_picker/color_picker.js";
import * as InlineEditor2 from "./../../ui/legacy/components/inline_editor/inline_editor.js";
import * as UI8 from "./../../ui/legacy/legacy.js";
import * as Lit4 from "./../../ui/lit/lit.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";
import * as ElementsComponents from "./components/components.js";

// gen/front_end/panels/elements/CSSRuleValidator.js
var CSSRuleValidator_exports = {};
__export(CSSRuleValidator_exports, {
  AlignContentValidator: () => AlignContentValidator,
  CSSRuleValidator: () => CSSRuleValidator,
  FlexContainerValidator: () => FlexContainerValidator,
  FlexGridValidator: () => FlexGridValidator,
  FlexItemValidator: () => FlexItemValidator,
  FlexOrGridItemValidator: () => FlexOrGridItemValidator,
  FontVariationSettingsValidator: () => FontVariationSettingsValidator,
  GridContainerValidator: () => GridContainerValidator,
  GridItemValidator: () => GridItemValidator,
  Hint: () => Hint,
  MulticolFlexGridValidator: () => MulticolFlexGridValidator,
  PaddingValidator: () => PaddingValidator,
  PositionValidator: () => PositionValidator,
  SizingValidator: () => SizingValidator,
  ZIndexValidator: () => ZIndexValidator,
  cssRuleValidatorsMap: () => cssRuleValidatorsMap
});
import * as i18n7 from "./../../core/i18n/i18n.js";
import * as SDK5 from "./../../core/sdk/sdk.js";

// gen/front_end/panels/elements/CSSRuleValidatorHelper.js
var buildPropertyDefinitionText = (property, value5) => {
  if (value5 === void 0) {
    return buildPropertyName(property);
  }
  return '<code class="unbreakable-text"><span class="property">' + property + "</span>: " + value5 + "</code>";
};
var buildPropertyName = (property) => {
  return '<code class="unbreakable-text"><span class="property">' + property + "</span></code>";
};
var buildPropertyValue = (property) => {
  return '<code class="unbreakable-text">' + property + "</code>";
};
var isFlexContainer = (computedStyles) => {
  if (!computedStyles) {
    return false;
  }
  const display = computedStyles.get("display");
  return display === "flex" || display === "inline-flex";
};
var blockContainerDisplayValueSet = /* @__PURE__ */ new Set([
  "block",
  "flow-root",
  "inline-block",
  "list-item",
  "table-caption",
  "table-cell"
]);
var isBlockContainer = (computedStyles) => {
  if (!computedStyles) {
    return false;
  }
  const displayValue = computedStyles.get("display");
  if (!displayValue) {
    return false;
  }
  const split = displayValue.split(" ");
  if (split.length > 3) {
    return false;
  }
  if (split.length === 3) {
    return split[2] === "list-item";
  }
  if (split.length === 2) {
    return split[1] === "list-item" && split[0] !== "inline";
  }
  return blockContainerDisplayValueSet.has(split[0]);
};
var isInlineElement = (computedStyles) => {
  if (!computedStyles) {
    return false;
  }
  return computedStyles.get("display") === "inline";
};
var possiblyReplacedElements = /* @__PURE__ */ new Set([
  "audio",
  "canvas",
  "embed",
  "iframe",
  "img",
  "input",
  "object",
  "video"
]);
var isPossiblyReplacedElement = (nodeName) => {
  if (!nodeName) {
    return false;
  }
  return possiblyReplacedElements.has(nodeName);
};
var isGridContainer = (computedStyles) => {
  if (!computedStyles) {
    return false;
  }
  const display = computedStyles.get("display");
  return display === "grid" || display === "inline-grid";
};
var isGridLanesContainer = (computedStyles) => {
  if (!computedStyles) {
    return false;
  }
  const display = computedStyles.get("display");
  return display === "grid-lanes" || display === "inline-grid-lanes";
};
var isMulticolContainer = (computedStyles) => {
  if (!computedStyles) {
    return false;
  }
  const columnWidth = computedStyles.get("column-width");
  const columnCount = computedStyles.get("column-count");
  return columnWidth !== "auto" || columnCount !== "auto";
};

// gen/front_end/panels/elements/CSSRuleValidator.js
var UIStrings4 = {
  /**
   * @description The message shown in the Style pane when the user hovers over a property that has no effect due to some other property.
   * @example {flex-wrap: nowrap} REASON_PROPERTY_DECLARATION_CODE
   * @example {align-content} AFFECTED_PROPERTY_DECLARATION_CODE
   */
  ruleViolatedBySameElementRuleReason: "The {REASON_PROPERTY_DECLARATION_CODE} property prevents {AFFECTED_PROPERTY_DECLARATION_CODE} from having an effect.",
  /**
   * @description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to some other property.
   * @example {flex-wrap} PROPERTY_NAME
   * @example {nowrap} PROPERTY_VALUE
   */
  ruleViolatedBySameElementRuleFix: "Try setting {PROPERTY_NAME} to something other than {PROPERTY_VALUE}.",
  /**
   * @description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to not being a flex or grid container.
   * @example {display: grid} DISPLAY_GRID_RULE
   * @example {display: flex} DISPLAY_FLEX_RULE
   */
  ruleViolatedBySameElementRuleChangeFlexOrGrid: "Try adding {DISPLAY_GRID_RULE} or {DISPLAY_FLEX_RULE} to make this element into a container.",
  /**
   * @description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to the current property value.
   * @example {display: block} EXISTING_PROPERTY_DECLARATION
   * @example {display: flex} TARGET_PROPERTY_DECLARATION
   */
  ruleViolatedBySameElementRuleChangeSuggestion: "Try setting the {EXISTING_PROPERTY_DECLARATION} property to {TARGET_PROPERTY_DECLARATION}.",
  /**
   * @description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to properties of the parent element.
   * @example {display: block} REASON_PROPERTY_DECLARATION_CODE
   * @example {flex} AFFECTED_PROPERTY_DECLARATION_CODE
   */
  ruleViolatedByParentElementRuleReason: "The {REASON_PROPERTY_DECLARATION_CODE} property on the parent element prevents {AFFECTED_PROPERTY_DECLARATION_CODE} from having an effect.",
  /**
   * @description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to the properties of the parent element.
   * @example {display: block} EXISTING_PARENT_ELEMENT_RULE
   * @example {display: flex} TARGET_PARENT_ELEMENT_RULE
   */
  ruleViolatedByParentElementRuleFix: "Try setting the {EXISTING_PARENT_ELEMENT_RULE} property on the parent to {TARGET_PARENT_ELEMENT_RULE}.",
  /**
   * @description The warning text shown in Elements panel when font-variation-settings don't match allowed values
   * @example {wdth} PH1
   * @example {100} PH2
   * @example {10} PH3
   * @example {20} PH4
   * @example {Arial} PH5
   */
  fontVariationSettingsWarning: "Value for setting \u201C{PH1}\u201D {PH2} is outside the supported range [{PH3}, {PH4}] for font-family \u201C{PH5}\u201D.",
  /**
   * @description The message shown in the Style pane when the user hovers over a property declaration that has no effect on flex or grid child items.
   * @example {flex} CONTAINER_DISPLAY_NAME
   * @example {align-contents} PROPERTY_NAME
   */
  flexGridContainerPropertyRuleReason: "This element is a {CONTAINER_DISPLAY_NAME} item, i.e. a child of a {CONTAINER_DISPLAY_NAME} container, but {PROPERTY_NAME} only applies to containers.",
  /**
   * @description The message shown in the Style pane when the user hovers over a property declaration that has no effect on flex or grid child items.
   * @example {align-contents} PROPERTY_NAME
   * @example {align-self} ALTERNATIVE_PROPERTY_NAME
   */
  flexGridContainerPropertyRuleFix: "Try setting the {PROPERTY_NAME} on the container element or use {ALTERNATIVE_PROPERTY_NAME} instead."
};
var str_4 = i18n7.i18n.registerUIStrings("panels/elements/CSSRuleValidator.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var Hint = class {
  #hintMessage;
  #possibleFixMessage;
  #learnMoreLink;
  constructor(hintMessage, possibleFixMessage, learnMoreLink) {
    this.#hintMessage = hintMessage;
    this.#possibleFixMessage = possibleFixMessage;
    this.#learnMoreLink = learnMoreLink;
  }
  getMessage() {
    return this.#hintMessage;
  }
  getPossibleFixMessage() {
    return this.#possibleFixMessage;
  }
  getLearnMoreLink() {
    return this.#learnMoreLink;
  }
};
var CSSRuleValidator = class {
  #affectedProperties;
  constructor(affectedProperties) {
    this.#affectedProperties = affectedProperties;
  }
  getApplicableProperties() {
    return this.#affectedProperties;
  }
};
var AlignContentValidator = class extends CSSRuleValidator {
  constructor() {
    super(["align-content", "place-content"]);
  }
  getHint(_propertyName, computedStyles) {
    if (!computedStyles) {
      return;
    }
    const isFlex = isFlexContainer(computedStyles);
    if (!isFlex && !isBlockContainer(computedStyles) && !isGridContainer(computedStyles) && !isGridLanesContainer(computedStyles)) {
      const reasonPropertyDeclaration2 = buildPropertyDefinitionText("display", computedStyles?.get("display"));
      const affectedPropertyDeclarationCode2 = buildPropertyName("align-content");
      return new Hint(i18nString4(UIStrings4.ruleViolatedBySameElementRuleReason, {
        REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration2,
        AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode2
      }), i18nString4(UIStrings4.ruleViolatedBySameElementRuleFix, {
        PROPERTY_NAME: buildPropertyName("display"),
        PROPERTY_VALUE: buildPropertyValue(computedStyles?.get("display"))
      }));
    }
    if (!isFlex) {
      return;
    }
    if (computedStyles.get("flex-wrap") !== "nowrap") {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText("flex-wrap", "nowrap");
    const affectedPropertyDeclarationCode = buildPropertyName("align-content");
    return new Hint(i18nString4(UIStrings4.ruleViolatedBySameElementRuleReason, {
      REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
      AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode
    }), i18nString4(UIStrings4.ruleViolatedBySameElementRuleFix, {
      PROPERTY_NAME: buildPropertyName("flex-wrap"),
      PROPERTY_VALUE: buildPropertyValue("nowrap")
    }));
  }
};
var FlexItemValidator = class extends CSSRuleValidator {
  constructor() {
    super(["flex", "flex-basis", "flex-grow", "flex-shrink"]);
  }
  getHint(propertyName, _computedStyles, parentComputedStyles) {
    if (!parentComputedStyles) {
      return;
    }
    if (isFlexContainer(parentComputedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText("display", parentComputedStyles?.get("display"));
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
    const targetParentPropertyDeclaration = buildPropertyDefinitionText("display", "flex");
    return new Hint(i18nString4(UIStrings4.ruleViolatedByParentElementRuleReason, {
      REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
      AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode
    }), i18nString4(UIStrings4.ruleViolatedByParentElementRuleFix, {
      EXISTING_PARENT_ELEMENT_RULE: reasonPropertyDeclaration,
      TARGET_PARENT_ELEMENT_RULE: targetParentPropertyDeclaration
    }));
  }
};
var FlexContainerValidator = class extends CSSRuleValidator {
  constructor() {
    super(["flex-direction", "flex-flow", "flex-wrap"]);
  }
  getHint(propertyName, computedStyles) {
    if (!computedStyles) {
      return;
    }
    if (isFlexContainer(computedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText("display", computedStyles?.get("display"));
    const targetRuleCode = buildPropertyDefinitionText("display", "flex");
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
    return new Hint(i18nString4(UIStrings4.ruleViolatedBySameElementRuleReason, {
      REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
      AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode
    }), i18nString4(UIStrings4.ruleViolatedBySameElementRuleChangeSuggestion, {
      EXISTING_PROPERTY_DECLARATION: reasonPropertyDeclaration,
      TARGET_PROPERTY_DECLARATION: targetRuleCode
    }));
  }
};
var GridContainerValidator = class extends CSSRuleValidator {
  constructor() {
    super([
      "grid",
      "grid-auto-columns",
      "grid-auto-flow",
      "grid-auto-rows",
      "grid-template",
      "grid-template-areas",
      "grid-template-columns",
      "grid-template-rows"
    ]);
  }
  getHint(propertyName, computedStyles) {
    if (isGridContainer(computedStyles) || isGridLanesContainer(computedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText("display", computedStyles?.get("display"));
    const targetRuleCode = buildPropertyDefinitionText("display", "grid");
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
    return new Hint(i18nString4(UIStrings4.ruleViolatedBySameElementRuleReason, {
      REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
      AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode
    }), i18nString4(UIStrings4.ruleViolatedBySameElementRuleChangeSuggestion, {
      EXISTING_PROPERTY_DECLARATION: reasonPropertyDeclaration,
      TARGET_PROPERTY_DECLARATION: targetRuleCode
    }));
  }
};
var GridItemValidator = class extends CSSRuleValidator {
  constructor() {
    super([
      "grid-area",
      "grid-column",
      "grid-row",
      "grid-row-end",
      "grid-row-start"
    ]);
  }
  getHint(propertyName, _computedStyles, parentComputedStyles) {
    if (!parentComputedStyles) {
      return;
    }
    if (isGridContainer(parentComputedStyles) || isGridLanesContainer(parentComputedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText("display", parentComputedStyles?.get("display"));
    const targetParentPropertyDeclaration = buildPropertyDefinitionText("display", "grid");
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
    return new Hint(i18nString4(UIStrings4.ruleViolatedByParentElementRuleReason, {
      REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
      AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode
    }), i18nString4(UIStrings4.ruleViolatedByParentElementRuleFix, {
      EXISTING_PARENT_ELEMENT_RULE: reasonPropertyDeclaration,
      TARGET_PARENT_ELEMENT_RULE: targetParentPropertyDeclaration
    }));
  }
};
var FlexOrGridItemValidator = class extends CSSRuleValidator {
  constructor() {
    super([
      "order"
    ]);
  }
  getHint(propertyName, _computedStyles, parentComputedStyles) {
    if (!parentComputedStyles) {
      return;
    }
    if (isFlexContainer(parentComputedStyles) || isGridContainer(parentComputedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText("display", parentComputedStyles?.get("display"));
    const targetParentPropertyDeclaration = `${buildPropertyDefinitionText("display", "flex")} or ${buildPropertyDefinitionText("display", "grid")}`;
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
    return new Hint(i18nString4(UIStrings4.ruleViolatedByParentElementRuleReason, {
      REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
      AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode
    }), i18nString4(UIStrings4.ruleViolatedByParentElementRuleFix, {
      EXISTING_PARENT_ELEMENT_RULE: reasonPropertyDeclaration,
      TARGET_PARENT_ELEMENT_RULE: targetParentPropertyDeclaration
    }));
  }
};
var FlexGridValidator = class extends CSSRuleValidator {
  constructor() {
    super(["justify-content"]);
  }
  getHint(propertyName, computedStyles, parentComputedStyles) {
    if (!computedStyles) {
      return;
    }
    if (isFlexContainer(computedStyles) || isGridContainer(computedStyles) || isGridLanesContainer(computedStyles)) {
      return;
    }
    if (parentComputedStyles && (isFlexContainer(parentComputedStyles) || isGridContainer(parentComputedStyles) || isGridLanesContainer(parentComputedStyles))) {
      const reasonContainerDisplayName = buildPropertyValue(parentComputedStyles.get("display"));
      const reasonPropertyName = buildPropertyName(propertyName);
      const reasonAlternativePropertyName = buildPropertyName("justify-self");
      return new Hint(i18nString4(UIStrings4.flexGridContainerPropertyRuleReason, {
        CONTAINER_DISPLAY_NAME: reasonContainerDisplayName,
        PROPERTY_NAME: reasonPropertyName
      }), i18nString4(UIStrings4.flexGridContainerPropertyRuleFix, {
        PROPERTY_NAME: reasonPropertyName,
        ALTERNATIVE_PROPERTY_NAME: reasonAlternativePropertyName
      }));
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText("display", computedStyles.get("display"));
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
    return new Hint(i18nString4(UIStrings4.ruleViolatedBySameElementRuleReason, {
      REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
      AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode
    }), i18nString4(UIStrings4.ruleViolatedBySameElementRuleChangeFlexOrGrid, {
      DISPLAY_GRID_RULE: buildPropertyDefinitionText("display", "grid"),
      DISPLAY_FLEX_RULE: buildPropertyDefinitionText("display", "flex")
    }));
  }
};
var MulticolFlexGridValidator = class extends CSSRuleValidator {
  constructor() {
    super([
      "gap",
      "column-gap",
      "row-gap",
      "grid-gap",
      "grid-column-gap",
      "grid-row-gap"
    ]);
  }
  getHint(propertyName, computedStyles) {
    if (!computedStyles) {
      return;
    }
    if (isMulticolContainer(computedStyles) || isFlexContainer(computedStyles) || isGridContainer(computedStyles) || isGridLanesContainer(computedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText("display", computedStyles?.get("display"));
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
    return new Hint(i18nString4(UIStrings4.ruleViolatedBySameElementRuleReason, {
      REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
      AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode
    }), i18nString4(UIStrings4.ruleViolatedBySameElementRuleFix, {
      PROPERTY_NAME: buildPropertyName("display"),
      PROPERTY_VALUE: buildPropertyValue(computedStyles?.get("display"))
    }));
  }
};
var PaddingValidator = class extends CSSRuleValidator {
  constructor() {
    super([
      "padding",
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left"
    ]);
  }
  getHint(propertyName, computedStyles) {
    const display = computedStyles?.get("display");
    if (!display) {
      return;
    }
    const tableAttributes = [
      "table-row-group",
      "table-header-group",
      "table-footer-group",
      "table-row",
      "table-column-group",
      "table-column"
    ];
    if (!tableAttributes.includes(display)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText("display", computedStyles?.get("display"));
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
    return new Hint(i18nString4(UIStrings4.ruleViolatedBySameElementRuleReason, {
      REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
      AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode
    }), i18nString4(UIStrings4.ruleViolatedBySameElementRuleFix, {
      PROPERTY_NAME: buildPropertyName("display"),
      PROPERTY_VALUE: buildPropertyValue(computedStyles?.get("display"))
    }));
  }
};
var PositionValidator = class extends CSSRuleValidator {
  constructor() {
    super([
      "top",
      "right",
      "bottom",
      "left"
    ]);
  }
  getHint(propertyName, computedStyles) {
    const position = computedStyles?.get("position");
    if (!position) {
      return;
    }
    if (position !== "static") {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText("position", computedStyles?.get("position"));
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
    return new Hint(i18nString4(UIStrings4.ruleViolatedBySameElementRuleReason, {
      REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
      AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode
    }), i18nString4(UIStrings4.ruleViolatedBySameElementRuleFix, {
      PROPERTY_NAME: buildPropertyName("position"),
      PROPERTY_VALUE: buildPropertyValue(computedStyles?.get("position"))
    }));
  }
};
var ZIndexValidator = class extends CSSRuleValidator {
  constructor() {
    super([
      "z-index"
    ]);
  }
  getHint(propertyName, computedStyles, parentComputedStyles) {
    const position = computedStyles?.get("position");
    if (!position) {
      return;
    }
    if (["absolute", "relative", "fixed", "sticky"].includes(position) || isFlexContainer(parentComputedStyles) || isGridContainer(parentComputedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText("position", computedStyles?.get("position"));
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
    return new Hint(i18nString4(UIStrings4.ruleViolatedBySameElementRuleReason, {
      REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
      AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode
    }), i18nString4(UIStrings4.ruleViolatedBySameElementRuleFix, {
      PROPERTY_NAME: buildPropertyName("position"),
      PROPERTY_VALUE: buildPropertyValue(computedStyles?.get("position"))
    }));
  }
};
var SizingValidator = class extends CSSRuleValidator {
  constructor() {
    super([
      "width",
      "height"
    ]);
  }
  getHint(propertyName, computedStyles, _parentComputedStyles, nodeName) {
    if (!computedStyles || !nodeName) {
      return;
    }
    if (!isInlineElement(computedStyles)) {
      return;
    }
    if (isPossiblyReplacedElement(nodeName)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText("display", computedStyles?.get("display"));
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
    return new Hint(i18nString4(UIStrings4.ruleViolatedBySameElementRuleReason, {
      REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
      AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode
    }), i18nString4(UIStrings4.ruleViolatedBySameElementRuleFix, {
      PROPERTY_NAME: buildPropertyName("display"),
      PROPERTY_VALUE: buildPropertyValue(computedStyles?.get("display"))
    }));
  }
};
var FontVariationSettingsValidator = class extends CSSRuleValidator {
  constructor() {
    super([
      "font-variation-settings"
    ]);
  }
  getHint(_propertyName, computedStyles, _parentComputedStyles, _nodeName, fontFaces) {
    if (!computedStyles) {
      return;
    }
    const value5 = computedStyles.get("font-variation-settings");
    if (!value5) {
      return;
    }
    const fontFamily = computedStyles.get("font-family");
    if (!fontFamily) {
      return;
    }
    const fontFamilies = new Set(SDK5.CSSPropertyParser.parseFontFamily(fontFamily));
    const matchingFontFaces = (fontFaces || []).filter((f) => fontFamilies.has(f.getFontFamily()));
    const variationSettings = SDK5.CSSPropertyParser.parseFontVariationSettings(value5);
    const warnings = [];
    for (const elementSetting of variationSettings) {
      for (const font of matchingFontFaces) {
        const fontSetting = font.getVariationAxisByTag(elementSetting.tag);
        if (!fontSetting) {
          continue;
        }
        if (elementSetting.value < fontSetting.minValue || elementSetting.value > fontSetting.maxValue) {
          warnings.push(i18nString4(UIStrings4.fontVariationSettingsWarning, {
            PH1: elementSetting.tag,
            PH2: elementSetting.value,
            PH3: fontSetting.minValue,
            PH4: fontSetting.maxValue,
            PH5: font.getFontFamily()
          }));
        }
      }
    }
    if (!warnings.length) {
      return;
    }
    return new Hint(warnings.join(" "), "");
  }
};
var CSS_RULE_VALIDATORS = [
  AlignContentValidator,
  FlexContainerValidator,
  FlexGridValidator,
  FlexItemValidator,
  FlexOrGridItemValidator,
  FontVariationSettingsValidator,
  GridContainerValidator,
  GridItemValidator,
  MulticolFlexGridValidator,
  PaddingValidator,
  PositionValidator,
  SizingValidator,
  ZIndexValidator
];
var setupCSSRulesValidators = () => {
  const validatorsMap = /* @__PURE__ */ new Map();
  for (const validatorClass of CSS_RULE_VALIDATORS) {
    const validator = new validatorClass();
    const affectedProperties = validator.getApplicableProperties();
    for (const affectedProperty of affectedProperties) {
      let propertyValidators = validatorsMap.get(affectedProperty);
      if (propertyValidators === void 0) {
        propertyValidators = [];
      }
      propertyValidators.push(validator);
      validatorsMap.set(affectedProperty, propertyValidators);
    }
  }
  return validatorsMap;
};
var cssRuleValidatorsMap = setupCSSRulesValidators();

// gen/front_end/panels/elements/CSSValueTraceView.js
var CSSValueTraceView_exports = {};
__export(CSSValueTraceView_exports, {
  CSSValueTraceView: () => CSSValueTraceView
});
import * as Lit3 from "./../../third_party/lit/lit.js";
import * as UI7 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/elements/cssValueTraceView.css.js
var cssValueTraceView_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
:host(:focus-within) {
  /* stylelint-disable-next-line declaration-no-important */
  outline: none !important;
}

.css-value-trace {
  --cell-width: 1.5em;
  --padding: var(--sys-size-3);
  --padding-left: var(--sys-size-4);

  display: grid;
  grid-template-columns: var(--cell-width) 1fr;
  margin: calc(-1 * var(--padding));
  margin-left: calc(-1 * var(--padding-left));

  & .trace-line-icon {
    grid-column-start: 1;
    width: var(--sys-size-9);
    height: var(--sys-size-9);
    text-align: center;
    color: var(--icon-default);
    padding-top: var(--sys-size-2);
  }

  :focus {
    border-radius: var(--sys-size-2);
    outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
  }

  details {
    height: min-content;
    grid-column: 1 / 4;

    summary {
      display: grid;
      grid-template-columns: var(--cell-width) var(--cell-width) 1fr;

      &::marker {
        display: none;
        content: "";
      }
    }

    div {
      devtools-icon, .trace-line-icon {
        grid-column-start: 2;
      }

      display: grid;
      grid-template-columns: var(--cell-width) var(--cell-width) 1fr;
    }

    .trace-line {
      grid-column: 3 / 4;
    }

    .marker {
      grid-column-start: 2;

      --icon-url: var(--image-file-triangle-right);

      padding-top: var(--sys-size-3);
    }

    &[open] .marker {
      --icon-url: var(--image-file-triangle-down);
    }
  }

  & .trace-line {
    place-self: center start;
    padding: var(--padding);
    grid-column: 2 / 3;
    margin: 0;
    padding-left: var(--padding-left);
  }

  .full-row {
    grid-column-start: 1;
  }
}

:host::highlight(css-value-tracing) {
  background-color: var(--sys-color-tonal-container);
}

/*# sourceURL=${import.meta.resolve("./cssValueTraceView.css")} */`;

// gen/front_end/panels/elements/stylePropertiesTreeOutline.css.js
var stylePropertiesTreeOutline_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.has-ignorable-error .webkit-css-property {
  color: inherit;
}

.inactive-value:not(:hover,:focus,:focus-within) {
  text-decoration: line-through;
}

.tree-outline {
  padding: 0;
}

.tree-outline li {
  margin-left: 12px;
  padding-left: 22px;
  white-space: normal;
  text-overflow: ellipsis;
  cursor: auto;
  display: block;

  &::before {
    display: none;
  }

  .webkit-css-property {
    margin-left: -22px; /* outdent the first line of longhand properties (in an expanded shorthand) to compensate for the "padding-left" shift in .tree-outline li */
  }

  &.not-parsed-ok {
    margin-left: 0;

    .exclamation-mark {
      display: inline-block;
      position: relative;
      width: 11px;
      height: 10px;
      margin: 0 7px 0 0;
      top: 1px;
      left: -36px; /* outdent to compensate for the top-level property indent */
      user-select: none;
      cursor: default;
      z-index: 1;
      mask: var(--image-file-warning-filled) center / 14px no-repeat;
      background-color: var(--icon-warning);
    }

    &.has-ignorable-error .exclamation-mark {
      background-color: unset;
    }
  }

  &.filter-match {
    background-color: var(--sys-color-tonal-container);
  }

  &.editing {
    margin-left: 10px;
    text-overflow: clip;
  }

  &.editing-sub-part {
    padding: 3px 6px 8px 18px;
    margin: -1px -6px -8px;
    text-overflow: clip;
  }

  &.child-editing {
    overflow-wrap: break-word !important; /* stylelint-disable-line declaration-no-important */
    white-space: normal !important; /* stylelint-disable-line declaration-no-important */
    padding-left: 0;
  }

  .info {
    padding-top: 4px;
    padding-bottom: 3px;
  }
}

.tree-outline > li {
  padding-left: 38px;
  clear: both;
  min-height: 14px;

  .webkit-css-property {
    margin-left: -38px; /* outdent the first line of the top-level properties to compensate for the "padding-left" shift in .tree-outline > li */
  }

  &.child-editing {
    .text-prompt {
      white-space: pre-wrap;
    }

    .webkit-css-property {
      margin-left: 0;
    }
  }
}

ol:not(.tree-outline) {
  display: none;
  margin: 0;
  list-style: none;
}

.tree-outline > ol {
  padding-inline-start: 16px;

  ol {
    padding-left: 0;
  }
}

ol.expanded {
  display: block;
}

.enabled-button {
  visibility: hidden;
  float: left;
  font-size: 10px;
  margin: 0;
  vertical-align: top;
  position: relative;
  z-index: 1;
  width: 18px;
  left: -40px; /* original -2px + (-38px) to compensate for the first line outdent */
  top: 0.5px;
  height: 13px;
}

input.enabled-button.small {
  &:hover::after,
  &:active::before {
    left: 3px;
  }
}

devtools-icon.icon-link {
  color: var(--text-link);
  width: 13px;
  height: 13px;

  &:hover {
    cursor: pointer;
  }
}

.overloaded:not(.has-ignorable-error, .invalid-property-value),
.inactive:not(.invalid-property-value),
.disabled,
.not-parsed-ok:not(.has-ignorable-error, .invalid-property-value),
.not-parsed-ok.invalid-property-value .value {
  text-decoration: line-through;
}

.implicit,
.inherited,
.inactive-property {
  opacity: 50%;
}

.hint-wrapper {
  align-items: center;
  display: inline-block;
  margin-left: 3px;
  max-height: 13px;
  max-width: 13px;
  vertical-align: middle;
}

.hint {
  cursor: pointer;
  display: block;
  position: relative;
  left: -1.5px;
  top: -1.5px;
}

.has-ignorable-error {
  color: var(--sys-color-state-disabled);
}

:host-context(.no-affect) .tree-outline li {
  opacity: 50%;

  &.editing {
    opacity: 100%;
  }
}

:host-context(.styles-panel-hovered:not(.read-only)) .webkit-css-property:hover,
:host-context(.styles-panel-hovered:not(.read-only)) .value:hover {
  text-decoration: underline;
  cursor: default;
}

.styles-name-value-separator {
  display: inline-block;
  width: 14px;
  text-decoration: inherit;
  white-space: pre;
}

.styles-clipboard-only {
  display: inline-block;
  width: 0;
  opacity: 0%;
  pointer-events: none;
  white-space: pre;

  .tree-outline li.child-editing & {
    display: none;
  }
}

.styles-pane-button {
  width: var(--sys-size-8);
  height: var(--sys-size-8);
  margin-left: var(--sys-size-4);
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}
/* Matched styles */

:host-context(.matched-styles) .tree-outline li {
  margin-left: 0 !important; /* stylelint-disable-line declaration-no-important */
}

.expand-icon {
  user-select: none;
  margin-left: -6px;
  margin-right: 2px;
  margin-bottom: -4px;

  .tree-outline li:not(.parent) & {
    display: none;
  }
}

:host-context(.matched-styles:not(.read-only):hover) li:not(.child-editing) .enabled-button,
:host-context(.matched-styles:not(.read-only)) .tree-outline li.disabled:not(.child-editing) .enabled-button {
  visibility: visible;
}

:host-context(.matched-styles) {
  ol.expanded {
    margin-left: 16px;
  }

  :focus-visible {
    border-radius: var(--sys-size-2);
    outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
  }
}

.devtools-link-styled-trim {
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 80%;
  vertical-align: bottom;
}

devtools-css-angle,
devtools-css-length {
  display: inline-block;
}

devtools-css-length {
  margin-left: 1px;
}

devtools-icon.open-in-animations-panel {
  position: relative;
  transform: scale(0.7);
  margin: -5px -2px -3px -4px;
  user-select: none;
  color: var(--icon-css);
  cursor: default;

  &:hover {
    color: var(--icon-css-hover);
  }
}

.css-function-inline-block {
  display: inline-block;
  padding-left: 18px;  /* should match enabled-button width */
  margin-left: -38px;  /* should match .webkit-css-property margin-left */
  color: var(--app-color-element-sidebar-subtitle);
}

.tracing-anchor {
  text-decoration: underline dotted var(--sys-color-token-meta);
}

devtools-icon.bezier-swatch-icon {
  position: relative;
  transform: scale(0.7);
  margin: -5px -2px -3px -4px;
  user-select: none;
  color: var(--icon-css);
  cursor: default;

  &:hover {
    color: var(--icon-css-hover);
  }
}

span.bezier-icon-and-text {
  white-space: nowrap;
}

/*# sourceURL=${import.meta.resolve("./stylePropertiesTreeOutline.css")} */`;

// gen/front_end/panels/elements/CSSValueTraceView.js
var { html: html4, render: render3, Directives: { classMap, ifDefined } } = Lit3;
function defaultView(input, output, target) {
  const substitutions = [...input.substitutions];
  const evaluations = [...input.evaluations];
  const finalResult = evaluations.pop() ?? substitutions.pop();
  const [firstEvaluation, ...intermediateEvaluations] = evaluations;
  const hiddenSummary = !firstEvaluation || intermediateEvaluations.length === 0;
  const summaryTabIndex = hiddenSummary ? void 0 : 0;
  const singleResult = evaluations.length === 0 && substitutions.length === 0;
  render3(html4`
      <div role=dialog class="css-value-trace monospace" @keydown=${onKeyDown}>
        ${substitutions.map((line) => html4`
          <span class="trace-line-icon" aria-label="is equal to">↳</span>
          <span class="trace-line">${line}</span>`)}
        ${firstEvaluation && intermediateEvaluations.length === 0 ? html4`
          <span class="trace-line-icon" aria-label="is equal to">↳</span>
          <span class="trace-line">${firstEvaluation}</span>` : html4`
          <details @toggle=${input.onToggle} ?hidden=${hiddenSummary}>
            <summary tabindex=${ifDefined(summaryTabIndex)}>
              <span class="trace-line-icon" aria-label="is equal to">↳</span>
              <devtools-icon class="marker"></devtools-icon>
              <span class="trace-line">${firstEvaluation}</span>
            </summary>
            <div>
              ${intermediateEvaluations.map((evaluation) => html4`
                  <span class="trace-line-icon" aria-label="is equal to" >↳</span>
                  <span class="trace-line">${evaluation}</span>`)}
            </div>
          </details>`}
        ${finalResult ? html4`
          <span class="trace-line-icon" aria-label="is equal to" ?hidden=${singleResult}>↳</span>
          <span class=${classMap({ "trace-line": true, "full-row": singleResult })}>
            ${finalResult}
          </span>` : ""}
      </div>`, target);
  function onKeyDown(e) {
    if (!e.altKey) {
      if (e.key.startsWith("Arrow") || e.key === " " || e.key === "Enter") {
        e.consume();
      }
    }
    if (e.key === "Tab") {
      const tabstops = this.querySelectorAll("[tabindex]") ?? [];
      const firstTabStop = tabstops[0];
      const lastTabStop = tabstops[tabstops.length - 1];
      if (e.target === lastTabStop && !e.shiftKey) {
        e.consume(true);
        if (firstTabStop instanceof HTMLElement) {
          firstTabStop.focus();
        }
      }
      if (e.target === firstTabStop && e.shiftKey) {
        e.consume(true);
        if (lastTabStop instanceof HTMLElement) {
          lastTabStop.focus();
        }
      }
    }
  }
}
var CSSValueTraceView = class extends UI7.Widget.VBox {
  #highlighting;
  #view;
  #evaluations = [];
  #substitutions = [];
  #pendingFocus = false;
  constructor(element, view = defaultView) {
    super(element, { useShadowDom: true });
    this.registerRequiredCSS(cssValueTraceView_css_default, stylePropertiesTreeOutline_css_default);
    this.#view = view;
    this.requestUpdate();
  }
  async showTrace(property, subexpression, matchedStyles, computedStyles, renderers, expandPercentagesInShorthands, shorthandPositionOffset, focus2) {
    const matchedResult = subexpression === null ? property.parseValue(matchedStyles, computedStyles) : property.parseExpression(subexpression, matchedStyles, computedStyles);
    if (!matchedResult) {
      return void 0;
    }
    return await this.#showTrace(property, matchedResult, renderers, expandPercentagesInShorthands, shorthandPositionOffset, focus2);
  }
  async #showTrace(property, matchedResult, renderers, expandPercentagesInShorthands, shorthandPositionOffset, focus2) {
    this.#highlighting = new Highlighting();
    const rendererMap = new Map(renderers.map((r) => [r.matchType, r]));
    const substitutions = [];
    const evaluations = [];
    const tracing = new TracingContext(this.#highlighting, expandPercentagesInShorthands, shorthandPositionOffset, matchedResult);
    while (tracing.nextSubstitution()) {
      const context = new RenderingContext(
        matchedResult.ast,
        property,
        rendererMap,
        matchedResult,
        /* cssControls */
        void 0,
        /* options */
        {},
        tracing
      );
      substitutions.push(Renderer.render(matchedResult.ast.tree, context).nodes);
    }
    const asyncCallbackResults = [];
    while (tracing.nextEvaluation()) {
      const context = new RenderingContext(
        matchedResult.ast,
        property,
        rendererMap,
        matchedResult,
        /* cssControls */
        void 0,
        /* options */
        {},
        tracing
      );
      evaluations.push(Renderer.render(matchedResult.ast.tree, context).nodes);
      asyncCallbackResults.push(tracing.runAsyncEvaluations());
    }
    this.#substitutions = substitutions;
    this.#evaluations = [];
    for (const [index, success] of (await Promise.all(asyncCallbackResults)).entries()) {
      if (success) {
        this.#evaluations.push(evaluations[index]);
      }
    }
    if (this.#substitutions.length === 0 && this.#evaluations.length === 0) {
      const context = new RenderingContext(matchedResult.ast, property, rendererMap, matchedResult);
      this.#evaluations.push(Renderer.render(matchedResult.ast.tree, context).nodes);
    }
    this.#pendingFocus = focus2;
    this.requestUpdate();
  }
  performUpdate() {
    const viewInput = {
      substitutions: this.#substitutions,
      evaluations: this.#evaluations,
      onToggle: () => this.onResize()
    };
    this.#view(viewInput, {}, this.contentElement);
    const tabStop = this.contentElement.querySelector("[tabindex]");
    this.setDefaultFocusedElement(tabStop);
    if (tabStop && this.#pendingFocus) {
      this.focus();
      this.resetPendingFocus();
    }
  }
  resetPendingFocus() {
    this.#pendingFocus = false;
  }
};

// gen/front_end/panels/elements/StylePropertyUtils.js
var StylePropertyUtils_exports = {};
__export(StylePropertyUtils_exports, {
  getCssDeclarationAsJavascriptProperty: () => getCssDeclarationAsJavascriptProperty
});
function getCssDeclarationAsJavascriptProperty(declaration) {
  const { name, value: value5 } = declaration;
  const declarationNameAsJs = name.startsWith("--") ? `'${name}'` : name.replace(/-([a-z])/gi, (_str, group) => group.toUpperCase());
  const declarationAsJs = `'${value5.replaceAll("'", "\\'")}'`;
  return `${declarationNameAsJs}: ${declarationAsJs}`;
}

// gen/front_end/panels/elements/StylePropertyTreeElement.js
var { html: html5, nothing, render: render4, Directives: { classMap: classMap2 } } = Lit4;
var ASTUtils = SDK6.CSSPropertyParser.ASTUtils;
var FlexboxEditor = ElementsComponents.StylePropertyEditor.FlexboxEditor;
var GridEditor = ElementsComponents.StylePropertyEditor.GridEditor;
var GridLanesEditor = ElementsComponents.StylePropertyEditor.GridLanesEditor;
var UIStrings5 = {
  /**
   * @description Text in Color Swatch Popover Icon of the Elements panel
   */
  shiftClickToChangeColorFormat: "Shift + Click to change color format.",
  /**
   * @description Swatch icon element title in Color Swatch Popover Icon of the Elements panel
   * @example {Shift + Click to change color format.} PH1
   */
  openColorPickerS: "Open color picker. {PH1}",
  /**
   * @description Context menu item for style property in edit mode
   */
  togglePropertyAndContinueEditing: "Toggle property and continue editing",
  /**
   * @description Context menu item for style property in edit mode
   */
  openInSourcesPanel: "Open in Sources panel",
  /**
   * @description A context menu item in Styles panel to copy CSS declaration
   */
  copyDeclaration: "Copy declaration",
  /**
   * @description A context menu item in Styles panel to copy CSS property
   */
  copyProperty: "Copy property",
  /**
   * @description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel and Network pane request.
   */
  copyValue: "Copy value",
  /**
   * @description A context menu item in Styles panel to copy CSS rule
   */
  copyRule: "Copy rule",
  /**
   * @description A context menu item in Styles panel to copy all CSS declarations
   */
  copyAllDeclarations: "Copy all declarations",
  /**
   * @description A context menu item in Styles panel to view the computed CSS property value.
   */
  viewComputedValue: "View computed value",
  /**
   * @description Title of the button that opens the flexbox editor in the Styles panel.
   */
  flexboxEditorButton: "Open `flexbox` editor",
  /**
   * @description Title of the button that opens the CSS Grid editor in the Styles panel.
   */
  gridEditorButton: "Open `grid` editor",
  /**
   * @description Title of the button that opens the CSS Grid Lanes editor in the Styles panel.
   */
  gridLanesEditorButton: "Open `grid-lanes` editor",
  /**
   * @description A context menu item in Styles panel to copy CSS declaration as JavaScript property.
   */
  copyCssDeclarationAsJs: "Copy declaration as JS",
  /**
   * @description A context menu item in Styles panel to copy all declarations of CSS rule as JavaScript properties.
   */
  copyAllCssDeclarationsAsJs: "Copy all declarations as JS",
  /**
   * @description Title of the link in Styles panel to jump to the Animations panel.
   */
  jumpToAnimationsPanel: "Jump to Animations panel",
  /**
   * @description Text displayed in a tooltip shown when hovering over a CSS property value references a name that's not
   *             defined and can't be linked to.
   * @example {--my-linkable-name} PH1
   */
  sIsNotDefined: "{PH1} is not defined",
  /**
   * @description Text in Styles Sidebar Pane of the Elements panel
   */
  invalidPropertyValue: "Invalid property value",
  /**
   * @description Text in Styles Sidebar Pane of the Elements panel
   */
  unknownPropertyName: "Unknown property name",
  /**
   * @description Announcement string for invalid properties.
   * @example {Invalid property value} PH1
   * @example {font-size} PH2
   * @example {invalidValue} PH3
   */
  invalidString: "{PH1}, property name: {PH2}, property value: {PH3}",
  /**
   * @description Title in the styles tab for the icon button for jumping to the anchor node.
   */
  jumpToAnchorNode: "Jump to anchor node"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/elements/StylePropertyTreeElement.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var parentMap = /* @__PURE__ */ new WeakMap();
var EnvFunctionRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.EnvFunctionMatch) {
  treeElement;
  matchedStyles;
  computedStyles;
  // clang-format on
  constructor(treeElement, matchedStyles, computedStyles) {
    super();
    this.treeElement = treeElement;
    this.matchedStyles = matchedStyles;
    this.computedStyles = computedStyles;
  }
  render(match, context) {
    const [, fallbackNodes] = ASTUtils.callArgs(match.node);
    if (match.value) {
      const substitution = context.tracing?.substitution();
      if (substitution) {
        if (match.varNameIsValid) {
          return [document.createTextNode(match.value)];
        }
        return Renderer.render(fallbackNodes, substitution.renderingContext(context)).nodes;
      }
    }
    const span = document.createElement("span");
    const func = this.treeElement?.getTracingTooltip("env", match.node, this.matchedStyles, this.computedStyles, context) ?? "env";
    const valueClass = classMap2({ "inactive-value": !match.varNameIsValid });
    const fallbackClass = classMap2({ "inactive-value": match.varNameIsValid });
    render4(html5`${func}(<span class=${valueClass}>${match.varName}</span>${fallbackNodes ? html5`, <span class=${fallbackClass}>${Renderer.render(fallbackNodes, context).nodes}</span>` : nothing})`, span, { host: span });
    return [span];
  }
};
var FlexGridRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.FlexGridGridLanesMatch) {
  // clang-format on
  #treeElement;
  #stylesPane;
  constructor(stylesPane, treeElement) {
    super();
    this.#treeElement = treeElement;
    this.#stylesPane = stylesPane;
  }
  render(match, context) {
    const children = Renderer.render(ASTUtils.siblings(ASTUtils.declValue(match.node)), context).nodes;
    if (!this.#treeElement?.editable()) {
      return children;
    }
    const key2 = `${this.#treeElement.section().getSectionIdx()}_${this.#treeElement.section().nextEditorTriggerButtonIdx}`;
    function getEditorClass(layoutType) {
      switch (layoutType) {
        case "flex":
          return FlexboxEditor;
        case "grid":
          return GridEditor;
        case "grid-lanes":
          return GridLanesEditor;
      }
    }
    function getButtonTitle(layoutType) {
      switch (layoutType) {
        case "flex":
          return i18nString5(UIStrings5.flexboxEditorButton);
        case "grid":
          return i18nString5(UIStrings5.gridEditorButton);
        case "grid-lanes":
          return i18nString5(UIStrings5.gridLanesEditorButton);
      }
    }
    function getSwatchType(layoutType) {
      switch (layoutType) {
        case "flex":
          return 6;
        case "grid":
          return 5;
        case "grid-lanes":
          return 12;
      }
    }
    const button = StyleEditorWidget.createTriggerButton(this.#stylesPane, this.#treeElement.section(), getEditorClass(match.layoutType), getButtonTitle(match.layoutType), key2);
    button.tabIndex = -1;
    button.setAttribute("jslog", `${VisualLogging3.showStyleEditor().track({ click: true }).context(match.layoutType)}`);
    this.#treeElement.section().nextEditorTriggerButtonIdx++;
    button.addEventListener("click", () => {
      Host.userMetrics.swatchActivated(getSwatchType(match.layoutType));
    });
    const helper = this.#stylesPane.swatchPopoverHelper();
    if (helper.isShowing(StyleEditorWidget.instance()) && StyleEditorWidget.instance().getTriggerKey() === key2) {
      helper.setAnchorElement(button);
    }
    return [...children, button];
  }
};
var CSSWideKeywordRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.CSSWideKeywordMatch) {
  // clang-format on
  #treeElement;
  #stylesPane;
  constructor(stylesPane, treeElement) {
    super();
    this.#treeElement = treeElement;
    this.#stylesPane = stylesPane;
  }
  render(match, context) {
    const resolvedProperty = match.resolveProperty();
    if (!resolvedProperty) {
      return [document.createTextNode(match.text)];
    }
    const swatch = new InlineEditor2.LinkSwatch.LinkSwatch();
    swatch.data = {
      text: match.text,
      tooltip: resolvedProperty ? void 0 : { title: i18nString5(UIStrings5.sIsNotDefined, { PH1: match.text }) },
      isDefined: Boolean(resolvedProperty),
      onLinkActivate: () => resolvedProperty && this.#stylesPane.jumpToDeclaration(resolvedProperty),
      jslogContext: "css-wide-keyword-link"
    };
    if (SDK6.CSSMetadata.cssMetadata().isColorAwareProperty(resolvedProperty.name) || SDK6.CSSMetadata.cssMetadata().isCustomProperty(resolvedProperty.name)) {
      const color = Common3.Color.parse(context.matchedResult.getComputedText(match.node));
      if (color) {
        return [new ColorRenderer(this.#stylesPane, this.#treeElement).renderColorSwatch(color, swatch), swatch];
      }
    }
    return [swatch];
  }
};
var VariableRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.VariableMatch) {
  // clang-format on
  #stylesPane;
  #treeElement;
  #matchedStyles;
  #computedStyles;
  constructor(stylesPane, treeElement, matchedStyles, computedStyles) {
    super();
    this.#treeElement = treeElement;
    this.#stylesPane = stylesPane;
    this.#matchedStyles = matchedStyles;
    this.#computedStyles = computedStyles;
  }
  render(match, context) {
    if (this.#treeElement?.property.ownerStyle.parentRule instanceof SDK6.CSSRule.CSSFunctionRule) {
      return Renderer.render(ASTUtils.children(match.node), context).nodes;
    }
    const { declaration, value: variableValue } = match.resolveVariable() ?? {};
    const fromFallback = variableValue === void 0;
    const computedValue = variableValue ?? match.fallbackValue();
    const onLinkActivate = (name) => this.#handleVarDefinitionActivate(declaration ?? name);
    const varSwatch = document.createElement("span");
    const substitution = context.tracing?.substitution({ match, context });
    if (substitution) {
      if (declaration?.declaration) {
        const { nodes, cssControls } = Renderer.renderValueNodes({ name: declaration.name, value: declaration.value ?? "" }, substitution.cachedParsedValue(declaration.declaration, this.#matchedStyles, this.#computedStyles), getPropertyRenderers(declaration.name, declaration.style, this.#stylesPane, this.#matchedStyles, null, this.#computedStyles), substitution);
        cssControls.forEach((value5, key2) => value5.forEach((control) => context.addControl(key2, control)));
        return nodes;
      }
      if (!declaration && match.fallback) {
        return Renderer.render(match.fallback, substitution.renderingContext(context)).nodes;
      }
    }
    const renderedFallback = match.fallback ? Renderer.render(match.fallback, context) : void 0;
    const varCall = this.#treeElement?.getTracingTooltip("var", match.node, this.#matchedStyles, this.#computedStyles, context);
    const tooltipContents = this.#stylesPane.getVariablePopoverContents(this.#matchedStyles, match.name, variableValue ?? null);
    const tooltipId = this.#treeElement?.getTooltipId("custom-property-var");
    const tooltip = tooltipId ? { tooltipId } : void 0;
    render4(html5`
        <span data-title=${computedValue || ""}
              jslog=${VisualLogging3.link("css-variable").track({ click: true, hover: true })}>
          ${varCall ?? "var"}(
          <devtools-link-swatch class=css-var-link .data=${{
      tooltip,
      text: match.name,
      isDefined: computedValue !== null && !fromFallback,
      onLinkActivate
    }}>
           </devtools-link-swatch>
           ${renderedFallback ? html5`, ${renderedFallback.nodes}` : nothing})
        </span>
        ${tooltipId ? html5`
          <devtools-tooltip
            id=${tooltipId}
            variant=rich
            jslogContext=elements.css-var
          >
            ${tooltipContents}
          </devtools-tooltip>
        ` : ""}
    `, varSwatch);
    const color = computedValue && Common3.Color.parse(computedValue);
    if (!color) {
      return [varSwatch];
    }
    const colorSwatch = new ColorRenderer(this.#stylesPane, this.#treeElement).renderColorSwatch(color, varSwatch);
    context.addControl("color", colorSwatch);
    if (fromFallback) {
      renderedFallback?.cssControls.get("color")?.forEach((innerSwatch) => innerSwatch.addEventListener(InlineEditor2.ColorSwatch.ColorChangedEvent.eventName, (ev) => {
        colorSwatch.color = ev.data.color;
      }));
    }
    return [colorSwatch, varSwatch];
  }
  #handleVarDefinitionActivate(variable) {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CustomPropertyLinkClicked);
    Host.userMetrics.swatchActivated(
      0
      /* Host.UserMetrics.SwatchType.VAR_LINK */
    );
    if (typeof variable === "string") {
      this.#stylesPane.jumpToProperty(variable) || this.#stylesPane.jumpToProperty("initial-value", variable, REGISTERED_PROPERTY_SECTION_NAME);
    } else if (variable.declaration instanceof SDK6.CSSProperty.CSSProperty) {
      this.#stylesPane.revealProperty(variable.declaration);
    } else if (variable.declaration instanceof SDK6.CSSMatchedStyles.CSSRegisteredProperty) {
      this.#stylesPane.jumpToProperty("initial-value", variable.name, REGISTERED_PROPERTY_SECTION_NAME);
    }
  }
};
var AttributeRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.AttributeMatch) {
  // clang-format on
  #stylesPane;
  #treeElement;
  #matchedStyles;
  #computedStyles;
  constructor(stylesPane, treeElement, matchedStyles, computedStyles) {
    super();
    this.#treeElement = treeElement;
    this.#stylesPane = stylesPane;
    this.#matchedStyles = matchedStyles;
    this.#computedStyles = computedStyles;
  }
  render(match, context) {
    if (this.#treeElement?.property.ownerStyle.parentRule instanceof SDK6.CSSRule.CSSFunctionRule) {
      return Renderer.render(ASTUtils.children(match.node), context).nodes;
    }
    const rawValue = match.rawAttributeValue();
    const attributeValue = match.resolveAttributeValue();
    const fromFallback = attributeValue === null;
    const attributeMissing = rawValue === null;
    const typeError = fromFallback && !attributeMissing;
    const attributeClass = attributeMissing ? "inactive" : "";
    const typeClass = typeError ? "inactive" : "";
    const fallbackClass = fromFallback ? "" : "inactive";
    const computedValue = attributeValue ?? match.fallbackValue();
    const varSwatch = document.createElement("span");
    const substitution = context.tracing?.substitution({ match, context });
    if (substitution) {
      if (fromFallback) {
        if (match.fallback) {
          return Renderer.render(match.fallback, substitution.renderingContext(context)).nodes;
        }
      } else if (match.substitutionText !== null) {
        const matching = SDK6.CSSPropertyParser.matchDeclaration("--property", match.substitutionText, this.#matchedStyles.propertyMatchers(match.style, this.#computedStyles));
        return Renderer.renderValueNodes({ name: "--property", value: match.substitutionText }, matching, getPropertyRenderers("--property", match.style, this.#stylesPane, this.#matchedStyles, null, this.#computedStyles), substitution).nodes;
      }
    }
    const renderedFallback = match.fallback ? Renderer.render(match.fallback, context) : void 0;
    const attrCall = this.#treeElement?.getTracingTooltip("attr", match.node, this.#matchedStyles, this.#computedStyles, context);
    const tooltipId = attributeMissing ? void 0 : this.#treeElement?.getTooltipId("custom-attribute");
    const tooltip = tooltipId ? { tooltipId } : void 0;
    render4(html5`
        <span data-title=${computedValue || ""}
              jslog=${VisualLogging3.link("css-variable").track({ click: true, hover: true })}
        >${attrCall ?? "attr"}(<devtools-link-swatch class=${attributeClass} .data=${{
      tooltip,
      text: match.name,
      isDefined: true,
      onLinkActivate: () => this.#handleAttributeActivate(this.#matchedStyles.originatingNodeForStyle(match.style), match.name)
    }}></devtools-link-swatch>${tooltipId ? html5`
          <devtools-tooltip
            id=${tooltipId}
            variant=rich
            jslogContext=elements.css-var
          >${JSON.stringify(rawValue)}</devtools-tooltip>` : nothing}${match.type ? html5` <span class=${typeClass}>${match.type}</span>` : nothing}${renderedFallback ? html5`, <span class=${fallbackClass}>${renderedFallback.nodes}</span>` : nothing})</span>`, varSwatch);
    const color = computedValue && Common3.Color.parse(computedValue);
    if (!color) {
      return [varSwatch];
    }
    const colorSwatch = new ColorRenderer(this.#stylesPane, this.#treeElement).renderColorSwatch(color, varSwatch);
    context.addControl("color", colorSwatch);
    if (fromFallback) {
      renderedFallback?.cssControls.get("color")?.forEach((innerSwatch) => innerSwatch.addEventListener(InlineEditor2.ColorSwatch.ColorChangedEvent.eventName, (ev) => {
        colorSwatch.color = ev.data.color;
      }));
    }
    return [colorSwatch, varSwatch];
  }
  #handleAttributeActivate(node, attribute) {
    if (!node) {
      return;
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AttributeLinkClicked);
    Host.userMetrics.swatchActivated(
      11
      /* Host.UserMetrics.SwatchType.ATTR_LINK */
    );
    ElementsPanel.instance().highlightNodeAttribute(node, attribute);
  }
};
var LinearGradientRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.LinearGradientMatch) {
  // clang-format on
  render(match, context) {
    const children = ASTUtils.children(match.node);
    const { nodes, cssControls } = Renderer.render(children, context);
    const angles = cssControls.get("angle");
    const angle = angles?.length === 1 ? angles[0] : null;
    if (angle instanceof InlineEditor2.CSSAngle.CSSAngle) {
      angle.updateProperty(context.matchedResult.getComputedText(match.node));
      const args = ASTUtils.callArgs(match.node);
      const angleNode = args[0]?.find((node) => context.matchedResult.getMatch(node) instanceof SDK6.CSSPropertyParserMatchers.AngleMatch);
      const angleMatch = angleNode && context.matchedResult.getMatch(angleNode);
      if (angleMatch) {
        angle.addEventListener(InlineEditor2.InlineEditorUtils.ValueChangedEvent.eventName, (ev) => {
          angle.updateProperty(context.matchedResult.getComputedText(match.node, (match2) => match2 === angleMatch ? ev.data.value : null));
        });
      }
    }
    return nodes;
  }
};
var RelativeColorChannelRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.RelativeColorChannelMatch) {
  // clang-format on
  #treeElement;
  constructor(treeElement) {
    super();
    this.#treeElement = treeElement;
  }
  render(match, context) {
    const color = context.findParent(match.node, SDK6.CSSPropertyParserMatchers.ColorMatch);
    if (!color?.relativeColor) {
      return [document.createTextNode(match.text)];
    }
    const value5 = match.getColorChannelValue(color.relativeColor);
    if (value5 === null) {
      return [document.createTextNode(match.text)];
    }
    const evaluation = context.tracing?.applyEvaluation([], () => ({ placeholder: [document.createTextNode(value5.toFixed(3))] }));
    if (evaluation) {
      return evaluation;
    }
    const span = document.createElement("span");
    span.append(match.text);
    const tooltipId = this.#treeElement?.getTooltipId("relative-color-channel");
    if (!tooltipId) {
      return [span];
    }
    span.setAttribute("aria-details", tooltipId);
    const tooltip = new Tooltips.Tooltip.Tooltip({
      id: tooltipId,
      variant: "rich",
      anchor: span,
      jslogContext: "elements.relative-color-channel"
    });
    tooltip.append(value5.toFixed(3));
    return [span, tooltip];
  }
};
var ColorRenderer = class _ColorRenderer extends rendererBase(SDK6.CSSPropertyParserMatchers.ColorMatch) {
  // clang-format on
  #treeElement;
  #stylesPane;
  constructor(stylesPane, treeElement) {
    super();
    this.#treeElement = treeElement;
    this.#stylesPane = stylesPane;
  }
  #getValueChild(match, context) {
    const valueChild = document.createElement("span");
    if (match.node.name !== "CallExpression") {
      valueChild.appendChild(document.createTextNode(match.text));
      return { valueChild };
    }
    const func = context.matchedResult.ast.text(match.node.getChild("Callee"));
    const args = ASTUtils.siblings(match.node.getChild("ArgList"));
    const childTracingContexts = context.tracing?.evaluation([args], { match, context }) ?? void 0;
    const renderingContext = childTracingContexts?.at(0)?.renderingContext(context) ?? context;
    const { nodes, cssControls } = Renderer.renderInto(args, renderingContext, valueChild);
    render4(html5`${this.#treeElement?.getTracingTooltip(func, match.node, this.#treeElement.matchedStyles(), this.#treeElement.getComputedStyles() ?? /* @__PURE__ */ new Map(), renderingContext) ?? func}${nodes}`, valueChild);
    return { valueChild, cssControls, childTracingContexts };
  }
  render(match, context) {
    const { valueChild, cssControls, childTracingContexts } = this.#getValueChild(match, context);
    let colorText = context.matchedResult.getComputedText(match.node);
    if (match.relativeColor) {
      const fakeSpan = document.body.appendChild(document.createElement("span"));
      fakeSpan.style.backgroundColor = colorText;
      colorText = window.getComputedStyle(fakeSpan).backgroundColor?.toString() || colorText;
      fakeSpan.remove();
    }
    const color = Common3.Color.parse(colorText);
    if (!color) {
      if (match.node.name === "CallExpression") {
        return Renderer.render(ASTUtils.children(match.node), context).nodes;
      }
      return [document.createTextNode(colorText)];
    }
    if (match.node.name === "CallExpression" && childTracingContexts) {
      const evaluation = context.tracing?.applyEvaluation(childTracingContexts, () => {
        const displayColor = color.as(
          (color.alpha ?? 1) !== 1 ? "hexa" : "hex"
          /* Common.Color.Format.HEX */
        );
        const colorText2 = document.createElement("span");
        colorText2.textContent = displayColor.asString();
        const swatch2 = new _ColorRenderer(this.#stylesPane, null).renderColorSwatch(displayColor.isGamutClipped() ? color : displayColor.nickname() ?? displayColor, colorText2);
        swatch2.addEventListener(InlineEditor2.ColorSwatch.ColorChangedEvent.eventName, (ev) => {
          colorText2.textContent = ev.data.color.asString();
        });
        context.addControl("color", swatch2);
        return { placeholder: [swatch2, colorText2] };
      });
      if (evaluation) {
        return evaluation;
      }
    }
    const swatch = this.renderColorSwatch(color, valueChild);
    context.addControl("color", swatch);
    if (cssControls && match.node.name === "CallExpression" && context.ast.text(match.node.getChild("Callee")).match(/^(hsla?|hwba?)/)) {
      const [angle] = cssControls.get("angle") ?? [];
      if (angle instanceof InlineEditor2.CSSAngle.CSSAngle) {
        angle.updateProperty(swatch.color?.asString() ?? "");
        angle.addEventListener(InlineEditor2.InlineEditorUtils.ValueChangedEvent.eventName, (ev) => {
          const hue = Common3.Color.parseHueNumeric(ev.data.value);
          const color2 = swatch.color;
          if (!hue || !color2) {
            return;
          }
          if (color2.is(
            "hsl"
            /* Common.Color.Format.HSL */
          ) || color2.is(
            "hsla"
            /* Common.Color.Format.HSLA */
          )) {
            swatch.color = new Common3.Color.HSL(hue, color2.s, color2.l, color2.alpha);
          } else if (color2.is(
            "hwb"
            /* Common.Color.Format.HWB */
          ) || color2.is(
            "hwba"
            /* Common.Color.Format.HWBA */
          )) {
            swatch.color = new Common3.Color.HWB(hue, color2.w, color2.b, color2.alpha);
          }
          angle.updateProperty(swatch.color?.asString() ?? "");
        });
      }
    }
    return [swatch, valueChild];
  }
  renderColorSwatch(color, valueChild) {
    const editable = this.#treeElement?.editable();
    const shiftClickMessage = i18nString5(UIStrings5.shiftClickToChangeColorFormat);
    const tooltip = editable ? i18nString5(UIStrings5.openColorPickerS, { PH1: shiftClickMessage }) : "";
    const swatch = new InlineEditor2.ColorSwatch.ColorSwatch(tooltip);
    swatch.readonly = !editable;
    if (color) {
      swatch.color = color;
    }
    if (this.#treeElement?.editable()) {
      const treeElement = this.#treeElement;
      const onColorChanged = () => {
        void treeElement.applyStyleText(treeElement.renderedPropertyText(), false);
      };
      const onColorFormatChanged = (e) => {
        valueChild.textContent = e.data.color.getAuthoredText() ?? e.data.color.asString();
        void treeElement.applyStyleText(treeElement.renderedPropertyText(), false);
      };
      swatch.addEventListener(InlineEditor2.ColorSwatch.ClickEvent.eventName, () => {
        Host.userMetrics.swatchActivated(
          2
          /* Host.UserMetrics.SwatchType.COLOR */
        );
      });
      swatch.addEventListener(InlineEditor2.ColorSwatch.ColorChangedEvent.eventName, onColorChanged);
      swatch.addEventListener(InlineEditor2.ColorSwatch.ColorFormatChangedEvent.eventName, onColorFormatChanged);
      const swatchIcon = new ColorSwatchPopoverIcon(treeElement, treeElement.parentPane().swatchPopoverHelper(), swatch);
      swatchIcon.addEventListener("colorchanged", (ev) => {
        valueChild.textContent = ev.data.getAuthoredText() ?? ev.data.asString();
        swatch.color = ev.data;
      });
      if (treeElement.property.name === "color") {
        void this.#addColorContrastInfo(swatchIcon);
      }
    }
    return swatch;
  }
  async #addColorContrastInfo(swatchIcon) {
    const cssModel = this.#stylesPane.cssModel();
    const node = this.#stylesPane.node();
    if (!cssModel || typeof node?.id === "undefined") {
      return;
    }
    const contrastInfo = new ColorPicker2.ContrastInfo.ContrastInfo(await cssModel.getBackgroundColors(node.id));
    swatchIcon.setContrastInfo(contrastInfo);
  }
};
var LightDarkColorRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.LightDarkColorMatch) {
  // clang-format on
  #treeElement;
  #stylesPane;
  #matchedStyles;
  constructor(stylesPane, matchedStyles, treeElement) {
    super();
    this.#treeElement = treeElement;
    this.#stylesPane = stylesPane;
    this.#matchedStyles = matchedStyles;
  }
  render(match, context) {
    const content = document.createElement("span");
    content.appendChild(document.createTextNode("light-dark("));
    const light = content.appendChild(document.createElement("span"));
    content.appendChild(document.createTextNode(", "));
    const dark = content.appendChild(document.createElement("span"));
    content.appendChild(document.createTextNode(")"));
    const { cssControls: lightControls } = Renderer.renderInto(match.light, context, light);
    const { cssControls: darkControls } = Renderer.renderInto(match.dark, context, dark);
    if (context.matchedResult.hasUnresolvedSubstitutions(match.node)) {
      return [content];
    }
    const color = Common3.Color.parse(context.matchedResult.getComputedTextRange(match.light[0], match.light[match.light.length - 1]));
    if (!color) {
      return [content];
    }
    const colorSwatch = new ColorRenderer(this.#stylesPane, this.#treeElement).renderColorSwatch(void 0, content);
    context.addControl("color", colorSwatch);
    void this.applyColorScheme(match, context, colorSwatch, light, dark, lightControls, darkControls);
    return [colorSwatch, content];
  }
  async applyColorScheme(match, context, colorSwatch, light, dark, lightControls, darkControls) {
    const activeColor = await this.#activeColor(match);
    if (!activeColor) {
      return;
    }
    const activeColorSwatches = (activeColor === match.light ? lightControls : darkControls).get("color");
    activeColorSwatches?.forEach((swatch) => swatch.addEventListener(InlineEditor2.ColorSwatch.ColorChangedEvent.eventName, (ev) => {
      colorSwatch.color = ev.data.color;
    }));
    const inactiveColor = activeColor === match.light ? dark : light;
    const colorText = context.matchedResult.getComputedTextRange(activeColor[0], activeColor[activeColor.length - 1]);
    const color = colorText && Common3.Color.parse(colorText);
    inactiveColor.classList.add("inactive-value");
    if (color) {
      colorSwatch.color = color;
    }
  }
  // Returns the syntax node group corresponding the active color scheme:
  // If the element has color-scheme set to light or dark, return the respective group.
  // If the element has color-scheme set to both light and dark, we check the prefers-color-scheme media query.
  async #activeColor(match) {
    const activeColorSchemes = this.#matchedStyles.resolveProperty("color-scheme", match.style)?.parseValue(this.#matchedStyles, /* @__PURE__ */ new Map())?.getComputedPropertyValueText().split(" ") ?? [];
    const hasLight = activeColorSchemes.includes(
      "light"
      /* SDK.CSSModel.ColorScheme.LIGHT */
    );
    const hasDark = activeColorSchemes.includes(
      "dark"
      /* SDK.CSSModel.ColorScheme.DARK */
    );
    if (!hasDark && !hasLight) {
      return match.light;
    }
    if (!hasLight) {
      return match.dark;
    }
    if (!hasDark) {
      return match.light;
    }
    switch (await this.#stylesPane.cssModel()?.colorScheme()) {
      case "dark":
        return match.dark;
      case "light":
        return match.light;
      default:
        return void 0;
    }
  }
};
var ColorMixRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.ColorMixMatch) {
  // clang-format on
  #pane;
  #matchedStyles;
  #computedStyles;
  #treeElement;
  constructor(pane9, matchedStyles, computedStyles, treeElement) {
    super();
    this.#pane = pane9;
    this.#matchedStyles = matchedStyles;
    this.#computedStyles = computedStyles;
    this.#treeElement = treeElement;
  }
  render(match, context) {
    const hookUpColorArg = (node, onChange) => {
      if (node instanceof InlineEditor2.ColorMixSwatch.ColorMixSwatch || node instanceof InlineEditor2.ColorSwatch.ColorSwatch) {
        if (node instanceof InlineEditor2.ColorSwatch.ColorSwatch) {
          node.addEventListener(InlineEditor2.ColorSwatch.ColorChangedEvent.eventName, (ev) => onChange(ev.data.color.getAuthoredText() ?? ev.data.color.asString()));
        } else {
          node.addEventListener(InlineEditor2.ColorMixSwatch.ColorMixChangedEvent.eventName, (ev) => onChange(ev.data.text));
        }
        const color = node.getText();
        if (color) {
          onChange(color);
          return true;
        }
      }
      return false;
    };
    const childTracingContexts = context.tracing?.evaluation([match.space, match.color1, match.color2], { match, context });
    const childRenderingContexts = childTracingContexts?.map((ctx) => ctx.renderingContext(context)) ?? [context, context, context];
    const contentChild = document.createElement("span");
    const color1 = Renderer.renderInto(match.color1, childRenderingContexts[1], contentChild);
    const color2 = Renderer.renderInto(match.color2, childRenderingContexts[2], contentChild);
    render4(html5`${this.#treeElement?.getTracingTooltip("color-mix", match.node, this.#matchedStyles, this.#computedStyles, context) ?? "color-mix"}(${Renderer.render(match.space, childRenderingContexts[0]).nodes}, ${color1.nodes}, ${color2.nodes})`, contentChild);
    const color1Controls = color1.cssControls.get("color") ?? [];
    const color2Controls = color2.cssControls.get("color") ?? [];
    if (context.matchedResult.hasUnresolvedSubstitutions(match.node) || color1Controls.length !== 1 || color2Controls.length !== 1) {
      return [contentChild];
    }
    const space = match.space.map((space2) => context.matchedResult.getComputedText(space2)).join(" ");
    const color1Text = match.color1.map((color) => context.matchedResult.getComputedText(color)).join(" ");
    const color2Text = match.color2.map((color) => context.matchedResult.getComputedText(color)).join(" ");
    const colorMixText = `color-mix(${space}, ${color1Text}, ${color2Text})`;
    const nodeId = this.#pane.node()?.id;
    if (nodeId !== void 0 && childTracingContexts) {
      const evaluation = context.tracing?.applyEvaluation(childTracingContexts, () => {
        const initialColor = Common3.Color.parse("#000");
        const colorText = document.createElement("span");
        colorText.textContent = initialColor.asString();
        const swatch2 = new ColorRenderer(this.#pane, null).renderColorSwatch(initialColor, colorText);
        swatch2.addEventListener(InlineEditor2.ColorSwatch.ColorChangedEvent.eventName, (ev) => {
          colorText.textContent = ev.data.color.asString();
        });
        context.addControl("color", swatch2);
        const asyncEvalCallback = async () => {
          const results = await this.#pane.cssModel()?.resolveValues(void 0, nodeId, colorMixText);
          if (results) {
            const color = Common3.Color.parse(results[0]);
            if (color) {
              swatch2.color = color.as(
                "hexa"
                /* Common.Color.Format.HEXA */
              );
              return true;
            }
          }
          return false;
        };
        return { placeholder: [swatch2, colorText], asyncEvalCallback };
      });
      if (evaluation) {
        return evaluation;
      }
    }
    const swatch = new InlineEditor2.ColorMixSwatch.ColorMixSwatch();
    if (!hookUpColorArg(color1Controls[0], (text) => swatch.setFirstColor(text)) || !hookUpColorArg(color2Controls[0], (text) => swatch.setSecondColor(text))) {
      return [contentChild];
    }
    swatch.tabIndex = -1;
    swatch.setColorMixText(colorMixText);
    UI8.ARIAUtils.setLabel(swatch, colorMixText);
    context.addControl("color", swatch);
    if (context.tracing) {
      return [swatch, contentChild];
    }
    const tooltipId = this.#treeElement?.getTooltipId("color-mix");
    if (!tooltipId) {
      return [swatch, contentChild];
    }
    swatch.setAttribute("aria-details", tooltipId);
    const tooltip = new Tooltips.Tooltip.Tooltip({
      id: tooltipId,
      variant: "rich",
      anchor: swatch,
      jslogContext: "elements.css-color-mix"
    });
    const colorTextSpan = tooltip.appendChild(document.createElement("span"));
    tooltip.onbeforetoggle = (e) => {
      if (e.newState !== "open") {
        return;
      }
      const color = swatch.mixedColor();
      if (!color) {
        return;
      }
      const rgb = color.as(
        "hex"
        /* Common.Color.Format.HEX */
      );
      colorTextSpan.textContent = rgb.isGamutClipped() ? color.asString() : rgb.asString();
    };
    return [swatch, contentChild, tooltip];
  }
};
var AngleRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.AngleMatch) {
  // clang-format on
  #treeElement;
  constructor(treeElement) {
    super();
    this.#treeElement = treeElement;
  }
  render(match, context) {
    const angleText = match.text;
    if (!this.#treeElement?.editable()) {
      return [document.createTextNode(angleText)];
    }
    const cssAngle = new InlineEditor2.CSSAngle.CSSAngle();
    cssAngle.setAttribute("jslog", `${VisualLogging3.showStyleEditor().track({ click: true }).context("css-angle")}`);
    const valueElement = document.createElement("span");
    valueElement.textContent = angleText;
    cssAngle.data = {
      angleText,
      containingPane: this.#treeElement.parentPane().element.enclosingNodeOrSelfWithClass("style-panes-wrapper")
    };
    cssAngle.append(valueElement);
    const treeElement = this.#treeElement;
    cssAngle.addEventListener("popovertoggled", ({ data }) => {
      const section3 = treeElement.section();
      if (!section3) {
        return;
      }
      if (data.open) {
        treeElement.parentPane().hideAllPopovers();
        treeElement.parentPane().activeCSSAngle = cssAngle;
        Host.userMetrics.swatchActivated(
          7
          /* Host.UserMetrics.SwatchType.ANGLE */
        );
      }
      section3.element.classList.toggle("has-open-popover", data.open);
      treeElement.parentPane().setEditingStyle(data.open);
      if (!data.open) {
        void treeElement.applyStyleText(treeElement.renderedPropertyText(), true);
      }
    });
    cssAngle.addEventListener("valuechanged", async ({ data }) => {
      valueElement.textContent = data.value;
      await treeElement.applyStyleText(treeElement.renderedPropertyText(), false);
    });
    cssAngle.addEventListener("unitchanged", ({ data }) => {
      valueElement.textContent = data.value;
    });
    context.addControl("angle", cssAngle);
    return [cssAngle];
  }
};
var LinkableNameRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.LinkableNameMatch) {
  // clang-format on
  #matchedStyles;
  #stylesPane;
  constructor(matchedStyles, stylesSidebarPane) {
    super();
    this.#matchedStyles = matchedStyles;
    this.#stylesPane = stylesSidebarPane;
  }
  #getLinkData(match) {
    switch (match.propertyName) {
      case "animation":
      case "animation-name":
        return {
          jslogContext: "css-animation-name",
          metric: 1,
          ruleBlock: "@keyframes",
          isDefined: Boolean(this.#matchedStyles.keyframes().find((kf) => kf.name().text === match.text))
        };
      case "font-palette":
        return {
          jslogContext: "css-font-palette",
          metric: null,
          ruleBlock: "@font-*",
          isDefined: Boolean(this.#matchedStyles.atRules().find((ar) => ar.type() === "font-palette-values" && ar.name()?.text === match.text))
        };
      case "position-try":
      case "position-try-fallbacks":
        return {
          jslogContext: "css-position-try",
          metric: 10,
          ruleBlock: "@position-try",
          isDefined: Boolean(this.#matchedStyles.positionTryRules().find((pt) => pt.name().text === match.text))
        };
    }
  }
  render(match) {
    const swatch = new InlineEditor2.LinkSwatch.LinkSwatch();
    const { metric, jslogContext, ruleBlock, isDefined } = this.#getLinkData(match);
    swatch.data = {
      text: match.text,
      tooltip: isDefined ? void 0 : { title: i18nString5(UIStrings5.sIsNotDefined, { PH1: match.text }) },
      isDefined,
      onLinkActivate: () => {
        metric && Host.userMetrics.swatchActivated(metric);
        if (match.propertyName === "font-palette") {
          this.#stylesPane.jumpToFontPaletteDefinition(match.text);
        } else {
          this.#stylesPane.jumpToSectionBlock(`${ruleBlock} ${match.text}`);
        }
      },
      jslogContext
    };
    if (match.propertyName === "animation" || match.propertyName === "animation-name") {
      const el = document.createElement("span");
      el.appendChild(swatch);
      const node = this.#stylesPane.node();
      if (node) {
        const animationModel = node.domModel().target().model(SDK6.AnimationModel.AnimationModel);
        void animationModel?.getAnimationGroupForAnimation(match.text, node.id).then((maybeAnimationGroup) => {
          if (!maybeAnimationGroup) {
            return;
          }
          const icon = createIcon("animation", "open-in-animations-panel");
          icon.setAttribute("jslog", `${VisualLogging3.link("open-in-animations-panel").track({ click: true })}`);
          icon.setAttribute("role", "button");
          icon.setAttribute("title", i18nString5(UIStrings5.jumpToAnimationsPanel));
          icon.addEventListener("mouseup", (ev) => {
            ev.consume(true);
            void Common3.Revealer.reveal(maybeAnimationGroup);
          });
          el.insertBefore(icon, swatch);
        });
      }
      return [el];
    }
    return [swatch];
  }
};
var BezierRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.BezierMatch) {
  // clang-format on
  #treeElement;
  constructor(treeElement) {
    super();
    this.#treeElement = treeElement;
  }
  render(match, context) {
    const nodes = match.node.name === "CallExpression" ? Renderer.render(ASTUtils.children(match.node), context).nodes : [document.createTextNode(match.text)];
    if (!this.#treeElement?.editable() || !InlineEditor2.AnimationTimingModel.AnimationTimingModel.parse(context.matchedResult.getComputedText(match.node))) {
      return nodes;
    }
    const swatchPopoverHelper = this.#treeElement.parentPane().swatchPopoverHelper();
    const icon = createIcon("bezier-curve-filled", "bezier-swatch-icon");
    icon.setAttribute("jslog", `${VisualLogging3.showStyleEditor("bezier")}`);
    icon.tabIndex = -1;
    icon.addEventListener("click", () => {
      Host.userMetrics.swatchActivated(
        3
        /* Host.UserMetrics.SwatchType.ANIMATION_TIMING */
      );
    });
    const bezierText = document.createElement("span");
    bezierText.append(...nodes);
    new BezierPopoverIcon({ treeElement: this.#treeElement, swatchPopoverHelper, swatch: icon, bezierText });
    const iconAndTextContainer = document.createElement("span");
    iconAndTextContainer.classList.add("bezier-icon-and-text");
    iconAndTextContainer.append(icon);
    iconAndTextContainer.append(bezierText);
    return [iconAndTextContainer];
  }
};
var AutoBaseRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.AutoBaseMatch) {
  #computedStyle;
  // clang-format on
  constructor(computedStyle) {
    super();
    this.#computedStyle = computedStyle;
  }
  render(match, context) {
    const content = document.createElement("span");
    content.appendChild(document.createTextNode("-internal-auto-base("));
    const auto = content.appendChild(document.createElement("span"));
    content.appendChild(document.createTextNode(", "));
    const base = content.appendChild(document.createElement("span"));
    content.appendChild(document.createTextNode(")"));
    Renderer.renderInto(match.auto, context, auto);
    Renderer.renderInto(match.base, context, base);
    const activeAppearance = this.#computedStyle.get("appearance");
    if (activeAppearance?.startsWith("base")) {
      auto.classList.add("inactive-value");
    } else {
      base.classList.add("inactive-value");
    }
    return [content];
  }
};
var ShadowModel = class {
  #properties;
  #shadowType;
  #context;
  constructor(shadowType, properties, context) {
    this.#shadowType = shadowType;
    this.#properties = properties;
    this.#context = context;
  }
  isBoxShadow() {
    return this.#shadowType === "boxShadow";
  }
  inset() {
    return Boolean(this.#properties.find(
      (property) => property.propertyType === "inset"
      /* ShadowPropertyType.INSET */
    ));
  }
  #length(lengthType) {
    return this.#properties.find((property) => property.propertyType === lengthType)?.length ?? InlineEditor2.CSSShadowEditor.CSSLength.zero();
  }
  offsetX() {
    return this.#length(
      "x"
      /* ShadowPropertyType.X */
    );
  }
  offsetY() {
    return this.#length(
      "y"
      /* ShadowPropertyType.Y */
    );
  }
  blurRadius() {
    return this.#length(
      "blur"
      /* ShadowPropertyType.BLUR */
    );
  }
  spreadRadius() {
    return this.#length(
      "spread"
      /* ShadowPropertyType.SPREAD */
    );
  }
  #needsExpansion(property) {
    return Boolean(property.expansionContext && property.source);
  }
  #expandPropertyIfNeeded(property) {
    if (this.#needsExpansion(property)) {
      const source = property.source;
      this.#properties.filter((property2) => property2.source === source).forEach((property2) => {
        property2.source = null;
      });
    }
  }
  #expandOrGetProperty(propertyType) {
    const index = this.#properties.findIndex((property2) => property2.propertyType === propertyType);
    const property = index >= 0 ? this.#properties[index] : void 0;
    property && this.#expandPropertyIfNeeded(property);
    return { property, index };
  }
  setInset(inset) {
    if (!this.isBoxShadow()) {
      return;
    }
    const { property, index } = this.#expandOrGetProperty(
      "inset"
      /* ShadowPropertyType.INSET */
    );
    if (property) {
      if (!inset) {
        this.#properties.splice(index, 1);
      }
    } else {
      this.#properties.unshift({
        value: "inset",
        source: null,
        expansionContext: null,
        propertyType: "inset"
        /* ShadowPropertyType.INSET */
      });
    }
  }
  #setLength(value5, propertyType) {
    const { property } = this.#expandOrGetProperty(propertyType);
    if (property) {
      property.value = value5.asCSSText();
      property.length = value5;
      property.source = null;
    } else {
      const insertionIdx = 1 + this.#properties.findLastIndex((property2) => property2.propertyType === "y" || propertyType === "spread" && property2.propertyType === "blur");
      if (insertionIdx > 0 && insertionIdx < this.#properties.length && this.#needsExpansion(this.#properties[insertionIdx]) && this.#properties[insertionIdx - 1].source === this.#properties[insertionIdx].source) {
        this.#expandPropertyIfNeeded(this.#properties[insertionIdx]);
      }
      this.#properties.splice(insertionIdx, 0, { value: value5.asCSSText(), length: value5, source: null, expansionContext: null, propertyType });
    }
  }
  setOffsetX(value5) {
    this.#setLength(
      value5,
      "x"
      /* ShadowPropertyType.X */
    );
  }
  setOffsetY(value5) {
    this.#setLength(
      value5,
      "y"
      /* ShadowPropertyType.Y */
    );
  }
  setBlurRadius(value5) {
    this.#setLength(
      value5,
      "blur"
      /* ShadowPropertyType.BLUR */
    );
  }
  setSpreadRadius(value5) {
    if (this.isBoxShadow()) {
      this.#setLength(
        value5,
        "spread"
        /* ShadowPropertyType.SPREAD */
      );
    }
  }
  renderContents(span) {
    span.removeChildren();
    let previousSource = null;
    for (const property of this.#properties) {
      if (!property.source || property.source !== previousSource) {
        if (property !== this.#properties[0]) {
          span.append(" ");
        }
        if (property.source) {
          span.append(...Renderer.render(property.source, this.#context).nodes);
        } else if (typeof property.value === "string") {
          span.append(property.value);
        } else {
          span.append(...Renderer.render(property.value, property.expansionContext ?? this.#context).nodes);
        }
      }
      previousSource = property.source;
    }
  }
};
var ShadowRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.ShadowMatch) {
  #treeElement;
  // clang-format on
  constructor(treeElement) {
    super();
    this.#treeElement = treeElement;
  }
  shadowModel(shadow, shadowType, context) {
    const properties = [];
    const missingLengths = [
      "spread",
      "blur",
      "y",
      "x"
      /* ShadowPropertyType.X */
    ];
    let stillAcceptsLengths = true;
    const queue = shadow.map((value5) => ({ value: value5, source: value5, match: context.matchedResult.getMatch(value5), expansionContext: null }));
    for (let item2 = queue.shift(); item2; item2 = queue.shift()) {
      const { value: value5, source, match, expansionContext } = item2;
      const text = (expansionContext ?? context).ast.text(value5);
      if (value5.name === "NumberLiteral") {
        if (!stillAcceptsLengths) {
          return null;
        }
        const propertyType = missingLengths.pop();
        if (propertyType === void 0 || propertyType === "spread" && shadowType === "textShadow") {
          return null;
        }
        const length = InlineEditor2.CSSShadowEditor.CSSLength.parse(text);
        if (!length) {
          return null;
        }
        properties.push({ value: value5, source, length, propertyType, expansionContext });
      } else if (match instanceof SDK6.CSSPropertyParserMatchers.VariableMatch) {
        const computedValue = context.matchedResult.getComputedText(value5);
        const computedValueAst = SDK6.CSSPropertyParser.tokenizeDeclaration("--property", computedValue);
        if (!computedValueAst) {
          return null;
        }
        const matches = SDK6.CSSPropertyParser.BottomUpTreeMatching.walkExcludingSuccessors(computedValueAst, [new SDK6.CSSPropertyParserMatchers.ColorMatcher()]);
        if (matches.hasUnresolvedSubstitutions(matches.ast.tree)) {
          return null;
        }
        queue.unshift(...ASTUtils.siblings(ASTUtils.declValue(matches.ast.tree)).map((matchedNode) => ({
          value: matchedNode,
          source: value5,
          match: matches.getMatch(matchedNode),
          expansionContext: new RenderingContext(computedValueAst, null, context.renderers, matches)
        })));
      } else {
        stillAcceptsLengths = missingLengths.length === 4;
        if (value5.name === "ValueName" && text.toLowerCase() === "inset") {
          if (shadowType === "textShadow" || properties.find(
            ({ propertyType }) => propertyType === "inset"
            /* ShadowPropertyType.INSET */
          )) {
            return null;
          }
          properties.push({ value: value5, source, propertyType: "inset", expansionContext });
        } else if (match instanceof SDK6.CSSPropertyParserMatchers.ColorMatch || match instanceof SDK6.CSSPropertyParserMatchers.ColorMixMatch) {
          if (properties.find(
            ({ propertyType }) => propertyType === "color"
            /* ShadowPropertyType.COLOR */
          )) {
            return null;
          }
          properties.push({ value: value5, source, propertyType: "color", expansionContext });
        } else if (value5.name !== "Comment" && value5.name !== "Important") {
          return null;
        }
      }
    }
    if (missingLengths.length > 2) {
      return null;
    }
    return new ShadowModel(shadowType, properties, context);
  }
  render(match, context) {
    const shadows = ASTUtils.split(ASTUtils.siblings(ASTUtils.declValue(match.node)));
    const result = [];
    for (const shadow of shadows) {
      const model = this.shadowModel(shadow, match.shadowType, context);
      const isImportant = shadow.find((node) => node.name === "Important");
      if (shadow !== shadows[0]) {
        result.push(document.createTextNode(", "));
      }
      if (!model || !this.#treeElement?.editable()) {
        const { nodes } = Renderer.render(shadow, context);
        result.push(...nodes);
        continue;
      }
      const swatch = new InlineEditor2.Swatches.CSSShadowSwatch(model);
      swatch.setAttribute("jslog", `${VisualLogging3.showStyleEditor("css-shadow").track({ click: true })}`);
      swatch.iconElement().addEventListener("click", () => {
        Host.userMetrics.swatchActivated(
          4
          /* Host.UserMetrics.SwatchType.SHADOW */
        );
      });
      const contents = document.createElement("span");
      model.renderContents(contents);
      const popoverHelper = new ShadowSwatchPopoverHelper(this.#treeElement, this.#treeElement.parentPane().swatchPopoverHelper(), swatch);
      const treeElement = this.#treeElement;
      popoverHelper.addEventListener("shadowChanged", () => {
        model.renderContents(contents);
        void treeElement.applyStyleText(treeElement.renderedPropertyText(), false);
      });
      result.push(swatch, contents);
      if (isImportant) {
        result.push(...[document.createTextNode(" "), ...Renderer.render(isImportant, context).nodes]);
      }
    }
    return result;
  }
};
var FontRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.FontMatch) {
  treeElement;
  // clang-format on
  constructor(treeElement) {
    super();
    this.treeElement = treeElement;
  }
  render(match, context) {
    this.treeElement.section().registerFontProperty(this.treeElement);
    const { nodes } = Renderer.render(ASTUtils.siblings(ASTUtils.declValue(match.node)), context);
    return nodes;
  }
};
var GridTemplateRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.GridTemplateMatch) {
  // clang-format on
  render(match, context) {
    if (match.lines.length <= 1) {
      return Renderer.render(ASTUtils.siblings(ASTUtils.declValue(match.node)), context).nodes;
    }
    const indent = Common3.Settings.Settings.instance().moduleSetting("text-editor-indent").get();
    const container = document.createDocumentFragment();
    for (const line of match.lines) {
      const value5 = Renderer.render(line, context);
      const lineBreak = UI8.Fragment.html`<br /><span class='styles-clipboard-only'>${indent.repeat(2)}</span>`;
      container.append(lineBreak, ...value5.nodes);
    }
    return [container];
  }
};
var SHORTHANDS_FOR_PERCENTAGES = /* @__PURE__ */ new Set([
  "inset",
  "inset-block",
  "inset-inline",
  "margin",
  "margin-block",
  "margin-inline",
  "padding",
  "padding-block",
  "padding-inline"
]);
async function resolveValues(stylesPane, propertyName, match, context, ...values) {
  propertyName = context.tracing?.propertyName ?? context.matchedResult.ast.propertyName ?? propertyName;
  if (SHORTHANDS_FOR_PERCENTAGES.has(propertyName) && (context.tracing?.expandPercentagesInShorthands ?? context.matchedResult.getLonghandValuesCount() > 1)) {
    propertyName = context.getComputedLonghandName(match.node) ?? propertyName;
  }
  const nodeId = stylesPane.node()?.id;
  if (nodeId === void 0) {
    return null;
  }
  return await stylesPane.cssModel()?.resolveValues(propertyName, nodeId, ...values) ?? await stylesPane.cssModel()?.resolveValues(void 0, nodeId, ...values);
}
var LengthRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.LengthMatch) {
  // clang-format on
  #stylesPane;
  #treeElement;
  #propertyName;
  constructor(stylesPane, propertyName, treeElement) {
    super();
    this.#stylesPane = stylesPane;
    this.#treeElement = treeElement;
    this.#propertyName = propertyName;
  }
  render(match, context) {
    const valueElement = document.createElement("span");
    valueElement.tabIndex = -1;
    valueElement.textContent = match.text;
    const tooltip = this.#getTooltip(valueElement, match, context);
    const evaluation = context.tracing?.applyEvaluation([], () => {
      return {
        placeholder: [valueElement],
        asyncEvalCallback: () => this.#applyEvaluation(valueElement, match, context)
      };
    });
    if (evaluation) {
      return evaluation;
    }
    return tooltip ? [valueElement, tooltip] : [valueElement];
  }
  async #applyEvaluation(valueElement, match, context) {
    const pixelValue = await resolveValues(this.#stylesPane, this.#propertyName, match, context, match.text);
    if (pixelValue?.[0] && pixelValue?.[0] !== match.text) {
      valueElement.textContent = pixelValue[0];
      return true;
    }
    return false;
  }
  #getTooltip(valueElement, match, context) {
    const tooltipId = this.#treeElement?.getTooltipId("length");
    if (!tooltipId) {
      return void 0;
    }
    valueElement.setAttribute("aria-details", tooltipId);
    const tooltip = new Tooltips.Tooltip.Tooltip({ anchor: valueElement, variant: "rich", id: tooltipId, jslogContext: "length-popover" });
    tooltip.addEventListener("beforetoggle", () => this.getTooltipValue(tooltip, match, context), { once: true });
    return tooltip;
  }
  async getTooltipValue(tooltip, match, context) {
    const pixelValue = await resolveValues(this.#stylesPane, this.#propertyName, match, context, match.text);
    if (!pixelValue) {
      return;
    }
    tooltip.appendChild(document.createTextNode(pixelValue[0]));
  }
};
var BaseFunctionRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.BaseFunctionMatch) {
  // clang-format on
  #stylesPane;
  #matchedStyles;
  #computedStyles;
  #treeElement;
  #propertyName;
  constructor(stylesPane, matchedStyles, computedStyles, propertyName, treeElement) {
    super();
    this.#matchedStyles = matchedStyles;
    this.#computedStyles = computedStyles;
    this.#stylesPane = stylesPane;
    this.#treeElement = treeElement;
    this.#propertyName = propertyName;
  }
  render(match, context) {
    const childTracingContexts = context.tracing?.evaluation(match.args, { match, context });
    const renderedArgs = match.args.map((arg, idx) => {
      const span2 = document.createElement("span");
      Renderer.renderInto(arg, childTracingContexts ? childTracingContexts[idx].renderingContext(context) : context, span2);
      return span2;
    });
    const span = document.createElement("span");
    render4(html5`${this.#treeElement?.getTracingTooltip(match.func, match.node, this.#matchedStyles, this.#computedStyles, context) ?? match.func}(${renderedArgs.map((arg, idx) => idx === 0 ? [arg] : [html5`, `, arg]).flat()})`, span);
    if (childTracingContexts) {
      const evaluation = context.tracing?.applyEvaluation(childTracingContexts, () => ({ placeholder: [span], asyncEvalCallback: () => this.applyEvaluation(span, match, context) }));
      if (evaluation) {
        return evaluation;
      }
    } else if (match instanceof SDK6.CSSPropertyParserMatchers.MathFunctionMatch && !match.isArithmeticFunctionCall()) {
      void this.applyMathFunction(renderedArgs, match, context);
    }
    return [span];
  }
  async applyEvaluation(span, match, context) {
    const value5 = context.matchedResult.getComputedText(match.node, (match2) => {
      if (match2 instanceof SDK6.CSSPropertyParserMatchers.RelativeColorChannelMatch) {
        const relativeColor = context.findParent(match2.node, SDK6.CSSPropertyParserMatchers.ColorMatch)?.relativeColor ?? null;
        return (relativeColor && match2.getColorChannelValue(relativeColor)?.toFixed(3)) ?? null;
      }
      return null;
    });
    const evaled = await resolveValues(this.#stylesPane, this.#propertyName, match, context, value5);
    if (!evaled?.[0] || evaled[0] === value5) {
      return false;
    }
    span.textContent = evaled[0];
    return true;
  }
  async applyMathFunction(renderedArgs, match, context) {
    const values = match.args.map((arg) => context.matchedResult.getComputedTextRange(arg[0], arg[arg.length - 1]));
    values.unshift(context.matchedResult.getComputedText(match.node));
    const evaledArgs = await resolveValues(this.#stylesPane, this.#propertyName, match, context, ...values);
    if (!evaledArgs) {
      return;
    }
    const functionResult = evaledArgs.shift();
    if (!functionResult) {
      return;
    }
    for (let i = 0; i < renderedArgs.length; ++i) {
      if (evaledArgs[i] !== functionResult) {
        renderedArgs[i].classList.add("inactive-value");
      }
    }
  }
};
var MathFunctionRenderer = class extends BaseFunctionRenderer {
  matchType = SDK6.CSSPropertyParserMatchers.MathFunctionMatch;
};
var CustomFunctionRenderer = class extends BaseFunctionRenderer {
  matchType = SDK6.CSSPropertyParserMatchers.CustomFunctionMatch;
};
var AnchorFunctionRenderer = class _AnchorFunctionRenderer extends rendererBase(SDK6.CSSPropertyParserMatchers.AnchorFunctionMatch) {
  // clang-format on
  #stylesPane;
  static async decorateAnchorForAnchorLink(stylesPane, container, { identifier, needsSpace }) {
    if (identifier) {
      render4(html5`${identifier}`, container, { host: container });
    }
    const anchorNode = await stylesPane.node()?.getAnchorBySpecifier(identifier) ?? void 0;
    if (!identifier && !anchorNode) {
      return;
    }
    const onLinkActivate = () => {
      if (!anchorNode) {
        return;
      }
      void Common3.Revealer.reveal(anchorNode, false);
    };
    const handleIconClick = (ev) => {
      ev.stopPropagation();
      onLinkActivate();
    };
    const onMouseEnter = () => {
      anchorNode?.highlight();
    };
    const onMouseLeave = () => {
      SDK6.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    };
    if (identifier) {
      render4(
        // clang-format off
        html5`<devtools-link-swatch
                @mouseenter=${onMouseEnter}
                @mouseleave=${onMouseLeave}
                .data=${{
          text: identifier,
          tooltip: anchorNode ? void 0 : { title: i18nString5(UIStrings5.sIsNotDefined, { PH1: identifier }) },
          isDefined: Boolean(anchorNode),
          jslogContext: "anchor-link",
          onLinkActivate
        }}
                ></devtools-link-swatch>${needsSpace ? " " : ""}`,
        // clang-format on
        container,
        { host: container }
      );
    } else {
      render4(html5`<devtools-icon
                   role='button'
                   title=${i18nString5(UIStrings5.jumpToAnchorNode)}
                   class='icon-link'
                   name='open-externally'
                   jslog=${VisualLogging3.action("jump-to-anchor-node").track({ click: true })}
                   @mouseenter=${onMouseEnter}
                   @mouseleave=${onMouseLeave}
                   @mousedown=${(ev) => ev.stopPropagation()}
                   @click=${handleIconClick}
                  ></devtools-icon>${needsSpace ? " " : ""}`, container, { host: container });
    }
  }
  constructor(stylesPane) {
    super();
    this.#stylesPane = stylesPane;
  }
  render(match, context) {
    const content = document.createElement("span");
    if (match.node.name === "VariableName") {
      void _AnchorFunctionRenderer.decorateAnchorForAnchorLink(this.#stylesPane, content, { identifier: match.text });
    } else {
      content.appendChild(document.createTextNode(`${match.functionName}(`));
      const swatchContainer = document.createElement("span");
      content.appendChild(swatchContainer);
      const args = ASTUtils.children(match.node.getChild("ArgList"));
      const remainingArgs = args.splice(1);
      void _AnchorFunctionRenderer.decorateAnchorForAnchorLink(this.#stylesPane, swatchContainer, { needsSpace: remainingArgs.length > 1 });
      Renderer.renderInto(remainingArgs, context, content);
    }
    return [content];
  }
};
var PositionAnchorRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.PositionAnchorMatch) {
  #stylesPane;
  // clang-format on
  constructor(stylesPane) {
    super();
    this.#stylesPane = stylesPane;
  }
  render(match) {
    const content = document.createElement("span");
    void AnchorFunctionRenderer.decorateAnchorForAnchorLink(this.#stylesPane, content, { identifier: match.text });
    return [content];
  }
};
var PositionTryRenderer = class extends rendererBase(SDK6.CSSPropertyParserMatchers.PositionTryMatch) {
  #matchedStyles;
  // clang-format on
  constructor(matchedStyles) {
    super();
    this.#matchedStyles = matchedStyles;
  }
  render(match, context) {
    const content = [];
    if (match.preamble.length > 0) {
      const { nodes } = Renderer.render(match.preamble, context);
      content.push(...nodes);
    }
    for (const [i, fallback] of match.fallbacks.entries()) {
      const fallbackContent = document.createElement("span");
      if (i > 0) {
        fallbackContent.appendChild(document.createTextNode(", "));
      }
      if (i !== this.#matchedStyles.activePositionFallbackIndex()) {
        fallbackContent.classList.add("inactive-value");
      }
      Renderer.renderInto(fallback, context, fallbackContent);
      content.push(fallbackContent);
    }
    return content;
  }
};
function getPropertyRenderers(propertyName, style, stylesPane, matchedStyles, treeElement, computedStyles) {
  return [
    new VariableRenderer(stylesPane, treeElement, matchedStyles, computedStyles),
    new ColorRenderer(stylesPane, treeElement),
    new ColorMixRenderer(stylesPane, matchedStyles, computedStyles, treeElement),
    new URLRenderer(style.parentRule, stylesPane.node()),
    new AngleRenderer(treeElement),
    new LinkableNameRenderer(matchedStyles, stylesPane),
    new BezierRenderer(treeElement),
    new StringRenderer(),
    new ShadowRenderer(treeElement),
    new CSSWideKeywordRenderer(stylesPane, treeElement),
    new LightDarkColorRenderer(stylesPane, matchedStyles, treeElement),
    new GridTemplateRenderer(),
    new LinearGradientRenderer(),
    new AnchorFunctionRenderer(stylesPane),
    new PositionAnchorRenderer(stylesPane),
    new FlexGridRenderer(stylesPane, treeElement),
    new EnvFunctionRenderer(treeElement, matchedStyles, computedStyles),
    new PositionTryRenderer(matchedStyles),
    new LengthRenderer(stylesPane, propertyName, treeElement),
    new MathFunctionRenderer(stylesPane, matchedStyles, computedStyles, propertyName, treeElement),
    new CustomFunctionRenderer(stylesPane, matchedStyles, computedStyles, propertyName, treeElement),
    new AutoBaseRenderer(computedStyles),
    new BinOpRenderer(),
    new RelativeColorChannelRenderer(treeElement),
    new AttributeRenderer(stylesPane, treeElement, matchedStyles, computedStyles)
  ];
}
var StylePropertyTreeElement = class _StylePropertyTreeElement extends UI8.TreeOutline.TreeElement {
  style;
  #matchedStyles;
  property;
  #inherited;
  #overloaded;
  #parentPane;
  #parentSection;
  isShorthand;
  applyStyleThrottler = new Common3.Throttler.Throttler(0);
  newProperty;
  expandedDueToFilter = false;
  valueElement = null;
  nameElement = null;
  expandElement = null;
  originalPropertyText = "";
  hasBeenEditedIncrementally = false;
  prompt = null;
  lastComputedValue = null;
  computedStyles = null;
  parentsComputedStyles = null;
  contextForTest;
  #gridNames = void 0;
  #tooltipKeyCounts = /* @__PURE__ */ new Map();
  constructor({ stylesPane, section: section3, matchedStyles, property, isShorthand, inherited, overloaded, newProperty }) {
    const jslogContext = property.name.startsWith("--") ? "custom-property" : property.name;
    super("", isShorthand, jslogContext);
    this.style = property.ownerStyle;
    this.#matchedStyles = matchedStyles;
    this.property = property;
    this.#inherited = inherited;
    this.#overloaded = overloaded;
    this.selectable = false;
    this.#parentPane = stylesPane;
    this.#parentSection = section3;
    this.isShorthand = isShorthand;
    this.newProperty = newProperty;
    if (this.newProperty) {
      this.listItemElement.textContent = "";
    }
    this.property.addEventListener("localValueUpdated", () => {
      this.updateTitle();
    });
  }
  async gridNames() {
    if (!SDK6.CSSMetadata.cssMetadata().isGridNameAwareProperty(this.name)) {
      return /* @__PURE__ */ new Set();
    }
    for (let node = this.#parentPane.node()?.parentNode; node; node = node?.parentNode) {
      const style = await this.#parentPane.cssModel()?.getComputedStyle(node.id);
      const display = style?.get("display");
      const isGrid = display === "grid" || display === "inline-grid";
      if (!isGrid) {
        continue;
      }
      const getNames = (propertyName, predicate) => {
        const propertyValue = style?.get(propertyName);
        if (!propertyValue) {
          return [];
        }
        const ast = SDK6.CSSPropertyParser.tokenizeDeclaration(propertyName, propertyValue);
        if (!ast) {
          return [];
        }
        return SDK6.CSSPropertyParser.TreeSearch.findAll(ast, predicate).map((node2) => ast.text(node2));
      };
      if (SDK6.CSSMetadata.cssMetadata().isGridAreaNameAwareProperty(this.name)) {
        return new Set(getNames("grid-template-areas", (node2) => node2.name === "StringLiteral")?.flatMap((row) => row.substring(1, row.length - 1).split(/\s+/).filter((cell) => !cell.match(/^\.*$/))));
      }
      if (SDK6.CSSMetadata.cssMetadata().isGridColumnNameAwareProperty(this.name)) {
        return new Set(getNames("grid-template-columns", (node2) => node2.name === "ValueName" && node2.parent?.name === "BracketedValue"));
      }
      return new Set(getNames("grid-template-rows", (node2) => node2.name === "ValueName" && node2.parent?.name === "BracketedValue"));
    }
    return /* @__PURE__ */ new Set();
  }
  matchedStyles() {
    return this.#matchedStyles;
  }
  getLonghand() {
    return this.parent instanceof _StylePropertyTreeElement && this.parent.isShorthand ? this.parent : null;
  }
  editable() {
    const hasSourceData = Boolean(this.style.styleSheetId && this.style.range);
    return !this.getLonghand() && hasSourceData;
  }
  inherited() {
    return this.#inherited;
  }
  overloaded() {
    return this.#overloaded;
  }
  setOverloaded(x) {
    if (x === this.#overloaded) {
      return;
    }
    this.#overloaded = x;
    this.updateState();
  }
  setComputedStyles(computedStyles) {
    this.computedStyles = computedStyles;
  }
  getComputedStyle(property) {
    return this.computedStyles?.get(property) ?? null;
  }
  getComputedStyles() {
    return this.computedStyles;
  }
  setParentsComputedStyles(parentsComputedStyles) {
    this.parentsComputedStyles = parentsComputedStyles;
  }
  get name() {
    return this.property.name;
  }
  get value() {
    return this.property.value;
  }
  updateFilter() {
    const regex = this.#parentPane.filterRegex();
    const matches = regex !== null && (regex.test(this.property.name) || regex.test(this.property.value));
    this.listItemElement.classList.toggle("filter-match", matches);
    void this.onpopulate();
    let hasMatchingChildren = false;
    for (let i = 0; i < this.childCount(); ++i) {
      const child = this.childAt(i);
      if (!child || child && !child.updateFilter()) {
        continue;
      }
      hasMatchingChildren = true;
    }
    if (!regex) {
      if (this.expandedDueToFilter) {
        this.collapse();
      }
      this.expandedDueToFilter = false;
    } else if (hasMatchingChildren && !this.expanded) {
      this.expand();
      this.expandedDueToFilter = true;
    } else if (!hasMatchingChildren && this.expanded && this.expandedDueToFilter) {
      this.collapse();
      this.expandedDueToFilter = false;
    }
    return matches;
  }
  renderedPropertyText() {
    if (!this.nameElement || !this.valueElement) {
      return "";
    }
    return this.nameElement.innerText + ": " + this.valueElement.innerText;
  }
  updateState() {
    if (!this.listItemElement) {
      return;
    }
    if (this.style.isPropertyImplicit(this.name)) {
      this.listItemElement.classList.add("implicit");
    } else {
      this.listItemElement.classList.remove("implicit");
    }
    const hasIgnorableError = !this.property.parsedOk && StylesSidebarPane.ignoreErrorsForProperty(this.property);
    if (hasIgnorableError) {
      this.listItemElement.classList.add("has-ignorable-error");
    } else {
      this.listItemElement.classList.remove("has-ignorable-error");
    }
    if (this.inherited()) {
      this.listItemElement.classList.add("inherited");
    } else {
      this.listItemElement.classList.remove("inherited");
    }
    if (this.overloaded()) {
      this.listItemElement.classList.add("overloaded");
    } else {
      this.listItemElement.classList.remove("overloaded");
    }
    if (this.property.disabled) {
      this.listItemElement.classList.add("disabled");
    } else {
      this.listItemElement.classList.remove("disabled");
    }
  }
  node() {
    return this.#parentPane.node();
  }
  parentPane() {
    return this.#parentPane;
  }
  section() {
    return this.#parentSection;
  }
  updatePane() {
    this.#parentSection.refreshUpdate(this);
  }
  async toggleDisabled(disabled) {
    const oldStyleRange = this.style.range;
    if (!oldStyleRange) {
      return;
    }
    this.#parentPane.setUserOperation(true);
    const success = await this.property.setDisabled(disabled);
    this.#parentPane.setUserOperation(false);
    if (!success) {
      return;
    }
    this.#matchedStyles.resetActiveProperties();
    this.updatePane();
    this.styleTextAppliedForTest();
  }
  async #getLonghandProperties() {
    const staticLonghandProperties = this.property.getLonghandProperties();
    if (staticLonghandProperties.some((property) => property.value !== "")) {
      return staticLonghandProperties;
    }
    const parsedProperty = this.#computeCSSExpression(this.style, this.property.value);
    if (!parsedProperty || parsedProperty === this.property.value) {
      return staticLonghandProperties;
    }
    const parsedLonghands = await this.#parentPane.cssModel()?.agent.invoke_getLonghandProperties({ shorthandName: this.property.name, value: parsedProperty });
    if (!parsedLonghands || parsedLonghands.getError()) {
      return staticLonghandProperties;
    }
    return parsedLonghands.longhandProperties.map((p) => SDK6.CSSProperty.CSSProperty.parsePayload(this.style, -1, p));
  }
  async onpopulate() {
    if (!this.#gridNames) {
      this.#gridNames = await this.gridNames();
    }
    if (this.childCount() || !this.isShorthand) {
      return;
    }
    const longhandProperties = await this.#getLonghandProperties();
    const leadingProperties = this.style.leadingProperties();
    if (this.childCount()) {
      return;
    }
    for (const property of longhandProperties) {
      const name = property.name;
      let inherited = false;
      let overloaded = false;
      inherited = this.#parentSection.isPropertyInherited(name);
      overloaded = this.#matchedStyles.propertyState(property) === "Overloaded";
      const leadingProperty = leadingProperties.find((property2) => property2.name === name && property2.activeInStyle());
      if (leadingProperty) {
        overloaded = true;
      }
      const item2 = new _StylePropertyTreeElement({
        stylesPane: this.#parentPane,
        section: this.#parentSection,
        matchedStyles: this.#matchedStyles,
        property,
        isShorthand: false,
        inherited,
        overloaded,
        newProperty: false
      });
      item2.setComputedStyles(this.computedStyles);
      item2.setParentsComputedStyles(this.parentsComputedStyles);
      this.appendChild(item2);
    }
  }
  onattach() {
    this.updateTitle();
    this.listItemElement.addEventListener("mousedown", (event) => {
      if (event.button === 0) {
        parentMap.set(this.#parentPane, this);
      }
    }, false);
    this.listItemElement.addEventListener("mouseup", this.mouseUp.bind(this));
    this.listItemElement.addEventListener("click", (event) => {
      if (!event.target) {
        return;
      }
      const node = event.target;
      if (!node.hasSelection() && event.target !== this.listItemElement) {
        event.consume(true);
      }
    });
    this.listItemElement.addEventListener("contextmenu", this.handleCopyContextMenuEvent.bind(this));
  }
  onexpand() {
    this.updateExpandElement();
  }
  oncollapse() {
    this.updateExpandElement();
  }
  updateExpandElement() {
    if (!this.expandElement) {
      return;
    }
    if (this.expanded) {
      this.expandElement.name = "triangle-down";
    } else {
      this.expandElement.name = "triangle-right";
    }
  }
  // Resolves a CSS expression to its computed value with `var()` and `attr()` calls updated.
  // Still returns the string even when a `var()` or `attr()` call is not resolved.
  #computeCSSExpression(style, text) {
    const ast = SDK6.CSSPropertyParser.tokenizeDeclaration("--unused", text);
    if (!ast) {
      return null;
    }
    const matching = SDK6.CSSPropertyParser.BottomUpTreeMatching.walk(ast, [
      new SDK6.CSSPropertyParserMatchers.VariableMatcher(this.#matchedStyles, style),
      new SDK6.CSSPropertyParserMatchers.AttributeMatcher(this.#matchedStyles, style),
      new SDK6.CSSPropertyParserMatchers.EnvFunctionMatcher(this.#matchedStyles)
    ]);
    const decl = SDK6.CSSPropertyParser.ASTUtils.siblings(SDK6.CSSPropertyParser.ASTUtils.declValue(matching.ast.tree));
    return decl.length > 0 ? matching.getComputedTextRange(decl[0], decl[decl.length - 1]) : "";
  }
  refreshIfComputedValueChanged() {
    this.#gridNames = void 0;
    const computedValue = this.#computeCSSExpression(this.property.ownerStyle, this.property.value);
    if (computedValue === this.lastComputedValue) {
      return;
    }
    this.lastComputedValue = computedValue;
    this.#updateTitle();
  }
  updateTitle() {
    this.lastComputedValue = this.#computeCSSExpression(this.property.ownerStyle, this.property.value);
    this.#updateTitle();
  }
  #updateTitle() {
    this.#tooltipKeyCounts.clear();
    this.updateState();
    if (this.isExpandable()) {
      this.expandElement = createIcon("triangle-right", "expand-icon");
      this.expandElement.setAttribute("jslog", `${VisualLogging3.expand().track({ click: true })}`);
    }
    const renderers = this.property.parsedOk ? getPropertyRenderers(this.name, this.style, this.#parentPane, this.#matchedStyles, this, this.getComputedStyles() ?? /* @__PURE__ */ new Map()) : [];
    if (Root.Runtime.experiments.isEnabled("font-editor") && this.property.parsedOk) {
      renderers.push(new FontRenderer(this));
    }
    this.listItemElement.removeChildren();
    const matchedResult = this.property.parseValue(this.matchedStyles(), this.computedStyles);
    this.valueElement = Renderer.renderValueElement(this.property, matchedResult, renderers).valueElement;
    this.nameElement = Renderer.renderNameElement(this.name);
    if (!this.treeOutline) {
      return;
    }
    const indent = Common3.Settings.Settings.instance().moduleSetting("text-editor-indent").get();
    UI8.UIUtils.createTextChild(this.listItemElement.createChild("span", "styles-clipboard-only"), indent.repeat(this.section().nestingLevel + 1) + (this.property.disabled ? "/* " : ""));
    this.listItemElement.appendChild(this.nameElement);
    if (this.property.name.startsWith("--") && !(this.property.ownerStyle.parentRule instanceof SDK6.CSSRule.CSSFunctionRule)) {
      const contents = this.#parentPane.getVariablePopoverContents(this.matchedStyles(), this.property.name, this.#matchedStyles.computeCSSVariable(this.style, this.property.name)?.value ?? null);
      const tooltipId = this.getTooltipId("custom-property-decl");
      this.nameElement.setAttribute("aria-details", tooltipId);
      const tooltip = new Tooltips.Tooltip.Tooltip({ anchor: this.nameElement, variant: "rich", id: tooltipId, jslogContext: "elements.css-var" });
      tooltip.appendChild(contents);
      tooltip.onbeforetoggle = (e) => {
        if (e.newState === "open") {
          contents.value = this.#matchedStyles.computeCSSVariable(this.style, this.property.name)?.value;
        }
      };
      this.listItemElement.appendChild(tooltip);
    } else if (Common3.Settings.Settings.instance().moduleSetting("show-css-property-documentation-on-hover").get()) {
      const tooltipId = this.getTooltipId("property-doc");
      this.nameElement.setAttribute("aria-details", tooltipId);
      const tooltip = new Tooltips.Tooltip.Tooltip({
        anchor: this.nameElement,
        variant: "rich",
        padding: "large",
        id: tooltipId,
        jslogContext: "elements.css-property-doc"
      });
      tooltip.onbeforetoggle = (event) => {
        if (event.newState !== "open") {
          return;
        }
        if (!Common3.Settings.Settings.instance().moduleSetting("show-css-property-documentation-on-hover").get()) {
          event.consume(true);
          return;
        }
        const cssProperty = this.#parentPane.webCustomData?.findCssProperty(this.name);
        if (!cssProperty) {
          event.consume(true);
          return;
        }
        tooltip.removeChildren();
        tooltip.appendChild(new ElementsComponents.CSSPropertyDocsView.CSSPropertyDocsView(cssProperty));
      };
      this.listItemElement.appendChild(tooltip);
    }
    if (this.valueElement) {
      const lineBreakValue = this.valueElement.firstElementChild?.tagName === "BR";
      const separator = lineBreakValue ? ":" : ": ";
      this.listItemElement.createChild("span", "styles-name-value-separator").textContent = separator;
      if (this.expandElement) {
        this.listItemElement.appendChild(this.expandElement);
        this.updateExpandElement();
      }
      this.listItemElement.appendChild(this.valueElement);
      const semicolon = this.listItemElement.createChild("span", "styles-semicolon");
      semicolon.textContent = ";";
      semicolon.onmouseup = this.mouseUp.bind(this);
      if (this.property.disabled) {
        UI8.UIUtils.createTextChild(this.listItemElement.createChild("span", "styles-clipboard-only"), " */");
      }
    }
    if (this.property.parsedOk) {
      this.updateAuthoringHint();
    } else {
      this.listItemElement.classList.add("not-parsed-ok");
      this.listItemElement.insertBefore(this.createExclamationMark(this.property, this.#parentPane.getVariableParserError(this.matchedStyles(), this.property.name)), this.listItemElement.firstChild);
      const invalidPropertyValue = SDK6.CSSMetadata.cssMetadata().isCSSPropertyName(this.property.name);
      if (invalidPropertyValue) {
        this.listItemElement.classList.add("invalid-property-value");
      }
    }
    if (!this.property.activeInStyle()) {
      this.listItemElement.classList.add("inactive");
    }
    this.updateFilter();
    if (this.property.parsedOk && this.parent?.root) {
      const enabledCheckboxElement = document.createElement("input");
      enabledCheckboxElement.classList.add("enabled-button", "small");
      enabledCheckboxElement.type = "checkbox";
      enabledCheckboxElement.checked = !this.property.disabled;
      enabledCheckboxElement.setAttribute("jslog", `${VisualLogging3.toggle().track({ click: true })}`);
      enabledCheckboxElement.addEventListener("mousedown", (event) => event.consume(), false);
      enabledCheckboxElement.addEventListener("click", (event) => {
        void this.toggleDisabled(!this.property.disabled);
        event.consume();
      }, false);
      if (this.nameElement && this.valueElement) {
        UI8.ARIAUtils.setLabel(enabledCheckboxElement, `${this.name} ${this.value}`);
      }
      this.listItemElement.insertBefore(enabledCheckboxElement, this.listItemElement.firstChild);
    }
    const that = this;
    this.valueElement.addEventListener("keydown", nonEditingNameValueKeyDown);
    this.nameElement.addEventListener("keydown", nonEditingNameValueKeyDown);
    function nonEditingNameValueKeyDown(event) {
      if (UI8.UIUtils.isBeingEdited(this)) {
        return;
      }
      if (event.key !== Platform2.KeyboardUtilities.ENTER_KEY && event.key !== " ") {
        return;
      }
      if (this === that.valueElement) {
        that.startEditingValue();
        event.consume(true);
      } else if (this === that.nameElement) {
        that.startEditingName();
        event.consume(true);
      }
    }
  }
  createExclamationMark(property, title) {
    const container = document.createElement("span");
    const exclamationElement = container.createChild("span");
    exclamationElement.tabIndex = -1;
    exclamationElement.classList.add("exclamation-mark");
    const invalidMessage = SDK6.CSSMetadata.cssMetadata().isCSSPropertyName(property.name) ? i18nString5(UIStrings5.invalidPropertyValue) : i18nString5(UIStrings5.unknownPropertyName);
    if (title === null) {
      UI8.Tooltip.Tooltip.install(exclamationElement, invalidMessage);
    } else {
      const tooltipId = this.getTooltipId("property-warning");
      exclamationElement.setAttribute("aria-describedby", tooltipId);
      const tooltip = new Tooltips.Tooltip.Tooltip({
        anchor: exclamationElement,
        variant: "simple",
        id: tooltipId,
        jslogContext: "elements.invalid-property-decl-popover"
      });
      tooltip.appendChild(title);
      container.appendChild(tooltip);
    }
    const invalidString = i18nString5(UIStrings5.invalidString, { PH1: invalidMessage, PH2: property.name, PH3: property.value });
    property.setDisplayedStringForInvalidProperty(invalidString);
    return container;
  }
  #getLinkableFunction(functionName, matchedStyles) {
    const swatch = new InlineEditor2.LinkSwatch.LinkSwatch();
    const registeredFunction = matchedStyles.getRegisteredFunction(functionName);
    const isDefined = Boolean(registeredFunction);
    swatch.data = {
      jslogContext: "css-function",
      text: functionName,
      tooltip: isDefined ? void 0 : { title: i18nString5(UIStrings5.sIsNotDefined, { PH1: functionName }) },
      isDefined,
      onLinkActivate: () => {
        if (!registeredFunction) {
          return;
        }
        this.#parentPane.jumpToFunctionDefinition(registeredFunction);
      }
    };
    return swatch;
  }
  getTracingTooltip(functionName, node, matchedStyles, computedStyles, context) {
    if (context.tracing || !context.property) {
      return html5`${functionName}`;
    }
    const text = context.ast.text(node);
    const expandPercentagesInShorthands = context.matchedResult.getLonghandValuesCount() > 1;
    const shorthandPositionOffset = context.matchedResult.getComputedLonghandName(node);
    const { property } = context;
    const stylesPane = this.parentPane();
    const tooltipId = this.getTooltipId(`${functionName}-trace`);
    return html5`
        <span tabIndex=-1 class=tracing-anchor aria-details=${tooltipId}>${functionName.startsWith("--") ? this.#getLinkableFunction(functionName, matchedStyles) : functionName}</span>
        <devtools-tooltip
            id=${tooltipId}
            use-hotkey
            variant=rich
            jslogContext=elements.css-value-trace
            @beforetoggle=${function(e) {
      if (e.newState === "open") {
        void this.querySelector("devtools-widget")?.getWidget()?.showTrace(property, text, matchedStyles, computedStyles, getPropertyRenderers(property.name, property.ownerStyle, stylesPane, matchedStyles, null, computedStyles), expandPercentagesInShorthands, shorthandPositionOffset, this.openedViaHotkey);
      }
    }}
            @toggle=${function(e) {
      if (e.newState !== "open") {
        this.querySelector("devtools-widget")?.getWidget()?.resetPendingFocus();
      }
    }}>
          <devtools-widget
            @keydown=${(e) => {
      const maybeTooltip = e.target.parentElement;
      if (!(maybeTooltip instanceof Tooltips.Tooltip.Tooltip)) {
        return;
      }
      if (e.key === "Escape" || e.altKey && e.key === "ArrowDown") {
        maybeTooltip.hideTooltip();
        maybeTooltip.anchor?.focus();
        e.consume(true);
      }
    }}
            .widgetConfig=${UI8.Widget.widgetConfig(CSSValueTraceView)}>
          </devtools-widget>
        </devtools-tooltip>`;
  }
  // Returns an id for <devtools-tooltips> that's stable across re-rendering of property values but unique across
  // sections and across switches between different nodes.
  getTooltipId(key2) {
    const sectionId = this.section().sectionTooltipIdPrefix;
    const tooltipKeyCount = this.#tooltipKeyCounts.get(key2) ?? 0;
    this.#tooltipKeyCounts.set(key2, tooltipKeyCount + 1);
    const propertyNameForCounting = this.getLonghand()?.name ?? this.name;
    const ownIndex = this.style.allProperties().indexOf(this.property);
    const propertyCount = this.style.allProperties().reduce((value5, property, index) => index < ownIndex && (property.name === this.name || property.name === propertyNameForCounting) ? value5 + 1 : value5, 0);
    return `swatch-tooltip-${sectionId}-${this.name}-${propertyCount}-${key2}-${tooltipKeyCount}`;
  }
  updateAuthoringHint() {
    this.listItemElement.classList.remove("inactive-property");
    const existingElement = this.listItemElement.querySelector(".hint");
    if (existingElement) {
      existingElement?.closest(".hint-wrapper")?.remove();
    }
    const propertyName = this.property.name;
    if (!cssRuleValidatorsMap.has(propertyName)) {
      return;
    }
    if (this.node()?.isSVGNode()) {
      return;
    }
    const cssModel = this.#parentPane.cssModel();
    const fontFaces = cssModel?.fontFaces() || [];
    const localName = this.node()?.localName();
    for (const validator of cssRuleValidatorsMap.get(propertyName) || []) {
      const hint = validator.getHint(propertyName, this.computedStyles || void 0, this.parentsComputedStyles || void 0, localName?.toLowerCase(), fontFaces);
      if (hint) {
        const wrapper = document.createElement("span");
        wrapper.classList.add("hint-wrapper");
        const hintIcon = new Icon();
        hintIcon.name = "info";
        hintIcon.classList.add("hint", "small");
        hintIcon.tabIndex = -1;
        wrapper.append(hintIcon);
        this.listItemElement.append(wrapper);
        this.listItemElement.classList.add("inactive-property");
        const tooltipId = this.getTooltipId("css-hint");
        hintIcon.setAttribute("aria-details", tooltipId);
        const tooltip = new Tooltips.Tooltip.Tooltip({ anchor: hintIcon, variant: "rich", padding: "large", id: tooltipId, jslogContext: "elements.css-hint" });
        tooltip.appendChild(new ElementsComponents.CSSHintDetailsView.CSSHintDetailsView(hint));
        this.listItemElement.appendChild(tooltip);
        break;
      }
    }
  }
  mouseUp(event) {
    const activeTreeElement = parentMap.get(this.#parentPane);
    parentMap.delete(this.#parentPane);
    if (!activeTreeElement) {
      return;
    }
    if (this.listItemElement.hasSelection()) {
      return;
    }
    if (UI8.UIUtils.isBeingEdited(event.target)) {
      return;
    }
    if (event.composedPath()[0] instanceof HTMLButtonElement) {
      return;
    }
    event.consume(true);
    if (event.target === this.listItemElement) {
      return;
    }
    let selectedElement = event.target;
    if (UI8.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event) && this.#parentSection.navigable) {
      this.navigateToSource(selectedElement);
      return;
    }
    if (this.expandElement && selectedElement === this.expandElement) {
      return;
    }
    if (!this.#parentSection.editable) {
      return;
    }
    selectedElement = selectedElement.enclosingNodeOrSelfWithClass("webkit-css-property") || selectedElement.enclosingNodeOrSelfWithClass("value") || selectedElement.enclosingNodeOrSelfWithClass("styles-semicolon");
    if (!selectedElement || selectedElement === this.nameElement) {
      VisualLogging3.logClick(this.nameElement, event);
      this.startEditingName();
    } else {
      VisualLogging3.logClick(this.valueElement, event);
      this.startEditingValue();
    }
  }
  handleContextMenuEvent(context, event) {
    const contextMenu = new UI8.ContextMenu.ContextMenu(event);
    if (this.property.parsedOk && this.parent?.root) {
      const sectionIndex = this.#parentPane.focusedSectionIndex();
      contextMenu.defaultSection().appendCheckboxItem(i18nString5(UIStrings5.togglePropertyAndContinueEditing), async () => {
        if (this.treeOutline) {
          const propertyIndex = this.treeOutline.rootElement().indexOfChild(this);
          this.editingCancelled(context);
          await this.toggleDisabled(!this.property.disabled);
          event.consume();
          this.#parentPane.continueEditingElement(sectionIndex, propertyIndex);
        }
      }, { checked: !this.property.disabled, jslogContext: "toggle-property-and-continue-editing" });
    }
    const revealCallback = this.navigateToSource.bind(this);
    contextMenu.defaultSection().appendItem(i18nString5(UIStrings5.openInSourcesPanel), revealCallback, { jslogContext: "reveal-in-sources-panel" });
    void contextMenu.show();
  }
  handleCopyContextMenuEvent(event) {
    const target = event.target;
    if (!target) {
      return;
    }
    const contextMenu = this.createCopyContextMenu(event);
    void contextMenu.show();
  }
  createCopyContextMenu(event) {
    const contextMenu = new UI8.ContextMenu.ContextMenu(event);
    contextMenu.headerSection().appendItem(i18nString5(UIStrings5.copyDeclaration), () => {
      const propertyText = `${this.property.name}: ${this.property.value};`;
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(propertyText);
    }, { jslogContext: "copy-declaration" });
    contextMenu.headerSection().appendItem(i18nString5(UIStrings5.copyProperty), () => {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.property.name);
    }, { jslogContext: "copy-property" });
    contextMenu.headerSection().appendItem(i18nString5(UIStrings5.copyValue), () => {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.property.value);
    }, { jslogContext: "copy-value" });
    contextMenu.headerSection().appendItem(i18nString5(UIStrings5.copyRule), () => {
      const ruleText = StylesSidebarPane.formatLeadingProperties(this.#parentSection).ruleText;
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(ruleText);
    }, { jslogContext: "copy-rule" });
    contextMenu.headerSection().appendItem(i18nString5(UIStrings5.copyCssDeclarationAsJs), this.copyCssDeclarationAsJs.bind(this), { jslogContext: "copy-css-declaration-as-js" });
    contextMenu.clipboardSection().appendItem(i18nString5(UIStrings5.copyAllDeclarations), () => {
      const allDeclarationText = StylesSidebarPane.formatLeadingProperties(this.#parentSection).allDeclarationText;
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(allDeclarationText);
    }, { jslogContext: "copy-all-declarations" });
    contextMenu.clipboardSection().appendItem(i18nString5(UIStrings5.copyAllCssDeclarationsAsJs), this.copyAllCssDeclarationAsJs.bind(this), { jslogContext: "copy-all-css-declarations-as-js" });
    contextMenu.footerSection().appendItem(i18nString5(UIStrings5.viewComputedValue), () => {
      void this.viewComputedValue();
    }, { jslogContext: "view-computed-value" });
    return contextMenu;
  }
  async viewComputedValue() {
    const computedStyleWidget = ElementsPanel.instance().getComputedStyleWidget();
    if (!computedStyleWidget.isShowing()) {
      await UI8.ViewManager.ViewManager.instance().showView("computed");
    }
    let propertyNamePattern = "";
    if (this.isShorthand) {
      propertyNamePattern = "^" + this.property.name + "-";
    } else {
      propertyNamePattern = "^" + this.property.name + "$";
    }
    const regex = new RegExp(propertyNamePattern, "i");
    await computedStyleWidget.filterComputedStyles(regex);
    computedStyleWidget.input.setValue(this.property.name);
    computedStyleWidget.input.element.focus();
  }
  copyCssDeclarationAsJs() {
    const cssDeclarationValue = getCssDeclarationAsJavascriptProperty(this.property);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(cssDeclarationValue);
  }
  copyAllCssDeclarationAsJs() {
    const leadingProperties = this.#parentSection.style().leadingProperties();
    const cssDeclarationsAsJsProperties = leadingProperties.filter((property) => !property.disabled).map(getCssDeclarationAsJavascriptProperty);
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(cssDeclarationsAsJsProperties.join(",\n"));
  }
  navigateToSource(element, omitFocus) {
    if (!this.#parentSection.navigable) {
      return;
    }
    const propertyNameClicked = element === this.nameElement;
    const uiLocation = Bindings2.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().propertyUILocation(this.property, propertyNameClicked);
    if (uiLocation) {
      void Common3.Revealer.reveal(uiLocation, omitFocus);
    }
  }
  startEditingValue() {
    const context = {
      expanded: this.expanded,
      hasChildren: this.isExpandable(),
      isEditingName: false,
      originalProperty: this.property,
      previousContent: this.value
    };
    if (SDK6.CSSMetadata.cssMetadata().isGridAreaDefiningProperty(this.name)) {
      const splitResult = TextUtils.TextUtils.Utils.splitStringByRegexes(this.value, [SDK6.CSSMetadata.GridAreaRowRegex]);
      context.previousContent = splitResult.map((result) => result.value.trim()).join("\n");
    }
    this.#startEditing(context);
  }
  startEditingName() {
    const context = {
      expanded: this.expanded,
      hasChildren: this.isExpandable(),
      isEditingName: true,
      originalProperty: this.property,
      previousContent: this.name.split("\n").map((l) => l.trim()).join("\n")
    };
    this.#startEditing(context);
  }
  #startEditing(context) {
    this.contextForTest = context;
    if (this.parent instanceof _StylePropertyTreeElement && this.parent.isShorthand) {
      return;
    }
    const selectedElement = context.isEditingName ? this.nameElement : this.valueElement;
    if (!selectedElement) {
      return;
    }
    if (UI8.UIUtils.isBeingEdited(selectedElement)) {
      return;
    }
    this.setExpandable(false);
    selectedElement.parentElement?.classList.add("child-editing");
    selectedElement.textContent = context.previousContent;
    function pasteHandler(context2, event) {
      const clipboardEvent = event;
      const clipboardData = clipboardEvent.clipboardData;
      if (!clipboardData) {
        return;
      }
      const data = clipboardData.getData("Text");
      if (!data) {
        return;
      }
      const colonIdx = data.indexOf(":");
      if (colonIdx < 0) {
        return;
      }
      const name = data.substring(0, colonIdx).trim();
      const value5 = data.substring(colonIdx + 1).trim();
      event.preventDefault();
      if (typeof context2.originalName === "undefined") {
        if (this.nameElement) {
          context2.originalName = this.nameElement.textContent || "";
        }
        if (this.valueElement) {
          context2.originalValue = this.valueElement.textContent || "";
        }
      }
      this.property.name = name;
      this.property.value = value5;
      if (this.nameElement) {
        this.nameElement.textContent = name;
        this.nameElement.normalize();
      }
      if (this.valueElement) {
        this.valueElement.textContent = value5;
        this.valueElement.normalize();
      }
      const target = event.target;
      void this.editingCommitted(target.textContent || "", context2, "forward");
    }
    function blurListener(context2, event) {
      const target = event.target;
      let text = target.textContent;
      if (!context2.isEditingName) {
        text = this.value || text;
      }
      void this.editingCommitted(text || "", context2, "");
    }
    this.originalPropertyText = this.property.propertyText || "";
    this.#parentPane.setEditingStyle(true);
    selectedElement.parentElement?.scrollIntoViewIfNeeded(false);
    this.prompt = new CSSPropertyPrompt(this, context.isEditingName, Array.from(this.#gridNames ?? []));
    this.prompt.setAutocompletionTimeout(0);
    this.prompt.addEventListener("TextChanged", () => {
      void this.applyFreeFlowStyleTextEdit(context);
    });
    const invalidString = this.property.getInvalidStringForInvalidProperty();
    if (invalidString) {
      UI8.ARIAUtils.LiveAnnouncer.alert(invalidString);
    }
    const proxyElement = this.prompt.attachAndStartEditing(selectedElement, blurListener.bind(this, context));
    this.navigateToSource(selectedElement, true);
    proxyElement.addEventListener("keydown", this.editingNameValueKeyDown.bind(this, context), false);
    proxyElement.addEventListener("keypress", this.editingNameValueKeyPress.bind(this, context), false);
    if (context.isEditingName) {
      proxyElement.addEventListener("paste", pasteHandler.bind(this, context), false);
      proxyElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this, context), false);
    }
    selectedElement.getComponentSelection()?.selectAllChildren(selectedElement);
  }
  editingNameValueKeyDown(context, event) {
    if (event.handled) {
      return;
    }
    const keyboardEvent = event;
    const target = keyboardEvent.target;
    let result;
    if (keyboardEvent.key === "Enter" && !keyboardEvent.shiftKey || context.isEditingName && keyboardEvent.key === " ") {
      result = "forward";
    } else if (keyboardEvent.keyCode === UI8.KeyboardShortcut.Keys.Esc.code || keyboardEvent.key === Platform2.KeyboardUtilities.ESCAPE_KEY) {
      result = "cancel";
    } else if (!context.isEditingName && this.newProperty && keyboardEvent.keyCode === UI8.KeyboardShortcut.Keys.Backspace.code) {
      const selection = target.getComponentSelection();
      if (selection && selection.isCollapsed && !selection.focusOffset) {
        event.preventDefault();
        result = "backward";
      }
    } else if (keyboardEvent.key === "Tab") {
      result = keyboardEvent.shiftKey ? "backward" : "forward";
      event.preventDefault();
    }
    if (result) {
      switch (result) {
        case "cancel":
          this.editingCancelled(context);
          if (context.isEditingName) {
            this.nameElement?.focus();
          } else {
            this.valueElement?.focus();
          }
          break;
        case "forward":
        case "backward":
          void this.editingCommitted(target.textContent || "", context, result);
          break;
      }
      event.consume();
      return;
    }
  }
  static shouldCommitValueSemicolon(text, cursorPosition) {
    let openQuote = "";
    const openParens = [];
    for (let i = 0; i < cursorPosition; ++i) {
      const ch = text[i];
      if (ch === "\\" && openQuote !== "") {
        ++i;
      } else if (!openQuote && (ch === '"' || ch === "'")) {
        openQuote = ch;
      } else if (ch === "[") {
        openParens.push("]");
      } else if (ch === "{") {
        openParens.push("}");
      } else if (ch === "(") {
        openParens.push(")");
      } else if (openQuote === ch) {
        openQuote = "";
      } else if (openParens.at(-1) === ch && !openQuote) {
        openParens.pop();
      }
    }
    return !openQuote && openParens.length === 0;
  }
  editingNameValueKeyPress(context, event) {
    const keyboardEvent = event;
    const target = keyboardEvent.target;
    const keyChar = String.fromCharCode(keyboardEvent.charCode);
    const selectionLeftOffset = this.#selectionLeftOffset(target);
    const isFieldInputTerminated = context.isEditingName ? keyChar === ":" : keyChar === ";" && selectionLeftOffset !== null && _StylePropertyTreeElement.shouldCommitValueSemicolon(target.textContent || "", selectionLeftOffset);
    if (isFieldInputTerminated) {
      event.consume(true);
      void this.editingCommitted(target.textContent || "", context, "forward");
      return;
    }
  }
  /** @returns Selection offset relative to `element` */
  #selectionLeftOffset(element) {
    const selection = element.getComponentSelection();
    if (!selection?.containsNode(element, true)) {
      return null;
    }
    let leftOffset = selection.anchorOffset;
    let node = selection.anchorNode;
    while (node !== element) {
      while (node?.previousSibling) {
        node = node.previousSibling;
        leftOffset += node.textContent?.length ?? 0;
      }
      node = node?.parentNodeOrShadowHost() ?? null;
    }
    return leftOffset;
  }
  async applyFreeFlowStyleTextEdit(context) {
    if (!this.prompt || !this.#parentPane.node()) {
      return;
    }
    const enteredText = this.prompt.text();
    if (context.isEditingName && enteredText.includes(":")) {
      void this.editingCommitted(enteredText, context, "forward");
      return;
    }
    const valueText = this.prompt.textWithCurrentSuggestion();
    if (valueText.includes(";")) {
      return;
    }
    const parentNode = this.#parentPane.node();
    if (parentNode) {
      const isPseudo = Boolean(parentNode.pseudoType());
      if (isPseudo) {
        if (this.name.toLowerCase() === "content") {
          return;
        }
        const lowerValueText = valueText.trim().toLowerCase();
        if (lowerValueText.startsWith("content:") || lowerValueText === "display: none") {
          return;
        }
      }
    }
    if (context.isEditingName) {
      if (valueText.includes(":")) {
        await this.applyStyleText(valueText, false);
      } else if (this.hasBeenEditedIncrementally) {
        await this.applyOriginalStyle(context);
      }
    } else if (this.nameElement) {
      await this.applyStyleText(`${this.nameElement.textContent}: ${valueText}`, false);
    }
  }
  kickFreeFlowStyleEditForTest() {
    const context = this.contextForTest;
    return this.applyFreeFlowStyleTextEdit(context);
  }
  editingEnded(context) {
    this.setExpandable(context.hasChildren);
    if (context.expanded) {
      this.expand();
    }
    const editedElement = context.isEditingName ? this.nameElement : this.valueElement;
    if (editedElement?.parentElement) {
      editedElement.parentElement.classList.remove("child-editing");
    }
    this.#parentPane.setEditingStyle(false);
  }
  editingCancelled(context) {
    this.removePrompt();
    if (this.hasBeenEditedIncrementally) {
      void this.applyOriginalStyle(context);
    } else if (this.newProperty && this.treeOutline) {
      this.treeOutline.removeChild(this);
    }
    this.updateTitle();
    this.editingEnded(context);
  }
  async applyOriginalStyle(context) {
    await this.applyStyleText(this.originalPropertyText, false, context.originalProperty);
  }
  findSibling(moveDirection) {
    let target = this;
    do {
      const sibling = moveDirection === "forward" ? target.nextSibling : target.previousSibling;
      target = sibling instanceof _StylePropertyTreeElement ? sibling : null;
    } while (target?.inherited());
    return target;
  }
  async editingCommitted(userInput, context, moveDirection) {
    this.removePrompt();
    this.editingEnded(context);
    const isEditingName = context.isEditingName;
    if (!this.nameElement || !this.valueElement) {
      return;
    }
    const nameElementValue = this.nameElement.textContent || "";
    const nameValueEntered = isEditingName && nameElementValue.includes(":") || !this.property;
    let createNewProperty = false;
    let moveToSelector = false;
    const isDataPasted = typeof context.originalName !== "undefined";
    const isDirtyViaPaste = isDataPasted && (this.nameElement.textContent !== context.originalName || this.valueElement.textContent !== context.originalValue);
    const isPropertySplitPaste = isDataPasted && isEditingName && this.valueElement.textContent !== context.originalValue;
    let moveTo = this;
    const moveToOther = isEditingName !== (moveDirection === "forward");
    const abandonNewProperty = this.newProperty && !userInput && (moveToOther || isEditingName);
    if (moveDirection === "forward" && (!isEditingName || isPropertySplitPaste) || moveDirection === "backward" && isEditingName) {
      moveTo = moveTo.findSibling(moveDirection);
      if (!moveTo) {
        if (moveDirection === "forward" && (!this.newProperty || userInput)) {
          createNewProperty = true;
        } else if (moveDirection === "backward") {
          moveToSelector = true;
        }
      }
    }
    let moveToIndex = -1;
    if (moveTo !== null && this.treeOutline) {
      moveToIndex = this.treeOutline.rootElement().indexOfChild(moveTo);
    }
    const blankInput = Platform2.StringUtilities.isWhitespace(userInput);
    const shouldCommitNewProperty = this.newProperty && (isPropertySplitPaste || moveToOther || !moveDirection && !isEditingName || isEditingName && blankInput || nameValueEntered);
    if ((userInput !== context.previousContent || isDirtyViaPaste) && !this.newProperty || shouldCommitNewProperty) {
      let propertyText;
      if (nameValueEntered) {
        propertyText = this.nameElement.textContent;
      } else if (blankInput || this.newProperty && Platform2.StringUtilities.isWhitespace(this.valueElement.textContent || "")) {
        propertyText = "";
      } else if (isEditingName) {
        propertyText = userInput + ": " + this.property.value;
      } else {
        propertyText = this.property.name + ": " + userInput;
      }
      await this.applyStyleText(propertyText || "", true);
      moveToNextCallback.call(this, this.newProperty, !blankInput, this.#parentSection);
    } else {
      if (isEditingName) {
        this.property.name = userInput;
      } else {
        this.property.value = userInput;
      }
      if (!isDataPasted && !this.newProperty) {
        this.updateTitle();
      }
      moveToNextCallback.call(this, this.newProperty, false, this.#parentSection);
    }
    function moveToNextCallback(alreadyNew, valueChanged, section3) {
      if (!moveDirection) {
        this.#parentPane.resetFocus();
        return;
      }
      if (moveTo && moveTo.parent) {
        if (isEditingName) {
          moveTo.startEditingValue();
        } else {
          moveTo.startEditingName();
        }
        return;
      }
      if (moveTo && !moveTo.parent) {
        const rootElement = section3.propertiesTreeOutline.rootElement();
        if (moveDirection === "forward" && blankInput && !isEditingName) {
          --moveToIndex;
        }
        if (moveToIndex >= rootElement.childCount() && !this.newProperty) {
          createNewProperty = true;
        } else {
          const treeElement = moveToIndex >= 0 ? rootElement.childAt(moveToIndex) : null;
          if (treeElement) {
            if (alreadyNew && blankInput) {
              if (moveDirection === "forward") {
                treeElement.startEditingName();
              } else {
                treeElement.startEditingValue();
              }
            } else if (!isEditingName || isPropertySplitPaste) {
              treeElement.startEditingName();
            } else {
              treeElement.startEditingValue();
            }
            return;
          }
          if (!alreadyNew) {
            moveToSelector = true;
          }
        }
      }
      if (createNewProperty) {
        if (alreadyNew && !valueChanged && isEditingName !== (moveDirection === "backward")) {
          return;
        }
        section3.addNewBlankProperty().startEditingName();
        return;
      }
      if (abandonNewProperty) {
        moveTo = this.findSibling(moveDirection);
        const sectionToEdit = moveTo || moveDirection === "backward" ? section3 : section3.nextEditableSibling();
        if (sectionToEdit) {
          if (sectionToEdit.style().parentRule) {
            sectionToEdit.startEditingSelector();
          } else {
            sectionToEdit.moveEditorFromSelector(moveDirection);
          }
        }
        return;
      }
      if (moveToSelector) {
        if (section3.style().parentRule) {
          section3.startEditingSelector();
        } else {
          section3.moveEditorFromSelector(moveDirection);
        }
      }
    }
  }
  removePrompt() {
    if (this.prompt) {
      this.prompt.detach();
      this.prompt = null;
    }
  }
  styleTextAppliedForTest() {
  }
  applyStyleText(styleText, majorChange, property) {
    return this.applyStyleThrottler.schedule(this.innerApplyStyleText.bind(this, styleText, majorChange, property));
  }
  async innerApplyStyleText(styleText, majorChange, property) {
    if (!this.treeOutline || !this.property) {
      return;
    }
    const oldStyleRange = this.style.range;
    if (!oldStyleRange) {
      return;
    }
    const hasBeenEditedIncrementally = this.hasBeenEditedIncrementally;
    styleText = styleText.replace(/[\xA0\t]/g, " ").trim();
    if (!styleText.length && majorChange && this.newProperty && !hasBeenEditedIncrementally) {
      this.parent?.removeChild(this);
      return;
    }
    const currentNode = this.#parentPane.node();
    this.#parentPane.setUserOperation(true);
    styleText += Platform2.StringUtilities.findUnclosedCssQuote(styleText);
    styleText += ")".repeat(Platform2.StringUtilities.countUnmatchedLeftParentheses(styleText));
    if (styleText.length && !/;\s*$/.test(styleText)) {
      styleText += ";";
    }
    const overwriteProperty = !this.newProperty || hasBeenEditedIncrementally;
    let success = await this.property.setText(styleText, majorChange, overwriteProperty);
    if (success && majorChange) {
      Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
    }
    if (hasBeenEditedIncrementally && majorChange && !success) {
      majorChange = false;
      success = await this.property.setText(this.originalPropertyText, majorChange, overwriteProperty);
    }
    this.#parentPane.setUserOperation(false);
    const updatedProperty = property || this.style.propertyAt(this.property.index);
    const isPropertyWithinBounds = this.property.index < this.style.allProperties().length;
    if (!success || !updatedProperty && isPropertyWithinBounds) {
      if (majorChange) {
        if (this.newProperty) {
          this.treeOutline.removeChild(this);
        } else {
          this.updateTitle();
        }
      }
      this.styleTextAppliedForTest();
      return;
    }
    this.#matchedStyles.resetActiveProperties();
    this.hasBeenEditedIncrementally = true;
    const deleteProperty = majorChange && !styleText.length;
    if (deleteProperty) {
      this.#parentSection.resetToolbars();
    } else if (!deleteProperty && updatedProperty) {
      this.property = updatedProperty;
    }
    if (currentNode === this.node()) {
      this.updatePane();
    }
    this.styleTextAppliedForTest();
  }
  ondblclick() {
    return true;
  }
  isEventWithinDisclosureTriangle(event) {
    return event.target === this.expandElement;
  }
};

// gen/front_end/panels/elements/StyleEditorWidget.js
var instance = null;
var StyleEditorWidget = class _StyleEditorWidget extends UI9.Widget.VBox {
  editor;
  pane;
  section;
  editorContainer;
  #triggerKey;
  constructor() {
    super({ useShadowDom: true });
    this.contentElement.tabIndex = 0;
    this.setDefaultFocusedElement(this.contentElement);
    this.editorContainer = document.createElement("div");
    this.contentElement.appendChild(this.editorContainer);
    this.onPropertySelected = this.onPropertySelected.bind(this);
    this.onPropertyDeselected = this.onPropertyDeselected.bind(this);
  }
  getSection() {
    return this.section;
  }
  async onPropertySelected(event) {
    if (!this.section) {
      return;
    }
    const target = ensureTreeElementForProperty(this.section, event.data.name);
    target.property.value = event.data.value;
    target.updateTitle();
    await target.applyStyleText(target.renderedPropertyText(), false);
    await this.render();
  }
  async onPropertyDeselected(event) {
    if (!this.section) {
      return;
    }
    const target = ensureTreeElementForProperty(this.section, event.data.name);
    await target.applyStyleText("", false);
    await this.render();
  }
  bindContext(pane9, section3) {
    this.pane = pane9;
    this.section = section3;
    this.editor?.addEventListener("propertyselected", this.onPropertySelected);
    this.editor?.addEventListener("propertydeselected", this.onPropertyDeselected);
  }
  setTriggerKey(value5) {
    this.#triggerKey = value5;
  }
  getTriggerKey() {
    return this.#triggerKey;
  }
  unbindContext() {
    this.pane = void 0;
    this.section = void 0;
    this.editor?.removeEventListener("propertyselected", this.onPropertySelected);
    this.editor?.removeEventListener("propertydeselected", this.onPropertyDeselected);
  }
  async render() {
    if (!this.editor) {
      return;
    }
    this.editor.data = {
      authoredProperties: this.section ? getAuthoredStyles(this.section, this.editor.getEditableProperties()) : /* @__PURE__ */ new Map(),
      computedProperties: this.pane ? await fetchComputedStyles(this.pane) : /* @__PURE__ */ new Map()
    };
  }
  static instance() {
    if (!instance) {
      instance = new _StyleEditorWidget();
    }
    return instance;
  }
  setEditor(editorClass) {
    if (!(this.editor instanceof editorClass)) {
      this.contentElement.removeChildren();
      this.editor = new editorClass();
      this.contentElement.appendChild(this.editor);
    }
  }
  static createTriggerButton(pane9, section3, editorClass, buttonTitle, triggerKey) {
    const triggerButton = createIcon2("flex-wrap", "styles-pane-button");
    triggerButton.title = buttonTitle;
    triggerButton.role = "button";
    triggerButton.onclick = async (event) => {
      event.stopPropagation();
      const popoverHelper = pane9.swatchPopoverHelper();
      const widget = _StyleEditorWidget.instance();
      widget.element.classList.toggle("with-padding", true);
      widget.setEditor(editorClass);
      widget.bindContext(pane9, section3);
      widget.setTriggerKey(triggerKey);
      await widget.render();
      widget.focus();
      const scrollerElement = triggerButton.enclosingNodeOrSelfWithClass("style-panes-wrapper");
      const onScroll = () => {
        popoverHelper.hide(true);
      };
      popoverHelper.show(widget, triggerButton, () => {
        widget.unbindContext();
        if (scrollerElement) {
          scrollerElement.removeEventListener("scroll", onScroll);
        }
      });
      if (scrollerElement) {
        scrollerElement.addEventListener("scroll", onScroll);
      }
    };
    triggerButton.onmouseup = (event) => {
      event.stopPropagation();
    };
    return triggerButton;
  }
};
function ensureTreeElementForProperty(section3, propertyName) {
  const target = section3.propertiesTreeOutline.rootElement().children().find((child) => child instanceof StylePropertyTreeElement && child.property.name === propertyName);
  if (target) {
    return target;
  }
  const newTarget = section3.addNewBlankProperty();
  newTarget.property.name = propertyName;
  return newTarget;
}
async function fetchComputedStyles(pane9) {
  const computedStyleModel = pane9.computedStyleModel();
  const style = await computedStyleModel.fetchComputedStyle();
  return style ? style.computedStyle : /* @__PURE__ */ new Map();
}
function getAuthoredStyles(section3, editableProperties) {
  const authoredProperties = /* @__PURE__ */ new Map();
  const editablePropertiesSet = new Set(editableProperties.map((prop) => prop.propertyName));
  for (const prop of section3.style().leadingProperties()) {
    if (editablePropertiesSet.has(prop.name)) {
      authoredProperties.set(prop.name, prop.value);
    }
  }
  return authoredProperties;
}

// gen/front_end/panels/elements/StylePropertiesSection.js
var StylePropertiesSection_exports = {};
__export(StylePropertiesSection_exports, {
  AtRuleSection: () => AtRuleSection,
  BlankStylePropertiesSection: () => BlankStylePropertiesSection,
  FunctionRuleSection: () => FunctionRuleSection,
  HighlightPseudoStylePropertiesSection: () => HighlightPseudoStylePropertiesSection,
  KeyframePropertiesSection: () => KeyframePropertiesSection,
  PositionTryRuleSection: () => PositionTryRuleSection,
  RegisteredPropertiesSection: () => RegisteredPropertiesSection,
  StylePropertiesSection: () => StylePropertiesSection
});
import "./../../ui/legacy/legacy.js";
import * as Common4 from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import * as i18n11 from "./../../core/i18n/i18n.js";
import * as Platform3 from "./../../core/platform/platform.js";
import * as Root2 from "./../../core/root/root.js";
import * as SDK7 from "./../../core/sdk/sdk.js";
import * as Badges2 from "./../../models/badges/badges.js";
import * as Bindings3 from "./../../models/bindings/bindings.js";
import * as TextUtils3 from "./../../models/text_utils/text_utils.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as Tooltips2 from "./../../ui/components/tooltips/tooltips.js";
import * as UI10 from "./../../ui/legacy/legacy.js";
import * as VisualLogging4 from "./../../ui/visual_logging/visual_logging.js";
import * as PanelsCommon from "./../common/common.js";
import * as ElementsComponents2 from "./components/components.js";
var UIStrings6 = {
  /**
   * @description Tooltip text that appears when hovering over the largeicon add button in the Styles Sidebar Pane of the Elements panel
   */
  insertStyleRuleBelow: "Insert style rule below",
  /**
   * @description Text in Styles Sidebar Pane of the Elements panel
   */
  constructedStylesheet: "constructed stylesheet",
  /**
   * @description Text in Styles Sidebar Pane of the Elements panel
   */
  userAgentStylesheet: "user agent stylesheet",
  /**
   * @description Text in Styles Sidebar Pane of the Elements panel
   */
  injectedStylesheet: "injected stylesheet",
  /**
   * @description Text in Styles Sidebar Pane of the Elements panel
   */
  viaInspector: "via inspector",
  /**
   * @description Text in Styles Sidebar Pane of the Elements panel
   */
  styleAttribute: "`style` attribute",
  /**
   * @description Text in Styles Sidebar Pane of the Elements panel
   * @example {html} PH1
   */
  sattributesStyle: "{PH1}[Attributes Style]",
  /**
   * @description Show all button text content in Styles Sidebar Pane of the Elements panel
   * @example {3} PH1
   */
  showAllPropertiesSMore: "Show all properties ({PH1} more)",
  /**
   * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
   */
  copySelector: "Copy `selector`",
  /**
   * @description A context menu item in Styles panel to copy CSS rule
   */
  copyRule: "Copy rule",
  /**
   * @description A context menu item in Styles panel to copy all CSS declarations
   */
  copyAllDeclarations: "Copy all declarations",
  /**
   * @description Text that is announced by the screen reader when the user focuses on an input field for editing the name of a CSS selector in the Styles panel
   */
  cssSelector: "`CSS` selector",
  /**
   * @description Text displayed in tooltip that shows specificity information.
   * @example {(0,0,1)} PH1
   */
  specificity: "Specificity: {PH1}"
};
var str_6 = i18n11.i18n.registerUIStrings("panels/elements/StylePropertiesSection.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var STYLE_TAG = "<style>";
var DEFAULT_MAX_PROPERTIES = 50;
var StylePropertiesSection = class _StylePropertiesSection {
  parentPane;
  styleInternal;
  matchedStyles;
  computedStyles;
  parentsComputedStyles;
  editable;
  hoverTimer = null;
  willCauseCancelEditing = false;
  forceShowAll = false;
  originalPropertiesCount;
  element;
  #styleRuleElement;
  titleElement;
  propertiesTreeOutline = new UI10.TreeOutline.TreeOutlineInShadow();
  showAllButton;
  selectorElement;
  newStyleRuleToolbar;
  fontEditorToolbar;
  fontEditorSectionManager;
  fontEditorButton;
  selectedSinceMouseDown;
  elementToSelectorIndex = /* @__PURE__ */ new WeakMap();
  navigable;
  selectorRefElement;
  hoverableSelectorsMode;
  #isHidden;
  customPopulateCallback;
  nestingLevel = 0;
  #ancestorRuleListElement;
  #ancestorClosingBracesElement;
  // Used to identify buttons that trigger a flexbox or grid editor.
  nextEditorTriggerButtonIdx = 1;
  sectionIdx = 0;
  #customHeaderText;
  #specificityTooltips;
  static #nextSpecificityTooltipId = 0;
  static #nextSectionTooltipIdPrefix = 0;
  sectionTooltipIdPrefix = _StylePropertiesSection.#nextSectionTooltipIdPrefix++;
  constructor(parentPane, matchedStyles, style, sectionIdx, computedStyles, parentsComputedStyles, customHeaderText) {
    this.#customHeaderText = customHeaderText;
    this.parentPane = parentPane;
    this.sectionIdx = sectionIdx;
    this.styleInternal = style;
    this.matchedStyles = matchedStyles;
    this.computedStyles = computedStyles;
    this.parentsComputedStyles = parentsComputedStyles;
    this.editable = Boolean(style.styleSheetId && style.range);
    this.originalPropertiesCount = style.leadingProperties().length;
    this.customPopulateCallback = () => this.populateStyle(this.styleInternal, this.propertiesTreeOutline);
    const rule = style.parentRule;
    const headerText = this.headerText();
    this.element = document.createElement("div");
    this.element.classList.add("styles-section");
    this.element.classList.add("matched-styles");
    this.element.classList.add("monospace");
    this.element.setAttribute("jslog", `${VisualLogging4.section("style-properties").track({
      keydown: "ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Enter|Space"
    })}`);
    UI10.ARIAUtils.setLabel(this.element, `${headerText}, css selector`);
    this.element.tabIndex = -1;
    UI10.ARIAUtils.markAsListitem(this.element);
    this.element.addEventListener("keydown", this.onKeyDown.bind(this), false);
    parentPane.sectionByElement.set(this.element, this);
    this.#styleRuleElement = this.element.createChild("div", "style-rule");
    this.#ancestorRuleListElement = document.createElement("div");
    this.#ancestorRuleListElement.classList.add("ancestor-rule-list");
    this.element.prepend(this.#ancestorRuleListElement);
    this.#ancestorClosingBracesElement = document.createElement("div");
    this.#ancestorClosingBracesElement.classList.add("ancestor-closing-braces");
    this.element.append(this.#ancestorClosingBracesElement);
    this.updateAncestorRuleList();
    this.titleElement = this.#styleRuleElement.createChild("div", "styles-section-title " + (rule ? "styles-selector" : ""));
    this.propertiesTreeOutline.setFocusable(false);
    this.propertiesTreeOutline.registerRequiredCSS(stylePropertiesTreeOutline_css_default);
    this.propertiesTreeOutline.element.classList.add("style-properties", "matched-styles", "monospace");
    this.#styleRuleElement.appendChild(this.propertiesTreeOutline.element);
    this.showAllButton = UI10.UIUtils.createTextButton("", this.showAllItems.bind(this), {
      className: "styles-show-all",
      jslogContext: "elements.show-all-style-properties"
    });
    this.#styleRuleElement.appendChild(this.showAllButton);
    const indent = Common4.Settings.Settings.instance().moduleSetting("text-editor-indent").get();
    const selectorContainer = document.createElement("div");
    selectorContainer.createChild("span", "styles-clipboard-only").textContent = indent.repeat(this.nestingLevel);
    selectorContainer.classList.add("selector-container");
    this.selectorElement = document.createElement("span");
    UI10.ARIAUtils.setLabel(this.selectorElement, i18nString6(UIStrings6.cssSelector));
    this.selectorElement.classList.add("selector");
    this.selectorElement.textContent = headerText;
    selectorContainer.appendChild(this.selectorElement);
    this.selectorElement.addEventListener("mouseenter", this.onMouseEnterSelector.bind(this), false);
    this.selectorElement.addEventListener("mouseleave", this.onMouseOutSelector.bind(this), false);
    this.#specificityTooltips = selectorContainer.createChild("span");
    if (headerText.length > 0 || !(rule instanceof SDK7.CSSRule.CSSStyleRule)) {
      const openBrace = selectorContainer.createChild("span", "sidebar-pane-open-brace");
      openBrace.textContent = headerText.length > 0 ? " {" : "{";
      const closeBrace = this.#styleRuleElement.createChild("div", "sidebar-pane-closing-brace");
      closeBrace.createChild("span", "styles-clipboard-only").textContent = indent.repeat(this.nestingLevel);
      closeBrace.createChild("span").textContent = "}";
    } else {
      this.titleElement.classList.add("hidden");
    }
    if (rule) {
      const newRuleButton = new UI10.Toolbar.ToolbarButton(i18nString6(UIStrings6.insertStyleRuleBelow), "plus", void 0, "elements.new-style-rule");
      newRuleButton.addEventListener("Click", this.onNewRuleClick, this);
      newRuleButton.setSize(
        "SMALL"
        /* Buttons.Button.Size.SMALL */
      );
      newRuleButton.element.tabIndex = -1;
      if (!this.newStyleRuleToolbar) {
        this.newStyleRuleToolbar = this.element.createChild("devtools-toolbar", "sidebar-pane-section-toolbar new-rule-toolbar");
      }
      this.newStyleRuleToolbar.appendToolbarItem(newRuleButton);
      UI10.ARIAUtils.setHidden(this.newStyleRuleToolbar, true);
    }
    if (Root2.Runtime.experiments.isEnabled("font-editor") && this.editable) {
      this.fontEditorToolbar = this.#styleRuleElement.createChild("devtools-toolbar", "sidebar-pane-section-toolbar");
      this.fontEditorSectionManager = new FontEditorSectionManager(this.parentPane.swatchPopoverHelper(), this);
      this.fontEditorButton = new UI10.Toolbar.ToolbarButton("Font Editor", "custom-typography", void 0, "font-editor");
      this.fontEditorButton.addEventListener("Click", () => {
        this.onFontEditorButtonClicked();
      }, this);
      this.fontEditorButton.element.addEventListener("keydown", (event) => {
        if (Platform3.KeyboardUtilities.isEnterOrSpaceKey(event)) {
          event.consume(true);
          this.onFontEditorButtonClicked();
        }
      }, false);
      this.fontEditorToolbar.appendToolbarItem(this.fontEditorButton);
      if (this.styleInternal.type === SDK7.CSSStyleDeclaration.Type.Inline) {
        if (this.newStyleRuleToolbar) {
          this.newStyleRuleToolbar.classList.add("shifted-toolbar");
        }
      } else {
        this.fontEditorToolbar.classList.add("font-toolbar-hidden");
      }
    }
    this.selectorElement.addEventListener("click", this.handleSelectorClick.bind(this), false);
    this.selectorElement.setAttribute("jslog", `${VisualLogging4.cssRuleHeader("selector").track({ click: true, change: true })}`);
    this.element.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), false);
    this.element.addEventListener("mousedown", this.handleEmptySpaceMouseDown.bind(this), false);
    this.element.addEventListener("click", this.handleEmptySpaceClick.bind(this), false);
    this.element.addEventListener("mousemove", this.onMouseMove.bind(this), false);
    this.element.addEventListener("mouseleave", this.onMouseLeave.bind(this), false);
    this.selectedSinceMouseDown = false;
    if (rule) {
      if (rule.isUserAgent() || rule.isInjected()) {
        this.editable = false;
      } else if (rule.header) {
        this.navigable = !rule.header.isAnonymousInlineStyleSheet();
      }
    }
    this.selectorRefElement = document.createElement("div");
    this.selectorRefElement.classList.add("styles-section-subtitle");
    this.element.prepend(this.selectorRefElement);
    this.updateRuleOrigin();
    this.titleElement.appendChild(selectorContainer);
    if (this.navigable) {
      this.element.classList.add("navigable");
    }
    if (!this.editable) {
      this.element.classList.add("read-only");
      this.propertiesTreeOutline.element.classList.add("read-only");
    }
    this.hoverableSelectorsMode = false;
    this.#isHidden = false;
    this.markSelectorMatches();
    this.onpopulate();
  }
  setComputedStyles(computedStyles) {
    this.computedStyles = computedStyles;
  }
  setParentsComputedStyles(parentsComputedStyles) {
    this.parentsComputedStyles = parentsComputedStyles;
  }
  updateAuthoringHint() {
    let child = this.propertiesTreeOutline.firstChild();
    while (child) {
      if (child instanceof StylePropertyTreeElement) {
        child.setComputedStyles(this.computedStyles);
        child.setParentsComputedStyles(this.parentsComputedStyles);
        child.updateAuthoringHint();
      }
      child = child.nextSibling;
    }
  }
  setSectionIdx(sectionIdx) {
    this.sectionIdx = sectionIdx;
    this.onpopulate();
  }
  getSectionIdx() {
    return this.sectionIdx;
  }
  registerFontProperty(treeElement) {
    if (this.fontEditorSectionManager) {
      this.fontEditorSectionManager.registerFontProperty(treeElement);
    }
    if (this.fontEditorToolbar) {
      this.fontEditorToolbar.classList.remove("font-toolbar-hidden");
      if (this.newStyleRuleToolbar) {
        this.newStyleRuleToolbar.classList.add("shifted-toolbar");
      }
    }
  }
  resetToolbars() {
    if (this.parentPane.swatchPopoverHelper().isShowing() || this.styleInternal.type === SDK7.CSSStyleDeclaration.Type.Inline) {
      return;
    }
    if (this.fontEditorToolbar) {
      this.fontEditorToolbar.classList.add("font-toolbar-hidden");
    }
    if (this.newStyleRuleToolbar) {
      this.newStyleRuleToolbar.classList.remove("shifted-toolbar");
    }
  }
  static createRuleOriginNode(matchedStyles, linkifier, rule) {
    if (!rule) {
      return document.createTextNode("");
    }
    const ruleLocation = _StylePropertiesSection.getRuleLocationFromCSSRule(rule);
    const header = rule.header;
    function linkifyRuleLocation() {
      if (!rule) {
        return null;
      }
      if (ruleLocation && header && (!header.isAnonymousInlineStyleSheet() || matchedStyles.cssModel().sourceMapManager().sourceMapForClient(header))) {
        return _StylePropertiesSection.linkifyRuleLocation(matchedStyles.cssModel(), linkifier, rule.header, ruleLocation);
      }
      return null;
    }
    function linkifyNode(label) {
      if (header?.ownerNode) {
        const link2 = document.createElement("devtools-widget");
        link2.widgetConfig = UI10.Widget.widgetConfig((e) => new PanelsCommon.DOMLinkifier.DeferredDOMNodeLink(e, header.ownerNode));
        link2.textContent = label;
        return link2;
      }
      return null;
    }
    if (header?.isMutable && !header.isViaInspector()) {
      const location2 = header.isConstructedByNew() && !header.sourceMapURL ? null : linkifyRuleLocation();
      if (location2) {
        return location2;
      }
      const label = header.isConstructedByNew() ? i18nString6(UIStrings6.constructedStylesheet) : STYLE_TAG;
      const node2 = linkifyNode(label);
      if (node2) {
        return node2;
      }
      return document.createTextNode(label);
    }
    const location = linkifyRuleLocation();
    if (location) {
      return location;
    }
    if (rule.isUserAgent()) {
      return document.createTextNode(i18nString6(UIStrings6.userAgentStylesheet));
    }
    if (rule.isInjected()) {
      return document.createTextNode(i18nString6(UIStrings6.injectedStylesheet));
    }
    if (rule.isViaInspector()) {
      return document.createTextNode(i18nString6(UIStrings6.viaInspector));
    }
    const node = linkifyNode(STYLE_TAG);
    if (node) {
      return node;
    }
    return document.createTextNode("");
  }
  createRuleOriginNode(matchedStyles, linkifier, rule) {
    return _StylePropertiesSection.createRuleOriginNode(matchedStyles, linkifier, rule);
  }
  static getRuleLocationFromCSSRule(rule) {
    let ruleLocation;
    if (rule instanceof SDK7.CSSRule.CSSStyleRule) {
      ruleLocation = rule.style.range;
    } else if (rule instanceof SDK7.CSSRule.CSSKeyframeRule) {
      ruleLocation = rule.key().range;
    }
    return ruleLocation;
  }
  static tryNavigateToRuleLocation(matchedStyles, rule) {
    if (!rule) {
      return;
    }
    const ruleLocation = this.getRuleLocationFromCSSRule(rule);
    const header = rule.header;
    if (ruleLocation && header && !header.isAnonymousInlineStyleSheet()) {
      const matchingSelectorLocation = this.getCSSSelectorLocation(matchedStyles.cssModel(), rule.header, ruleLocation);
      this.revealSelectorSource(matchingSelectorLocation, true);
    }
  }
  static linkifyRuleLocation(cssModel, linkifier, styleSheetHeader, ruleLocation) {
    const matchingSelectorLocation = this.getCSSSelectorLocation(cssModel, styleSheetHeader, ruleLocation);
    return linkifier.linkifyCSSLocation(matchingSelectorLocation);
  }
  static getCSSSelectorLocation(cssModel, styleSheetHeader, ruleLocation) {
    const lineNumber = styleSheetHeader.lineNumberInSource(ruleLocation.startLine);
    const columnNumber = styleSheetHeader.columnNumberInSource(ruleLocation.startLine, ruleLocation.startColumn);
    return new SDK7.CSSModel.CSSLocation(styleSheetHeader, lineNumber, columnNumber);
  }
  getFocused() {
    return this.propertiesTreeOutline.shadowRoot.activeElement || null;
  }
  focusNext(element) {
    const focused = this.getFocused();
    if (focused) {
      focused.tabIndex = -1;
    }
    element.focus();
    if (this.propertiesTreeOutline.shadowRoot.contains(element)) {
      element.tabIndex = 0;
    }
  }
  ruleNavigation(keyboardEvent) {
    if (keyboardEvent.altKey || keyboardEvent.ctrlKey || keyboardEvent.metaKey || keyboardEvent.shiftKey) {
      return;
    }
    const focused = this.getFocused();
    let focusNext = null;
    const focusable = Array.from(this.propertiesTreeOutline.shadowRoot.querySelectorAll("[tabindex]")).filter((e) => e.checkVisibility());
    if (focusable.length === 0) {
      return;
    }
    const focusedIndex = focused ? focusable.indexOf(focused) : -1;
    if (keyboardEvent.key === "ArrowLeft") {
      focusNext = focusable[focusedIndex - 1] || this.element;
    } else if (keyboardEvent.key === "ArrowRight") {
      focusNext = focusable[focusedIndex + 1] || this.element;
    } else if (keyboardEvent.key === "ArrowUp" || keyboardEvent.key === "ArrowDown") {
      this.focusNext(this.element);
      return;
    }
    if (focusNext) {
      this.focusNext(focusNext);
      keyboardEvent.consume(true);
    }
  }
  onKeyDown(event) {
    const keyboardEvent = event;
    if (UI10.UIUtils.isEditing() || !this.editable || keyboardEvent.altKey || keyboardEvent.ctrlKey || keyboardEvent.metaKey) {
      return;
    }
    switch (keyboardEvent.key) {
      case "Enter":
      case " ":
        this.startEditingAtFirstPosition();
        keyboardEvent.consume(true);
        break;
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown":
        this.ruleNavigation(keyboardEvent);
        break;
      default:
        if (keyboardEvent.key.length === 1) {
          this.addNewBlankProperty(0).startEditingName();
        }
        break;
    }
  }
  setSectionHovered(isHovered) {
    this.element.classList.toggle("styles-panel-hovered", isHovered);
    this.propertiesTreeOutline.element.classList.toggle("styles-panel-hovered", isHovered);
    if (this.hoverableSelectorsMode !== isHovered) {
      this.hoverableSelectorsMode = isHovered;
      this.markSelectorMatches();
    }
  }
  onMouseLeave(_event) {
    this.setSectionHovered(false);
    this.parentPane.setActiveProperty(null);
  }
  onMouseMove(event) {
    const hasCtrlOrMeta = UI10.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event);
    this.setSectionHovered(hasCtrlOrMeta);
    const treeElement = this.propertiesTreeOutline.treeElementFromEvent(event);
    if (treeElement instanceof StylePropertyTreeElement) {
      this.parentPane.setActiveProperty(treeElement);
    } else {
      this.parentPane.setActiveProperty(null);
    }
    const selection = this.element.getComponentSelection();
    if (!this.selectedSinceMouseDown && selection?.toString()) {
      this.selectedSinceMouseDown = true;
    }
  }
  onFontEditorButtonClicked() {
    if (this.fontEditorSectionManager && this.fontEditorButton) {
      void this.fontEditorSectionManager.showPopover(this.fontEditorButton.element, this.parentPane);
    }
  }
  style() {
    return this.styleInternal;
  }
  headerText() {
    if (this.#customHeaderText) {
      return this.#customHeaderText;
    }
    const node = this.matchedStyles.nodeForStyle(this.styleInternal);
    if (this.styleInternal.type === SDK7.CSSStyleDeclaration.Type.Inline) {
      return this.matchedStyles.isInherited(this.styleInternal) ? i18nString6(UIStrings6.styleAttribute) : "element.style";
    }
    if (this.styleInternal.type === SDK7.CSSStyleDeclaration.Type.Transition) {
      return "transitions style";
    }
    if (this.styleInternal.type === SDK7.CSSStyleDeclaration.Type.Animation) {
      return this.styleInternal.animationName() ? `${this.styleInternal.animationName()} animation` : "animation style";
    }
    if (node && this.styleInternal.type === SDK7.CSSStyleDeclaration.Type.Attributes) {
      return i18nString6(UIStrings6.sattributesStyle, { PH1: node.nodeNameInCorrectCase() });
    }
    if (this.styleInternal.parentRule instanceof SDK7.CSSRule.CSSStyleRule) {
      return this.styleInternal.parentRule.selectorText();
    }
    if (this.styleInternal.parentRule instanceof SDK7.CSSRule.CSSAtRule) {
      if (this.styleInternal.parentRule.subsection()) {
        return "@" + this.styleInternal.parentRule.subsection();
      }
      const atRule = "@" + this.styleInternal.parentRule.type();
      const name = this.styleInternal.parentRule.name();
      if (name) {
        return atRule + " " + name.text;
      }
      return atRule;
    }
    return "";
  }
  onMouseOutSelector() {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
    }
    SDK7.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  }
  onMouseEnterSelector() {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
    }
    this.hoverTimer = window.setTimeout(this.highlight.bind(this), 300);
  }
  highlight(mode = "all") {
    SDK7.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    const node = this.parentPane.node();
    if (!node) {
      return;
    }
    const selectorList = this.styleInternal.parentRule && this.styleInternal.parentRule instanceof SDK7.CSSRule.CSSStyleRule ? this.styleInternal.parentRule.selectorText() : void 0;
    node.domModel().overlayModel().highlightInOverlay({ node, selectorList }, mode);
  }
  firstSibling() {
    const parent = this.element.parentElement;
    if (!parent) {
      return null;
    }
    let childElement = parent.firstChild;
    while (childElement) {
      const childSection = this.parentPane.sectionByElement.get(childElement);
      if (childSection) {
        return childSection;
      }
      childElement = childElement.nextSibling;
    }
    return null;
  }
  findCurrentOrNextVisible(willIterateForward, originalSection) {
    if (!this.isHidden()) {
      return this;
    }
    if (this === originalSection) {
      return null;
    }
    if (!originalSection) {
      originalSection = this;
    }
    let visibleSibling = null;
    const nextSibling = willIterateForward ? this.nextSibling() : this.previousSibling();
    if (nextSibling) {
      visibleSibling = nextSibling.findCurrentOrNextVisible(willIterateForward, originalSection);
    } else {
      const loopSibling = willIterateForward ? this.firstSibling() : this.lastSibling();
      if (loopSibling) {
        visibleSibling = loopSibling.findCurrentOrNextVisible(willIterateForward, originalSection);
      }
    }
    return visibleSibling;
  }
  lastSibling() {
    const parent = this.element.parentElement;
    if (!parent) {
      return null;
    }
    let childElement = parent.lastChild;
    while (childElement) {
      const childSection = this.parentPane.sectionByElement.get(childElement);
      if (childSection) {
        return childSection;
      }
      childElement = childElement.previousSibling;
    }
    return null;
  }
  nextSibling() {
    let curElement = this.element;
    do {
      curElement = curElement.nextSibling;
    } while (curElement && !this.parentPane.sectionByElement.has(curElement));
    if (curElement) {
      return this.parentPane.sectionByElement.get(curElement);
    }
    return;
  }
  previousSibling() {
    let curElement = this.element;
    do {
      curElement = curElement.previousSibling;
    } while (curElement && !this.parentPane.sectionByElement.has(curElement));
    if (curElement) {
      return this.parentPane.sectionByElement.get(curElement);
    }
    return;
  }
  onNewRuleClick(event) {
    event.data.consume();
    const rule = this.styleInternal.parentRule;
    if (!rule?.style.range || !rule.header) {
      return;
    }
    const range = TextUtils3.TextRange.TextRange.createFromLocation(rule.style.range.endLine, rule.style.range.endColumn + 1);
    this.parentPane.addBlankSection(this, rule.header, range);
  }
  styleSheetEdited(edit) {
    const rule = this.styleInternal.parentRule;
    if (rule) {
      rule.rebase(edit);
    } else {
      this.styleInternal.rebase(edit);
    }
    this.updateAncestorRuleList();
    this.updateRuleOrigin();
  }
  createAncestorRules(rule) {
    let mediaIndex = 0;
    let containerIndex = 0;
    let scopeIndex = 0;
    let supportsIndex = 0;
    let nestingIndex = 0;
    this.nestingLevel = 0;
    for (const ruleType of rule.ruleTypes) {
      let ancestorRuleElement;
      switch (ruleType) {
        case "MediaRule":
          ancestorRuleElement = this.createMediaElement(rule.media[mediaIndex++]);
          break;
        case "ContainerRule":
          ancestorRuleElement = this.createContainerQueryElement(rule.containerQueries[containerIndex++]);
          break;
        case "ScopeRule":
          ancestorRuleElement = this.createScopeElement(rule.scopes[scopeIndex++]);
          break;
        case "SupportsRule":
          ancestorRuleElement = this.createSupportsElement(rule.supports[supportsIndex++]);
          break;
        case "StyleRule":
          ancestorRuleElement = this.createNestingElement(rule.nestingSelectors?.[nestingIndex++]);
          break;
        case "StartingStyleRule":
          if (Root2.Runtime.hostConfig.devToolsStartingStyleDebugging?.enabled) {
            ancestorRuleElement = this.createStartingStyleElement();
          }
          break;
      }
      if (ancestorRuleElement) {
        this.#ancestorRuleListElement.prepend(ancestorRuleElement);
        this.#ancestorClosingBracesElement.prepend(this.indentElement(this.createClosingBrace(), this.nestingLevel));
        this.nestingLevel++;
      }
    }
    if (this.headerText().length === 0) {
      this.nestingLevel--;
    }
  }
  createAtRuleAncestor(rule) {
    if (rule.subsection()) {
      const atRuleElement = new ElementsComponents2.CSSQuery.CSSQuery();
      atRuleElement.data = {
        queryPrefix: "@" + rule.type(),
        queryText: rule.name()?.text ?? "",
        jslogContext: "at-rule-" + rule.type()
      };
      this.#ancestorRuleListElement.prepend(atRuleElement);
      this.#ancestorClosingBracesElement.prepend(this.indentElement(this.createClosingBrace(), 0));
      this.nestingLevel = 1;
    }
  }
  maybeCreateAncestorRules(style) {
    if (style.parentRule) {
      if (style.parentRule instanceof SDK7.CSSRule.CSSStyleRule) {
        this.createAncestorRules(style.parentRule);
      } else if (style.parentRule instanceof SDK7.CSSRule.CSSAtRule) {
        this.createAtRuleAncestor(style.parentRule);
      }
      let curNestingLevel = 0;
      for (const element of this.#ancestorRuleListElement.children) {
        this.indentElement(element, curNestingLevel);
        curNestingLevel++;
      }
    }
  }
  createClosingBrace() {
    const closingBrace = document.createElement("div");
    closingBrace.append("}");
    return closingBrace;
  }
  indentElement(element, nestingLevel, clipboardOnly) {
    const indent = Common4.Settings.Settings.instance().moduleSetting("text-editor-indent").get();
    const indentElement = document.createElement("span");
    indentElement.classList.add("styles-clipboard-only");
    indentElement.setAttribute("slot", "indent");
    indentElement.textContent = indent.repeat(nestingLevel);
    element.prepend(indentElement);
    if (!clipboardOnly) {
      element.style.paddingLeft = `${nestingLevel}ch`;
    }
    return element;
  }
  createMediaElement(media) {
    const isMedia = !media.text || !media.text.includes("(") && media.text !== "print";
    if (isMedia) {
      return;
    }
    let queryPrefix = "";
    let queryText = "";
    let onQueryTextClick;
    switch (media.source) {
      case SDK7.CSSMedia.Source.LINKED_SHEET:
      case SDK7.CSSMedia.Source.INLINE_SHEET: {
        queryText = `media="${media.text}"`;
        break;
      }
      case SDK7.CSSMedia.Source.MEDIA_RULE: {
        queryPrefix = "@media";
        queryText = media.text;
        if (media.styleSheetId) {
          onQueryTextClick = this.handleQueryRuleClick.bind(this, media);
        }
        break;
      }
      case SDK7.CSSMedia.Source.IMPORT_RULE: {
        queryText = `@import ${media.text}`;
        break;
      }
    }
    const mediaQueryElement = new ElementsComponents2.CSSQuery.CSSQuery();
    mediaQueryElement.data = {
      queryPrefix,
      queryText,
      onQueryTextClick,
      jslogContext: "media-query"
    };
    return mediaQueryElement;
  }
  createContainerQueryElement(containerQuery) {
    if (!containerQuery.text) {
      return;
    }
    let onQueryTextClick;
    if (containerQuery.styleSheetId) {
      onQueryTextClick = this.handleQueryRuleClick.bind(this, containerQuery);
    }
    const containerQueryElement = new ElementsComponents2.CSSQuery.CSSQuery();
    containerQueryElement.data = {
      queryPrefix: "@container",
      queryName: containerQuery.name,
      queryText: containerQuery.text,
      onQueryTextClick,
      jslogContext: "container-query"
    };
    if (!/^style\(.*\)/.test(containerQuery.text)) {
      void this.addContainerForContainerQuery(containerQuery);
    }
    return containerQueryElement;
  }
  createScopeElement(scope) {
    let onQueryTextClick;
    if (scope.styleSheetId) {
      onQueryTextClick = this.handleQueryRuleClick.bind(this, scope);
    }
    const scopeElement = new ElementsComponents2.CSSQuery.CSSQuery();
    scopeElement.data = {
      queryPrefix: "@scope",
      queryText: scope.text,
      onQueryTextClick,
      jslogContext: "scope"
    };
    return scopeElement;
  }
  createStartingStyleElement() {
    const startingStyleElement = new ElementsComponents2.CSSQuery.CSSQuery();
    startingStyleElement.data = {
      queryPrefix: "@starting-style",
      queryText: "",
      jslogContext: "starting-style"
    };
    return startingStyleElement;
  }
  createSupportsElement(supports) {
    if (!supports.text) {
      return;
    }
    let onQueryTextClick;
    if (supports.styleSheetId) {
      onQueryTextClick = this.handleQueryRuleClick.bind(this, supports);
    }
    const supportsElement = new ElementsComponents2.CSSQuery.CSSQuery();
    supportsElement.data = {
      queryPrefix: "@supports",
      queryText: supports.text,
      onQueryTextClick,
      jslogContext: "supports"
    };
    return supportsElement;
  }
  createNestingElement(nestingSelector) {
    if (!nestingSelector) {
      return;
    }
    const nestingElement = document.createElement("div");
    nestingElement.textContent = `${nestingSelector} {`;
    return nestingElement;
  }
  async addContainerForContainerQuery(containerQuery) {
    const container = await containerQuery.getContainerForNode(this.matchedStyles.node().id);
    if (!container) {
      return;
    }
    const containerElement = new ElementsComponents2.QueryContainer.QueryContainer();
    containerElement.data = {
      container: ElementsComponents2.Helper.legacyNodeToElementsComponentsNode(container.containerNode),
      queryName: containerQuery.name,
      onContainerLinkClick: (event) => {
        event.preventDefault();
        void ElementsPanel.instance().revealAndSelectNode(container.containerNode, { showPanel: true, focusNode: true, highlightInOverlay: false });
        void container.containerNode.scrollIntoView();
      }
    };
    containerElement.addEventListener("queriedsizerequested", async () => {
      const details = await container.getContainerSizeDetails();
      if (details) {
        containerElement.updateContainerQueriedSizeDetails(details);
      }
    });
    this.#ancestorRuleListElement.prepend(containerElement);
  }
  updateAncestorRuleList() {
    this.#ancestorRuleListElement.removeChildren();
    this.#ancestorClosingBracesElement.removeChildren();
    this.maybeCreateAncestorRules(this.styleInternal);
    this.#styleRuleElement.style.paddingLeft = `${this.nestingLevel}ch`;
  }
  isPropertyInherited(propertyName) {
    if (this.matchedStyles.isInherited(this.styleInternal)) {
      return !SDK7.CSSMetadata.cssMetadata().isPropertyInherited(propertyName);
    }
    return false;
  }
  nextEditableSibling() {
    let curSection = this;
    do {
      curSection = curSection.nextSibling();
    } while (curSection && !curSection.editable);
    if (!curSection) {
      curSection = this.firstSibling();
      while (curSection && !curSection.editable) {
        curSection = curSection.nextSibling();
      }
    }
    return curSection?.editable ? curSection : null;
  }
  previousEditableSibling() {
    let curSection = this;
    do {
      curSection = curSection.previousSibling();
    } while (curSection && !curSection.editable);
    if (!curSection) {
      curSection = this.lastSibling();
      while (curSection && !curSection.editable) {
        curSection = curSection.previousSibling();
      }
    }
    return curSection?.editable ? curSection : null;
  }
  refreshUpdate(editedTreeElement) {
    this.parentPane.refreshUpdate(this, editedTreeElement);
  }
  updateVarFunctions(editedTreeElement) {
    if (!editedTreeElement.property.name.startsWith("--")) {
      return;
    }
    let child = this.propertiesTreeOutline.firstChild();
    while (child) {
      if (child !== editedTreeElement && child instanceof StylePropertyTreeElement) {
        child.refreshIfComputedValueChanged();
      }
      child = child.traverseNextTreeElement(
        false,
        null,
        true
        /* dontPopulate */
      );
    }
  }
  update(full) {
    const headerText = this.headerText();
    this.selectorElement.textContent = headerText;
    this.titleElement.classList.toggle("hidden", headerText.length === 0);
    this.markSelectorMatches();
    if (full) {
      this.onpopulate();
    } else {
      let child = this.propertiesTreeOutline.firstChild();
      while (child && child instanceof StylePropertyTreeElement) {
        child.setOverloaded(this.isPropertyOverloaded(child.property));
        child = child.traverseNextTreeElement(
          false,
          null,
          true
          /* dontPopulate */
        );
      }
    }
  }
  showAllItems(event) {
    if (event) {
      event.consume();
    }
    if (this.forceShowAll) {
      return;
    }
    this.forceShowAll = true;
    this.onpopulate();
  }
  onpopulate() {
    this.parentPane.setActiveProperty(null);
    this.nextEditorTriggerButtonIdx = 1;
    this.propertiesTreeOutline.removeChildren();
    this.customPopulateCallback();
  }
  populateStyle(style, parent) {
    let count = 0;
    const properties = style.leadingProperties();
    const maxProperties = DEFAULT_MAX_PROPERTIES + properties.length - this.originalPropertiesCount;
    for (const property of properties) {
      if (!this.forceShowAll && count >= maxProperties) {
        break;
      }
      count++;
      const isShorthand = property.getLonghandProperties().length > 0;
      const inherited = this.isPropertyInherited(property.name);
      const overloaded = this.isPropertyOverloaded(property);
      if (style.parentRule && style.parentRule.isUserAgent() && inherited) {
        continue;
      }
      const item2 = new StylePropertyTreeElement({
        stylesPane: this.parentPane,
        section: this,
        matchedStyles: this.matchedStyles,
        property,
        isShorthand,
        inherited,
        overloaded,
        newProperty: false
      });
      item2.setComputedStyles(this.computedStyles);
      item2.setParentsComputedStyles(this.parentsComputedStyles);
      parent.appendChild(item2);
    }
    if (count < properties.length) {
      this.showAllButton.classList.remove("hidden");
      this.showAllButton.textContent = i18nString6(UIStrings6.showAllPropertiesSMore, { PH1: properties.length - count });
    } else {
      this.showAllButton.classList.add("hidden");
    }
  }
  isPropertyOverloaded(property) {
    return this.matchedStyles.propertyState(property) === "Overloaded";
  }
  updateFilter() {
    let hasMatchingChild = false;
    this.showAllItems();
    for (const child of this.propertiesTreeOutline.rootElement().children()) {
      if (child instanceof StylePropertyTreeElement) {
        const childHasMatches = child.updateFilter();
        hasMatchingChild = hasMatchingChild || childHasMatches;
      }
    }
    const regex = this.parentPane.filterRegex();
    const hideRule = !hasMatchingChild && regex !== null && !regex.test(this.element.deepTextContent());
    this.#isHidden = hideRule;
    this.element.classList.toggle("hidden", hideRule);
    if (!hideRule && this.styleInternal.parentRule) {
      this.markSelectorHighlights();
    }
    return !hideRule;
  }
  isHidden() {
    return this.#isHidden;
  }
  markSelectorMatches() {
    const rule = this.styleInternal.parentRule;
    if (!rule || !(rule instanceof SDK7.CSSRule.CSSStyleRule)) {
      return;
    }
    const matchingSelectorIndexes = this.matchedStyles.getMatchingSelectors(rule);
    const matchingSelectors = new Array(rule.selectors.length).fill(false);
    for (const matchingIndex of matchingSelectorIndexes) {
      matchingSelectors[matchingIndex] = true;
    }
    if (this.parentPane.isEditingStyle) {
      return;
    }
    this.renderSelectors(rule.selectors, matchingSelectors, this.elementToSelectorIndex);
    this.markSelectorHighlights();
  }
  static getNextSpecificityTooltipId() {
    return `specificity-tooltip-${this.#nextSpecificityTooltipId++}`;
  }
  renderSelectors(selectors, matchingSelectors, elementToSelectorIndex) {
    this.selectorElement.removeChildren();
    this.#specificityTooltips.removeChildren();
    for (const [i, selector] of selectors.entries()) {
      if (i > 0) {
        this.selectorElement.append(", ");
      }
      const specificityTooltipId = selector.specificity ? _StylePropertiesSection.getNextSpecificityTooltipId() : null;
      const span = this.selectorElement.createChild("span", "simple-selector");
      span.classList.toggle("selector-matches", matchingSelectors[i]);
      elementToSelectorIndex.set(span, i);
      span.textContent = selectors[i].text;
      if (specificityTooltipId && selector.specificity) {
        span.setAttribute("aria-describedby", specificityTooltipId);
        const PH1 = `(${selector.specificity.a},${selector.specificity.b},${selector.specificity.c})`;
        const tooltip = this.#specificityTooltips.appendChild(new Tooltips2.Tooltip.Tooltip({
          id: specificityTooltipId,
          anchor: span,
          jslogContext: "elements.css-selector-specificity"
        }));
        tooltip.textContent = i18nString6(UIStrings6.specificity, { PH1 });
      }
    }
  }
  markSelectorHighlights() {
    const selectors = this.selectorElement.getElementsByClassName("simple-selector");
    const regex = this.parentPane.filterRegex();
    for (let i = 0; i < selectors.length; ++i) {
      const selectorMatchesFilter = regex?.test(selectors[i].textContent || "");
      selectors[i].classList.toggle("filter-match", selectorMatchesFilter);
    }
  }
  addNewBlankProperty(index = this.propertiesTreeOutline.rootElement().childCount()) {
    const property = this.styleInternal.newBlankProperty(index);
    const item2 = new StylePropertyTreeElement({
      stylesPane: this.parentPane,
      section: this,
      matchedStyles: this.matchedStyles,
      property,
      isShorthand: false,
      inherited: false,
      overloaded: false,
      newProperty: true
    });
    this.propertiesTreeOutline.insertChild(item2, property.index);
    return item2;
  }
  handleEmptySpaceMouseDown() {
    this.willCauseCancelEditing = this.parentPane.isEditingStyle;
    this.selectedSinceMouseDown = false;
  }
  handleEmptySpaceClick(event) {
    if (!this.editable || this.element.hasSelection() || this.willCauseCancelEditing || this.selectedSinceMouseDown) {
      return;
    }
    const target = event.target;
    if (target.classList.contains("header") || this.element.classList.contains("read-only") || target.enclosingNodeOrSelfWithClass("ancestor-rule-list")) {
      event.consume();
      return;
    }
    const deepTarget = UI10.UIUtils.deepElementFromEvent(event);
    const treeElement = deepTarget && UI10.TreeOutline.TreeElement.getTreeElementBylistItemNode(deepTarget);
    if (treeElement && treeElement instanceof StylePropertyTreeElement) {
      this.addNewBlankProperty(treeElement.property.index + 1).startEditingName();
    } else if (target.classList.contains("selector-container") || target.classList.contains("styles-section-subtitle")) {
      this.addNewBlankProperty(0).startEditingName();
    } else {
      this.addNewBlankProperty().startEditingName();
    }
    event.consume(true);
  }
  handleQueryRuleClick(query, event) {
    const element = event.currentTarget;
    if (UI10.UIUtils.isBeingEdited(element)) {
      return;
    }
    if (UI10.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event) && this.navigable) {
      const location = query.rawLocation();
      if (!location) {
        event.consume(true);
        return;
      }
      const uiLocation = Bindings3.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().rawLocationToUILocation(location);
      if (uiLocation) {
        void Common4.Revealer.reveal(uiLocation);
      }
      event.consume(true);
      return;
    }
    if (!this.editable) {
      return;
    }
    const config = new UI10.InplaceEditor.Config(this.editingMediaCommitted.bind(this, query), this.editingMediaCancelled.bind(this, element), void 0, this.editingMediaBlurHandler.bind(this));
    UI10.InplaceEditor.InplaceEditor.startEditing(element, config);
    const selection = element.getComponentSelection();
    if (selection) {
      selection.selectAllChildren(element);
    }
    this.parentPane.setEditingStyle(true);
    const parentMediaElement = element.enclosingNodeOrSelfWithClass("query");
    parentMediaElement.classList.add("editing-query");
    event.consume(true);
  }
  editingMediaFinished(element) {
    this.parentPane.setEditingStyle(false);
    const parentMediaElement = element.enclosingNodeOrSelfWithClass("query");
    parentMediaElement.classList.remove("editing-query");
  }
  editingMediaCancelled(element) {
    this.editingMediaFinished(element);
    this.markSelectorMatches();
    const selection = element.getComponentSelection();
    if (selection) {
      selection.collapse(element, 0);
    }
  }
  editingMediaBlurHandler() {
    return true;
  }
  async editingMediaCommitted(query, element, newContent, _oldContent, _context, _moveDirection) {
    this.parentPane.setEditingStyle(false);
    this.editingMediaFinished(element);
    if (newContent) {
      newContent = newContent.trim();
    }
    this.parentPane.setUserOperation(true);
    const cssModel = this.parentPane.cssModel();
    if (cssModel && query.styleSheetId) {
      const range = query.range;
      let success = false;
      if (query instanceof SDK7.CSSContainerQuery.CSSContainerQuery) {
        success = await cssModel.setContainerQueryText(query.styleSheetId, range, newContent);
      } else if (query instanceof SDK7.CSSSupports.CSSSupports) {
        success = await cssModel.setSupportsText(query.styleSheetId, range, newContent);
      } else if (query instanceof SDK7.CSSScope.CSSScope) {
        success = await cssModel.setScopeText(query.styleSheetId, range, newContent);
      } else {
        success = await cssModel.setMediaText(query.styleSheetId, range, newContent);
      }
      if (success) {
        this.matchedStyles.resetActiveProperties();
        this.parentPane.refreshUpdate(this);
      }
      this.parentPane.setUserOperation(false);
      this.editingMediaTextCommittedForTest();
    }
  }
  editingMediaTextCommittedForTest() {
  }
  handleSelectorClick(event) {
    const target = event.target;
    if (!target) {
      return;
    }
    if (UI10.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event) && this.navigable && target.classList.contains("simple-selector")) {
      const selectorIndex = this.elementToSelectorIndex.get(target);
      if (selectorIndex) {
        this.navigateToSelectorSource(selectorIndex, true);
      }
      event.consume(true);
      return;
    }
    if (this.element.hasSelection()) {
      return;
    }
    this.startEditingAtFirstPosition();
    event.consume(true);
  }
  handleContextMenuEvent(event) {
    const target = event.target;
    if (!target) {
      return;
    }
    const contextMenu = new UI10.ContextMenu.ContextMenu(event);
    contextMenu.clipboardSection().appendItem(i18nString6(UIStrings6.copySelector), () => {
      const selectorText = this.headerText();
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(selectorText);
    }, { jslogContext: "copy-selector" });
    contextMenu.clipboardSection().appendItem(i18nString6(UIStrings6.copyRule), () => {
      const ruleText = StylesSidebarPane.formatLeadingProperties(this).ruleText;
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(ruleText);
    }, { jslogContext: "copy-rule" });
    contextMenu.clipboardSection().appendItem(i18nString6(UIStrings6.copyAllDeclarations), () => {
      const allDeclarationText = StylesSidebarPane.formatLeadingProperties(this).allDeclarationText;
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(allDeclarationText);
    }, { jslogContext: "copy-all-declarations" });
    void contextMenu.show();
  }
  navigateToSelectorSource(index, focus2) {
    const cssModel = this.parentPane.cssModel();
    if (!cssModel) {
      return;
    }
    const rule = this.styleInternal.parentRule;
    if (!rule?.header) {
      return;
    }
    const header = cssModel.styleSheetHeaderForId(rule.header.id);
    if (!header) {
      return;
    }
    const rawLocation = new SDK7.CSSModel.CSSLocation(header, rule.lineNumberInSource(index), rule.columnNumberInSource(index));
    _StylePropertiesSection.revealSelectorSource(rawLocation, focus2);
  }
  static revealSelectorSource(rawLocation, focus2) {
    const uiLocation = Bindings3.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().rawLocationToUILocation(rawLocation);
    if (uiLocation) {
      void Common4.Revealer.reveal(uiLocation, !focus2);
    }
  }
  startEditingAtFirstPosition() {
    if (!this.editable) {
      return;
    }
    if (!this.styleInternal.parentRule) {
      this.moveEditorFromSelector("forward");
      return;
    }
    this.startEditingSelector();
  }
  startEditingSelector() {
    const element = this.selectorElement;
    if (UI10.UIUtils.isBeingEdited(element) || this.titleElement.classList.contains("hidden")) {
      return;
    }
    element.scrollIntoViewIfNeeded(false);
    const textContent = element.textContent;
    if (textContent !== null) {
      this.#specificityTooltips.querySelectorAll("devtools-tooltip")?.forEach((tooltip) => tooltip.hidePopover());
      element.textContent = textContent.replace(/\s+/g, " ").trim();
    }
    const config = new UI10.InplaceEditor.Config(this.editingSelectorCommitted.bind(this), this.editingSelectorCancelled.bind(this), void 0);
    UI10.InplaceEditor.InplaceEditor.startEditing(this.selectorElement, config);
    const selection = element.getComponentSelection();
    if (selection) {
      selection.selectAllChildren(element);
    }
    this.parentPane.setEditingStyle(true);
    if (element.classList.contains("simple-selector")) {
      this.navigateToSelectorSource(0, false);
    }
  }
  moveEditorFromSelector(moveDirection) {
    this.markSelectorMatches();
    if (!moveDirection) {
      return;
    }
    if (moveDirection === "forward") {
      const firstChild = this.propertiesTreeOutline.firstChild();
      let currentChild = firstChild;
      while (currentChild?.inherited()) {
        const sibling = currentChild.nextSibling;
        currentChild = sibling instanceof StylePropertyTreeElement ? sibling : null;
      }
      if (!currentChild) {
        this.addNewBlankProperty().startEditingName();
      } else {
        currentChild.startEditingName();
      }
    } else {
      const previousSection = this.previousEditableSibling();
      if (!previousSection) {
        return;
      }
      previousSection.addNewBlankProperty().startEditingName();
    }
  }
  editingSelectorCommitted(_element, newContent, oldContent, _context, moveDirection) {
    this.editingSelectorEnded();
    if (newContent) {
      newContent = newContent.trim();
    }
    if (newContent === oldContent) {
      this.selectorElement.textContent = newContent;
      this.moveEditorFromSelector(moveDirection);
      return;
    }
    const rule = this.styleInternal.parentRule;
    if (!rule) {
      return;
    }
    function headerTextCommitted() {
      this.parentPane.setUserOperation(false);
      this.moveEditorFromSelector(moveDirection);
      this.editingSelectorCommittedForTest();
    }
    this.parentPane.setUserOperation(true);
    void this.setHeaderText(rule, newContent).then(headerTextCommitted.bind(this));
  }
  setHeaderText(rule, newContent) {
    function onSelectorsUpdated(rule2, success) {
      if (!success) {
        return Promise.resolve();
      }
      Badges2.UserBadges.instance().recordAction(Badges2.BadgeAction.CSS_RULE_MODIFIED);
      return this.matchedStyles.recomputeMatchingSelectors(rule2).then(updateSourceRanges.bind(this, rule2));
    }
    function updateSourceRanges(rule2) {
      const doesAffectSelectedNode = this.matchedStyles.getMatchingSelectors(rule2).length > 0;
      this.propertiesTreeOutline.element.classList.toggle("no-affect", !doesAffectSelectedNode);
      this.matchedStyles.resetActiveProperties();
      this.parentPane.refreshUpdate(this);
    }
    if (!(rule instanceof SDK7.CSSRule.CSSStyleRule)) {
      return Promise.resolve();
    }
    const oldSelectorRange = rule.selectorRange();
    if (!oldSelectorRange) {
      return Promise.resolve();
    }
    this.#customHeaderText = void 0;
    return rule.setSelectorText(newContent).then(onSelectorsUpdated.bind(this, rule, Boolean(oldSelectorRange)));
  }
  editingSelectorCommittedForTest() {
  }
  updateRuleOrigin() {
    this.selectorRefElement.removeChildren();
    this.selectorRefElement.appendChild(this.createRuleOriginNode(this.matchedStyles, this.parentPane.linkifier, this.styleInternal.parentRule));
  }
  editingSelectorEnded() {
    this.parentPane.setEditingStyle(false);
  }
  editingSelectorCancelled() {
    this.editingSelectorEnded();
    this.markSelectorMatches();
  }
  /**
   * A property at or near an index and suitable for subsequent editing.
   * Either the last property, if index out-of-upper-bound,
   * or property at index, if such a property exists,
   * or otherwise, null.
   */
  closestPropertyForEditing(propertyIndex) {
    const rootElement = this.propertiesTreeOutline.rootElement();
    if (propertyIndex >= rootElement.childCount()) {
      return rootElement.lastChild();
    }
    return rootElement.childAt(propertyIndex);
  }
};
var BlankStylePropertiesSection = class extends StylePropertiesSection {
  normal;
  ruleLocation;
  styleSheetHeader;
  constructor(stylesPane, matchedStyles, defaultSelectorText, styleSheetHeader, ruleLocation, insertAfterStyle, sectionIdx) {
    const cssModel = stylesPane.cssModel();
    const rule = SDK7.CSSRule.CSSStyleRule.createDummyRule(cssModel, defaultSelectorText);
    super(stylesPane, matchedStyles, rule.style, sectionIdx, null, null);
    this.normal = false;
    this.ruleLocation = ruleLocation;
    this.styleSheetHeader = styleSheetHeader;
    this.selectorRefElement.removeChildren();
    this.selectorRefElement.appendChild(StylePropertiesSection.linkifyRuleLocation(cssModel, this.parentPane.linkifier, styleSheetHeader, this.actualRuleLocation()));
    this.maybeCreateAncestorRules(insertAfterStyle);
    this.element.classList.add("blank-section");
  }
  actualRuleLocation() {
    const prefix = this.rulePrefix();
    const lines = prefix.split("\n");
    const lastLine = lines[lines.length - 1];
    const editRange = new TextUtils3.TextRange.TextRange(0, 0, lines.length - 1, lastLine ? lastLine.length : 0);
    return this.ruleLocation.rebaseAfterTextEdit(TextUtils3.TextRange.TextRange.createFromLocation(0, 0), editRange);
  }
  rulePrefix() {
    return this.ruleLocation.startLine === 0 && this.ruleLocation.startColumn === 0 ? "" : "\n\n";
  }
  get isBlank() {
    return !this.normal;
  }
  editingSelectorCommitted(element, newContent, oldContent, context, moveDirection) {
    if (!this.isBlank) {
      super.editingSelectorCommitted(element, newContent, oldContent, context, moveDirection);
      return;
    }
    function onRuleAdded(newRule) {
      if (!newRule) {
        this.editingSelectorCancelled();
        this.editingSelectorCommittedForTest();
        return Promise.resolve();
      }
      return this.matchedStyles.addNewRule(newRule, this.matchedStyles.node()).then(onAddedToCascade.bind(this, newRule));
    }
    function onAddedToCascade(newRule) {
      const doesSelectorAffectSelectedNode = this.matchedStyles.getMatchingSelectors(newRule).length > 0;
      this.makeNormal(newRule);
      if (!doesSelectorAffectSelectedNode) {
        this.propertiesTreeOutline.element.classList.add("no-affect");
      }
      this.updateRuleOrigin();
      this.parentPane.setUserOperation(false);
      this.editingSelectorEnded();
      if (this.element.parentElement) {
        this.moveEditorFromSelector(moveDirection);
      }
      this.markSelectorMatches();
      this.editingSelectorCommittedForTest();
    }
    if (newContent) {
      newContent = newContent.trim();
    }
    this.parentPane.setUserOperation(true);
    const cssModel = this.parentPane.cssModel();
    const ruleText = this.rulePrefix() + newContent + " {}";
    if (cssModel) {
      void cssModel.addRule(this.styleSheetHeader.id, ruleText, this.ruleLocation).then(onRuleAdded.bind(this));
    }
  }
  editingSelectorCancelled() {
    this.parentPane.setUserOperation(false);
    if (!this.isBlank) {
      super.editingSelectorCancelled();
      return;
    }
    this.editingSelectorEnded();
    this.parentPane.removeSection(this);
  }
  makeNormal(newRule) {
    this.element.classList.remove("blank-section");
    this.styleInternal = newRule.style;
    this.normal = true;
  }
};
var RegisteredPropertiesSection = class extends StylePropertiesSection {
  constructor(stylesPane, matchedStyles, style, sectionIdx, propertyName, expandedByDefault) {
    super(stylesPane, matchedStyles, style, sectionIdx, null, null, propertyName);
    if (!expandedByDefault) {
      this.element.classList.add("hidden");
    }
    this.selectorElement.className = "property-registration-key";
  }
  async setHeaderText(rule, newContent) {
    if (!(rule instanceof SDK7.CSSRule.CSSPropertyRule)) {
      return;
    }
    const oldRange = rule.propertyName().range;
    if (!oldRange) {
      return;
    }
    if (await rule.setPropertyName(newContent)) {
      this.parentPane.forceUpdate();
    }
  }
  createRuleOriginNode(matchedStyles, linkifier, rule) {
    if (rule) {
      return super.createRuleOriginNode(matchedStyles, linkifier, rule);
    }
    return document.createTextNode("CSS.registerProperty");
  }
};
var FunctionRuleSection = class extends StylePropertiesSection {
  constructor(stylesPane, matchedStyles, style, children, sectionIdx, functionName, expandedByDefault) {
    super(stylesPane, matchedStyles, style, sectionIdx, null, null, functionName);
    if (!expandedByDefault) {
      this.element.classList.add("hidden");
    }
    this.selectorElement.className = "function-key";
    this.customPopulateCallback = () => this.addChildren(children, this.propertiesTreeOutline);
    this.onpopulate();
  }
  createConditionElement(condition) {
    if ("media" in condition) {
      return this.createMediaElement(condition.media);
    }
    if ("container" in condition) {
      return this.createContainerQueryElement(condition.container);
    }
    if ("supports" in condition) {
      return this.createSupportsElement(condition.supports);
    }
    return;
  }
  positionNestingElement(element) {
    element.classList.add("css-function-inline-block");
    return this.indentElement(element, this.nestingLevel, true);
  }
  addChildren(children, parent) {
    for (const child of children) {
      if ("style" in child) {
        this.populateStyle(child.style, parent);
      } else if ("children" in child) {
        const conditionElement = this.createConditionElement(child);
        let newParent = parent;
        this.nestingLevel++;
        if (conditionElement) {
          const treeElement = new UI10.TreeOutline.TreeElement();
          treeElement.listItemElement.appendChild(this.positionNestingElement(conditionElement));
          treeElement.setExpandable(true);
          treeElement.setCollapsible(false);
          parent.appendChild(treeElement);
          newParent = treeElement;
        }
        this.addChildren(child.children, newParent);
        if (conditionElement) {
          const treeElement = new UI10.TreeOutline.TreeElement();
          treeElement.listItemElement.appendChild(this.positionNestingElement(this.createClosingBrace()));
          parent.appendChild(treeElement);
        }
        this.nestingLevel--;
      }
    }
  }
};
var AtRuleSection = class extends StylePropertiesSection {
  constructor(stylesPane, matchedStyles, style, sectionIdx, expandedByDefault) {
    super(stylesPane, matchedStyles, style, sectionIdx, null, null);
    this.selectorElement.className = "font-palette-values-key";
    if (!expandedByDefault) {
      this.element.classList.add("hidden");
    }
  }
};
var PositionTryRuleSection = class extends StylePropertiesSection {
  constructor(stylesPane, matchedStyles, style, sectionIdx, active) {
    super(stylesPane, matchedStyles, style, sectionIdx, null, null);
    this.selectorElement.className = "position-try-values-key";
    this.propertiesTreeOutline.element.classList.toggle("no-affect", !active);
  }
};
var KeyframePropertiesSection = class extends StylePropertiesSection {
  constructor(stylesPane, matchedStyles, style, sectionIdx) {
    super(stylesPane, matchedStyles, style, sectionIdx, null, null);
    this.selectorElement.className = "keyframe-key";
  }
  headerText() {
    if (this.styleInternal.parentRule instanceof SDK7.CSSRule.CSSKeyframeRule) {
      return this.styleInternal.parentRule.key().text;
    }
    return "";
  }
  setHeaderText(rule, newContent) {
    function updateSourceRanges(success) {
      if (!success) {
        return;
      }
      this.parentPane.refreshUpdate(this);
    }
    if (!(rule instanceof SDK7.CSSRule.CSSKeyframeRule)) {
      return Promise.resolve();
    }
    const oldRange = rule.key().range;
    if (!oldRange) {
      return Promise.resolve();
    }
    return rule.setKeyText(newContent).then(updateSourceRanges.bind(this));
  }
  isPropertyInherited(_propertyName) {
    return false;
  }
  isPropertyOverloaded(_property) {
    return false;
  }
  markSelectorHighlights() {
  }
  markSelectorMatches() {
    if (this.styleInternal.parentRule instanceof SDK7.CSSRule.CSSKeyframeRule) {
      this.selectorElement.textContent = this.styleInternal.parentRule.key().text;
    }
  }
  highlight() {
  }
};
var HighlightPseudoStylePropertiesSection = class extends StylePropertiesSection {
  isPropertyInherited(_propertyName) {
    return false;
  }
};

// gen/front_end/panels/elements/StylePropertyHighlighter.js
var StylePropertyHighlighter_exports = {};
__export(StylePropertyHighlighter_exports, {
  StylePropertyHighlighter: () => StylePropertyHighlighter
});
import { PanelUtils } from "./../utils/utils.js";
var StylePropertyHighlighter = class {
  styleSidebarPane;
  constructor(ssp) {
    this.styleSidebarPane = ssp;
  }
  /**
   * Expand all shorthands, find the given property, scroll to it and highlight it.
   */
  async highlightProperty(cssProperty) {
    const section3 = this.styleSidebarPane.allSections().find((section4) => section4.style().allProperties().includes(cssProperty));
    if (!section3) {
      return;
    }
    section3.showAllItems();
    const populatePromises = [];
    for (let treeElement2 = section3.propertiesTreeOutline.firstChild(); treeElement2; treeElement2 = treeElement2.nextSibling) {
      populatePromises.push(treeElement2.onpopulate());
    }
    await Promise.all(populatePromises);
    const treeElement = this.findTreeElementFromSection((treeElement2) => treeElement2.property === cssProperty, section3);
    if (treeElement) {
      treeElement.parent?.expand();
      this.scrollAndHighlightTreeElement(treeElement);
      section3.element.focus();
    }
  }
  findAndHighlightSectionBlock(sectionBlockName) {
    const block = this.styleSidebarPane.getSectionBlockByName(sectionBlockName);
    if (!block || block.sections.length === 0) {
      return;
    }
    const [section3] = block.sections;
    section3.showAllItems();
    PanelUtils.highlightElement(block.titleElement());
  }
  findAndHighlightSection(sectionName, blockName) {
    const block = this.styleSidebarPane.getSectionBlockByName(blockName);
    const section3 = block?.sections.find((section4) => section4.headerText() === sectionName);
    if (!section3 || !block) {
      return;
    }
    block.expand(true);
    section3.showAllItems();
    PanelUtils.highlightElement(section3.element);
  }
  /**
   * Find the first non-overridden property that matches the provided name, scroll to it and highlight it.
   */
  findAndHighlightPropertyName(propertyName, sectionName, blockName) {
    const block = blockName ? this.styleSidebarPane.getSectionBlockByName(blockName) : void 0;
    const sections = block?.sections ?? this.styleSidebarPane.allSections();
    if (!sections) {
      return false;
    }
    for (const section3 of sections) {
      if (sectionName && section3.headerText() !== sectionName) {
        continue;
      }
      if (!section3.style().hasActiveProperty(propertyName)) {
        continue;
      }
      block?.expand(true);
      section3.showAllItems();
      const treeElement = this.findTreeElementFromSection((treeElement2) => treeElement2.property.name === propertyName && !treeElement2.overloaded(), section3);
      if (treeElement) {
        this.scrollAndHighlightTreeElement(treeElement);
        section3.element.focus();
        return true;
      }
    }
    return false;
  }
  findTreeElementFromSection(compareCb, section3) {
    let treeElement = section3.propertiesTreeOutline.firstChild();
    while (treeElement && treeElement instanceof StylePropertyTreeElement) {
      if (compareCb(treeElement)) {
        return treeElement;
      }
      treeElement = treeElement.traverseNextTreeElement(false, null, true);
    }
    return null;
  }
  scrollAndHighlightTreeElement(treeElement) {
    PanelUtils.highlightElement(treeElement.listItemElement);
  }
};

// gen/front_end/panels/elements/stylesSidebarPane.css.js
var stylesSidebarPane_css_default = `/**
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.styles-section {
  min-height: 18px;
  white-space: nowrap;
  user-select: text;
  border-bottom: 1px solid var(--sys-color-divider);
  position: relative;
  overflow: hidden;
  padding: 2px 2px 4px 4px;

  &:last-child {
    border-bottom: none;
  }

  &.has-open-popover {
    z-index: 1;
  }

  &.read-only {
    background-color: var(--sys-color-cdt-base-container);
    font-style: italic;
  }

  &:focus-visible,
  &.read-only:focus-visible {
    background-color: var(--sys-color-state-focus-highlight);
  }

  .simple-selector.filter-match {
    background-color: var(--sys-color-tonal-container);
    color: var(--sys-color-on-surface);
  }

  .devtools-link {
    user-select: none;
  }

  .styles-section-subtitle devtools-icon {
    margin-bottom: -4px;
  }

  .styles-section-subtitle .devtools-link {
    color: var(--sys-color-on-surface);
    text-decoration-color: var(--sys-color-neutral-bright);
    outline-offset: 0;
  }

  .selector,
  .try-rule-selector-element,
  .ancestor-rule-list,
  .ancestor-closing-braces {
    color: var(--app-color-element-sidebar-subtitle);
  }

  .ancestor-rule-list,
  .styles-section-title {
    overflow-wrap: break-word;
    white-space: normal;
  }

  .ancestor-rule-list devtools-css-query {
    display: block;
  }

  .simple-selector.selector-matches,
  &.keyframe-key {
    color: var(--sys-color-on-surface);
  }

  .style-properties {
    margin: 0;
    padding: 2px 4px 0 0;
    list-style: none;
    clear: both;
    display: flex;
  }

  &.matched-styles .style-properties {
    padding-left: 0;
  }

  & span.simple-selector:hover {
    text-decoration: var(--override-styles-section-text-hover-text-decoration);
    cursor: var(--override-styles-section-text-hover-cursor);
  }

  &.styles-panel-hovered:not(.read-only),
  &.styles-panel-hovered:not(.read-only) devtools-css-query {
    --override-styles-section-text-hover-text-decoration: underline;
    --override-styles-section-text-hover-cursor: default;
  }
}

.sidebar-pane-closing-brace {
  clear: both;
}

.styles-section-subtitle {
  color: var(--sys-color-on-surface-subtle);
  float: right;
  padding: var(--sys-size-2) var(--sys-size-2) 0 var(--sys-size-8);
  max-width: 100%;
  height: 15px;
  margin-bottom: -1px;
}

.styles-section-subtitle * {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  max-width: 100%;
}

.sidebar-pane-open-brace,
.sidebar-pane-closing-brace {
  color: var(--sys-color-on-surface);
}

@keyframes styles-element-state-pane-slidein {
  from {
    margin-top: -60px;
  }

  to {
    margin-top: 0;
  }
}

@keyframes styles-element-state-pane-slideout {
  from {
    margin-top: 0;
  }

  to {
    margin-top: -60px;
  }
}

.styles-sidebar-toolbar-pane {
  position: relative;
  animation-duration: 0.1s;
  animation-direction: normal;
}

.styles-sidebar-toolbar-pane-container {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.styles-selector {
  cursor: text;
}

/* TODO(changhaohan): restructure this in relation to stylePropertiesTreeOutline.css. */
.styles-clipboard-only {
  display: inline-block;
  width: 0;
  opacity: 0%;
  pointer-events: none;
  white-space: pre;
}

.styles-sidebar-pane-toolbar-container {
  flex-shrink: 0;
  overflow: hidden;
  position: sticky;
  top: 0;
  background-color: var(--sys-color-cdt-base-container);
  z-index: 2;
}

.styles-sidebar-pane-toolbar {
  border-bottom: 1px solid var(--sys-color-divider);
}

.styles-pane-toolbar {
  width: 100%;
}

.font-toolbar-hidden {
  visibility: hidden;
}

.sidebar-separator {
  background-color: var(--sys-color-surface2);
  padding: 0 5px;
  border-bottom: 1px solid var(--sys-color-divider);
  color: var(--sys-color-on-surface-subtle);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  line-height: 22px;

  > span.monospace {
    max-width: 180px;
    display: inline-block;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: middle;
    margin-left: 2px;
  }

  &.layer-separator {
    display: flex;
    align-items: baseline;
  }

  &.empty-section {
    border-bottom: none;
  }
}

.sidebar-pane-section-toolbar {
  position: absolute;
  right: 0;
  bottom: -1px;
  z-index: 0;

  &.new-rule-toolbar {
    visibility: hidden;
    margin-bottom: 5px;

    --toolbar-height: 16px;
  }

  &.shifted-toolbar {
    padding-right: 32px;
  }
}

.styles-pane:not(.is-editing-style)
  .styles-section.matched-styles:not(.read-only):hover
  .sidebar-pane-section-toolbar.new-rule-toolbar {
  visibility: visible;
}

.styles-show-all {
  padding: 4px;
  margin-left: 16px;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: -webkit-fill-available;
}

@media (forced-colors: active) {
  .sidebar-pane-section-toolbar {
    forced-color-adjust: none;
    border: 1px solid ButtonText;
    background-color: ButtonFace;
  }

  .styles-section {
    &:focus-visible,
    &.read-only:focus-visible {
      forced-color-adjust: none;
      background-color: Highlight;
    }

    .styles-section-subtitle {
      .devtools-link {
        color: linktext;
        text-decoration-color: linktext;

        &:focus-visible {
          color: HighlightText;
        }
      }
    }

    &:focus-visible *,
    &.read-only:focus-visible *,
    &:focus-visible .styles-section-subtitle .devtools-link {
      color: HighlightText;
      text-decoration-color: HighlightText;
    }

    &:focus-visible .sidebar-pane-section-toolbar {
      background-color: ButtonFace;
    }

    &:focus-visible {
      --webkit-css-property-color: HighlightText;
    }
  }
}

.spinner::before {
  --dimension: 24px;

  margin-top: 2em;
  left: calc(50% - var(--dimension) / 2);
}

.section-block-expand-icon {
  margin-bottom: -4px;
}

/*# sourceURL=${import.meta.resolve("./stylesSidebarPane.css")} */`;

// gen/front_end/panels/elements/WebCustomData.js
var WebCustomData_exports = {};
__export(WebCustomData_exports, {
  WebCustomData: () => WebCustomData
});
import * as Root3 from "./../../core/root/root.js";
var WebCustomData = class _WebCustomData {
  #data = /* @__PURE__ */ new Map();
  /** The test actually needs to wait for the result */
  fetchPromiseForTest;
  constructor(remoteBase) {
    if (!remoteBase) {
      this.fetchPromiseForTest = Promise.resolve();
      return;
    }
    this.fetchPromiseForTest = fetch(`${remoteBase}third_party/vscode.web-custom-data/browsers.css-data.json`).then((response) => response.json()).then((json) => {
      for (const property of json.properties) {
        this.#data.set(property.name, property);
      }
    }).catch();
  }
  /**
   * Creates a fresh `WebCustomData` instance using the standard
   * DevTools remote base.
   * Throws if no valid remoteBase was found.
   */
  static create() {
    const remoteBase = Root3.Runtime.getRemoteBase();
    return new _WebCustomData(remoteBase?.base ?? "");
  }
  /**
   * Returns the documentation for the CSS property `name` or `undefined` if
   * no such property is documented. Also returns `undefined` if data hasn't
   * finished loading or failed to load.
   */
  findCssProperty(name) {
    return this.#data.get(name);
  }
};

// gen/front_end/panels/elements/StylesSidebarPane.js
var UIStrings7 = {
  /**
   * @description No matches element text content in Styles Sidebar Pane of the Elements panel
   */
  noMatchingSelectorOrStyle: "No matching selector or style",
  /**
   * /**
   * @description Text to announce the result of the filter input in the Styles Sidebar Pane of the Elements panel
   */
  visibleSelectors: "{n, plural, =1 {# visible selector listed below} other {# visible selectors listed below}}",
  /**
   * @description Separator element text content in Styles Sidebar Pane of the Elements panel
   * @example {scrollbar-corner} PH1
   */
  pseudoSElement: "Pseudo ::{PH1} element",
  /**
   * @description Text of a DOM element in Styles Sidebar Pane of the Elements panel
   */
  inheritedFroms: "Inherited from ",
  /**
   * @description Text of an inherited pseudo element in Styles Sidebar Pane of the Elements panel
   * @example {highlight} PH1
   */
  inheritedFromSPseudoOf: "Inherited from ::{PH1} pseudo of ",
  /**
   * @description Title of  in styles sidebar pane of the elements panel
   * @example {Ctrl} PH1
   * @example {Alt} PH2
   */
  incrementdecrementWithMousewheelOne: "Increment/decrement with mousewheel or up/down keys. {PH1}: R \xB11, Shift: G \xB11, {PH2}: B \xB11",
  /**
   * @description Title of  in styles sidebar pane of the elements panel
   * @example {Ctrl} PH1
   * @example {Alt} PH2
   */
  incrementdecrementWithMousewheelHundred: "Increment/decrement with mousewheel or up/down keys. {PH1}: \xB1100, Shift: \xB110, {PH2}: \xB10.1",
  /**
   * @description Tooltip text that appears when hovering over the rendering button in the Styles Sidebar Pane of the Elements panel
   */
  toggleRenderingEmulations: "Toggle common rendering emulations",
  /**
   * @description Rendering emulation option for toggling the automatic dark mode
   */
  automaticDarkMode: "Automatic dark mode",
  /**
   * @description Text displayed on layer separators in the styles sidebar pane.
   */
  layer: "Layer",
  /**
   * @description Tooltip text for the link in the sidebar pane layer separators that reveals the layer in the layer tree view.
   */
  clickToRevealLayer: "Click to reveal layer in layer tree"
};
var str_7 = i18n13.i18n.registerUIStrings("panels/elements/StylesSidebarPane.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
var FILTER_IDLE_PERIOD = 500;
var MIN_FOLDED_SECTIONS_COUNT = 5;
var REGISTERED_PROPERTY_SECTION_NAME = "@property";
var FUNCTION_SECTION_NAME = "@function";
var AT_RULE_SECTION_NAME = "@font-*";
var HIGHLIGHTABLE_PROPERTIES = [
  { mode: "padding", properties: ["padding"] },
  { mode: "border", properties: ["border"] },
  { mode: "margin", properties: ["margin"] },
  { mode: "gap", properties: ["gap", "grid-gap"] },
  { mode: "column-gap", properties: ["column-gap", "grid-column-gap"] },
  { mode: "row-gap", properties: ["row-gap", "grid-row-gap"] },
  { mode: "grid-template-columns", properties: ["grid-template-columns"] },
  { mode: "grid-template-rows", properties: ["grid-template-rows"] },
  { mode: "grid-template-areas", properties: ["grid-areas"] },
  { mode: "justify-content", properties: ["justify-content"] },
  { mode: "align-content", properties: ["align-content"] },
  { mode: "align-items", properties: ["align-items"] },
  { mode: "flexibility", properties: ["flex", "flex-basis", "flex-grow", "flex-shrink"] }
];
var StylesSidebarPane = class _StylesSidebarPane extends Common5.ObjectWrapper.eventMixin(ElementsSidebarPane) {
  matchedStyles = null;
  currentToolbarPane = null;
  animatedToolbarPane = null;
  pendingWidget = null;
  pendingWidgetToggle = null;
  toolbar = null;
  toolbarPaneElement;
  lastFilterChange = null;
  visibleSections = null;
  noMatchesElement;
  sectionsContainer;
  sectionByElement = /* @__PURE__ */ new WeakMap();
  #swatchPopoverHelper = new InlineEditor3.SwatchPopoverHelper.SwatchPopoverHelper();
  linkifier = new Components2.Linkifier.Linkifier(
    MAX_LINK_LENGTH,
    /* useLinkDecorator */
    true
  );
  decorator;
  lastRevealedProperty = null;
  userOperation = false;
  isEditingStyle = false;
  #filterRegex = null;
  isActivePropertyHighlighted = false;
  initialUpdateCompleted = false;
  hasMatchedStyles = false;
  sectionBlocks = [];
  idleCallbackManager = null;
  needsForceUpdate = false;
  resizeThrottler = new Common5.Throttler.Throttler(100);
  resetUpdateThrottler = new Common5.Throttler.Throttler(500);
  computedStyleUpdateThrottler = new Common5.Throttler.Throttler(500);
  scrollerElement;
  boundOnScroll;
  imagePreviewPopover;
  #webCustomData;
  activeCSSAngle = null;
  #updateAbortController;
  #updateComputedStylesAbortController;
  constructor(computedStyleModel) {
    super(
      computedStyleModel,
      true
      /* delegatesFocus */
    );
    this.setMinimumSize(96, 26);
    this.registerRequiredCSS(stylesSidebarPane_css_default);
    Common5.Settings.Settings.instance().moduleSetting("text-editor-indent").addChangeListener(this.update.bind(this));
    this.toolbarPaneElement = this.createStylesSidebarToolbar();
    this.noMatchesElement = this.contentElement.createChild("div", "gray-info-message hidden");
    this.noMatchesElement.textContent = i18nString7(UIStrings7.noMatchingSelectorOrStyle);
    this.sectionsContainer = new UI11.Widget.VBox();
    this.sectionsContainer.show(this.contentElement);
    UI11.ARIAUtils.markAsList(this.sectionsContainer.contentElement);
    this.sectionsContainer.contentElement.addEventListener("keydown", this.sectionsContainerKeyDown.bind(this), false);
    this.sectionsContainer.contentElement.addEventListener("focusin", this.sectionsContainerFocusChanged.bind(this), false);
    this.sectionsContainer.contentElement.addEventListener("focusout", this.sectionsContainerFocusChanged.bind(this), false);
    this.#swatchPopoverHelper.addEventListener("WillShowPopover", this.hideAllPopovers, this);
    this.decorator = new StylePropertyHighlighter(this);
    this.contentElement.classList.add("styles-pane");
    UI11.Context.Context.instance().addFlavorChangeListener(SDK8.DOMModel.DOMNode, this.forceUpdate, this);
    this.contentElement.addEventListener("copy", this.clipboardCopy.bind(this));
    this.boundOnScroll = this.onScroll.bind(this);
    this.imagePreviewPopover = new ImagePreviewPopover(this.contentElement, (event) => {
      const link2 = event.composedPath()[0];
      if (link2 instanceof Element) {
        return link2;
      }
      return null;
    }, () => this.node());
  }
  get webCustomData() {
    if (!this.#webCustomData && Common5.Settings.Settings.instance().moduleSetting("show-css-property-documentation-on-hover").get()) {
      this.#webCustomData = WebCustomData.create();
    }
    return this.#webCustomData;
  }
  onScroll(_event) {
    this.hideAllPopovers();
  }
  swatchPopoverHelper() {
    return this.#swatchPopoverHelper;
  }
  setUserOperation(userOperation) {
    this.userOperation = userOperation;
  }
  static ignoreErrorsForProperty(property) {
    function hasUnknownVendorPrefix(string) {
      return !string.startsWith("-webkit-") && /^[-_][\w\d]+-\w/.test(string);
    }
    const name = property.name.toLowerCase();
    if (name.charAt(0) === "_") {
      return true;
    }
    if (name === "filter") {
      return true;
    }
    if (name.startsWith("scrollbar-")) {
      return true;
    }
    if (hasUnknownVendorPrefix(name)) {
      return true;
    }
    const value5 = property.value.toLowerCase();
    if (value5.endsWith("\\9")) {
      return true;
    }
    if (hasUnknownVendorPrefix(value5)) {
      return true;
    }
    return false;
  }
  static formatLeadingProperties(section3) {
    const selectorText = section3.headerText();
    const indent = Common5.Settings.Settings.instance().moduleSetting("text-editor-indent").get();
    const style = section3.style();
    const lines = [];
    for (const property of style.leadingProperties()) {
      if (property.disabled) {
        lines.push(`${indent}/* ${property.name}: ${property.value}; */`);
      } else {
        lines.push(`${indent}${property.name}: ${property.value};`);
      }
    }
    const allDeclarationText = lines.join("\n");
    const ruleText = `${selectorText} {
${allDeclarationText}
}`;
    return {
      allDeclarationText,
      ruleText
    };
  }
  revealProperty(cssProperty) {
    void this.decorator.highlightProperty(cssProperty);
    this.lastRevealedProperty = cssProperty;
    this.update();
  }
  jumpToProperty(propertyName, sectionName, blockName) {
    return this.decorator.findAndHighlightPropertyName(propertyName, sectionName, blockName);
  }
  jumpToDeclaration(valueSource) {
    if (valueSource.declaration instanceof SDK8.CSSProperty.CSSProperty) {
      this.revealProperty(valueSource.declaration);
    } else {
      this.jumpToProperty("initial-value", valueSource.name, REGISTERED_PROPERTY_SECTION_NAME);
    }
  }
  jumpToSection(sectionName, blockName) {
    this.decorator.findAndHighlightSection(sectionName, blockName);
  }
  jumpToSectionBlock(section3) {
    this.decorator.findAndHighlightSectionBlock(section3);
  }
  jumpToFunctionDefinition(functionName) {
    this.jumpToSection(functionName, FUNCTION_SECTION_NAME);
  }
  jumpToFontPaletteDefinition(paletteName) {
    this.jumpToSection(`@font-palette-values ${paletteName}`, AT_RULE_SECTION_NAME);
  }
  forceUpdate() {
    this.needsForceUpdate = true;
    this.#swatchPopoverHelper.hide();
    this.#updateAbortController?.abort();
    this.resetCache();
    this.update();
  }
  sectionsContainerKeyDown(event) {
    const activeElement = UI11.DOMUtilities.deepActiveElement(this.sectionsContainer.contentElement.ownerDocument);
    if (!activeElement) {
      return;
    }
    const section3 = this.sectionByElement.get(activeElement);
    if (!section3) {
      return;
    }
    let sectionToFocus = null;
    let willIterateForward = false;
    switch (event.key) {
      case "ArrowUp":
      case "ArrowLeft": {
        sectionToFocus = section3.previousSibling() || section3.lastSibling();
        willIterateForward = false;
        break;
      }
      case "ArrowDown":
      case "ArrowRight": {
        sectionToFocus = section3.nextSibling() || section3.firstSibling();
        willIterateForward = true;
        break;
      }
      case "Home": {
        sectionToFocus = section3.firstSibling();
        willIterateForward = true;
        break;
      }
      case "End": {
        sectionToFocus = section3.lastSibling();
        willIterateForward = false;
        break;
      }
    }
    if (sectionToFocus && this.#filterRegex) {
      sectionToFocus = sectionToFocus.findCurrentOrNextVisible(
        /* willIterateForward= */
        willIterateForward
      );
    }
    if (sectionToFocus) {
      sectionToFocus.element.focus();
      event.consume(true);
    }
  }
  sectionsContainerFocusChanged() {
    this.resetFocus();
  }
  resetFocus() {
    if (!this.noMatchesElement.classList.contains("hidden")) {
      return;
    }
    if (this.sectionBlocks[0]?.sections[0]) {
      const firstVisibleSection = this.sectionBlocks[0].sections[0].findCurrentOrNextVisible(
        /* willIterateForward= */
        true
      );
      if (firstVisibleSection) {
        firstVisibleSection.element.tabIndex = this.sectionsContainer.hasFocus() ? -1 : 0;
      }
    }
  }
  onAddButtonLongClick(event) {
    const cssModel = this.cssModel();
    if (!cssModel) {
      return;
    }
    const headers = cssModel.styleSheetHeaders().filter(styleSheetResourceHeader);
    const contextMenuDescriptors = [];
    for (let i = 0; i < headers.length; ++i) {
      const header = headers[i];
      const handler = this.createNewRuleInStyleSheet.bind(this, header);
      contextMenuDescriptors.push({ text: Bindings4.ResourceUtils.displayNameForURL(header.resourceURL()), handler });
    }
    contextMenuDescriptors.sort(compareDescriptors);
    const contextMenu = new UI11.ContextMenu.ContextMenu(event);
    for (let i = 0; i < contextMenuDescriptors.length; ++i) {
      const descriptor = contextMenuDescriptors[i];
      contextMenu.defaultSection().appendItem(descriptor.text, descriptor.handler, { jslogContext: "style-sheet-header" });
    }
    contextMenu.footerSection().appendItem("inspector-stylesheet", this.createNewRuleInViaInspectorStyleSheet.bind(this), { jslogContext: "inspector-stylesheet" });
    void contextMenu.show();
    function compareDescriptors(descriptor1, descriptor2) {
      return Platform5.StringUtilities.naturalOrderComparator(descriptor1.text, descriptor2.text);
    }
    function styleSheetResourceHeader(header) {
      return !header.isViaInspector() && !header.isInline && Boolean(header.resourceURL());
    }
  }
  onFilterChanged(event) {
    const regex = event.data ? new RegExp(Platform5.StringUtilities.escapeForRegExp(event.data), "i") : null;
    this.lastFilterChange = Date.now();
    this.#filterRegex = regex;
    this.updateFilter();
    this.resetFocus();
    setTimeout(() => {
      if (this.lastFilterChange) {
        const stillTyping = Date.now() - this.lastFilterChange < FILTER_IDLE_PERIOD;
        if (!stillTyping) {
          UI11.ARIAUtils.LiveAnnouncer.alert(this.visibleSections ? i18nString7(UIStrings7.visibleSelectors, { n: this.visibleSections }) : i18nString7(UIStrings7.noMatchingSelectorOrStyle));
        }
      }
    }, FILTER_IDLE_PERIOD);
  }
  refreshUpdate(editedSection, editedTreeElement) {
    if (editedTreeElement) {
      for (const section3 of this.allSections()) {
        if (section3 instanceof BlankStylePropertiesSection && section3.isBlank) {
          continue;
        }
        section3.updateVarFunctions(editedTreeElement);
      }
    }
    if (this.isEditingStyle) {
      return;
    }
    const node = this.node();
    if (!node) {
      return;
    }
    for (const section3 of this.allSections()) {
      if (section3 instanceof BlankStylePropertiesSection && section3.isBlank) {
        continue;
      }
      section3.update(section3 === editedSection);
    }
    if (this.#filterRegex) {
      this.updateFilter();
    }
    this.swatchPopoverHelper().reposition();
    this.nodeStylesUpdatedForTest(node, false);
  }
  async doUpdate() {
    this.#updateAbortController?.abort();
    this.#updateAbortController = new AbortController();
    await this.#innerDoUpdate(this.#updateAbortController.signal);
    const scrollerElementLists = this?.contentElement?.enclosingNodeOrSelfWithClass("style-panes-wrapper")?.parentElement?.querySelectorAll(".style-panes-wrapper");
    if (scrollerElementLists.length > 0) {
      for (const element of scrollerElementLists) {
        this.scrollerElement = element;
        this.scrollerElement.addEventListener("scroll", this.boundOnScroll, false);
      }
    }
  }
  async #innerDoUpdate(signal) {
    if (!this.initialUpdateCompleted) {
      window.setTimeout(
        () => {
          if (signal.aborted) {
            return;
          }
          if (!this.initialUpdateCompleted) {
            this.sectionsContainer.contentElement.createChild("span", "spinner");
          }
        },
        200
        /* only spin for loading time > 200ms to avoid unpleasant render flashes */
      );
    }
    const matchedStyles = await this.fetchMatchedCascade();
    if (signal.aborted) {
      return;
    }
    this.matchedStyles = matchedStyles;
    const nodeId = this.node()?.id;
    const parentNodeId = this.matchedStyles?.getParentLayoutNodeId();
    const [computedStyles, parentsComputedStyles] = await Promise.all([this.fetchComputedStylesFor(nodeId), this.fetchComputedStylesFor(parentNodeId)]);
    if (signal.aborted) {
      return;
    }
    await this.innerRebuildUpdate(signal, this.matchedStyles, computedStyles, parentsComputedStyles);
    if (signal.aborted) {
      return;
    }
    if (!this.initialUpdateCompleted) {
      this.initialUpdateCompleted = true;
      this.appendToolbarItem(this.createRenderingShortcuts());
      this.dispatchEventToListeners(
        "InitialUpdateCompleted"
        /* Events.INITIAL_UPDATE_COMPLETED */
      );
    }
    this.nodeStylesUpdatedForTest(this.node(), true);
    this.dispatchEventToListeners("StylesUpdateCompleted", { hasMatchedStyles: this.hasMatchedStyles });
  }
  #getRegisteredPropertyDetails(matchedStyles, variableName) {
    const registration = matchedStyles.getRegisteredProperty(variableName);
    const goToDefinition = () => this.jumpToSection(variableName, REGISTERED_PROPERTY_SECTION_NAME);
    return registration ? { registration, goToDefinition } : void 0;
  }
  getVariableParserError(matchedStyles, variableName) {
    const registrationDetails = this.#getRegisteredPropertyDetails(matchedStyles, variableName);
    return registrationDetails ? new ElementsComponents3.CSSVariableValueView.CSSVariableParserError(registrationDetails) : null;
  }
  getVariablePopoverContents(matchedStyles, variableName, computedValue) {
    return new ElementsComponents3.CSSVariableValueView.CSSVariableValueView({
      variableName,
      value: computedValue ?? void 0,
      details: this.#getRegisteredPropertyDetails(matchedStyles, variableName)
    });
  }
  async fetchComputedStylesFor(nodeId) {
    const node = this.node();
    if (node === null || nodeId === void 0) {
      return null;
    }
    return await node.domModel().cssModel().getComputedStyle(nodeId);
  }
  onResize() {
    void this.resizeThrottler.schedule(this.#resize.bind(this));
  }
  #resize() {
    const width = this.contentElement.getBoundingClientRect().width + "px";
    this.allSections().forEach((section3) => {
      section3.propertiesTreeOutline.element.style.width = width;
    });
    this.hideAllPopovers();
    return Promise.resolve();
  }
  resetCache() {
    const cssModel = this.cssModel();
    if (cssModel) {
      cssModel.discardCachedMatchedCascade();
    }
  }
  fetchMatchedCascade() {
    const node = this.node();
    if (!node || !this.cssModel()) {
      return Promise.resolve(null);
    }
    const cssModel = this.cssModel();
    if (!cssModel) {
      return Promise.resolve(null);
    }
    return cssModel.cachedMatchedCascadeForNode(node).then(validateStyles.bind(this));
    function validateStyles(matchedStyles) {
      return matchedStyles && matchedStyles.node() === this.node() ? matchedStyles : null;
    }
  }
  setEditingStyle(editing) {
    if (this.isEditingStyle === editing) {
      return;
    }
    this.contentElement.classList.toggle("is-editing-style", editing);
    this.isEditingStyle = editing;
    this.setActiveProperty(null);
  }
  setActiveProperty(treeElement) {
    if (this.isActivePropertyHighlighted) {
      SDK8.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
    this.isActivePropertyHighlighted = false;
    if (!this.node()) {
      return;
    }
    if (!treeElement || treeElement.overloaded() || treeElement.inherited()) {
      return;
    }
    const rule = treeElement.property.ownerStyle.parentRule;
    const selectorList = rule instanceof SDK8.CSSRule.CSSStyleRule ? rule.selectorText() : void 0;
    for (const { properties, mode } of HIGHLIGHTABLE_PROPERTIES) {
      if (!properties.includes(treeElement.name)) {
        continue;
      }
      const node = this.node();
      if (!node) {
        continue;
      }
      node.domModel().overlayModel().highlightInOverlay({ node: this.node(), selectorList }, mode);
      this.isActivePropertyHighlighted = true;
      break;
    }
  }
  onCSSModelChanged(event) {
    const edit = event?.data && "edit" in event.data ? event.data.edit : null;
    if (edit) {
      for (const section3 of this.allSections()) {
        section3.styleSheetEdited(edit);
      }
      void this.#refreshComputedStyles();
      return;
    }
    this.#resetUpdateIfNotEditing();
  }
  onComputedStyleChanged() {
    if (!Root4.Runtime.hostConfig.devToolsAnimationStylesInStylesTab?.enabled) {
      return;
    }
    void this.computedStyleUpdateThrottler.schedule(async () => {
      await this.#updateAnimatedStyles();
      this.handledComputedStyleChangedForTest();
    });
  }
  handledComputedStyleChangedForTest() {
  }
  #resetUpdateIfNotEditing() {
    if (this.userOperation || this.isEditingStyle) {
      void this.#refreshComputedStyles();
      return;
    }
    this.resetCache();
    this.update();
  }
  #scheduleResetUpdateIfNotEditing() {
    this.scheduleResetUpdateIfNotEditingCalledForTest();
    void this.resetUpdateThrottler.schedule(async () => {
      this.#resetUpdateIfNotEditing();
    });
  }
  scheduleResetUpdateIfNotEditingCalledForTest() {
  }
  async #updateAnimatedStyles() {
    if (!this.matchedStyles) {
      return;
    }
    const nodeId = this.node()?.id;
    if (!nodeId) {
      return;
    }
    const animatedStyles = await this.cssModel()?.getAnimatedStylesForNode(nodeId);
    if (!animatedStyles) {
      return;
    }
    const updateStyleSection = (currentStyle, newStyle) => {
      if (newStyle) {
        if (currentStyle?.allProperties().length !== newStyle.cssProperties.length) {
          this.#scheduleResetUpdateIfNotEditing();
          return;
        }
        currentStyle.allProperties().forEach((property, index) => {
          const newProperty = newStyle.cssProperties[index];
          if (!newProperty) {
            return;
          }
          property.setLocalValue(newProperty.value);
        });
      } else if (currentStyle) {
        this.#scheduleResetUpdateIfNotEditing();
        return;
      }
    };
    updateStyleSection(this.matchedStyles.transitionsStyle() ?? null, animatedStyles.transitionsStyle ?? null);
    const animationStyles = this.matchedStyles.animationStyles() ?? [];
    const animationStylesPayload = animatedStyles.animationStyles ?? [];
    if (animationStyles.length !== animationStylesPayload.length) {
      this.#scheduleResetUpdateIfNotEditing();
      return;
    }
    for (let i = 0; i < animationStyles.length; i++) {
      const currentAnimationStyle = animationStyles[i];
      const nextAnimationStyle = animationStylesPayload[i].style;
      updateStyleSection(currentAnimationStyle ?? null, nextAnimationStyle);
    }
    const inheritedStyles = this.matchedStyles.inheritedStyles() ?? [];
    const currentInheritedTransitionsStyles = inheritedStyles.filter((style) => style.type === SDK8.CSSStyleDeclaration.Type.Transition);
    const newInheritedTransitionsStyles = animatedStyles.inherited?.map((inherited) => inherited.transitionsStyle).filter((style) => style?.cssProperties.some((cssProperty) => SDK8.CSSMetadata.cssMetadata().isPropertyInherited(cssProperty.name))) ?? [];
    if (currentInheritedTransitionsStyles.length !== newInheritedTransitionsStyles.length) {
      this.#scheduleResetUpdateIfNotEditing();
      return;
    }
    for (let i = 0; i < currentInheritedTransitionsStyles.length; i++) {
      const currentInheritedTransitionsStyle = currentInheritedTransitionsStyles[i];
      const newInheritedTransitionsStyle = newInheritedTransitionsStyles[i];
      updateStyleSection(currentInheritedTransitionsStyle, newInheritedTransitionsStyle ?? null);
    }
    const currentInheritedAnimationsStyles = inheritedStyles.filter((style) => style.type === SDK8.CSSStyleDeclaration.Type.Animation);
    const newInheritedAnimationsStyles = animatedStyles.inherited?.flatMap((inherited) => inherited.animationStyles).filter((animationStyle) => animationStyle?.style.cssProperties.some((cssProperty) => SDK8.CSSMetadata.cssMetadata().isPropertyInherited(cssProperty.name))) ?? [];
    if (currentInheritedAnimationsStyles.length !== newInheritedAnimationsStyles.length) {
      this.#scheduleResetUpdateIfNotEditing();
      return;
    }
    for (let i = 0; i < currentInheritedAnimationsStyles.length; i++) {
      const currentInheritedAnimationsStyle = currentInheritedAnimationsStyles[i];
      const newInheritedAnimationsStyle = newInheritedAnimationsStyles[i]?.style;
      updateStyleSection(currentInheritedAnimationsStyle, newInheritedAnimationsStyle ?? null);
    }
  }
  async #refreshComputedStyles() {
    this.#updateComputedStylesAbortController?.abort();
    this.#updateAbortController = new AbortController();
    const signal = this.#updateAbortController.signal;
    const matchedStyles = await this.fetchMatchedCascade();
    const nodeId = this.node()?.id;
    const parentNodeId = matchedStyles?.getParentLayoutNodeId();
    const [computedStyles, parentsComputedStyles] = await Promise.all([this.fetchComputedStylesFor(nodeId), this.fetchComputedStylesFor(parentNodeId)]);
    if (signal.aborted) {
      return;
    }
    for (const section3 of this.allSections()) {
      section3.setComputedStyles(computedStyles);
      section3.setParentsComputedStyles(parentsComputedStyles);
      section3.updateAuthoringHint();
    }
  }
  focusedSectionIndex() {
    let index = 0;
    for (const block of this.sectionBlocks) {
      for (const section3 of block.sections) {
        if (section3.element.hasFocus()) {
          return index;
        }
        index++;
      }
    }
    return -1;
  }
  continueEditingElement(sectionIndex, propertyIndex) {
    const section3 = this.allSections()[sectionIndex];
    if (section3) {
      const element = section3.closestPropertyForEditing(propertyIndex);
      if (!element) {
        section3.element.focus();
        return;
      }
      element.startEditingName();
    }
  }
  async innerRebuildUpdate(signal, matchedStyles, computedStyles, parentsComputedStyles) {
    if (this.needsForceUpdate) {
      this.needsForceUpdate = false;
    } else if (this.isEditingStyle || this.userOperation) {
      return;
    }
    const focusedIndex = this.focusedSectionIndex();
    this.linkifier.reset();
    const prevSections = this.sectionBlocks.map((block) => block.sections).flat();
    this.sectionBlocks = [];
    const node = this.node();
    this.hasMatchedStyles = matchedStyles !== null && node !== null;
    if (!this.hasMatchedStyles) {
      this.sectionsContainer.contentElement.removeChildren();
      this.sectionsContainer.detachChildWidgets();
      this.noMatchesElement.classList.remove("hidden");
      return;
    }
    const blocks = await this.rebuildSectionsForMatchedStyleRules(matchedStyles, computedStyles, parentsComputedStyles);
    if (signal.aborted) {
      return;
    }
    this.sectionBlocks = blocks;
    const newSections = this.sectionBlocks.map((block) => block.sections).flat();
    const styleEditorWidget = StyleEditorWidget.instance();
    const boundSection = styleEditorWidget.getSection();
    if (boundSection) {
      styleEditorWidget.unbindContext();
      for (const [index2, prevSection] of prevSections.entries()) {
        if (boundSection === prevSection && index2 < newSections.length) {
          styleEditorWidget.bindContext(this, newSections[index2]);
        }
      }
    }
    this.sectionsContainer.contentElement.removeChildren();
    this.sectionsContainer.detachChildWidgets();
    const fragment = document.createDocumentFragment();
    let index = 0;
    let elementToFocus = null;
    for (const block of this.sectionBlocks) {
      const titleElement = block.titleElement();
      if (titleElement) {
        fragment.appendChild(titleElement);
      }
      for (const section3 of block.sections) {
        fragment.appendChild(section3.element);
        if (index === focusedIndex) {
          elementToFocus = section3.element;
        }
        index++;
      }
    }
    this.sectionsContainer.contentElement.appendChild(fragment);
    if (elementToFocus) {
      elementToFocus.focus();
    }
    if (focusedIndex >= index) {
      this.sectionBlocks[0].sections[0].element.focus();
    }
    this.sectionsContainerFocusChanged();
    if (this.#filterRegex) {
      this.updateFilter();
    } else {
      this.noMatchesElement.classList.toggle("hidden", this.sectionBlocks.length > 0);
    }
    if (this.lastRevealedProperty) {
      void this.decorator.highlightProperty(this.lastRevealedProperty);
      this.lastRevealedProperty = null;
    }
    this.swatchPopoverHelper().reposition();
    Host3.userMetrics.panelLoaded("elements", "DevTools.Launch.Elements");
    this.dispatchEventToListeners("StylesUpdateCompleted", { hasMatchedStyles: false });
  }
  nodeStylesUpdatedForTest(_node, _rebuild) {
  }
  setMatchedStylesForTest(matchedStyles) {
    this.matchedStyles = matchedStyles;
  }
  rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, computedStyles, parentsComputedStyles) {
    return this.rebuildSectionsForMatchedStyleRules(matchedStyles, computedStyles, parentsComputedStyles);
  }
  async rebuildSectionsForMatchedStyleRules(matchedStyles, computedStyles, parentsComputedStyles) {
    if (this.idleCallbackManager) {
      this.idleCallbackManager.discard();
    }
    this.idleCallbackManager = new IdleCallbackManager();
    const blocks = [new SectionBlock(null)];
    let sectionIdx = 0;
    let lastParentNode = null;
    let lastLayers = null;
    let sawLayers = false;
    const addLayerSeparator = (style) => {
      const parentRule = style.parentRule;
      if (parentRule instanceof SDK8.CSSRule.CSSStyleRule) {
        const layers = parentRule.layers;
        if ((layers.length || lastLayers) && lastLayers !== layers) {
          const block = SectionBlock.createLayerBlock(parentRule);
          blocks.push(block);
          sawLayers = true;
          lastLayers = layers;
        }
      }
    };
    ButtonProvider.instance().item().setVisible(false);
    for (const style of matchedStyles.nodeStyles()) {
      const parentNode = matchedStyles.isInherited(style) ? matchedStyles.nodeForStyle(style) : null;
      if (parentNode && parentNode !== lastParentNode) {
        lastParentNode = parentNode;
        const block = await SectionBlock.createInheritedNodeBlock(lastParentNode);
        blocks.push(block);
      }
      addLayerSeparator(style);
      const lastBlock = blocks[blocks.length - 1];
      const isTransitionOrAnimationStyle = style.type === SDK8.CSSStyleDeclaration.Type.Transition || style.type === SDK8.CSSStyleDeclaration.Type.Animation;
      if (lastBlock && (!isTransitionOrAnimationStyle || style.allProperties().length > 0)) {
        this.idleCallbackManager.schedule(() => {
          const section3 = new StylePropertiesSection(this, matchedStyles, style, sectionIdx, computedStyles, parentsComputedStyles);
          sectionIdx++;
          lastBlock.sections.push(section3);
        });
      }
    }
    const customHighlightPseudoRulesets = Array.from(matchedStyles.customHighlightPseudoNames()).map((highlightName) => {
      return {
        highlightName,
        pseudoType: "highlight",
        pseudoStyles: matchedStyles.customHighlightPseudoStyles(highlightName)
      };
    });
    const otherPseudoRulesets = [...matchedStyles.pseudoTypes()].map((pseudoType) => {
      return { highlightName: null, pseudoType, pseudoStyles: matchedStyles.pseudoStyles(pseudoType) };
    });
    const pseudoRulesets = customHighlightPseudoRulesets.concat(otherPseudoRulesets).sort((a, b) => {
      if (a.pseudoType === "before" && b.pseudoType !== "before") {
        return -1;
      }
      if (a.pseudoType !== "before" && b.pseudoType === "before") {
        return 1;
      }
      if (a.pseudoType < b.pseudoType) {
        return -1;
      }
      if (a.pseudoType > b.pseudoType) {
        return 1;
      }
      return 0;
    });
    for (const pseudo of pseudoRulesets) {
      lastParentNode = null;
      for (let i = 0; i < pseudo.pseudoStyles.length; ++i) {
        const style = pseudo.pseudoStyles[i];
        const parentNode = matchedStyles.isInherited(style) ? matchedStyles.nodeForStyle(style) : null;
        if (i === 0 || parentNode !== lastParentNode) {
          lastLayers = null;
          if (parentNode) {
            const block = await SectionBlock.createInheritedPseudoTypeBlock(pseudo.pseudoType, pseudo.highlightName, parentNode);
            blocks.push(block);
          } else {
            const block = SectionBlock.createPseudoTypeBlock(pseudo.pseudoType, pseudo.highlightName);
            blocks.push(block);
          }
        }
        lastParentNode = parentNode;
        addLayerSeparator(style);
        const lastBlock = blocks[blocks.length - 1];
        this.idleCallbackManager.schedule(() => {
          const section3 = new HighlightPseudoStylePropertiesSection(this, matchedStyles, style, sectionIdx, computedStyles, parentsComputedStyles);
          sectionIdx++;
          lastBlock.sections.push(section3);
        });
      }
    }
    for (const keyframesRule of matchedStyles.keyframes()) {
      const block = SectionBlock.createKeyframesBlock(keyframesRule.name().text);
      for (const keyframe of keyframesRule.keyframes()) {
        this.idleCallbackManager.schedule(() => {
          block.sections.push(new KeyframePropertiesSection(this, matchedStyles, keyframe.style, sectionIdx));
          sectionIdx++;
        });
      }
      blocks.push(block);
    }
    const atRules = matchedStyles.atRules();
    if (atRules.length > 0) {
      const expandedByDefault = atRules.length <= MIN_FOLDED_SECTIONS_COUNT;
      const block = SectionBlock.createAtRuleBlock(expandedByDefault);
      for (const atRule of atRules) {
        this.idleCallbackManager.schedule(() => {
          block.sections.push(new AtRuleSection(this, matchedStyles, atRule.style, sectionIdx, expandedByDefault));
          sectionIdx++;
        });
      }
      blocks.push(block);
    }
    for (const positionTryRule of matchedStyles.positionTryRules()) {
      const block = SectionBlock.createPositionTryBlock(positionTryRule.name().text);
      this.idleCallbackManager.schedule(() => {
        block.sections.push(new PositionTryRuleSection(this, matchedStyles, positionTryRule.style, sectionIdx, positionTryRule.active()));
        sectionIdx++;
      });
      blocks.push(block);
    }
    if (matchedStyles.registeredProperties().length > 0) {
      const expandedByDefault = matchedStyles.registeredProperties().length <= MIN_FOLDED_SECTIONS_COUNT;
      const block = SectionBlock.createRegisteredPropertiesBlock(expandedByDefault);
      for (const propertyRule of matchedStyles.registeredProperties()) {
        this.idleCallbackManager.schedule(() => {
          block.sections.push(new RegisteredPropertiesSection(this, matchedStyles, propertyRule.style(), sectionIdx, propertyRule.propertyName(), expandedByDefault));
          sectionIdx++;
        });
      }
      blocks.push(block);
    }
    if (matchedStyles.functionRules().length > 0) {
      const expandedByDefault = matchedStyles.functionRules().length <= MIN_FOLDED_SECTIONS_COUNT;
      const block = SectionBlock.createFunctionBlock(expandedByDefault);
      for (const functionRule of matchedStyles.functionRules()) {
        this.idleCallbackManager.schedule(() => {
          block.sections.push(new FunctionRuleSection(this, matchedStyles, functionRule.style, functionRule.children(), sectionIdx, functionRule.nameWithParameters(), expandedByDefault));
          sectionIdx++;
        });
      }
      blocks.push(block);
    }
    if (sawLayers) {
      ButtonProvider.instance().item().setVisible(true);
    } else if (LayersWidget.instance().isShowing()) {
      ElementsPanel.instance().showToolbarPane(null, ButtonProvider.instance().item());
    }
    await this.idleCallbackManager.awaitDone();
    return blocks;
  }
  async createNewRuleInViaInspectorStyleSheet() {
    const cssModel = this.cssModel();
    const node = this.node();
    if (!cssModel || !node) {
      return;
    }
    this.setUserOperation(true);
    const styleSheetHeader = await cssModel.requestViaInspectorStylesheet(node.frameId());
    this.setUserOperation(false);
    await this.createNewRuleInStyleSheet(styleSheetHeader);
  }
  async createNewRuleInStyleSheet(styleSheetHeader) {
    if (!styleSheetHeader) {
      return;
    }
    const contentDataOrError = await styleSheetHeader.requestContentData();
    const lines = TextUtils4.ContentData.ContentData.textOr(contentDataOrError, "").split("\n");
    const range = TextUtils4.TextRange.TextRange.createFromLocation(lines.length - 1, lines[lines.length - 1].length);
    if (this.sectionBlocks && this.sectionBlocks.length > 0) {
      this.addBlankSection(this.sectionBlocks[0].sections[0], styleSheetHeader, range);
    }
  }
  addBlankSection(insertAfterSection, styleSheetHeader, ruleLocation) {
    const node = this.node();
    const blankSection = new BlankStylePropertiesSection(this, insertAfterSection.matchedStyles, node ? node.simpleSelector() : "", styleSheetHeader, ruleLocation, insertAfterSection.style(), 0);
    this.sectionsContainer.contentElement.insertBefore(blankSection.element, insertAfterSection.element.nextSibling);
    for (const block of this.sectionBlocks) {
      const index = block.sections.indexOf(insertAfterSection);
      if (index === -1) {
        continue;
      }
      block.sections.splice(index + 1, 0, blankSection);
      blankSection.startEditingSelector();
    }
    let sectionIdx = 0;
    for (const block of this.sectionBlocks) {
      for (const section3 of block.sections) {
        section3.setSectionIdx(sectionIdx);
        sectionIdx++;
      }
    }
  }
  removeSection(section3) {
    for (const block of this.sectionBlocks) {
      const index = block.sections.indexOf(section3);
      if (index === -1) {
        continue;
      }
      block.sections.splice(index, 1);
      section3.element.remove();
    }
  }
  filterRegex() {
    return this.#filterRegex;
  }
  updateFilter() {
    let hasAnyVisibleBlock = false;
    let visibleSections = 0;
    for (const block of this.sectionBlocks) {
      visibleSections += block.updateFilter();
      hasAnyVisibleBlock = Boolean(visibleSections) || hasAnyVisibleBlock;
    }
    this.noMatchesElement.classList.toggle("hidden", Boolean(hasAnyVisibleBlock));
    this.visibleSections = visibleSections;
  }
  wasShown() {
    UI11.Context.Context.instance().setFlavor(_StylesSidebarPane, this);
    super.wasShown();
  }
  willHide() {
    this.hideAllPopovers();
    super.willHide();
    UI11.Context.Context.instance().setFlavor(_StylesSidebarPane, null);
  }
  hideAllPopovers() {
    this.#swatchPopoverHelper.hide();
    this.imagePreviewPopover.hide();
    if (this.activeCSSAngle) {
      this.activeCSSAngle.minify();
      this.activeCSSAngle = null;
    }
  }
  getSectionBlockByName(name) {
    return this.sectionBlocks.find((block) => block.titleElement()?.textContent === name);
  }
  allSections() {
    let sections = [];
    for (const block of this.sectionBlocks) {
      sections = sections.concat(block.sections);
    }
    return sections;
  }
  clipboardCopy(_event) {
    Host3.userMetrics.actionTaken(Host3.UserMetrics.Action.StyleRuleCopied);
  }
  createStylesSidebarToolbar() {
    const container = this.contentElement.createChild("div", "styles-sidebar-pane-toolbar-container");
    container.role = "toolbar";
    const hbox = container.createChild("div", "hbox styles-sidebar-pane-toolbar");
    const toolbar2 = hbox.createChild("devtools-toolbar", "styles-pane-toolbar");
    toolbar2.role = "presentation";
    const filterInput = new UI11.Toolbar.ToolbarFilter(void 0, 1, 1, void 0, void 0, false);
    filterInput.addEventListener("TextChanged", this.onFilterChanged, this);
    toolbar2.appendToolbarItem(filterInput);
    void toolbar2.appendItemsAtLocation("styles-sidebarpane-toolbar");
    this.toolbar = toolbar2;
    const toolbarPaneContainer = container.createChild("div", "styles-sidebar-toolbar-pane-container");
    const toolbarPaneContent = toolbarPaneContainer.createChild("div", "styles-sidebar-toolbar-pane");
    return toolbarPaneContent;
  }
  showToolbarPane(widget, toggle6) {
    if (this.pendingWidgetToggle) {
      this.pendingWidgetToggle.setToggled(false);
    }
    this.pendingWidgetToggle = toggle6;
    if (this.animatedToolbarPane) {
      this.pendingWidget = widget;
    } else {
      this.startToolbarPaneAnimation(widget);
    }
    if (widget && toggle6) {
      toggle6.setToggled(true);
    }
  }
  appendToolbarItem(item2) {
    if (this.toolbar) {
      this.toolbar.appendToolbarItem(item2);
    }
  }
  startToolbarPaneAnimation(widget) {
    if (widget === this.currentToolbarPane) {
      return;
    }
    if (widget && this.currentToolbarPane) {
      this.currentToolbarPane.detach();
      widget.show(this.toolbarPaneElement);
      this.currentToolbarPane = widget;
      this.currentToolbarPane.focus();
      return;
    }
    this.animatedToolbarPane = widget;
    if (this.currentToolbarPane) {
      this.toolbarPaneElement.style.animationName = "styles-element-state-pane-slideout";
    } else if (widget) {
      this.toolbarPaneElement.style.animationName = "styles-element-state-pane-slidein";
    }
    if (widget) {
      widget.show(this.toolbarPaneElement);
    }
    const listener = onAnimationEnd.bind(this);
    this.toolbarPaneElement.addEventListener("animationend", listener, false);
    function onAnimationEnd() {
      this.toolbarPaneElement.style.removeProperty("animation-name");
      this.toolbarPaneElement.removeEventListener("animationend", listener, false);
      if (this.currentToolbarPane) {
        this.currentToolbarPane.detach();
      }
      this.currentToolbarPane = this.animatedToolbarPane;
      if (this.currentToolbarPane) {
        this.currentToolbarPane.focus();
      }
      this.animatedToolbarPane = null;
      if (this.pendingWidget) {
        this.startToolbarPaneAnimation(this.pendingWidget);
        this.pendingWidget = null;
      }
    }
  }
  createRenderingShortcuts() {
    const prefersColorSchemeSetting = Common5.Settings.Settings.instance().moduleSetting("emulated-css-media-feature-prefers-color-scheme");
    const autoDarkModeSetting = Common5.Settings.Settings.instance().moduleSetting("emulate-auto-dark-mode");
    const decorateStatus = (condition, title) => `${condition ? "\u2713 " : ""}${title}`;
    const button = new UI11.Toolbar.ToolbarToggle(i18nString7(UIStrings7.toggleRenderingEmulations), "brush", "brush-filled", void 0, false);
    button.element.setAttribute("jslog", `${VisualLogging5.dropDown("rendering-emulations").track({ click: true })}`);
    button.element.addEventListener("click", (event) => {
      const boundingRect = button.element.getBoundingClientRect();
      const menu = new UI11.ContextMenu.ContextMenu(event, {
        x: boundingRect.left,
        y: boundingRect.bottom
      });
      const preferredColorScheme = prefersColorSchemeSetting.get();
      const isLightColorScheme = preferredColorScheme === "light";
      const isDarkColorScheme = preferredColorScheme === "dark";
      const isAutoDarkEnabled = autoDarkModeSetting.get();
      const lightColorSchemeOption = decorateStatus(isLightColorScheme, "prefers-color-scheme: light");
      const darkColorSchemeOption = decorateStatus(isDarkColorScheme, "prefers-color-scheme: dark");
      const autoDarkModeOption = decorateStatus(isAutoDarkEnabled, i18nString7(UIStrings7.automaticDarkMode));
      menu.defaultSection().appendItem(lightColorSchemeOption, () => {
        autoDarkModeSetting.set(false);
        prefersColorSchemeSetting.set(isLightColorScheme ? "" : "light");
        button.setToggled(Boolean(prefersColorSchemeSetting.get()));
      }, { jslogContext: "prefer-light-color-scheme" });
      menu.defaultSection().appendItem(darkColorSchemeOption, () => {
        autoDarkModeSetting.set(false);
        prefersColorSchemeSetting.set(isDarkColorScheme ? "" : "dark");
        button.setToggled(Boolean(prefersColorSchemeSetting.get()));
      }, { jslogContext: "prefer-dark-color-scheme" });
      menu.defaultSection().appendItem(autoDarkModeOption, () => {
        autoDarkModeSetting.set(!isAutoDarkEnabled);
        button.setToggled(Boolean(prefersColorSchemeSetting.get()));
      }, { jslogContext: "emulate-auto-dark-mode" });
      void menu.show();
      event.stopPropagation();
    }, { capture: true });
    return button;
  }
};
var MAX_LINK_LENGTH = 23;
var SectionBlock = class _SectionBlock {
  #titleElement;
  sections;
  #expanded = false;
  #icon;
  constructor(titleElement, expandable, expandedByDefault) {
    this.#titleElement = titleElement;
    this.sections = [];
    this.#expanded = expandedByDefault ?? false;
    if (expandable && titleElement instanceof HTMLElement) {
      this.#icon = createIcon3(this.#expanded ? "triangle-down" : "triangle-right", "section-block-expand-icon");
      titleElement.classList.toggle("empty-section", !this.#expanded);
      UI11.ARIAUtils.setExpanded(titleElement, this.#expanded);
      titleElement.appendChild(this.#icon);
      titleElement.tabIndex = -1;
      titleElement.addEventListener("click", () => this.expand(!this.#expanded), false);
    }
  }
  expand(expand2) {
    if (!this.#titleElement || !this.#icon) {
      return;
    }
    this.#titleElement.classList.toggle("empty-section", !expand2);
    this.#icon.name = expand2 ? "triangle-down" : "triangle-right";
    UI11.ARIAUtils.setExpanded(this.#titleElement, expand2);
    this.#expanded = expand2;
    this.sections.forEach((section3) => section3.element.classList.toggle("hidden", !expand2));
  }
  static createPseudoTypeBlock(pseudoType, pseudoArgument) {
    const separatorElement = document.createElement("div");
    separatorElement.className = "sidebar-separator";
    separatorElement.setAttribute("jslog", `${VisualLogging5.sectionHeader("pseudotype")}`);
    const pseudoArgumentString = pseudoArgument ? `(${pseudoArgument})` : "";
    const pseudoTypeString = `${pseudoType}${pseudoArgumentString}`;
    separatorElement.textContent = i18nString7(UIStrings7.pseudoSElement, { PH1: pseudoTypeString });
    return new _SectionBlock(separatorElement);
  }
  static async createInheritedPseudoTypeBlock(pseudoType, pseudoArgument, node) {
    const separatorElement = document.createElement("div");
    separatorElement.className = "sidebar-separator";
    separatorElement.setAttribute("jslog", `${VisualLogging5.sectionHeader("inherited-pseudotype")}`);
    const pseudoArgumentString = pseudoArgument ? `(${pseudoArgument})` : "";
    const pseudoTypeString = `${pseudoType}${pseudoArgumentString}`;
    UI11.UIUtils.createTextChild(separatorElement, i18nString7(UIStrings7.inheritedFromSPseudoOf, { PH1: pseudoTypeString }));
    const link2 = PanelsCommon2.DOMLinkifier.Linkifier.instance().linkify(node, {
      preventKeyboardFocus: true,
      tooltip: void 0
    });
    separatorElement.appendChild(link2);
    return new _SectionBlock(separatorElement);
  }
  static createRegisteredPropertiesBlock(expandedByDefault) {
    const separatorElement = document.createElement("div");
    const block = new _SectionBlock(separatorElement, true, expandedByDefault);
    separatorElement.className = "sidebar-separator";
    separatorElement.appendChild(document.createTextNode(REGISTERED_PROPERTY_SECTION_NAME));
    return block;
  }
  static createFunctionBlock(expandedByDefault) {
    const separatorElement = document.createElement("div");
    const block = new _SectionBlock(separatorElement, true, expandedByDefault);
    separatorElement.className = "sidebar-separator";
    separatorElement.appendChild(document.createTextNode(FUNCTION_SECTION_NAME));
    return block;
  }
  static createKeyframesBlock(keyframesName) {
    const separatorElement = document.createElement("div");
    separatorElement.className = "sidebar-separator";
    separatorElement.setAttribute("jslog", `${VisualLogging5.sectionHeader("keyframes")}`);
    separatorElement.textContent = `@keyframes ${keyframesName}`;
    return new _SectionBlock(separatorElement);
  }
  static createAtRuleBlock(expandedByDefault) {
    const separatorElement = document.createElement("div");
    const block = new _SectionBlock(separatorElement, true, expandedByDefault);
    separatorElement.className = "sidebar-separator";
    separatorElement.appendChild(document.createTextNode(AT_RULE_SECTION_NAME));
    return block;
  }
  static createPositionTryBlock(positionTryName) {
    const separatorElement = document.createElement("div");
    separatorElement.className = "sidebar-separator";
    separatorElement.setAttribute("jslog", `${VisualLogging5.sectionHeader("position-try")}`);
    separatorElement.textContent = `@position-try ${positionTryName}`;
    return new _SectionBlock(separatorElement);
  }
  static async createInheritedNodeBlock(node) {
    const separatorElement = document.createElement("div");
    separatorElement.className = "sidebar-separator";
    separatorElement.setAttribute("jslog", `${VisualLogging5.sectionHeader("inherited")}`);
    UI11.UIUtils.createTextChild(separatorElement, i18nString7(UIStrings7.inheritedFroms));
    const link2 = PanelsCommon2.DOMLinkifier.Linkifier.instance().linkify(node, {
      preventKeyboardFocus: true,
      tooltip: void 0
    });
    separatorElement.appendChild(link2);
    return new _SectionBlock(separatorElement);
  }
  static createLayerBlock(rule) {
    const separatorElement = document.createElement("div");
    separatorElement.className = "sidebar-separator layer-separator";
    separatorElement.setAttribute("jslog", `${VisualLogging5.sectionHeader("layer")}`);
    UI11.UIUtils.createTextChild(separatorElement.createChild("div"), i18nString7(UIStrings7.layer));
    const layers = rule.layers;
    if (!layers.length && rule.origin === "user-agent") {
      const name2 = rule.origin === "user-agent" ? "\xA0user\xA0agent\xA0stylesheet" : "\xA0implicit\xA0outer\xA0layer";
      UI11.UIUtils.createTextChild(separatorElement.createChild("div"), name2);
      return new _SectionBlock(separatorElement);
    }
    const layerLink = separatorElement.createChild("button");
    layerLink.className = "link";
    layerLink.title = i18nString7(UIStrings7.clickToRevealLayer);
    const name = layers.map((layer) => SDK8.CSSModel.CSSModel.readableLayerName(layer.text)).join(".");
    layerLink.textContent = name;
    layerLink.onclick = () => LayersWidget.instance().revealLayer(name);
    return new _SectionBlock(separatorElement);
  }
  updateFilter() {
    let hasAnyVisibleSection = false;
    let numVisibleSections = 0;
    for (const section3 of this.sections) {
      numVisibleSections += section3.updateFilter() ? 1 : 0;
      hasAnyVisibleSection = section3.updateFilter() || hasAnyVisibleSection;
    }
    if (this.#titleElement) {
      this.#titleElement.classList.toggle("hidden", !hasAnyVisibleSection);
    }
    return numVisibleSections;
  }
  titleElement() {
    return this.#titleElement;
  }
};
var IdleCallbackManager = class {
  discarded;
  promises;
  queue;
  constructor() {
    this.discarded = false;
    this.promises = [];
    this.queue = [];
  }
  discard() {
    this.discarded = true;
  }
  schedule(fn) {
    if (this.discarded) {
      return;
    }
    const promise = new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
    });
    this.promises.push(promise);
    this.scheduleIdleCallback(
      /* timeout=*/
      100
    );
  }
  scheduleIdleCallback(timeout) {
    window.requestIdleCallback(() => {
      const next = this.queue.shift();
      assertNotNullOrUndefined(next);
      try {
        if (!this.discarded) {
          next.fn();
        }
        next.resolve();
      } catch (err) {
        next.reject(err);
      }
    }, { timeout });
  }
  awaitDone() {
    return Promise.all(this.promises);
  }
};
function quoteFamilyName(familyName) {
  return `'${familyName.replaceAll("'", "\\'")}'`;
}
var CSSPropertyPrompt = class extends UI11.TextPrompt.TextPrompt {
  isColorAware;
  cssCompletions;
  selectedNodeComputedStyles;
  parentNodeComputedStyles;
  treeElement;
  isEditingName;
  cssVariables;
  constructor(treeElement, isEditingName, completions = []) {
    super();
    this.initialize(this.buildPropertyCompletions.bind(this), UI11.UIUtils.StyleValueDelimiters);
    const cssMetadata = SDK8.CSSMetadata.cssMetadata();
    this.isColorAware = SDK8.CSSMetadata.cssMetadata().isColorAwareProperty(treeElement.property.name);
    this.cssCompletions = [];
    const node = treeElement.node();
    if (isEditingName) {
      this.cssCompletions = cssMetadata.allProperties();
      if (node && !node.isSVGNode()) {
        this.cssCompletions = this.cssCompletions.filter((property) => !cssMetadata.isSVGProperty(property));
      }
    } else {
      this.cssCompletions = [...completions, ...cssMetadata.getPropertyValues(treeElement.property.name)];
      if (node && cssMetadata.isFontFamilyProperty(treeElement.property.name)) {
        const fontFamilies = node.domModel().cssModel().fontFaces().map((font) => quoteFamilyName(font.getFontFamily()));
        this.cssCompletions.unshift(...fontFamilies);
      }
    }
    this.selectedNodeComputedStyles = null;
    this.parentNodeComputedStyles = null;
    this.treeElement = treeElement;
    this.isEditingName = isEditingName;
    this.cssVariables = treeElement.matchedStyles().availableCSSVariables(treeElement.property.ownerStyle);
    if (this.cssVariables.length < 1e3) {
      this.cssVariables.sort(Platform5.StringUtilities.naturalOrderComparator);
    } else {
      this.cssVariables.sort();
    }
    if (!isEditingName) {
      this.disableDefaultSuggestionForEmptyInput();
      if (treeElement?.valueElement) {
        const cssValueText = treeElement.valueElement.textContent;
        const cmdOrCtrl = Host3.Platform.isMac() ? "Cmd" : "Ctrl";
        const optionOrAlt = Host3.Platform.isMac() ? "Option" : "Alt";
        if (cssValueText !== null) {
          if (cssValueText.match(/#[\da-f]{3,6}$/i)) {
            this.setTitle(i18nString7(UIStrings7.incrementdecrementWithMousewheelOne, { PH1: cmdOrCtrl, PH2: optionOrAlt }));
          } else if (cssValueText.match(/\d+/)) {
            this.setTitle(i18nString7(UIStrings7.incrementdecrementWithMousewheelHundred, { PH1: cmdOrCtrl, PH2: optionOrAlt }));
          }
        }
      }
    }
  }
  onKeyDown(event) {
    const keyboardEvent = event;
    switch (keyboardEvent.key) {
      case "ArrowUp":
      case "ArrowDown":
      case "PageUp":
      case "PageDown":
        if (!this.isSuggestBoxVisible() && this.handleNameOrValueUpDown(keyboardEvent)) {
          keyboardEvent.preventDefault();
          return;
        }
        break;
      case "Enter":
        if (keyboardEvent.shiftKey) {
          return;
        }
        this.tabKeyPressed();
        keyboardEvent.preventDefault();
        return;
      case " ":
        if (this.isEditingName) {
          this.tabKeyPressed();
          keyboardEvent.preventDefault();
          return;
        }
    }
    super.onKeyDown(keyboardEvent);
  }
  onMouseWheel(event) {
    if (this.handleNameOrValueUpDown(event)) {
      event.consume(true);
      return;
    }
    super.onMouseWheel(event);
  }
  tabKeyPressed() {
    this.acceptAutoComplete();
    return false;
  }
  handleNameOrValueUpDown(event) {
    function finishHandler(_originalValue, _replacementString) {
      if (this.treeElement.nameElement && this.treeElement.valueElement) {
        void this.treeElement.applyStyleText(this.treeElement.nameElement.textContent + ": " + this.treeElement.valueElement.textContent, false);
      }
    }
    function customNumberHandler(prefix, number, suffix) {
      if (number !== 0 && !suffix.length && SDK8.CSSMetadata.cssMetadata().isLengthProperty(this.treeElement.property.name) && !this.treeElement.property.value.toLowerCase().startsWith("calc(")) {
        suffix = "px";
      }
      return prefix + number + suffix;
    }
    if (!this.isEditingName && this.treeElement.valueElement && UI11.UIUtils.handleElementValueModifications(event, this.treeElement.valueElement, finishHandler.bind(this), this.isValueSuggestion.bind(this), customNumberHandler.bind(this))) {
      return true;
    }
    return false;
  }
  isValueSuggestion(word) {
    if (!word) {
      return false;
    }
    word = word.toLowerCase();
    return this.cssCompletions.indexOf(word) !== -1 || word.startsWith("--");
  }
  async buildPropertyCompletions(expression, query, force) {
    const lowerQuery = query.toLowerCase();
    const editingVariable = !this.isEditingName && expression.trim().endsWith("var(");
    if (!query && !force && !editingVariable && (this.isEditingName || expression)) {
      return await Promise.resolve([]);
    }
    const prefixResults = [];
    const anywhereResults = [];
    if (!editingVariable) {
      this.cssCompletions.forEach((completion) => filterCompletions.call(
        this,
        completion,
        false
        /* variable */
      ));
      if (this.isEditingName) {
        SDK8.CSSMetadata.cssMetadata().aliasesFor().forEach((canonicalProperty, alias) => {
          const index = alias.toLowerCase().indexOf(lowerQuery);
          if (index !== 0) {
            return;
          }
          const aliasResult = {
            text: alias,
            priority: SDK8.CSSMetadata.cssMetadata().propertyUsageWeight(alias),
            isCSSVariableColor: false
          };
          const canonicalPropertyResult = {
            text: canonicalProperty,
            priority: SDK8.CSSMetadata.cssMetadata().propertyUsageWeight(canonicalProperty),
            subtitle: `= ${alias}`,
            // This explains why this canonicalProperty is prompted.
            isCSSVariableColor: false
          };
          prefixResults.push(aliasResult, canonicalPropertyResult);
        });
      }
    }
    const node = this.treeElement.node();
    if (this.isEditingName && node) {
      const nameValuePresets = SDK8.CSSMetadata.cssMetadata().nameValuePresets(node.isSVGNode());
      nameValuePresets.forEach((preset) => filterCompletions.call(
        this,
        preset,
        false,
        true
        /* nameValue */
      ));
    }
    if (this.isEditingName || editingVariable) {
      this.cssVariables.forEach((variable) => filterCompletions.call(
        this,
        variable,
        true
        /* variable */
      ));
    }
    const results = prefixResults.concat(anywhereResults);
    if (!this.isEditingName && !results.length && query.length > 1 && "!important".startsWith(lowerQuery)) {
      results.push({
        text: "!important",
        title: void 0,
        subtitle: void 0,
        priority: void 0,
        isSecondary: void 0,
        subtitleRenderer: void 0,
        selectionRange: void 0,
        hideGhostText: void 0,
        iconElement: void 0
      });
    }
    const userEnteredText = query.replace("-", "");
    if (userEnteredText && userEnteredText === userEnteredText.toUpperCase()) {
      for (let i = 0; i < results.length; ++i) {
        if (!results[i].text.startsWith("--")) {
          results[i].text = results[i].text.toUpperCase();
        }
      }
    }
    for (const result of results) {
      if (editingVariable) {
        result.title = result.text;
        result.text += ")";
        continue;
      }
      const valuePreset = SDK8.CSSMetadata.cssMetadata().getValuePreset(this.treeElement.name, result.text);
      if (!this.isEditingName && valuePreset) {
        result.title = result.text;
        result.text = valuePreset.text;
        result.selectionRange = { startColumn: valuePreset.startColumn, endColumn: valuePreset.endColumn };
      }
    }
    const ensureComputedStyles = async () => {
      if (!node || this.selectedNodeComputedStyles) {
        return;
      }
      this.selectedNodeComputedStyles = await node.domModel().cssModel().getComputedStyle(node.id);
      const parentNode = node.parentNode;
      if (parentNode) {
        this.parentNodeComputedStyles = await parentNode.domModel().cssModel().getComputedStyle(parentNode.id);
      }
    };
    for (const result of results) {
      await ensureComputedStyles();
      const iconInfo = ElementsComponents3.CSSPropertyIconResolver.findIcon(this.isEditingName ? result.text : `${this.treeElement.property.name}: ${result.text}`, this.selectedNodeComputedStyles, this.parentNodeComputedStyles);
      if (!iconInfo) {
        continue;
      }
      const icon = new Icon2();
      icon.name = iconInfo.iconName;
      icon.classList.add("extra-small");
      icon.style.transform = `rotate(${iconInfo.rotate}deg) scale(${iconInfo.scaleX * 1.1}, ${iconInfo.scaleY * 1.1})`;
      icon.style.maxHeight = "var(--sys-size-6)";
      icon.style.maxWidth = "var(--sys-size-6)";
      result.iconElement = icon;
    }
    if (this.isColorAware && !this.isEditingName) {
      results.sort((a, b) => {
        if (a.isCSSVariableColor && b.isCSSVariableColor) {
          return 0;
        }
        return a.isCSSVariableColor ? -1 : 1;
      });
    }
    return await Promise.resolve(results);
    function filterCompletions(completion, variable, nameValue) {
      const index = completion.toLowerCase().indexOf(lowerQuery);
      const result = {
        text: completion,
        title: void 0,
        subtitle: void 0,
        priority: void 0,
        isSecondary: void 0,
        subtitleRenderer: void 0,
        selectionRange: void 0,
        hideGhostText: void 0,
        iconElement: void 0,
        isCSSVariableColor: false
      };
      if (variable) {
        const computedValue = this.treeElement.matchedStyles().computeCSSVariable(this.treeElement.property.ownerStyle, completion);
        if (computedValue) {
          const color = Common5.Color.parse(computedValue.value);
          if (color) {
            result.subtitleRenderer = colorSwatchRenderer.bind(null, color);
            result.isCSSVariableColor = true;
          } else {
            result.subtitleRenderer = computedValueSubtitleRenderer.bind(null, computedValue.value);
          }
        }
      }
      if (nameValue) {
        result.hideGhostText = true;
      }
      if (index === 0) {
        result.priority = this.isEditingName ? SDK8.CSSMetadata.cssMetadata().propertyUsageWeight(completion) : 1;
        prefixResults.push(result);
      } else if (index > -1) {
        anywhereResults.push(result);
      }
    }
    function colorSwatchRenderer(color) {
      const swatch = new InlineEditor3.ColorSwatch.ColorSwatch();
      swatch.color = color;
      swatch.style.pointerEvents = "none";
      return swatch;
    }
    function computedValueSubtitleRenderer(computedValue) {
      const subtitleElement = document.createElement("span");
      subtitleElement.className = "suggestion-subtitle";
      subtitleElement.textContent = `${computedValue}`;
      subtitleElement.style.maxWidth = "100px";
      subtitleElement.title = `${computedValue}`;
      return subtitleElement;
    }
  }
};
function unescapeCssString(input) {
  const reCssEscapeSequence = /(?<!\\)\\(?:([a-fA-F0-9]{1,6})|(.))[\n\t\x20]?/gs;
  return input.replace(reCssEscapeSequence, (_, $1, $2) => {
    if ($2) {
      return $2;
    }
    const codePoint = parseInt($1, 16);
    const isSurrogate = 55296 <= codePoint && codePoint <= 57343;
    if (isSurrogate || codePoint === 0 || codePoint > 1114111) {
      return "\uFFFD";
    }
    return String.fromCodePoint(codePoint);
  });
}
function escapeUrlAsCssComment(urlText) {
  const url = new URL(urlText);
  if (url.search) {
    return `${url.origin}${url.pathname}${url.search.replaceAll("*/", "*%2F")}${url.hash}`;
  }
  return url.toString();
}
var ActionDelegate = class {
  handleAction(_context, actionId) {
    switch (actionId) {
      case "elements.new-style-rule": {
        Host3.userMetrics.actionTaken(Host3.UserMetrics.Action.NewStyleRuleAdded);
        void ElementsPanel.instance().stylesWidget.createNewRuleInViaInspectorStyleSheet();
        return true;
      }
    }
    return false;
  }
};
var buttonProviderInstance2;
var ButtonProvider2 = class _ButtonProvider {
  button;
  constructor() {
    this.button = UI11.Toolbar.Toolbar.createActionButton("elements.new-style-rule");
    this.button.setLongClickable(true);
    new UI11.UIUtils.LongClickController(this.button.element, this.longClicked.bind(this));
    UI11.Context.Context.instance().addFlavorChangeListener(SDK8.DOMModel.DOMNode, onNodeChanged.bind(this));
    onNodeChanged.call(this);
    function onNodeChanged() {
      let node = UI11.Context.Context.instance().flavor(SDK8.DOMModel.DOMNode);
      node = node ? node.enclosingElementOrSelf() : null;
      this.button.setEnabled(Boolean(node));
    }
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!buttonProviderInstance2 || forceNew) {
      buttonProviderInstance2 = new _ButtonProvider();
    }
    return buttonProviderInstance2;
  }
  longClicked(event) {
    ElementsPanel.instance().stylesWidget.onAddButtonLongClick(event);
  }
  item() {
    return this.button;
  }
};

// gen/front_end/panels/elements/PropertyRenderer.js
var UIStrings8 = {
  /**
   * @description Text that is announced by the screen reader when the user focuses on an input field for entering the name of a CSS property in the Styles panel
   * @example {margin} PH1
   */
  cssPropertyName: "`CSS` property name: {PH1}",
  /**
   * @description Text that is announced by the screen reader when the user focuses on an input field for entering the value of a CSS property in the Styles panel
   * @example {10px} PH1
   */
  cssPropertyValue: "`CSS` property value: {PH1}"
};
var str_8 = i18n15.i18n.registerUIStrings("panels/elements/PropertyRenderer.ts", UIStrings8);
var i18nString8 = i18n15.i18n.getLocalizedString.bind(void 0, str_8);
function mergeWithSpacing(nodes, merge) {
  const result = [...nodes];
  if (SDK9.CSSPropertyParser.requiresSpace(nodes, merge)) {
    result.push(document.createTextNode(" "));
  }
  result.push(...merge);
  return result;
}
function rendererBase(matchT) {
  class RendererBase {
    matchType = matchT;
    render(_match, _context) {
      return [];
    }
  }
  return RendererBase;
}
var Highlighting = class _Highlighting {
  static REGISTRY_NAME = "css-value-tracing";
  // This holds a stack of active ranges, the top-stack is the currently highlighted set. mouseenter and mouseleave
  // push and pop range sets, respectively.
  #activeHighlights = [];
  // We hold a bidirectional mapping between nodes and matches. A node can belong to multiple matches when matches are
  // nested (via function arguments for instance).
  #nodesForMatches = /* @__PURE__ */ new Map();
  #matchesForNodes = /* @__PURE__ */ new Map();
  #registry;
  #boundOnEnter;
  #boundOnExit;
  constructor() {
    const registry = CSS.highlights.get(_Highlighting.REGISTRY_NAME);
    this.#registry = registry ?? new Highlight();
    if (!registry) {
      CSS.highlights.set(_Highlighting.REGISTRY_NAME, this.#registry);
    }
    this.#boundOnExit = this.#onExit.bind(this);
    this.#boundOnEnter = this.#onEnter.bind(this);
  }
  addMatch(match, nodes) {
    if (nodes.length > 0) {
      const ranges = this.#nodesForMatches.get(match);
      if (ranges) {
        ranges.push(nodes);
      } else {
        this.#nodesForMatches.set(match, [nodes]);
      }
    }
    for (const node of nodes) {
      const matches = this.#matchesForNodes.get(node);
      if (matches) {
        matches.push(match);
      } else {
        this.#matchesForNodes.set(node, [match]);
      }
      if (node instanceof HTMLElement) {
        node.onmouseenter = this.#boundOnEnter;
        node.onmouseleave = this.#boundOnExit;
        node.onfocus = this.#boundOnEnter;
        node.onblur = this.#boundOnExit;
        node.tabIndex = 0;
      }
    }
  }
  *#nodeRangesHitByMouseEvent(e) {
    for (const node of e.composedPath()) {
      const matches = this.#matchesForNodes.get(node);
      if (matches) {
        for (const match of matches) {
          yield* this.#nodesForMatches.get(match) ?? [];
        }
        break;
      }
    }
  }
  #onEnter(e) {
    this.#registry.clear();
    this.#activeHighlights.push([]);
    for (const nodeRange of this.#nodeRangesHitByMouseEvent(e)) {
      const range = new Range();
      const begin = nodeRange[0];
      const end = nodeRange[nodeRange.length - 1];
      if (begin.parentNode && end.parentNode) {
        range.setStartBefore(begin);
        range.setEndAfter(end);
        this.#activeHighlights[this.#activeHighlights.length - 1].push(range);
        this.#registry.add(range);
      }
    }
  }
  #onExit() {
    this.#registry.clear();
    this.#activeHighlights.pop();
    if (this.#activeHighlights.length > 0) {
      this.#activeHighlights[this.#activeHighlights.length - 1].forEach((range) => this.#registry.add(range));
    }
  }
};
var TracingContext = class _TracingContext {
  #substitutionDepth = 0;
  #hasMoreSubstitutions;
  #parent = null;
  #evaluationCount = 0;
  #appliedEvaluations = 0;
  #hasMoreEvaluations = true;
  #longhandOffset;
  #highlighting;
  #parsedValueCache = /* @__PURE__ */ new Map();
  #root = null;
  #propertyName;
  #asyncEvalCallbacks = [];
  expandPercentagesInShorthands;
  constructor(highlighting, expandPercentagesInShorthands, initialLonghandOffset = 0, matchedResult) {
    this.#highlighting = highlighting;
    this.#hasMoreSubstitutions = matchedResult?.hasMatches(SDK9.CSSPropertyParserMatchers.VariableMatch, SDK9.CSSPropertyParserMatchers.BaseVariableMatch, SDK9.CSSPropertyParserMatchers.AttributeMatch, SDK9.CSSPropertyParserMatchers.EnvFunctionMatch) ?? false;
    this.#propertyName = matchedResult?.ast.propertyName ?? null;
    this.#longhandOffset = initialLonghandOffset;
    this.expandPercentagesInShorthands = expandPercentagesInShorthands;
  }
  get highlighting() {
    return this.#highlighting;
  }
  get root() {
    return this.#root;
  }
  get propertyName() {
    return this.#propertyName;
  }
  get longhandOffset() {
    return this.#longhandOffset;
  }
  renderingContext(context) {
    return new RenderingContext(context.ast, context.property, context.renderers, context.matchedResult, context.cssControls, context.options, this);
  }
  nextSubstitution() {
    if (!this.#hasMoreSubstitutions) {
      return false;
    }
    this.#substitutionDepth++;
    this.#hasMoreSubstitutions = false;
    this.#asyncEvalCallbacks = [];
    return true;
  }
  nextEvaluation() {
    if (this.#hasMoreSubstitutions) {
      throw new Error("Need to apply substitutions first");
    }
    if (!this.#hasMoreEvaluations) {
      return false;
    }
    this.#appliedEvaluations = 0;
    this.#hasMoreEvaluations = false;
    this.#evaluationCount++;
    this.#asyncEvalCallbacks = [];
    return true;
  }
  #setHasMoreEvaluations(value5) {
    if (this.#parent) {
      this.#parent.#setHasMoreEvaluations(value5);
    }
    this.#hasMoreEvaluations = value5;
  }
  // Evaluations are applied bottom up, i.e., innermost sub-expressions are evaluated first before evaluating any
  // function call. This function produces TracingContexts for each of the arguments of the function call which should
  // be passed to the Renderer calls for the respective subtrees.
  evaluation(args, root = null) {
    const childContexts = args.map(() => {
      const child = new _TracingContext(this.#highlighting, this.expandPercentagesInShorthands);
      child.#parent = this;
      child.#substitutionDepth = this.#substitutionDepth;
      child.#evaluationCount = this.#evaluationCount;
      child.#hasMoreSubstitutions = this.#hasMoreSubstitutions;
      child.#parsedValueCache = this.#parsedValueCache;
      child.#root = root;
      child.#propertyName = this.propertyName;
      return child;
    });
    return childContexts;
  }
  #setAppliedEvaluations(value5) {
    if (this.#parent) {
      this.#parent.#setAppliedEvaluations(value5);
    }
    this.#appliedEvaluations = Math.max(this.#appliedEvaluations, value5);
  }
  // After rendering the arguments of a function call, the TracingContext produced by TracingContext#evaluation need to
  // be passed here to determine whether the "current" function call should be evaluated or not. If so, the
  // evaluation callback is run. The callback should return synchronously an array of Nodes as placeholder to be
  // rendered immediately and optionally a callback for asynchronous updates of the placeholder nodes. The callback
  // returns a boolean indicating whether the update was successful or not.
  applyEvaluation(children, evaluation) {
    if (this.#evaluationCount === 0 || children.some((child) => child.#appliedEvaluations >= this.#evaluationCount)) {
      this.#setHasMoreEvaluations(true);
      children.forEach((child) => this.#asyncEvalCallbacks.push(...child.#asyncEvalCallbacks));
      return null;
    }
    this.#setAppliedEvaluations(children.map((child) => child.#appliedEvaluations).reduce((a, b) => Math.max(a, b), 0) + 1);
    const { placeholder, asyncEvalCallback } = evaluation();
    this.#asyncEvalCallbacks.push(asyncEvalCallback);
    return placeholder;
  }
  #setHasMoreSubstitutions() {
    if (this.#parent) {
      this.#parent.#setHasMoreSubstitutions();
    }
    this.#hasMoreSubstitutions = true;
  }
  // Request a tracing context for the next level of substitutions. If this returns null, no further substitution should
  // be applied on this branch of the AST. Otherwise, the TracingContext should be passed to the Renderer call for the
  // substitution subtree.
  substitution(root = null) {
    if (this.#substitutionDepth <= 0) {
      this.#setHasMoreSubstitutions();
      return null;
    }
    const child = new _TracingContext(this.#highlighting, this.expandPercentagesInShorthands);
    child.#parent = this;
    child.#substitutionDepth = this.#substitutionDepth - 1;
    child.#evaluationCount = this.#evaluationCount;
    child.#hasMoreSubstitutions = false;
    child.#parsedValueCache = this.#parsedValueCache;
    child.#root = root;
    child.#asyncEvalCallbacks = this.#asyncEvalCallbacks;
    child.#longhandOffset = this.#longhandOffset + (root?.context.matchedResult.getComputedLonghandName(root?.match.node) ?? 0);
    child.#propertyName = this.propertyName;
    return child;
  }
  cachedParsedValue(declaration, matchedStyles, computedStyles) {
    const cachedValue = this.#parsedValueCache.get(declaration);
    if (cachedValue?.matchedStyles === matchedStyles && cachedValue?.computedStyles === computedStyles) {
      return cachedValue.parsedValue;
    }
    const parsedValue = declaration.parseValue(matchedStyles, computedStyles);
    this.#parsedValueCache.set(declaration, { matchedStyles, computedStyles, parsedValue });
    return parsedValue;
  }
  // If this returns `false`, all evaluations for this trace line have failed.
  async runAsyncEvaluations() {
    const results = await Promise.all(this.#asyncEvalCallbacks.map((callback) => callback?.()));
    return results.some((result) => result !== false);
  }
};
var RenderingContext = class {
  ast;
  property;
  renderers;
  matchedResult;
  cssControls;
  options;
  tracing;
  constructor(ast, property, renderers, matchedResult, cssControls, options = {}, tracing) {
    this.ast = ast;
    this.property = property;
    this.renderers = renderers;
    this.matchedResult = matchedResult;
    this.cssControls = cssControls;
    this.options = options;
    this.tracing = tracing;
  }
  addControl(cssType, control) {
    if (this.cssControls) {
      const controls = this.cssControls.get(cssType);
      if (!controls) {
        this.cssControls.set(cssType, [control]);
      } else {
        controls.push(control);
      }
    }
  }
  getComputedLonghandName(node) {
    if (!this.matchedResult.ast.propertyName) {
      return null;
    }
    const longhands = SDK9.CSSMetadata.cssMetadata().getLonghands(this.tracing?.propertyName ?? this.matchedResult.ast.propertyName);
    if (!longhands) {
      return null;
    }
    const index = this.matchedResult.getComputedLonghandName(node);
    return longhands[index + (this.tracing?.longhandOffset ?? 0)] ?? null;
  }
  findParent(node, matchType) {
    while (node) {
      const match = this.matchedResult.getMatch(node);
      if (match instanceof matchType) {
        return match;
      }
      node = node.parent;
    }
    if (this.tracing?.root) {
      return this.tracing.root.context.findParent(this.tracing.root.match.node, matchType);
    }
    return null;
  }
};
var Renderer = class _Renderer extends SDK9.CSSPropertyParser.TreeWalker {
  #matchedResult;
  #output = [];
  #context;
  constructor(ast, property, renderers, matchedResult, cssControls, options, tracing) {
    super(ast);
    this.#matchedResult = matchedResult;
    this.#context = new RenderingContext(this.ast, property, renderers, this.#matchedResult, cssControls, options, tracing);
  }
  static render(nodeOrNodes, context) {
    if (!Array.isArray(nodeOrNodes)) {
      return this.render([nodeOrNodes], context);
    }
    const cssControls = new SDK9.CSSPropertyParser.CSSControlMap();
    const renderers = nodeOrNodes.map((node) => this.walkExcludingSuccessors(context.ast.subtree(node), context.property, context.renderers, context.matchedResult, cssControls, context.options, context.tracing));
    const nodes = renderers.map((node) => node.#output).reduce(mergeWithSpacing, []);
    return { nodes, cssControls };
  }
  static renderInto(nodeOrNodes, context, parent) {
    const { nodes, cssControls } = this.render(nodeOrNodes, context);
    if (parent.lastChild && SDK9.CSSPropertyParser.requiresSpace([parent.lastChild], nodes)) {
      parent.appendChild(document.createTextNode(" "));
    }
    nodes.map((n) => parent.appendChild(n));
    return { nodes, cssControls };
  }
  renderedMatchForTest(_nodes, _match) {
  }
  enter({ node }) {
    const match = this.#matchedResult.getMatch(node);
    const renderer = match && this.#context.renderers.get(match.constructor);
    if (renderer || match instanceof SDK9.CSSPropertyParserMatchers.TextMatch) {
      const output = renderer ? renderer.render(match, this.#context) : match.render();
      this.#context.tracing?.highlighting.addMatch(match, output);
      this.renderedMatchForTest(output, match);
      this.#output = mergeWithSpacing(this.#output, output);
      return false;
    }
    return true;
  }
  static renderNameElement(name) {
    const nameElement = document.createElement("span");
    nameElement.setAttribute("jslog", `${VisualLogging6.key().track({
      change: true,
      keydown: "ArrowLeft|ArrowUp|PageUp|Home|PageDown|ArrowRight|ArrowDown|End|Space|Tab|Enter|Escape"
    })}`);
    UI12.ARIAUtils.setLabel(nameElement, i18nString8(UIStrings8.cssPropertyName, { PH1: name }));
    nameElement.className = "webkit-css-property";
    nameElement.textContent = name;
    nameElement.normalize();
    nameElement.tabIndex = -1;
    return nameElement;
  }
  // This function renders a property value as HTML, customizing the presentation with a set of given AST matchers. This
  // comprises the following steps:
  // 1. Build an AST of the property.
  // 2. Apply tree matchers during bottom up traversal.
  // 3. Render the value from left to right into HTML, deferring rendering of matched subtrees to the matchers
  //
  // More general, longer matches take precedence over shorter, more specific matches. Whitespaces are normalized, for
  // unmatched text and around rendered matching results.
  static renderValueElement(property, matchedResult, renderers, tracing) {
    const valueElement = document.createElement("span");
    valueElement.setAttribute("jslog", `${VisualLogging6.value().track({
      change: true,
      keydown: "ArrowLeft|ArrowUp|PageUp|Home|PageDown|ArrowRight|ArrowDown|End|Space|Tab|Enter|Escape"
    })}`);
    UI12.ARIAUtils.setLabel(valueElement, i18nString8(UIStrings8.cssPropertyValue, { PH1: property.value }));
    valueElement.className = "value";
    valueElement.tabIndex = -1;
    const { nodes, cssControls } = this.renderValueNodes(property, matchedResult, renderers, tracing);
    nodes.forEach((node) => valueElement.appendChild(node));
    valueElement.normalize();
    return { valueElement, cssControls };
  }
  static renderValueNodes(property, matchedResult, renderers, tracing) {
    if (!matchedResult) {
      return { nodes: [document.createTextNode(property.value)], cssControls: /* @__PURE__ */ new Map() };
    }
    const rendererMap = /* @__PURE__ */ new Map();
    for (const renderer of renderers) {
      rendererMap.set(renderer.matchType, renderer);
    }
    const context = new RenderingContext(matchedResult.ast, property instanceof SDK9.CSSProperty.CSSProperty ? property : null, rendererMap, matchedResult, void 0, {}, tracing);
    return _Renderer.render([matchedResult.ast.tree, ...matchedResult.ast.trailingNodes], context);
  }
};
var URLRenderer = class extends rendererBase(SDK9.CSSPropertyParserMatchers.URLMatch) {
  rule;
  node;
  // clang-format on
  constructor(rule, node) {
    super();
    this.rule = rule;
    this.node = node;
  }
  render(match) {
    const url = unescapeCssString(match.url);
    const container = document.createDocumentFragment();
    UI12.UIUtils.createTextChild(container, "url(");
    let hrefUrl = null;
    if (this.rule?.resourceURL()) {
      hrefUrl = Common6.ParsedURL.ParsedURL.completeURL(this.rule.resourceURL(), url);
    } else if (this.node) {
      hrefUrl = this.node.resolveURL(url);
    }
    const link2 = ImagePreviewPopover.setImageUrl(Components3.Linkifier.Linkifier.linkifyURL(hrefUrl || url, {
      text: url,
      preventClick: false,
      // crbug.com/1027168
      // We rely on CSS text-overflow: ellipsis to hide long URLs in the Style panel,
      // so that we don't have to keep two versions (original vs. trimmed) of URL
      // at the same time, which complicates both StylesSidebarPane and StylePropertyTreeElement.
      bypassURLTrimming: true,
      showColumnNumber: false,
      inlineFrameIndex: 0
    }), hrefUrl || url);
    container.appendChild(link2);
    UI12.UIUtils.createTextChild(container, ")");
    return [container];
  }
};
var StringRenderer = class extends rendererBase(SDK9.CSSPropertyParserMatchers.StringMatch) {
  // clang-format on
  render(match) {
    const element = document.createElement("span");
    element.innerText = match.text;
    UI12.Tooltip.Tooltip.install(element, unescapeCssString(match.text));
    return [element];
  }
};
var BinOpRenderer = class extends rendererBase(SDK9.CSSPropertyParserMatchers.BinOpMatch) {
  // clang-format on
  render(match, context) {
    const [lhs, binop, rhs] = SDK9.CSSPropertyParser.ASTUtils.children(match.node).map((child) => {
      const span = document.createElement("span");
      Renderer.renderInto(child, context, span);
      return span;
    });
    return [lhs, document.createTextNode(" "), binop, document.createTextNode(" "), rhs];
  }
};

// gen/front_end/panels/elements/ComputedStyleWidget.js
var { html: html6 } = Lit5;
var UIStrings9 = {
  /**
   * @description Text for a checkbox setting that controls whether the user-supplied filter text
   * excludes all CSS propreties which are filtered out, or just greys them out. In Computed Style
   * Widget of the Elements panel
   */
  showAll: "Show all",
  /**
   * @description Text for a checkbox setting that controls whether similar CSS properties should be
   * grouped together or not. In Computed Style Widget of the Elements panel.
   */
  group: "Group",
  /**
   * [
   * @description Text shown to the user when a filter is applied to the computed CSS properties, but
   * no properties matched the filter and thus no results were returned.
   */
  noMatchingProperty: "No matching property",
  /**
   * @description Context menu item in Elements panel to navigate to the source code location of the
   * CSS selector that was clicked on.
   */
  navigateToSelectorSource: "Navigate to selector source",
  /**
   * @description Context menu item in Elements panel to navigate to the corresponding CSS style rule
   * for this computed property.
   */
  navigateToStyle: "Navigate to styles",
  /**
   * @description Text announced to screen readers when a filter is applied to the computed styles list, informing them of the filter term and the number of results.
   * @example {example} PH1
   * @example {5} PH2
   */
  filterUpdateAriaText: `Filter applied: {PH1}. Total Results: {PH2}`
};
var str_9 = i18n17.i18n.registerUIStrings("panels/elements/ComputedStyleWidget.ts", UIStrings9);
var i18nString9 = i18n17.i18n.getLocalizedString.bind(void 0, str_9);
var propertyContentsCache = /* @__PURE__ */ new Map();
function matchProperty(name, value5) {
  return SDK10.CSSPropertyParser.matchDeclaration(name, value5, [
    new SDK10.CSSPropertyParserMatchers.ColorMatcher(),
    new SDK10.CSSPropertyParserMatchers.URLMatcher(),
    new SDK10.CSSPropertyParserMatchers.StringMatcher()
  ]);
}
function renderPropertyContents(node, propertyName, propertyValue) {
  const cacheKey = propertyName + ":" + propertyValue;
  const valueFromCache = propertyContentsCache.get(cacheKey);
  if (valueFromCache) {
    return valueFromCache;
  }
  const name = Renderer.renderNameElement(propertyName);
  name.slot = "name";
  const value5 = Renderer.renderValueElement({ name: propertyName, value: propertyValue }, matchProperty(propertyName, propertyValue), [new ColorRenderer2(), new URLRenderer(null, node), new StringRenderer()]).valueElement;
  value5.slot = "value";
  propertyContentsCache.set(cacheKey, { name, value: value5 });
  return { name, value: value5 };
}
var createPropertyElement = (node, propertyName, propertyValue, traceable, inherited, activeProperty, onContextMenu) => {
  const { name, value: value5 } = renderPropertyContents(node, propertyName, propertyValue);
  return html6`<devtools-computed-style-property
        .traceable=${traceable}
        .inherited=${inherited}
        @oncontextmenu=${onContextMenu}
        @onnavigatetosource=${(event) => {
    if (activeProperty) {
      navigateToSource(activeProperty, event);
    }
  }}>
          ${name}
          ${value5}
      </devtools-computed-style-property>`;
};
var createTraceElement = (node, property, isPropertyOverloaded, matchedStyles, linkifier) => {
  const trace = new ElementsComponents4.ComputedStyleTrace.ComputedStyleTrace();
  const { valueElement } = Renderer.renderValueElement(property, matchProperty(property.name, property.value), [new ColorRenderer2(), new URLRenderer(null, node), new StringRenderer()]);
  valueElement.slot = "trace-value";
  trace.appendChild(valueElement);
  const rule = property.ownerStyle.parentRule;
  let ruleOriginNode;
  if (rule) {
    ruleOriginNode = StylePropertiesSection.createRuleOriginNode(matchedStyles, linkifier, rule);
  }
  let selector = "element.style";
  if (rule) {
    selector = rule.selectorText();
  } else if (property.ownerStyle.type === SDK10.CSSStyleDeclaration.Type.Animation) {
    selector = property.ownerStyle.animationName() ? `${property.ownerStyle.animationName()} animation` : "animation style";
  } else if (property.ownerStyle.type === SDK10.CSSStyleDeclaration.Type.Transition) {
    selector = "transitions style";
  }
  trace.data = {
    selector,
    active: !isPropertyOverloaded,
    onNavigateToSource: navigateToSource.bind(null, property),
    ruleOriginNode
  };
  return trace;
};
var ColorRenderer2 = class extends rendererBase(SDK10.CSSPropertyParserMatchers.ColorMatch) {
  // clang-format on
  render(match, context) {
    const color = Common7.Color.parse(match.text);
    if (!color) {
      return [document.createTextNode(match.text)];
    }
    const swatch = new InlineEditor4.ColorSwatch.ColorSwatch();
    swatch.readonly = true;
    swatch.color = color;
    const valueElement = document.createElement("span");
    valueElement.textContent = match.text;
    swatch.addEventListener(InlineEditor4.ColorSwatch.ColorChangedEvent.eventName, (event) => {
      const { data: { color: color2 } } = event;
      valueElement.textContent = color2.getAuthoredText() ?? color2.asString();
    });
    context.addControl("color", swatch);
    return [swatch, valueElement];
  }
  matcher() {
    return new SDK10.CSSPropertyParserMatchers.ColorMatcher();
  }
};
var navigateToSource = (cssProperty, event) => {
  if (!event) {
    return;
  }
  void Common7.Revealer.reveal(cssProperty);
  event.consume(true);
};
var propertySorter = (propA, propB) => {
  if (propA.startsWith("--") !== propB.startsWith("--")) {
    return propA.startsWith("--") ? 1 : -1;
  }
  if (propA.startsWith("-webkit") !== propB.startsWith("-webkit")) {
    return propA.startsWith("-webkit") ? 1 : -1;
  }
  const canonicalA = SDK10.CSSMetadata.cssMetadata().canonicalPropertyName(propA);
  const canonicalB = SDK10.CSSMetadata.cssMetadata().canonicalPropertyName(propB);
  return Platform6.StringUtilities.compare(canonicalA, canonicalB);
};
var ComputedStyleWidget = class _ComputedStyleWidget extends UI13.Widget.VBox {
  computedStyleModel;
  showInheritedComputedStylePropertiesSetting;
  groupComputedStylesSetting;
  input;
  filterRegex;
  noMatchesElement;
  linkifier;
  imagePreviewPopover;
  #computedStylesTree = new TreeOutline6.TreeOutline.TreeOutline();
  #treeData;
  constructor(computedStyleModel) {
    super({ useShadowDom: true });
    this.registerRequiredCSS(computedStyleSidebarPane_css_default);
    this.contentElement.classList.add("styles-sidebar-computed-style-widget");
    this.computedStyleModel = computedStyleModel;
    this.computedStyleModel.addEventListener("CSSModelChanged", this.requestUpdate, this);
    this.computedStyleModel.addEventListener("ComputedStyleChanged", this.requestUpdate, this);
    this.showInheritedComputedStylePropertiesSetting = Common7.Settings.Settings.instance().createSetting("show-inherited-computed-style-properties", false);
    this.showInheritedComputedStylePropertiesSetting.addChangeListener(this.requestUpdate.bind(this));
    this.groupComputedStylesSetting = Common7.Settings.Settings.instance().createSetting("group-computed-styles", false);
    this.groupComputedStylesSetting.addChangeListener(() => {
      this.requestUpdate();
    });
    const hbox = this.contentElement.createChild("div", "hbox styles-sidebar-pane-toolbar");
    const toolbar2 = hbox.createChild("devtools-toolbar", "styles-pane-toolbar");
    const filterInput = new UI13.Toolbar.ToolbarFilter(void 0, 1, 1, void 0, void 0, false);
    filterInput.addEventListener("TextChanged", this.onFilterChanged, this);
    toolbar2.appendToolbarItem(filterInput);
    this.input = filterInput;
    this.filterRegex = null;
    toolbar2.appendToolbarItem(new UI13.Toolbar.ToolbarSettingCheckbox(this.showInheritedComputedStylePropertiesSetting, void 0, i18nString9(UIStrings9.showAll)));
    toolbar2.appendToolbarItem(new UI13.Toolbar.ToolbarSettingCheckbox(this.groupComputedStylesSetting, void 0, i18nString9(UIStrings9.group)));
    this.noMatchesElement = this.contentElement.createChild("div", "gray-info-message");
    this.noMatchesElement.textContent = i18nString9(UIStrings9.noMatchingProperty);
    this.contentElement.appendChild(this.#computedStylesTree);
    this.linkifier = new Components4.Linkifier.Linkifier(maxLinkLength);
    this.imagePreviewPopover = new ImagePreviewPopover(this.contentElement, (event) => {
      const link2 = event.composedPath()[0];
      if (link2 instanceof Element) {
        return link2;
      }
      return null;
    }, () => this.computedStyleModel.node());
    const fontsWidget = new PlatformFontsWidget(this.computedStyleModel);
    fontsWidget.show(this.contentElement);
  }
  onResize() {
    const isNarrow = this.contentElement.offsetWidth < 260;
    this.#computedStylesTree.classList.toggle("computed-narrow", isNarrow);
  }
  wasShown() {
    UI13.Context.Context.instance().setFlavor(_ComputedStyleWidget, this);
    super.wasShown();
  }
  willHide() {
    super.willHide();
    UI13.Context.Context.instance().setFlavor(_ComputedStyleWidget, null);
  }
  async performUpdate() {
    const [nodeStyles, matchedStyles] = await Promise.all([this.computedStyleModel.fetchComputedStyle(), this.fetchMatchedCascade()]);
    if (!nodeStyles || !matchedStyles) {
      this.noMatchesElement.classList.remove("hidden");
      return;
    }
    const shouldGroupComputedStyles = this.groupComputedStylesSetting.get();
    if (shouldGroupComputedStyles) {
      await this.rebuildGroupedList(nodeStyles, matchedStyles);
    } else {
      await this.rebuildAlphabeticalList(nodeStyles, matchedStyles);
    }
  }
  async fetchMatchedCascade() {
    const node = this.computedStyleModel.node();
    if (!node || !this.computedStyleModel.cssModel()) {
      return null;
    }
    const cssModel = this.computedStyleModel.cssModel();
    if (!cssModel) {
      return null;
    }
    return await cssModel.cachedMatchedCascadeForNode(node).then(validateStyles.bind(this));
    function validateStyles(matchedStyles) {
      return matchedStyles && matchedStyles.node() === this.computedStyleModel.node() ? matchedStyles : null;
    }
  }
  async rebuildAlphabeticalList(nodeStyle, matchedStyles) {
    this.imagePreviewPopover.hide();
    this.linkifier.reset();
    const cssModel = this.computedStyleModel.cssModel();
    if (!cssModel) {
      return;
    }
    const uniqueProperties = [...nodeStyle.computedStyle.keys()];
    uniqueProperties.sort(propertySorter);
    const node = nodeStyle.node;
    const propertyTraces = this.computePropertyTraces(matchedStyles);
    const nonInheritedProperties = this.computeNonInheritedProperties(matchedStyles);
    const showInherited = this.showInheritedComputedStylePropertiesSetting.get();
    const tree3 = [];
    for (const propertyName of uniqueProperties) {
      const propertyValue = nodeStyle.computedStyle.get(propertyName) || "";
      const canonicalName = SDK10.CSSMetadata.cssMetadata().canonicalPropertyName(propertyName);
      const isInherited = !nonInheritedProperties.has(canonicalName);
      if (!showInherited && isInherited && !alwaysShownComputedProperties.has(propertyName)) {
        continue;
      }
      if (!showInherited && propertyName.startsWith("--")) {
        continue;
      }
      if (propertyName !== canonicalName && propertyValue === nodeStyle.computedStyle.get(canonicalName)) {
        continue;
      }
      tree3.push(this.buildTreeNode(propertyTraces, propertyName, propertyValue, isInherited));
    }
    const defaultRenderer = this.createTreeNodeRenderer(propertyTraces, node, matchedStyles);
    this.#treeData = {
      tree: tree3,
      compact: true,
      defaultRenderer
    };
    this.filterAlphabeticalList();
  }
  async rebuildGroupedList(nodeStyle, matchedStyles) {
    this.imagePreviewPopover.hide();
    this.linkifier.reset();
    const cssModel = this.computedStyleModel.cssModel();
    if (!nodeStyle || !matchedStyles || !cssModel) {
      this.noMatchesElement.classList.remove("hidden");
      return;
    }
    const node = nodeStyle.node;
    const propertyTraces = this.computePropertyTraces(matchedStyles);
    const nonInheritedProperties = this.computeNonInheritedProperties(matchedStyles);
    const showInherited = this.showInheritedComputedStylePropertiesSetting.get();
    const propertiesByCategory = /* @__PURE__ */ new Map();
    const tree3 = [];
    for (const [propertyName, propertyValue] of nodeStyle.computedStyle) {
      const canonicalName = SDK10.CSSMetadata.cssMetadata().canonicalPropertyName(propertyName);
      const isInherited = !nonInheritedProperties.has(canonicalName);
      if (!showInherited && isInherited && !alwaysShownComputedProperties.has(propertyName)) {
        continue;
      }
      if (!showInherited && propertyName.startsWith("--")) {
        continue;
      }
      if (propertyName !== canonicalName && propertyValue === nodeStyle.computedStyle.get(canonicalName)) {
        continue;
      }
      const categories = categorizePropertyName(propertyName);
      for (const category of categories) {
        if (!propertiesByCategory.has(category)) {
          propertiesByCategory.set(category, []);
        }
        propertiesByCategory.get(category)?.push(propertyName);
      }
    }
    this.#computedStylesTree.removeChildren();
    for (const category of DefaultCategoryOrder) {
      const properties = propertiesByCategory.get(category);
      if (properties && properties.length > 0) {
        const propertyNodes = [];
        for (const propertyName of properties) {
          const propertyValue = nodeStyle.computedStyle.get(propertyName) || "";
          const canonicalName = SDK10.CSSMetadata.cssMetadata().canonicalPropertyName(propertyName);
          const isInherited = !nonInheritedProperties.has(canonicalName);
          propertyNodes.push(this.buildTreeNode(propertyTraces, propertyName, propertyValue, isInherited));
        }
        tree3.push({ id: category, treeNodeData: { tag: "category", name: category }, children: async () => propertyNodes });
      }
    }
    const defaultRenderer = this.createTreeNodeRenderer(propertyTraces, node, matchedStyles);
    this.#treeData = {
      tree: tree3,
      compact: true,
      defaultRenderer
    };
    return await this.filterGroupLists();
  }
  buildTraceNode(property) {
    const rule = property.ownerStyle.parentRule;
    return {
      treeNodeData: {
        tag: "traceElement",
        property,
        rule
      },
      id: (rule?.origin || "") + ": " + property.ownerStyle.styleSheetId + (property.range || property.name)
    };
  }
  createTreeNodeRenderer(propertyTraces, domNode, matchedStyles) {
    return (node) => {
      const data = node.treeNodeData;
      if (data.tag === "property") {
        const trace = propertyTraces.get(data.propertyName);
        const activeProperty = trace?.find(
          (property) => matchedStyles.propertyState(property) === "Active"
          /* SDK.CSSMatchedStyles.PropertyState.ACTIVE */
        );
        const propertyElement = createPropertyElement(domNode, data.propertyName, data.propertyValue, propertyTraces.has(data.propertyName), data.inherited, activeProperty, (event) => {
          if (activeProperty) {
            this.handleContextMenuEvent(matchedStyles, activeProperty, event);
          }
        });
        return propertyElement;
      }
      if (data.tag === "traceElement") {
        const isPropertyOverloaded = matchedStyles.propertyState(data.property) === "Overloaded";
        const traceElement = createTraceElement(domNode, data.property, isPropertyOverloaded, matchedStyles, this.linkifier);
        traceElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this, matchedStyles, data.property));
        return html6`${traceElement}`;
      }
      return html6`<span style="cursor: text; color: var(--sys-color-on-surface-subtle);">${data.name}</span>`;
    };
  }
  buildTreeNode(propertyTraces, propertyName, propertyValue, isInherited) {
    const treeNodeData = {
      tag: "property",
      propertyName,
      propertyValue,
      inherited: isInherited
    };
    const trace = propertyTraces.get(propertyName);
    const jslogContext = propertyName.startsWith("--") ? "custom-property" : propertyName;
    if (!trace) {
      return {
        treeNodeData,
        jslogContext,
        id: propertyName
      };
    }
    return {
      treeNodeData,
      jslogContext,
      id: propertyName,
      children: async () => trace.map(this.buildTraceNode)
    };
  }
  handleContextMenuEvent(matchedStyles, property, event) {
    const contextMenu = new UI13.ContextMenu.ContextMenu(event);
    const rule = property.ownerStyle.parentRule;
    if (rule) {
      const header = rule.header;
      if (header && !header.isAnonymousInlineStyleSheet()) {
        contextMenu.defaultSection().appendItem(i18nString9(UIStrings9.navigateToSelectorSource), () => {
          StylePropertiesSection.tryNavigateToRuleLocation(matchedStyles, rule);
        }, { jslogContext: "navigate-to-selector-source" });
      }
    }
    contextMenu.defaultSection().appendItem(i18nString9(UIStrings9.navigateToStyle), () => Common7.Revealer.reveal(property), { jslogContext: "navigate-to-style" });
    void contextMenu.show();
  }
  computePropertyTraces(matchedStyles) {
    const result = /* @__PURE__ */ new Map();
    for (const style of matchedStyles.nodeStyles()) {
      const allProperties = style.allProperties();
      for (const property of allProperties) {
        if (!property.activeInStyle() || !matchedStyles.propertyState(property)) {
          continue;
        }
        if (!result.has(property.name)) {
          result.set(property.name, []);
        }
        result.get(property.name).push(property);
      }
    }
    return result;
  }
  computeNonInheritedProperties(matchedStyles) {
    const result = /* @__PURE__ */ new Set();
    for (const style of matchedStyles.nodeStyles()) {
      for (const property of style.allProperties()) {
        if (!matchedStyles.propertyState(property)) {
          continue;
        }
        result.add(SDK10.CSSMetadata.cssMetadata().canonicalPropertyName(property.name));
      }
    }
    return result;
  }
  async onFilterChanged(event) {
    await this.filterComputedStyles(event.data ? new RegExp(Platform6.StringUtilities.escapeForRegExp(event.data), "i") : null);
    if (event.data && this.#computedStylesTree.data && this.#computedStylesTree.data.tree) {
      UI13.ARIAUtils.LiveAnnouncer.alert(i18nString9(UIStrings9.filterUpdateAriaText, { PH1: event.data, PH2: this.#computedStylesTree.data.tree.length }));
    }
  }
  async filterComputedStyles(regex) {
    this.filterRegex = regex;
    if (this.groupComputedStylesSetting.get()) {
      return await this.filterGroupLists();
    }
    return this.filterAlphabeticalList();
  }
  nodeFilter(node) {
    const regex = this.filterRegex;
    const data = node.treeNodeData;
    if (data.tag === "property") {
      const matched = !regex || regex.test(data.propertyName) || regex.test(data.propertyValue);
      return matched;
    }
    return true;
  }
  filterAlphabeticalList() {
    if (!this.#treeData) {
      return;
    }
    const tree3 = this.#treeData.tree.filter(this.nodeFilter.bind(this));
    this.#computedStylesTree.data = {
      tree: tree3,
      defaultRenderer: this.#treeData.defaultRenderer,
      compact: this.#treeData.compact
    };
    this.noMatchesElement.classList.toggle("hidden", Boolean(tree3.length));
  }
  async filterGroupLists() {
    if (!this.#treeData) {
      return;
    }
    const tree3 = [];
    for (const group of this.#treeData.tree) {
      const data = group.treeNodeData;
      if (data.tag !== "category" || !group.children) {
        continue;
      }
      const properties = await group.children();
      const filteredChildren = properties.filter(this.nodeFilter.bind(this));
      if (filteredChildren.length) {
        tree3.push({ id: data.name, treeNodeData: { tag: "category", name: data.name }, children: async () => filteredChildren });
      }
    }
    this.#computedStylesTree.data = {
      tree: tree3,
      defaultRenderer: this.#treeData.defaultRenderer,
      compact: this.#treeData.compact
    };
    await this.#computedStylesTree.expandRecursively(0);
    this.noMatchesElement.classList.toggle("hidden", Boolean(tree3.length));
  }
};
var maxLinkLength = 30;
var alwaysShownComputedProperties = /* @__PURE__ */ new Set(["display", "height", "width"]);

// gen/front_end/panels/elements/ComputedStyleModel.js
var ComputedStyleModel = class extends Common8.ObjectWrapper.ObjectWrapper {
  #node;
  #cssModel;
  eventListeners;
  frameResizedTimer;
  computedStylePromise;
  currentTrackedNodeId;
  constructor() {
    super();
    this.#cssModel = null;
    this.eventListeners = [];
    this.#node = UI14.Context.Context.instance().flavor(SDK11.DOMModel.DOMNode);
    UI14.Context.Context.instance().addFlavorChangeListener(SDK11.DOMModel.DOMNode, this.onNodeChanged, this);
    UI14.Context.Context.instance().addFlavorChangeListener(StylesSidebarPane, this.evaluateTrackingComputedStyleUpdatesForNode, this);
    UI14.Context.Context.instance().addFlavorChangeListener(ComputedStyleWidget, this.evaluateTrackingComputedStyleUpdatesForNode, this);
  }
  dispose() {
    UI14.Context.Context.instance().removeFlavorChangeListener(SDK11.DOMModel.DOMNode, this.onNodeChanged, this);
    UI14.Context.Context.instance().removeFlavorChangeListener(StylesSidebarPane, this.evaluateTrackingComputedStyleUpdatesForNode, this);
    UI14.Context.Context.instance().removeFlavorChangeListener(ComputedStyleWidget, this.evaluateTrackingComputedStyleUpdatesForNode, this);
  }
  node() {
    return this.#node;
  }
  cssModel() {
    return this.#cssModel?.isEnabled() ? this.#cssModel : null;
  }
  // This is a debounced method because the user might be navigated from Styles tab to Computed Style tab and vice versa.
  // For that case, we want to only run this function once.
  evaluateTrackingComputedStyleUpdatesForNode = Common8.Debouncer.debounce(() => {
    if (!this.#node) {
      if (this.currentTrackedNodeId) {
        void this.cssModel()?.trackComputedStyleUpdatesForNode(void 0);
        this.currentTrackedNodeId = void 0;
      }
      return;
    }
    const isComputedStyleWidgetVisible = Boolean(UI14.Context.Context.instance().flavor(ComputedStyleWidget));
    const isStylesTabVisible = Boolean(UI14.Context.Context.instance().flavor(StylesSidebarPane));
    const shouldTrackComputedStyleUpdates = isComputedStyleWidgetVisible || isStylesTabVisible && Root5.Runtime.hostConfig.devToolsAnimationStylesInStylesTab?.enabled;
    if (!shouldTrackComputedStyleUpdates) {
      if (this.currentTrackedNodeId) {
        void this.cssModel()?.trackComputedStyleUpdatesForNode(void 0);
        this.currentTrackedNodeId = void 0;
      }
      return;
    }
    if (this.currentTrackedNodeId !== this.#node.id) {
      void this.cssModel()?.trackComputedStyleUpdatesForNode(this.#node.id);
      this.currentTrackedNodeId = this.#node.id;
    }
  }, 100);
  onNodeChanged(event) {
    this.#node = event.data;
    this.updateModel(this.#node ? this.#node.domModel().cssModel() : null);
    this.onCSSModelChanged(null);
    this.evaluateTrackingComputedStyleUpdatesForNode();
  }
  updateModel(cssModel) {
    if (this.#cssModel === cssModel) {
      return;
    }
    Common8.EventTarget.removeEventListeners(this.eventListeners);
    this.#cssModel = cssModel;
    const domModel = cssModel ? cssModel.domModel() : null;
    const resourceTreeModel = cssModel ? cssModel.target().model(SDK11.ResourceTreeModel.ResourceTreeModel) : null;
    if (cssModel && domModel && resourceTreeModel) {
      this.eventListeners = [
        cssModel.addEventListener(SDK11.CSSModel.Events.StyleSheetAdded, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK11.CSSModel.Events.StyleSheetRemoved, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK11.CSSModel.Events.StyleSheetChanged, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK11.CSSModel.Events.FontsUpdated, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK11.CSSModel.Events.MediaQueryResultChanged, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK11.CSSModel.Events.PseudoStateForced, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK11.CSSModel.Events.StartingStylesStateForced, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK11.CSSModel.Events.ModelWasEnabled, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK11.CSSModel.Events.ComputedStyleUpdated, this.onComputedStyleChanged, this),
        domModel.addEventListener(SDK11.DOMModel.Events.DOMMutated, this.onDOMModelChanged, this),
        resourceTreeModel.addEventListener(SDK11.ResourceTreeModel.Events.FrameResized, this.onFrameResized, this)
      ];
    }
  }
  onCSSModelChanged(event) {
    delete this.computedStylePromise;
    this.dispatchEventToListeners("CSSModelChanged", event?.data ?? null);
  }
  onComputedStyleChanged(event) {
    delete this.computedStylePromise;
    if (event?.data && "nodeId" in event.data && event.data.nodeId !== this.#node?.id) {
      return;
    }
    this.dispatchEventToListeners(
      "ComputedStyleChanged"
      /* Events.COMPUTED_STYLE_CHANGED */
    );
  }
  onDOMModelChanged(event) {
    const node = event.data;
    if (!this.#node || this.#node !== node && node.parentNode !== this.#node.parentNode && !node.isAncestor(this.#node)) {
      return;
    }
    this.onCSSModelChanged(null);
  }
  onFrameResized() {
    function refreshContents() {
      this.onCSSModelChanged(null);
      delete this.frameResizedTimer;
    }
    if (this.frameResizedTimer) {
      clearTimeout(this.frameResizedTimer);
    }
    this.frameResizedTimer = window.setTimeout(refreshContents.bind(this), 100);
  }
  elementNode() {
    const node = this.node();
    if (!node) {
      return null;
    }
    return node.enclosingElementOrSelf();
  }
  async fetchComputedStyle() {
    const elementNode = this.elementNode();
    const cssModel = this.cssModel();
    if (!elementNode || !cssModel) {
      return null;
    }
    const nodeId = elementNode.id;
    if (!nodeId) {
      return null;
    }
    if (!this.computedStylePromise) {
      this.computedStylePromise = cssModel.getComputedStyle(nodeId).then(verifyOutdated.bind(this, elementNode));
    }
    return await this.computedStylePromise;
    function verifyOutdated(elementNode2, style) {
      return elementNode2 === this.elementNode() && style ? new ComputedStyle(elementNode2, style) : null;
    }
  }
};
var ComputedStyle = class {
  node;
  computedStyle;
  constructor(node, computedStyle) {
    this.node = node;
    this.computedStyle = computedStyle;
  }
};

// gen/front_end/panels/elements/elementsPanel.css.js
var elementsPanel_css_default = `/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#main-content {
  position: relative;
  flex: 1 1;
}

#elements-content {
  overflow: auto;
  padding: 2px 0 0;
  height: 100%;
}

.style-panes-wrapper {
  overflow: hidden scroll;
  background-color: var(--sys-color-cdt-base-container);

  & > div:not(:last-child) {
    border-bottom: 1px solid var(--sys-color-divider);
  }
}

#elements-content:not(.elements-wrap) > div {
  display: inline-block;
  min-width: 100%;
}

#elements-crumbs {
  background-color: var(--sys-color-cdt-base-container);
  border-top: 1px solid var(--sys-color-divider);
  overflow: hidden;
  width: 100%;
}

devtools-adorner-settings-pane {
  margin-bottom: 10px;
  border-bottom: 1px solid var(--sys-color-divider);
  overflow: auto;
}

devtools-tree-outline {
  overflow: auto;
}

.axtree-button {
  position: absolute;
  top: var(--sys-size-8);
  right: var(--sys-size-9);
  background-color: var(--sys-color-cdt-base-container);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
  border-radius: var(--sys-shape-corner-full);
  box-shadow: var(--sys-elevation-level1);
}

/*# sourceURL=${import.meta.resolve("./elementsPanel.css")} */`;

// gen/front_end/panels/elements/ElementsTreeOutline.js
var ElementsTreeOutline_exports = {};
__export(ElementsTreeOutline_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW4,
  DOMTreeWidget: () => DOMTreeWidget,
  ElementsTreeOutline: () => ElementsTreeOutline,
  MappedCharToEntity: () => MappedCharToEntity
});
import * as Common11 from "./../../core/common/common.js";
import * as i18n27 from "./../../core/i18n/i18n.js";
import * as SDK16 from "./../../core/sdk/sdk.js";
import * as Badges4 from "./../../models/badges/badges.js";
import * as Elements from "./../../models/elements/elements.js";
import * as IssuesManager2 from "./../../models/issues_manager/issues_manager.js";
import * as CodeHighlighter5 from "./../../ui/components/code_highlighter/code_highlighter.js";
import * as Highlighting3 from "./../../ui/components/highlighting/highlighting.js";
import * as IssueCounter from "./../../ui/components/issue_counter/issue_counter.js";
import * as UI19 from "./../../ui/legacy/legacy.js";
import { html as html9, nothing as nothing3, render as render6 } from "./../../ui/lit/lit.js";
import * as VisualLogging9 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/AdoptedStyleSheetTreeElement.js
import * as SDK12 from "./../../core/sdk/sdk.js";
import * as TextUtils5 from "./../../models/text_utils/text_utils.js";
import * as CodeHighlighter from "./../../ui/components/code_highlighter/code_highlighter.js";
import * as Components5 from "./../../ui/legacy/components/utils/utils.js";
import * as UI15 from "./../../ui/legacy/legacy.js";
import * as VisualLogging7 from "./../../ui/visual_logging/visual_logging.js";
var AdoptedStyleSheetTreeElement = class _AdoptedStyleSheetTreeElement extends UI15.TreeOutline.TreeElement {
  adoptedStyleSheet;
  eventListener = null;
  constructor(adoptedStyleSheet) {
    super("");
    this.adoptedStyleSheet = adoptedStyleSheet;
    const header = adoptedStyleSheet.cssModel.styleSheetHeaderForId(adoptedStyleSheet.id);
    if (header) {
      _AdoptedStyleSheetTreeElement.createContents(header, this);
    } else {
      this.eventListener = adoptedStyleSheet.cssModel.addEventListener(SDK12.CSSModel.Events.StyleSheetAdded, this.onStyleSheetAdded, this);
    }
  }
  onStyleSheetAdded({ data: header }) {
    if (header.id === this.adoptedStyleSheet.id) {
      _AdoptedStyleSheetTreeElement.createContents(header, this);
      this.adoptedStyleSheet.cssModel.removeEventListener(SDK12.CSSModel.Events.StyleSheetAdded, this.onStyleSheetAdded, this);
      this.eventListener = null;
    }
  }
  static createContents(header, treeElement) {
    const documentElement = treeElement.listItemElement.createChild("span");
    const linkText = header.sourceURL;
    UI15.UIUtils.createTextChild(documentElement, "#adopted-style-sheet" + (linkText ? " (" : ""));
    if (linkText) {
      documentElement.appendChild(Components5.Linkifier.Linkifier.linkifyURL(linkText, {
        text: linkText,
        preventClick: true,
        showColumnNumber: false,
        inlineFrameIndex: 0
      }));
      UI15.UIUtils.createTextChild(documentElement, ")");
    }
    treeElement.appendChild(new AdoptedStyleSheetContentsTreeElement(header));
  }
};
var AdoptedStyleSheetContentsTreeElement = class extends UI15.TreeOutline.TreeElement {
  styleSheetHeader;
  constructor(styleSheetHeader) {
    super("");
    this.styleSheetHeader = styleSheetHeader;
  }
  onbind() {
    this.styleSheetHeader.cssModel().addEventListener(SDK12.CSSModel.Events.StyleSheetChanged, this.onStyleSheetChanged, this);
    void this.onpopulate();
  }
  onunbind() {
    this.styleSheetHeader.cssModel().removeEventListener(SDK12.CSSModel.Events.StyleSheetChanged, this.onStyleSheetChanged, this);
  }
  async onpopulate() {
    const data = await this.styleSheetHeader.requestContentData();
    if (!TextUtils5.ContentData.ContentData.isError(data) && data.isTextContent) {
      this.listItemElement.removeChildren();
      const newNode = this.listItemElement.createChild("span", "webkit-html-text-node webkit-html-css-node");
      newNode.setAttribute("jslog", `${VisualLogging7.value("css-text-node").track({ change: true, dblclick: true })}`);
      const text = data.text;
      newNode.textContent = text.replace(/^[\n\r]+|\s+$/g, "");
      void CodeHighlighter.CodeHighlighter.highlightNode(newNode, "text/css");
    }
  }
  onStyleSheetChanged({ data: { styleSheetId } }) {
    if (styleSheetId === this.styleSheetHeader.id) {
      void this.onpopulate();
    }
  }
};

// gen/front_end/panels/elements/ElementIssueUtils.js
import * as i18n19 from "./../../core/i18n/i18n.js";
import * as IssuesManager from "./../../models/issues_manager/issues_manager.js";
var UIStrings10 = {
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  formLabelForNameError: "Incorrect use of <label for=FORM_ELEMENT>",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  formDuplicateIdForInputError: "Duplicate form field id in the same form",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  formInputWithNoLabelError: "Form field without valid aria-labelledby attribute or associated label",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  formAutocompleteAttributeEmptyError: "Incorrect use of autocomplete attribute",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  formEmptyIdAndNameAttributesForInputError: "A form field element should have an id or name attribute",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  formAriaLabelledByToNonExistingId: "An aria-labelledby attribute doesn't match any element id",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  formInputAssignedAutocompleteValueToIdOrNameAttributeError: "An element doesn't have an autocomplete attribute",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  formLabelHasNeitherForNorNestedInput: "No label associated with a form field",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  formLabelForMatchesNonExistingIdError: "Incorrect use of <label for=FORM_ELEMENT>",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  formInputHasWrongButWellIntendedAutocompleteValueError: "Non-standard autocomplete attribute value",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  disallowedSelectChild: "Invalid element or text node within <select>",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  disallowedOptGroupChild: "Invalid element or text node within <optgroup>",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  nonPhrasingContentOptionChild: "Non-phrasing content used within an <option> element",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  interactiveContentOptionChild: "Interactive element inside of an <option> element",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  interactiveContentLegendChild: "Interactive element inside of a <legend> element",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  interactiveContentAttributesSelectDescendant: "Element with invalid attributes within a <select> element",
  /**
   * @description Tooltip text shown in the Elements panel when an element has an error.
   */
  interactiveContentSummaryDescendant: "Interactive element inside of a <summary> element"
};
var str_10 = i18n19.i18n.registerUIStrings("panels/elements/ElementIssueUtils.ts", UIStrings10);
var i18nString10 = i18n19.i18n.getLocalizedString.bind(void 0, str_10);
function getElementIssueDetails(issue) {
  if (issue instanceof IssuesManager.GenericIssue.GenericIssue) {
    const issueDetails = issue.details();
    return {
      tooltip: getTooltipFromGenericIssue(issueDetails.errorType),
      nodeId: issueDetails.violatingNodeId,
      attribute: issueDetails.violatingNodeAttribute
    };
  }
  if (issue instanceof IssuesManager.ElementAccessibilityIssue.ElementAccessibilityIssue) {
    const issueDetails = issue.details();
    if (issue.isInteractiveContentAttributesSelectDescendantIssue()) {
      return {
        tooltip: i18nString10(UIStrings10.interactiveContentAttributesSelectDescendant),
        nodeId: issueDetails.nodeId
      };
    }
    return {
      tooltip: getTooltipFromElementAccessibilityIssue(issueDetails.elementAccessibilityIssueReason),
      nodeId: issueDetails.nodeId
    };
  }
  return void 0;
}
function getTooltipFromGenericIssue(errorType) {
  switch (errorType) {
    case "FormLabelForNameError":
      return i18nString10(UIStrings10.formLabelForNameError);
    case "FormDuplicateIdForInputError":
      return i18nString10(UIStrings10.formDuplicateIdForInputError);
    case "FormInputWithNoLabelError":
      return i18nString10(UIStrings10.formInputWithNoLabelError);
    case "FormAutocompleteAttributeEmptyError":
      return i18nString10(UIStrings10.formAutocompleteAttributeEmptyError);
    case "FormEmptyIdAndNameAttributesForInputError":
      return i18nString10(UIStrings10.formEmptyIdAndNameAttributesForInputError);
    case "FormAriaLabelledByToNonExistingIdError":
      return i18nString10(UIStrings10.formAriaLabelledByToNonExistingId);
    case "FormInputAssignedAutocompleteValueToIdOrNameAttributeError":
      return i18nString10(UIStrings10.formInputAssignedAutocompleteValueToIdOrNameAttributeError);
    case "FormLabelHasNeitherForNorNestedInputError":
      return i18nString10(UIStrings10.formLabelHasNeitherForNorNestedInput);
    case "FormLabelForMatchesNonExistingIdError":
      return i18nString10(UIStrings10.formLabelForMatchesNonExistingIdError);
    case "FormInputHasWrongButWellIntendedAutocompleteValueError":
      return i18nString10(UIStrings10.formInputHasWrongButWellIntendedAutocompleteValueError);
    default:
      return "";
  }
}
function getTooltipFromElementAccessibilityIssue(reason) {
  switch (reason) {
    case "DisallowedSelectChild":
      return i18nString10(UIStrings10.disallowedSelectChild);
    case "DisallowedOptGroupChild":
      return i18nString10(UIStrings10.disallowedOptGroupChild);
    case "NonPhrasingContentOptionChild":
      return i18nString10(UIStrings10.nonPhrasingContentOptionChild);
    case "InteractiveContentOptionChild":
      return i18nString10(UIStrings10.interactiveContentOptionChild);
    case "InteractiveContentLegendChild":
      return i18nString10(UIStrings10.interactiveContentLegendChild);
    case "InteractiveContentSummaryDescendant":
      return i18nString10(UIStrings10.interactiveContentSummaryDescendant);
    default:
      return "";
  }
}

// gen/front_end/panels/elements/ElementsTreeElement.js
var ElementsTreeElement_exports = {};
__export(ElementsTreeElement_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  EditTagBlocklist: () => EditTagBlocklist,
  ElementsTreeElement: () => ElementsTreeElement,
  ForbiddenClosingTagElements: () => ForbiddenClosingTagElements,
  InitialChildrenLimit: () => InitialChildrenLimit,
  adornerComparator: () => adornerComparator,
  convertUnicodeCharsToHTMLEntities: () => convertUnicodeCharsToHTMLEntities,
  isOpeningTag: () => isOpeningTag
});
import * as Common9 from "./../../core/common/common.js";
import * as Host4 from "./../../core/host/host.js";
import * as i18n23 from "./../../core/i18n/i18n.js";
import * as Platform7 from "./../../core/platform/platform.js";
import * as Root6 from "./../../core/root/root.js";
import * as SDK14 from "./../../core/sdk/sdk.js";
import * as Badges3 from "./../../models/badges/badges.js";
import * as TextUtils6 from "./../../models/text_utils/text_utils.js";
import * as CodeMirror from "./../../third_party/codemirror.next/codemirror.next.js";
import * as Adorners from "./../../ui/components/adorners/adorners.js";
import * as Buttons2 from "./../../ui/components/buttons/buttons.js";
import * as CodeHighlighter3 from "./../../ui/components/code_highlighter/code_highlighter.js";
import * as Highlighting2 from "./../../ui/components/highlighting/highlighting.js";
import * as TextEditor from "./../../ui/components/text_editor/text_editor.js";
import { createIcon as createIcon4, Icon as Icon3 } from "./../../ui/kit/kit.js";
import * as Components6 from "./../../ui/legacy/components/utils/utils.js";
import * as UI16 from "./../../ui/legacy/legacy.js";
import * as Lit6 from "./../../ui/lit/lit.js";
import * as VisualLogging8 from "./../../ui/visual_logging/visual_logging.js";
import * as PanelsCommon3 from "./../common/common.js";
import * as Emulation from "./../emulation/emulation.js";
import * as Media from "./../media/media.js";
import * as ElementsComponents5 from "./components/components.js";

// gen/front_end/panels/elements/DOMPath.js
var DOMPath_exports = {};
__export(DOMPath_exports, {
  Step: () => Step,
  canGetJSPath: () => canGetJSPath,
  cssPath: () => cssPath,
  fullQualifiedSelector: () => fullQualifiedSelector,
  jsPath: () => jsPath,
  xPath: () => xPath
});
import * as SDK13 from "./../../core/sdk/sdk.js";
var fullQualifiedSelector = function(node, justSelector) {
  if (node.nodeType() !== Node.ELEMENT_NODE) {
    return node.localName() || node.nodeName().toLowerCase();
  }
  return cssPath(node, justSelector);
};
var cssPath = function(node, optimized) {
  if (node.nodeType() !== Node.ELEMENT_NODE) {
    return "";
  }
  const steps = [];
  let contextNode = node;
  while (contextNode) {
    const step = cssPathStep(contextNode, Boolean(optimized), contextNode === node);
    if (!step) {
      break;
    }
    steps.push(step);
    if (step.optimized) {
      break;
    }
    contextNode = contextNode.parentNode;
  }
  steps.reverse();
  return steps.join(" > ");
};
var canGetJSPath = function(node) {
  let wp = node;
  while (wp) {
    const shadowRoot = wp.ancestorShadowRoot();
    if (shadowRoot && shadowRoot.shadowRootType() !== SDK13.DOMModel.DOMNode.ShadowRootTypes.Open) {
      return false;
    }
    wp = wp.ancestorShadowHost();
  }
  return true;
};
var jsPath = function(node, optimized) {
  if (node.nodeType() !== Node.ELEMENT_NODE) {
    return "";
  }
  const path = [];
  let wp = node;
  while (wp) {
    path.push(cssPath(wp, optimized));
    wp = wp.ancestorShadowHost();
  }
  path.reverse();
  let result = "";
  for (let i = 0; i < path.length; ++i) {
    const string = JSON.stringify(path[i]);
    if (i) {
      result += `.shadowRoot.querySelector(${string})`;
    } else {
      result += `document.querySelector(${string})`;
    }
  }
  return result;
};
var cssPathStep = function(node, optimized, isTargetNode) {
  if (node.nodeType() !== Node.ELEMENT_NODE) {
    return null;
  }
  const id = node.getAttribute("id");
  if (optimized) {
    if (id) {
      return new Step(idSelector(id), true);
    }
    const nodeNameLower = node.nodeName().toLowerCase();
    if (nodeNameLower === "body" || nodeNameLower === "head" || nodeNameLower === "html") {
      return new Step(node.nodeNameInCorrectCase(), true);
    }
  }
  const nodeName = node.nodeNameInCorrectCase();
  if (id) {
    return new Step(nodeName + idSelector(id), true);
  }
  const parent = node.parentNode;
  if (!parent || parent.nodeType() === Node.DOCUMENT_NODE) {
    return new Step(nodeName, true);
  }
  function prefixedElementClassNames(node2) {
    const classAttribute = node2.getAttribute("class");
    if (!classAttribute) {
      return [];
    }
    return classAttribute.split(/\s+/g).filter(Boolean).map(function(name) {
      return "$" + name;
    });
  }
  function idSelector(id2) {
    return "#" + CSS.escape(id2);
  }
  const prefixedOwnClassNamesArray = prefixedElementClassNames(node);
  let needsClassNames = false;
  let needsNthChild = false;
  let ownIndex = -1;
  let elementIndex = -1;
  const siblings = parent.children();
  for (let i = 0; siblings && (ownIndex === -1 || !needsNthChild) && i < siblings.length; ++i) {
    const sibling = siblings[i];
    if (sibling.nodeType() !== Node.ELEMENT_NODE) {
      continue;
    }
    elementIndex += 1;
    if (sibling === node) {
      ownIndex = elementIndex;
      continue;
    }
    if (needsNthChild) {
      continue;
    }
    if (sibling.nodeNameInCorrectCase() !== nodeName) {
      continue;
    }
    needsClassNames = true;
    const ownClassNames = new Set(prefixedOwnClassNamesArray);
    if (!ownClassNames.size) {
      needsNthChild = true;
      continue;
    }
    const siblingClassNamesArray = prefixedElementClassNames(sibling);
    for (let j = 0; j < siblingClassNamesArray.length; ++j) {
      const siblingClass = siblingClassNamesArray[j];
      if (!ownClassNames.has(siblingClass)) {
        continue;
      }
      ownClassNames.delete(siblingClass);
      if (!ownClassNames.size) {
        needsNthChild = true;
        break;
      }
    }
  }
  let result = nodeName;
  if (isTargetNode && nodeName.toLowerCase() === "input" && node.getAttribute("type") && !node.getAttribute("id") && !node.getAttribute("class")) {
    result += "[type=" + CSS.escape(node.getAttribute("type") || "") + "]";
  }
  if (needsNthChild) {
    result += ":nth-child(" + (ownIndex + 1) + ")";
  } else if (needsClassNames) {
    for (const prefixedName of prefixedOwnClassNamesArray) {
      result += "." + CSS.escape(prefixedName.slice(1));
    }
  }
  return new Step(result, false);
};
var xPath = function(node, optimized) {
  if (node.nodeType() === Node.DOCUMENT_NODE) {
    return "/";
  }
  const steps = [];
  let contextNode = node;
  while (contextNode) {
    const step = xPathValue(contextNode, optimized);
    if (!step) {
      break;
    }
    steps.push(step);
    if (step.optimized) {
      break;
    }
    contextNode = contextNode.parentNode;
  }
  steps.reverse();
  return (steps.length && steps[0].optimized ? "" : "/") + steps.join("/");
};
var xPathValue = function(node, optimized) {
  let ownValue;
  const ownIndex = xPathIndex(node);
  if (ownIndex === -1) {
    return null;
  }
  switch (node.nodeType()) {
    case Node.ELEMENT_NODE:
      if (optimized && node.getAttribute("id")) {
        return new Step('//*[@id="' + node.getAttribute("id") + '"]', true);
      }
      ownValue = node.localName();
      break;
    case Node.ATTRIBUTE_NODE:
      ownValue = "@" + node.nodeName();
      break;
    case Node.TEXT_NODE:
    case Node.CDATA_SECTION_NODE:
      ownValue = "text()";
      break;
    case Node.PROCESSING_INSTRUCTION_NODE:
      ownValue = "processing-instruction()";
      break;
    case Node.COMMENT_NODE:
      ownValue = "comment()";
      break;
    case Node.DOCUMENT_NODE:
      ownValue = "";
      break;
    default:
      ownValue = "";
      break;
  }
  if (ownIndex > 0) {
    ownValue += "[" + ownIndex + "]";
  }
  return new Step(ownValue, node.nodeType() === Node.DOCUMENT_NODE);
};
var xPathIndex = function(node) {
  function areNodesSimilar(left, right) {
    if (left === right) {
      return true;
    }
    if (left.nodeType() === Node.ELEMENT_NODE && right.nodeType() === Node.ELEMENT_NODE) {
      return left.localName() === right.localName();
    }
    if (left.nodeType() === right.nodeType()) {
      return true;
    }
    const leftType = left.nodeType() === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : left.nodeType();
    const rightType = right.nodeType() === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : right.nodeType();
    return leftType === rightType;
  }
  const siblings = node.parentNode ? node.parentNode.children() : null;
  if (!siblings) {
    return 0;
  }
  let hasSameNamedElements;
  for (let i = 0; i < siblings.length; ++i) {
    if (areNodesSimilar(node, siblings[i]) && siblings[i] !== node) {
      hasSameNamedElements = true;
      break;
    }
  }
  if (!hasSameNamedElements) {
    return 0;
  }
  let ownIndex = 1;
  for (let i = 0; i < siblings.length; ++i) {
    if (areNodesSimilar(node, siblings[i])) {
      if (siblings[i] === node) {
        return ownIndex;
      }
      ++ownIndex;
    }
  }
  return -1;
};
var Step = class {
  value;
  optimized;
  constructor(value5, optimized) {
    this.value = value5;
    this.optimized = optimized || false;
  }
  toString() {
    return this.value;
  }
};

// gen/front_end/panels/elements/MarkerDecorator.js
var MarkerDecorator_exports = {};
__export(MarkerDecorator_exports, {
  GenericDecorator: () => GenericDecorator,
  getRegisteredDecorators: () => getRegisteredDecorators
});
import * as i18n21 from "./../../core/i18n/i18n.js";
var UIStrings11 = {
  /**
   * @description Title of the Marker Decorator of Elements
   */
  domBreakpoint: "DOM Breakpoint",
  /**
   * @description Title of the Marker Decorator of Elements
   */
  elementIsHidden: "Element is hidden"
};
var str_11 = i18n21.i18n.registerUIStrings("panels/elements/MarkerDecorator.ts", UIStrings11);
var i18nLazyString = i18n21.i18n.getLazilyComputedLocalizedString.bind(void 0, str_11);
var GenericDecorator = class {
  title;
  color;
  constructor(extension) {
    if (!extension.title || !extension.color) {
      throw new Error(`Generic decorator requires a color and a title: ${extension.marker}`);
    }
    this.title = extension.title();
    this.color = extension.color;
  }
  decorate(_node) {
    return { title: this.title, color: this.color };
  }
};
var domBreakpointData = {
  marker: "breakpoint-marker",
  title: i18nLazyString(UIStrings11.domBreakpoint),
  color: "var(--sys-color-primary-bright)"
};
var elementIsHiddenData = {
  marker: "hidden-marker",
  title: i18nLazyString(UIStrings11.elementIsHidden),
  color: "var(--sys-color-neutral-bright)"
};
function getRegisteredDecorators() {
  return [
    {
      ...domBreakpointData,
      decorator: () => new GenericDecorator(domBreakpointData)
    },
    {
      ...elementIsHiddenData,
      decorator: () => new GenericDecorator(elementIsHiddenData)
    },
    {
      decorator: PseudoStateMarkerDecorator.instance,
      marker: "pseudo-state-marker",
      title: void 0,
      color: void 0
    }
  ];
}

// gen/front_end/panels/elements/ElementsTreeElement.js
var { html: html8, nothing: nothing2, render: render5, Directives: { ref: ref2, repeat } } = Lit6;
var UIStrings12 = {
  /**
   * @description Title for Ad adorner. This iframe is marked as advertisement frame.
   */
  thisFrameWasIdentifiedAsAnAd: "This frame was identified as an ad frame",
  /**
   * @description A context menu item in the Elements panel. Force is used as a verb, indicating intention to make the state change.
   */
  forceState: "Force state",
  /**
   * @description Hint element title in Elements Tree Element of the Elements panel
   * @example {0} PH1
   */
  useSInTheConsoleToReferToThis: "Use {PH1} in the console to refer to this element.",
  /**
   * @description A context menu item in the Elements Tree Element of the Elements panel
   */
  addAttribute: "Add attribute",
  /**
   * @description Text to modify the attribute of an item
   */
  editAttribute: "Edit attribute",
  /**
   * @description Text to focus on something
   */
  focus: "Focus",
  /**
   * @description Text to scroll the displayed content into view
   */
  scrollIntoView: "Scroll into view",
  /**
   * @description A context menu item in the Elements Tree Element of the Elements panel
   */
  editText: "Edit text",
  /**
   * @description A context menu item in the Elements Tree Element of the Elements panel
   */
  editAsHtml: "Edit as HTML",
  /**
   * @description Text to cut an element, cut should be used as a verb
   */
  cut: "Cut",
  /**
   * @description Text for copying, copy should be used as a verb
   */
  copy: "Copy",
  /**
   * @description Text to paste an element, paste should be used as a verb
   */
  paste: "Paste",
  /**
   * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
   */
  copyOuterhtml: "Copy outerHTML",
  /**
   * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
   */
  copySelector: "Copy `selector`",
  /**
   * @description Text in Elements Tree Element of the Elements panel
   */
  copyJsPath: "Copy JS path",
  /**
   * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
   */
  copyStyles: "Copy styles",
  /**
   * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
   */
  copyXpath: "Copy XPath",
  /**
   * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
   */
  copyFullXpath: "Copy full XPath",
  /**
   * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
   */
  copyElement: "Copy element",
  /**
   * @description A context menu item in the Elements Tree Element of the Elements panel
   */
  duplicateElement: "Duplicate element",
  /**
   * @description Text to hide an element
   */
  hideElement: "Hide element",
  /**
   * @description A context menu item in the Elements Tree Element of the Elements panel
   */
  deleteElement: "Delete element",
  /**
   * @description Text to expand something recursively
   */
  expandRecursively: "Expand recursively",
  /**
   * @description Text to collapse children of a parent group
   */
  collapseChildren: "Collapse children",
  /**
   * @description Title of an action in the emulation tool to capture node screenshot
   */
  captureNodeScreenshot: "Capture node screenshot",
  /**
   * @description Title of a context menu item. When clicked DevTools goes to the Application panel and shows this specific iframe's details
   */
  showFrameDetails: "Show `iframe` details",
  /**
   * @description Text in Elements Tree Element of the Elements panel
   */
  valueIsTooLargeToEdit: "<value is too large to edit>",
  /**
   * @description Element text content in Elements Tree Element of the Elements panel
   */
  children: "Children:",
  /**
   * @description ARIA label for Elements Tree adorners
   */
  enableGridMode: "Enable grid mode",
  /**
   * @description ARIA label for Elements Tree adorners
   */
  disableGridMode: "Disable grid mode",
  /**
   * @description ARIA label for Elements Tree adorners
   */
  /**
   * @description ARIA label for Elements Tree adorners
   */
  enableGridLanesMode: "Enable grid-lanes mode",
  /**
   * @description ARIA label for Elements Tree adorners
   */
  disableGridLanesMode: "Disable grid-lanes mode",
  /**
   * @description ARIA label for an elements tree adorner
   */
  forceOpenPopover: "Keep this popover open",
  /**
   * @description ARIA label for an elements tree adorner
   */
  stopForceOpenPopover: "Stop keeping this popover open",
  /**
   * @description Label of the adorner for flex elements in the Elements panel
   */
  enableFlexMode: "Enable flex mode",
  /**
   * @description Label of the adorner for flex elements in the Elements panel
   */
  disableFlexMode: "Disable flex mode",
  /**
   * @description Label of an adorner in the Elements panel. When clicked, it enables
   * the overlay showing CSS scroll snapping for the current element.
   */
  enableScrollSnap: "Enable scroll-snap overlay",
  /**
   * @description Label of an adorner in the Elements panel. When clicked, it disables
   * the overlay showing CSS scroll snapping for the current element.
   */
  disableScrollSnap: "Disable scroll-snap overlay",
  /**
   * @description Label of an adorner in the Elements panel. When clicked, it enables
   * the overlay showing the container overlay for the current element.
   */
  enableContainer: "Enable container overlay",
  /**
   * @description Label of an adorner in the Elements panel. When clicked, it disables
   * the overlay showing container for the current element.
   */
  disableContainer: "Disable container overlay",
  /**
   * @description Label of an adorner in the Elements panel. When clicked, it forces
   * the element into applying its starting-style rules.
   */
  enableStartingStyle: "Enable @starting-style mode",
  /**
   * @description Label of an adorner in the Elements panel. When clicked, it no longer
   * forces the element into applying its starting-style rules.
   */
  disableStartingStyle: "Disable @starting-style mode",
  /**
   * @description Label of an adorner in the Elements panel. When clicked, it redirects
   * to the Media Panel.
   */
  openMediaPanel: "Jump to Media panel",
  /**
   * @description Text of a tooltip to redirect to another element in the Elements panel
   */
  showPopoverTarget: "Show element associated with the `popovertarget` attribute",
  /**
   * @description Text of a tooltip to redirect to another element in the Elements panel, associated with the `interesttarget` attribute
   */
  showInterestTarget: "Show element associated with the `interesttarget` attribute",
  /**
   * @description Text of a tooltip to redirect to another element in the Elements panel, associated with the `commandfor` attribute
   */
  showCommandForTarget: "Show element associated with the `commandfor` attribute",
  /**
   * @description Text of the tooltip for scroll adorner.
   */
  elementHasScrollableOverflow: "This element has a scrollable overflow",
  /**
   * @description Text of a context menu item to redirect to the AI assistance panel and to start a chat.
   */
  startAChat: "Start a chat",
  /**
   * @description Context menu item in Elements panel to assess visibility of an element via AI.
   */
  assessVisibility: "Assess visibility",
  /**
   * @description Context menu item in Elements panel to center an element via AI.
   */
  centerElement: "Center element",
  /**
   * @description Context menu item in Elements panel to wrap flex items via AI.
   */
  wrapTheseItems: "Wrap these items",
  /**
   * @description Context menu item in Elements panel to distribute flex items evenly via AI.
   */
  distributeItemsEvenly: "Distribute items evenly",
  /**
   * @description Context menu item in Elements panel to explain flexbox via AI.
   */
  explainFlexbox: "Explain flexbox",
  /**
   * @description Context menu item in Elements panel to align grid items via AI.
   */
  alignItems: "Align items",
  /**
   * @description Context menu item in Elements panel to add padding/gap to grid via AI.
   */
  addPadding: "Add padding",
  /**
   * @description Context menu item in Elements panel to explain grid layout via AI.
   */
  explainGridLayout: "Explain grid layout",
  /**
   * @description Context menu item in Elements panel to find grid definition for a subgrid item via AI.
   */
  findGridDefinition: "Find grid definition",
  /**
   * @description Context menu item in Elements panel to change parent grid properties for a subgrid item via AI.
   */
  changeParentProperties: "Change parent properties",
  /**
   * @description Context menu item in Elements panel to explain subgrids via AI.
   */
  explainSubgrids: "Explain subgrids",
  /**
   * @description Context menu item in Elements panel to remove scrollbars via AI.
   */
  removeScrollbars: "Remove scrollbars",
  /**
   * @description Context menu item in Elements panel to style scrollbars via AI.
   */
  styleScrollbars: "Style scrollbars",
  /**
   * @description Context menu item in Elements panel to explain scrollbars via AI.
   */
  explainScrollbars: "Explain scrollbars",
  /**
   * @description Context menu item in Elements panel to explain container queries via AI.
   */
  explainContainerQueries: "Explain container queries",
  /**
   * @description Context menu item in Elements panel to explain container types via AI.
   */
  explainContainerTypes: "Explain container types",
  /**
   * @description Context menu item in Elements panel to explain container context via AI.
   */
  explainContainerContext: "Explain container context",
  /**
   * @description Link text content in Elements Tree Outline of the Elements panel. When clicked, it "reveals" the true location of an element.
   */
  reveal: "reveal"
};
var str_12 = i18n23.i18n.registerUIStrings("panels/elements/ElementsTreeElement.ts", UIStrings12);
var i18nString11 = i18n23.i18n.getLocalizedString.bind(void 0, str_12);
function isOpeningTag(context) {
  return context.tagType === "OPENING_TAG";
}
function adornerRef(input) {
  let adorner2;
  return ref2((el) => {
    if (adorner2) {
      input.onAdornerRemoved(adorner2);
    }
    adorner2 = el;
    if (adorner2) {
      if (ElementsPanel.instance().isAdornerEnabled(adorner2.name)) {
        adorner2.show();
      } else {
        adorner2.hide();
      }
      input.onAdornerAdded(adorner2);
    }
  });
}
var DEFAULT_VIEW3 = (input, output, target) => {
  const adAdornerConfig = ElementsComponents5.AdornerManager.getRegisteredAdorner(ElementsComponents5.AdornerManager.RegisteredAdorners.AD);
  const containerAdornerConfig = ElementsComponents5.AdornerManager.getRegisteredAdorner(ElementsComponents5.AdornerManager.RegisteredAdorners.CONTAINER);
  const flexAdornerConfig = ElementsComponents5.AdornerManager.getRegisteredAdorner(ElementsComponents5.AdornerManager.RegisteredAdorners.FLEX);
  const gridAdornerConfig = ElementsComponents5.AdornerManager.getRegisteredAdorner(ElementsComponents5.AdornerManager.RegisteredAdorners.GRID);
  const subgridAdornerConfig = ElementsComponents5.AdornerManager.getRegisteredAdorner(ElementsComponents5.AdornerManager.RegisteredAdorners.SUBGRID);
  const gridLanesAdornerConfig = ElementsComponents5.AdornerManager.getRegisteredAdorner(ElementsComponents5.AdornerManager.RegisteredAdorners.GRID_LANES);
  const mediaAdornerConfig = ElementsComponents5.AdornerManager.getRegisteredAdorner(ElementsComponents5.AdornerManager.RegisteredAdorners.MEDIA);
  const popoverAdornerConfig = ElementsComponents5.AdornerManager.getRegisteredAdorner(ElementsComponents5.AdornerManager.RegisteredAdorners.POPOVER);
  const topLayerAdornerConfig = ElementsComponents5.AdornerManager.getRegisteredAdorner(ElementsComponents5.AdornerManager.RegisteredAdorners.TOP_LAYER);
  const hasAdorners = input.adorners?.size || input.showAdAdorner || input.showContainerAdorner || input.showFlexAdorner || input.showGridAdorner || input.showGridLanesAdorner || input.showMediaAdorner || input.showPopoverAdorner || input.showTopLayerAdorner;
  render5(html8`
    <div ${ref2((el) => {
    output.contentElement = el;
  })}>
      ${input.nodeInfo ? html8`<span class="highlight">${input.nodeInfo}</span>` : nothing2}
      <div class="gutter-container" @click=${input.onGutterClick} ${ref2((el) => {
    output.gutterContainer = el;
  })}>
        <devtools-icon name="dots-horizontal"></devtools-icon>
        <div class="hidden" ${ref2((el) => {
    output.decorationsElement = el;
  })}></div>
      </div>
      ${hasAdorners ? html8`<div class="adorner-container ${!hasAdorners ? "hidden" : ""}">
        ${input.showAdAdorner ? html8`<devtools-adorner
          aria-label=${i18nString11(UIStrings12.thisFrameWasIdentifiedAsAnAd)}
          .data=${{ name: adAdornerConfig.name, jslogContext: adAdornerConfig.name }}
          ${adornerRef(input)}>
          <span>${adAdornerConfig.name}</span>
        </devtools-adorner>` : nothing2}
        ${input.showContainerAdorner ? html8`<devtools-adorner
          class=clickable
          role=button
          toggleable=true
          tabindex=0
          .data=${{ name: containerAdornerConfig.name, jslogContext: containerAdornerConfig.name }}
          jslog=${VisualLogging8.adorner(containerAdornerConfig.name).track({ click: true })}
          active=${input.containerAdornerActive}
          aria-label=${input.containerAdornerActive ? i18nString11(UIStrings12.enableContainer) : i18nString11(UIStrings12.disableContainer)}
          @click=${input.onContainerAdornerClick}
          @keydown=${(event) => {
    if (event.code === "Enter" || event.code === "Space") {
      input.onContainerAdornerClick(event);
      event.stopPropagation();
    }
  }}
          ${adornerRef(input)}>
          <span>${containerAdornerConfig.name}</span>
        </devtools-adorner>` : nothing2}
        ${input.showFlexAdorner ? html8`<devtools-adorner
          class=clickable
          role=button
          toggleable=true
          tabindex=0
          .data=${{ name: flexAdornerConfig.name, jslogContext: flexAdornerConfig.name }}
          jslog=${VisualLogging8.adorner(flexAdornerConfig.name).track({ click: true })}
          active=${input.flexAdornerActive}
          aria-label=${input.flexAdornerActive ? i18nString11(UIStrings12.disableFlexMode) : i18nString11(UIStrings12.enableFlexMode)}
          @click=${input.onFlexAdornerClick}
          @keydown=${(event) => {
    if (event.code === "Enter" || event.code === "Space") {
      input.onFlexAdornerClick(event);
      event.stopPropagation();
    }
  }}
          ${adornerRef(input)}>
          <span>${flexAdornerConfig.name}</span>
        </devtools-adorner>` : nothing2}
        ${input.showGridAdorner ? html8`<devtools-adorner
          class=clickable
          role=button
          toggleable=true
          tabindex=0
          .data=${{
    name: input.isSubgrid ? subgridAdornerConfig.name : gridAdornerConfig.name,
    jslogContext: input.isSubgrid ? subgridAdornerConfig.name : gridAdornerConfig.name
  }}
          jslog=${VisualLogging8.adorner(input.isSubgrid ? subgridAdornerConfig.name : gridAdornerConfig.name).track({ click: true })}
          active=${input.gridAdornerActive}
          aria-label=${input.gridAdornerActive ? i18nString11(UIStrings12.disableGridMode) : i18nString11(UIStrings12.enableGridMode)}
          @click=${input.onGridAdornerClick}
          @keydown=${(event) => {
    if (event.code === "Enter" || event.code === "Space") {
      input.onGridAdornerClick(event);
      event.stopPropagation();
    }
  }}
          ${adornerRef(input)}>
          <span>${input.isSubgrid ? subgridAdornerConfig.name : gridAdornerConfig.name}</span>
        </devtools-adorner>` : nothing2}
        ${input.showGridLanesAdorner ? html8`<devtools-adorner
          class=clickable
          role=button
          toggleable=true
          tabindex=0
          .data=${{ name: gridLanesAdornerConfig.name, jslogContext: gridLanesAdornerConfig.name }}
          jslog=${VisualLogging8.adorner(gridLanesAdornerConfig.name).track({ click: true })}
          active=${input.gridAdornerActive}
          aria-label=${input.gridAdornerActive ? i18nString11(UIStrings12.disableGridLanesMode) : i18nString11(UIStrings12.enableGridLanesMode)}
          @click=${input.onGridAdornerClick}
          @keydown=${(event) => {
    if (event.code === "Enter" || event.code === "Space") {
      input.onGridAdornerClick(event);
      event.stopPropagation();
    }
  }}
          ${adornerRef(input)}>
          <span>${gridLanesAdornerConfig.name}</span>
        </devtools-adorner>` : nothing2}
        ${input.showMediaAdorner ? html8`<devtools-adorner
          class=clickable
          role=button
          tabindex=0
          .data=${{ name: mediaAdornerConfig.name, jslogContext: mediaAdornerConfig.name }}
          jslog=${VisualLogging8.adorner(mediaAdornerConfig.name).track({ click: true })}
          aria-label=${i18nString11(UIStrings12.openMediaPanel)}
          @click=${input.onMediaAdornerClick}
          @keydown=${(event) => {
    if (event.code === "Enter" || event.code === "Space") {
      input.onMediaAdornerClick(event);
      event.stopPropagation();
    }
  }}
          ${adornerRef(input)}>
          <span class="adorner-with-icon">
            ${mediaAdornerConfig.name}<devtools-icon name="select-element"></devtools-icon>
          </span>
        </devtools-adorner>` : nothing2}
        ${input.showPopoverAdorner ? html8`<devtools-adorner
          class=clickable
          role=button
          toggleable=true
          tabindex=0
          .data=${{ name: popoverAdornerConfig.name, jslogContext: popoverAdornerConfig.name }}
          jslog=${VisualLogging8.adorner(popoverAdornerConfig.name).track({ click: true })}
          active=${input.popoverAdornerActive}
          aria-label=${input.popoverAdornerActive ? i18nString11(UIStrings12.stopForceOpenPopover) : i18nString11(UIStrings12.forceOpenPopover)}
          @click=${input.onPopoverAdornerClick}
          @keydown=${(event) => {
    if (event.code === "Enter" || event.code === "Space") {
      input.onPopoverAdornerClick(event);
      event.stopPropagation();
    }
  }}
          ${adornerRef(input)}>
          <span>${popoverAdornerConfig.name}</span>
        </devtools-adorner>` : nothing2}
        ${input.showTopLayerAdorner ? html8`<devtools-adorner
          class=clickable
          role=button
          tabindex=0
          .data=${{ name: topLayerAdornerConfig.name, jslogContext: topLayerAdornerConfig.name }}
          jslog=${VisualLogging8.adorner(topLayerAdornerConfig.name).track({ click: true })}
          aria-label=${i18nString11(UIStrings12.reveal)}
          @click=${input.onTopLayerAdornerClick}
          @keydown=${(event) => {
    if (event.code === "Enter" || event.code === "Space") {
      input.onTopLayerAdornerClick(event);
      event.stopPropagation();
    }
  }}
          ${adornerRef(input)}>
          <span class="adorner-with-icon">
            ${`top-layer (${input.topLayerIndex})`}<devtools-icon name="select-element"></devtools-icon>
          </span>
        </devtools-adorner>` : nothing2}
        ${repeat(Array.from((input.adorners ?? /* @__PURE__ */ new Set()).values()).sort(adornerComparator), (adorner2) => {
    return adorner2;
  })}
      </div>` : nothing2}
    </div>
  `, target);
};
var ElementsTreeElement = class _ElementsTreeElement extends UI16.TreeOutline.TreeElement {
  nodeInternal;
  treeOutline;
  // Handled by the view output for now.
  gutterContainer;
  decorationsElement;
  contentElement;
  searchQuery;
  #expandedChildrenLimit;
  decorationsThrottler;
  inClipboard;
  #hovered;
  editing;
  htmlEditElement;
  expandAllButtonElement;
  selectionElement;
  hintElement;
  aiButtonContainer;
  #elementIssues = /* @__PURE__ */ new Map();
  #nodeElementToIssue = /* @__PURE__ */ new Map();
  #highlights = [];
  tagTypeContext;
  #adornersThrottler = new Common9.Throttler.Throttler(100);
  #adorners = /* @__PURE__ */ new Set();
  #nodeInfo;
  #containerAdornerActive = false;
  #flexAdornerActive = false;
  #gridAdornerActive = false;
  #popoverAdornerActive = false;
  #layout = null;
  constructor(node, isClosingTag) {
    super();
    this.nodeInternal = node;
    this.treeOutline = null;
    this.listItemElement.setAttribute("jslog", `${VisualLogging8.treeItem().parent("elementsTreeOutline").track({
      keydown: "ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Enter|Space|Home|End",
      drag: true,
      click: true
    })}`);
    this.searchQuery = null;
    this.#expandedChildrenLimit = InitialChildrenLimit;
    this.decorationsThrottler = new Common9.Throttler.Throttler(100);
    this.inClipboard = false;
    this.#hovered = false;
    this.editing = null;
    if (isClosingTag) {
      this.tagTypeContext = {
        tagType: "CLOSING_TAG"
        /* TagType.CLOSING */
      };
    } else {
      this.tagTypeContext = {
        tagType: "OPENING_TAG",
        canAddAttributes: this.nodeInternal.nodeType() === Node.ELEMENT_NODE
      };
      void this.updateStyleAdorners();
      void this.updateScrollAdorner();
      void this.#updateAdorners();
    }
    this.expandAllButtonElement = null;
    this.performUpdate();
    if (this.nodeInternal.retained && !this.isClosingTag()) {
      const icon = new Icon3();
      icon.name = "small-status-dot";
      icon.style.color = "var(--icon-error)";
      icon.classList.add("extra-small");
      icon.style.setProperty("vertical-align", "middle");
      this.setLeadingIcons([icon]);
      this.listItemNode.classList.add("detached-elements-detached-node");
      this.listItemNode.style.setProperty("display", "-webkit-box");
      this.listItemNode.setAttribute("title", "Retained Node");
    }
    if (this.nodeInternal.detached && !this.isClosingTag()) {
      this.listItemNode.setAttribute("title", "Detached Tree Node");
    }
    node.domModel().overlayModel().addEventListener("PersistentContainerQueryOverlayStateChanged", (event) => {
      const { nodeId: eventNodeId, enabled } = event.data;
      if (eventNodeId !== node.id) {
        return;
      }
      this.#containerAdornerActive = enabled;
      this.performUpdate();
    });
    node.domModel().overlayModel().addEventListener("PersistentFlexContainerOverlayStateChanged", (event) => {
      const { nodeId: eventNodeId, enabled } = event.data;
      if (eventNodeId !== node.id) {
        return;
      }
      this.#flexAdornerActive = enabled;
      this.performUpdate();
    });
    node.domModel().overlayModel().addEventListener("PersistentGridOverlayStateChanged", (event) => {
      const { nodeId: eventNodeId, enabled } = event.data;
      if (eventNodeId !== node.id) {
        return;
      }
      this.#gridAdornerActive = enabled;
      this.performUpdate();
    });
  }
  static animateOnDOMUpdate(treeElement) {
    const tagName = treeElement.listItemElement.querySelector(".webkit-html-tag-name");
    UI16.UIUtils.runCSSAnimationOnce(tagName || treeElement.listItemElement, "dom-update-highlight");
  }
  static visibleShadowRoots(node) {
    let roots = node.shadowRoots();
    if (roots.length && !Common9.Settings.Settings.instance().moduleSetting("show-ua-shadow-dom").get()) {
      roots = roots.filter(filter);
    }
    function filter(root) {
      return root.shadowRootType() !== SDK14.DOMModel.DOMNode.ShadowRootTypes.UserAgent;
    }
    return roots;
  }
  static canShowInlineText(node) {
    if (node.contentDocument() || node.templateContent() || _ElementsTreeElement.visibleShadowRoots(node).length || node.hasPseudoElements()) {
      return false;
    }
    if (node.nodeType() !== Node.ELEMENT_NODE) {
      return false;
    }
    if (!node.firstChild || node.firstChild !== node.lastChild || node.firstChild.nodeType() !== Node.TEXT_NODE) {
      return false;
    }
    const textChild = node.firstChild;
    const maxInlineTextChildLength = 80;
    if (textChild.nodeValue().length < maxInlineTextChildLength) {
      return true;
    }
    return false;
  }
  static populateForcedPseudoStateItems(contextMenu, node) {
    const pseudoClasses = ["active", "hover", "focus", "visited", "focus-within", "focus-visible"];
    const forcedPseudoState = node.domModel().cssModel().pseudoState(node);
    const stateMenu = contextMenu.debugSection().appendSubMenuItem(i18nString11(UIStrings12.forceState), false, "force-state");
    for (const pseudoClass of pseudoClasses) {
      const pseudoClassForced = forcedPseudoState ? forcedPseudoState.indexOf(pseudoClass) >= 0 : false;
      stateMenu.defaultSection().appendCheckboxItem(":" + pseudoClass, setPseudoStateCallback.bind(null, pseudoClass, !pseudoClassForced), { checked: pseudoClassForced, jslogContext: pseudoClass });
    }
    function setPseudoStateCallback(pseudoState, enabled) {
      node.domModel().cssModel().forcePseudoState(node, pseudoState, enabled);
    }
  }
  get adorners() {
    return Array.from(this.#adorners);
  }
  performUpdate() {
    DEFAULT_VIEW3({
      containerAdornerActive: this.#containerAdornerActive,
      adorners: !this.isClosingTag() ? this.#adorners : void 0,
      showAdAdorner: this.nodeInternal.isAdFrameNode(),
      showContainerAdorner: Boolean(this.#layout?.isContainer) && !this.isClosingTag(),
      showFlexAdorner: Boolean(this.#layout?.isFlex) && !this.isClosingTag(),
      flexAdornerActive: this.#flexAdornerActive,
      showGridAdorner: Boolean(this.#layout?.isGrid) && !this.isClosingTag(),
      showGridLanesAdorner: Boolean(this.#layout?.isGridLanes) && !this.isClosingTag(),
      showMediaAdorner: this.node().isMediaNode() && !this.isClosingTag(),
      showPopoverAdorner: Boolean(Root6.Runtime.hostConfig.devToolsAllowPopoverForcing?.enabled) && Boolean(this.node().attributes().find((attr) => attr.name === "popover")) && !this.isClosingTag(),
      showTopLayerAdorner: this.node().topLayerIndex() !== -1 && !this.isClosingTag(),
      gridAdornerActive: this.#gridAdornerActive,
      popoverAdornerActive: this.#popoverAdornerActive,
      isSubgrid: Boolean(this.#layout?.isSubgrid),
      nodeInfo: this.#nodeInfo,
      topLayerIndex: this.node().topLayerIndex(),
      onGutterClick: this.showContextMenu.bind(this),
      onAdornerAdded: (adorner2) => {
        ElementsPanel.instance().registerAdorner(adorner2);
      },
      onAdornerRemoved: (adorner2) => {
        ElementsPanel.instance().deregisterAdorner(adorner2);
      },
      onContainerAdornerClick: (event) => this.#onContainerAdornerClick(event),
      onFlexAdornerClick: (event) => this.#onFlexAdornerClick(event),
      onGridAdornerClick: (event) => this.#onGridAdornerClick(event),
      onMediaAdornerClick: (event) => this.#onMediaAdornerClick(event),
      onPopoverAdornerClick: (event) => this.#onPopoverAdornerClick(event),
      onTopLayerAdornerClick: () => {
        if (!this.treeOutline) {
          return;
        }
        this.treeOutline.revealInTopLayer(this.node());
      }
    }, this, this.listItemElement);
  }
  #onContainerAdornerClick(event) {
    event.stopPropagation();
    const node = this.node();
    const nodeId = node.id;
    if (!nodeId) {
      return;
    }
    const model = node.domModel().overlayModel();
    if (model.isHighlightedContainerQueryInPersistentOverlay(nodeId)) {
      model.hideContainerQueryInPersistentOverlay(nodeId);
      this.#containerAdornerActive = false;
    } else {
      model.highlightContainerQueryInPersistentOverlay(nodeId);
      this.#containerAdornerActive = true;
      Badges3.UserBadges.instance().recordAction(Badges3.BadgeAction.MODERN_DOM_BADGE_CLICKED);
    }
    void this.updateAdorners();
  }
  #onFlexAdornerClick(event) {
    event.stopPropagation();
    const node = this.node();
    const nodeId = node.id;
    if (!nodeId) {
      return;
    }
    const model = node.domModel().overlayModel();
    if (model.isHighlightedFlexContainerInPersistentOverlay(nodeId)) {
      model.hideFlexContainerInPersistentOverlay(nodeId);
      this.#flexAdornerActive = false;
    } else {
      model.highlightFlexContainerInPersistentOverlay(nodeId);
      this.#flexAdornerActive = true;
      Badges3.UserBadges.instance().recordAction(Badges3.BadgeAction.MODERN_DOM_BADGE_CLICKED);
    }
    void this.updateAdorners();
  }
  #onGridAdornerClick(event) {
    event.stopPropagation();
    const node = this.node();
    const nodeId = node.id;
    if (!nodeId) {
      return;
    }
    const model = node.domModel().overlayModel();
    if (model.isHighlightedGridInPersistentOverlay(nodeId)) {
      model.hideGridInPersistentOverlay(nodeId);
      this.#gridAdornerActive = false;
    } else {
      model.highlightGridInPersistentOverlay(nodeId);
      this.#gridAdornerActive = true;
      if (this.#layout?.isSubgrid) {
        Badges3.UserBadges.instance().recordAction(Badges3.BadgeAction.MODERN_DOM_BADGE_CLICKED);
      }
    }
    void this.updateAdorners();
  }
  async #onMediaAdornerClick(event) {
    event.stopPropagation();
    await UI16.ViewManager.ViewManager.instance().showView("medias");
    const view = UI16.ViewManager.ViewManager.instance().view("medias");
    if (view) {
      const widget = await view.widget();
      if (widget instanceof Media.MainView.MainView) {
        await widget.waitForInitialPlayers();
        widget.selectPlayerByDOMNodeId(this.node().backendNodeId());
      }
    }
  }
  highlightAttribute(attributeName) {
    let animationElement = this.listItemElement.querySelector(".webkit-html-tag-name") ?? this.listItemElement;
    if (this.nodeInternal.getAttribute(attributeName) !== void 0) {
      const tag = this.listItemElement.getElementsByClassName("webkit-html-tag")[0];
      const attributes = tag.getElementsByClassName("webkit-html-attribute");
      for (const attribute of attributes) {
        const attributeElement = attribute.getElementsByClassName("webkit-html-attribute-name")[0];
        if (attributeElement.textContent === attributeName) {
          animationElement = attributeElement;
          break;
        }
      }
    }
    UI16.UIUtils.runCSSAnimationOnce(animationElement, "dom-update-highlight");
  }
  isClosingTag() {
    return !isOpeningTag(this.tagTypeContext);
  }
  node() {
    return this.nodeInternal;
  }
  isEditing() {
    return Boolean(this.editing);
  }
  highlightSearchResults(searchQuery) {
    this.searchQuery = searchQuery;
    if (!this.editing) {
      this.#highlightSearchResults();
    }
  }
  hideSearchHighlights() {
    Highlighting2.HighlightManager.HighlightManager.instance().removeHighlights(this.#highlights);
    this.#highlights = [];
  }
  setInClipboard(inClipboard) {
    if (this.inClipboard === inClipboard) {
      return;
    }
    this.inClipboard = inClipboard;
    this.listItemElement.classList.toggle("in-clipboard", inClipboard);
  }
  get hovered() {
    return this.#hovered;
  }
  set hovered(isHovered) {
    if (this.#hovered === isHovered) {
      return;
    }
    if (isHovered && !this.aiButtonContainer) {
      this.createAiButton();
    } else if (!isHovered && this.aiButtonContainer) {
      this.aiButtonContainer.remove();
      delete this.aiButtonContainer;
    }
    this.#hovered = isHovered;
    if (this.listItemElement) {
      if (isHovered) {
        this.createSelection();
        this.listItemElement.classList.add("hovered");
      } else {
        this.listItemElement.classList.remove("hovered");
      }
    }
  }
  addIssue(newIssue) {
    if (this.#elementIssues.has(newIssue.primaryKey())) {
      return;
    }
    this.#elementIssues.set(newIssue.primaryKey(), newIssue);
    this.#applyIssueStyleAndTooltip(newIssue);
  }
  #applyIssueStyleAndTooltip(issue) {
    const elementIssueDetails = getElementIssueDetails(issue);
    if (!elementIssueDetails) {
      return;
    }
    if (elementIssueDetails.attribute) {
      this.#highlightViolatingAttr(elementIssueDetails.attribute, issue);
    } else {
      this.#highlightTagAsViolating(issue);
    }
  }
  get issuesByNodeElement() {
    return this.#nodeElementToIssue;
  }
  #highlightViolatingAttr(name, issue) {
    const tag = this.listItemElement.getElementsByClassName("webkit-html-tag")[0];
    const attributes = tag.getElementsByClassName("webkit-html-attribute");
    for (const attribute of attributes) {
      if (attribute.getElementsByClassName("webkit-html-attribute-name")[0].textContent === name) {
        const attributeElement = attribute.getElementsByClassName("webkit-html-attribute-name")[0];
        attributeElement.classList.add("violating-element");
        this.#updateNodeElementToIssue(attributeElement, issue);
      }
    }
  }
  #highlightTagAsViolating(issue) {
    const tagElement = this.listItemElement.getElementsByClassName("webkit-html-tag-name")[0];
    tagElement.classList.add("violating-element");
    this.#updateNodeElementToIssue(tagElement, issue);
  }
  #updateNodeElementToIssue(nodeElement, issue) {
    let issues = this.#nodeElementToIssue.get(nodeElement);
    if (!issues) {
      issues = [];
      this.#nodeElementToIssue.set(nodeElement, issues);
    }
    issues.push(issue);
    this.treeOutline?.updateNodeElementToIssue(nodeElement, issues);
  }
  expandedChildrenLimit() {
    return this.#expandedChildrenLimit;
  }
  setExpandedChildrenLimit(expandedChildrenLimit) {
    this.#expandedChildrenLimit = expandedChildrenLimit;
  }
  createSlotLink(nodeShortcut) {
    if (!isOpeningTag(this.tagTypeContext)) {
      return;
    }
    if (nodeShortcut) {
      const config = ElementsComponents5.AdornerManager.getRegisteredAdorner(ElementsComponents5.AdornerManager.RegisteredAdorners.SLOT);
      const adorner2 = this.adornSlot(config);
      this.#adorners.add(adorner2);
      const deferredNode = nodeShortcut.deferredNode;
      adorner2.addEventListener("click", () => {
        deferredNode.resolve((node) => {
          void Common9.Revealer.reveal(node);
        });
      });
      adorner2.addEventListener("mousedown", (e) => e.consume(), false);
    }
  }
  createSelection() {
    const contentElement = this.contentElement;
    if (!contentElement) {
      return;
    }
    if (!this.selectionElement) {
      this.selectionElement = document.createElement("div");
      this.selectionElement.className = "selection fill";
      this.selectionElement.style.setProperty("margin-left", -this.computeLeftIndent() + "px");
      contentElement.prepend(this.selectionElement);
    }
  }
  createHint() {
    if (this.contentElement && !this.hintElement) {
      this.hintElement = this.contentElement.createChild("span", "selected-hint");
      const selectedElementCommand = "$0";
      UI16.Tooltip.Tooltip.install(this.hintElement, i18nString11(UIStrings12.useSInTheConsoleToReferToThis, { PH1: selectedElementCommand }));
      UI16.ARIAUtils.setHidden(this.hintElement, true);
    }
  }
  createAiButton() {
    const isElementNode = this.node().nodeType() === Node.ELEMENT_NODE;
    if (!isElementNode || !UI16.ActionRegistry.ActionRegistry.instance().hasAction("freestyler.elements-floating-button")) {
      return;
    }
    const action2 = UI16.ActionRegistry.ActionRegistry.instance().getAction("freestyler.elements-floating-button");
    if (this.contentElement && !this.aiButtonContainer) {
      this.aiButtonContainer = this.contentElement.createChild("span", "ai-button-container");
      const floatingButton = Buttons2.FloatingButton.create("smart-assistant", action2.title(), "ask-ai");
      floatingButton.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this.select(true, false);
        void action2.execute();
      }, { capture: true });
      floatingButton.addEventListener("mousedown", (ev) => {
        ev.stopPropagation();
      }, { capture: true });
      this.aiButtonContainer.appendChild(floatingButton);
    }
  }
  onbind() {
    if (this.treeOutline && !this.isClosingTag()) {
      this.treeOutline.treeElementByNode.set(this.nodeInternal, this);
      this.nodeInternal.addEventListener(SDK14.DOMModel.DOMNodeEvents.TOP_LAYER_INDEX_CHANGED, this.performUpdate, this);
    }
  }
  onunbind() {
    if (this.editing) {
      this.editing.cancel();
    }
    if (this.treeOutline && this.treeOutline.treeElementByNode.get(this.nodeInternal) === this) {
      this.treeOutline.treeElementByNode.delete(this.nodeInternal);
    }
    this.nodeInternal.removeEventListener(SDK14.DOMModel.DOMNodeEvents.TOP_LAYER_INDEX_CHANGED, this.performUpdate, this);
  }
  onattach() {
    if (this.#hovered) {
      this.createSelection();
      this.listItemElement.classList.add("hovered");
    }
    this.updateTitle();
    this.listItemElement.draggable = true;
  }
  async onpopulate() {
    if (this.treeOutline) {
      return await this.treeOutline.populateTreeElement(this);
    }
  }
  async expandRecursively() {
    await this.nodeInternal.getSubtree(100, true);
    await super.expandRecursively(Number.MAX_VALUE);
  }
  onexpand() {
    if (this.isClosingTag()) {
      return;
    }
    this.updateTitle();
  }
  oncollapse() {
    if (this.isClosingTag()) {
      return;
    }
    this.updateTitle();
  }
  select(omitFocus, selectedByUser) {
    if (this.editing) {
      return false;
    }
    const handledByFloaty = UI16.Floaty.onFloatyClick({
      type: "ELEMENT_NODE_ID",
      data: { nodeId: this.nodeInternal.id }
    });
    if (handledByFloaty) {
      return false;
    }
    return super.select(omitFocus, selectedByUser);
  }
  onselect(selectedByUser) {
    if (!this.treeOutline) {
      return false;
    }
    this.treeOutline.suppressRevealAndSelect = true;
    this.treeOutline.selectDOMNode(this.nodeInternal, selectedByUser);
    if (selectedByUser) {
      this.nodeInternal.highlight();
      Host4.userMetrics.actionTaken(Host4.UserMetrics.Action.ChangeInspectedNodeInElementsPanel);
    }
    this.createSelection();
    this.createHint();
    this.treeOutline.suppressRevealAndSelect = false;
    return true;
  }
  ondelete() {
    if (!this.treeOutline) {
      return false;
    }
    const startTagTreeElement = this.treeOutline.findTreeElement(this.nodeInternal);
    startTagTreeElement ? void startTagTreeElement.remove() : void this.remove();
    return true;
  }
  onenter() {
    if (this.editing) {
      return false;
    }
    this.startEditing();
    return true;
  }
  selectOnMouseDown(event) {
    super.selectOnMouseDown(event);
    if (this.editing) {
      return;
    }
    if (event.detail >= 2) {
      event.preventDefault();
    }
  }
  ondblclick(event) {
    if (this.editing || this.isClosingTag()) {
      return false;
    }
    if (this.startEditingTarget(event.target)) {
      return false;
    }
    if (this.isExpandable() && !this.expanded) {
      this.expand();
    }
    return false;
  }
  hasEditableNode() {
    return !this.nodeInternal.isShadowRoot() && !this.nodeInternal.ancestorUserAgentShadowRoot();
  }
  insertInLastAttributePosition(tag, node) {
    if (tag.getElementsByClassName("webkit-html-attribute").length > 0) {
      tag.insertBefore(node, tag.lastChild);
    } else if (tag.textContent !== null) {
      const matchResult = tag.textContent.match(/^<(.*?)>$/);
      if (!matchResult) {
        return;
      }
      const nodeName = matchResult[1];
      tag.textContent = "";
      UI16.UIUtils.createTextChild(tag, "<" + nodeName);
      tag.appendChild(node);
      UI16.UIUtils.createTextChild(tag, ">");
    }
  }
  startEditingTarget(eventTarget) {
    if (!this.treeOutline || this.treeOutline.selectedDOMNode() !== this.nodeInternal) {
      return false;
    }
    if (this.nodeInternal.nodeType() !== Node.ELEMENT_NODE && this.nodeInternal.nodeType() !== Node.TEXT_NODE) {
      return false;
    }
    const textNode = eventTarget.enclosingNodeOrSelfWithClass("webkit-html-text-node");
    if (textNode) {
      return this.startEditingTextNode(textNode);
    }
    const attribute = eventTarget.enclosingNodeOrSelfWithClass("webkit-html-attribute");
    if (attribute) {
      return this.startEditingAttribute(attribute, eventTarget);
    }
    const tagName = eventTarget.enclosingNodeOrSelfWithClass("webkit-html-tag-name");
    if (tagName) {
      return this.startEditingTagName(tagName);
    }
    const newAttribute = eventTarget.enclosingNodeOrSelfWithClass("add-attribute");
    if (newAttribute) {
      return this.addNewAttribute();
    }
    return false;
  }
  showContextMenu(event) {
    this.treeOutline && void this.treeOutline.showContextMenu(this, event);
  }
  async populateTagContextMenu(contextMenu, event) {
    const treeElement = this.isClosingTag() && this.treeOutline ? this.treeOutline.findTreeElement(this.nodeInternal) : this;
    if (!treeElement) {
      return;
    }
    contextMenu.editSection().appendItem(i18nString11(UIStrings12.addAttribute), treeElement.addNewAttribute.bind(treeElement), { jslogContext: "add-attribute" });
    const target = event.target;
    const attribute = target.enclosingNodeOrSelfWithClass("webkit-html-attribute");
    const newAttribute = target.enclosingNodeOrSelfWithClass("add-attribute");
    if (attribute && !newAttribute) {
      contextMenu.editSection().appendItem(i18nString11(UIStrings12.editAttribute), this.startEditingAttribute.bind(this, attribute, target), { jslogContext: "edit-attribute" });
    }
    await this.populateNodeContextMenu(contextMenu);
    _ElementsTreeElement.populateForcedPseudoStateItems(contextMenu, treeElement.node());
    this.populateScrollIntoView(contextMenu);
    contextMenu.viewSection().appendItem(i18nString11(UIStrings12.focus), async () => {
      await this.nodeInternal.focus();
    }, { jslogContext: "focus" });
  }
  populatePseudoElementContextMenu(contextMenu) {
    if (this.childCount() !== 0) {
      this.populateExpandRecursively(contextMenu);
    }
    this.populateScrollIntoView(contextMenu);
  }
  populateExpandRecursively(contextMenu) {
    contextMenu.viewSection().appendItem(i18nString11(UIStrings12.expandRecursively), this.expandRecursively.bind(this), { jslogContext: "expand-recursively" });
  }
  populateScrollIntoView(contextMenu) {
    contextMenu.viewSection().appendItem(i18nString11(UIStrings12.scrollIntoView), () => this.nodeInternal.scrollIntoView(), { jslogContext: "scroll-into-view" });
  }
  async populateTextContextMenu(contextMenu, textNode) {
    if (!this.editing) {
      contextMenu.editSection().appendItem(i18nString11(UIStrings12.editText), this.startEditingTextNode.bind(this, textNode), { jslogContext: "edit-text" });
    }
    return await this.populateNodeContextMenu(contextMenu);
  }
  async populateNodeContextMenu(contextMenu) {
    const isEditable = this.hasEditableNode();
    if (isEditable && !this.editing) {
      contextMenu.editSection().appendItem(i18nString11(UIStrings12.editAsHtml), this.editAsHTML.bind(this), { jslogContext: "elements.edit-as-html" });
    }
    const isShadowRoot = this.nodeInternal.isShadowRoot();
    const createShortcut = UI16.KeyboardShortcut.KeyboardShortcut.shortcutToString.bind(null);
    const modifier = UI16.KeyboardShortcut.Modifiers.CtrlOrMeta.value;
    const treeOutline = this.treeOutline;
    if (!treeOutline) {
      return;
    }
    let menuItem;
    const openAiAssistanceId = "freestyler.element-panel-context";
    if (UI16.ActionRegistry.ActionRegistry.instance().hasAction(openAiAssistanceId)) {
      let appendSubmenuPromptAction = function(submenu2, action3, label, prompt, jslogContext) {
        submenu2.defaultSection().appendItem(label, () => {
          void action3.execute({ prompt });
          UI16.UIUtils.PromotionManager.instance().recordFeatureInteraction(openAiAssistanceId);
        }, { disabled: !action3.enabled(), jslogContext });
      };
      UI16.Context.Context.instance().setFlavor(SDK14.DOMModel.DOMNode, this.nodeInternal);
      const action2 = UI16.ActionRegistry.ActionRegistry.instance().getAction(openAiAssistanceId);
      const submenu = contextMenu.footerSection().appendSubMenuItem(action2.title(), false, openAiAssistanceId);
      submenu.defaultSection().appendAction(openAiAssistanceId, i18nString11(UIStrings12.startAChat));
      const submenuConfigs = [
        {
          condition: (props) => Boolean(props?.isFlex),
          items: [
            {
              label: i18nString11(UIStrings12.wrapTheseItems),
              prompt: "How can I make flex items wrap?",
              jslogContextSuffix: ".flex-wrap"
            },
            {
              label: i18nString11(UIStrings12.distributeItemsEvenly),
              prompt: "How do I distribute flex items evenly?",
              jslogContextSuffix: ".flex-distribute"
            },
            {
              label: i18nString11(UIStrings12.explainFlexbox),
              prompt: "What is flexbox?",
              jslogContextSuffix: ".flex-what"
            }
          ]
        },
        {
          condition: (props) => Boolean(props?.isGrid && !props?.isSubgrid),
          items: [
            {
              label: i18nString11(UIStrings12.alignItems),
              prompt: "How do I align items in a grid?",
              jslogContextSuffix: ".grid-align"
            },
            {
              label: i18nString11(UIStrings12.addPadding),
              prompt: "How to add spacing between grid items?",
              jslogContextSuffix: ".grid-gap"
            },
            {
              label: i18nString11(UIStrings12.explainGridLayout),
              prompt: "How does grid layout work?",
              jslogContextSuffix: ".grid-how"
            }
          ]
        },
        {
          condition: (props) => Boolean(props?.isSubgrid),
          items: [
            {
              label: i18nString11(UIStrings12.findGridDefinition),
              prompt: "Where is this grid defined?",
              jslogContextSuffix: ".subgrid-where"
            },
            {
              label: i18nString11(UIStrings12.changeParentProperties),
              prompt: "How to overwrite parent grid properties?",
              jslogContextSuffix: ".subgrid-override"
            },
            {
              label: i18nString11(UIStrings12.explainSubgrids),
              prompt: "How do subgrids work?",
              jslogContextSuffix: ".subgrid-how"
            }
          ]
        },
        {
          condition: (props) => Boolean(props?.hasScroll),
          items: [
            {
              label: i18nString11(UIStrings12.removeScrollbars),
              prompt: "How do I remove scrollbars for this element?",
              jslogContextSuffix: ".scroll-remove"
            },
            {
              label: i18nString11(UIStrings12.styleScrollbars),
              prompt: "How can I style a scrollbar?",
              jslogContextSuffix: ".scroll-style"
            },
            {
              label: i18nString11(UIStrings12.explainScrollbars),
              prompt: "Why does this element scroll?",
              jslogContextSuffix: ".scroll-why"
            }
          ]
        },
        {
          condition: (props) => Boolean(props?.isContainer),
          items: [
            {
              label: i18nString11(UIStrings12.explainContainerQueries),
              prompt: "What are container queries?",
              jslogContextSuffix: ".container-what"
            },
            {
              label: i18nString11(UIStrings12.explainContainerTypes),
              prompt: "How do I use container-type?",
              jslogContextSuffix: ".container-how"
            },
            {
              label: i18nString11(UIStrings12.explainContainerContext),
              prompt: "What's the container context for this element?",
              jslogContextSuffix: ".container-context"
            }
          ]
        },
        {
          // Default items
          condition: () => true,
          items: [
            {
              label: i18nString11(UIStrings12.assessVisibility),
              prompt: "Why isn\u2019t this element visible?",
              jslogContextSuffix: ".visibility"
            },
            {
              label: i18nString11(UIStrings12.centerElement),
              prompt: "How do I center this element?",
              jslogContextSuffix: ".center"
            }
          ]
        }
      ];
      const layoutProps = await this.nodeInternal.domModel().cssModel().getLayoutPropertiesFromComputedStyle(this.nodeInternal.id);
      const config = submenuConfigs.find((c) => c.condition(layoutProps));
      if (config) {
        for (const item2 of config.items) {
          appendSubmenuPromptAction(submenu, action2, item2.label, item2.prompt, openAiAssistanceId + item2.jslogContextSuffix);
        }
      }
    }
    menuItem = contextMenu.clipboardSection().appendItem(i18nString11(UIStrings12.cut), treeOutline.performCopyOrCut.bind(treeOutline, true, this.nodeInternal), { disabled: !this.hasEditableNode(), jslogContext: "cut" });
    menuItem.setShortcut(createShortcut("X", modifier));
    const copyMenu = contextMenu.clipboardSection().appendSubMenuItem(i18nString11(UIStrings12.copy), false, "copy");
    const section3 = copyMenu.section();
    if (!isShadowRoot) {
      menuItem = section3.appendItem(i18nString11(UIStrings12.copyOuterhtml), treeOutline.performCopyOrCut.bind(treeOutline, false, this.nodeInternal), { jslogContext: "copy-outer-html" });
      menuItem.setShortcut(createShortcut("V", modifier));
    }
    if (this.nodeInternal.nodeType() === Node.ELEMENT_NODE) {
      section3.appendItem(i18nString11(UIStrings12.copySelector), this.copyCSSPath.bind(this), { jslogContext: "copy-selector" });
      section3.appendItem(i18nString11(UIStrings12.copyJsPath), this.copyJSPath.bind(this), { disabled: !canGetJSPath(this.nodeInternal), jslogContext: "copy-js-path" });
      section3.appendItem(i18nString11(UIStrings12.copyStyles), this.copyStyles.bind(this), { jslogContext: "elements.copy-styles" });
    }
    if (!isShadowRoot) {
      section3.appendItem(i18nString11(UIStrings12.copyXpath), this.copyXPath.bind(this), { jslogContext: "copy-xpath" });
      section3.appendItem(i18nString11(UIStrings12.copyFullXpath), this.copyFullXPath.bind(this), { jslogContext: "copy-full-xpath" });
    }
    menuItem = copyMenu.clipboardSection().appendItem(i18nString11(UIStrings12.copyElement), treeOutline.performCopyOrCut.bind(treeOutline, false, this.nodeInternal, true), { jslogContext: "copy-element" });
    menuItem.setShortcut(createShortcut("C", modifier));
    if (!isShadowRoot) {
      const isRootElement = !this.nodeInternal.parentNode || this.nodeInternal.parentNode.nodeName() === "#document";
      menuItem = contextMenu.editSection().appendItem(i18nString11(UIStrings12.duplicateElement), treeOutline.duplicateNode.bind(treeOutline, this.nodeInternal), {
        disabled: this.nodeInternal.isInShadowTree() || isRootElement,
        jslogContext: "elements.duplicate-element"
      });
    }
    menuItem = contextMenu.clipboardSection().appendItem(i18nString11(UIStrings12.paste), treeOutline.pasteNode.bind(treeOutline, this.nodeInternal), { disabled: !treeOutline.canPaste(this.nodeInternal), jslogContext: "paste" });
    menuItem.setShortcut(createShortcut("V", modifier));
    menuItem = contextMenu.debugSection().appendCheckboxItem(i18nString11(UIStrings12.hideElement), treeOutline.toggleHideElement.bind(treeOutline, this.nodeInternal), { checked: treeOutline.isToggledToHidden(this.nodeInternal), jslogContext: "elements.hide-element" });
    menuItem.setShortcut(UI16.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction("elements.hide-element") || "");
    if (isEditable) {
      contextMenu.editSection().appendItem(i18nString11(UIStrings12.deleteElement), this.remove.bind(this), { jslogContext: "delete-element" });
    }
    this.populateExpandRecursively(contextMenu);
    contextMenu.viewSection().appendItem(i18nString11(UIStrings12.collapseChildren), this.collapseChildren.bind(this), { jslogContext: "collapse-children" });
    const deviceModeWrapperAction = new Emulation.DeviceModeWrapper.ActionDelegate();
    contextMenu.viewSection().appendItem(i18nString11(UIStrings12.captureNodeScreenshot), deviceModeWrapperAction.handleAction.bind(null, UI16.Context.Context.instance(), "emulation.capture-node-screenshot"), { jslogContext: "emulation.capture-node-screenshot" });
    if (this.nodeInternal.frameOwnerFrameId()) {
      contextMenu.viewSection().appendItem(i18nString11(UIStrings12.showFrameDetails), () => {
        const frameOwnerFrameId = this.nodeInternal.frameOwnerFrameId();
        if (frameOwnerFrameId) {
          const frame = SDK14.FrameManager.FrameManager.instance().getFrame(frameOwnerFrameId);
          void Common9.Revealer.reveal(frame);
        }
      }, { jslogContext: "show-frame-details" });
    }
  }
  startEditing() {
    if (!this.treeOutline || this.treeOutline.selectedDOMNode() !== this.nodeInternal) {
      return;
    }
    const listItem = this.listItemElement;
    if (isOpeningTag(this.tagTypeContext) && this.tagTypeContext.canAddAttributes) {
      const attribute = listItem.getElementsByClassName("webkit-html-attribute")[0];
      if (attribute) {
        return this.startEditingAttribute(attribute, attribute.getElementsByClassName("webkit-html-attribute-value")[0]);
      }
      return this.addNewAttribute();
    }
    if (this.nodeInternal.nodeType() === Node.TEXT_NODE) {
      const textNode = listItem.getElementsByClassName("webkit-html-text-node")[0];
      if (textNode) {
        return this.startEditingTextNode(textNode);
      }
    }
    return;
  }
  addNewAttribute() {
    const container = document.createElement("span");
    const attr = this.buildAttributeDOM(container, " ", "", null);
    attr.style.marginLeft = "2px";
    attr.style.marginRight = "2px";
    attr.setAttribute("jslog", `${VisualLogging8.value("new-attribute").track({ change: true, resize: true })}`);
    const tag = this.listItemElement.getElementsByClassName("webkit-html-tag")[0];
    this.insertInLastAttributePosition(tag, attr);
    attr.scrollIntoViewIfNeeded(true);
    return this.startEditingAttribute(attr, attr);
  }
  triggerEditAttribute(attributeName) {
    const attributeElements = this.listItemElement.getElementsByClassName("webkit-html-attribute-name");
    for (let i = 0, len = attributeElements.length; i < len; ++i) {
      if (attributeElements[i].textContent === attributeName) {
        for (let elem = attributeElements[i].nextSibling; elem; elem = elem.nextSibling) {
          if (elem.nodeType !== Node.ELEMENT_NODE) {
            continue;
          }
          if (elem.classList.contains("webkit-html-attribute-value")) {
            return this.startEditingAttribute(elem.parentElement, elem);
          }
        }
      }
    }
    return;
  }
  startEditingAttribute(attribute, elementForSelection) {
    console.assert(this.listItemElement.isAncestor(attribute));
    if (UI16.UIUtils.isBeingEdited(attribute)) {
      return true;
    }
    const attributeNameElement = attribute.getElementsByClassName("webkit-html-attribute-name")[0];
    if (!attributeNameElement) {
      return false;
    }
    const attributeName = attributeNameElement.textContent;
    const attributeValueElement = attribute.getElementsByClassName("webkit-html-attribute-value")[0];
    elementForSelection = attributeValueElement.isAncestor(elementForSelection) ? attributeValueElement : elementForSelection;
    function removeZeroWidthSpaceRecursive(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.nodeValue = node.nodeValue ? node.nodeValue.replace(/\u200B/g, "") : "";
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      for (let child = node.firstChild; child; child = child.nextSibling) {
        removeZeroWidthSpaceRecursive(child);
      }
    }
    const attributeValue = attributeName && attributeValueElement ? this.nodeInternal.getAttribute(attributeName)?.replaceAll('"', "&quot;") : void 0;
    if (attributeValue !== void 0) {
      attributeValueElement.setTextContentTruncatedIfNeeded(attributeValue, i18nString11(UIStrings12.valueIsTooLargeToEdit));
    }
    removeZeroWidthSpaceRecursive(attribute);
    const config = new UI16.InplaceEditor.Config(this.attributeEditingCommitted.bind(this), this.editingCancelled.bind(this), attributeName);
    function postKeyDownFinishHandler(event) {
      UI16.UIUtils.handleElementValueModifications(event, attribute);
      return "";
    }
    if (!Common9.ParsedURL.ParsedURL.fromString(attributeValueElement.textContent || "")) {
      config.setPostKeydownFinishHandler(postKeyDownFinishHandler);
    }
    this.updateEditorHandles(attribute, config);
    const componentSelection = this.listItemElement.getComponentSelection();
    componentSelection?.selectAllChildren(elementForSelection);
    return true;
  }
  startEditingTextNode(textNodeElement) {
    if (UI16.UIUtils.isBeingEdited(textNodeElement)) {
      return true;
    }
    let textNode = this.nodeInternal;
    if (textNode.nodeType() === Node.ELEMENT_NODE && textNode.firstChild) {
      textNode = textNode.firstChild;
    }
    const container = textNodeElement.enclosingNodeOrSelfWithClass("webkit-html-text-node");
    if (container) {
      container.textContent = textNode.nodeValue();
    }
    const config = new UI16.InplaceEditor.Config(this.textNodeEditingCommitted.bind(this, textNode), this.editingCancelled.bind(this), null);
    this.updateEditorHandles(textNodeElement, config);
    const componentSelection = this.listItemElement.getComponentSelection();
    componentSelection?.selectAllChildren(textNodeElement);
    return true;
  }
  startEditingTagName(tagNameElement) {
    if (!tagNameElement) {
      tagNameElement = this.listItemElement.getElementsByClassName("webkit-html-tag-name")[0];
      if (!tagNameElement) {
        return false;
      }
    }
    const tagName = tagNameElement.textContent;
    if (tagName !== null && EditTagBlocklist.has(tagName.toLowerCase())) {
      return false;
    }
    if (UI16.UIUtils.isBeingEdited(tagNameElement)) {
      return true;
    }
    const closingTagElement = this.distinctClosingTagElement();
    function keyupListener() {
      if (closingTagElement && tagNameElement) {
        closingTagElement.textContent = "</" + tagNameElement.textContent + ">";
      }
    }
    const keydownListener = (event) => {
      if (event.key !== " ") {
        return;
      }
      this.editing?.commit();
      event.consume(true);
    };
    function editingCommitted(element, newTagName, oldText, tagName2, moveDirection) {
      if (!tagNameElement) {
        return;
      }
      tagNameElement.removeEventListener("keyup", keyupListener, false);
      tagNameElement.removeEventListener("keydown", keydownListener, false);
      this.tagNameEditingCommitted(element, newTagName, oldText, tagName2, moveDirection);
    }
    function editingCancelled(element, tagName2) {
      if (!tagNameElement) {
        return;
      }
      tagNameElement.removeEventListener("keyup", keyupListener, false);
      tagNameElement.removeEventListener("keydown", keydownListener, false);
      this.editingCancelled(element, tagName2);
    }
    tagNameElement.addEventListener("keyup", keyupListener, false);
    tagNameElement.addEventListener("keydown", keydownListener, false);
    const config = new UI16.InplaceEditor.Config(editingCommitted.bind(this), editingCancelled.bind(this), tagName);
    this.updateEditorHandles(tagNameElement, config);
    const componentSelection = this.listItemElement.getComponentSelection();
    componentSelection?.selectAllChildren(tagNameElement);
    return true;
  }
  updateEditorHandles(element, config) {
    const editorHandles = UI16.InplaceEditor.InplaceEditor.startEditing(element, config);
    if (!editorHandles) {
      this.editing = null;
    } else {
      this.editing = {
        commit: editorHandles.commit,
        cancel: editorHandles.cancel,
        editor: void 0,
        resize: () => {
        }
      };
    }
  }
  async startEditingAsHTML(commitCallback, disposeCallback, maybeInitialValue) {
    if (maybeInitialValue === null) {
      return;
    }
    if (this.editing) {
      return;
    }
    const initialValue = convertUnicodeCharsToHTMLEntities(maybeInitialValue).text;
    this.htmlEditElement = document.createElement("div");
    this.htmlEditElement.className = "source-code elements-tree-editor";
    let child = this.listItemElement.firstChild;
    while (child) {
      child.style.display = "none";
      child = child.nextSibling;
    }
    if (this.childrenListElement) {
      this.childrenListElement.style.display = "none";
    }
    this.listItemElement.append(this.htmlEditElement);
    this.htmlEditElement.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.consume(true);
      }
    });
    const editor = new TextEditor.TextEditor.TextEditor(CodeMirror.EditorState.create({
      doc: initialValue,
      extensions: [
        CodeMirror.keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              this.editing?.commit();
              return true;
            }
          },
          {
            key: "Escape",
            run: () => {
              this.editing?.cancel();
              return true;
            }
          }
        ]),
        TextEditor.Config.baseConfiguration(initialValue),
        TextEditor.Config.closeBrackets.instance(),
        TextEditor.Config.autocompletion.instance(),
        CodeMirror.html.html({ autoCloseTags: false, selfClosingTags: true }),
        TextEditor.Config.domWordWrap.instance(),
        CodeMirror.EditorView.theme({
          "&.cm-editor": { maxHeight: "300px" },
          ".cm-scroller": { overflowY: "auto" }
        }),
        CodeMirror.EditorView.domEventHandlers({
          focusout: (event) => {
            const relatedTarget = event.relatedTarget;
            if (relatedTarget && !relatedTarget.isSelfOrDescendant(editor)) {
              this.editing?.commit();
            }
          }
        })
      ]
    }));
    this.editing = { commit: commit.bind(this), cancel: dispose.bind(this), editor, resize: resize.bind(this) };
    resize.call(this);
    this.htmlEditElement.appendChild(editor);
    editor.editor.focus();
    this.treeOutline?.setMultilineEditing(this.editing);
    function resize() {
      if (this.treeOutline && this.htmlEditElement) {
        this.htmlEditElement.style.width = this.treeOutline.visibleWidth() - this.computeLeftIndent() - 30 + "px";
      }
    }
    function commit() {
      if (this.editing?.editor) {
        commitCallback(initialValue, this.editing.editor.state.doc.toString());
      }
      dispose.call(this);
    }
    function dispose() {
      if (!this.editing?.editor) {
        return;
      }
      this.editing = null;
      if (this.htmlEditElement) {
        this.listItemElement.removeChild(this.htmlEditElement);
      }
      this.htmlEditElement = void 0;
      if (this.childrenListElement) {
        this.childrenListElement.style.removeProperty("display");
      }
      let child2 = this.listItemElement.firstChild;
      while (child2) {
        child2.style.removeProperty("display");
        child2 = child2.nextSibling;
      }
      if (this.treeOutline) {
        this.treeOutline.setMultilineEditing(null);
        this.treeOutline.focus();
      }
      disposeCallback();
    }
  }
  attributeEditingCommitted(element, newText, oldText, attributeName, moveDirection) {
    this.editing = null;
    const treeOutline = this.treeOutline;
    function moveToNextAttributeIfNeeded(error) {
      if (error) {
        this.editingCancelled(element, attributeName);
      }
      if (!moveDirection) {
        return;
      }
      if (treeOutline) {
        treeOutline.runPendingUpdates();
        treeOutline.focus();
      }
      const attributes = this.nodeInternal.attributes();
      for (let i = 0; i < attributes.length; ++i) {
        if (attributes[i].name !== attributeName) {
          continue;
        }
        if (moveDirection === "backward") {
          if (i === 0) {
            this.startEditingTagName();
          } else {
            this.triggerEditAttribute(attributes[i - 1].name);
          }
        } else if (i === attributes.length - 1) {
          this.addNewAttribute();
        } else {
          this.triggerEditAttribute(attributes[i + 1].name);
        }
        return;
      }
      if (moveDirection === "backward") {
        if (newText === " ") {
          if (attributes.length > 0) {
            this.triggerEditAttribute(attributes[attributes.length - 1].name);
          }
        } else if (attributes.length > 1) {
          this.triggerEditAttribute(attributes[attributes.length - 2].name);
        }
      } else if (moveDirection === "forward") {
        if (!Platform7.StringUtilities.isWhitespace(newText)) {
          this.addNewAttribute();
        } else {
          this.startEditingTagName();
        }
      }
    }
    if (attributeName !== null && (attributeName.trim() || newText.trim()) && oldText !== newText) {
      this.nodeInternal.setAttribute(attributeName, newText, moveToNextAttributeIfNeeded.bind(this));
      Badges3.UserBadges.instance().recordAction(Badges3.BadgeAction.DOM_ELEMENT_OR_ATTRIBUTE_EDITED);
      return;
    }
    this.updateTitle();
    moveToNextAttributeIfNeeded.call(this);
  }
  tagNameEditingCommitted(element, newText, oldText, tagName, moveDirection) {
    this.editing = null;
    const self = this;
    function cancel() {
      const closingTagElement = self.distinctClosingTagElement();
      if (closingTagElement) {
        closingTagElement.textContent = "</" + tagName + ">";
      }
      self.editingCancelled(element, tagName);
      moveToNextAttributeIfNeeded.call(self);
    }
    function moveToNextAttributeIfNeeded() {
      if (moveDirection !== "forward") {
        this.addNewAttribute();
        return;
      }
      const attributes = this.nodeInternal.attributes();
      if (attributes.length > 0) {
        this.triggerEditAttribute(attributes[0].name);
      } else {
        this.addNewAttribute();
      }
    }
    newText = newText.trim();
    if (newText === oldText) {
      cancel();
      return;
    }
    const treeOutline = this.treeOutline;
    const wasExpanded = this.expanded;
    this.nodeInternal.setNodeName(newText, (error, newNode) => {
      if (error || !newNode) {
        cancel();
        return;
      }
      if (!treeOutline) {
        return;
      }
      Badges3.UserBadges.instance().recordAction(Badges3.BadgeAction.DOM_ELEMENT_OR_ATTRIBUTE_EDITED);
      const newTreeItem = treeOutline.selectNodeAfterEdit(wasExpanded, error, newNode);
      moveToNextAttributeIfNeeded.call(newTreeItem);
    });
  }
  textNodeEditingCommitted(textNode, _element, newText) {
    this.editing = null;
    function callback() {
      this.updateTitle();
    }
    textNode.setNodeValue(newText, callback.bind(this));
  }
  editingCancelled(_element, _tagName) {
    this.editing = null;
    this.updateTitle();
  }
  distinctClosingTagElement() {
    if (this.expanded) {
      const closers = this.childrenListElement.querySelectorAll(".close");
      return closers[closers.length - 1];
    }
    const tags = this.listItemElement.getElementsByClassName("webkit-html-tag");
    return tags.length === 1 ? null : tags[tags.length - 1];
  }
  updateTitle(updateRecord) {
    if (this.editing) {
      return;
    }
    this.#nodeInfo = this.nodeTitleInfo(updateRecord || null);
    if (this.nodeInternal.nodeType() === Node.DOCUMENT_FRAGMENT_NODE && this.nodeInternal.isInShadowTree() && this.nodeInternal.shadowRootType()) {
      this.childrenListElement.classList.add("shadow-root");
      let depth = 4;
      for (let node = this.nodeInternal; depth && node; node = node.parentNode) {
        if (node.nodeType() === Node.DOCUMENT_FRAGMENT_NODE) {
          depth--;
        }
      }
      if (!depth) {
        this.childrenListElement.classList.add("shadow-root-deep");
      } else {
        this.childrenListElement.classList.add("shadow-root-depth-" + depth);
      }
    }
    this.performUpdate();
    this.title = this.contentElement;
    this.updateDecorations();
    if (this.selected) {
      this.createSelection();
      this.createHint();
    }
    for (const issue of this.#elementIssues.values()) {
      this.#applyIssueStyleAndTooltip(issue);
    }
    this.#highlightSearchResults();
  }
  computeLeftIndent() {
    let treeElement = this.parent;
    let depth = 0;
    while (treeElement !== null) {
      depth++;
      treeElement = treeElement.parent;
    }
    return 12 * (depth - 2) + (this.isExpandable() && this.isCollapsible() ? 1 : 12);
  }
  updateDecorations() {
    const indent = this.computeLeftIndent();
    this.gutterContainer.style.left = -indent + "px";
    this.listItemElement.style.setProperty("--indent", indent + "px");
    if (this.isClosingTag()) {
      return;
    }
    if (this.nodeInternal.nodeType() !== Node.ELEMENT_NODE) {
      return;
    }
    void this.decorationsThrottler.schedule(this.#updateDecorations.bind(this));
  }
  #updateDecorations() {
    if (!this.treeOutline) {
      return Promise.resolve();
    }
    const node = this.nodeInternal;
    if (!this.treeOutline.decoratorExtensions) {
      this.treeOutline.decoratorExtensions = getRegisteredDecorators();
    }
    const markerToExtension = /* @__PURE__ */ new Map();
    for (const decoratorExtension of this.treeOutline.decoratorExtensions) {
      markerToExtension.set(decoratorExtension.marker, decoratorExtension);
    }
    const promises = [];
    const decorations = [];
    const descendantDecorations = [];
    node.traverseMarkers(visitor);
    function visitor(n, marker) {
      const extension = markerToExtension.get(marker);
      if (!extension) {
        return;
      }
      promises.push(Promise.resolve(extension.decorator()).then(collectDecoration.bind(null, n)));
    }
    function collectDecoration(n, decorator) {
      const decoration = decorator.decorate(n);
      if (!decoration) {
        return;
      }
      (n === node ? decorations : descendantDecorations).push(decoration);
    }
    return Promise.all(promises).then(updateDecorationsUI.bind(this));
    function updateDecorationsUI() {
      this.decorationsElement.removeChildren();
      this.decorationsElement.classList.add("hidden");
      this.gutterContainer.classList.toggle("has-decorations", Boolean(decorations.length || descendantDecorations.length));
      UI16.ARIAUtils.setLabel(this.decorationsElement, "");
      if (!decorations.length && !descendantDecorations.length) {
        return;
      }
      const colors = /* @__PURE__ */ new Set();
      const titles = document.createElement("div");
      for (const decoration of decorations) {
        const titleElement = titles.createChild("div");
        titleElement.textContent = decoration.title;
        colors.add(decoration.color);
      }
      if (this.expanded && !decorations.length) {
        return;
      }
      const descendantColors = /* @__PURE__ */ new Set();
      if (descendantDecorations.length) {
        let element = titles.createChild("div");
        element.textContent = i18nString11(UIStrings12.children);
        for (const decoration of descendantDecorations) {
          element = titles.createChild("div");
          element.style.marginLeft = "15px";
          element.textContent = decoration.title;
          descendantColors.add(decoration.color);
        }
      }
      let offset = 0;
      processColors.call(this, colors, "elements-gutter-decoration");
      if (!this.expanded) {
        processColors.call(this, descendantColors, "elements-gutter-decoration elements-has-decorated-children");
      }
      UI16.Tooltip.Tooltip.install(this.decorationsElement, titles.textContent);
      UI16.ARIAUtils.setLabel(this.decorationsElement, titles.textContent || "");
      function processColors(colors2, className) {
        for (const color of colors2) {
          const child = this.decorationsElement.createChild("div", className);
          this.decorationsElement.classList.remove("hidden");
          child.style.backgroundColor = color;
          child.style.borderColor = color;
          if (offset) {
            child.style.marginLeft = offset + "px";
          }
          offset += 3;
        }
      }
    }
  }
  buildAttributeDOM(parentElement, name, value5, updateRecord, forceValue, node) {
    const closingPunctuationRegex = /[\/;:\)\]\}]/g;
    let highlightIndex = 0;
    let highlightCount = 0;
    let additionalHighlightOffset = 0;
    function setValueWithEntities(element, value6) {
      const result = convertUnicodeCharsToHTMLEntities(value6);
      highlightCount = result.entityRanges.length;
      value6 = result.text.replace(closingPunctuationRegex, (match, replaceOffset) => {
        while (highlightIndex < highlightCount && result.entityRanges[highlightIndex].offset < replaceOffset) {
          result.entityRanges[highlightIndex].offset += additionalHighlightOffset;
          ++highlightIndex;
        }
        additionalHighlightOffset += 1;
        return match + "\u200B";
      });
      while (highlightIndex < highlightCount) {
        result.entityRanges[highlightIndex].offset += additionalHighlightOffset;
        ++highlightIndex;
      }
      element.setTextContentTruncatedIfNeeded(value6);
      Highlighting2.highlightRangesWithStyleClass(element, result.entityRanges, "webkit-html-entity-value");
    }
    const hasText = forceValue || value5.length > 0;
    const attrSpanElement = parentElement.createChild("span", "webkit-html-attribute");
    attrSpanElement.setAttribute("jslog", `${VisualLogging8.value(name === "style" ? "style-attribute" : "attribute").track({
      change: true,
      dblclick: true
    })}`);
    const attrNameElement = attrSpanElement.createChild("span", "webkit-html-attribute-name");
    attrNameElement.textContent = name;
    if (hasText) {
      UI16.UIUtils.createTextChild(attrSpanElement, '=\u200B"');
    }
    const attrValueElement = attrSpanElement.createChild("span", "webkit-html-attribute-value");
    if (updateRecord?.isAttributeModified(name)) {
      UI16.UIUtils.runCSSAnimationOnce(hasText ? attrValueElement : attrNameElement, "dom-update-highlight");
    }
    function linkifyValue(value6) {
      const rewrittenHref = node ? node.resolveURL(value6) : null;
      if (rewrittenHref === null) {
        const span = document.createElement("span");
        setValueWithEntities.call(this, span, value6);
        return span;
      }
      value6 = value6.replace(closingPunctuationRegex, "$&\u200B");
      if (value6.startsWith("data:")) {
        value6 = Platform7.StringUtilities.trimMiddle(value6, 60);
      }
      const link2 = node && node.nodeName().toLowerCase() === "a" ? UI16.XLink.XLink.create(rewrittenHref, value6, "", true, "image-url") : Components6.Linkifier.Linkifier.linkifyURL(rewrittenHref, {
        text: value6,
        preventClick: true,
        showColumnNumber: false,
        inlineFrameIndex: 0
      });
      return ImagePreviewPopover.setImageUrl(link2, rewrittenHref);
    }
    const nodeName = node ? node.nodeName().toLowerCase() : "";
    if (nodeName && (name === "src" || name === "href") && value5) {
      attrValueElement.appendChild(linkifyValue.call(this, value5));
    } else if ((nodeName === "img" || nodeName === "source") && name === "srcset") {
      attrValueElement.appendChild(linkifySrcset.call(this, value5));
    } else if (nodeName === "image" && (name === "xlink:href" || name === "href")) {
      attrValueElement.appendChild(linkifySrcset.call(this, value5));
    } else {
      setValueWithEntities.call(this, attrValueElement, value5);
    }
    switch (name) {
      case "popovertarget": {
        const linkedPart = value5 ? attrValueElement : attrNameElement;
        void this.linkifyElementByRelation(linkedPart, "PopoverTarget", i18nString11(UIStrings12.showPopoverTarget));
        break;
      }
      case "interesttarget": {
        const linkedPart = value5 ? attrValueElement : attrNameElement;
        void this.linkifyElementByRelation(linkedPart, "InterestTarget", i18nString11(UIStrings12.showInterestTarget));
        break;
      }
      case "commandfor": {
        const linkedPart = value5 ? attrValueElement : attrNameElement;
        void this.linkifyElementByRelation(linkedPart, "CommandFor", i18nString11(UIStrings12.showCommandForTarget));
        break;
      }
    }
    if (hasText) {
      UI16.UIUtils.createTextChild(attrSpanElement, '"');
    }
    function linkifySrcset(value6) {
      const fragment = document.createDocumentFragment();
      let i = 0;
      while (value6.length) {
        if (i++ > 0) {
          UI16.UIUtils.createTextChild(fragment, " ");
        }
        value6 = value6.trim();
        let url = "";
        let descriptor = "";
        const indexOfSpace = value6.search(/\s/);
        if (indexOfSpace === -1) {
          url = value6;
        } else if (indexOfSpace > 0 && value6[indexOfSpace - 1] === ",") {
          url = value6.substring(0, indexOfSpace);
        } else {
          url = value6.substring(0, indexOfSpace);
          const indexOfComma = value6.indexOf(",", indexOfSpace);
          if (indexOfComma !== -1) {
            descriptor = value6.substring(indexOfSpace, indexOfComma + 1);
          } else {
            descriptor = value6.substring(indexOfSpace);
          }
        }
        if (url) {
          if (url.endsWith(",")) {
            fragment.appendChild(linkifyValue.call(this, url.substring(0, url.length - 1)));
            UI16.UIUtils.createTextChild(fragment, ",");
          } else {
            fragment.appendChild(linkifyValue.call(this, url));
          }
        }
        if (descriptor) {
          UI16.UIUtils.createTextChild(fragment, descriptor);
        }
        value6 = value6.substring(url.length + descriptor.length);
      }
      return fragment;
    }
    return attrSpanElement;
  }
  async linkifyElementByRelation(linkContainer, relation, tooltip) {
    const relatedElementId = await this.nodeInternal.domModel().getElementByRelation(this.nodeInternal.id, relation);
    const relatedElement = this.nodeInternal.domModel().nodeForId(relatedElementId);
    if (!relatedElement) {
      return;
    }
    const link2 = PanelsCommon3.DOMLinkifier.Linkifier.instance().linkify(relatedElement, {
      preventKeyboardFocus: true,
      tooltip,
      textContent: linkContainer.textContent || void 0,
      isDynamicLink: true
    });
    linkContainer.removeChildren();
    linkContainer.append(link2);
  }
  buildPseudoElementDOM(parentElement, pseudoElementName) {
    const pseudoElement = parentElement.createChild("span", "webkit-html-pseudo-element");
    pseudoElement.textContent = pseudoElementName;
    UI16.UIUtils.createTextChild(parentElement, "\u200B");
  }
  buildTagDOM(parentElement, tagName, isClosingTag, isDistinctTreeElement, updateRecord) {
    const node = this.nodeInternal;
    const classes = ["webkit-html-tag"];
    if (isClosingTag && isDistinctTreeElement) {
      classes.push("close");
    }
    const tagElement = parentElement.createChild("span", classes.join(" "));
    UI16.UIUtils.createTextChild(tagElement, "<");
    const tagNameElement = tagElement.createChild("span", isClosingTag ? "webkit-html-close-tag-name" : "webkit-html-tag-name");
    if (!isClosingTag) {
      tagNameElement.setAttribute("jslog", `${VisualLogging8.value("tag-name").track({ change: true, dblclick: true })}`);
    }
    tagNameElement.textContent = (isClosingTag ? "/" : "") + tagName;
    if (!isClosingTag) {
      if (node.hasAttributes()) {
        const attributes = node.attributes();
        for (let i = 0; i < attributes.length; ++i) {
          const attr = attributes[i];
          UI16.UIUtils.createTextChild(tagElement, " ");
          this.buildAttributeDOM(tagElement, attr.name, attr.value, updateRecord, false, node);
        }
      }
      if (updateRecord) {
        let hasUpdates = updateRecord.hasRemovedAttributes() || updateRecord.hasRemovedChildren();
        hasUpdates = hasUpdates || !this.expanded && updateRecord.hasChangedChildren();
        if (hasUpdates) {
          UI16.UIUtils.runCSSAnimationOnce(tagNameElement, "dom-update-highlight");
        }
      }
    }
    UI16.UIUtils.createTextChild(tagElement, ">");
    UI16.UIUtils.createTextChild(parentElement, "\u200B");
    if (tagElement.textContent) {
      UI16.ARIAUtils.setLabel(tagElement, tagElement.textContent);
    }
  }
  nodeTitleInfo(updateRecord) {
    const node = this.nodeInternal;
    const titleDOM = document.createDocumentFragment();
    const updateSearchHighlight = () => {
      this.#highlightSearchResults();
    };
    switch (node.nodeType()) {
      case Node.ATTRIBUTE_NODE:
        this.buildAttributeDOM(titleDOM, node.name, node.value, updateRecord, true);
        break;
      case Node.ELEMENT_NODE: {
        if (node.pseudoType()) {
          let pseudoElementName = node.nodeName();
          const pseudoIdentifier = node.pseudoIdentifier();
          if (pseudoIdentifier) {
            pseudoElementName += `(${pseudoIdentifier})`;
          }
          this.buildPseudoElementDOM(titleDOM, pseudoElementName);
          break;
        }
        const tagName = node.nodeNameInCorrectCase();
        if (this.isClosingTag()) {
          this.buildTagDOM(titleDOM, tagName, true, true, updateRecord);
          break;
        }
        this.buildTagDOM(titleDOM, tagName, false, false, updateRecord);
        if (this.isExpandable()) {
          if (!this.expanded) {
            const expandButton = new ElementsComponents5.ElementsTreeExpandButton.ElementsTreeExpandButton();
            expandButton.data = {
              clickHandler: () => this.expand()
            };
            titleDOM.appendChild(expandButton);
            const hidden = document.createElement("span");
            hidden.textContent = "\u2026";
            hidden.style.fontSize = "0";
            titleDOM.appendChild(hidden);
            UI16.UIUtils.createTextChild(titleDOM, "\u200B");
            this.buildTagDOM(titleDOM, tagName, true, false, updateRecord);
          }
          break;
        }
        if (_ElementsTreeElement.canShowInlineText(node)) {
          const textNodeElement = titleDOM.createChild("span", "webkit-html-text-node");
          textNodeElement.setAttribute("jslog", `${VisualLogging8.value("text-node").track({ change: true, dblclick: true })}`);
          const firstChild = node.firstChild;
          if (!firstChild) {
            throw new Error("ElementsTreeElement._nodeTitleInfo expects node.firstChild to be defined.");
          }
          const result = convertUnicodeCharsToHTMLEntities(firstChild.nodeValue());
          textNodeElement.textContent = Platform7.StringUtilities.collapseWhitespace(result.text);
          Highlighting2.highlightRangesWithStyleClass(textNodeElement, result.entityRanges, "webkit-html-entity-value");
          UI16.UIUtils.createTextChild(titleDOM, "\u200B");
          this.buildTagDOM(titleDOM, tagName, true, false, updateRecord);
          if (updateRecord?.hasChangedChildren()) {
            UI16.UIUtils.runCSSAnimationOnce(textNodeElement, "dom-update-highlight");
          }
          if (updateRecord?.isCharDataModified()) {
            UI16.UIUtils.runCSSAnimationOnce(textNodeElement, "dom-update-highlight");
          }
          break;
        }
        if (this.treeOutline?.isXMLMimeType || !ForbiddenClosingTagElements.has(tagName)) {
          this.buildTagDOM(titleDOM, tagName, true, false, updateRecord);
        }
        break;
      }
      case Node.TEXT_NODE:
        if (node.parentNode && node.parentNode.nodeName().toLowerCase() === "script") {
          const newNode = titleDOM.createChild("span", "webkit-html-text-node webkit-html-js-node");
          newNode.setAttribute("jslog", `${VisualLogging8.value("script-text-node").track({ change: true, dblclick: true })}`);
          const text = node.nodeValue();
          newNode.textContent = text.replace(/^[\n\r]+|\s+$/g, "");
          void CodeHighlighter3.CodeHighlighter.highlightNode(newNode, "text/javascript").then(updateSearchHighlight);
        } else if (node.parentNode && node.parentNode.nodeName().toLowerCase() === "style") {
          const newNode = titleDOM.createChild("span", "webkit-html-text-node webkit-html-css-node");
          newNode.setAttribute("jslog", `${VisualLogging8.value("css-text-node").track({ change: true, dblclick: true })}`);
          const text = node.nodeValue();
          newNode.textContent = text.replace(/^[\n\r]+|\s+$/g, "");
          void CodeHighlighter3.CodeHighlighter.highlightNode(newNode, "text/css").then(updateSearchHighlight);
        } else {
          UI16.UIUtils.createTextChild(titleDOM, '"');
          const textNodeElement = titleDOM.createChild("span", "webkit-html-text-node");
          textNodeElement.setAttribute("jslog", `${VisualLogging8.value("text-node").track({ change: true, dblclick: true })}`);
          const result = convertUnicodeCharsToHTMLEntities(node.nodeValue());
          textNodeElement.textContent = Platform7.StringUtilities.collapseWhitespace(result.text);
          Highlighting2.highlightRangesWithStyleClass(textNodeElement, result.entityRanges, "webkit-html-entity-value");
          UI16.UIUtils.createTextChild(titleDOM, '"');
          if (updateRecord?.isCharDataModified()) {
            UI16.UIUtils.runCSSAnimationOnce(textNodeElement, "dom-update-highlight");
          }
        }
        break;
      case Node.COMMENT_NODE: {
        const commentElement = titleDOM.createChild("span", "webkit-html-comment");
        UI16.UIUtils.createTextChild(commentElement, "<!--" + node.nodeValue() + "-->");
        break;
      }
      case Node.DOCUMENT_TYPE_NODE: {
        const docTypeElement = titleDOM.createChild("span", "webkit-html-doctype");
        UI16.UIUtils.createTextChild(docTypeElement, "<!DOCTYPE " + node.nodeName());
        if (node.publicId) {
          UI16.UIUtils.createTextChild(docTypeElement, ' PUBLIC "' + node.publicId + '"');
          if (node.systemId) {
            UI16.UIUtils.createTextChild(docTypeElement, ' "' + node.systemId + '"');
          }
        } else if (node.systemId) {
          UI16.UIUtils.createTextChild(docTypeElement, ' SYSTEM "' + node.systemId + '"');
        }
        if (node.internalSubset) {
          UI16.UIUtils.createTextChild(docTypeElement, " [" + node.internalSubset + "]");
        }
        UI16.UIUtils.createTextChild(docTypeElement, ">");
        break;
      }
      case Node.CDATA_SECTION_NODE: {
        const cdataElement = titleDOM.createChild("span", "webkit-html-text-node");
        UI16.UIUtils.createTextChild(cdataElement, "<![CDATA[" + node.nodeValue() + "]]>");
        break;
      }
      case Node.DOCUMENT_NODE: {
        const documentElement = titleDOM.createChild("span");
        UI16.UIUtils.createTextChild(documentElement, "#document (");
        const text = node.documentURL;
        documentElement.appendChild(Components6.Linkifier.Linkifier.linkifyURL(text, {
          text,
          preventClick: true,
          showColumnNumber: false,
          inlineFrameIndex: 0
        }));
        UI16.UIUtils.createTextChild(documentElement, ")");
        break;
      }
      case Node.DOCUMENT_FRAGMENT_NODE: {
        const fragmentElement = titleDOM.createChild("span", "webkit-html-fragment");
        fragmentElement.textContent = Platform7.StringUtilities.collapseWhitespace(node.nodeNameInCorrectCase());
        break;
      }
      default: {
        const nameWithSpaceCollapsed = Platform7.StringUtilities.collapseWhitespace(node.nodeNameInCorrectCase());
        UI16.UIUtils.createTextChild(titleDOM, nameWithSpaceCollapsed);
      }
    }
    return titleDOM;
  }
  async remove() {
    if (this.treeOutline?.isToggledToHidden(this.nodeInternal)) {
      await this.treeOutline.toggleHideElement(this.nodeInternal);
    }
    if (this.nodeInternal.pseudoType()) {
      return;
    }
    const parentElement = this.parent;
    if (!parentElement) {
      return;
    }
    if (!this.nodeInternal.parentNode || this.nodeInternal.parentNode.nodeType() === Node.DOCUMENT_NODE) {
      return;
    }
    void this.nodeInternal.removeNode();
  }
  toggleEditAsHTML(callback, startEditing) {
    if (this.editing && this.htmlEditElement) {
      this.editing.commit();
      return;
    }
    if (startEditing === false) {
      return;
    }
    function selectNode(error) {
      if (callback) {
        callback(!error);
      }
    }
    function commitChange(initialValue, value5) {
      if (initialValue !== value5) {
        node.setOuterHTML(value5, selectNode);
      }
    }
    function disposeCallback() {
      if (callback) {
        callback(false);
      }
    }
    const node = this.nodeInternal;
    void node.getOuterHTML().then(this.startEditingAsHTML.bind(this, commitChange, disposeCallback));
  }
  copyCSSPath() {
    Host4.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(cssPath(this.nodeInternal, true));
  }
  copyJSPath() {
    Host4.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(jsPath(this.nodeInternal, true));
  }
  copyXPath() {
    Host4.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(xPath(this.nodeInternal, true));
  }
  copyFullXPath() {
    Host4.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(xPath(this.nodeInternal, false));
  }
  async copyStyles() {
    const node = this.nodeInternal;
    const cssModel = node.domModel().cssModel();
    const cascade = await cssModel.cachedMatchedCascadeForNode(node);
    if (!cascade) {
      return;
    }
    const indent = Common9.Settings.Settings.instance().moduleSetting("text-editor-indent").get();
    const lines = [];
    for (const style of cascade.nodeStyles().reverse()) {
      for (const property of style.leadingProperties()) {
        if (!property.parsedOk || property.disabled || !property.activeInStyle() || property.implicit) {
          continue;
        }
        if (cascade.isInherited(style) && !SDK14.CSSMetadata.cssMetadata().isPropertyInherited(property.name)) {
          continue;
        }
        if (style.parentRule?.isUserAgent()) {
          continue;
        }
        if (cascade.propertyState(property) !== "Active") {
          continue;
        }
        lines.push(`${indent}${property.name}: ${property.value};`);
      }
    }
    Host4.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(lines.join("\n"));
  }
  #highlightSearchResults() {
    this.hideSearchHighlights();
    if (!this.searchQuery) {
      return;
    }
    const text = this.listItemElement.textContent || "";
    const regexObject = Platform7.StringUtilities.createPlainTextSearchRegex(this.searchQuery, "gi");
    const matchRanges = [];
    let match = regexObject.exec(text);
    while (match) {
      matchRanges.push(new TextUtils6.TextRange.SourceRange(match.index, match[0].length));
      match = regexObject.exec(text);
    }
    if (!matchRanges.length) {
      matchRanges.push(new TextUtils6.TextRange.SourceRange(0, text.length));
    }
    this.#highlights = Highlighting2.HighlightManager.HighlightManager.instance().highlightOrderedTextRanges(this.listItemElement, matchRanges);
  }
  editAsHTML() {
    const promise = Common9.Revealer.reveal(this.node());
    void promise.then(() => {
      const action2 = UI16.ActionRegistry.ActionRegistry.instance().getAction("elements.edit-as-html");
      return action2.execute();
    });
  }
  // TODO: add unit tests for adorner-related methods after component and TypeScript works are done
  adorn({ name }, content) {
    let adornerContent = content;
    if (!adornerContent) {
      adornerContent = document.createElement("span");
      adornerContent.textContent = name;
    }
    const adorner2 = new Adorners.Adorner.Adorner();
    adorner2.data = {
      name,
      content: adornerContent,
      jslogContext: name
    };
    if (isOpeningTag(this.tagTypeContext)) {
      this.#adorners.add(adorner2);
      ElementsPanel.instance().registerAdorner(adorner2);
      this.updateAdorners();
    }
    return adorner2;
  }
  adornSlot({ name }) {
    const linkIcon = createIcon4("select-element");
    const slotText = document.createElement("span");
    slotText.textContent = name;
    const adornerContent = document.createElement("span");
    adornerContent.append(linkIcon);
    adornerContent.append(slotText);
    adornerContent.classList.add("adorner-with-icon");
    const adorner2 = new Adorners.Adorner.Adorner();
    adorner2.data = {
      name,
      content: adornerContent,
      jslogContext: "slot"
    };
    this.#adorners.add(adorner2);
    ElementsPanel.instance().registerAdorner(adorner2);
    this.updateAdorners();
    return adorner2;
  }
  removeAdorner(adornerToRemove) {
    ElementsPanel.instance().deregisterAdorner(adornerToRemove);
    adornerToRemove.remove();
    this.#adorners.delete(adornerToRemove);
    this.updateAdorners();
  }
  /**
   * @param adornerType optional type of adorner to remove. If not provided, remove all adorners.
   */
  removeAdornersByType(adornerType) {
    if (!isOpeningTag(this.tagTypeContext)) {
      return;
    }
    for (const adorner2 of this.#adorners) {
      if (adorner2.name === adornerType || !adornerType) {
        this.removeAdorner(adorner2);
      }
    }
  }
  updateAdorners() {
    void this.#adornersThrottler.schedule(this.#updateAdorners.bind(this));
  }
  async #updateAdorners() {
    if (this.isClosingTag()) {
      this.performUpdate();
      return;
    }
    const node = this.node();
    const nodeId = node.id;
    if (node.nodeType() !== Node.COMMENT_NODE && node.nodeType() !== Node.DOCUMENT_FRAGMENT_NODE && node.nodeType() !== Node.TEXT_NODE && nodeId !== void 0) {
      this.#layout = await node.domModel().cssModel().getLayoutPropertiesFromComputedStyle(nodeId);
    } else {
      this.#layout = null;
    }
    this.performUpdate();
  }
  // TODO: remove in favour of updateAdorners.
  async updateStyleAdorners() {
    if (!isOpeningTag(this.tagTypeContext)) {
      return;
    }
    const node = this.node();
    const nodeId = node.id;
    if (node.nodeType() === Node.COMMENT_NODE || node.nodeType() === Node.DOCUMENT_FRAGMENT_NODE || node.nodeType() === Node.TEXT_NODE || nodeId === void 0) {
      return;
    }
    const layout = await node.domModel().cssModel().getLayoutPropertiesFromComputedStyle(nodeId);
    this.removeAdornersByType(ElementsComponents5.AdornerManager.RegisteredAdorners.SUBGRID);
    this.removeAdornersByType(ElementsComponents5.AdornerManager.RegisteredAdorners.GRID);
    this.removeAdornersByType(ElementsComponents5.AdornerManager.RegisteredAdorners.GRID_LANES);
    this.removeAdornersByType(ElementsComponents5.AdornerManager.RegisteredAdorners.FLEX);
    this.removeAdornersByType(ElementsComponents5.AdornerManager.RegisteredAdorners.SCROLL_SNAP);
    this.removeAdornersByType(ElementsComponents5.AdornerManager.RegisteredAdorners.MEDIA);
    this.removeAdornersByType(ElementsComponents5.AdornerManager.RegisteredAdorners.STARTING_STYLE);
    if (layout) {
      if (layout.hasScroll) {
        this.pushScrollSnapAdorner();
      }
    }
    if (Root6.Runtime.hostConfig.devToolsStartingStyleDebugging?.enabled) {
      const affectedByStartingStyles = node.affectedByStartingStyles();
      if (affectedByStartingStyles) {
        this.pushStartingStyleAdorner();
      }
    }
  }
  async #onPopoverAdornerClick(event) {
    event.stopPropagation();
    const node = this.node();
    const nodeId = node.id;
    if (!nodeId) {
      return;
    }
    await node.domModel().agent.invoke_forceShowPopover({ nodeId, enable: !this.#popoverAdornerActive });
    this.#popoverAdornerActive = !this.#popoverAdornerActive;
    if (this.#popoverAdornerActive) {
      Badges3.UserBadges.instance().recordAction(Badges3.BadgeAction.MODERN_DOM_BADGE_CLICKED);
    }
    this.performUpdate();
  }
  pushScrollSnapAdorner() {
    const node = this.node();
    const nodeId = node.id;
    if (!nodeId) {
      return;
    }
    const config = ElementsComponents5.AdornerManager.getRegisteredAdorner(ElementsComponents5.AdornerManager.RegisteredAdorners.SCROLL_SNAP);
    const adorner2 = this.adorn(config);
    adorner2.classList.add("scroll-snap");
    const onClick = () => {
      const model = node.domModel().overlayModel();
      if (adorner2.isActive()) {
        model.highlightScrollSnapInPersistentOverlay(nodeId);
      } else {
        model.hideScrollSnapInPersistentOverlay(nodeId);
      }
    };
    adorner2.addInteraction(onClick, {
      isToggle: true,
      shouldPropagateOnKeydown: false,
      ariaLabelDefault: i18nString11(UIStrings12.enableScrollSnap),
      ariaLabelActive: i18nString11(UIStrings12.disableScrollSnap)
    });
    node.domModel().overlayModel().addEventListener("PersistentScrollSnapOverlayStateChanged", (event) => {
      const { nodeId: eventNodeId, enabled } = event.data;
      if (eventNodeId !== nodeId) {
        return;
      }
      adorner2.toggle(enabled);
    });
    this.#adorners.add(adorner2);
    if (node.domModel().overlayModel().isHighlightedScrollSnapInPersistentOverlay(nodeId)) {
      adorner2.toggle(true);
    }
  }
  pushStartingStyleAdorner() {
    const node = this.node();
    const nodeId = node.id;
    if (!nodeId) {
      return;
    }
    const config = ElementsComponents5.AdornerManager.getRegisteredAdorner(ElementsComponents5.AdornerManager.RegisteredAdorners.STARTING_STYLE);
    const adorner2 = this.adorn(config);
    adorner2.classList.add("starting-style");
    const onClick = () => {
      const model = node.domModel().cssModel();
      if (adorner2.isActive()) {
        model.forceStartingStyle(node, true);
      } else {
        model.forceStartingStyle(node, false);
      }
    };
    adorner2.addInteraction(onClick, {
      isToggle: true,
      shouldPropagateOnKeydown: false,
      ariaLabelDefault: i18nString11(UIStrings12.enableStartingStyle),
      ariaLabelActive: i18nString11(UIStrings12.disableStartingStyle)
    });
    this.#adorners.add(adorner2);
  }
  updateScrollAdorner() {
    if (!isOpeningTag(this.tagTypeContext)) {
      return;
    }
    const scrollAdorner = this.#adorners.values().find((x) => x.name === ElementsComponents5.AdornerManager.RegisteredAdorners.SCROLL);
    const needsAScrollAdorner = this.node().nodeName() === "HTML" && this.node().ownerDocument?.isScrollable() || this.node().nodeName() !== "#document" && this.node().isScrollable();
    if (needsAScrollAdorner && !scrollAdorner) {
      this.pushScrollAdorner();
    } else if (!needsAScrollAdorner && scrollAdorner) {
      this.removeAdorner(scrollAdorner);
    }
  }
  pushScrollAdorner() {
    const config = ElementsComponents5.AdornerManager.getRegisteredAdorner(ElementsComponents5.AdornerManager.RegisteredAdorners.SCROLL);
    const adorner2 = this.adorn(config);
    UI16.Tooltip.Tooltip.install(adorner2, i18nString11(UIStrings12.elementHasScrollableOverflow));
    adorner2.classList.add("scroll");
  }
};
var InitialChildrenLimit = 500;
var ForbiddenClosingTagElements = /* @__PURE__ */ new Set([
  "area",
  "base",
  "basefont",
  "br",
  "canvas",
  "col",
  "command",
  "embed",
  "frame",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "menuitem",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
var EditTagBlocklist = /* @__PURE__ */ new Set(["html", "head", "body"]);
function adornerComparator(adornerA, adornerB) {
  const compareCategories = ElementsComponents5.AdornerManager.compareAdornerNamesByCategory(adornerB.name, adornerB.name);
  if (compareCategories === 0) {
    return adornerA.name.localeCompare(adornerB.name);
  }
  return compareCategories;
}
function convertUnicodeCharsToHTMLEntities(text) {
  let result = "";
  let lastIndexAfterEntity = 0;
  const entityRanges = [];
  const charToEntity = MappedCharToEntity;
  for (let i = 0, size = text.length; i < size; ++i) {
    const char = text.charAt(i);
    if (charToEntity.has(char)) {
      result += text.substring(lastIndexAfterEntity, i);
      const entityValue = "&" + charToEntity.get(char) + ";";
      entityRanges.push(new TextUtils6.TextRange.SourceRange(result.length, entityValue.length));
      result += entityValue;
      lastIndexAfterEntity = i + 1;
    }
  }
  if (result) {
    result += text.substring(lastIndexAfterEntity);
  }
  return { text: result || text, entityRanges };
}
function loggingParentProvider(e) {
  const treeElement = UI16.TreeOutline.TreeElement.getTreeElementBylistItemNode(e);
  return treeElement?.treeOutline?.contentElement;
}
VisualLogging8.registerParentProvider("elementsTreeOutline", loggingParentProvider);

// gen/front_end/panels/elements/elementsTreeOutline.css.js
var elementsTreeOutline_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.editing {
  box-shadow: var(--drop-shadow);
  background-color: var(--sys-color-cdt-base-container);
  text-overflow: clip !important; /* stylelint-disable-line declaration-no-important */
  padding-left: 2px;
  margin-left: -2px;
  padding-right: 2px;
  margin-right: -2px;
  margin-bottom: -1px;
  padding-bottom: 1px;
  opacity: 100% !important; /* stylelint-disable-line declaration-no-important */
}

.editing,
.editing * {
  color: var(--sys-color-on-surface) !important; /* stylelint-disable-line declaration-no-important */
  text-decoration: none !important; /* stylelint-disable-line declaration-no-important */
}

.editing br {
  display: none;
}

.adorner-reveal {
  vertical-align: middle;
  margin: 0 3px;
}

.adorner-with-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  height: 100%;

  devtools-icon {
    width: var(--sys-size-6);
    height: var(--sys-size-6);
    color: var(--icon-primary);
  }
}

.adorner-with-icon *:not(:last-child) {
  margin-right: 2px;
}

.elements-disclosure {
  width: 100%;
  display: inline-block;
  line-height: normal;
}

.elements-disclosure li {
  /** Keep margin-left & padding-left in sync with ElementsTreeElements.updateDecorations **/
  padding: 1px 0 0 14px;
  margin-left: -2px;
  word-break: normal;
  position: relative;
  min-height: 15px;
  line-height: 1.36;
  min-width: 200px;
}

.elements-disclosure li::after {
  content: "";
  position: absolute;
  inset: 0;
  left: calc(var(--indent) * -1);
  width: var(--indent);
}

.elements-disclosure li.parent {
  display: flex;
}

.elements-disclosure li.parent:not(.always-parent) {
  /** Keep it in sync with ElementsTreeElements.updateDecorations **/
  margin-left: -12px;
}

.elements-disclosure li .ai-button-container {
  display: none;
  margin-left: 1ch;
  overflow: visible;
  max-height: var(--sys-size-6);
  vertical-align: top;
  margin-top: -1px;
  position: absolute;
  right: var(--sys-size-3);
  bottom: 5px;
  z-index: 999;
}

.elements-disclosure .elements-tree-outline:not(.hide-selection-when-blurred) li.hovered .ai-button-container {
  display: inline-flex;
}

.elements-disclosure li .selected-hint::before {
  font-style: italic;
  content: " == $0";
  opacity: 0%;
  position: absolute;
  white-space: pre;
}

.elements-disclosure .elements-tree-outline:not(.hide-selection-when-blurred) li.selected .selected-hint::before {
  position: static;
  opacity: 60%;
}

.elements-disclosure li.parent:not(.always-parent)::before {
  box-sizing: border-box;
  user-select: none;
  mask-image: var(--image-file-arrow-collapse);
  height: 14px;
  width: 14px;
  content: "\\A0\\A0";
  color: transparent;
  text-shadow: none;
  margin: -3px var(--sys-size-2) 0 -3px;
  background-color: var(--icon-default);
}

.elements-disclosure li.parent.expanded::before {
  mask-image: var(--image-file-arrow-drop-down);
}

.elements-disclosure li .selection {
  display: none;
  z-index: -1;
}

.elements-disclosure li.selected .selection {
  display: block;
}

.elements-disclosure li.elements-drag-over .selection {
  display: block;
  margin-top: -2px;
  border-top: 2px solid var(--sys-color-primary);
}

.elements-disclosure .elements-tree-outline:not(.hide-selection-when-blurred) .selection {
  background-color: var(--sys-color-neutral-container);
}

.elements-disclosure li.hovered:not(.selected) .selection {
  display: block;
  left: 3px;
  right: 3px;
  background-color: var(--sys-color-state-hover-on-subtle);
  border-radius: 5px;
}

.elements-disclosure li .webkit-html-tag.close {
  margin-left: -12px;
}

.elements-disclosure .elements-tree-outline.hide-selection-when-blurred .selected:focus-visible .highlight > * {
  background: var(--sys-color-state-focus-highlight);
  border-radius: 2px;
  outline: 2px solid var(--sys-color-state-focus-ring);
}

.elements-disclosure .elements-tree-outline:not(.hide-selection-when-blurred) li.selected:focus .selection {
  background-color: var(--sys-color-tonal-container);
}

.elements-disclosure ol {
  list-style-type: none;
  /** Keep it in sync with ElementsTreeElements.updateDecorations **/
  padding-inline-start: 12px;
  margin: 0;
}

.elements-disclosure ol.children {
  display: none;
  min-width: 100%;
}

.elements-disclosure ol.children.expanded {
  display: inline-block;
}

.elements-disclosure > ol {
  position: relative;
  margin: 0;
  min-width: 100%;
  min-height: 100%;
  padding-left: 2px;
}

.elements-disclosure li.in-clipboard .highlight {
  outline: 1px dotted var(--sys-color-divider);
}

.elements-tree-outline ol.shadow-root-deep {
  background-color: transparent;
}

.elements-tree-editor {
  box-shadow: var(--drop-shadow);
  margin-right: 4px;
}

button,
input,
select {
  font-family: inherit;
  font-size: inherit;
}

.elements-gutter-decoration {
  position: absolute;
  top: 3px;
  left: 2px;
  height: 9px;
  width: 9px;
  border-radius: 5px;
  border: 1px solid var(--sys-color-orange-bright);
  background-color: var(--sys-color-orange-bright);
}

.elements-gutter-decoration.elements-has-decorated-children {
  opacity: 50%;
}

.add-attribute {
  margin-left: 1px;
  margin-right: 1px;
  white-space: nowrap;
}

.elements-tree-nowrap,
.elements-tree-nowrap .li {
  white-space: pre !important; /* stylelint-disable-line declaration-no-important */
}

.elements-disclosure .elements-tree-nowrap li {
  overflow-wrap: normal;
}
/* DOM update highlight */
@keyframes dom-update-highlight-animation {
  0% {
    background-color: var(--sys-color-token-tag);
    color: var(--sys-color-cdt-base-container);
  }

  80% {
    background-color: var(--sys-color-token-meta);
  }

  100% {
    background-color: inherit;
  }
}

@keyframes dom-update-highlight-animation-dark {
  0% {
    background-color: var(--sys-color-token-tag);
    color: var(--sys-color-cdt-base-container);
  }

  80% {
    background-color: var(--sys-color-cdt-base-container);
    color: inherit;
  }

  100% {
    background-color: inherit;
  }
}

.dom-update-highlight {
  animation: dom-update-highlight-animation 1.4s 1 cubic-bezier(0, 0, 0.2, 1);
  border-radius: 2px;
}

:host-context(.theme-with-dark-background) .dom-update-highlight {
  animation: dom-update-highlight-animation-dark 1.4s 1 cubic-bezier(0, 0, 0.2, 1);
}

.elements-disclosure.single-node li {
  padding-left: 2px;
}

.elements-tree-shortcut-title,
.elements-tree-shortcut-link {
  color: var(--sys-color-token-subtle);
}

.elements-disclosure .gutter-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 15px;
  height: 15px;
  z-index: 1;
}

.elements-hide-gutter .gutter-container {
  display: none;
}

.gutter-container > devtools-icon {
  display: block;
  visibility: hidden;
  position: relative;
  left: -1px;
  width: 16px;
  height: 16px;
}

.elements-disclosure li.selected .gutter-container:not(.has-decorations) > devtools-icon {
  visibility: visible;
}
/** Guide line */

li.hovered:not(.always-parent) + ol.children,
.elements-tree-outline ol.shadow-root,
li.selected:not(.always-parent) + ol.children {
  background: linear-gradient(to right, var(--override-indentation-level-border-color), var(--override-indentation-level-border-color) 0.5px, transparent 0);
  background-position-x: 5px;
  background-size: 0.5px 100%;
  background-repeat: no-repeat;
}

li.selected:not(.always-parent) + ol.children {
  --override-indentation-level-border-color: var(--sys-color-divider) !important; /* stylelint-disable-line declaration-no-important */
}

li.hovered:not(.always-parent) + ol.children:not(.shadow-root) {
  --override-indentation-level-border-color: color-mix(in srgb, var(--ref-palette-neutral0) 10%, transparent);
}

.elements-tree-outline ol.shadow-root {
  --override-indentation-level-border-color: var(--ref-palette-orange95);
}

@media (forced-colors: active) {
  .elements-disclosure li.parent::before {
    forced-color-adjust: none;
    background-color: ButtonText !important; /* stylelint-disable-line declaration-no-important */
  }

  .elements-disclosure .elements-tree-outline:not(.hide-selection-when-blurred) li.selected .selected-hint::before {
    opacity: unset;
  }

  .elements-disclosure .elements-tree-outline:not(.hide-selection-when-blurred) .selection,
  .elements-disclosure li.hovered:not(.selected) .selection,
  .elements-disclosure .elements-tree-outline:not(.hide-selection-when-blurred) li.selected:focus .selection {
    forced-color-adjust: none;
    background: canvas !important; /* stylelint-disable-line declaration-no-important */
    border: 1px solid Highlight !important; /* stylelint-disable-line declaration-no-important */
  }

  .gutter-container > devtools-icon {
    forced-color-adjust: none;
  }
}

.violating-element {
  /* stylelint-disable-next-line custom-property-pattern */
  background-image: var(--image-file-errorWave);
  background-repeat: repeat-x;
  background-position: bottom;
  padding-bottom: 1px;
}

/*# sourceURL=${import.meta.resolve("./elementsTreeOutline.css")} */`;

// gen/front_end/panels/elements/ShortcutTreeElement.js
import * as Common10 from "./../../core/common/common.js";
import * as i18n25 from "./../../core/i18n/i18n.js";
import * as Adorners2 from "./../../ui/components/adorners/adorners.js";
import { createIcon as createIcon5 } from "./../../ui/kit/kit.js";
import * as UI17 from "./../../ui/legacy/legacy.js";
import * as ElementsComponents6 from "./components/components.js";
var UIStrings13 = {
  /**
   * @description Link text content in Elements Tree Outline of the Elements panel
   */
  reveal: "reveal"
};
var str_13 = i18n25.i18n.registerUIStrings("panels/elements/ShortcutTreeElement.ts", UIStrings13);
var i18nString12 = i18n25.i18n.getLocalizedString.bind(void 0, str_13);
var ShortcutTreeElement = class extends UI17.TreeOutline.TreeElement {
  nodeShortcut;
  #hovered;
  constructor(nodeShortcut) {
    super("");
    this.listItemElement.createChild("div", "selection fill");
    const title = this.listItemElement.createChild("span", "elements-tree-shortcut-title");
    let text = nodeShortcut.nodeName.toLowerCase();
    if (nodeShortcut.nodeType === Node.ELEMENT_NODE) {
      text = "<" + text + ">";
    }
    title.textContent = "\u21AA " + text;
    this.nodeShortcut = nodeShortcut;
    this.addRevealAdorner();
  }
  addRevealAdorner() {
    const adorner2 = new Adorners2.Adorner.Adorner();
    adorner2.classList.add("adorner-reveal");
    const config = ElementsComponents6.AdornerManager.getRegisteredAdorner(ElementsComponents6.AdornerManager.RegisteredAdorners.REVEAL);
    const name = config.name;
    const adornerContent = document.createElement("span");
    const linkIcon = createIcon5("select-element");
    const slotText = document.createElement("span");
    slotText.textContent = name;
    adornerContent.append(linkIcon);
    adornerContent.append(slotText);
    adornerContent.classList.add("adorner-with-icon");
    adorner2.data = {
      name,
      content: adornerContent,
      jslogContext: "reveal"
    };
    this.listItemElement.appendChild(adorner2);
    const onClick = () => {
      this.nodeShortcut.deferredNode.resolve((node) => {
        void Common10.Revealer.reveal(node);
      });
    };
    adorner2.addInteraction(onClick, {
      isToggle: false,
      shouldPropagateOnKeydown: false,
      ariaLabelDefault: i18nString12(UIStrings13.reveal),
      ariaLabelActive: i18nString12(UIStrings13.reveal)
    });
    adorner2.addEventListener("mousedown", (e) => e.consume(), false);
    ElementsPanel.instance().registerAdorner(adorner2);
  }
  get hovered() {
    return Boolean(this.#hovered);
  }
  set hovered(x) {
    if (this.#hovered === x) {
      return;
    }
    this.#hovered = x;
    this.listItemElement.classList.toggle("hovered", x);
  }
  deferredNode() {
    return this.nodeShortcut.deferredNode;
  }
  domModel() {
    return this.nodeShortcut.deferredNode.domModel();
  }
  setLeftIndentOverlay() {
    let indent = 24;
    if (this.parent && this.parent instanceof ElementsTreeElement) {
      const parentIndent = parseFloat(this.parent.listItemElement.style.getPropertyValue("--indent")) || 0;
      indent += parentIndent;
    }
    this.listItemElement.style.setProperty("--indent", indent + "px");
  }
  onattach() {
    this.setLeftIndentOverlay();
  }
  onselect(selectedByUser) {
    if (!selectedByUser) {
      return true;
    }
    this.nodeShortcut.deferredNode.highlight();
    this.nodeShortcut.deferredNode.resolve(resolved.bind(this));
    function resolved(node) {
      if (node && this.treeOutline instanceof ElementsTreeOutline) {
        this.treeOutline.selectedDOMNodeInternal = node;
        this.treeOutline.selectedNodeChanged(false);
      }
    }
    return true;
  }
};

// gen/front_end/panels/elements/TopLayerContainer.js
var TopLayerContainer_exports = {};
__export(TopLayerContainer_exports, {
  TopLayerContainer: () => TopLayerContainer
});
import * as SDK15 from "./../../core/sdk/sdk.js";
import * as UI18 from "./../../ui/legacy/legacy.js";
var TopLayerContainer = class extends UI18.TreeOutline.TreeElement {
  tree;
  document;
  constructor(tree3, document2) {
    super("#top-layer");
    this.tree = tree3;
    this.document = document2;
    this.document.domModel().addEventListener(SDK15.DOMModel.Events.TopLayerElementsChanged, this.topLayerElementsChanged, this);
    this.topLayerElementsChanged({
      data: {
        document: document2,
        documentShortcuts: []
      }
    });
  }
  topLayerElementsChanged(event) {
    if (this.document !== event.data.document) {
      return;
    }
    this.removeChildren();
    const shortcuts = event.data.documentShortcuts;
    this.hidden = shortcuts.length === 0;
    for (const shortcut of shortcuts) {
      const element = new ShortcutTreeElement(shortcut);
      this.appendChild(element);
      for (const child of shortcut.childShortcuts) {
        element.appendChild(new ShortcutTreeElement(child));
      }
    }
  }
  revealInTopLayer(node) {
    this.children().forEach((child) => {
      if (child instanceof ShortcutTreeElement && child.deferredNode().backendNodeId() === node.backendNodeId()) {
        child.revealAndSelect();
      }
    });
  }
};

// gen/front_end/panels/elements/ElementsTreeOutline.js
var UIStrings14 = {
  /**
   * @description ARIA accessible name in Elements Tree Outline of the Elements panel
   */
  pageDom: "Page DOM",
  /**
   * @description A context menu item to store a value as a global variable the Elements Panel
   */
  storeAsGlobalVariable: "Store as global variable",
  /**
   * @description Tree element expand all button element button text content in Elements Tree Outline of the Elements panel
   * @example {3} PH1
   */
  showAllNodesDMore: "Show all nodes ({PH1} more)",
  /**
   * @description Text for popover that directs to Issues panel
   */
  viewIssue: "View Issue:"
};
var str_14 = i18n27.i18n.registerUIStrings("panels/elements/ElementsTreeOutline.ts", UIStrings14);
var i18nString13 = i18n27.i18n.getLocalizedString.bind(void 0, str_14);
var elementsTreeOutlineByDOMModel = /* @__PURE__ */ new WeakMap();
var populatedTreeElements = /* @__PURE__ */ new Set();
var DEFAULT_VIEW4 = (input, output, target) => {
  if (!output.elementsTreeOutline) {
    output.elementsTreeOutline = new ElementsTreeOutline(input.omitRootDOMNode, input.selectEnabled, input.hideGutter);
    output.elementsTreeOutline.addEventListener(ElementsTreeOutline.Events.SelectedNodeChanged, input.onSelectedNodeChanged, void 0);
    output.elementsTreeOutline.addEventListener(ElementsTreeOutline.Events.ElementsTreeUpdated, input.onElementsTreeUpdated, void 0);
    output.elementsTreeOutline.addEventListener(UI19.TreeOutline.Events.ElementExpanded, input.onElementExpanded, void 0);
    output.elementsTreeOutline.addEventListener(UI19.TreeOutline.Events.ElementCollapsed, input.onElementCollapsed, void 0);
    target.appendChild(output.elementsTreeOutline.element);
  }
  if (input.visibleWidth !== void 0) {
    output.elementsTreeOutline.setVisibleWidth(input.visibleWidth);
  }
  if (input.visible !== void 0) {
    output.elementsTreeOutline.setVisible(input.visible);
  }
  output.elementsTreeOutline.setWordWrap(input.wrap);
  output.elementsTreeOutline.setShowSelectionOnKeyboardFocus(input.showSelectionOnKeyboardFocus, input.preventTabOrder);
  if (input.deindentSingleNode) {
    output.elementsTreeOutline.deindentSingleNode();
  }
  const previousHighlightedNode = output.highlightedTreeElement?.node() ?? null;
  if (previousHighlightedNode !== input.currentHighlightedNode) {
    output.isUpdatingHighlights = true;
    let treeElement = null;
    if (output.highlightedTreeElement) {
      let currentTreeElement = output.highlightedTreeElement;
      while (currentTreeElement && currentTreeElement !== output.alreadyExpandedParentTreeElement) {
        if (currentTreeElement.expanded) {
          currentTreeElement.collapse();
        }
        const parent = currentTreeElement.parent;
        currentTreeElement = parent instanceof ElementsTreeElement ? parent : null;
      }
    }
    output.highlightedTreeElement = null;
    output.alreadyExpandedParentTreeElement = null;
    if (input.currentHighlightedNode) {
      let deepestExpandedParent = input.currentHighlightedNode;
      const treeElementByNode = output.elementsTreeOutline.treeElementByNode;
      const treeIsNotExpanded = (deepestExpandedParent2) => {
        const element = treeElementByNode.get(deepestExpandedParent2);
        return element ? !element.expanded : true;
      };
      while (deepestExpandedParent && treeIsNotExpanded(deepestExpandedParent)) {
        deepestExpandedParent = deepestExpandedParent.parentNode;
      }
      output.alreadyExpandedParentTreeElement = deepestExpandedParent ? treeElementByNode.get(deepestExpandedParent) : output.elementsTreeOutline.rootElement();
      treeElement = output.elementsTreeOutline.createTreeElementFor(input.currentHighlightedNode);
    }
    output.highlightedTreeElement = treeElement;
    output.elementsTreeOutline.setHoverEffect(treeElement);
    treeElement?.reveal(true);
    output.isUpdatingHighlights = false;
  }
};
var DOMTreeWidget = class extends UI19.Widget.Widget {
  omitRootDOMNode = false;
  selectEnabled = false;
  hideGutter = false;
  showSelectionOnKeyboardFocus = false;
  preventTabOrder = false;
  deindentSingleNode = false;
  onSelectedNodeChanged = () => {
  };
  onElementsTreeUpdated = () => {
  };
  onDocumentUpdated = () => {
  };
  onElementExpanded = () => {
  };
  onElementCollapsed = () => {
  };
  #visible = false;
  #visibleWidth;
  #wrap = false;
  set visibleWidth(width) {
    this.#visibleWidth = width;
    this.performUpdate();
  }
  // FIXME: this is not declarative because ElementsTreeOutline can
  // change root node internally.
  set rootDOMNode(node) {
    this.performUpdate();
    if (!this.#viewOutput.elementsTreeOutline) {
      throw new Error("Unexpected: missing elementsTreeOutline");
    }
    this.#viewOutput.elementsTreeOutline.rootDOMNode = node;
    this.performUpdate();
  }
  get rootDOMNode() {
    return this.#viewOutput.elementsTreeOutline?.rootDOMNode ?? null;
  }
  #currentHighlightedNode = null;
  #view;
  #viewOutput = {
    highlightedTreeElement: null,
    alreadyExpandedParentTreeElement: null,
    isUpdatingHighlights: false
  };
  #highlightThrottler = new Common11.Throttler.Throttler(100);
  constructor(element, view) {
    super(element, {
      useShadowDom: false,
      delegatesFocus: false
    });
    this.#view = view ?? DEFAULT_VIEW4;
    if (Common11.Settings.Settings.instance().moduleSetting("highlight-node-on-hover-in-overlay").get()) {
      SDK16.TargetManager.TargetManager.instance().addModelListener(SDK16.OverlayModel.OverlayModel, "HighlightNodeRequested", this.#highlightNode, this, { scoped: true });
      SDK16.TargetManager.TargetManager.instance().addModelListener(SDK16.OverlayModel.OverlayModel, "InspectModeWillBeToggled", this.#clearHighlightedNode, this, { scoped: true });
    }
  }
  #highlightNode(event) {
    void this.#highlightThrottler.schedule(() => {
      this.#currentHighlightedNode = event.data;
      this.requestUpdate();
    });
  }
  #clearHighlightedNode() {
    if (this.#viewOutput.isUpdatingHighlights) {
      return;
    }
    this.#currentHighlightedNode = null;
    this.performUpdate();
  }
  selectDOMNode(node, focus2) {
    this.#viewOutput?.elementsTreeOutline?.selectDOMNode(node, focus2);
  }
  highlightNodeAttribute(node, attribute) {
    this.#viewOutput?.elementsTreeOutline?.highlightNodeAttribute(node, attribute);
  }
  setWordWrap(wrap) {
    this.#wrap = wrap;
    this.performUpdate();
  }
  selectedDOMNode() {
    return this.#viewOutput.elementsTreeOutline?.selectedDOMNode() ?? null;
  }
  /**
   * FIXME: this is called to re-render everything from scratch, for
   * example, if global settings changed. Instead, the setting values
   * should be the input for the view function.
   */
  reload() {
    this.#viewOutput.elementsTreeOutline?.update();
  }
  /**
   * Used by layout tests.
   */
  getTreeOutlineForTesting() {
    return this.#viewOutput.elementsTreeOutline;
  }
  treeElementForNode(node) {
    return this.#viewOutput.elementsTreeOutline?.findTreeElement(node) || null;
  }
  performUpdate() {
    this.#view({
      omitRootDOMNode: this.omitRootDOMNode,
      selectEnabled: this.selectEnabled,
      hideGutter: this.hideGutter,
      visibleWidth: this.#visibleWidth,
      visible: this.#visible,
      wrap: this.#wrap,
      showSelectionOnKeyboardFocus: this.showSelectionOnKeyboardFocus,
      preventTabOrder: this.preventTabOrder,
      deindentSingleNode: this.deindentSingleNode,
      currentHighlightedNode: this.#currentHighlightedNode,
      onElementsTreeUpdated: this.onElementsTreeUpdated.bind(this),
      onSelectedNodeChanged: (event) => {
        this.#clearHighlightedNode();
        this.onSelectedNodeChanged(event);
      },
      onElementCollapsed: () => {
        this.#clearHighlightedNode();
        this.onElementCollapsed();
      },
      onElementExpanded: () => {
        this.#clearHighlightedNode();
        this.onElementExpanded();
      }
    }, this.#viewOutput, this.contentElement);
  }
  modelAdded(domModel) {
    this.performUpdate();
    if (!this.#viewOutput.elementsTreeOutline) {
      throw new Error("Unexpected: missing elementsTreeOutline");
    }
    this.#viewOutput.elementsTreeOutline.wireToDOMModel(domModel);
    this.performUpdate();
  }
  modelRemoved(domModel) {
    this.#viewOutput.elementsTreeOutline?.unwireFromDOMModel(domModel);
    this.performUpdate();
  }
  /**
   * FIXME: which node is expanded should be part of the view input.
   */
  expand() {
    if (this.#viewOutput.elementsTreeOutline?.selectedTreeElement) {
      this.#viewOutput.elementsTreeOutline.selectedTreeElement.expand();
    }
  }
  /**
   * FIXME: which node is selected should be part of the view input.
   */
  selectDOMNodeWithoutReveal(node) {
    this.#viewOutput.elementsTreeOutline?.findTreeElement(node)?.select();
  }
  /**
   * FIXME: adorners should be part of the view input.
   */
  updateNodeAdorners(node) {
    const element = this.#viewOutput.elementsTreeOutline?.findTreeElement(node);
    void element?.updateStyleAdorners();
    void element?.updateAdorners();
  }
  highlightMatch(node, query) {
    const treeElement = this.#viewOutput.elementsTreeOutline?.findTreeElement(node);
    if (!treeElement) {
      return;
    }
    if (query) {
      treeElement.highlightSearchResults(query);
    }
    treeElement.reveal();
    const matches = treeElement.listItemElement.getElementsByClassName(Highlighting3.highlightedSearchResultClassName);
    if (matches.length) {
      matches[0].scrollIntoViewIfNeeded(false);
    }
    treeElement.select(
      /* omitFocus */
      true
    );
  }
  hideMatchHighlights(node) {
    const treeElement = this.#viewOutput.elementsTreeOutline?.findTreeElement(node);
    if (!treeElement) {
      return;
    }
    treeElement.hideSearchHighlights();
  }
  toggleHideElement(node) {
    void this.#viewOutput.elementsTreeOutline?.toggleHideElement(node);
  }
  toggleEditAsHTML(node) {
    this.#viewOutput.elementsTreeOutline?.toggleEditAsHTML(node);
  }
  duplicateNode(node) {
    this.#viewOutput.elementsTreeOutline?.duplicateNode(node);
  }
  copyStyles(node) {
    void this.#viewOutput.elementsTreeOutline?.findTreeElement(node)?.copyStyles();
  }
  /**
   * FIXME: used to determine focus state, probably we can have a better
   * way to do it.
   */
  empty() {
    return !this.#viewOutput.elementsTreeOutline;
  }
  focus() {
    super.focus();
    this.#viewOutput.elementsTreeOutline?.focus();
  }
  wasShown() {
    super.wasShown();
    this.#visible = true;
    this.performUpdate();
  }
  detach(overrideHideOnDetach) {
    super.detach(overrideHideOnDetach);
    this.#visible = false;
    this.performUpdate();
  }
  show(parentElement, insertBefore, suppressOrphanWidgetError = false) {
    this.performUpdate();
    const domModels = SDK16.TargetManager.TargetManager.instance().models(SDK16.DOMModel.DOMModel, { scoped: true });
    for (const domModel of domModels) {
      if (domModel.parentModel()) {
        continue;
      }
      if (!this.rootDOMNode || this.rootDOMNode.domModel() !== domModel) {
        if (domModel.existingDocument()) {
          this.rootDOMNode = domModel.existingDocument();
          this.onDocumentUpdated(domModel);
        } else {
          void domModel.requestDocument();
        }
      }
    }
    super.show(parentElement, insertBefore, suppressOrphanWidgetError);
  }
};
var ElementsTreeOutline = class _ElementsTreeOutline extends Common11.ObjectWrapper.eventMixin(UI19.TreeOutline.TreeOutline) {
  treeElementByNode;
  shadowRoot;
  elementInternal;
  includeRootDOMNode;
  selectEnabled;
  rootDOMNodeInternal;
  selectedDOMNodeInternal;
  visible;
  imagePreviewPopover;
  updateRecords;
  treeElementsBeingUpdated;
  decoratorExtensions;
  showHTMLCommentsSetting;
  multilineEditing;
  visibleWidthInternal;
  clipboardNodeData;
  isXMLMimeTypeInternal;
  suppressRevealAndSelect = false;
  previousHoveredElement;
  treeElementBeingDragged;
  dragOverTreeElement;
  updateModifiedNodesTimeout;
  #topLayerContainerByDocument = /* @__PURE__ */ new WeakMap();
  #issuesManager;
  #popupHelper;
  #nodeElementToIssues = /* @__PURE__ */ new Map();
  constructor(omitRootDOMNode, selectEnabled, hideGutter) {
    super();
    this.#issuesManager = IssuesManager2.IssuesManager.IssuesManager.instance();
    this.#issuesManager.addEventListener("IssueAdded", this.#onIssueAdded, this);
    this.treeElementByNode = /* @__PURE__ */ new WeakMap();
    const shadowContainer = document.createElement("div");
    this.shadowRoot = UI19.UIUtils.createShadowRootWithCoreStyles(shadowContainer, { cssFile: [elementsTreeOutline_css_default, CodeHighlighter5.codeHighlighterStyles] });
    const outlineDisclosureElement = this.shadowRoot.createChild("div", "elements-disclosure");
    this.elementInternal = this.element;
    this.elementInternal.classList.add("elements-tree-outline", "source-code");
    if (hideGutter) {
      this.elementInternal.classList.add("elements-hide-gutter");
    }
    UI19.ARIAUtils.setLabel(this.elementInternal, i18nString13(UIStrings14.pageDom));
    this.elementInternal.addEventListener("focusout", this.onfocusout.bind(this), false);
    this.elementInternal.addEventListener("mousedown", this.onmousedown.bind(this), false);
    this.elementInternal.addEventListener("mousemove", this.onmousemove.bind(this), false);
    this.elementInternal.addEventListener("mouseleave", this.onmouseleave.bind(this), false);
    this.elementInternal.addEventListener("dragstart", this.ondragstart.bind(this), false);
    this.elementInternal.addEventListener("dragover", this.ondragover.bind(this), false);
    this.elementInternal.addEventListener("dragleave", this.ondragleave.bind(this), false);
    this.elementInternal.addEventListener("drop", this.ondrop.bind(this), false);
    this.elementInternal.addEventListener("dragend", this.ondragend.bind(this), false);
    this.elementInternal.addEventListener("contextmenu", this.contextMenuEventFired.bind(this), false);
    this.elementInternal.addEventListener("clipboard-beforecopy", this.onBeforeCopy.bind(this), false);
    this.elementInternal.addEventListener("clipboard-copy", this.onCopyOrCut.bind(this, false), false);
    this.elementInternal.addEventListener("clipboard-cut", this.onCopyOrCut.bind(this, true), false);
    this.elementInternal.addEventListener("clipboard-paste", this.onPaste.bind(this), false);
    this.elementInternal.addEventListener("keydown", this.onKeyDown.bind(this), false);
    outlineDisclosureElement.appendChild(this.elementInternal);
    this.element = shadowContainer;
    this.contentElement.setAttribute("jslog", `${VisualLogging9.tree("elements")}`);
    this.includeRootDOMNode = !omitRootDOMNode;
    this.selectEnabled = selectEnabled;
    this.rootDOMNodeInternal = null;
    this.selectedDOMNodeInternal = null;
    this.visible = false;
    this.imagePreviewPopover = new ImagePreviewPopover(this.contentElement, (event) => {
      let link2 = event.target;
      while (link2 && !ImagePreviewPopover.getImageURL(link2)) {
        link2 = link2.parentElementOrShadowHost();
      }
      return link2;
    }, (link2) => {
      const listItem = UI19.UIUtils.enclosingNodeOrSelfWithNodeName(link2, "li");
      if (!listItem) {
        return null;
      }
      const treeElement = UI19.TreeOutline.TreeElement.getTreeElementBylistItemNode(listItem);
      if (!treeElement) {
        return null;
      }
      return treeElement.node();
    });
    this.updateRecords = /* @__PURE__ */ new Map();
    this.treeElementsBeingUpdated = /* @__PURE__ */ new Set();
    this.decoratorExtensions = null;
    this.showHTMLCommentsSetting = Common11.Settings.Settings.instance().moduleSetting("show-html-comments");
    this.showHTMLCommentsSetting.addChangeListener(this.onShowHTMLCommentsChange.bind(this));
    this.setUseLightSelectionColor(true);
    this.#popupHelper = new UI19.PopoverHelper.PopoverHelper(this.elementInternal, (event) => {
      const hoveredNode = event.composedPath()[0];
      if (!hoveredNode?.matches(".violating-element")) {
        return null;
      }
      const issues = this.#nodeElementToIssues.get(hoveredNode);
      if (!issues) {
        return null;
      }
      return {
        box: hoveredNode.boxInWindow(),
        show: async (popover) => {
          popover.setIgnoreLeftMargin(true);
          render6(html9`
            <div class="squiggles-content">
              ${issues.map((issue) => {
            const elementIssueDetails = getElementIssueDetails(issue);
            if (!elementIssueDetails) {
              return nothing3;
            }
            const issueKindIconName = IssueCounter.IssueCounter.getIssueKindIconName(issue.getKind());
            const openIssueEvent = () => Common11.Revealer.reveal(issue);
            return html9`
                  <div class="squiggles-content-item">
                  <devtools-icon .name=${issueKindIconName} @click=${openIssueEvent}></devtools-icon>
                  <x-link class="link" @click=${openIssueEvent}>${i18nString13(UIStrings14.viewIssue)}</x-link>
                  <span>${elementIssueDetails.tooltip}</span>
                  </div>`;
          })}
            </div>`, popover.contentElement);
          return true;
        }
      };
    }, "elements.issue");
    this.#popupHelper.setTimeout(300);
  }
  static forDOMModel(domModel) {
    return elementsTreeOutlineByDOMModel.get(domModel) || null;
  }
  #onIssueAdded(event) {
    void this.#addTreeElementIssue(event.data.issue);
  }
  #addAllElementIssues() {
    if (!this.#issuesManager) {
      return;
    }
    for (const issue of this.#issuesManager.issues()) {
      void this.#addTreeElementIssue(issue);
    }
  }
  async #addTreeElementIssue(issue) {
    const elementIssueDetails = getElementIssueDetails(issue);
    if (!elementIssueDetails) {
      return;
    }
    const { nodeId } = elementIssueDetails;
    if (!this.rootDOMNode || !nodeId) {
      return;
    }
    const deferredDOMNode = new SDK16.DOMModel.DeferredDOMNode(this.rootDOMNode.domModel().target(), nodeId);
    const node = await deferredDOMNode.resolvePromise();
    if (!node) {
      return;
    }
    const treeElement = this.findTreeElement(node);
    if (treeElement) {
      treeElement.addIssue(issue);
      const treeElementNodeElementsToIssues = treeElement.issuesByNodeElement;
      for (const [element, issues] of treeElementNodeElementsToIssues) {
        this.#nodeElementToIssues.set(element, issues);
      }
    }
  }
  deindentSingleNode() {
    const firstChild = this.firstChild();
    if (!firstChild || firstChild && !firstChild.isExpandable()) {
      this.shadowRoot.querySelector(".elements-disclosure")?.classList.add("single-node");
    }
  }
  updateNodeElementToIssue(element, issues) {
    this.#nodeElementToIssues.set(element, issues);
  }
  onShowHTMLCommentsChange() {
    const selectedNode = this.selectedDOMNode();
    if (selectedNode && selectedNode.nodeType() === Node.COMMENT_NODE && !this.showHTMLCommentsSetting.get()) {
      this.selectDOMNode(selectedNode.parentNode);
    }
    this.update();
  }
  setWordWrap(wrap) {
    this.elementInternal.classList.toggle("elements-tree-nowrap", !wrap);
  }
  setMultilineEditing(multilineEditing) {
    this.multilineEditing = multilineEditing;
  }
  visibleWidth() {
    return this.visibleWidthInternal || 0;
  }
  setVisibleWidth(width) {
    this.visibleWidthInternal = width;
    if (this.multilineEditing) {
      this.multilineEditing.resize();
    }
  }
  setClipboardData(data) {
    if (this.clipboardNodeData) {
      const treeElement = this.findTreeElement(this.clipboardNodeData.node);
      if (treeElement) {
        treeElement.setInClipboard(false);
      }
      delete this.clipboardNodeData;
    }
    if (data) {
      const treeElement = this.findTreeElement(data.node);
      if (treeElement) {
        treeElement.setInClipboard(true);
      }
      this.clipboardNodeData = data;
    }
  }
  resetClipboardIfNeeded(removedNode) {
    if (this.clipboardNodeData?.node === removedNode) {
      this.setClipboardData(null);
    }
  }
  onBeforeCopy(event) {
    event.handled = true;
  }
  onCopyOrCut(isCut, event) {
    this.setClipboardData(null);
    const originalEvent = event["original"];
    if (!originalEvent?.target) {
      return;
    }
    if (originalEvent.target instanceof Node && originalEvent.target.hasSelection()) {
      return;
    }
    if (UI19.UIUtils.isEditing()) {
      return;
    }
    const targetNode = this.selectedDOMNode();
    if (!targetNode) {
      return;
    }
    if (!originalEvent.clipboardData) {
      return;
    }
    originalEvent.clipboardData.clearData();
    event.handled = true;
    this.performCopyOrCut(isCut, targetNode);
  }
  performCopyOrCut(isCut, node, includeShadowRoots = false) {
    if (!node) {
      return;
    }
    if (isCut && (node.isShadowRoot() || node.ancestorUserAgentShadowRoot())) {
      return;
    }
    void node.getOuterHTML(includeShadowRoots).then((outerHTML) => {
      if (outerHTML !== null) {
        UI19.UIUtils.copyTextToClipboard(outerHTML);
      }
    });
    this.setClipboardData({ node, isCut });
  }
  canPaste(targetNode) {
    if (targetNode.isShadowRoot() || targetNode.ancestorUserAgentShadowRoot()) {
      return false;
    }
    if (!this.clipboardNodeData) {
      return false;
    }
    const node = this.clipboardNodeData.node;
    if (this.clipboardNodeData.isCut && (node === targetNode || node.isAncestor(targetNode))) {
      return false;
    }
    if (targetNode.domModel() !== node.domModel()) {
      return false;
    }
    return true;
  }
  pasteNode(targetNode) {
    if (this.canPaste(targetNode)) {
      this.performPaste(targetNode);
    }
  }
  duplicateNode(targetNode) {
    this.performDuplicate(targetNode);
  }
  onPaste(event) {
    if (UI19.UIUtils.isEditing()) {
      return;
    }
    const targetNode = this.selectedDOMNode();
    if (!targetNode || !this.canPaste(targetNode)) {
      return;
    }
    event.handled = true;
    this.performPaste(targetNode);
  }
  performPaste(targetNode) {
    if (!this.clipboardNodeData) {
      return;
    }
    if (this.clipboardNodeData.isCut) {
      this.clipboardNodeData.node.moveTo(targetNode, null, expandCallback.bind(this));
      this.setClipboardData(null);
    } else {
      this.clipboardNodeData.node.copyTo(targetNode, null, expandCallback.bind(this));
    }
    function expandCallback(error, pastedNode) {
      if (error || !pastedNode) {
        return;
      }
      this.selectDOMNode(pastedNode);
    }
  }
  performDuplicate(targetNode) {
    if (targetNode.isInShadowTree()) {
      return;
    }
    const parentNode = targetNode.parentNode ? targetNode.parentNode : targetNode;
    if (parentNode.nodeName() === "#document") {
      return;
    }
    targetNode.copyTo(parentNode, targetNode.nextSibling);
  }
  setVisible(visible) {
    if (visible === this.visible) {
      return;
    }
    this.visible = visible;
    if (!this.visible) {
      this.imagePreviewPopover.hide();
      if (this.multilineEditing) {
        this.multilineEditing.cancel();
      }
      return;
    }
    this.runPendingUpdates();
    if (this.selectedDOMNodeInternal) {
      this.revealAndSelectNode(this.selectedDOMNodeInternal, false);
    }
  }
  get rootDOMNode() {
    return this.rootDOMNodeInternal;
  }
  set rootDOMNode(x) {
    if (this.rootDOMNodeInternal === x) {
      return;
    }
    this.rootDOMNodeInternal = x;
    this.isXMLMimeTypeInternal = x?.isXMLNode();
    this.update();
  }
  get isXMLMimeType() {
    return Boolean(this.isXMLMimeTypeInternal);
  }
  selectedDOMNode() {
    return this.selectedDOMNodeInternal;
  }
  selectDOMNode(node, focus2) {
    if (this.selectedDOMNodeInternal === node) {
      this.revealAndSelectNode(node, !focus2);
      return;
    }
    this.selectedDOMNodeInternal = node;
    this.revealAndSelectNode(node, !focus2);
    if (this.selectedDOMNodeInternal === node) {
      this.selectedNodeChanged(Boolean(focus2));
    }
  }
  editing() {
    const node = this.selectedDOMNode();
    if (!node) {
      return false;
    }
    const treeElement = this.findTreeElement(node);
    if (!treeElement) {
      return false;
    }
    return treeElement.isEditing() || false;
  }
  update() {
    const selectedNode = this.selectedDOMNode();
    this.removeChildren();
    if (!this.rootDOMNode) {
      return;
    }
    if (this.includeRootDOMNode) {
      const treeElement = this.createElementTreeElement(this.rootDOMNode);
      this.appendChild(treeElement);
    } else {
      const children = this.visibleChildren(this.rootDOMNode);
      for (const child of children) {
        const treeElement = this.createElementTreeElement(child);
        this.appendChild(treeElement);
      }
    }
    if (this.rootDOMNode instanceof SDK16.DOMModel.DOMDocument) {
      void this.createTopLayerContainer(this.rootElement(), this.rootDOMNode);
    }
    if (selectedNode) {
      this.revealAndSelectNode(selectedNode, true);
    }
  }
  selectedNodeChanged(focus2) {
    this.dispatchEventToListeners(_ElementsTreeOutline.Events.SelectedNodeChanged, { node: this.selectedDOMNodeInternal, focus: focus2 });
  }
  fireElementsTreeUpdated(nodes) {
    this.dispatchEventToListeners(_ElementsTreeOutline.Events.ElementsTreeUpdated, nodes);
  }
  findTreeElement(node) {
    if (node instanceof SDK16.DOMModel.AdoptedStyleSheet) {
      return null;
    }
    let treeElement = this.lookUpTreeElement(node);
    if (!treeElement && node.nodeType() === Node.TEXT_NODE) {
      treeElement = this.lookUpTreeElement(node.parentNode);
    }
    return treeElement;
  }
  lookUpTreeElement(node) {
    if (!node) {
      return null;
    }
    const cachedElement = this.treeElementByNode.get(node);
    if (cachedElement) {
      return cachedElement;
    }
    const ancestors = [];
    let currentNode;
    for (currentNode = node.parentNode; currentNode; currentNode = currentNode.parentNode) {
      ancestors.push(currentNode);
      if (this.treeElementByNode.has(currentNode)) {
        break;
      }
    }
    if (!currentNode) {
      return null;
    }
    for (let i = ancestors.length - 1; i >= 0; --i) {
      const child = ancestors[i - 1] || node;
      const treeElement = this.treeElementByNode.get(ancestors[i]);
      if (treeElement) {
        void treeElement.onpopulate();
        if (child.index && child.index >= treeElement.expandedChildrenLimit()) {
          this.setExpandedChildrenLimit(treeElement, child.index + 1);
        }
      }
    }
    return this.treeElementByNode.get(node) || null;
  }
  createTreeElementFor(node) {
    let treeElement = this.findTreeElement(node);
    if (treeElement) {
      return treeElement;
    }
    if (!node.parentNode) {
      return null;
    }
    treeElement = this.createTreeElementFor(node.parentNode);
    return treeElement ? this.showChild(treeElement, node) : null;
  }
  revealAndSelectNode(node, omitFocus) {
    if (this.suppressRevealAndSelect) {
      return;
    }
    if (!this.includeRootDOMNode && node === this.rootDOMNode && this.rootDOMNode) {
      node = this.rootDOMNode.firstChild;
    }
    if (!node) {
      return;
    }
    const treeElement = this.createTreeElementFor(node);
    if (!treeElement) {
      return;
    }
    treeElement.revealAndSelect(omitFocus);
  }
  highlightNodeAttribute(node, attribute) {
    const treeElement = this.findTreeElement(node);
    if (!treeElement) {
      return;
    }
    treeElement.reveal();
    treeElement.highlightAttribute(attribute);
  }
  treeElementFromEventInternal(event) {
    const scrollContainer = this.element.parentElement;
    if (!scrollContainer) {
      return null;
    }
    const x = event.pageX;
    const y = event.pageY;
    const elementUnderMouse = this.treeElementFromPoint(x, y);
    const elementAboveMouse = this.treeElementFromPoint(x, y - 2);
    let element;
    if (elementUnderMouse === elementAboveMouse) {
      element = elementUnderMouse;
    } else {
      element = this.treeElementFromPoint(x, y + 2);
    }
    return element;
  }
  onfocusout(_event) {
    SDK16.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  }
  onmousedown(event) {
    const element = this.treeElementFromEventInternal(event);
    if (element) {
      element.select();
    }
  }
  setHoverEffect(treeElement) {
    if (this.previousHoveredElement === treeElement) {
      return;
    }
    if (this.previousHoveredElement instanceof ElementsTreeElement) {
      this.previousHoveredElement.hovered = false;
      delete this.previousHoveredElement;
    }
    if (treeElement instanceof ElementsTreeElement) {
      treeElement.hovered = true;
      this.previousHoveredElement = treeElement;
    }
  }
  onmousemove(event) {
    const element = this.treeElementFromEventInternal(event);
    if (element && this.previousHoveredElement === element) {
      return;
    }
    this.setHoverEffect(element);
    this.highlightTreeElement(element, !UI19.KeyboardShortcut.KeyboardShortcut.eventHasEitherCtrlOrMeta(event));
  }
  highlightTreeElement(element, showInfo) {
    if (element instanceof ElementsTreeElement) {
      element.node().domModel().overlayModel().highlightInOverlay({ node: element.node(), selectorList: void 0 }, "all", showInfo);
      return;
    }
    if (element instanceof ShortcutTreeElement) {
      element.domModel().overlayModel().highlightInOverlay({ deferredNode: element.deferredNode(), selectorList: void 0 }, "all", showInfo);
    }
  }
  onmouseleave(_event) {
    this.setHoverEffect(null);
    SDK16.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  }
  ondragstart(event) {
    const node = event.target;
    if (!node || node.hasSelection()) {
      return false;
    }
    if (node.nodeName === "A") {
      return false;
    }
    const treeElement = this.validDragSourceOrTarget(this.treeElementFromEventInternal(event));
    if (!treeElement) {
      return false;
    }
    if (treeElement.node().nodeName() === "BODY" || treeElement.node().nodeName() === "HEAD") {
      return false;
    }
    if (!event.dataTransfer || !treeElement.listItemElement.textContent) {
      return;
    }
    event.dataTransfer.setData("text/plain", treeElement.listItemElement.textContent.replace(/\u200b/g, ""));
    event.dataTransfer.effectAllowed = "copyMove";
    this.treeElementBeingDragged = treeElement;
    SDK16.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    return true;
  }
  ondragover(event) {
    if (!this.treeElementBeingDragged) {
      return false;
    }
    const treeElement = this.validDragSourceOrTarget(this.treeElementFromEventInternal(event));
    if (!treeElement) {
      return false;
    }
    let node = treeElement.node();
    while (node) {
      if (node === this.treeElementBeingDragged.nodeInternal) {
        return false;
      }
      node = node.parentNode;
    }
    treeElement.listItemElement.classList.add("elements-drag-over");
    this.dragOverTreeElement = treeElement;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    return false;
  }
  ondragleave(event) {
    this.clearDragOverTreeElementMarker();
    event.preventDefault();
    return false;
  }
  validDragSourceOrTarget(treeElement) {
    if (!treeElement) {
      return null;
    }
    if (!(treeElement instanceof ElementsTreeElement)) {
      return null;
    }
    const elementsTreeElement = treeElement;
    const node = elementsTreeElement.node();
    if (!node.parentNode || node.parentNode.nodeType() !== Node.ELEMENT_NODE) {
      return null;
    }
    return elementsTreeElement;
  }
  ondrop(event) {
    event.preventDefault();
    const treeElement = this.treeElementFromEventInternal(event);
    if (treeElement instanceof ElementsTreeElement) {
      this.doMove(treeElement);
    }
  }
  doMove(treeElement) {
    if (!this.treeElementBeingDragged) {
      return;
    }
    let parentNode;
    let anchorNode;
    if (treeElement.isClosingTag()) {
      parentNode = treeElement.node();
      anchorNode = null;
    } else {
      const dragTargetNode = treeElement.node();
      parentNode = dragTargetNode.parentNode;
      anchorNode = dragTargetNode;
    }
    if (!parentNode) {
      return;
    }
    const wasExpanded = this.treeElementBeingDragged.expanded;
    this.treeElementBeingDragged.nodeInternal.moveTo(parentNode, anchorNode, this.selectNodeAfterEdit.bind(this, wasExpanded));
    delete this.treeElementBeingDragged;
  }
  ondragend(event) {
    event.preventDefault();
    this.clearDragOverTreeElementMarker();
    delete this.treeElementBeingDragged;
  }
  clearDragOverTreeElementMarker() {
    if (this.dragOverTreeElement) {
      this.dragOverTreeElement.listItemElement.classList.remove("elements-drag-over");
      delete this.dragOverTreeElement;
    }
  }
  contextMenuEventFired(event) {
    const treeElement = this.treeElementFromEventInternal(event);
    if (treeElement instanceof ElementsTreeElement) {
      void this.showContextMenu(treeElement, event);
    }
  }
  async showContextMenu(treeElement, event) {
    if (UI19.UIUtils.isEditing()) {
      return;
    }
    const node = event.target;
    if (!node) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    const contextMenu = new UI19.ContextMenu.ContextMenu(event);
    const isPseudoElement = Boolean(treeElement.node().pseudoType());
    const isTag = treeElement.node().nodeType() === Node.ELEMENT_NODE && !isPseudoElement;
    let textNode = node.enclosingNodeOrSelfWithClass("webkit-html-text-node");
    if (textNode?.classList.contains("bogus")) {
      textNode = null;
    }
    const commentNode = node.enclosingNodeOrSelfWithClass("webkit-html-comment");
    contextMenu.saveSection().appendItem(i18nString13(UIStrings14.storeAsGlobalVariable), this.saveNodeToTempVariable.bind(this, treeElement.node()), { jslogContext: "store-as-global-variable" });
    if (textNode) {
      await treeElement.populateTextContextMenu(contextMenu, textNode);
    } else if (isTag) {
      await treeElement.populateTagContextMenu(contextMenu, event);
    } else if (commentNode) {
      await treeElement.populateNodeContextMenu(contextMenu);
    } else if (isPseudoElement) {
      treeElement.populatePseudoElementContextMenu(contextMenu);
    }
    ElementsPanel.instance().populateAdornerSettingsContextMenu(contextMenu);
    contextMenu.appendApplicableItems(treeElement.node());
    void contextMenu.show();
  }
  async saveNodeToTempVariable(node) {
    const remoteObjectForConsole = await node.resolveToObject();
    const consoleModel = remoteObjectForConsole?.runtimeModel().target()?.model(SDK16.ConsoleModel.ConsoleModel);
    await consoleModel?.saveToTempVariable(UI19.Context.Context.instance().flavor(SDK16.RuntimeModel.ExecutionContext), remoteObjectForConsole);
  }
  runPendingUpdates() {
    this.updateModifiedNodes();
  }
  onKeyDown(event) {
    const keyboardEvent = event;
    if (UI19.UIUtils.isEditing()) {
      return;
    }
    const node = this.selectedDOMNode();
    if (!node) {
      return;
    }
    const treeElement = this.treeElementByNode.get(node);
    if (!treeElement) {
      return;
    }
    if (UI19.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(keyboardEvent) && node.parentNode) {
      if (keyboardEvent.key === "ArrowUp" && node.previousSibling) {
        node.moveTo(node.parentNode, node.previousSibling, this.selectNodeAfterEdit.bind(this, treeElement.expanded));
        keyboardEvent.consume(true);
        return;
      }
      if (keyboardEvent.key === "ArrowDown" && node.nextSibling) {
        node.moveTo(node.parentNode, node.nextSibling.nextSibling, this.selectNodeAfterEdit.bind(this, treeElement.expanded));
        keyboardEvent.consume(true);
        return;
      }
    }
  }
  toggleEditAsHTML(node, startEditing, callback) {
    const treeElement = this.treeElementByNode.get(node);
    if (!treeElement?.hasEditableNode()) {
      return;
    }
    if (node.pseudoType()) {
      return;
    }
    const parentNode = node.parentNode;
    const index = node.index;
    const wasExpanded = treeElement.expanded;
    treeElement.toggleEditAsHTML(editingFinished.bind(this), startEditing);
    function editingFinished(success) {
      if (callback) {
        callback();
      }
      if (!success) {
        return;
      }
      Badges4.UserBadges.instance().recordAction(Badges4.BadgeAction.DOM_ELEMENT_OR_ATTRIBUTE_EDITED);
      this.runPendingUpdates();
      if (!index) {
        return;
      }
      const children = parentNode?.children();
      const newNode = children ? children[index] || parentNode : parentNode;
      if (!newNode) {
        return;
      }
      this.selectDOMNode(newNode, true);
      if (wasExpanded) {
        const newTreeItem = this.findTreeElement(newNode);
        if (newTreeItem) {
          newTreeItem.expand();
        }
      }
    }
  }
  selectNodeAfterEdit(wasExpanded, error, newNode) {
    if (error) {
      return null;
    }
    this.runPendingUpdates();
    if (!newNode) {
      return null;
    }
    this.selectDOMNode(newNode, true);
    const newTreeItem = this.findTreeElement(newNode);
    if (wasExpanded) {
      if (newTreeItem) {
        newTreeItem.expand();
      }
    }
    return newTreeItem;
  }
  /**
   * Runs a script on the node's remote object that toggles a class name on
   * the node and injects a stylesheet into the head of the node's document
   * containing a rule to set "visibility: hidden" on the class and all it's
   * ancestors.
   */
  async toggleHideElement(node) {
    let pseudoElementName = node.pseudoType() ? node.nodeName() : null;
    if (pseudoElementName && node.pseudoIdentifier()) {
      pseudoElementName += `(${node.pseudoIdentifier()})`;
    }
    let effectiveNode = node;
    while (effectiveNode?.pseudoType()) {
      if (effectiveNode !== node && effectiveNode.pseudoType() === "column") {
        pseudoElementName = "::column" + pseudoElementName;
      }
      effectiveNode = effectiveNode.parentNode;
    }
    if (!effectiveNode) {
      return;
    }
    const hidden = node.marker("hidden-marker");
    const object = await effectiveNode.resolveToObject("");
    if (!object) {
      return;
    }
    await object.callFunction(toggleClassAndInjectStyleRule, [{ value: pseudoElementName }, { value: !hidden }]);
    object.release();
    node.setMarker("hidden-marker", hidden ? null : true);
    function toggleClassAndInjectStyleRule(pseudoElementName2, hidden2) {
      const classNamePrefix = "__web-inspector-hide";
      const classNameSuffix = "-shortcut__";
      const styleTagId = "__web-inspector-hide-shortcut-style__";
      const pseudoElementNameEscaped = pseudoElementName2 ? pseudoElementName2.replace(/[\(\)\:]/g, "_") : "";
      const className = classNamePrefix + pseudoElementNameEscaped + classNameSuffix;
      this.classList.toggle(className, hidden2);
      let localRoot = this;
      while (localRoot.parentNode) {
        localRoot = localRoot.parentNode;
      }
      if (localRoot.nodeType === Node.DOCUMENT_NODE) {
        localRoot = document.head;
      }
      let style = localRoot.querySelector("style#" + styleTagId);
      if (!style) {
        const selectors = [];
        selectors.push(".__web-inspector-hide-shortcut__");
        selectors.push(".__web-inspector-hide-shortcut__ *");
        const selector = selectors.join(", ");
        const ruleBody = "    visibility: hidden !important;";
        const rule = "\n" + selector + "\n{\n" + ruleBody + "\n}\n";
        style = document.createElement("style");
        style.id = styleTagId;
        style.textContent = rule;
        localRoot.appendChild(style);
      }
      if (pseudoElementName2 && !style.classList.contains(className)) {
        style.classList.add(className);
        style.textContent = `.${className}${pseudoElementName2}, ${style.textContent}`;
      }
    }
  }
  isToggledToHidden(node) {
    return Boolean(node.marker("hidden-marker"));
  }
  reset() {
    this.rootDOMNode = null;
    this.selectDOMNode(null, false);
    this.imagePreviewPopover.hide();
    delete this.clipboardNodeData;
    SDK16.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    this.updateRecords.clear();
  }
  wireToDOMModel(domModel) {
    elementsTreeOutlineByDOMModel.set(domModel, this);
    domModel.addEventListener(SDK16.DOMModel.Events.MarkersChanged, this.markersChanged, this);
    domModel.addEventListener(SDK16.DOMModel.Events.NodeInserted, this.nodeInserted, this);
    domModel.addEventListener(SDK16.DOMModel.Events.NodeRemoved, this.nodeRemoved, this);
    domModel.addEventListener(SDK16.DOMModel.Events.AttrModified, this.attributeModified, this);
    domModel.addEventListener(SDK16.DOMModel.Events.AttrRemoved, this.attributeRemoved, this);
    domModel.addEventListener(SDK16.DOMModel.Events.CharacterDataModified, this.characterDataModified, this);
    domModel.addEventListener(SDK16.DOMModel.Events.DocumentUpdated, this.documentUpdated, this);
    domModel.addEventListener(SDK16.DOMModel.Events.ChildNodeCountUpdated, this.childNodeCountUpdated, this);
    domModel.addEventListener(SDK16.DOMModel.Events.DistributedNodesChanged, this.distributedNodesChanged, this);
    domModel.addEventListener(SDK16.DOMModel.Events.ScrollableFlagUpdated, this.scrollableFlagUpdated, this);
    domModel.addEventListener(SDK16.DOMModel.Events.AffectedByStartingStylesFlagUpdated, this.affectedByStartingStylesFlagUpdated, this);
    domModel.addEventListener(SDK16.DOMModel.Events.AdoptedStyleSheetsModified, this.adoptedStyleSheetsModified, this);
  }
  unwireFromDOMModel(domModel) {
    domModel.removeEventListener(SDK16.DOMModel.Events.MarkersChanged, this.markersChanged, this);
    domModel.removeEventListener(SDK16.DOMModel.Events.NodeInserted, this.nodeInserted, this);
    domModel.removeEventListener(SDK16.DOMModel.Events.NodeRemoved, this.nodeRemoved, this);
    domModel.removeEventListener(SDK16.DOMModel.Events.AttrModified, this.attributeModified, this);
    domModel.removeEventListener(SDK16.DOMModel.Events.AttrRemoved, this.attributeRemoved, this);
    domModel.removeEventListener(SDK16.DOMModel.Events.CharacterDataModified, this.characterDataModified, this);
    domModel.removeEventListener(SDK16.DOMModel.Events.DocumentUpdated, this.documentUpdated, this);
    domModel.removeEventListener(SDK16.DOMModel.Events.ChildNodeCountUpdated, this.childNodeCountUpdated, this);
    domModel.removeEventListener(SDK16.DOMModel.Events.DistributedNodesChanged, this.distributedNodesChanged, this);
    domModel.removeEventListener(SDK16.DOMModel.Events.ScrollableFlagUpdated, this.scrollableFlagUpdated, this);
    domModel.removeEventListener(SDK16.DOMModel.Events.AffectedByStartingStylesFlagUpdated, this.affectedByStartingStylesFlagUpdated, this);
    domModel.removeEventListener(SDK16.DOMModel.Events.AdoptedStyleSheetsModified, this.adoptedStyleSheetsModified, this);
    elementsTreeOutlineByDOMModel.delete(domModel);
  }
  addUpdateRecord(node) {
    let record = this.updateRecords.get(node);
    if (!record) {
      record = new Elements.ElementUpdateRecord.ElementUpdateRecord();
      this.updateRecords.set(node, record);
    }
    return record;
  }
  updateRecordForHighlight(node) {
    if (!this.visible) {
      return null;
    }
    return this.updateRecords.get(node) || null;
  }
  documentUpdated(event) {
    const domModel = event.data;
    this.reset();
    if (domModel.existingDocument()) {
      this.rootDOMNode = domModel.existingDocument();
      this.#addAllElementIssues();
    }
  }
  attributeModified(event) {
    const { node } = event.data;
    this.addUpdateRecord(node).attributeModified(event.data.name);
    this.updateModifiedNodesSoon();
  }
  attributeRemoved(event) {
    const { node } = event.data;
    this.addUpdateRecord(node).attributeRemoved(event.data.name);
    this.updateModifiedNodesSoon();
  }
  characterDataModified(event) {
    const node = event.data;
    this.addUpdateRecord(node).charDataModified();
    if (node.parentNode && node.parentNode.firstChild === node.parentNode.lastChild) {
      this.addUpdateRecord(node.parentNode).childrenModified();
    }
    this.updateModifiedNodesSoon();
  }
  nodeInserted(event) {
    const node = event.data;
    this.addUpdateRecord(node.parentNode).nodeInserted(node);
    this.updateModifiedNodesSoon();
  }
  nodeRemoved(event) {
    const { node, parent } = event.data;
    this.resetClipboardIfNeeded(node);
    this.addUpdateRecord(parent).nodeRemoved(node);
    this.updateModifiedNodesSoon();
  }
  childNodeCountUpdated(event) {
    const node = event.data;
    this.addUpdateRecord(node).childrenModified();
    this.updateModifiedNodesSoon();
  }
  distributedNodesChanged(event) {
    const node = event.data;
    this.addUpdateRecord(node).childrenModified();
    this.updateModifiedNodesSoon();
  }
  adoptedStyleSheetsModified(event) {
    const node = event.data;
    this.addUpdateRecord(node).childrenModified();
    this.updateModifiedNodesSoon();
  }
  updateModifiedNodesSoon() {
    if (!this.updateRecords.size) {
      return;
    }
    if (this.updateModifiedNodesTimeout) {
      return;
    }
    this.updateModifiedNodesTimeout = window.setTimeout(this.updateModifiedNodes.bind(this), 50);
  }
  /**
   * TODO: this is made public for unit tests until the ElementsTreeOutline is
   * migrated into DOMTreeWidget and highlights are declarative.
   */
  updateModifiedNodes() {
    if (this.updateModifiedNodesTimeout) {
      clearTimeout(this.updateModifiedNodesTimeout);
      delete this.updateModifiedNodesTimeout;
    }
    const updatedNodes = [...this.updateRecords.keys()];
    const hidePanelWhileUpdating = updatedNodes.length > 10;
    let treeOutlineContainerElement;
    let originalScrollTop;
    if (hidePanelWhileUpdating) {
      treeOutlineContainerElement = this.element.parentNode;
      originalScrollTop = treeOutlineContainerElement ? treeOutlineContainerElement.scrollTop : 0;
      this.elementInternal.classList.add("hidden");
    }
    const rootNodeUpdateRecords = this.rootDOMNodeInternal && this.updateRecords.get(this.rootDOMNodeInternal);
    if (rootNodeUpdateRecords?.hasChangedChildren()) {
      this.update();
    } else {
      for (const [node, record] of this.updateRecords) {
        if (record.hasChangedChildren()) {
          this.updateModifiedParentNode(node);
        } else {
          this.updateModifiedNode(node);
        }
      }
    }
    if (hidePanelWhileUpdating) {
      this.elementInternal.classList.remove("hidden");
      if (treeOutlineContainerElement && originalScrollTop) {
        treeOutlineContainerElement.scrollTop = originalScrollTop;
      }
    }
    this.updateRecords.clear();
    this.fireElementsTreeUpdated(updatedNodes);
  }
  updateModifiedNode(node) {
    const treeElement = this.findTreeElement(node);
    if (treeElement) {
      treeElement.updateTitle(this.updateRecordForHighlight(node));
    }
  }
  updateModifiedParentNode(node) {
    const parentTreeElement = this.findTreeElement(node);
    if (parentTreeElement) {
      parentTreeElement.setExpandable(this.hasVisibleChildren(node));
      parentTreeElement.updateTitle(this.updateRecordForHighlight(node));
      if (populatedTreeElements.has(parentTreeElement)) {
        this.updateChildren(parentTreeElement);
      }
    }
  }
  populateTreeElement(treeElement) {
    if (treeElement.childCount() || !treeElement.isExpandable()) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      treeElement.node().getChildNodes(() => {
        populatedTreeElements.add(treeElement);
        this.updateModifiedParentNode(treeElement.node());
        resolve();
      });
    });
  }
  createTopLayerContainer(parent, document2) {
    if (!parent.treeOutline || !(parent.treeOutline instanceof _ElementsTreeOutline)) {
      return;
    }
    const container = new TopLayerContainer(parent.treeOutline, document2);
    this.#topLayerContainerByDocument.set(document2, container);
    parent.appendChild(container);
  }
  revealInTopLayer(node) {
    const document2 = node.ownerDocument;
    if (!document2) {
      return;
    }
    const container = this.#topLayerContainerByDocument.get(document2);
    if (container) {
      container.revealInTopLayer(node);
    }
  }
  createElementTreeElement(node, isClosingTag) {
    if (node instanceof SDK16.DOMModel.AdoptedStyleSheet) {
      return new AdoptedStyleSheetTreeElement(node);
    }
    const treeElement = new ElementsTreeElement(node, isClosingTag);
    treeElement.setExpandable(!isClosingTag && this.hasVisibleChildren(node));
    if (node.nodeType() === Node.ELEMENT_NODE && node.parentNode && node.parentNode.nodeType() === Node.DOCUMENT_NODE && !node.parentNode.parentNode) {
      treeElement.setCollapsible(false);
    }
    if (node.hasAssignedSlot()) {
      treeElement.createSlotLink(node.assignedSlot);
    }
    treeElement.selectable = Boolean(this.selectEnabled);
    return treeElement;
  }
  showChild(treeElement, child) {
    if (treeElement.isClosingTag()) {
      return null;
    }
    const index = this.visibleChildren(treeElement.node()).indexOf(child);
    if (index === -1) {
      return null;
    }
    if (index >= treeElement.expandedChildrenLimit()) {
      this.setExpandedChildrenLimit(treeElement, index + 1);
    }
    return treeElement.childAt(index);
  }
  visibleChildren(node) {
    let visibleChildren = [...node.adoptedStyleSheetsForNode, ...ElementsTreeElement.visibleShadowRoots(node)];
    const contentDocument = node.contentDocument();
    if (contentDocument) {
      visibleChildren.push(contentDocument);
    }
    const templateContent = node.templateContent();
    if (templateContent) {
      visibleChildren.push(templateContent);
    }
    visibleChildren.push(...node.viewTransitionPseudoElements());
    const markerPseudoElement = node.markerPseudoElement();
    if (markerPseudoElement) {
      visibleChildren.push(markerPseudoElement);
    }
    const checkmarkPseudoElement = node.checkmarkPseudoElement();
    if (checkmarkPseudoElement) {
      visibleChildren.push(checkmarkPseudoElement);
    }
    const beforePseudoElement = node.beforePseudoElement();
    if (beforePseudoElement) {
      visibleChildren.push(beforePseudoElement);
    }
    visibleChildren.push(...node.carouselPseudoElements());
    if (node.childNodeCount()) {
      let children = node.children() || [];
      if (!this.showHTMLCommentsSetting.get()) {
        children = children.filter((n) => n.nodeType() !== Node.COMMENT_NODE);
      }
      visibleChildren = visibleChildren.concat(children);
    }
    const afterPseudoElement = node.afterPseudoElement();
    if (afterPseudoElement) {
      visibleChildren.push(afterPseudoElement);
    }
    const pickerIconPseudoElement = node.pickerIconPseudoElement();
    if (pickerIconPseudoElement) {
      visibleChildren.push(pickerIconPseudoElement);
    }
    const backdropPseudoElement = node.backdropPseudoElement();
    if (backdropPseudoElement) {
      visibleChildren.push(backdropPseudoElement);
    }
    return visibleChildren;
  }
  hasVisibleChildren(node) {
    if (node.isIframe()) {
      return true;
    }
    if (node.contentDocument()) {
      return true;
    }
    if (node.templateContent()) {
      return true;
    }
    if (ElementsTreeElement.visibleShadowRoots(node).length) {
      return true;
    }
    if (node.hasPseudoElements()) {
      return true;
    }
    if (node.isInsertionPoint()) {
      return true;
    }
    return Boolean(node.childNodeCount()) && !ElementsTreeElement.canShowInlineText(node);
  }
  createExpandAllButtonTreeElement(treeElement) {
    const button = UI19.UIUtils.createTextButton("", handleLoadAllChildren.bind(this));
    button.value = "";
    const expandAllButtonElement = new UI19.TreeOutline.TreeElement(button);
    expandAllButtonElement.selectable = false;
    expandAllButtonElement.button = button;
    return expandAllButtonElement;
    function handleLoadAllChildren(event) {
      const visibleChildCount = this.visibleChildren(treeElement.node()).length;
      this.setExpandedChildrenLimit(treeElement, Math.max(visibleChildCount, treeElement.expandedChildrenLimit() + InitialChildrenLimit));
      event.consume();
    }
  }
  setExpandedChildrenLimit(treeElement, expandedChildrenLimit) {
    if (treeElement.expandedChildrenLimit() === expandedChildrenLimit) {
      return;
    }
    treeElement.setExpandedChildrenLimit(expandedChildrenLimit);
    if (treeElement.treeOutline && !this.treeElementsBeingUpdated.has(treeElement)) {
      this.updateModifiedParentNode(treeElement.node());
    }
  }
  updateChildren(treeElement) {
    if (!treeElement.isExpandable()) {
      if (!treeElement.treeOutline) {
        return;
      }
      const selectedTreeElement = treeElement.treeOutline.selectedTreeElement;
      if (selectedTreeElement?.hasAncestor(treeElement)) {
        treeElement.select(true);
      }
      treeElement.removeChildren();
      return;
    }
    console.assert(!treeElement.isClosingTag());
    this.#updateChildren(treeElement);
  }
  insertChildElement(treeElement, child, index, isClosingTag) {
    const newElement = this.createElementTreeElement(child, isClosingTag);
    treeElement.insertChild(newElement, index);
    return newElement;
  }
  moveChild(treeElement, child, targetIndex) {
    if (treeElement.indexOfChild(child) === targetIndex) {
      return;
    }
    const wasSelected = child.selected;
    if (child.parent) {
      child.parent.removeChild(child);
    }
    treeElement.insertChild(child, targetIndex);
    if (wasSelected) {
      child.select();
    }
  }
  #updateChildren(treeElement) {
    if (this.treeElementsBeingUpdated.has(treeElement)) {
      return;
    }
    this.treeElementsBeingUpdated.add(treeElement);
    const node = treeElement.node();
    const visibleChildren = this.visibleChildren(node);
    const visibleChildrenSet = new Set(visibleChildren);
    const existingTreeElements = /* @__PURE__ */ new Map();
    for (let i = treeElement.childCount() - 1; i >= 0; --i) {
      const existingTreeElement = treeElement.childAt(i);
      if (!(existingTreeElement instanceof ElementsTreeElement)) {
        treeElement.removeChildAtIndex(i);
        continue;
      }
      const elementsTreeElement = existingTreeElement;
      const existingNode = elementsTreeElement.node();
      if (visibleChildrenSet.has(existingNode)) {
        existingTreeElements.set(existingNode, existingTreeElement);
        continue;
      }
      treeElement.removeChildAtIndex(i);
    }
    for (let i = 0; i < visibleChildren.length && i < treeElement.expandedChildrenLimit(); ++i) {
      const child = visibleChildren[i];
      const existingTreeElement = existingTreeElements.get(child) || this.findTreeElement(child);
      if (existingTreeElement && existingTreeElement !== treeElement) {
        this.moveChild(treeElement, existingTreeElement, i);
      } else {
        const newElement = this.insertChildElement(treeElement, child, i);
        if (this.updateRecordForHighlight(node) && treeElement.expanded && newElement instanceof ElementsTreeElement) {
          ElementsTreeElement.animateOnDOMUpdate(newElement);
        }
        if (treeElement.childCount() > treeElement.expandedChildrenLimit()) {
          this.setExpandedChildrenLimit(treeElement, treeElement.expandedChildrenLimit() + 1);
        }
      }
    }
    const expandedChildCount = treeElement.childCount();
    if (visibleChildren.length > expandedChildCount) {
      const targetButtonIndex = expandedChildCount;
      if (!treeElement.expandAllButtonElement) {
        treeElement.expandAllButtonElement = this.createExpandAllButtonTreeElement(treeElement);
      }
      treeElement.insertChild(treeElement.expandAllButtonElement, targetButtonIndex);
      treeElement.expandAllButtonElement.title = i18nString13(UIStrings14.showAllNodesDMore, { PH1: visibleChildren.length - expandedChildCount });
    } else if (treeElement.expandAllButtonElement) {
      treeElement.expandAllButtonElement = null;
    }
    if (node.isInsertionPoint()) {
      for (const distributedNode of node.distributedNodes()) {
        treeElement.appendChild(new ShortcutTreeElement(distributedNode));
      }
    }
    if (node.nodeType() === Node.ELEMENT_NODE && !node.pseudoType() && treeElement.isExpandable()) {
      this.insertChildElement(treeElement, node, treeElement.childCount(), true);
    }
    if (node instanceof SDK16.DOMModel.DOMDocument && !this.isXMLMimeType) {
      let topLayerContainer = this.#topLayerContainerByDocument.get(node);
      if (!topLayerContainer) {
        topLayerContainer = new TopLayerContainer(this, node);
        this.#topLayerContainerByDocument.set(node, topLayerContainer);
      }
      treeElement.appendChild(topLayerContainer);
    }
    this.treeElementsBeingUpdated.delete(treeElement);
  }
  markersChanged(event) {
    const node = event.data;
    const treeElement = this.treeElementByNode.get(node);
    if (treeElement) {
      treeElement.updateDecorations();
    }
  }
  scrollableFlagUpdated(event) {
    let { node } = event.data;
    if (node.nodeName() === "#document") {
      if (!node.ownerDocument?.documentElement) {
        return;
      }
      node = node.ownerDocument.documentElement;
    }
    const treeElement = this.treeElementByNode.get(node);
    if (treeElement && isOpeningTag(treeElement.tagTypeContext)) {
      void treeElement.updateScrollAdorner();
    }
  }
  affectedByStartingStylesFlagUpdated(event) {
    const { node } = event.data;
    const treeElement = this.treeElementByNode.get(node);
    if (treeElement && isOpeningTag(treeElement.tagTypeContext)) {
      void treeElement.updateStyleAdorners();
      void treeElement.updateAdorners();
    }
  }
};
(function(ElementsTreeOutline2) {
  let Events;
  (function(Events2) {
    Events2["SelectedNodeChanged"] = "SelectedNodeChanged";
    Events2["ElementsTreeUpdated"] = "ElementsTreeUpdated";
  })(Events = ElementsTreeOutline2.Events || (ElementsTreeOutline2.Events = {}));
})(ElementsTreeOutline || (ElementsTreeOutline = {}));
var MappedCharToEntity = /* @__PURE__ */ new Map([
  ["\xA0", "nbsp"],
  ["\xAD", "shy"],
  ["\u2002", "ensp"],
  ["\u2003", "emsp"],
  ["\u2009", "thinsp"],
  ["\u200A", "hairsp"],
  ["\u200B", "ZeroWidthSpace"],
  ["\u200C", "zwnj"],
  ["\u200D", "zwj"],
  ["\u200E", "lrm"],
  ["\u200F", "rlm"],
  ["\u202A", "#x202A"],
  ["\u202B", "#x202B"],
  ["\u202C", "#x202C"],
  ["\u202D", "#x202D"],
  ["\u202E", "#x202E"],
  ["\u2060", "NoBreak"],
  ["\uFEFF", "#xFEFF"]
]);

// gen/front_end/panels/elements/LayoutPane.js
var LayoutPane_exports = {};
__export(LayoutPane_exports, {
  LayoutPane: () => LayoutPane
});
import "./../../ui/components/node_text/node_text.js";
import * as Common12 from "./../../core/common/common.js";
import * as i18n29 from "./../../core/i18n/i18n.js";
import * as Platform8 from "./../../core/platform/platform.js";
import * as SDK17 from "./../../core/sdk/sdk.js";
import * as Buttons3 from "./../../ui/components/buttons/buttons.js";
import * as UI20 from "./../../ui/legacy/legacy.js";
import * as Lit7 from "./../../ui/lit/lit.js";
import * as VisualLogging10 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/layoutPane.css.js
var layoutPane_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  * {
    box-sizing: border-box;
    font-size: 12px;
  }

  .header {
    background-color: var(--sys-color-surface2);
    border-bottom: 1px solid var(--sys-color-divider);
    line-height: 1.6;
    overflow: hidden;
    padding: 0 5px;
    white-space: nowrap;
  }

  .header::marker {
    color: var(--sys-color-on-surface-subtle);
    font-size: 11px;
    line-height: 1;
  }

  .header:focus {
    background-color: var(--sys-color-tonal-container);
  }

  .content-section {
    padding: 16px;
    border-bottom: 1px solid var(--sys-color-divider);
    overflow-x: hidden;
  }

  .content-section-title {
    font-size: 12px;
    font-weight: 500;
    line-height: 1.1;
    margin: 0;
    padding: 0;
  }

  .checkbox-settings {
    margin-top: var(--sys-size-5);
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--sys-size-4);

    > div {
      display: flex;
    }
  }

  devtools-checkbox {
    /* Allows label text to get ellipsed */
    flex-shrink: unset;
    margin: 0 6px 0 0;
    padding: 0;
  }

  .select-settings {
    margin-top: 16px;
    width: fit-content;
  }

  .select-label {
    display: flex;
    flex-direction: column;
  }

  .select-label span {
    margin-bottom: 4px;
  }

  .elements {
    margin-top: 12px;
    color: var(--sys-color-token-tag);
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(250px, 100%), 1fr));
    gap: 8px;
  }

  .element {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  .show-element {
    flex: none;
  }

  select {
    min-width: 0;
    max-width: 150px;
  }

  .color-picker {
    opacity: 0%;
  }

  .color-picker-label {
    border: 1px solid var(--sys-color-neutral-outline);
    cursor: default;
    display: inline-block;
    flex: none;
    height: 10px;
    width: 10px;
    position: relative;

    &:focus-within {
      outline: 2px solid var(--sys-color-state-focus-ring);
      outline-offset: 2px;
      border-radius: 2px;
    }
  }
  /* We set dimensions for the invisible input to support quick highlight a11y feature
  that uses the dimensions to draw an outline around the element. */
  .color-picker-label input[type="color"] {
    width: 100%;
    height: 100%;
    position: absolute;
  }

  .color-picker-label:hover,
  .color-picker-label:focus {
    border: 1px solid var(--sys-color-outline);
    transform: scale(1.2);
  }

  .node-text-container {
    line-height: 16px;
    padding: 0 0.5ex;
    border-radius: 5px;
  }

}

/*# sourceURL=${import.meta.resolve("./layoutPane.css")} */`;

// gen/front_end/panels/elements/LayoutPane.js
var UIStrings15 = {
  /**
   * @description Title of the input to select the overlay color for an element using the color picker
   */
  chooseElementOverlayColor: "Choose the overlay color for this element",
  /**
   * @description Title of the show element button in the Layout pane of the Elements panel
   */
  showElementInTheElementsPanel: "Show element in the Elements panel",
  /**
   * @description Title of a section on CSS Grid/Grid Lanes tooling
   */
  gridOrGridLanes: "Grid / Grid Lanes",
  /**
   * @description Title of a section in the Layout Sidebar pane of the Elements panel
   */
  overlayDisplaySettings: "Overlay display settings",
  /**
   * @description Title of a section in Layout sidebar pane
   */
  gridOrGridLanesOverlays: "Grid / Grid Lanes overlays",
  /**
   * @description Message in the Layout panel informing users that no CSS Grid/Grid Lanes layouts were found on the page
   */
  noGridOrGridLanesLayoutsFoundOnThisPage: "No grid or grid lanes layouts found on this page",
  /**
   * @description Title of the Flexbox section in the Layout panel
   */
  flexbox: "Flexbox",
  /**
   * @description Title of a section in the Layout panel
   */
  flexboxOverlays: "Flexbox overlays",
  /**
   * @description Text in the Layout panel, when no flexbox elements are found
   */
  noFlexboxLayoutsFoundOnThisPage: "No flexbox layouts found on this page",
  /**
   * @description Screen reader announcement when opening color picker tool.
   */
  colorPickerOpened: "Color picker opened."
};
var str_15 = i18n29.i18n.registerUIStrings("panels/elements/LayoutPane.ts", UIStrings15);
var i18nString14 = i18n29.i18n.getLocalizedString.bind(void 0, str_15);
var { render: render7, html: html10 } = Lit7;
var nodeToLayoutElement = (node) => {
  const className = node.getAttribute("class");
  const nodeId = node.id;
  return {
    id: nodeId,
    color: "var(--sys-color-inverse-surface)",
    name: node.localName(),
    domId: node.getAttribute("id"),
    domClasses: className ? className.split(/\s+/).filter((s) => !!s) : void 0,
    enabled: false,
    reveal: () => {
      void Common12.Revealer.reveal(node);
      void node.scrollIntoView();
    },
    highlight: () => {
      node.highlight();
    },
    hideHighlight: () => {
      SDK17.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    },
    toggle: (_value) => {
      throw new Error("Not implemented");
    },
    setColor(_value) {
      throw new Error("Not implemented");
    }
  };
};
var gridNodesToElements = (nodes) => {
  return nodes.map((node) => {
    const layoutElement = nodeToLayoutElement(node);
    const nodeId = node.id;
    return {
      ...layoutElement,
      color: node.domModel().overlayModel().colorOfGridInPersistentOverlay(nodeId) || "var(--sys-color-inverse-surface)",
      enabled: node.domModel().overlayModel().isHighlightedGridInPersistentOverlay(nodeId),
      toggle: (value5) => {
        if (value5) {
          node.domModel().overlayModel().highlightGridInPersistentOverlay(nodeId);
        } else {
          node.domModel().overlayModel().hideGridInPersistentOverlay(nodeId);
        }
      },
      setColor(value5) {
        this.color = value5;
        node.domModel().overlayModel().setColorOfGridInPersistentOverlay(nodeId, value5);
      }
    };
  });
};
var flexContainerNodesToElements = (nodes) => {
  return nodes.map((node) => {
    const layoutElement = nodeToLayoutElement(node);
    const nodeId = node.id;
    return {
      ...layoutElement,
      color: node.domModel().overlayModel().colorOfFlexInPersistentOverlay(nodeId) || "var(--sys-color-inverse-surface)",
      enabled: node.domModel().overlayModel().isHighlightedFlexContainerInPersistentOverlay(nodeId),
      toggle: (value5) => {
        if (value5) {
          node.domModel().overlayModel().highlightFlexContainerInPersistentOverlay(nodeId);
        } else {
          node.domModel().overlayModel().hideFlexContainerInPersistentOverlay(nodeId);
        }
      },
      setColor(value5) {
        this.color = value5;
        node.domModel().overlayModel().setColorOfFlexInPersistentOverlay(nodeId, value5);
      }
    };
  });
};
function isEnumSetting(setting) {
  return setting.type === "enum";
}
function isBooleanSetting(setting) {
  return setting.type === "boolean";
}
var layoutPaneInstance;
var DEFAULT_VIEW5 = (input, output, target) => {
  const onColorLabelKeyUp = (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    const target2 = event.target;
    const input2 = target2.querySelector("input");
    input2.click();
    UI20.ARIAUtils.LiveAnnouncer.alert(i18nString14(UIStrings15.colorPickerOpened));
    event.preventDefault();
  };
  const onColorLabelKeyDown = (event) => {
    if (event.key === " ") {
      event.preventDefault();
    }
  };
  const renderElement = (element) => html10`<div
          class="element"
          jslog=${VisualLogging10.item()}>
        <devtools-checkbox
          data-element="true"
          class="checkbox-label"
          .checked=${element.enabled}
          @change=${(e) => input.onElementToggle(element, e)}
          jslog=${VisualLogging10.toggle().track({
    click: true
  })}>
          <span
              class="node-text-container"
              data-label="true"
              @mouseenter=${(e) => input.onMouseEnter(element, e)}
              @mouseleave=${(e) => input.onMouseLeave(element, e)}>
            <devtools-node-text .data=${{
    nodeId: element.domId,
    nodeTitle: element.name,
    nodeClasses: element.domClasses
  }}></devtools-node-text>
          </span>
        </devtools-checkbox>
        <label
            @keyup=${onColorLabelKeyUp}
            @keydown=${onColorLabelKeyDown}
            class="color-picker-label"
            style="background: ${element.color};"
            jslog=${VisualLogging10.showStyleEditor("color").track({
    click: true
  })}>
          <input
              @change=${(e) => input.onColorChange(element, e)}
              @input=${(e) => input.onColorChange(element, e)}
              title=${i18nString14(UIStrings15.chooseElementOverlayColor)}
              tabindex="0"
              class="color-picker"
              type="color"
              value=${element.color} />
        </label>
        <devtools-button class="show-element"
           .title=${i18nString14(UIStrings15.showElementInTheElementsPanel)}
           aria-label=${i18nString14(UIStrings15.showElementInTheElementsPanel)}
           .iconName=${"select-element"}
           .jslogContext=${"elements.select-element"}
           .size=${"SMALL"}
           .variant=${"icon"}
           @click=${(e) => input.onElementClick(element, e)}
           ></devtools-button>
      </div>`;
  render7(
    html10`
      <div style="min-width: min-content;" jslog=${VisualLogging10.pane("layout").track({ resize: true })}>
        <style>${layoutPane_css_default}</style>
        <style>@scope to (devtools-widget > *) { ${UI20.inspectorCommonStyles} }</style>
        <details open>
          <summary class="header"
            @keydown=${input.onSummaryKeyDown}
            jslog=${VisualLogging10.sectionHeader("grid-settings").track({ click: true })}>
            ${i18nString14(UIStrings15.gridOrGridLanes)}
          </summary>
          <div class="content-section" jslog=${VisualLogging10.section("grid-settings")}>
            <h3 class="content-section-title">${i18nString14(UIStrings15.overlayDisplaySettings)}</h3>
            <div class="select-settings">
              ${input.enumSettings.map((setting) => html10`<label data-enum-setting="true" class="select-label" title=${setting.title}>
                      <select
                        data-input="true"
                        jslog=${VisualLogging10.dropDown().track({ change: true }).context(setting.name)}
                        @change=${(e) => input.onEnumSettingChange(setting, e)}>
                        ${setting.options.map((opt) => html10`<option
                                value=${opt.value}
                                .selected=${setting.value === opt.value}
                                jslog=${VisualLogging10.item(Platform8.StringUtilities.toKebabCase(opt.value)).track({
      click: true
    })}>${opt.title}</option>`)}
                      </select>
                    </label>`)}
            </div>
            <div class="checkbox-settings">
              ${input.booleanSettings.map((setting) => html10`<div><devtools-checkbox
                      data-boolean-setting="true"
                      class="checkbox-label"
                      title=${setting.title}
                      .checked=${setting.value}
                      @change=${(e) => input.onBooleanSettingChange(setting, e)}
                      jslog=${VisualLogging10.toggle().track({ click: true }).context(setting.name)}>
                    ${setting.title}
                  </devtools-checkbox></div>`)}
            </div>
          </div>
          ${input.gridElements ? html10`<div class="content-section" jslog=${VisualLogging10.section("grid-overlays")}>
              <h3 class="content-section-title">
                ${input.gridElements.length ? i18nString14(UIStrings15.gridOrGridLanesOverlays) : i18nString14(UIStrings15.noGridOrGridLanesLayoutsFoundOnThisPage)}
              </h3>
              ${input.gridElements.length ? html10`<div class="elements">${input.gridElements.map(renderElement)}</div>` : ""}
            </div>` : ""}
        </details>
        ${input.flexContainerElements !== void 0 ? html10`
          <details open>
            <summary
                class="header"
                @keydown=${input.onSummaryKeyDown}
                jslog=${VisualLogging10.sectionHeader("flexbox-overlays").track({ click: true })}>
              ${i18nString14(UIStrings15.flexbox)}
            </summary>
            ${input.flexContainerElements ? html10`<div class="content-section" jslog=${VisualLogging10.section("flexbox-overlays")}>
                <h3 class="content-section-title">
                  ${input.flexContainerElements.length ? i18nString14(UIStrings15.flexboxOverlays) : i18nString14(UIStrings15.noFlexboxLayoutsFoundOnThisPage)}
                </h3>
                ${input.flexContainerElements.length ? html10`<div class="elements">${input.flexContainerElements.map(renderElement)}</div>` : ""}
              </div>` : ""}
          </details>` : ""}
      </div>`,
    // clang-format on
    target
  );
};
var LayoutPane = class _LayoutPane extends UI20.Widget.Widget {
  #settings = [];
  #uaShadowDOMSetting;
  #domModels;
  #view;
  constructor(element, view = DEFAULT_VIEW5) {
    super(element);
    this.#settings = this.#makeSettings();
    this.#uaShadowDOMSetting = Common12.Settings.Settings.instance().moduleSetting("show-ua-shadow-dom");
    this.#domModels = [];
    this.#view = view;
  }
  static instance() {
    if (!layoutPaneInstance) {
      layoutPaneInstance = new _LayoutPane();
    }
    return layoutPaneInstance;
  }
  modelAdded(domModel) {
    const overlayModel = domModel.overlayModel();
    overlayModel.addEventListener("PersistentGridOverlayStateChanged", this.requestUpdate, this);
    overlayModel.addEventListener("PersistentFlexContainerOverlayStateChanged", this.requestUpdate, this);
    this.#domModels.push(domModel);
  }
  modelRemoved(domModel) {
    const overlayModel = domModel.overlayModel();
    overlayModel.removeEventListener("PersistentGridOverlayStateChanged", this.requestUpdate, this);
    overlayModel.removeEventListener("PersistentFlexContainerOverlayStateChanged", this.requestUpdate, this);
    this.#domModels = this.#domModels.filter((model) => model !== domModel);
  }
  async #fetchNodesByStyle(style) {
    const showUAShadowDOM = this.#uaShadowDOMSetting.get();
    const nodes = [];
    for (const domModel of this.#domModels) {
      try {
        const nodeIds = await domModel.getNodesByStyle(
          style,
          true
          /* pierce */
        );
        for (const nodeId of nodeIds) {
          const node = domModel.nodeForId(nodeId);
          if (node !== null && (showUAShadowDOM || !node.ancestorUserAgentShadowRoot())) {
            nodes.push(node);
          }
        }
      } catch (error) {
        console.warn(error);
      }
    }
    return nodes;
  }
  async #fetchGridNodes() {
    return await this.#fetchNodesByStyle([
      { name: "display", value: "grid" },
      { name: "display", value: "inline-grid" },
      { name: "display", value: "grid-lanes" },
      { name: "display", value: "inline-grid-lanes" }
    ]);
  }
  async #fetchFlexContainerNodes() {
    return await this.#fetchNodesByStyle([{ name: "display", value: "flex" }, { name: "display", value: "inline-flex" }]);
  }
  #makeSettings() {
    const settings = [];
    for (const settingName of ["show-grid-line-labels", "show-grid-track-sizes", "show-grid-areas", "extend-grid-lines"]) {
      const setting = Common12.Settings.Settings.instance().moduleSetting(settingName);
      const settingValue = setting.get();
      const settingType = setting.type();
      if (!settingType) {
        throw new Error("A setting provided to LayoutSidebarPane does not have a setting type");
      }
      if (settingType !== "boolean" && settingType !== "enum") {
        throw new Error("A setting provided to LayoutSidebarPane does not have a supported setting type");
      }
      const mappedSetting = {
        type: settingType,
        name: setting.name,
        title: setting.title()
      };
      if (typeof settingValue === "boolean") {
        settings.push({
          ...mappedSetting,
          value: settingValue,
          options: setting.options().map((opt) => ({
            ...opt,
            value: opt.value
          }))
        });
      } else if (typeof settingValue === "string") {
        settings.push({
          ...mappedSetting,
          value: settingValue,
          options: setting.options().map((opt) => ({
            ...opt,
            value: opt.value
          }))
        });
      }
    }
    return settings;
  }
  onSettingChanged(setting, value5) {
    Common12.Settings.Settings.instance().moduleSetting(setting).set(value5);
  }
  wasShown() {
    super.wasShown();
    for (const setting of this.#settings) {
      Common12.Settings.Settings.instance().moduleSetting(setting.name).addChangeListener(this.requestUpdate, this);
    }
    for (const domModel of this.#domModels) {
      this.modelRemoved(domModel);
    }
    this.#domModels = [];
    SDK17.TargetManager.TargetManager.instance().observeModels(SDK17.DOMModel.DOMModel, this, { scoped: true });
    UI20.Context.Context.instance().addFlavorChangeListener(SDK17.DOMModel.DOMNode, this.requestUpdate, this);
    this.#uaShadowDOMSetting.addChangeListener(this.requestUpdate, this);
    this.requestUpdate();
  }
  willHide() {
    super.willHide();
    for (const setting of this.#settings) {
      Common12.Settings.Settings.instance().moduleSetting(setting.name).removeChangeListener(this.requestUpdate, this);
    }
    SDK17.TargetManager.TargetManager.instance().unobserveModels(SDK17.DOMModel.DOMModel, this);
    UI20.Context.Context.instance().removeFlavorChangeListener(SDK17.DOMModel.DOMNode, this.requestUpdate, this);
    this.#uaShadowDOMSetting.removeChangeListener(this.requestUpdate, this);
  }
  #onSummaryKeyDown(event) {
    if (!event.target) {
      return;
    }
    const summaryElement = event.target;
    const detailsElement = summaryElement.parentElement;
    if (!detailsElement) {
      throw new Error("<details> element is not found for a <summary> element");
    }
    switch (event.key) {
      case "ArrowLeft":
        detailsElement.open = false;
        break;
      case "ArrowRight":
        detailsElement.open = true;
        break;
    }
  }
  async performUpdate() {
    const input = {
      gridElements: gridNodesToElements(await this.#fetchGridNodes()),
      flexContainerElements: flexContainerNodesToElements(await this.#fetchFlexContainerNodes()),
      onEnumSettingChange: this.#onEnumSettingChange.bind(this),
      onElementClick: this.#onElementClick.bind(this),
      onColorChange: this.#onColorChange.bind(this),
      onMouseLeave: this.#onElementMouseLeave.bind(this),
      onMouseEnter: this.#onElementMouseEnter.bind(this),
      onElementToggle: this.#onElementToggle.bind(this),
      onBooleanSettingChange: this.#onBooleanSettingChange.bind(this),
      enumSettings: this.#getEnumSettings(),
      booleanSettings: this.#getBooleanSettings(),
      onSummaryKeyDown: this.#onSummaryKeyDown.bind(this)
    };
    this.#view(input, {}, this.contentElement);
  }
  #getEnumSettings() {
    return this.#settings.filter(isEnumSetting);
  }
  #getBooleanSettings() {
    return this.#settings.filter(isBooleanSetting);
  }
  #onBooleanSettingChange(setting, event) {
    event.preventDefault();
    this.onSettingChanged(setting.name, event.target.checked);
  }
  #onEnumSettingChange(setting, event) {
    event.preventDefault();
    this.onSettingChanged(setting.name, event.target.value);
  }
  #onElementToggle(element, event) {
    event.preventDefault();
    element.toggle(event.target.checked);
  }
  #onElementClick(element, event) {
    event.preventDefault();
    element.reveal();
  }
  #onColorChange(element, event) {
    event.preventDefault();
    element.setColor(event.target.value);
    this.requestUpdate();
  }
  #onElementMouseEnter(element, event) {
    event.preventDefault();
    element.highlight();
  }
  #onElementMouseLeave(element, event) {
    event.preventDefault();
    element.hideHighlight();
  }
};

// gen/front_end/panels/elements/MetricsSidebarPane.js
var MetricsSidebarPane_exports = {};
__export(MetricsSidebarPane_exports, {
  MetricsSidebarPane: () => MetricsSidebarPane
});
import * as Common13 from "./../../core/common/common.js";
import * as Platform9 from "./../../core/platform/platform.js";
import * as SDK18 from "./../../core/sdk/sdk.js";
import * as UI21 from "./../../ui/legacy/legacy.js";
import * as VisualLogging11 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/metricsSidebarPane.css.js
var metricsSidebarPane_css_default = `/**
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
.metrics {
  padding: 8px;
  font-size: 10px;
  text-align: center;
  white-space: nowrap;
  min-height: var(--metrics-height);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  /* Colors in the metrics panel need special treatment. The color of the
  various box-model regions (margin, border, padding, content) are set in JS
  by using the ones from the in-page overlay. They, therefore, do not depend on
  the theme.
  To ensure proper contrast between those colors and the 1px borders between
  them, we use these local variables, not theme variables. */
  --override-box-model-separator-color: var(--ref-palette-neutral0);
  --override-box-model-text-color: var(--ref-palette-neutral10);
}

:host {
  --metrics-height: 190px;

  height: var(--metrics-height);
  contain: strict;
}

:host(.invisible) {
  visibility: hidden;
  height: 0;
}

:host(.collapsed) {
  visibility: collapse;
  height: 0;
}
/* The font we use on Windows takes up more vertical space, so adjust
 * the height of the metrics sidebar pane accordingly.
 */
:host-context(.platform-windows) {
  --metrics-height: 214px;
}

.metrics .label {
  position: absolute;
  font-size: 10px;
  left: 4px;
}

.metrics .position {
  /* This border is different from the ones displayed between the box-model
  regions because it is displayed against the pane background, so needs to be
  visible in both light and dark theme. We therefore use a theme variable. */
  border: 1px var(--sys-color-token-subtle) dotted;
  background-color: var(--sys-color-cdt-base-container);
  display: inline-block;
  text-align: center;
  padding: 3px;
  margin: 3px;
  position: relative;
}

.metrics .margin {
  border: 1px dashed var(--override-box-model-separator-color);
  background-color: var(--sys-color-cdt-base-container);
  display: inline-block;
  text-align: center;
  vertical-align: middle;
  padding: 3px 6px;
  margin: 3px;
  position: relative;
}

.metrics .border {
  border: 1px solid var(--override-box-model-separator-color);
  background-color: var(--sys-color-cdt-base-container);
  display: inline-block;
  text-align: center;
  vertical-align: middle;
  padding: 3px 6px;
  margin: 3px;
  position: relative;
}

.metrics .padding {
  border: 1px dashed var(--override-box-model-separator-color);
  background-color: var(--sys-color-cdt-base-container);
  display: inline-block;
  text-align: center;
  vertical-align: middle;
  padding: 3px 6px;
  margin: 3px;
  position: relative;
  min-width: 120px;
}

.metrics .content {
  position: static;
  border: 1px solid var(--override-box-model-separator-color);
  background-color: var(--sys-color-cdt-base-container);
  display: inline-block;
  text-align: center;
  vertical-align: middle;
  padding: 3px;
  margin: 3px;
  min-width: 80px;
  overflow: visible;
}

.metrics .content span {
  display: inline-block;
}

.metrics .editing {
  position: relative;
  z-index: 100;
  cursor: text;
}

.metrics .left {
  display: inline-block;
  vertical-align: middle;
}

.metrics .right {
  display: inline-block;
  vertical-align: middle;
}

.metrics .top {
  display: inline-block;
}

.metrics .bottom {
  display: inline-block;
}

/* In dark theme, when a specific box-model region is hovered, the other regions
lose their background colors, so we need to give them a lighter border color so
that region separators remain visible against the dark panel background. */
:host-context(.theme-with-dark-background) .margin:hover,
:host-context(.theme-with-dark-background) .margin:hover * {
  border-color: var(--sys-color-token-subtle);
}

/* With the exception of the position labels, labels are displayed on top of
the box-model region colors, so need to use the following color to remain
visible. */
.metrics .highlighted:not(.position) > *:not(.border, .padding, .content) {
  color: var(--override-box-model-text-color);
}

/*# sourceURL=${import.meta.resolve("./metricsSidebarPane.css")} */`;

// gen/front_end/panels/elements/MetricsSidebarPane.js
var MetricsSidebarPane = class extends ElementsSidebarPane {
  originalPropertyData;
  previousPropertyDataCandidate;
  inlineStyle;
  highlightMode;
  boxElements;
  isEditingMetrics;
  constructor(computedStyleModel) {
    super(computedStyleModel);
    this.registerRequiredCSS(metricsSidebarPane_css_default);
    this.originalPropertyData = null;
    this.previousPropertyDataCandidate = null;
    this.inlineStyle = null;
    this.highlightMode = "";
    this.boxElements = [];
    this.contentElement.setAttribute("jslog", `${VisualLogging11.pane("styles-metrics")}`);
  }
  doUpdate() {
    if (this.isEditingMetrics) {
      return Promise.resolve();
    }
    const node = this.node();
    const cssModel = this.cssModel();
    if (!node || node.nodeType() !== Node.ELEMENT_NODE || !cssModel) {
      this.contentElement.removeChildren();
      this.element.classList.add("collapsed");
      return Promise.resolve();
    }
    function callback(style) {
      if (!style || this.node() !== node) {
        return;
      }
      this.updateMetrics(style);
    }
    if (!node.id) {
      return Promise.resolve();
    }
    const promises = [
      cssModel.getComputedStyle(node.id).then(callback.bind(this)),
      cssModel.getInlineStyles(node.id).then((inlineStyleResult) => {
        if (inlineStyleResult && this.node() === node) {
          this.inlineStyle = inlineStyleResult.inlineStyle;
        }
      })
    ];
    return Promise.all(promises);
  }
  onCSSModelChanged() {
    this.update();
  }
  /**
   * Toggle the visibility of the Metrics pane. This toggle allows external
   * callers to control the visibility of this pane, but toggling this on does
   * not guarantee the pane will always show up, because the pane's visibility
   * is also controlled by the internal condition that style cannot be empty.
   */
  toggleVisibility(isVisible) {
    this.element.classList.toggle("invisible", !isVisible);
  }
  getPropertyValueAsPx(style, propertyName) {
    const propertyValue = style.get(propertyName);
    if (!propertyValue) {
      return 0;
    }
    return Number(propertyValue.replace(/px$/, "") || 0);
  }
  getBox(computedStyle, componentName) {
    const suffix = componentName === "border" ? "-width" : "";
    const left = this.getPropertyValueAsPx(computedStyle, componentName + "-left" + suffix);
    const top = this.getPropertyValueAsPx(computedStyle, componentName + "-top" + suffix);
    const right = this.getPropertyValueAsPx(computedStyle, componentName + "-right" + suffix);
    const bottom = this.getPropertyValueAsPx(computedStyle, componentName + "-bottom" + suffix);
    return { left, top, right, bottom };
  }
  highlightDOMNode(showHighlight, mode, event) {
    event.consume();
    const node = this.node();
    if (showHighlight && node) {
      if (this.highlightMode === mode) {
        return;
      }
      this.highlightMode = mode;
      node.highlight(mode);
    } else {
      this.highlightMode = "";
      SDK18.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
    for (const { element, name, backgroundColor } of this.boxElements) {
      const shouldHighlight = !node || mode === "all" || name === mode;
      element.style.backgroundColor = shouldHighlight ? backgroundColor : "";
      element.classList.toggle("highlighted", shouldHighlight);
    }
  }
  updateMetrics(style) {
    const metricsElement = document.createElement("div");
    metricsElement.className = "metrics";
    const self = this;
    function createBoxPartElement(style2, name, side, suffix) {
      const element = document.createElement("div");
      element.className = side;
      const propertyName = (name !== "position" ? name + "-" : "") + side + suffix;
      let value5 = style2.get(propertyName);
      if (value5 === void 0) {
        return element;
      }
      if (value5 === "" || name !== "position" && value5 === "unset") {
        value5 = "\u2012";
      } else if (name === "position" && value5 === "auto") {
        value5 = "\u2012";
      }
      value5 = value5.replace(/px$/, "");
      value5 = Platform9.NumberUtilities.toFixedIfFloating(value5);
      element.textContent = value5;
      element.setAttribute("jslog", `${VisualLogging11.value(propertyName).track({
        dblclick: true,
        keydown: "Enter|Escape|ArrowUp|ArrowDown|PageUp|PageDown",
        change: true
      })}`);
      element.addEventListener("dblclick", this.startEditing.bind(this, element, name, propertyName, style2), false);
      return element;
    }
    function getContentAreaWidthPx(style2) {
      let width = style2.get("width");
      if (!width) {
        return "";
      }
      width = width.replace(/px$/, "");
      const widthValue = Number(width);
      if (!isNaN(widthValue) && style2.get("box-sizing") === "border-box") {
        const borderBox = self.getBox(style2, "border");
        const paddingBox = self.getBox(style2, "padding");
        width = (widthValue - borderBox.left - borderBox.right - paddingBox.left - paddingBox.right).toString();
      }
      return Platform9.NumberUtilities.toFixedIfFloating(width);
    }
    function getContentAreaHeightPx(style2) {
      let height = style2.get("height");
      if (!height) {
        return "";
      }
      height = height.replace(/px$/, "");
      const heightValue = Number(height);
      if (!isNaN(heightValue) && style2.get("box-sizing") === "border-box") {
        const borderBox = self.getBox(style2, "border");
        const paddingBox = self.getBox(style2, "padding");
        height = (heightValue - borderBox.top - borderBox.bottom - paddingBox.top - paddingBox.bottom).toString();
      }
      return Platform9.NumberUtilities.toFixedIfFloating(height);
    }
    const noMarginDisplayType = /* @__PURE__ */ new Set([
      "table-cell",
      "table-column",
      "table-column-group",
      "table-footer-group",
      "table-header-group",
      "table-row",
      "table-row-group"
    ]);
    const noPaddingDisplayType = /* @__PURE__ */ new Set([
      "table-column",
      "table-column-group",
      "table-footer-group",
      "table-header-group",
      "table-row",
      "table-row-group"
    ]);
    const noPositionType = /* @__PURE__ */ new Set(["static"]);
    const boxes = ["content", "padding", "border", "margin", "position"];
    const boxColors = [
      Common13.Color.PageHighlight.Content,
      Common13.Color.PageHighlight.Padding,
      Common13.Color.PageHighlight.Border,
      Common13.Color.PageHighlight.Margin,
      Common13.Color.Legacy.fromRGBA([0, 0, 0, 0])
    ];
    const boxLabels = ["content", "padding", "border", "margin", "position"];
    let previousBox = null;
    this.boxElements = [];
    for (let i = 0; i < boxes.length; ++i) {
      const name = boxes[i];
      const display = style.get("display");
      const position = style.get("position");
      if (!display || !position) {
        continue;
      }
      if (name === "margin" && noMarginDisplayType.has(display)) {
        continue;
      }
      if (name === "padding" && noPaddingDisplayType.has(display)) {
        continue;
      }
      if (name === "position" && noPositionType.has(position)) {
        continue;
      }
      const boxElement = document.createElement("div");
      boxElement.className = `${name} highlighted`;
      const backgroundColor = boxColors[i].asString(
        "rgba"
        /* Common.Color.Format.RGBA */
      ) || "";
      boxElement.style.backgroundColor = backgroundColor;
      boxElement.setAttribute("jslog", `${VisualLogging11.metricsBox().context(name).track({ hover: true })}`);
      boxElement.addEventListener("mouseover", this.highlightDOMNode.bind(this, true, name === "position" ? "all" : name), false);
      this.boxElements.push({ element: boxElement, name, backgroundColor });
      if (name === "content") {
        const widthElement = document.createElement("span");
        widthElement.textContent = getContentAreaWidthPx(style);
        widthElement.addEventListener("dblclick", this.startEditing.bind(this, widthElement, "width", "width", style), false);
        widthElement.setAttribute("jslog", `${VisualLogging11.value("width").track({
          dblclick: true,
          keydown: "Enter|Escape|ArrowUp|ArrowDown|PageUp|PageDown",
          change: true
        })}`);
        const heightElement = document.createElement("span");
        heightElement.textContent = getContentAreaHeightPx(style);
        heightElement.addEventListener("dblclick", this.startEditing.bind(this, heightElement, "height", "height", style), false);
        heightElement.setAttribute("jslog", `${VisualLogging11.value("height").track({
          dblclick: true,
          keydown: "Enter|Escape|ArrowUp|ArrowDown|PageUp|PageDown",
          change: true
        })}`);
        const timesElement = document.createElement("span");
        timesElement.textContent = " \xD7 ";
        boxElement.appendChild(widthElement);
        boxElement.appendChild(timesElement);
        boxElement.appendChild(heightElement);
      } else {
        const suffix = name === "border" ? "-width" : "";
        const labelElement = document.createElement("div");
        labelElement.className = "label";
        labelElement.textContent = boxLabels[i];
        boxElement.appendChild(labelElement);
        boxElement.appendChild(createBoxPartElement.call(this, style, name, "top", suffix));
        boxElement.appendChild(document.createElement("br"));
        boxElement.appendChild(createBoxPartElement.call(this, style, name, "left", suffix));
        if (previousBox) {
          boxElement.appendChild(previousBox);
        }
        boxElement.appendChild(createBoxPartElement.call(this, style, name, "right", suffix));
        boxElement.appendChild(document.createElement("br"));
        boxElement.appendChild(createBoxPartElement.call(this, style, name, "bottom", suffix));
      }
      previousBox = boxElement;
    }
    metricsElement.appendChild(previousBox);
    metricsElement.addEventListener("mouseover", this.highlightDOMNode.bind(this, false, "all"), false);
    metricsElement.addEventListener("mouseleave", this.highlightDOMNode.bind(this, false, "all"), false);
    this.contentElement.removeChildren();
    this.contentElement.appendChild(metricsElement);
    this.element.classList.remove("collapsed");
  }
  startEditing(targetElement, box, styleProperty, computedStyle) {
    if (UI21.UIUtils.isBeingEdited(targetElement)) {
      return;
    }
    const context = { box, styleProperty, computedStyle, keyDownHandler: () => {
    } };
    const boundKeyDown = this.handleKeyDown.bind(this, context);
    context.keyDownHandler = boundKeyDown;
    targetElement.addEventListener("keydown", boundKeyDown, false);
    this.isEditingMetrics = true;
    const config = new UI21.InplaceEditor.Config(this.editingCommitted.bind(this), this.editingCancelled.bind(this), context);
    UI21.InplaceEditor.InplaceEditor.startEditing(targetElement, config);
    const selection = targetElement.getComponentSelection();
    selection?.selectAllChildren(targetElement);
  }
  handleKeyDown(context, event) {
    const element = event.currentTarget;
    function finishHandler(originalValue, replacementString) {
      this.applyUserInput(element, replacementString, originalValue, context, false);
    }
    function customNumberHandler(prefix, number, suffix) {
      if (context.styleProperty !== "margin" && number < 0) {
        number = 0;
      }
      return prefix + number + suffix;
    }
    UI21.UIUtils.handleElementValueModifications(event, element, finishHandler.bind(this), void 0, customNumberHandler);
  }
  editingEnded(element, context) {
    this.originalPropertyData = null;
    this.previousPropertyDataCandidate = null;
    element.removeEventListener("keydown", context.keyDownHandler, false);
    delete this.isEditingMetrics;
  }
  editingCancelled(element, context) {
    if (this.inlineStyle) {
      if (!this.originalPropertyData) {
        const pastLastSourcePropertyIndex = this.inlineStyle.pastLastSourcePropertyIndex();
        if (pastLastSourcePropertyIndex) {
          void this.inlineStyle.allProperties()[pastLastSourcePropertyIndex - 1].setText("", false);
        }
      } else {
        void this.inlineStyle.allProperties()[this.originalPropertyData.index].setText(this.originalPropertyData.propertyText || "", false);
      }
    }
    this.editingEnded(element, context);
    this.update();
  }
  applyUserInput(element, userInput, previousContent, context, commitEditor) {
    if (!this.inlineStyle) {
      return this.editingCancelled(element, context);
    }
    if (commitEditor && userInput === previousContent) {
      return this.editingCancelled(element, context);
    }
    if (context.box !== "position" && (!userInput || userInput === "\u2012" || userInput === "-")) {
      userInput = "unset";
    } else if (context.box === "position" && (!userInput || userInput === "\u2012" || userInput === "-")) {
      userInput = "auto";
    }
    userInput = userInput.toLowerCase();
    if (/^\d+$/.test(userInput)) {
      userInput += "px";
    }
    const styleProperty = context.styleProperty;
    const computedStyle = context.computedStyle;
    if (computedStyle.get("box-sizing") === "border-box" && (styleProperty === "width" || styleProperty === "height")) {
      if (!userInput.match(/px$/)) {
        Common13.Console.Console.instance().error("For elements with box-sizing: border-box, only absolute content area dimensions can be applied");
        return;
      }
      const borderBox = this.getBox(computedStyle, "border");
      const paddingBox = this.getBox(computedStyle, "padding");
      let userValuePx = Number(userInput.replace(/px$/, ""));
      if (isNaN(userValuePx)) {
        return;
      }
      if (styleProperty === "width") {
        userValuePx += borderBox.left + borderBox.right + paddingBox.left + paddingBox.right;
      } else {
        userValuePx += borderBox.top + borderBox.bottom + paddingBox.top + paddingBox.bottom;
      }
      userInput = userValuePx + "px";
    }
    this.previousPropertyDataCandidate = null;
    const allProperties = this.inlineStyle.allProperties();
    for (let i = 0; i < allProperties.length; ++i) {
      const property = allProperties[i];
      if (property.name !== context.styleProperty || property.parsedOk && !property.activeInStyle()) {
        continue;
      }
      this.previousPropertyDataCandidate = property;
      property.setValue(userInput, commitEditor, true, callback.bind(this));
      return;
    }
    this.inlineStyle.appendProperty(context.styleProperty, userInput, callback.bind(this));
    function callback(success) {
      if (!success) {
        return;
      }
      if (!this.originalPropertyData) {
        this.originalPropertyData = this.previousPropertyDataCandidate;
      }
      if (this.highlightMode) {
        const node = this.node();
        if (!node) {
          return;
        }
        node.highlight(this.highlightMode);
      }
      if (commitEditor) {
        this.update();
      }
    }
  }
  editingCommitted(element, userInput, previousContent, context) {
    this.editingEnded(element, context);
    this.applyUserInput(element, userInput, previousContent, context, true);
  }
};

// gen/front_end/panels/elements/ElementsPanel.js
var UIStrings16 = {
  /**
   * @description Placeholder text for the search box the Elements Panel. Selector refers to CSS
   * selectors.
   */
  findByStringSelectorOrXpath: "Find by string, selector, or `XPath`",
  /**
   * @description Button text for a button that takes the user to the Accessibility Tree View from the
   * DOM tree view, in the Elements panel.
   */
  switchToAccessibilityTreeView: "Switch to Accessibility Tree view",
  /**
   * @description Button text for a button that takes the user to the DOM tree view from the
   * Accessibility Tree View, in the Elements panel.
   */
  switchToDomTreeView: "Switch to DOM Tree view",
  /**
   * @description Tooltip for the the Computed Styles sidebar toggle in the Styles pane. Command to
   * open/show the sidebar.
   */
  showComputedStylesSidebar: "Show Computed Styles sidebar",
  /**
   * @description Tooltip for the the Computed Styles sidebar toggle in the Styles pane. Command to
   * close/hide the sidebar.
   */
  hideComputedStylesSidebar: "Hide Computed Styles sidebar",
  /**
   * @description Screen reader announcement when the computed styles sidebar is shown in the Elements panel.
   */
  computedStylesShown: "Computed Styles sidebar shown",
  /**
   * @description Screen reader announcement when the computed styles sidebar is hidden in the Elements panel.
   */
  computedStylesHidden: "Computed Styles sidebar hidden",
  /**
   * @description Title of a pane in the Elements panel that shows computed styles for the selected
   * HTML element. Computed styles are the final, actual styles of the element, including all
   * implicit and specified styles.
   */
  computed: "Computed",
  /**
   * @description Title of a pane in the Elements panel that shows the CSS styles for the selected
   * HTML element.
   */
  styles: "Styles",
  /**
   * @description A context menu item to reveal a node in the DOM tree of the Elements Panel
   */
  openInElementsPanel: "Open in Elements panel",
  /**
   * @description Warning/error text displayed when a node cannot be found in the current page.
   */
  nodeCannotBeFoundInTheCurrent: "Node cannot be found in the current page.",
  /**
   * @description Console warning when a user tries to reveal a non-node type Remote Object. A remote
   * object is a JavaScript object that is not stored in DevTools, that DevTools has a connection to.
   * It should correspond to a local node.
   */
  theRemoteObjectCouldNotBe: "The remote object could not be resolved to a valid node.",
  /**
   * @description Console warning when the user tries to reveal a deferred DOM Node that resolves as
   * null. A deferred DOM node is a node we know about but have not yet fetched from the backend (we
   * defer the work until later).
   */
  theDeferredDomNodeCouldNotBe: "The deferred `DOM` Node could not be resolved to a valid node.",
  /**
   * @description Text in Elements Panel of the Elements panel. Shows the current CSS Pseudo-classes
   * applicable to the selected HTML element.
   * @example {::after, ::before} PH1
   */
  elementStateS: "Element state: {PH1}",
  /**
   * @description Accessible name for side panel toolbar.
   */
  sidePanelToolbar: "Side panel toolbar",
  /**
   * @description Accessible name for side panel contents.
   */
  sidePanelContent: "Side panel content",
  /**
   * @description Accessible name for the DOM tree explorer view.
   */
  domTreeExplorer: "DOM tree explorer",
  /**
   * @description A context menu item to reveal a submenu with badge settings.
   */
  adornerSettings: "Badge settings"
};
var str_16 = i18n31.i18n.registerUIStrings("panels/elements/ElementsPanel.ts", UIStrings16);
var i18nString15 = i18n31.i18n.getLocalizedString.bind(void 0, str_16);
var createAccessibilityTreeToggleButton = (isActive) => {
  const button = new Buttons4.Button.Button();
  const title = isActive ? i18nString15(UIStrings16.switchToDomTreeView) : i18nString15(UIStrings16.switchToAccessibilityTreeView);
  button.data = {
    active: isActive,
    variant: "toolbar",
    iconName: "person",
    title,
    jslogContext: "toggle-accessibility-tree"
  };
  button.tabIndex = 0;
  button.classList.add("axtree-button");
  if (isActive) {
    button.classList.add("active");
  }
  return button;
};
var elementsPanelInstance;
var ElementsPanel = class _ElementsPanel extends UI22.Panel.Panel {
  splitWidget;
  #searchableView;
  mainContainer;
  domTreeContainer;
  splitMode;
  accessibilityTreeView;
  breadcrumbs;
  stylesWidget;
  computedStyleWidget;
  metricsWidget;
  searchResults;
  currentSearchResultIndex;
  pendingNodeReveal;
  adornerManager;
  adornersByName;
  accessibilityTreeButton;
  domTreeButton;
  selectedNodeOnReset;
  hasNonDefaultSelectedNode;
  searchConfig;
  omitDefaultSelection;
  notFirstInspectElement;
  sidebarPaneView;
  stylesViewToReveal;
  nodeInsertedTaskRunner = {
    queue: Promise.resolve(),
    run(task) {
      this.queue = this.queue.then(task);
    }
  };
  cssStyleTrackerByCSSModel;
  #domTreeWidget;
  getTreeOutlineForTesting() {
    return this.#domTreeWidget.getTreeOutlineForTesting();
  }
  constructor() {
    super("elements");
    this.registerRequiredCSS(elementsPanel_css_default);
    this.splitWidget = new UI22.SplitWidget.SplitWidget(true, true, "elements-panel-split-view-state", 325, 325);
    this.splitWidget.addEventListener("SidebarSizeChanged", this.updateTreeOutlineVisibleWidth.bind(this));
    this.splitWidget.show(this.element);
    this.#searchableView = new UI22.SearchableView.SearchableView(this, null);
    this.#searchableView.setMinimalSearchQuerySize(0);
    this.#searchableView.setMinimumSize(25, 28);
    this.#searchableView.setPlaceholder(i18nString15(UIStrings16.findByStringSelectorOrXpath));
    const stackElement = this.#searchableView.element;
    this.mainContainer = document.createElement("div");
    this.domTreeContainer = document.createElement("div");
    const crumbsContainer = document.createElement("div");
    if (Root7.Runtime.experiments.isEnabled("full-accessibility-tree")) {
      this.initializeFullAccessibilityTreeView();
    }
    this.mainContainer.appendChild(this.domTreeContainer);
    stackElement.appendChild(this.mainContainer);
    stackElement.appendChild(crumbsContainer);
    UI22.ARIAUtils.markAsMain(this.domTreeContainer);
    UI22.ARIAUtils.setLabel(this.domTreeContainer, i18nString15(UIStrings16.domTreeExplorer));
    this.splitWidget.setMainWidget(this.#searchableView);
    this.splitMode = null;
    this.mainContainer.id = "main-content";
    this.domTreeContainer.id = "elements-content";
    this.domTreeContainer.tabIndex = -1;
    if (Common14.Settings.Settings.instance().moduleSetting("dom-word-wrap").get()) {
      this.domTreeContainer.classList.add("elements-wrap");
    }
    Common14.Settings.Settings.instance().moduleSetting("dom-word-wrap").addChangeListener(this.domWordWrapSettingChanged.bind(this));
    crumbsContainer.id = "elements-crumbs";
    if (this.domTreeButton) {
      this.accessibilityTreeView = new AccessibilityTreeView(this.domTreeButton, new TreeOutline13.TreeOutline.TreeOutline());
    }
    this.breadcrumbs = new ElementsComponents7.ElementsBreadcrumbs.ElementsBreadcrumbs();
    this.breadcrumbs.addEventListener("breadcrumbsnodeselected", (event) => {
      this.crumbNodeSelected(event);
    });
    crumbsContainer.appendChild(this.breadcrumbs);
    const computedStyleModel = new ComputedStyleModel();
    this.stylesWidget = new StylesSidebarPane(computedStyleModel);
    this.computedStyleWidget = new ComputedStyleWidget(computedStyleModel);
    this.metricsWidget = new MetricsSidebarPane(computedStyleModel);
    Common14.Settings.Settings.instance().moduleSetting("sidebar-position").addChangeListener(this.updateSidebarPosition.bind(this));
    this.updateSidebarPosition();
    this.cssStyleTrackerByCSSModel = /* @__PURE__ */ new Map();
    this.currentSearchResultIndex = -1;
    this.pendingNodeReveal = false;
    this.adornerManager = new ElementsComponents7.AdornerManager.AdornerManager(Common14.Settings.Settings.instance().moduleSetting("adorner-settings"));
    this.adornersByName = /* @__PURE__ */ new Map();
    this.#domTreeWidget = new DOMTreeWidget();
    this.#domTreeWidget.omitRootDOMNode = true;
    this.#domTreeWidget.selectEnabled = true;
    this.#domTreeWidget.onSelectedNodeChanged = this.selectedNodeChanged.bind(this);
    this.#domTreeWidget.onElementsTreeUpdated = this.updateBreadcrumbIfNeeded.bind(this);
    this.#domTreeWidget.onDocumentUpdated = this.documentUpdated.bind(this);
    this.#domTreeWidget.onElementExpanded = this.handleElementExpanded.bind(this);
    this.#domTreeWidget.onElementCollapsed = this.handleElementCollapsed.bind(this);
    this.#domTreeWidget.setWordWrap(Common14.Settings.Settings.instance().moduleSetting("dom-word-wrap").get());
    SDK19.TargetManager.TargetManager.instance().observeModels(SDK19.DOMModel.DOMModel, this, { scoped: true });
    SDK19.TargetManager.TargetManager.instance().addEventListener("NameChanged", (event) => this.targetNameChanged(event.data));
    Common14.Settings.Settings.instance().moduleSetting("show-ua-shadow-dom").addChangeListener(this.showUAShadowDOMChanged.bind(this));
    PanelCommon.ExtensionServer.ExtensionServer.instance().addEventListener("SidebarPaneAdded", this.extensionSidebarPaneAdded, this);
    if (Annotations.AnnotationRepository.annotationsEnabled()) {
      PanelCommon.AnnotationManager.instance().initializePlacementForAnnotationType(Annotations.AnnotationType.ELEMENT_NODE, this.resolveInitialState.bind(this), this.#domTreeWidget.element);
    }
  }
  handleElementExpanded() {
    if (Annotations.AnnotationRepository.annotationsEnabled()) {
      void PanelCommon.AnnotationManager.instance().resolveAnnotationsOfType(Annotations.AnnotationType.ELEMENT_NODE);
    }
  }
  handleElementCollapsed() {
    if (Annotations.AnnotationRepository.annotationsEnabled()) {
      void PanelCommon.AnnotationManager.instance().resolveAnnotationsOfType(Annotations.AnnotationType.ELEMENT_NODE);
    }
  }
  initializeFullAccessibilityTreeView() {
    this.accessibilityTreeButton = createAccessibilityTreeToggleButton(false);
    this.accessibilityTreeButton.addEventListener("click", this.showAccessibilityTree.bind(this));
    this.domTreeButton = createAccessibilityTreeToggleButton(true);
    this.domTreeButton.addEventListener("click", this.showDOMTree.bind(this));
    this.mainContainer.appendChild(this.accessibilityTreeButton);
  }
  showAccessibilityTree() {
    if (this.accessibilityTreeView) {
      this.splitWidget.setMainWidget(this.accessibilityTreeView);
    }
  }
  showDOMTree() {
    this.splitWidget.setMainWidget(this.#searchableView);
    const selectedNode = this.selectedDOMNode();
    if (!selectedNode) {
      return;
    }
    this.#domTreeWidget.selectDOMNodeWithoutReveal(selectedNode);
  }
  toggleAccessibilityTree() {
    if (!this.domTreeButton) {
      return;
    }
    if (this.splitWidget.mainWidget() === this.accessibilityTreeView) {
      this.showDOMTree();
    } else {
      this.showAccessibilityTree();
    }
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!elementsPanelInstance || forceNew) {
      elementsPanelInstance = new _ElementsPanel();
    }
    return elementsPanelInstance;
  }
  revealProperty(cssProperty) {
    if (!this.sidebarPaneView || !this.stylesViewToReveal) {
      return Promise.resolve();
    }
    return this.sidebarPaneView.showView(this.stylesViewToReveal).then(() => {
      this.stylesWidget.revealProperty(cssProperty);
    });
  }
  resolveLocation(_locationName) {
    return this.sidebarPaneView || null;
  }
  showToolbarPane(widget, toggle6) {
    this.stylesWidget.showToolbarPane(widget, toggle6);
  }
  modelAdded(domModel) {
    this.setupStyleTracking(domModel.cssModel());
    this.#domTreeWidget.modelAdded(domModel);
    if (this.isShowing()) {
      this.wasShown();
    }
    if (this.domTreeContainer.hasFocus()) {
      this.#domTreeWidget.focus();
    }
    domModel.addEventListener(SDK19.DOMModel.Events.DocumentUpdated, this.documentUpdatedEvent, this);
    domModel.addEventListener(SDK19.DOMModel.Events.NodeInserted, this.handleNodeInserted, this);
  }
  modelRemoved(domModel) {
    domModel.removeEventListener(SDK19.DOMModel.Events.DocumentUpdated, this.documentUpdatedEvent, this);
    domModel.removeEventListener(SDK19.DOMModel.Events.NodeInserted, this.handleNodeInserted, this);
    this.#domTreeWidget.modelRemoved(domModel);
    if (!domModel.parentModel()) {
      this.#domTreeWidget.detach();
    }
    this.removeStyleTracking(domModel.cssModel());
  }
  handleNodeInserted(event) {
    this.nodeInsertedTaskRunner.run(async () => {
      const node = event.data;
      if (!node.isViewTransitionPseudoNode()) {
        return;
      }
      const cssModel = node.domModel().cssModel();
      const styleSheetHeader = await cssModel.requestViaInspectorStylesheet(node.frameId());
      if (!styleSheetHeader) {
        return;
      }
      const cssText = await cssModel.getStyleSheetText(styleSheetHeader.id);
      if (cssText?.includes(`${node.simpleSelector()} {`)) {
        return;
      }
      await cssModel.setStyleSheetText(styleSheetHeader.id, `${cssText}
${node.simpleSelector()} {}`, false);
    });
  }
  targetNameChanged(target) {
    const domModel = target.model(SDK19.DOMModel.DOMModel);
    if (!domModel) {
      return;
    }
  }
  updateTreeOutlineVisibleWidth() {
    let width = this.splitWidget.element.offsetWidth;
    if (this.splitWidget.isVertical()) {
      width -= this.splitWidget.sidebarSize();
    }
    this.#domTreeWidget.visibleWidth = width;
  }
  focus() {
    if (this.#domTreeWidget.empty()) {
      this.domTreeContainer.focus();
    } else {
      this.#domTreeWidget.focus();
    }
  }
  searchableView() {
    return this.#searchableView;
  }
  wasShown() {
    super.wasShown();
    UI22.Context.Context.instance().setFlavor(_ElementsPanel, this);
    this.#domTreeWidget.show(this.domTreeContainer);
    if (Annotations.AnnotationRepository.annotationsEnabled()) {
      void PanelCommon.AnnotationManager.instance().resolveAnnotationsOfType(Annotations.AnnotationType.ELEMENT_NODE);
    }
  }
  willHide() {
    SDK19.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    this.#domTreeWidget.detach();
    super.willHide();
    UI22.Context.Context.instance().setFlavor(_ElementsPanel, null);
  }
  onResize() {
    this.element.window().requestAnimationFrame(this.updateSidebarPosition.bind(this));
    this.updateTreeOutlineVisibleWidth();
  }
  selectedNodeChanged(event) {
    let selectedNode = event.data.node;
    if (selectedNode?.pseudoType() && !selectedNode.parentNode) {
      selectedNode = null;
    }
    const { focus: focus2 } = event.data;
    if (!selectedNode) {
      this.#domTreeWidget.selectDOMNode(null);
    }
    if (selectedNode) {
      const activeNode = ElementsComponents7.Helper.legacyNodeToElementsComponentsNode(selectedNode);
      const crumbs = [activeNode];
      for (let current = selectedNode.parentNode; current; current = current.parentNode) {
        crumbs.push(ElementsComponents7.Helper.legacyNodeToElementsComponentsNode(current));
      }
      this.breadcrumbs.data = {
        crumbs,
        selectedNode: ElementsComponents7.Helper.legacyNodeToElementsComponentsNode(selectedNode)
      };
      if (this.accessibilityTreeView) {
        void this.accessibilityTreeView.selectedNodeChanged(selectedNode);
      }
    } else {
      this.breadcrumbs.data = { crumbs: [], selectedNode: null };
    }
    UI22.Context.Context.instance().setFlavor(SDK19.DOMModel.DOMNode, selectedNode);
    if (!selectedNode) {
      return;
    }
    void selectedNode.setAsInspectedNode();
    if (focus2) {
      this.selectedNodeOnReset = selectedNode;
      this.hasNonDefaultSelectedNode = true;
    }
    const executionContexts = selectedNode.domModel().runtimeModel().executionContexts();
    const nodeFrameId = selectedNode.frameId();
    for (const context of executionContexts) {
      if (context.frameId === nodeFrameId) {
        UI22.Context.Context.instance().setFlavor(SDK19.RuntimeModel.ExecutionContext, context);
        break;
      }
    }
  }
  documentUpdatedEvent(event) {
    const domModel = event.data;
    this.documentUpdated(domModel);
    this.removeStyleTracking(domModel.cssModel());
    this.setupStyleTracking(domModel.cssModel());
  }
  documentUpdated(domModel) {
    this.#searchableView.cancelSearch();
    if (!domModel.existingDocument()) {
      if (this.isShowing()) {
        void domModel.requestDocument();
      }
      return;
    }
    this.hasNonDefaultSelectedNode = false;
    if (this.omitDefaultSelection) {
      return;
    }
    const savedSelectedNodeOnReset = this.selectedNodeOnReset;
    void restoreNode.call(this, domModel, this.selectedNodeOnReset || null);
    async function restoreNode(domModel2, staleNode) {
      const nodePath = staleNode ? staleNode.path() : null;
      const restoredNodeId = nodePath ? await domModel2.pushNodeByPathToFrontend(nodePath) : null;
      if (savedSelectedNodeOnReset !== this.selectedNodeOnReset) {
        return;
      }
      let node = domModel2.nodeForId(restoredNodeId);
      if (!node) {
        const inspectedDocument = domModel2.existingDocument();
        node = inspectedDocument ? inspectedDocument.body || inspectedDocument.documentElement : null;
      }
      if (node) {
        this.setDefaultSelectedNode(node);
        this.lastSelectedNodeSelectedForTest();
      }
    }
  }
  lastSelectedNodeSelectedForTest() {
  }
  setDefaultSelectedNode(node) {
    if (!node || this.hasNonDefaultSelectedNode || this.pendingNodeReveal) {
      return;
    }
    this.selectDOMNode(node);
    this.#domTreeWidget.expand();
  }
  onSearchClosed() {
    const selectedNode = this.selectedDOMNode();
    if (!selectedNode) {
      return;
    }
    this.#domTreeWidget.selectDOMNodeWithoutReveal(selectedNode);
  }
  onSearchCanceled() {
    this.searchConfig = void 0;
    this.hideSearchHighlights();
    this.#searchableView.updateSearchMatchesCount(0);
    this.currentSearchResultIndex = -1;
    delete this.searchResults;
    SDK19.DOMModel.DOMModel.cancelSearch();
  }
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    const query = searchConfig.query;
    const whitespaceTrimmedQuery = query.trim();
    if (!whitespaceTrimmedQuery.length) {
      return;
    }
    if (this.searchConfig?.query !== query) {
      this.onSearchCanceled();
    } else {
      this.hideSearchHighlights();
    }
    this.searchConfig = searchConfig;
    const showUAShadowDOM = Common14.Settings.Settings.instance().moduleSetting("show-ua-shadow-dom").get();
    const domModels = SDK19.TargetManager.TargetManager.instance().models(SDK19.DOMModel.DOMModel, { scoped: true });
    const promises = domModels.map((domModel) => domModel.performSearch(whitespaceTrimmedQuery, showUAShadowDOM));
    void Promise.all(promises).then((resultCounts) => {
      this.searchResults = [];
      for (let i = 0; i < resultCounts.length; ++i) {
        const resultCount = resultCounts[i];
        for (let j = 0; j < resultCount; ++j) {
          this.searchResults.push({ domModel: domModels[i], index: j, node: void 0 });
        }
      }
      this.#searchableView.updateSearchMatchesCount(this.searchResults.length);
      if (!this.searchResults.length) {
        return;
      }
      if (this.currentSearchResultIndex >= this.searchResults.length) {
        this.currentSearchResultIndex = -1;
      }
      let index = this.currentSearchResultIndex;
      if (shouldJump) {
        if (this.currentSearchResultIndex === -1) {
          index = jumpBackwards ? -1 : 0;
        } else {
          index = jumpBackwards ? index - 1 : index + 1;
        }
        this.jumpToSearchResult(index);
      }
    });
  }
  domWordWrapSettingChanged(event) {
    this.domTreeContainer.classList.toggle("elements-wrap", event.data);
    this.#domTreeWidget.setWordWrap(event.data);
  }
  jumpToSearchResult(index) {
    if (!this.searchResults) {
      return;
    }
    this.currentSearchResultIndex = (index + this.searchResults.length) % this.searchResults.length;
    this.highlightCurrentSearchResult();
  }
  jumpToNextSearchResult() {
    if (!this.searchResults || !this.searchConfig) {
      return;
    }
    this.performSearch(this.searchConfig, true);
  }
  jumpToPreviousSearchResult() {
    if (!this.searchResults || !this.searchConfig) {
      return;
    }
    this.performSearch(this.searchConfig, true, true);
  }
  supportsCaseSensitiveSearch() {
    return false;
  }
  supportsWholeWordSearch() {
    return false;
  }
  supportsRegexSearch() {
    return false;
  }
  highlightCurrentSearchResult() {
    const index = this.currentSearchResultIndex;
    const searchResults = this.searchResults;
    if (!searchResults) {
      return;
    }
    const searchResult = searchResults[index];
    this.#searchableView.updateCurrentMatchIndex(index);
    if (searchResult.node === null) {
      return;
    }
    if (typeof searchResult.node === "undefined") {
      void searchResult.domModel.searchResult(searchResult.index).then((node) => {
        searchResult.node = node;
        const highlightRequestValid = this.searchConfig && this.searchResults && this.currentSearchResultIndex !== -1;
        if (highlightRequestValid) {
          this.highlightCurrentSearchResult();
        }
      });
      return;
    }
    void searchResult.node.scrollIntoView();
    if (searchResult.node) {
      this.#domTreeWidget.highlightMatch(searchResult.node, this.searchConfig?.query);
    }
  }
  hideSearchHighlights() {
    if (!this.searchResults?.length || this.currentSearchResultIndex === -1) {
      return;
    }
    const searchResult = this.searchResults[this.currentSearchResultIndex];
    if (!searchResult.node) {
      return;
    }
    this.#domTreeWidget.hideMatchHighlights(searchResult.node);
  }
  selectedDOMNode() {
    return this.#domTreeWidget.selectedDOMNode();
  }
  selectDOMNode(node, focus2) {
    this.#domTreeWidget.selectDOMNode(node, focus2);
  }
  highlightNodeAttribute(node, attribute) {
    this.#domTreeWidget.highlightNodeAttribute(node, attribute);
  }
  selectAndShowSidebarTab(tabId) {
    if (!this.sidebarPaneView) {
      return;
    }
    this.sidebarPaneView.tabbedPane().selectTab(tabId);
    if (!this.isShowing()) {
      void UI22.ViewManager.ViewManager.instance().showView("elements");
    }
  }
  updateBreadcrumbIfNeeded(event) {
    const nodes = event.data;
    const selectedNode = this.selectedDOMNode();
    if (!selectedNode) {
      this.breadcrumbs.data = {
        crumbs: [],
        selectedNode: null
      };
      return;
    }
    const activeNode = ElementsComponents7.Helper.legacyNodeToElementsComponentsNode(selectedNode);
    const existingCrumbs = [activeNode];
    for (let current = selectedNode.parentNode; current; current = current.parentNode) {
      existingCrumbs.push(ElementsComponents7.Helper.legacyNodeToElementsComponentsNode(current));
    }
    const newNodes = nodes.map(ElementsComponents7.Helper.legacyNodeToElementsComponentsNode);
    const nodesThatHaveChangedMap = /* @__PURE__ */ new Map();
    newNodes.forEach((crumb) => nodesThatHaveChangedMap.set(crumb.id, crumb));
    const newSetOfCrumbs = existingCrumbs.map((crumb) => {
      const replacement = nodesThatHaveChangedMap.get(crumb.id);
      return replacement || crumb;
    });
    this.breadcrumbs.data = {
      crumbs: newSetOfCrumbs,
      selectedNode: activeNode
    };
  }
  crumbNodeSelected(event) {
    this.selectDOMNode(event.legacyDomNode, true);
  }
  leaveUserAgentShadowDOM(node) {
    let userAgentShadowRoot;
    while ((userAgentShadowRoot = node.ancestorUserAgentShadowRoot()) && userAgentShadowRoot.parentNode) {
      node = userAgentShadowRoot.parentNode;
    }
    return node;
  }
  async revealAndSelectNode(nodeToReveal, opts) {
    const { showPanel = true, focusNode = false, highlightInOverlay = true } = opts ?? {};
    this.omitDefaultSelection = true;
    const node = Common14.Settings.Settings.instance().moduleSetting("show-ua-shadow-dom").get() ? nodeToReveal : this.leaveUserAgentShadowDOM(nodeToReveal);
    if (highlightInOverlay) {
      node.highlightForTwoSeconds();
    }
    if (this.accessibilityTreeView) {
      void this.accessibilityTreeView.revealAndSelectNode(nodeToReveal);
    }
    if (showPanel) {
      await UI22.ViewManager.ViewManager.instance().showView("elements", false, !focus);
    }
    this.selectDOMNode(node, focusNode);
    delete this.omitDefaultSelection;
    if (!this.notFirstInspectElement) {
      _ElementsPanel.firstInspectElementNodeNameForTest = node.nodeName();
      _ElementsPanel.firstInspectElementCompletedForTest();
      Host5.InspectorFrontendHost.InspectorFrontendHostInstance.inspectElementCompleted();
    }
    this.notFirstInspectElement = true;
  }
  showUAShadowDOMChanged() {
    this.#domTreeWidget.reload();
  }
  setupTextSelectionHack(stylePaneWrapperElement) {
    const uninstallHackBound = uninstallHack.bind(this);
    const uninstallHackOnMousemove = (event) => {
      if (event.buttons === 0) {
        uninstallHack.call(this);
      }
    };
    stylePaneWrapperElement.addEventListener("mousedown", (event) => {
      if (event.button !== 0) {
        return;
      }
      this.splitWidget.element.classList.add("disable-resizer-for-elements-hack");
      stylePaneWrapperElement.style.setProperty("height", `${stylePaneWrapperElement.offsetHeight}px`);
      const largeLength = 1e6;
      stylePaneWrapperElement.style.setProperty("left", `${-1 * largeLength}px`);
      stylePaneWrapperElement.style.setProperty("padding-left", `${largeLength}px`);
      stylePaneWrapperElement.style.setProperty("width", `calc(100% + ${largeLength}px)`);
      stylePaneWrapperElement.style.setProperty("position", "fixed");
      stylePaneWrapperElement.window().addEventListener("blur", uninstallHackBound);
      stylePaneWrapperElement.window().addEventListener("contextmenu", uninstallHackBound, true);
      stylePaneWrapperElement.window().addEventListener("dragstart", uninstallHackBound, true);
      stylePaneWrapperElement.window().addEventListener("mousemove", uninstallHackOnMousemove, true);
      stylePaneWrapperElement.window().addEventListener("mouseup", uninstallHackBound, true);
      stylePaneWrapperElement.window().addEventListener("visibilitychange", uninstallHackBound);
    }, true);
    function uninstallHack() {
      this.splitWidget.element.classList.remove("disable-resizer-for-elements-hack");
      stylePaneWrapperElement.style.removeProperty("left");
      stylePaneWrapperElement.style.removeProperty("padding-left");
      stylePaneWrapperElement.style.removeProperty("width");
      stylePaneWrapperElement.style.removeProperty("position");
      stylePaneWrapperElement.window().removeEventListener("blur", uninstallHackBound);
      stylePaneWrapperElement.window().removeEventListener("contextmenu", uninstallHackBound, true);
      stylePaneWrapperElement.window().removeEventListener("dragstart", uninstallHackBound, true);
      stylePaneWrapperElement.window().removeEventListener("mousemove", uninstallHackOnMousemove, true);
      stylePaneWrapperElement.window().removeEventListener("mouseup", uninstallHackBound, true);
      stylePaneWrapperElement.window().removeEventListener("visibilitychange", uninstallHackBound);
    }
  }
  initializeSidebarPanes(splitMode) {
    this.splitWidget.setVertical(
      splitMode === "Vertical"
      /* SplitMode.VERTICAL */
    );
    this.showToolbarPane(
      null,
      null
      /* toggle */
    );
    const matchedStylePanesWrapper = new UI22.Widget.VBox();
    matchedStylePanesWrapper.element.classList.add("style-panes-wrapper");
    matchedStylePanesWrapper.element.setAttribute("jslog", `${VisualLogging12.pane("styles").track({ resize: true })}`);
    this.stylesWidget.show(matchedStylePanesWrapper.element);
    this.setupTextSelectionHack(matchedStylePanesWrapper.element);
    const computedStylePanesWrapper = new UI22.Widget.VBox();
    computedStylePanesWrapper.element.classList.add("style-panes-wrapper");
    computedStylePanesWrapper.element.setAttribute("jslog", `${VisualLogging12.pane("computed").track({ resize: true })}`);
    this.computedStyleWidget.show(computedStylePanesWrapper.element);
    const stylesSplitWidget = new UI22.SplitWidget.SplitWidget(true, true, "elements.styles.sidebar.width", 100);
    stylesSplitWidget.setMainWidget(matchedStylePanesWrapper);
    stylesSplitWidget.hideSidebar();
    stylesSplitWidget.enableShowModeSaving();
    stylesSplitWidget.addEventListener("ShowModeChanged", () => {
      showMetricsWidgetInStylesPane();
    });
    this.stylesWidget.addEventListener("InitialUpdateCompleted", () => {
      this.stylesWidget.appendToolbarItem(stylesSplitWidget.createShowHideSidebarButton(i18nString15(UIStrings16.showComputedStylesSidebar), i18nString15(UIStrings16.hideComputedStylesSidebar), i18nString15(UIStrings16.computedStylesShown), i18nString15(UIStrings16.computedStylesHidden), "computed-styles"));
    });
    const showMetricsWidgetInComputedPane = () => {
      this.metricsWidget.show(computedStylePanesWrapper.element, this.computedStyleWidget.element);
      this.metricsWidget.toggleVisibility(
        true
        /* visible */
      );
      this.stylesWidget.removeEventListener("StylesUpdateCompleted", toggleMetricsWidget);
    };
    const showMetricsWidgetInStylesPane = () => {
      const showMergedComputedPane = stylesSplitWidget.showMode() === "Both";
      if (showMergedComputedPane) {
        showMetricsWidgetInComputedPane();
      } else {
        this.metricsWidget.show(matchedStylePanesWrapper.element);
        if (!this.stylesWidget.hasMatchedStyles) {
          this.metricsWidget.toggleVisibility(
            false
            /* invisible */
          );
        }
        this.stylesWidget.addEventListener("StylesUpdateCompleted", toggleMetricsWidget);
      }
    };
    const toggleMetricsWidget = (event) => {
      this.metricsWidget.toggleVisibility(event.data.hasMatchedStyles);
    };
    const tabSelected = (event) => {
      const { tabId } = event.data;
      if (tabId === "computed") {
        computedStylePanesWrapper.show(computedView.element);
        showMetricsWidgetInComputedPane();
      } else if (tabId === "styles") {
        stylesSplitWidget.setSidebarWidget(computedStylePanesWrapper);
        showMetricsWidgetInStylesPane();
      }
    };
    this.sidebarPaneView = UI22.ViewManager.ViewManager.instance().createTabbedLocation(() => UI22.ViewManager.ViewManager.instance().showView("elements"), "styles-pane-sidebar", true, true);
    const tabbedPane = this.sidebarPaneView.tabbedPane();
    tabbedPane.headerElement().setAttribute("jslog", `${VisualLogging12.toolbar("sidebar").track({ keydown: "ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space" })}`);
    if (this.splitMode !== "Vertical") {
      this.splitWidget.installResizer(tabbedPane.headerElement());
    }
    const headerElement = tabbedPane.headerElement();
    UI22.ARIAUtils.markAsNavigation(headerElement);
    UI22.ARIAUtils.setLabel(headerElement, i18nString15(UIStrings16.sidePanelToolbar));
    const contentElement = tabbedPane.tabbedPaneContentElement();
    UI22.ARIAUtils.markAsComplementary(contentElement);
    UI22.ARIAUtils.setLabel(contentElement, i18nString15(UIStrings16.sidePanelContent));
    const stylesView = new UI22.View.SimpleView({
      title: i18nString15(UIStrings16.styles),
      viewId: "styles"
    });
    this.sidebarPaneView.appendView(stylesView);
    stylesView.element.classList.add("flex-auto");
    stylesSplitWidget.show(stylesView.element);
    const computedView = new UI22.View.SimpleView({
      title: i18nString15(UIStrings16.computed),
      viewId: "computed"
    });
    computedView.element.classList.add("composite", "fill");
    tabbedPane.addEventListener(UI22.TabbedPane.Events.TabSelected, tabSelected, this);
    this.sidebarPaneView.appendView(computedView);
    this.stylesViewToReveal = stylesView;
    this.sidebarPaneView.appendApplicableItems("elements-sidebar");
    const extensionSidebarPanes = PanelCommon.ExtensionServer.ExtensionServer.instance().sidebarPanes();
    for (let i = 0; i < extensionSidebarPanes.length; ++i) {
      this.addExtensionSidebarPane(extensionSidebarPanes[i]);
    }
    this.splitWidget.setSidebarWidget(this.sidebarPaneView.tabbedPane());
  }
  updateSidebarPosition() {
    if (this.sidebarPaneView?.tabbedPane().shouldHideOnDetach()) {
      return;
    }
    const position = Common14.Settings.Settings.instance().moduleSetting("sidebar-position").get();
    let splitMode = "Horizontal";
    if (position === "right" || position === "auto" && this.splitWidget.element.offsetWidth > 680) {
      splitMode = "Vertical";
    }
    if (!this.sidebarPaneView) {
      this.initializeSidebarPanes(splitMode);
      return;
    }
    if (splitMode === this.splitMode) {
      return;
    }
    this.splitMode = splitMode;
    const tabbedPane = this.sidebarPaneView.tabbedPane();
    this.splitWidget.uninstallResizer(tabbedPane.headerElement());
    this.splitWidget.setVertical(
      this.splitMode === "Vertical"
      /* SplitMode.VERTICAL */
    );
    this.showToolbarPane(
      null,
      null
      /* toggle */
    );
    if (this.splitMode !== "Vertical") {
      this.splitWidget.installResizer(tabbedPane.headerElement());
    }
  }
  extensionSidebarPaneAdded(event) {
    this.addExtensionSidebarPane(event.data);
  }
  addExtensionSidebarPane(pane9) {
    if (this.sidebarPaneView && pane9.panelName() === this.name) {
      this.sidebarPaneView.appendView(pane9);
    }
  }
  getComputedStyleWidget() {
    return this.computedStyleWidget;
  }
  setupStyleTracking(cssModel) {
    const cssPropertyTracker = cssModel.createCSSPropertyTracker(TrackedCSSProperties);
    cssPropertyTracker.start();
    this.cssStyleTrackerByCSSModel.set(cssModel, cssPropertyTracker);
    cssPropertyTracker.addEventListener("TrackedCSSPropertiesUpdated", this.trackedCSSPropertiesUpdated, this);
  }
  removeStyleTracking(cssModel) {
    const cssPropertyTracker = this.cssStyleTrackerByCSSModel.get(cssModel);
    if (!cssPropertyTracker) {
      return;
    }
    cssPropertyTracker.stop();
    this.cssStyleTrackerByCSSModel.delete(cssModel);
    cssPropertyTracker.removeEventListener("TrackedCSSPropertiesUpdated", this.trackedCSSPropertiesUpdated, this);
  }
  trackedCSSPropertiesUpdated({ data: domNodes }) {
    for (const domNode of domNodes) {
      if (!domNode) {
        continue;
      }
      this.#domTreeWidget.updateNodeAdorners(domNode);
    }
    LayoutPane.instance().requestUpdate();
  }
  populateAdornerSettingsContextMenu(contextMenu) {
    const adornerSubMenu = contextMenu.viewSection().appendSubMenuItem(i18nString15(UIStrings16.adornerSettings), false, "show-adorner-settings");
    const adornerSettings = this.adornerManager.getSettings();
    for (const [adorner2, isEnabled] of adornerSettings) {
      adornerSubMenu.defaultSection().appendCheckboxItem(adorner2, () => {
        const updatedIsEnabled = !isEnabled;
        const adornersToUpdate = this.adornersByName.get(adorner2);
        if (adornersToUpdate) {
          for (const adornerToUpdate of adornersToUpdate) {
            updatedIsEnabled ? adornerToUpdate.show() : adornerToUpdate.hide();
          }
        }
        this.adornerManager.getSettings().set(adorner2, updatedIsEnabled);
        this.adornerManager.updateSettings(adornerSettings);
      }, { checked: isEnabled, jslogContext: adorner2 });
    }
  }
  isAdornerEnabled(adornerText) {
    return this.adornerManager.isAdornerEnabled(adornerText);
  }
  registerAdorner(adorner2) {
    let adornerSet = this.adornersByName.get(adorner2.name);
    if (!adornerSet) {
      adornerSet = /* @__PURE__ */ new Set();
      this.adornersByName.set(adorner2.name, adornerSet);
    }
    adornerSet.add(adorner2);
    if (!this.isAdornerEnabled(adorner2.name)) {
      adorner2.hide();
    }
  }
  deregisterAdorner(adorner2) {
    const adornerSet = this.adornersByName.get(adorner2.name);
    if (!adornerSet) {
      return;
    }
    adornerSet.delete(adorner2);
  }
  toggleHideElement(node) {
    this.#domTreeWidget.toggleHideElement(node);
  }
  toggleEditAsHTML(node) {
    this.#domTreeWidget.toggleEditAsHTML(node);
  }
  duplicateNode(node) {
    this.#domTreeWidget.duplicateNode(node);
  }
  copyStyles(node) {
    this.#domTreeWidget.copyStyles(node);
  }
  async resolveInitialState(parentElement, reveal, lookupId, anchor) {
    if (!this.isShowing()) {
      return null;
    }
    if (!anchor) {
      const backendNodeId = Number(lookupId);
      if (isNaN(backendNodeId)) {
        return null;
      }
      const rootDOMNode = this.#domTreeWidget.rootDOMNode;
      if (!rootDOMNode) {
        return null;
      }
      const domModel = rootDOMNode.domModel();
      const nodes = await domModel.pushNodesByBackendIdsToFrontend(/* @__PURE__ */ new Set([backendNodeId]));
      if (!nodes) {
        return null;
      }
      const foundNode = nodes.get(backendNodeId);
      if (!foundNode) {
        return null;
      }
      anchor = foundNode;
    }
    const element = this.#domTreeWidget.treeElementForNode(anchor);
    if (!element) {
      return null;
    }
    if (reveal) {
      await Common14.Revealer.reveal(anchor);
    }
    const offsetToTagName = 22;
    const yPadding = 5;
    const targetRect = element.listItemElement.getBoundingClientRect();
    const parentRect = parentElement.getBoundingClientRect();
    const relativeX = targetRect.x - parentRect.x + offsetToTagName;
    const relativeY = targetRect.y - parentRect.y + yPadding;
    return { x: relativeX, y: relativeY };
  }
  static firstInspectElementCompletedForTest = function() {
  };
  static firstInspectElementNodeNameForTest = "";
};
globalThis.Elements = globalThis.Elements || {};
globalThis.Elements.ElementsPanel = ElementsPanel;
var TrackedCSSProperties = [
  {
    name: "display",
    value: "grid"
  },
  {
    name: "display",
    value: "inline-grid"
  },
  {
    name: "display",
    value: "flex"
  },
  {
    name: "display",
    value: "inline-flex"
  },
  {
    name: "container-type",
    value: "inline-size"
  },
  {
    name: "container-type",
    value: "block-size"
  },
  {
    name: "container-type",
    value: "size"
  }
];
var ContextMenuProvider = class {
  appendApplicableItems(event, contextMenu, object) {
    if (object instanceof SDK19.RemoteObject.RemoteObject && !object.isNode()) {
      return;
    }
    if (ElementsPanel.instance().element.isAncestor(event.target)) {
      return;
    }
    contextMenu.revealSection().appendItem(i18nString15(UIStrings16.openInElementsPanel), () => Common14.Revealer.reveal(object), { jslogContext: "elements.reveal-node" });
  }
};
var DOMNodeRevealer = class {
  reveal(node, omitFocus) {
    const panel = ElementsPanel.instance();
    panel.pendingNodeReveal = true;
    return new Promise(revealPromise).catch((reason) => {
      let message;
      if (Platform10.UserVisibleError.isUserVisibleError(reason)) {
        message = reason.message;
      } else {
        message = i18nString15(UIStrings16.nodeCannotBeFoundInTheCurrent);
      }
      Common14.Console.Console.instance().warn(message);
      throw reason;
    });
    function revealPromise(resolve, reject) {
      if (node instanceof SDK19.DOMModel.DOMNode) {
        onNodeResolved(node);
      } else if (node instanceof SDK19.DOMModel.DeferredDOMNode) {
        node.resolve(checkDeferredDOMNodeThenReveal);
      } else {
        const domModel = node.runtimeModel().target().model(SDK19.DOMModel.DOMModel);
        if (domModel) {
          void domModel.pushObjectAsNodeToFrontend(node).then(checkRemoteObjectThenReveal);
        } else {
          const msg = i18nString15(UIStrings16.nodeCannotBeFoundInTheCurrent);
          reject(new Platform10.UserVisibleError.UserVisibleError(msg));
        }
      }
      function onNodeResolved(resolvedNode) {
        panel.pendingNodeReveal = false;
        let currentNode = resolvedNode;
        while (currentNode.parentNode) {
          currentNode = currentNode.parentNode;
        }
        const isDetached = !(currentNode instanceof SDK19.DOMModel.DOMDocument);
        const isDocument = node instanceof SDK19.DOMModel.DOMDocument;
        if (!isDocument && isDetached) {
          const msg2 = i18nString15(UIStrings16.nodeCannotBeFoundInTheCurrent);
          reject(new Platform10.UserVisibleError.UserVisibleError(msg2));
          return;
        }
        if (resolvedNode) {
          void panel.revealAndSelectNode(resolvedNode, { showPanel: true, focusNode: !omitFocus }).then(resolve);
          return;
        }
        const msg = i18nString15(UIStrings16.nodeCannotBeFoundInTheCurrent);
        reject(new Platform10.UserVisibleError.UserVisibleError(msg));
      }
      function checkRemoteObjectThenReveal(resolvedNode) {
        if (!resolvedNode) {
          const msg = i18nString15(UIStrings16.theRemoteObjectCouldNotBe);
          reject(new Platform10.UserVisibleError.UserVisibleError(msg));
          return;
        }
        onNodeResolved(resolvedNode);
      }
      function checkDeferredDOMNodeThenReveal(resolvedNode) {
        if (!resolvedNode) {
          const msg = i18nString15(UIStrings16.theDeferredDomNodeCouldNotBe);
          reject(new Platform10.UserVisibleError.UserVisibleError(msg));
          return;
        }
        onNodeResolved(resolvedNode);
      }
    }
  }
};
var CSSPropertyRevealer = class {
  reveal(property) {
    const panel = ElementsPanel.instance();
    return panel.revealProperty(property);
  }
};
var ElementsActionDelegate = class {
  handleAction(context, actionId) {
    const node = context.flavor(SDK19.DOMModel.DOMNode);
    if (!node) {
      return true;
    }
    switch (actionId) {
      case "elements.hide-element":
        ElementsPanel.instance().toggleHideElement(node);
        return true;
      case "elements.edit-as-html":
        ElementsPanel.instance().toggleEditAsHTML(node);
        return true;
      case "elements.duplicate-element":
        ElementsPanel.instance().duplicateNode(node);
        return true;
      case "elements.copy-styles":
        ElementsPanel.instance().copyStyles(node);
        return true;
      case "elements.undo":
        void SDK19.DOMModel.DOMModelUndoStack.instance().undo();
        ElementsPanel.instance().stylesWidget.forceUpdate();
        return true;
      case "elements.redo":
        void SDK19.DOMModel.DOMModelUndoStack.instance().redo();
        ElementsPanel.instance().stylesWidget.forceUpdate();
        return true;
      case "elements.toggle-a11y-tree":
        ElementsPanel.instance().toggleAccessibilityTree();
        return true;
      case "elements.toggle-word-wrap": {
        const setting = Common14.Settings.Settings.instance().moduleSetting("dom-word-wrap");
        setting.set(!setting.get());
        return true;
      }
      case "elements.show-styles":
        ElementsPanel.instance().selectAndShowSidebarTab(
          "styles"
          /* SidebarPaneTabId.STYLES */
        );
        return true;
      case "elements.show-computed":
        ElementsPanel.instance().selectAndShowSidebarTab(
          "computed"
          /* SidebarPaneTabId.COMPUTED */
        );
        return true;
      case "elements.toggle-eye-dropper": {
        const colorSwatchPopoverIcon = UI22.Context.Context.instance().flavor(ColorSwatchPopoverIcon);
        if (!colorSwatchPopoverIcon) {
          return false;
        }
        void colorSwatchPopoverIcon.toggleEyeDropper();
      }
    }
    return false;
  }
};
var pseudoStateMarkerDecoratorInstance;
var PseudoStateMarkerDecorator = class _PseudoStateMarkerDecorator {
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!pseudoStateMarkerDecoratorInstance || forceNew) {
      pseudoStateMarkerDecoratorInstance = new _PseudoStateMarkerDecorator();
    }
    return pseudoStateMarkerDecoratorInstance;
  }
  decorate(node) {
    const pseudoState = node.domModel().cssModel().pseudoState(node);
    if (!pseudoState) {
      return null;
    }
    return {
      color: "--sys-color-orange-bright",
      title: i18nString15(UIStrings16.elementStateS, { PH1: ":" + pseudoState.join(", :") })
    };
  }
};

// gen/front_end/panels/elements/InspectElementModeController.js
var inspectElementModeController;
var InspectElementModeController = class _InspectElementModeController {
  toggleSearchAction;
  mode;
  showDetailedInspectTooltipSetting;
  constructor() {
    this.toggleSearchAction = UI23.ActionRegistry.ActionRegistry.instance().getAction("elements.toggle-element-search");
    this.mode = "none";
    SDK20.TargetManager.TargetManager.instance().addEventListener("SuspendStateChanged", this.suspendStateChanged, this);
    SDK20.TargetManager.TargetManager.instance().addModelListener(SDK20.OverlayModel.OverlayModel, "InspectModeExited", () => this.setMode(
      "none"
      /* Protocol.Overlay.InspectMode.None */
    ), void 0, { scoped: true });
    SDK20.OverlayModel.OverlayModel.setInspectNodeHandler(this.inspectNode.bind(this));
    SDK20.TargetManager.TargetManager.instance().observeModels(SDK20.OverlayModel.OverlayModel, this, { scoped: true });
    this.showDetailedInspectTooltipSetting = Common15.Settings.Settings.instance().moduleSetting("show-detailed-inspect-tooltip");
    this.showDetailedInspectTooltipSetting.addChangeListener(this.showDetailedInspectTooltipChanged.bind(this));
    document.addEventListener("keydown", (event) => {
      if (event.keyCode !== UI23.KeyboardShortcut.Keys.Esc.code) {
        return;
      }
      if (!this.isInInspectElementMode()) {
        return;
      }
      this.setMode(
        "none"
        /* Protocol.Overlay.InspectMode.None */
      );
      event.consume(true);
      void VisualLogging13.logKeyDown(null, event, "cancel-inspect-mode");
    }, true);
  }
  static instance({ forceNew } = { forceNew: false }) {
    if (!inspectElementModeController || forceNew) {
      inspectElementModeController = new _InspectElementModeController();
    }
    return inspectElementModeController;
  }
  modelAdded(overlayModel) {
    if (this.mode === "none") {
      return;
    }
    void overlayModel.setInspectMode(this.mode, this.showDetailedInspectTooltipSetting.get());
  }
  modelRemoved(_overlayModel) {
  }
  isInInspectElementMode() {
    return this.mode !== "none";
  }
  toggleInspectMode() {
    let mode;
    if (this.isInInspectElementMode()) {
      mode = "none";
    } else {
      mode = Common15.Settings.Settings.instance().moduleSetting("show-ua-shadow-dom").get() ? "searchForUAShadowDOM" : "searchForNode";
    }
    this.setMode(mode);
  }
  captureScreenshotMode() {
    this.setMode(
      "captureAreaScreenshot"
      /* Protocol.Overlay.InspectMode.CaptureAreaScreenshot */
    );
  }
  setMode(mode) {
    if (SDK20.TargetManager.TargetManager.instance().allTargetsSuspended()) {
      return;
    }
    this.mode = mode;
    for (const overlayModel of SDK20.TargetManager.TargetManager.instance().models(SDK20.OverlayModel.OverlayModel, { scoped: true })) {
      void overlayModel.setInspectMode(mode, this.showDetailedInspectTooltipSetting.get());
    }
    this.toggleSearchAction.setToggled(this.isInInspectElementMode());
  }
  suspendStateChanged() {
    if (!SDK20.TargetManager.TargetManager.instance().allTargetsSuspended()) {
      return;
    }
    this.mode = "none";
    this.toggleSearchAction.setToggled(false);
  }
  inspectNode(node) {
    const returnToPanel = UI23.Context.Context.instance().flavor(Common15.ReturnToPanel.ReturnToPanelFlavor);
    UI23.Context.Context.instance().setFlavor(Common15.ReturnToPanel.ReturnToPanelFlavor, null);
    if (returnToPanel) {
      return ElementsPanel.instance().revealAndSelectNode(node, { showPanel: false, highlightInOverlay: false }).then(() => {
        void UI23.ViewManager.ViewManager.instance().showView(returnToPanel.viewId, false, false);
      });
    }
    return ElementsPanel.instance().revealAndSelectNode(node, { showPanel: true, focusNode: true, highlightInOverlay: false });
  }
  showDetailedInspectTooltipChanged() {
    this.setMode(this.mode);
  }
};
var ToggleSearchActionDelegate = class {
  handleAction(_context, actionId) {
    if (Root8.Runtime.Runtime.queryParam("isSharedWorker")) {
      return false;
    }
    inspectElementModeController = InspectElementModeController.instance();
    if (!inspectElementModeController) {
      return false;
    }
    if (actionId === "elements.toggle-element-search") {
      inspectElementModeController.toggleInspectMode();
    } else if (actionId === "elements.capture-area-screenshot") {
      inspectElementModeController.captureScreenshotMode();
    }
    return true;
  }
};

// gen/front_end/panels/elements/EventListenersWidget.js
var EventListenersWidget_exports = {};
__export(EventListenersWidget_exports, {
  ActionDelegate: () => ActionDelegate2,
  DEFAULT_VIEW: () => DEFAULT_VIEW6,
  DispatchFilterBy: () => DispatchFilterBy,
  EventListenersWidget: () => EventListenersWidget
});
import * as Common16 from "./../../core/common/common.js";
import * as i18n33 from "./../../core/i18n/i18n.js";
import * as SDK21 from "./../../core/sdk/sdk.js";
import * as UI24 from "./../../ui/legacy/legacy.js";
import { html as html11, render as render8 } from "./../../ui/lit/lit.js";
import * as VisualLogging14 from "./../../ui/visual_logging/visual_logging.js";
import * as EventListeners from "./../event_listeners/event_listeners.js";
var { bindToAction, bindToSetting } = UI24.UIUtils;
var UIStrings17 = {
  /**
   * @description Title of show framework listeners setting in event listeners widget of the elements panel
   */
  frameworkListeners: "Resolve `Framework` listeners",
  /**
   * @description Tooltip text that appears on the setting when hovering over it in Event Listeners Widget of the Elements panel
   */
  showListenersOnTheAncestors: "Show listeners on the ancestors",
  /**
   * @description Alternative title text of a setting in Event Listeners Widget of the Elements panel
   */
  ancestors: "Ancestors",
  /**
   * @description Title of dispatch filter in event listeners widget of the elements panel
   */
  eventListenersCategory: "Event listeners category",
  /**
   * @description Text for everything
   */
  all: "All",
  /**
   * @description Text in Event Listeners Widget of the Elements panel
   */
  passive: "Passive",
  /**
   * @description Text in Event Listeners Widget of the Elements panel
   */
  blocking: "Blocking",
  /**
   * @description Tooltip text that appears on the setting when hovering over it in Event Listeners Widget of the Elements panel
   */
  resolveEventListenersBoundWith: "Resolve event listeners bound with framework"
};
var str_17 = i18n33.i18n.registerUIStrings("panels/elements/EventListenersWidget.ts", UIStrings17);
var i18nString16 = i18n33.i18n.getLocalizedString.bind(void 0, str_17);
var eventListenersWidgetInstance;
var DEFAULT_VIEW6 = (input, _output, target) => {
  render8(html11`
    <div jslog=${VisualLogging14.pane("elements.event-listeners").track({ resize: true })}>
      <devtools-toolbar class="event-listener-toolbar" role="presentation">
        <devtools-button ${bindToAction(input.refreshEventListenersActionName)}></devtools-button>
        <devtools-checkbox title=${i18nString16(UIStrings17.showListenersOnTheAncestors)}
          ${bindToSetting(input.showForAncestorsSetting)}
          jslog=${VisualLogging14.toggle("show-event-listeners-for-ancestors").track({ change: true })}>
          ${i18nString16(UIStrings17.ancestors)}
        </devtools-checkbox>
        <select class="dispatch-filter"
          title=${i18nString16(UIStrings17.eventListenersCategory)}
          aria-label=${i18nString16(UIStrings17.eventListenersCategory)}
          jslog=${VisualLogging14.filterDropdown().track({ change: true })}
          @change=${(e) => input.onDispatchFilterTypeChange(e.target.value)}>
          ${input.dispatchFilters.map((filter) => html11`
            <option value=${filter.value} ?selected=${filter.value === input.selectedDispatchFilter}>
              ${filter.name}
            </option>`)}
        </select>
        <devtools-checkbox title=${i18nString16(UIStrings17.resolveEventListenersBoundWith)}
          ${bindToSetting(input.showFrameworkListenersSetting)}
          jslog=${VisualLogging14.toggle("show-frameowkr-listeners").track({ change: true })}>
          ${i18nString16(UIStrings17.frameworkListeners)}
        </devtools-checkbox>
      </devtools-toolbar>
      <devtools-widget .widgetConfig=${UI24.Widget.widgetConfig(EventListeners.EventListenersView.EventListenersView, {
    changeCallback: input.onEventListenersViewChange,
    objects: input.eventListenerObjects,
    filter: input.filter
  })}></devtools-widget>
    </div>`, target);
};
var EventListenersWidget = class _EventListenersWidget extends UI24.Widget.VBox {
  showForAncestorsSetting;
  dispatchFilterBySetting;
  showFrameworkListenersSetting;
  lastRequestedNode;
  #view;
  constructor(view = DEFAULT_VIEW6) {
    super();
    this.#view = view;
    this.showForAncestorsSetting = Common16.Settings.Settings.instance().moduleSetting("show-event-listeners-for-ancestors");
    this.showForAncestorsSetting.addChangeListener(this.requestUpdate.bind(this));
    this.dispatchFilterBySetting = Common16.Settings.Settings.instance().createSetting("event-listener-dispatch-filter-type", DispatchFilterBy.All);
    this.dispatchFilterBySetting.addChangeListener(this.requestUpdate.bind(this));
    this.showFrameworkListenersSetting = Common16.Settings.Settings.instance().createSetting("show-frameowkr-listeners", true);
    this.showFrameworkListenersSetting.setTitle(i18nString16(UIStrings17.frameworkListeners));
    this.showFrameworkListenersSetting.addChangeListener(this.requestUpdate.bind(this));
    UI24.Context.Context.instance().addFlavorChangeListener(SDK21.DOMModel.DOMNode, this.requestUpdate.bind(this));
    this.requestUpdate();
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!eventListenersWidgetInstance || forceNew) {
      eventListenersWidgetInstance = new _EventListenersWidget();
    }
    return eventListenersWidgetInstance;
  }
  async performUpdate() {
    const dispatchFilter = this.dispatchFilterBySetting.get();
    const showPassive = dispatchFilter === DispatchFilterBy.All || dispatchFilter === DispatchFilterBy.Passive;
    const showBlocking = dispatchFilter === DispatchFilterBy.All || dispatchFilter === DispatchFilterBy.Blocking;
    const input = {
      refreshEventListenersActionName: "elements.refresh-event-listeners",
      showForAncestorsSetting: this.showForAncestorsSetting,
      dispatchFilterBySetting: this.dispatchFilterBySetting,
      showFrameworkListenersSetting: this.showFrameworkListenersSetting,
      onDispatchFilterTypeChange: (value5) => {
        this.dispatchFilterBySetting.set(value5);
      },
      onEventListenersViewChange: this.requestUpdate.bind(this),
      dispatchFilters: [
        { name: i18nString16(UIStrings17.all), value: DispatchFilterBy.All },
        { name: i18nString16(UIStrings17.passive), value: DispatchFilterBy.Passive },
        { name: i18nString16(UIStrings17.blocking), value: DispatchFilterBy.Blocking }
      ],
      selectedDispatchFilter: dispatchFilter,
      eventListenerObjects: [],
      filter: { showFramework: this.showFrameworkListenersSetting.get(), showPassive, showBlocking }
    };
    if (this.lastRequestedNode) {
      this.lastRequestedNode.domModel().runtimeModel().releaseObjectGroup(objectGroupName);
      delete this.lastRequestedNode;
    }
    const node = UI24.Context.Context.instance().flavor(SDK21.DOMModel.DOMNode);
    if (node) {
      this.lastRequestedNode = node;
      const selectedNodeOnly = !this.showForAncestorsSetting.get();
      const promises = [];
      promises.push(node.resolveToObject(objectGroupName));
      if (!selectedNodeOnly) {
        let currentNode = node.parentNode;
        while (currentNode) {
          promises.push(currentNode.resolveToObject(objectGroupName));
          currentNode = currentNode.parentNode;
        }
        promises.push(this.windowObjectInNodeContext(node));
      }
      input.eventListenerObjects = await Promise.all(promises);
    }
    this.#view(input, {}, this.contentElement);
  }
  wasShown() {
    UI24.Context.Context.instance().setFlavor(_EventListenersWidget, this);
    super.wasShown();
  }
  willHide() {
    super.willHide();
    UI24.Context.Context.instance().setFlavor(_EventListenersWidget, null);
  }
  windowObjectInNodeContext(node) {
    const executionContexts = node.domModel().runtimeModel().executionContexts();
    let context = executionContexts[0];
    if (node.frameId()) {
      for (let i = 0; i < executionContexts.length; ++i) {
        const executionContext = executionContexts[i];
        if (executionContext.frameId === node.frameId() && executionContext.isDefault) {
          context = executionContext;
        }
      }
    }
    return context.evaluate(
      {
        expression: "self",
        objectGroup: objectGroupName,
        includeCommandLineAPI: false,
        silent: true,
        returnByValue: false,
        generatePreview: false
      },
      /* userGesture */
      false,
      /* awaitPromise */
      false
    ).then((result) => {
      if ("object" in result) {
        return result.object;
      }
      return null;
    });
  }
  eventListenersArrivedForTest() {
  }
};
var DispatchFilterBy = {
  All: "All",
  Blocking: "Blocking",
  Passive: "Passive"
};
var objectGroupName = "event-listeners-panel";
var ActionDelegate2 = class {
  handleAction(_context, actionId) {
    switch (actionId) {
      case "elements.refresh-event-listeners": {
        EventListenersWidget.instance().requestUpdate();
        return true;
      }
    }
    return false;
  }
};

// gen/front_end/panels/elements/PropertiesWidget.js
var PropertiesWidget_exports = {};
__export(PropertiesWidget_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW7,
  PropertiesWidget: () => PropertiesWidget
});
import "./../../ui/legacy/legacy.js";
import * as Common17 from "./../../core/common/common.js";
import * as Host6 from "./../../core/host/host.js";
import * as i18n35 from "./../../core/i18n/i18n.js";
import * as Platform11 from "./../../core/platform/platform.js";
import * as SDK22 from "./../../core/sdk/sdk.js";
import * as ObjectUI from "./../../ui/legacy/components/object_ui/object_ui.js";
import * as UI25 from "./../../ui/legacy/legacy.js";
import { html as html12, nothing as nothing4, render as render9 } from "./../../ui/lit/lit.js";
import * as VisualLogging15 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/propertiesWidget.css.js
var propertiesWidget_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.properties-widget-section {
  padding: 2px 0 2px 5px;
  flex: none;
}

.properties-widget-toolbar {
  border-bottom: 1px solid var(--sys-color-divider);
  flex-shrink: 0;
}

.styles-pane-toolbar {
  width: 100%;
}

/*# sourceURL=${import.meta.resolve("./propertiesWidget.css")} */`;

// gen/front_end/panels/elements/PropertiesWidget.js
var OBJECT_GROUP_NAME = "properties-sidebar-pane";
var { bindToSetting: bindToSetting2 } = UI25.UIUtils;
var UIStrings18 = {
  /**
   * @description Text on the checkbox in the Properties tab of the Elements panel, which controls whether
   * all properties of the currently selected DOM element are shown, or only meaningful properties (i.e.
   * excluding properties whose values aren't set for example).
   */
  showAll: "Show all",
  /**
   * @description Tooltip on the checkbox in the Properties tab of the Elements panel, which controls whether
   * all properties of the currently selected DOM element are shown, or only meaningful properties (i.e.
   * excluding properties whose values aren't set for example).
   */
  showAllTooltip: "When unchecked, only properties whose values are neither null nor undefined will be shown",
  /**
   * @description Text shown to the user when a filter is applied in the Properties tab of the Elements panel, but
   * no properties matched the filter and thus no results were returned.
   */
  noMatchingProperty: "No matching property"
};
var str_18 = i18n35.i18n.registerUIStrings("panels/elements/PropertiesWidget.ts", UIStrings18);
var i18nString17 = i18n35.i18n.getLocalizedString.bind(void 0, str_18);
var DEFAULT_VIEW7 = (input, _output, target) => {
  render9(html12`
    <div jslog=${VisualLogging15.pane("element-properties").track({ resize: true })}>
      <div class="hbox properties-widget-toolbar">
        <devtools-toolbar class="styles-pane-toolbar" role="presentation">
          <devtools-toolbar-input type="filter" @change=${input.onFilterChanged} style="flex-grow:1; flex-shrink:1"></devtools-toolbar-input>
          <devtools-checkbox title=${i18nString17(UIStrings18.showAllTooltip)} ${bindToSetting2(getShowAllPropertiesSetting())}
              jslog=${VisualLogging15.toggle("show-all-properties").track({ change: true })}>
            ${i18nString17(UIStrings18.showAll)}
          </devtools-checkbox>
        </devtools-toolbar>
      </div>
      ${input.displayNoMatchingPropertyMessage ? html12`
        <div class="gray-info-message">${i18nString17(UIStrings18.noMatchingProperty)}</div>
      ` : nothing4}
      ${input.treeOutlineElement}
    </div>`, target);
};
var getShowAllPropertiesSetting = () => Common17.Settings.Settings.instance().createSetting(
  "show-all-properties",
  /* defaultValue */
  false
);
var PropertiesWidget = class extends UI25.Widget.VBox {
  node;
  showAllPropertiesSetting;
  filterRegex = null;
  treeOutline;
  lastRequestedNode;
  #view;
  #displayNoMatchingPropertyMessage = false;
  constructor(view = DEFAULT_VIEW7) {
    super({ useShadowDom: true });
    this.registerRequiredCSS(propertiesWidget_css_default);
    this.showAllPropertiesSetting = getShowAllPropertiesSetting();
    this.showAllPropertiesSetting.addChangeListener(this.filterAndScheduleUpdate.bind(this));
    SDK22.TargetManager.TargetManager.instance().addModelListener(SDK22.DOMModel.DOMModel, SDK22.DOMModel.Events.AttrModified, this.onNodeChange, this, { scoped: true });
    SDK22.TargetManager.TargetManager.instance().addModelListener(SDK22.DOMModel.DOMModel, SDK22.DOMModel.Events.AttrRemoved, this.onNodeChange, this, { scoped: true });
    SDK22.TargetManager.TargetManager.instance().addModelListener(SDK22.DOMModel.DOMModel, SDK22.DOMModel.Events.CharacterDataModified, this.onNodeChange, this, { scoped: true });
    SDK22.TargetManager.TargetManager.instance().addModelListener(SDK22.DOMModel.DOMModel, SDK22.DOMModel.Events.ChildNodeCountUpdated, this.onNodeChange, this, { scoped: true });
    UI25.Context.Context.instance().addFlavorChangeListener(SDK22.DOMModel.DOMNode, this.setNode, this);
    this.node = UI25.Context.Context.instance().flavor(SDK22.DOMModel.DOMNode);
    this.#view = view;
    this.treeOutline = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline({ readOnly: true });
    this.treeOutline.setShowSelectionOnKeyboardFocus(
      /* show */
      true,
      /* preventTabOrder */
      false
    );
    this.treeOutline.addEventListener(UI25.TreeOutline.Events.ElementExpanded, () => {
      Host6.userMetrics.actionTaken(Host6.UserMetrics.Action.DOMPropertiesExpanded);
    });
    void this.performUpdate();
  }
  onFilterChanged(event) {
    this.filterRegex = event.detail ? new RegExp(Platform11.StringUtilities.escapeForRegExp(event.detail), "i") : null;
    this.filterAndScheduleUpdate();
  }
  filterAndScheduleUpdate() {
    const previousDisplay = this.#displayNoMatchingPropertyMessage;
    this.internalFilterProperties();
    if (previousDisplay !== this.#displayNoMatchingPropertyMessage) {
      this.requestUpdate();
    }
  }
  internalFilterProperties() {
    this.#displayNoMatchingPropertyMessage = true;
    for (const element of this.treeOutline.rootElement().children()) {
      const { property } = element;
      const hidden = !property?.property.match({
        includeNullOrUndefinedValues: this.showAllPropertiesSetting.get(),
        regex: this.filterRegex
      });
      this.#displayNoMatchingPropertyMessage = this.#displayNoMatchingPropertyMessage && hidden;
      element.hidden = hidden;
    }
  }
  setNode(event) {
    this.node = event.data;
    this.requestUpdate();
  }
  async performUpdate() {
    if (this.lastRequestedNode) {
      this.lastRequestedNode.domModel().runtimeModel().releaseObjectGroup(OBJECT_GROUP_NAME);
      delete this.lastRequestedNode;
    }
    if (!this.node) {
      this.treeOutline.removeChildren();
      this.#displayNoMatchingPropertyMessage = false;
    } else {
      this.lastRequestedNode = this.node;
      const object = await this.node.resolveToObject(OBJECT_GROUP_NAME);
      if (!object) {
        return;
      }
      const treeElement = this.treeOutline.rootElement();
      let { properties } = await SDK22.RemoteObject.RemoteObject.loadFromObjectPerProto(
        object,
        true
        /* generatePreview */
      );
      treeElement.removeChildren();
      if (properties === null) {
        properties = [];
      }
      ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement.populateWithProperties(
        treeElement,
        { properties: properties.map((p) => new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(p)) },
        true,
        true
        /* skipGettersAndSetters */
      );
      this.internalFilterProperties();
    }
    this.#view({
      onFilterChanged: this.onFilterChanged.bind(this),
      treeOutlineElement: this.treeOutline.element,
      displayNoMatchingPropertyMessage: this.#displayNoMatchingPropertyMessage
    }, {}, this.contentElement);
  }
  onNodeChange(event) {
    if (!this.node) {
      return;
    }
    const data = event.data;
    const node = data instanceof SDK22.DOMModel.DOMNode ? data : data.node;
    if (this.node !== node) {
      return;
    }
    this.requestUpdate();
  }
};

// gen/front_end/panels/elements/NodeStackTraceWidget.js
var NodeStackTraceWidget_exports = {};
__export(NodeStackTraceWidget_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW8,
  MaxLengthForLinks: () => MaxLengthForLinks,
  NodeStackTraceWidget: () => NodeStackTraceWidget
});
import * as i18n37 from "./../../core/i18n/i18n.js";
import * as SDK23 from "./../../core/sdk/sdk.js";
import * as Bindings5 from "./../../models/bindings/bindings.js";
import * as Components7 from "./../../ui/legacy/components/utils/utils.js";
import * as UI26 from "./../../ui/legacy/legacy.js";
import { html as html13, render as render10 } from "./../../ui/lit/lit.js";

// gen/front_end/panels/elements/nodeStackTraceWidget.css.js
var nodeStackTraceWidget_css_default = `/*
 * Copyright 2019 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (devtools-widget > *) {
  .stack-trace {
    font-size: 11px !important; /* stylelint-disable-line declaration-no-important */
    font-family: Menlo, monospace;
  }
}

/*# sourceURL=${import.meta.resolve("./nodeStackTraceWidget.css")} */`;

// gen/front_end/panels/elements/NodeStackTraceWidget.js
var UIStrings19 = {
  /**
   * @description Message displayed when no JavaScript stack trace is available for the DOM node in the Stack Trace widget of the Elements panel
   */
  noStackTraceAvailable: "No stack trace available"
};
var str_19 = i18n37.i18n.registerUIStrings("panels/elements/NodeStackTraceWidget.ts", UIStrings19);
var i18nString18 = i18n37.i18n.getLocalizedString.bind(void 0, str_19);
var DEFAULT_VIEW8 = (input, _output, target) => {
  const { target: sdkTarget, linkifier, stackTrace } = input;
  render10(html13`
    <style>${nodeStackTraceWidget_css_default}</style>
    ${target && stackTrace ? html13`<devtools-widget
                class="stack-trace"
                .widgetConfig=${UI26.Widget.widgetConfig(Components7.JSPresentationUtils.StackTracePreviewContent, { target: sdkTarget, linkifier, stackTrace })}>
              </devtools-widget>` : html13`<div class="gray-info-message">${i18nString18(UIStrings19.noStackTraceAvailable)}</div>`}`, target);
};
var NodeStackTraceWidget = class extends UI26.Widget.VBox {
  #linkifier = new Components7.Linkifier.Linkifier(MaxLengthForLinks);
  #view;
  constructor(view = DEFAULT_VIEW8) {
    super({ useShadowDom: true });
    this.#view = view;
  }
  wasShown() {
    super.wasShown();
    UI26.Context.Context.instance().addFlavorChangeListener(SDK23.DOMModel.DOMNode, this.requestUpdate, this);
    this.requestUpdate();
  }
  willHide() {
    super.willHide();
    UI26.Context.Context.instance().removeFlavorChangeListener(SDK23.DOMModel.DOMNode, this.requestUpdate, this);
  }
  async performUpdate() {
    const node = UI26.Context.Context.instance().flavor(SDK23.DOMModel.DOMNode);
    const target = node?.domModel().target();
    const runtimeStackTrace = await node?.creationStackTrace() ?? void 0;
    const stackTrace = runtimeStackTrace && target ? await Bindings5.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createStackTraceFromProtocolRuntime(runtimeStackTrace, target) : void 0;
    const input = {
      target,
      linkifier: this.#linkifier,
      stackTrace
    };
    this.#view(input, {}, this.contentElement);
  }
};
var MaxLengthForLinks = 40;

// gen/front_end/panels/elements/ClassesPaneWidget.js
var ClassesPaneWidget_exports = {};
__export(ClassesPaneWidget_exports, {
  ButtonProvider: () => ButtonProvider3,
  ClassNamePrompt: () => ClassNamePrompt,
  ClassesPaneWidget: () => ClassesPaneWidget
});
import * as Common18 from "./../../core/common/common.js";
import * as i18n39 from "./../../core/i18n/i18n.js";
import * as Platform12 from "./../../core/platform/platform.js";
import * as SDK24 from "./../../core/sdk/sdk.js";
import * as UI27 from "./../../ui/legacy/legacy.js";
import * as VisualLogging16 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/classesPaneWidget.css.js
var classesPaneWidget_css_default = `/**
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.styles-element-classes-pane {
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);
  padding: 6px 2px 2px;
}

.styles-element-classes-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.styles-element-classes-pane devtools-checkbox {
  margin-right: 15px;
}

.styles-element-classes-pane .title-container {
  padding-bottom: 2px;
}

.styles-element-classes-pane .new-class-input {
  padding-left: 3px;
  padding-right: 3px;
  overflow: hidden;
  border: 1px solid var(--sys-color-neutral-outline);
  border-radius: 4px;
  line-height: 15px;
  margin-left: 3px;
  width: calc(100% - 7px);
  background-color: var(--sys-color-cdt-base-container);
  cursor: text;

  &:hover {
    box-shadow: 0 0 0 1px var(--ref-palette-neutral90);
  }
}

/*# sourceURL=${import.meta.resolve("./classesPaneWidget.css")} */`;

// gen/front_end/panels/elements/ClassesPaneWidget.js
var UIStrings20 = {
  /**
   * @description Prompt text for a text field in the Classes Pane Widget of the Elements panel.
   * Class refers to a CSS class.
   */
  addNewClass: "Add new class",
  /**
   * @description Screen reader announcement string when adding a CSS class via the Classes Pane Widget.
   * @example {vbox flex-auto} PH1
   */
  classesSAdded: "Classes {PH1} added",
  /**
   * @description Screen reader announcement string when adding a class via the Classes Pane Widget.
   * @example {title-container} PH1
   */
  classSAdded: "Class {PH1} added",
  /**
   * @description Accessible title read by screen readers for the Classes Pane Widget of the Elements
   * panel. Element is a HTML DOM Element and classes refers to CSS classes.
   */
  elementClasses: "Element Classes"
};
var str_20 = i18n39.i18n.registerUIStrings("panels/elements/ClassesPaneWidget.ts", UIStrings20);
var i18nString19 = i18n39.i18n.getLocalizedString.bind(void 0, str_20);
var ClassesPaneWidget = class extends UI27.Widget.Widget {
  input;
  classesContainer;
  prompt;
  mutatingNodes;
  pendingNodeClasses;
  updateNodeThrottler;
  previousTarget;
  constructor() {
    super({
      jslog: `${VisualLogging16.pane("elements-classes")}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(classesPaneWidget_css_default);
    this.contentElement.className = "styles-element-classes-pane";
    const container = this.contentElement.createChild("div", "title-container");
    this.input = container.createChild("div", "new-class-input monospace");
    this.setDefaultFocusedElement(this.input);
    this.classesContainer = this.contentElement.createChild("div", "source-code");
    this.classesContainer.classList.add("styles-element-classes-container");
    this.prompt = new ClassNamePrompt(this.nodeClasses.bind(this));
    this.prompt.setAutocompletionTimeout(0);
    this.prompt.renderAsBlock();
    const proxyElement = this.prompt.attach(this.input);
    this.prompt.setPlaceholder(i18nString19(UIStrings20.addNewClass));
    this.prompt.addEventListener("TextChanged", this.onTextChanged, this);
    proxyElement.addEventListener("keydown", this.onKeyDown.bind(this), false);
    SDK24.TargetManager.TargetManager.instance().addModelListener(SDK24.DOMModel.DOMModel, SDK24.DOMModel.Events.DOMMutated, this.onDOMMutated, this, { scoped: true });
    this.mutatingNodes = /* @__PURE__ */ new Set();
    this.pendingNodeClasses = /* @__PURE__ */ new Map();
    this.updateNodeThrottler = new Common18.Throttler.Throttler(0);
    this.previousTarget = null;
    UI27.Context.Context.instance().addFlavorChangeListener(SDK24.DOMModel.DOMNode, this.onSelectedNodeChanged, this);
  }
  splitTextIntoClasses(text) {
    return text.split(/[,\s]/).map((className) => className.trim()).filter((className) => className.length);
  }
  onKeyDown(event) {
    if (!(event.key === "Enter") && !Platform12.KeyboardUtilities.isEscKey(event)) {
      return;
    }
    if (event.key === "Enter") {
      event.consume();
      if (this.prompt.acceptAutoComplete()) {
        return;
      }
    }
    const eventTarget = event.target;
    let text = eventTarget.textContent;
    if (Platform12.KeyboardUtilities.isEscKey(event)) {
      if (!Platform12.StringUtilities.isWhitespace(text)) {
        event.consume(true);
      }
      text = "";
    }
    this.prompt.clearAutocomplete();
    eventTarget.textContent = "";
    const node = UI27.Context.Context.instance().flavor(SDK24.DOMModel.DOMNode);
    if (!node) {
      return;
    }
    const classNames = this.splitTextIntoClasses(text);
    if (!classNames.length) {
      this.installNodeClasses(node);
      return;
    }
    for (const className of classNames) {
      this.toggleClass(node, className, true);
    }
    const joinClassString = classNames.join(" ");
    const announcementString = classNames.length > 1 ? i18nString19(UIStrings20.classesSAdded, { PH1: joinClassString }) : i18nString19(UIStrings20.classSAdded, { PH1: joinClassString });
    UI27.ARIAUtils.LiveAnnouncer.alert(announcementString);
    this.installNodeClasses(node);
    this.update();
  }
  onTextChanged() {
    const node = UI27.Context.Context.instance().flavor(SDK24.DOMModel.DOMNode);
    if (!node) {
      return;
    }
    this.installNodeClasses(node);
  }
  onDOMMutated(event) {
    const node = event.data;
    if (this.mutatingNodes.has(node)) {
      return;
    }
    cachedClassesMap.delete(node);
    this.update();
  }
  onSelectedNodeChanged(event) {
    if (this.previousTarget && this.prompt.text()) {
      this.input.textContent = "";
      this.installNodeClasses(this.previousTarget);
    }
    this.previousTarget = event.data;
    this.update();
  }
  wasShown() {
    super.wasShown();
    this.update();
  }
  update() {
    if (!this.isShowing()) {
      return;
    }
    let node = UI27.Context.Context.instance().flavor(SDK24.DOMModel.DOMNode);
    if (node) {
      node = node.enclosingElementOrSelf();
    }
    this.classesContainer.removeChildren();
    this.input.disabled = !node;
    if (!node) {
      return;
    }
    const classes = this.nodeClasses(node);
    const keys = [...classes.keys()];
    keys.sort(Platform12.StringUtilities.caseInsensetiveComparator);
    for (const className of keys) {
      const checkbox = UI27.UIUtils.CheckboxLabel.createWithStringLiteral(className, classes.get(className), "element-class", true);
      checkbox.classList.add("monospace");
      checkbox.addEventListener("click", this.onClick.bind(this, className), false);
      this.classesContainer.appendChild(checkbox);
    }
  }
  onClick(className, event) {
    const node = UI27.Context.Context.instance().flavor(SDK24.DOMModel.DOMNode);
    if (!node) {
      return;
    }
    const enabled = event.target.checked;
    this.toggleClass(node, className, enabled);
    this.installNodeClasses(node);
  }
  nodeClasses(node) {
    let result = cachedClassesMap.get(node);
    if (!result) {
      const classAttribute = node.getAttribute("class") || "";
      const classes = classAttribute.split(/\s/);
      result = /* @__PURE__ */ new Map();
      for (let i = 0; i < classes.length; ++i) {
        const className = classes[i].trim();
        if (!className.length) {
          continue;
        }
        result.set(className, true);
      }
      cachedClassesMap.set(node, result);
    }
    return result;
  }
  toggleClass(node, className, enabled) {
    const classes = this.nodeClasses(node);
    classes.set(className, enabled);
    ButtonProvider3.instance().item().setChecked([...classes.values()].includes(true));
  }
  installNodeClasses(node) {
    const classes = this.nodeClasses(node);
    const activeClasses = /* @__PURE__ */ new Set();
    for (const className of classes.keys()) {
      if (classes.get(className)) {
        activeClasses.add(className);
      }
    }
    const additionalClasses = this.splitTextIntoClasses(this.prompt.textWithCurrentSuggestion());
    for (const className of additionalClasses) {
      activeClasses.add(className);
    }
    const newClasses = [...activeClasses.values()].sort();
    this.pendingNodeClasses.set(node, newClasses.join(" "));
    void this.updateNodeThrottler.schedule(this.flushPendingClasses.bind(this));
  }
  async flushPendingClasses() {
    const promises = [];
    for (const node of this.pendingNodeClasses.keys()) {
      this.mutatingNodes.add(node);
      const promise = node.setAttributeValuePromise("class", this.pendingNodeClasses.get(node)).then(onClassValueUpdated.bind(this, node));
      promises.push(promise);
    }
    this.pendingNodeClasses.clear();
    await Promise.all(promises);
    function onClassValueUpdated(node) {
      this.mutatingNodes.delete(node);
    }
  }
};
var cachedClassesMap = /* @__PURE__ */ new WeakMap();
var buttonProviderInstance3;
var ButtonProvider3 = class _ButtonProvider {
  button;
  view;
  constructor() {
    this.button = new UI27.Toolbar.ToolbarToggle(i18nString19(UIStrings20.elementClasses), "class");
    this.button.element.style.setProperty("--dot-toggle-top", "12px");
    this.button.element.style.setProperty("--dot-toggle-left", "18px");
    this.button.element.setAttribute("jslog", `${VisualLogging16.toggleSubpane("elements-classes").track({ click: true })}`);
    this.button.addEventListener("Click", this.clicked, this);
    this.view = new ClassesPaneWidget();
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!buttonProviderInstance3 || forceNew) {
      buttonProviderInstance3 = new _ButtonProvider();
    }
    return buttonProviderInstance3;
  }
  clicked() {
    ElementsPanel.instance().showToolbarPane(!this.view.isShowing() ? this.view : null, this.button);
  }
  item() {
    return this.button;
  }
};
var ClassNamePrompt = class extends UI27.TextPrompt.TextPrompt {
  nodeClasses;
  selectedFrameId;
  classNamesPromise;
  constructor(nodeClasses) {
    super();
    this.nodeClasses = nodeClasses;
    this.initialize(this.buildClassNameCompletions.bind(this), " ");
    this.disableDefaultSuggestionForEmptyInput();
    this.selectedFrameId = "";
    this.classNamesPromise = null;
  }
  async getClassNames(selectedNode) {
    const promises = [];
    const completions = /* @__PURE__ */ new Set();
    this.selectedFrameId = selectedNode.frameId();
    const cssModel = selectedNode.domModel().cssModel();
    const allStyleSheets = cssModel.allStyleSheets();
    for (const stylesheet of allStyleSheets) {
      if (stylesheet.frameId !== this.selectedFrameId) {
        continue;
      }
      const cssPromise = cssModel.getClassNames(stylesheet.id).then((classes) => {
        for (const className of classes) {
          completions.add(className);
        }
      });
      promises.push(cssPromise);
    }
    const ownerDocumentId = selectedNode.ownerDocument.id;
    const domPromise = selectedNode.domModel().classNamesPromise(ownerDocumentId).then((classes) => {
      for (const className of classes) {
        completions.add(className);
      }
    });
    promises.push(domPromise);
    await Promise.all(promises);
    return [...completions];
  }
  async buildClassNameCompletions(expression, prefix, force) {
    if (!prefix || force) {
      this.classNamesPromise = null;
    }
    const selectedNode = UI27.Context.Context.instance().flavor(SDK24.DOMModel.DOMNode);
    if (!selectedNode || !prefix && !force && !expression.trim()) {
      return [];
    }
    if (!this.classNamesPromise || this.selectedFrameId !== selectedNode.frameId()) {
      this.classNamesPromise = this.getClassNames(selectedNode);
    }
    let completions = await this.classNamesPromise;
    const classesMap = this.nodeClasses(selectedNode);
    completions = completions.filter((value5) => !classesMap.get(value5));
    if (prefix[0] === ".") {
      completions = completions.map((value5) => "." + value5);
    }
    return completions.filter((value5) => value5.startsWith(prefix)).sort().map((completion) => {
      return {
        text: completion,
        title: void 0,
        subtitle: void 0,
        priority: void 0,
        isSecondary: void 0,
        subtitleRenderer: void 0,
        selectionRange: void 0,
        hideGhostText: void 0,
        iconElement: void 0
      };
    });
  }
};

// gen/front_end/panels/elements/ElementStatePaneWidget.js
var ElementStatePaneWidget_exports = {};
__export(ElementStatePaneWidget_exports, {
  ButtonProvider: () => ButtonProvider4,
  DEFAULT_VIEW: () => DEFAULT_VIEW9,
  ElementStatePaneWidget: () => ElementStatePaneWidget
});
import * as i18n41 from "./../../core/i18n/i18n.js";
import * as SDK25 from "./../../core/sdk/sdk.js";
import * as Buttons5 from "./../../ui/components/buttons/buttons.js";
import * as UIHelpers from "./../../ui/helpers/helpers.js";
import * as UI28 from "./../../ui/legacy/legacy.js";
import { html as html14, render as render11 } from "./../../ui/lit/lit.js";
import * as VisualLogging17 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/elements/elementStatePaneWidget.css.js
var elementStatePaneWidget_css_default = `/**
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (devtools-widget > *) {
  .styles-element-state-pane {
    overflow: hidden;
    padding-left: 2px;
    background-color: var(--sys-color-cdt-base-container);
    border-bottom: 1px solid var(--sys-color-divider);
    margin-top: 0;
    padding-bottom: 2px;
  }

  .styles-element-state-pane > .page-state-checkbox {
    margin-block: 6px;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .styles-element-state-pane .section-header {
    margin: 8px 4px 6px;
    color: var(--color-text-secondary);
  }

  .styles-element-state-pane > table {
    width: 100%;
    border-spacing: 0;
  }

  .styles-element-state-pane td {
    padding: 0;
  }

  .pseudo-states-container {
    display: grid;
    column-gap: 12px;
    grid-template-columns: repeat(2, 1fr);
    grid-auto-flow: row;
  }

  .pseudo-states-container.specific-pseudo-states {
    grid-template-columns: repeat(2, 1fr);
    margin-bottom: 4px;
  }

  .force-specific-element-header:focus {
    background-color: var(--sys-color-state-hover-on-subtle);
  }
}

/*# sourceURL=${import.meta.resolve("./elementStatePaneWidget.css")} */`;

// gen/front_end/panels/elements/ElementStatePaneWidget.js
var { bindToSetting: bindToSetting3 } = UI28.UIUtils;
var UIStrings21 = {
  /**
   * @description Title of a section in the Element State Pane Widget of the Elements panel. The
   * controls in this section allow users to force a particular state on the selected element, e.g. a
   * focused state via :focus or a hover state via :hover.
   */
  forceElementState: "Force element state",
  /**
   * @description Tooltip text in Element State Pane Widget of the Elements panel. For a button that
   * opens a tool that toggles the various states of the selected element on/off.
   */
  toggleElementState: "Toggle Element State",
  /**
   * @description The name of a checkbox setting in the Element & Page State Pane Widget of the Elements panel.. This setting
   * emulates/pretends that the webpage is focused.
   */
  emulateFocusedPage: "Emulate a focused page",
  /**
   * @description Explanation text for the 'Emulate a focused page' setting in the Rendering tool.
   */
  emulatesAFocusedPage: "Keep page focused. Commonly used for debugging disappearing elements.",
  /**
   * @description Similar with forceElementState but allows users to force specific state of the selected element.
   */
  forceElementSpecificStates: "Force specific element state",
  /**
   * @description Text that is usually a hyperlink to more documentation
   */
  learnMore: "Learn more"
};
var str_21 = i18n41.i18n.registerUIStrings("panels/elements/ElementStatePaneWidget.ts", UIStrings21);
var i18nString20 = i18n41.i18n.getLocalizedString.bind(void 0, str_21);
var SpecificPseudoStates;
(function(SpecificPseudoStates2) {
  SpecificPseudoStates2["ENABLED"] = "enabled";
  SpecificPseudoStates2["DISABLED"] = "disabled";
  SpecificPseudoStates2["VALID"] = "valid";
  SpecificPseudoStates2["INVALID"] = "invalid";
  SpecificPseudoStates2["USER_VALID"] = "user-valid";
  SpecificPseudoStates2["USER_INVALID"] = "user-invalid";
  SpecificPseudoStates2["REQUIRED"] = "required";
  SpecificPseudoStates2["OPTIONAL"] = "optional";
  SpecificPseudoStates2["READ_ONLY"] = "read-only";
  SpecificPseudoStates2["READ_WRITE"] = "read-write";
  SpecificPseudoStates2["IN_RANGE"] = "in-range";
  SpecificPseudoStates2["OUT_OF_RANGE"] = "out-of-range";
  SpecificPseudoStates2["VISITED"] = "visited";
  SpecificPseudoStates2["LINK"] = "link";
  SpecificPseudoStates2["CHECKED"] = "checked";
  SpecificPseudoStates2["INDETERMINATE"] = "indeterminate";
  SpecificPseudoStates2["PLACEHOLDER_SHOWN"] = "placeholder-shown";
  SpecificPseudoStates2["AUTOFILL"] = "autofill";
  SpecificPseudoStates2["OPEN"] = "open";
  SpecificPseudoStates2["TARGET_CURRENT"] = "target-current";
})(SpecificPseudoStates || (SpecificPseudoStates = {}));
var DEFAULT_VIEW9 = (input, _output, target) => {
  const createElementStateCheckbox = (state) => {
    return html14`
        <div id=${state.state}>
          <devtools-checkbox class="small" @click=${input.onStateCheckboxClicked}
              jslog=${VisualLogging17.toggle(state.state).track({ change: true })} ?checked=${state.checked} ?disabled=${state.disabled}
              title=${":" + state.state}>
          <span class="source-code">${":" + state.state}</span>
        </devtools-checkbox>
        </div>`;
  };
  render11(html14`
    <style>${elementStatePaneWidget_css_default}</style>
    <div class="styles-element-state-pane"
        jslog=${VisualLogging17.pane("element-states")}>
      <div class="page-state-checkbox">
        <devtools-checkbox class="small" title=${i18nString20(UIStrings21.emulatesAFocusedPage)}
            jslog=${VisualLogging17.toggle("emulate-page-focus").track({ change: true })} ${bindToSetting3("emulate-page-focus")}>${i18nString20(UIStrings21.emulateFocusedPage)}</devtools-checkbox>
        <devtools-button
            @click=${() => UIHelpers.openInNewTab("https://developer.chrome.com/docs/devtools/rendering/apply-effects#emulate_a_focused_page")}
           .data=${{
    variant: "icon",
    iconName: "help",
    size: "SMALL",
    jslogContext: "learn-more",
    title: i18nString20(UIStrings21.learnMore)
  }}></devtools-button>
      </div>
      <div class="section-header">
        <span>${i18nString20(UIStrings21.forceElementState)}</span>
      </div>
      <div class="pseudo-states-container" role="presentation">
        ${input.states.filter(({ type }) => type === "persistent").map((state) => createElementStateCheckbox(state))}
      </div>
      <details class="specific-details" ?hidden=${input.states.filter(({ type }) => type === "specific").every((state) => state.hidden)}>
        <summary class="force-specific-element-header section-header">
          <span>${i18nString20(UIStrings21.forceElementSpecificStates)}</span>
        </summary>
        <div class="pseudo-states-container specific-pseudo-states" role="presentation">
          ${input.states.filter(({ type, hidden }) => type === "specific" && !hidden).map((state) => createElementStateCheckbox(state))}
        </div>
      </details>
    </div>`, target);
};
var ElementStatePaneWidget = class extends UI28.Widget.Widget {
  #duals;
  #cssModel;
  #states = /* @__PURE__ */ new Map();
  #view;
  constructor(view = DEFAULT_VIEW9) {
    super({ useShadowDom: true });
    this.#view = view;
    this.#duals = /* @__PURE__ */ new Map();
    const setDualStateCheckboxes = (first, second) => {
      this.#duals.set(first, second);
      this.#duals.set(second, first);
    };
    this.#states.set("active", { state: "active", type: "persistent" });
    this.#states.set("hover", { state: "hover", type: "persistent" });
    this.#states.set("focus", { state: "focus", type: "persistent" });
    this.#states.set("focus-within", { state: "focus-within", type: "persistent" });
    this.#states.set("focus-visible", { state: "focus-visible", type: "persistent" });
    this.#states.set("target", { state: "target", type: "persistent" });
    this.#states.set(SpecificPseudoStates.ENABLED, { state: SpecificPseudoStates.ENABLED, type: "specific" });
    this.#states.set(SpecificPseudoStates.DISABLED, { state: SpecificPseudoStates.DISABLED, type: "specific" });
    this.#states.set(SpecificPseudoStates.VALID, { state: SpecificPseudoStates.VALID, type: "specific" });
    this.#states.set(SpecificPseudoStates.INVALID, { state: SpecificPseudoStates.INVALID, type: "specific" });
    this.#states.set(SpecificPseudoStates.USER_VALID, { state: SpecificPseudoStates.USER_VALID, type: "specific" });
    this.#states.set(SpecificPseudoStates.USER_INVALID, { state: SpecificPseudoStates.USER_INVALID, type: "specific" });
    this.#states.set(SpecificPseudoStates.REQUIRED, { state: SpecificPseudoStates.REQUIRED, type: "specific" });
    this.#states.set(SpecificPseudoStates.OPTIONAL, { state: SpecificPseudoStates.OPTIONAL, type: "specific" });
    this.#states.set(SpecificPseudoStates.READ_ONLY, { state: SpecificPseudoStates.READ_ONLY, type: "specific" });
    this.#states.set(SpecificPseudoStates.READ_WRITE, { state: SpecificPseudoStates.READ_WRITE, type: "specific" });
    this.#states.set(SpecificPseudoStates.IN_RANGE, { state: SpecificPseudoStates.IN_RANGE, type: "specific" });
    this.#states.set(SpecificPseudoStates.OUT_OF_RANGE, { state: SpecificPseudoStates.OUT_OF_RANGE, type: "specific" });
    this.#states.set(SpecificPseudoStates.VISITED, { state: SpecificPseudoStates.VISITED, type: "specific" });
    this.#states.set(SpecificPseudoStates.LINK, { state: SpecificPseudoStates.LINK, type: "specific" });
    this.#states.set(SpecificPseudoStates.CHECKED, { state: SpecificPseudoStates.CHECKED, type: "specific" });
    this.#states.set(SpecificPseudoStates.INDETERMINATE, { state: SpecificPseudoStates.INDETERMINATE, type: "specific" });
    this.#states.set(SpecificPseudoStates.PLACEHOLDER_SHOWN, { state: SpecificPseudoStates.PLACEHOLDER_SHOWN, type: "specific" });
    this.#states.set(SpecificPseudoStates.AUTOFILL, { state: SpecificPseudoStates.AUTOFILL, type: "specific" });
    this.#states.set(SpecificPseudoStates.OPEN, { state: SpecificPseudoStates.OPEN, type: "specific" });
    this.#states.set(SpecificPseudoStates.TARGET_CURRENT, { state: SpecificPseudoStates.TARGET_CURRENT, type: "specific" });
    setDualStateCheckboxes(SpecificPseudoStates.VALID, SpecificPseudoStates.INVALID);
    setDualStateCheckboxes(SpecificPseudoStates.USER_VALID, SpecificPseudoStates.USER_INVALID);
    setDualStateCheckboxes(SpecificPseudoStates.READ_ONLY, SpecificPseudoStates.READ_WRITE);
    setDualStateCheckboxes(SpecificPseudoStates.IN_RANGE, SpecificPseudoStates.OUT_OF_RANGE);
    setDualStateCheckboxes(SpecificPseudoStates.ENABLED, SpecificPseudoStates.DISABLED);
    setDualStateCheckboxes(SpecificPseudoStates.VISITED, SpecificPseudoStates.LINK);
    UI28.Context.Context.instance().addFlavorChangeListener(SDK25.DOMModel.DOMNode, this.requestUpdate, this);
  }
  onStateCheckboxClicked(event) {
    const node = UI28.Context.Context.instance().flavor(SDK25.DOMModel.DOMNode);
    if (!node || !(event.target instanceof UI28.UIUtils.CheckboxLabel)) {
      return;
    }
    const state = event.target.title.slice(1);
    if (!state) {
      return;
    }
    const checked = event.target.checked;
    const dual = this.#duals.get(state);
    if (checked && dual) {
      node.domModel().cssModel().forcePseudoState(node, dual, false);
    }
    node.domModel().cssModel().forcePseudoState(node, state, checked);
  }
  updateModel(cssModel) {
    if (this.#cssModel === cssModel) {
      return;
    }
    if (this.#cssModel) {
      this.#cssModel.removeEventListener(SDK25.CSSModel.Events.PseudoStateForced, this.requestUpdate, this);
    }
    this.#cssModel = cssModel;
    if (this.#cssModel) {
      this.#cssModel.addEventListener(SDK25.CSSModel.Events.PseudoStateForced, this.requestUpdate, this);
    }
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
  async performUpdate() {
    let node = UI28.Context.Context.instance().flavor(SDK25.DOMModel.DOMNode);
    if (node) {
      node = node.enclosingElementOrSelf();
    }
    this.updateModel(node ? node.domModel().cssModel() : null);
    if (node) {
      const nodePseudoState = node.domModel().cssModel().pseudoState(node);
      for (const state of this.#states.values()) {
        state.disabled = Boolean(node.pseudoType());
        state.checked = Boolean(nodePseudoState && nodePseudoState.indexOf(state.state) >= 0);
      }
    } else {
      for (const state of this.#states.values()) {
        state.disabled = true;
        state.checked = false;
      }
    }
    await this.#updateElementSpecificStatesTable(node);
    ButtonProvider4.instance().item().setToggled([...this.#states.values()].some((input) => input.checked));
    const viewInput = {
      states: [...this.#states.values()],
      onStateCheckboxClicked: this.onStateCheckboxClicked.bind(this)
    };
    this.#view(viewInput, {}, this.contentElement);
  }
  async #updateElementSpecificStatesTable(node = null) {
    if (!node || node.nodeType() !== Node.ELEMENT_NODE) {
      [...this.#states.values()].filter(({ type }) => type === "specific").forEach((state) => {
        state.hidden = true;
      });
      return;
    }
    const hideSpecificCheckbox = (pseudoClass, hide) => {
      const state = this.#states.get(pseudoClass);
      if (state) {
        state.hidden = hide;
      }
    };
    const isElementOfTypes = (node2, types) => {
      return types.includes(node2.nodeName()?.toLowerCase());
    };
    const isAnchorElementWithHref = (node2) => {
      return isElementOfTypes(node2, ["a"]) && node2.getAttribute("href") !== void 0;
    };
    const isInputWithTypeRadioOrCheckbox = (node2) => {
      return isElementOfTypes(node2, ["input"]) && (node2.getAttribute("type") === "checkbox" || node2.getAttribute("type") === "radio");
    };
    const isContentEditable = (node2) => {
      return node2.getAttribute("contenteditable") !== void 0 || Boolean(node2.parentNode && isContentEditable(node2.parentNode));
    };
    const isDisabled = (node2) => {
      return node2.getAttribute("disabled") !== void 0;
    };
    const isMutable = (node2) => {
      if (isElementOfTypes(node2, ["input", "textarea"])) {
        return node2.getAttribute("readonly") === void 0 && !isDisabled(node2);
      }
      return isContentEditable(node2);
    };
    const isFormAssociatedCustomElement = async (node2) => {
      function getFormAssociatedField() {
        return "formAssociated" in this.constructor && this.constructor.formAssociated === true;
      }
      const response = await node2.callFunction(getFormAssociatedField);
      return response ? response.value : false;
    };
    const isFormAssociated = await isFormAssociatedCustomElement(node);
    if (isElementOfTypes(node, ["button", "input", "select", "textarea", "optgroup", "option", "fieldset"]) || isFormAssociated) {
      hideSpecificCheckbox(SpecificPseudoStates.ENABLED, !isDisabled(node));
      hideSpecificCheckbox(SpecificPseudoStates.DISABLED, isDisabled(node));
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.ENABLED, true);
      hideSpecificCheckbox(SpecificPseudoStates.DISABLED, true);
    }
    if (isElementOfTypes(node, ["button", "fieldset", "input", "object", "output", "select", "textarea", "img"]) || isFormAssociated) {
      hideSpecificCheckbox(SpecificPseudoStates.VALID, false);
      hideSpecificCheckbox(SpecificPseudoStates.INVALID, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.VALID, true);
      hideSpecificCheckbox(SpecificPseudoStates.INVALID, true);
    }
    if (isElementOfTypes(node, ["input", "select", "textarea"])) {
      hideSpecificCheckbox(SpecificPseudoStates.USER_VALID, false);
      hideSpecificCheckbox(SpecificPseudoStates.USER_INVALID, false);
      if (node.getAttribute("required") === void 0) {
        hideSpecificCheckbox(SpecificPseudoStates.REQUIRED, false);
        hideSpecificCheckbox(SpecificPseudoStates.OPTIONAL, true);
      } else {
        hideSpecificCheckbox(SpecificPseudoStates.REQUIRED, true);
        hideSpecificCheckbox(SpecificPseudoStates.OPTIONAL, false);
      }
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.USER_VALID, true);
      hideSpecificCheckbox(SpecificPseudoStates.USER_INVALID, true);
      hideSpecificCheckbox(SpecificPseudoStates.REQUIRED, true);
      hideSpecificCheckbox(SpecificPseudoStates.OPTIONAL, true);
    }
    if (isMutable(node)) {
      hideSpecificCheckbox(SpecificPseudoStates.READ_WRITE, true);
      hideSpecificCheckbox(SpecificPseudoStates.READ_ONLY, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.READ_WRITE, false);
      hideSpecificCheckbox(SpecificPseudoStates.READ_ONLY, true);
    }
    if (isElementOfTypes(node, ["input"]) && (node.getAttribute("min") !== void 0 || node.getAttribute("max") !== void 0)) {
      hideSpecificCheckbox(SpecificPseudoStates.IN_RANGE, false);
      hideSpecificCheckbox(SpecificPseudoStates.OUT_OF_RANGE, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.IN_RANGE, true);
      hideSpecificCheckbox(SpecificPseudoStates.OUT_OF_RANGE, true);
    }
    if (isElementOfTypes(node, ["a", "area"]) && node.getAttribute("href") !== void 0) {
      hideSpecificCheckbox(SpecificPseudoStates.VISITED, false);
      hideSpecificCheckbox(SpecificPseudoStates.LINK, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.VISITED, true);
      hideSpecificCheckbox(SpecificPseudoStates.LINK, true);
    }
    if (isInputWithTypeRadioOrCheckbox(node) || isElementOfTypes(node, ["option"])) {
      hideSpecificCheckbox(SpecificPseudoStates.CHECKED, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.CHECKED, true);
    }
    if (isInputWithTypeRadioOrCheckbox(node) || isElementOfTypes(node, ["progress"])) {
      hideSpecificCheckbox(SpecificPseudoStates.INDETERMINATE, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.INDETERMINATE, true);
    }
    if (isElementOfTypes(node, ["input", "textarea"])) {
      hideSpecificCheckbox(SpecificPseudoStates.PLACEHOLDER_SHOWN, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.PLACEHOLDER_SHOWN, true);
    }
    if (isElementOfTypes(node, ["input"])) {
      hideSpecificCheckbox(SpecificPseudoStates.AUTOFILL, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.AUTOFILL, true);
    }
    if (isElementOfTypes(node, ["input", "select", "dialog", "details"])) {
      hideSpecificCheckbox(SpecificPseudoStates.OPEN, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.OPEN, true);
    }
    if (isAnchorElementWithHref(node) || node.pseudoType() === "scroll-marker") {
      hideSpecificCheckbox(SpecificPseudoStates.TARGET_CURRENT, false);
    } else {
      hideSpecificCheckbox(SpecificPseudoStates.TARGET_CURRENT, true);
    }
  }
};
var buttonProviderInstance4;
var ButtonProvider4 = class _ButtonProvider {
  button;
  view;
  constructor() {
    this.button = new UI28.Toolbar.ToolbarToggle(i18nString20(UIStrings21.toggleElementState), "hover");
    this.button.addEventListener("Click", this.clicked, this);
    this.button.element.classList.add("element-state");
    this.button.element.setAttribute("jslog", `${VisualLogging17.toggleSubpane("element-states").track({ click: true })}`);
    this.button.element.style.setProperty("--dot-toggle-top", "12px");
    this.button.element.style.setProperty("--dot-toggle-left", "18px");
    this.view = new ElementStatePaneWidget();
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!buttonProviderInstance4 || forceNew) {
      buttonProviderInstance4 = new _ButtonProvider();
    }
    return buttonProviderInstance4;
  }
  clicked() {
    ElementsPanel.instance().showToolbarPane(!this.view.isShowing() ? this.view : null, this.button);
  }
  item() {
    return this.button;
  }
};

// gen/front_end/panels/elements/ElementsTreeOutlineRenderer.js
var ElementsTreeOutlineRenderer_exports = {};
__export(ElementsTreeOutlineRenderer_exports, {
  Renderer: () => Renderer2
});
import * as SDK26 from "./../../core/sdk/sdk.js";
import * as UI29 from "./../../ui/legacy/legacy.js";
var rendererInstance;
var Renderer2 = class _Renderer {
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!rendererInstance || forceNew) {
      rendererInstance = new _Renderer();
    }
    return rendererInstance;
  }
  async render(object, options) {
    let node = null;
    if (object instanceof SDK26.DOMModel.DOMNode) {
      node = object;
    } else if (object instanceof SDK26.DOMModel.DeferredDOMNode) {
      node = await object.resolvePromise();
    }
    if (!node) {
      return null;
    }
    const treeOutline = new ElementsTreeOutline(
      /* omitRootDOMNode: */
      false,
      /* selectEnabled: */
      true,
      /* hideGutter: */
      true
    );
    treeOutline.rootDOMNode = node;
    treeOutline.deindentSingleNode();
    treeOutline.setVisible(true);
    treeOutline.element.treeElementForTest = treeOutline.firstChild();
    treeOutline.setShowSelectionOnKeyboardFocus(
      /* show: */
      true,
      /* preventTabOrder: */
      true
    );
    if (options?.expand) {
      treeOutline.firstChild()?.expand();
    }
    const dispatchDimensionChange = () => {
      treeOutline.element.dispatchEvent(new CustomEvent("dimensionschanged"));
    };
    treeOutline.addEventListener(UI29.TreeOutline.Events.ElementAttached, dispatchDimensionChange);
    treeOutline.addEventListener(UI29.TreeOutline.Events.ElementExpanded, dispatchDimensionChange);
    treeOutline.addEventListener(UI29.TreeOutline.Events.ElementCollapsed, dispatchDimensionChange);
    return {
      element: treeOutline.element,
      forceSelect: treeOutline.forceSelect.bind(treeOutline)
    };
  }
};
export {
  AccessibilityTreeUtils_exports as AccessibilityTreeUtils,
  AccessibilityTreeView_exports as AccessibilityTreeView,
  CSSRuleValidator_exports as CSSRuleValidator,
  CSSValueTraceView_exports as CSSValueTraceView,
  ClassesPaneWidget_exports as ClassesPaneWidget,
  ColorSwatchPopoverIcon_exports as ColorSwatchPopoverIcon,
  ComputedStyleModel_exports as ComputedStyleModel,
  ComputedStyleWidget_exports as ComputedStyleWidget,
  DOMPath_exports as DOMPath,
  ElementStatePaneWidget_exports as ElementStatePaneWidget,
  ElementsPanel_exports as ElementsPanel,
  ElementsSidebarPane_exports as ElementsSidebarPane,
  ElementsTreeElement_exports as ElementsTreeElement,
  ElementsTreeOutline_exports as ElementsTreeOutline,
  ElementsTreeOutlineRenderer_exports as ElementsTreeOutlineRenderer,
  EventListenersWidget_exports as EventListenersWidget,
  InspectElementModeController_exports as InspectElementModeController,
  LayersWidget_exports as LayersWidget,
  LayoutPane_exports as LayoutPane,
  MarkerDecorator_exports as MarkerDecorator,
  MetricsSidebarPane_exports as MetricsSidebarPane,
  NodeStackTraceWidget_exports as NodeStackTraceWidget,
  PlatformFontsWidget_exports as PlatformFontsWidget,
  PropertiesWidget_exports as PropertiesWidget,
  PropertyRenderer_exports as PropertyRenderer,
  StyleEditorWidget_exports as StyleEditorWidget,
  StylePropertiesSection_exports as StylePropertiesSection,
  StylePropertyHighlighter_exports as StylePropertyHighlighter,
  StylePropertyTreeElement_exports as StylePropertyTreeElement,
  StylePropertyUtils_exports as StylePropertyUtils,
  StylesSidebarPane_exports as StylesSidebarPane,
  TopLayerContainer_exports as TopLayerContainer,
  WebCustomData_exports as WebCustomData
};
//# sourceMappingURL=elements.js.map
