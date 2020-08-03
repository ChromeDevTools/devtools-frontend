// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';

/**
 * @unrestricted
 */
export class ComputedStyleModel extends Common.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();
    this._node = self.UI.context.flavor(SDK.DOMModel.DOMNode);
    this._cssModel = null;
    this._eventListeners = [];
    self.UI.context.addFlavorChangeListener(SDK.DOMModel.DOMNode, this._onNodeChanged, this);
  }

  /**
   * @return {?SDK.DOMModel.DOMNode}
   */
  node() {
    return this._node;
  }

  /**
   * @return {?SDK.CSSModel.CSSModel}
   */
  cssModel() {
    return this._cssModel && this._cssModel.isEnabled() ? this._cssModel : null;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onNodeChanged(event) {
    this._node = /** @type {?SDK.DOMModel.DOMNode} */ (event.data);
    this._updateModel(this._node ? this._node.domModel().cssModel() : null);
    this._onComputedStyleChanged(null);
  }

  /**
   * @param {?SDK.CSSModel.CSSModel} cssModel
   */
  _updateModel(cssModel) {
    if (this._cssModel === cssModel) {
      return;
    }
    Common.EventTarget.EventTarget.removeEventListeners(this._eventListeners);
    this._cssModel = cssModel;
    const domModel = cssModel ? cssModel.domModel() : null;
    const resourceTreeModel = cssModel ? cssModel.target().model(SDK.ResourceTreeModel.ResourceTreeModel) : null;
    if (cssModel && domModel && resourceTreeModel) {
      this._eventListeners = [
        cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this._onComputedStyleChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this._onComputedStyleChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged, this._onComputedStyleChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.FontsUpdated, this._onComputedStyleChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.MediaQueryResultChanged, this._onComputedStyleChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.PseudoStateForced, this._onComputedStyleChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.ModelWasEnabled, this._onComputedStyleChanged, this),
        domModel.addEventListener(SDK.DOMModel.Events.DOMMutated, this._onDOMModelChanged, this),
        resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameResized, this._onFrameResized, this),
      ];
    }
  }

  /**
   * @param {?Common.EventTarget.EventTargetEvent} event
   */
  _onComputedStyleChanged(event) {
    delete this._computedStylePromise;
    this.dispatchEventToListeners(Events.ComputedStyleChanged, event ? event.data : null);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onDOMModelChanged(event) {
    // Any attribute removal or modification can affect the styles of "related" nodes.
    const node = /** @type {!SDK.DOMModel.DOMNode} */ (event.data);
    if (!this._node ||
        this._node !== node && node.parentNode !== this._node.parentNode && !node.isAncestor(this._node)) {
      return;
    }
    this._onComputedStyleChanged(null);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onFrameResized(event) {
    /**
     * @this {ComputedStyleModel}
     */
    function refreshContents() {
      this._onComputedStyleChanged(null);
      delete this._frameResizedTimer;
    }

    if (this._frameResizedTimer) {
      clearTimeout(this._frameResizedTimer);
    }

    this._frameResizedTimer = setTimeout(refreshContents.bind(this), 100);
  }

  /**
   * @return {?SDK.DOMModel.DOMNode}
   */
  _elementNode() {
    return this.node() ? this.node().enclosingElementOrSelf() : null;
  }

  /**
   * @return {!Promise.<?ComputedStyle>}
   */
  fetchComputedStyle() {
    const elementNode = this._elementNode();
    const cssModel = this.cssModel();
    if (!elementNode || !cssModel) {
      return Promise.resolve(/** @type {?ComputedStyle} */ (null));
    }

    if (!this._computedStylePromise) {
      this._computedStylePromise =
          cssModel.computedStylePromise(elementNode.id).then(verifyOutdated.bind(this, elementNode));
    }

    return this._computedStylePromise;

    /**
     * @param {!SDK.DOMModel.DOMNode} elementNode
     * @param {?Map.<string, string>} style
     * @return {?ComputedStyle}
     * @this {ComputedStyleModel}
     */
    function verifyOutdated(elementNode, style) {
      return elementNode === this._elementNode() && style ? new ComputedStyle(elementNode, style) :
                                                            /** @type {?ComputedStyle} */ (null);
    }
  }
}

/** @enum {symbol} */
export const Events = {
  ComputedStyleChanged: Symbol('ComputedStyleChanged')
};

/**
 * @unrestricted
 */
export class ComputedStyle {
  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @param {!Map.<string, string>} computedStyle
   */
  constructor(node, computedStyle) {
    this.node = node;
    this.computedStyle = computedStyle;
  }
}
