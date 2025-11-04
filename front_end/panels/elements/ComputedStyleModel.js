// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ComputedStyleWidget } from './ComputedStyleWidget.js';
import { StylesSidebarPane } from './StylesSidebarPane.js';
export class ComputedStyleModel extends Common.ObjectWrapper.ObjectWrapper {
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
        this.#node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
        UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.onNodeChanged, this);
        UI.Context.Context.instance().addFlavorChangeListener(StylesSidebarPane, this.evaluateTrackingComputedStyleUpdatesForNode, this);
        UI.Context.Context.instance().addFlavorChangeListener(ComputedStyleWidget, this.evaluateTrackingComputedStyleUpdatesForNode, this);
    }
    dispose() {
        UI.Context.Context.instance().removeFlavorChangeListener(SDK.DOMModel.DOMNode, this.onNodeChanged, this);
        UI.Context.Context.instance().removeFlavorChangeListener(StylesSidebarPane, this.evaluateTrackingComputedStyleUpdatesForNode, this);
        UI.Context.Context.instance().removeFlavorChangeListener(ComputedStyleWidget, this.evaluateTrackingComputedStyleUpdatesForNode, this);
    }
    node() {
        return this.#node;
    }
    cssModel() {
        return this.#cssModel?.isEnabled() ? this.#cssModel : null;
    }
    // This is a debounced method because the user might be navigated from Styles tab to Computed Style tab and vice versa.
    // For that case, we want to only run this function once.
    evaluateTrackingComputedStyleUpdatesForNode = Common.Debouncer.debounce(() => {
        if (!this.#node) {
            // There isn't a node selected now, so let's stop tracking computed style updates for the previously tracked node.
            if (this.currentTrackedNodeId) {
                void this.cssModel()?.trackComputedStyleUpdatesForNode(undefined);
                this.currentTrackedNodeId = undefined;
            }
            return;
        }
        const isComputedStyleWidgetVisible = Boolean(UI.Context.Context.instance().flavor(ComputedStyleWidget));
        const isStylesTabVisible = Boolean(UI.Context.Context.instance().flavor(StylesSidebarPane));
        const shouldTrackComputedStyleUpdates = isComputedStyleWidgetVisible ||
            (isStylesTabVisible && Root.Runtime.hostConfig.devToolsAnimationStylesInStylesTab?.enabled);
        // There is a selected node but not the computed style widget nor the styles tab is visible.
        // If there is a previously tracked node let's stop tracking computed style updates for that node.
        if (!shouldTrackComputedStyleUpdates) {
            if (this.currentTrackedNodeId) {
                void this.cssModel()?.trackComputedStyleUpdatesForNode(undefined);
                this.currentTrackedNodeId = undefined;
            }
            return;
        }
        // Either computed style widget or styles tab is visible
        // if the currently tracked node id is not the same as the selected node
        // let's start tracking the currently selected node.
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