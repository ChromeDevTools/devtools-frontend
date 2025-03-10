// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ComputedStyleWidget} from './ComputedStyleWidget.js';
import {StylesSidebarPane} from './StylesSidebarPane.js';

export class ComputedStyleModel extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private nodeInternal: SDK.DOMModel.DOMNode|null;
  private cssModelInternal: SDK.CSSModel.CSSModel|null;
  private eventListeners: Common.EventTarget.EventDescriptor[];
  private frameResizedTimer?: number;
  private computedStylePromise?: Promise<ComputedStyle|null>;
  private currentTrackedNodeId?: number;

  constructor() {
    super();
    this.cssModelInternal = null;
    this.eventListeners = [];
    this.nodeInternal = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);

    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.onNodeChanged, this);
    UI.Context.Context.instance().addFlavorChangeListener(
        StylesSidebarPane, this.evaluateTrackingComputedStyleUpdatesForNode, this);
    UI.Context.Context.instance().addFlavorChangeListener(
        ComputedStyleWidget, this.evaluateTrackingComputedStyleUpdatesForNode, this);
  }

  dispose(): void {
    UI.Context.Context.instance().removeFlavorChangeListener(SDK.DOMModel.DOMNode, this.onNodeChanged, this);
    UI.Context.Context.instance().removeFlavorChangeListener(
        StylesSidebarPane, this.evaluateTrackingComputedStyleUpdatesForNode, this);
    UI.Context.Context.instance().removeFlavorChangeListener(
        ComputedStyleWidget, this.evaluateTrackingComputedStyleUpdatesForNode, this);
  }

  node(): SDK.DOMModel.DOMNode|null {
    return this.nodeInternal;
  }

  cssModel(): SDK.CSSModel.CSSModel|null {
    return this.cssModelInternal?.isEnabled() ? this.cssModelInternal : null;
  }

  // This is a debounced method because the user might be navigated from Styles tab to Computed Style tab and vice versa.
  // For that case, we want to only run this function once.
  private evaluateTrackingComputedStyleUpdatesForNode = Common.Debouncer.debounce((): void => {
    if (!this.nodeInternal) {
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
    if (this.currentTrackedNodeId !== this.nodeInternal.id) {
      void this.cssModel()?.trackComputedStyleUpdatesForNode(this.nodeInternal.id);
      this.currentTrackedNodeId = this.nodeInternal.id;
    }
  }, 100);

  private onNodeChanged(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode|null>): void {
    this.nodeInternal = event.data;
    this.updateModel(this.nodeInternal ? this.nodeInternal.domModel().cssModel() : null);
    this.onCSSModelChanged(null);
    this.evaluateTrackingComputedStyleUpdatesForNode();
  }

  private updateModel(cssModel: SDK.CSSModel.CSSModel|null): void {
    if (this.cssModelInternal === cssModel) {
      return;
    }
    Common.EventTarget.removeEventListeners(this.eventListeners);
    this.cssModelInternal = cssModel;
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
        cssModel.addEventListener(SDK.CSSModel.Events.ModelWasEnabled, this.onCSSModelChanged, this),
        cssModel.addEventListener(SDK.CSSModel.Events.ComputedStyleUpdated, this.onComputedStyleChanged, this),
        domModel.addEventListener(SDK.DOMModel.Events.DOMMutated, this.onDOMModelChanged, this),
        resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameResized, this.onFrameResized, this),
      ];
    }
  }

  private onCSSModelChanged(event: Common.EventTarget.EventTargetEvent<CSSModelChangedEvent>|null): void {
    delete this.computedStylePromise;
    this.dispatchEventToListeners(Events.CSS_MODEL_CHANGED, event?.data ?? null);
  }

  private onComputedStyleChanged(
      event: Common.EventTarget.EventTargetEvent<SDK.CSSModel.ComputedStyleUpdatedEvent>|null): void {
    delete this.computedStylePromise;
    // If the event contains `nodeId` and that's not the same as this node's id
    // we don't emit the COMPUTED_STYLE_CHANGED event.
    if (event?.data && 'nodeId' in event.data && event.data.nodeId !== this.nodeInternal?.id) {
      return;
    }

    this.dispatchEventToListeners(Events.COMPUTED_STYLE_CHANGED);
  }

  private onDOMModelChanged(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode>): void {
    // Any attribute removal or modification can affect the styles of "related" nodes.
    const node = event.data;
    if (!this.nodeInternal ||
        this.nodeInternal !== node && node.parentNode !== this.nodeInternal.parentNode &&
            !node.isAncestor(this.nodeInternal)) {
      return;
    }
    this.onCSSModelChanged(null);
  }

  private onFrameResized(): void {
    function refreshContents(this: ComputedStyleModel): void {
      this.onCSSModelChanged(null);
      delete this.frameResizedTimer;
    }

    if (this.frameResizedTimer) {
      clearTimeout(this.frameResizedTimer);
    }

    this.frameResizedTimer = window.setTimeout(refreshContents.bind(this), 100);
  }

  private elementNode(): SDK.DOMModel.DOMNode|null {
    const node = this.node();
    if (!node) {
      return null;
    }
    return node.enclosingElementOrSelf();
  }

  async fetchComputedStyle(): Promise<ComputedStyle|null> {
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

    function verifyOutdated(
        this: ComputedStyleModel, elementNode: SDK.DOMModel.DOMNode, style: Map<string, string>|null): ComputedStyle|
        null {
      return elementNode === this.elementNode() && style ? new ComputedStyle(elementNode, style) :
                                                           null as ComputedStyle | null;
    }
  }
}

export const enum Events {
  CSS_MODEL_CHANGED = 'CSSModelChanged',
  COMPUTED_STYLE_CHANGED = 'ComputedStyleChanged',
}

export type CSSModelChangedEvent = SDK.CSSStyleSheetHeader.CSSStyleSheetHeader|SDK.CSSModel.StyleSheetChangedEvent|
                                   SDK.CSSModel.PseudoStateForcedEvent|null|void;

export interface EventTypes {
  [Events.CSS_MODEL_CHANGED]: CSSModelChangedEvent;
  [Events.COMPUTED_STYLE_CHANGED]: void;
}

export class ComputedStyle {
  node: SDK.DOMModel.DOMNode;
  computedStyle: Map<string, string>;
  constructor(node: SDK.DOMModel.DOMNode, computedStyle: Map<string, string>) {
    this.node = node;
    this.computedStyle = computedStyle;
  }
}
