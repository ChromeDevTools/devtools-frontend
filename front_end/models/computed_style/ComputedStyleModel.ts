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
export class ComputedStyleModel extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #node: SDK.DOMModel.DOMNode|null;
  #cssModel: SDK.CSSModel.CSSModel|null;
  private eventListeners: Common.EventTarget.EventDescriptor[];
  private frameResizedTimer?: number;
  private computedStylePromise?: Promise<ComputedStyle|null>;

  constructor(node?: SDK.DOMModel.DOMNode|null) {
    super();
    this.#cssModel = null;
    this.eventListeners = [];
    this.#node = node ?? null;
  }

  get node(): SDK.DOMModel.DOMNode|null {
    return this.#node;
  }

  set node(node: SDK.DOMModel.DOMNode|null) {
    this.#node = node;
    this.updateModel(this.#node ? this.#node.domModel().cssModel() : null);
    this.onCSSModelChanged(null);
  }

  cssModel(): SDK.CSSModel.CSSModel|null {
    return this.#cssModel?.isEnabled() ? this.#cssModel : null;
  }

  private updateModel(cssModel: SDK.CSSModel.CSSModel|null): void {
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

  private onCSSModelChanged(event: Common.EventTarget.EventTargetEvent<CSSModelChangedEvent>|null): void {
    delete this.computedStylePromise;
    this.dispatchEventToListeners(Events.CSS_MODEL_CHANGED, event?.data ?? null);
  }

  private onComputedStyleChanged(
      event: Common.EventTarget.EventTargetEvent<SDK.CSSModel.ComputedStyleUpdatedEvent>|null): void {
    delete this.computedStylePromise;
    // If the event contains `nodeId` and that's not the same as this node's id
    // we don't emit the COMPUTED_STYLE_CHANGED event.
    if (event?.data && 'nodeId' in event.data && event.data.nodeId !== this.#node?.id) {
      return;
    }

    this.dispatchEventToListeners(Events.COMPUTED_STYLE_CHANGED);
  }

  private onDOMModelChanged(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode>): void {
    // Any attribute removal or modification can affect the styles of "related" nodes.
    const node = event.data;
    if (!this.#node ||
        this.#node !== node && node.parentNode !== this.#node.parentNode && !node.isAncestor(this.#node)) {
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
    const node = this.node;
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
                                   SDK.CSSModel.PseudoStateForcedEvent|SDK.DOMModel.DOMNode|null|void;

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
