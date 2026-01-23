// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
/**
 * A thin wrapper around the CSS Model to gather up changes in CSS files that
 * could impact a node's computed styles.
 * Callers are expected to initiate tracking of the Node themselves via the CSS
 * Model trackComputedStyleUpdatesForNode method.
 */
export class ComputedStyleModel extends Common.ObjectWrapper.ObjectWrapper {
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
                resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameResized, this.onFrameResized, this),
            ];
        }
    }
    onCSSModelChanged(event) {
        delete this.computedStylePromise;
        this.dispatchEventToListeners("CSSModelChanged" /* Events.CSS_MODEL_CHANGED */, event?.data ?? null);
    }
    onComputedStyleChanged(event) {
        delete this.computedStylePromise;
        // If the event contains `nodeId` and that's not the same as this node's id
        // we don't emit the COMPUTED_STYLE_CHANGED event.
        if (event?.data && 'nodeId' in event.data && event.data.nodeId !== this.#node?.id) {
            return;
        }
        this.dispatchEventToListeners("ComputedStyleChanged" /* Events.COMPUTED_STYLE_CHANGED */);
    }
    onDOMModelChanged(event) {
        // Any attribute removal or modification can affect the styles of "related" nodes.
        const node = event.data;
        if (!this.#node ||
            this.#node !== node && node.parentNode !== this.#node.parentNode && !node.isAncestor(this.#node)) {
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
        function verifyOutdated(elementNode, style) {
            return elementNode === this.elementNode() && style ? new ComputedStyle(elementNode, style) :
                null;
        }
    }
}
export class ComputedStyle {
    node;
    computedStyle;
    constructor(node, computedStyle) {
        this.node = node;
        this.computedStyle = computedStyle;
    }
}
//# sourceMappingURL=ComputedStyleModel.js.map