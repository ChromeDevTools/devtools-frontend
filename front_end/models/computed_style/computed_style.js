var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/computed_style/ComputedStyleModel.ts
var ComputedStyleModel_exports = {};
__export(ComputedStyleModel_exports, {
  ComputedStyle: () => ComputedStyle,
  ComputedStyleModel: () => ComputedStyleModel,
  Events: () => Events,
  computeNonInheritedProperties: () => computeNonInheritedProperties,
  filterComputedStyleProperties: () => filterComputedStyleProperties,
  propertySorter: () => propertySorter
});
import * as Common from "../../core/common/common.js";
import * as Platform from "../../core/platform/platform.js";
import * as SDK from "../../core/sdk/sdk.js";
var ComputedStyleModel = class extends Common.ObjectWrapper.ObjectWrapper {
  #node = null;
  #cssModel = null;
  eventListeners = [];
  frameResizedTimer;
  computedStylePromise;
  constructor(node) {
    super();
    if (node) {
      this.node = node;
    }
  }
  get node() {
    return this.#node;
  }
  set node(node) {
    this.#node = node;
    this.updateModel(this.#node ? this.#node.domModel().cssModel() : null);
    this.onCSSModelChanged(null);
  }
  cssModel() {
    return this.#cssModel?.isEnabled() ? this.#cssModel : null;
  }
  /**
   * Clears all event listeners to ensure the instance can be GC'd without leaking memory.
   */
  dispose() {
    Common.EventTarget.removeEventListeners(this.eventListeners);
    this.eventListeners = [];
    this.node = null;
    this.#cssModel = null;
    this.computedStylePromise = void 0;
    clearTimeout(this.frameResizedTimer);
    this.frameResizedTimer = void 0;
  }
  updateModel(cssModel) {
    if (this.#cssModel === cssModel) {
      return;
    }
    Common.EventTarget.removeEventListeners(this.eventListeners);
    this.#cssModel = cssModel;
    const domModel = cssModel ? cssModel.domModel() : null;
    const resourceTreeModel = cssModel ? cssModel.target().model(SDK.ResourceTreeModel.ResourceTreeModel) : null;
    if (cssModel && domModel && resourceTreeModel) {
      this.eventListeners = [
        cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.FontsUpdated, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.MediaQueryResultChanged, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.PositionTryOptionForced, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.PseudoStateForced, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.StartingStylesStateForced, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.ModelWasEnabled, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.ComputedStyleUpdated, this.onComputedStyleChanged, this),
        domModel.addEventListener(SDK.DOMModel.Events.DOMMutated, this.onDOMModelChanged, this),
        resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameResized, this.onFrameResized, this)
      ];
    }
  }
  onCSSModelChanged(event) {
    delete this.computedStylePromise;
    this.dispatchEventToListeners("CSSModelChanged" /* CSS_MODEL_CHANGED */, event?.data ?? null);
  }
  onComputedStyleChanged(event) {
    delete this.computedStylePromise;
    if (event?.data && "nodeId" in event.data && event.data.nodeId !== this.#node?.id) {
      return;
    }
    this.dispatchEventToListeners("ComputedStyleChanged" /* COMPUTED_STYLE_CHANGED */);
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
      this.frameResizedTimer = void 0;
    }
    clearTimeout(this.frameResizedTimer);
    this.frameResizedTimer = globalThis.setTimeout(refreshContents.bind(this), 100);
  }
  elementNode() {
    const node = this.node;
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
      this.computedStylePromise = cssModel.getComputedStyle(nodeId).then((style) => {
        return this.#validateNodeStyles(elementNode, style);
      });
    }
    return await this.computedStylePromise;
  }
  /**
   * Once we fetch the node's CSS styles, we validate them to ensure that the
   * active Node didn't change between initiating the request to fetch the
   * styles and the request returning. If it did, we discard these styles as
   * outdated.
   */
  #validateNodeStyles(node, styles) {
    if (node === this.elementNode() && styles) {
      return new ComputedStyle(node, styles);
    }
    return null;
  }
  /**
   * Fetches the CSS cascade for the node, including matched rules, inherited
   * styles, and pseudo-elements.
   * This allows determining which properties are active or overridden.
   */
  async fetchMatchedCascade() {
    const node = this.node;
    if (!node || !this.cssModel()) {
      return null;
    }
    const cssModel = this.cssModel();
    if (!cssModel) {
      return null;
    }
    const matchedStyles = await cssModel.cachedMatchedCascadeForNode(node);
    if (!matchedStyles) {
      return null;
    }
    return matchedStyles.node() === this.node ? matchedStyles : null;
  }
  computePropertyTraces(matchedStyles) {
    const result = /* @__PURE__ */ new Map();
    for (const style of matchedStyles.nodeStyles()) {
      const allProperties = style.allProperties();
      for (const property of allProperties) {
        if (!property.activeInStyle() || !matchedStyles.propertyState(property)) {
          continue;
        }
        const matches = result.get(property.name) ?? [];
        matches.push(property);
        result.set(property.name, matches);
      }
    }
    return result;
  }
};
var Events = /* @__PURE__ */ ((Events2) => {
  Events2["CSS_MODEL_CHANGED"] = "CSSModelChanged";
  Events2["COMPUTED_STYLE_CHANGED"] = "ComputedStyleChanged";
  return Events2;
})(Events || {});
var ComputedStyle = class {
  node;
  computedStyle;
  constructor(node, computedStyle) {
    this.node = node;
    this.computedStyle = computedStyle;
  }
};
var alwaysShownComputedProperties = /* @__PURE__ */ new Set(["display", "height", "width"]);
function propertySorter(propA, propB) {
  if (propA.startsWith("--") !== propB.startsWith("--")) {
    return propA.startsWith("--") ? 1 : -1;
  }
  if (propA.startsWith("-webkit") !== propB.startsWith("-webkit")) {
    return propA.startsWith("-webkit") ? 1 : -1;
  }
  const canonicalA = SDK.CSSMetadata.cssMetadata().canonicalPropertyName(propA);
  const canonicalB = SDK.CSSMetadata.cssMetadata().canonicalPropertyName(propB);
  return Platform.StringUtilities.compare(canonicalA, canonicalB);
}
function computeNonInheritedProperties(matchedStyles) {
  const result = /* @__PURE__ */ new Set();
  for (const style of matchedStyles.nodeStyles()) {
    for (const property of style.allProperties()) {
      if (!matchedStyles.propertyState(property)) {
        continue;
      }
      result.add(SDK.CSSMetadata.cssMetadata().canonicalPropertyName(property.name));
    }
  }
  return result;
}
function filterComputedStyleProperties(computedStyle, matchedStyles, options) {
  const showAll = options?.showAll ?? false;
  const sort = options?.sort ?? true;
  const extraProperties = options?.extraProperties ? new Set(options.extraProperties) : null;
  const uniqueProperties = sort ? [...computedStyle.keys()].sort(propertySorter) : computedStyle.keys();
  const nonInheritedProperties = computeNonInheritedProperties(matchedStyles);
  const result = [];
  for (const propertyName of uniqueProperties) {
    const propertyValue = computedStyle.get(propertyName) || "";
    const canonicalName = SDK.CSSMetadata.cssMetadata().canonicalPropertyName(propertyName);
    const isInherited = !nonInheritedProperties.has(canonicalName);
    const isExtraProperty = extraProperties?.has(propertyName) ?? false;
    if (!showAll && isInherited && !alwaysShownComputedProperties.has(propertyName) && !isExtraProperty) {
      continue;
    }
    if (!showAll && propertyName.startsWith("--") && !isExtraProperty) {
      continue;
    }
    if (propertyName !== canonicalName && propertyValue === computedStyle.get(canonicalName) && !isExtraProperty) {
      continue;
    }
    result.push({
      name: propertyName,
      value: propertyValue,
      inherited: isInherited
    });
  }
  return result;
}
export {
  ComputedStyleModel_exports as ComputedStyleModel
};
//# sourceMappingURL=computed_style.js.map
