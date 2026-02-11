var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/computed_style/ComputedStyleModel.js
var ComputedStyleModel_exports = {};
__export(ComputedStyleModel_exports, {
  ComputedStyle: () => ComputedStyle,
  ComputedStyleModel: () => ComputedStyleModel
});
import * as Common from "./../../core/common/common.js";
import * as SDK from "./../../core/sdk/sdk.js";
var ComputedStyleModel = class extends Common.ObjectWrapper.ObjectWrapper {
  #node;
  #cssModel;
  eventListeners;
  frameResizedTimer;
  computedStylePromise;
  constructor(node) {
    super();
    this.#cssModel = null;
    this.eventListeners = [];
    this.#node = node ?? null;
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
      this.computedStylePromise = cssModel.getComputedStyle(nodeId).then(verifyOutdated.bind(this, elementNode));
    }
    return await this.computedStylePromise;
    function verifyOutdated(elementNode2, style) {
      return elementNode2 === this.elementNode() && style ? new ComputedStyle(elementNode2, style) : null;
    }
  }
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
  async fetchAllComputedStyleInfo() {
    const [computedStyle, matchedStyles] = await Promise.all([this.fetchComputedStyle(), this.fetchMatchedCascade()]);
    return { computedStyle, matchedStyles };
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
export {
  ComputedStyleModel_exports as ComputedStyleModel
};
//# sourceMappingURL=computed_style.js.map
