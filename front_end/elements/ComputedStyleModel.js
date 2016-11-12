// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Elements.ComputedStyleModel = class extends Common.Object {
  constructor() {
    super();
    this._node = UI.context.flavor(SDK.DOMNode);
    UI.context.addFlavorChangeListener(SDK.DOMNode, this._onNodeChanged, this);
  }

  /**
   * @return {?SDK.DOMNode}
   */
  node() {
    return this._node;
  }

  /**
   * @return {?SDK.CSSModel}
   */
  cssModel() {
    return this._cssModel && this._cssModel.isEnabled() ? this._cssModel : null;
  }

  /**
   * @param {!Common.Event} event
   */
  _onNodeChanged(event) {
    this._node = /** @type {?SDK.DOMNode} */ (event.data);
    this._updateTarget(this._node ? this._node.target() : null);
    this._onComputedStyleChanged(null);
  }

  /**
   * @param {?SDK.Target} target
   */
  _updateTarget(target) {
    if (this._target === target)
      return;
    if (this._targetEvents)
      Common.EventTarget.removeEventListeners(this._targetEvents);
    this._target = target;

    var domModel = null;
    var resourceTreeModel = null;
    if (target) {
      this._cssModel = SDK.CSSModel.fromTarget(target);
      domModel = SDK.DOMModel.fromTarget(target);
      resourceTreeModel = SDK.ResourceTreeModel.fromTarget(target);
    }

    if (this._cssModel && domModel && resourceTreeModel) {
      this._targetEvents = [
        this._cssModel.addEventListener(
            SDK.CSSModel.Events.StyleSheetAdded, this._onComputedStyleChanged, this),
        this._cssModel.addEventListener(
            SDK.CSSModel.Events.StyleSheetRemoved, this._onComputedStyleChanged, this),
        this._cssModel.addEventListener(
            SDK.CSSModel.Events.StyleSheetChanged, this._onComputedStyleChanged, this),
        this._cssModel.addEventListener(SDK.CSSModel.Events.FontsUpdated, this._onComputedStyleChanged, this),
        this._cssModel.addEventListener(
            SDK.CSSModel.Events.MediaQueryResultChanged, this._onComputedStyleChanged, this),
        this._cssModel.addEventListener(
            SDK.CSSModel.Events.PseudoStateForced, this._onComputedStyleChanged, this),
        this._cssModel.addEventListener(
            SDK.CSSModel.Events.ModelWasEnabled, this._onComputedStyleChanged, this),
        domModel.addEventListener(SDK.DOMModel.Events.DOMMutated, this._onDOMModelChanged, this),
        resourceTreeModel.addEventListener(
            SDK.ResourceTreeModel.Events.FrameResized, this._onFrameResized, this),
      ];
    }
  }

  /**
   * @param {?Common.Event} event
   */
  _onComputedStyleChanged(event) {
    delete this._computedStylePromise;
    this.dispatchEventToListeners(
        Elements.ComputedStyleModel.Events.ComputedStyleChanged, event ? event.data : null);
  }

  /**
   * @param {!Common.Event} event
   */
  _onDOMModelChanged(event) {
    // Any attribute removal or modification can affect the styles of "related" nodes.
    var node = /** @type {!SDK.DOMNode} */ (event.data);
    if (!this._node || this._node !== node && node.parentNode !== this._node.parentNode && !node.isAncestor(this._node))
      return;
    this._onComputedStyleChanged(null);
  }

  /**
   * @param {!Common.Event} event
   */
  _onFrameResized(event) {
    /**
     * @this {Elements.ComputedStyleModel}
     */
    function refreshContents() {
      this._onComputedStyleChanged(null);
      delete this._frameResizedTimer;
    }

    if (this._frameResizedTimer)
      clearTimeout(this._frameResizedTimer);

    this._frameResizedTimer = setTimeout(refreshContents.bind(this), 100);
  }

  /**
   * @return {?SDK.DOMNode}
   */
  _elementNode() {
    return this.node() ? this.node().enclosingElementOrSelf() : null;
  }

  /**
   * @return {!Promise.<?Elements.ComputedStyleModel.ComputedStyle>}
   */
  fetchComputedStyle() {
    var elementNode = this._elementNode();
    var cssModel = this.cssModel();
    if (!elementNode || !cssModel)
      return Promise.resolve(/** @type {?Elements.ComputedStyleModel.ComputedStyle} */ (null));

    if (!this._computedStylePromise)
      this._computedStylePromise =
          cssModel.computedStylePromise(elementNode.id).then(verifyOutdated.bind(this, elementNode));

    return this._computedStylePromise;

    /**
     * @param {!SDK.DOMNode} elementNode
     * @param {?Map.<string, string>} style
     * @return {?Elements.ComputedStyleModel.ComputedStyle}
     * @this {Elements.ComputedStyleModel}
     */
    function verifyOutdated(elementNode, style) {
      return elementNode === this._elementNode() && style ?
          new Elements.ComputedStyleModel.ComputedStyle(elementNode, style) :
          /** @type {?Elements.ComputedStyleModel.ComputedStyle} */ (null);
    }
  }
};

/** @enum {symbol} */
Elements.ComputedStyleModel.Events = {
  ComputedStyleChanged: Symbol('ComputedStyleChanged')
};

/**
 * @unrestricted
 */
Elements.ComputedStyleModel.ComputedStyle = class {
  /**
   * @param {!SDK.DOMNode} node
   * @param {!Map.<string, string>} computedStyle
   */
  constructor(node, computedStyle) {
    this.node = node;
    this.computedStyle = computedStyle;
  }
};
