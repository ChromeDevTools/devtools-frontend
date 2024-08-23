// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ElementsTreeElement} from './ElementsTreeElement.js';
import {ElementsTreeOutline} from './ElementsTreeOutline.js';

export class ElementsTreeElementHighlighter {
  private readonly throttler: Common.Throttler.Throttler;
  private treeOutline: ElementsTreeOutline;
  private currentHighlightedElement: ElementsTreeElement|null;
  private alreadyExpandedParentElement: UI.TreeOutline.TreeElement|ElementsTreeElement|null|undefined;
  private pendingHighlightNode: SDK.DOMModel.DOMNode|null;
  private isModifyingTreeOutline: boolean;
  constructor(treeOutline: ElementsTreeOutline, throttler: Common.Throttler.Throttler) {
    this.throttler = throttler;
    this.treeOutline = treeOutline;
    this.treeOutline.addEventListener(UI.TreeOutline.Events.ElementExpanded, this.clearState, this);
    this.treeOutline.addEventListener(UI.TreeOutline.Events.ElementCollapsed, this.clearState, this);
    this.treeOutline.addEventListener(ElementsTreeOutline.Events.SelectedNodeChanged, this.clearState, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.OverlayModel.OverlayModel, SDK.OverlayModel.Events.HIGHLIGHT_NODE_REQUESTED, this.highlightNode, this,
        {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.OverlayModel.OverlayModel, SDK.OverlayModel.Events.INSPECT_MODE_WILL_BE_TOGGLED, this.clearState, this,
        {scoped: true});

    this.currentHighlightedElement = null;
    this.alreadyExpandedParentElement = null;
    this.pendingHighlightNode = null;
    this.isModifyingTreeOutline = false;
  }

  private highlightNode(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode>): void {
    if (!Common.Settings.Settings.instance().moduleSetting('highlight-node-on-hover-in-overlay').get()) {
      return;
    }

    const domNode = event.data;

    void this.throttler.schedule(async () => {
      this.highlightNodeInternal(this.pendingHighlightNode);
      this.pendingHighlightNode = null;
    });
    this.pendingHighlightNode =
        this.treeOutline === ElementsTreeOutline.forDOMModel(domNode.domModel()) ? domNode : null;
  }

  private highlightNodeInternal(node: SDK.DOMModel.DOMNode|null): void {
    this.isModifyingTreeOutline = true;
    let treeElement: (ElementsTreeElement|null)|null = null;

    if (this.currentHighlightedElement) {
      let currentTreeElement: ((UI.TreeOutline.TreeElement & ElementsTreeElement)|null)|ElementsTreeElement =
          this.currentHighlightedElement;
      while (currentTreeElement && currentTreeElement !== this.alreadyExpandedParentElement) {
        if (currentTreeElement.expanded) {
          currentTreeElement.collapse();
        }

        const parent: UI.TreeOutline.TreeElement|null = currentTreeElement.parent;
        currentTreeElement = parent instanceof ElementsTreeElement ? parent : null;
      }
    }

    this.currentHighlightedElement = null;
    this.alreadyExpandedParentElement = null;
    if (node) {
      let deepestExpandedParent: (SDK.DOMModel.DOMNode|null) = (node as SDK.DOMModel.DOMNode | null);
      const treeElementByNode = this.treeOutline.treeElementByNode;

      const treeIsNotExpanded = (deepestExpandedParent: SDK.DOMModel.DOMNode): boolean => {
        const element = treeElementByNode.get(deepestExpandedParent);
        return element ? !element.expanded : true;
      };
      while (deepestExpandedParent && treeIsNotExpanded(deepestExpandedParent)) {
        deepestExpandedParent = deepestExpandedParent.parentNode;
      }

      this.alreadyExpandedParentElement =
          deepestExpandedParent ? treeElementByNode.get(deepestExpandedParent) : this.treeOutline.rootElement();
      treeElement = this.treeOutline.createTreeElementFor(node);
    }

    this.currentHighlightedElement = treeElement;
    this.treeOutline.setHoverEffect(treeElement);
    if (treeElement) {
      treeElement.reveal(true);
    }

    this.isModifyingTreeOutline = false;
  }

  private clearState(): void {
    if (this.isModifyingTreeOutline) {
      return;
    }

    this.currentHighlightedElement = null;
    this.alreadyExpandedParentElement = null;
    this.pendingHighlightNode = null;
  }
}
