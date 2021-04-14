// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ElementsTreeElement} from './ElementsTreeElement.js';
import {ElementsTreeOutline} from './ElementsTreeOutline.js';

export class ElementsTreeElementHighlighter {
  _throttler: Common.Throttler.Throttler;
  _treeOutline: ElementsTreeOutline;
  _currentHighlightedElement: ElementsTreeElement|null;
  _alreadyExpandedParentElement: UI.TreeOutline.TreeElement|ElementsTreeElement|null|undefined;
  _pendingHighlightNode: SDK.DOMModel.DOMNode|null;
  _isModifyingTreeOutline: boolean;
  constructor(treeOutline: ElementsTreeOutline) {
    this._throttler = new Common.Throttler.Throttler(100);
    this._treeOutline = treeOutline;
    this._treeOutline.addEventListener(UI.TreeOutline.Events.ElementExpanded, this._clearState, this);
    this._treeOutline.addEventListener(UI.TreeOutline.Events.ElementCollapsed, this._clearState, this);
    this._treeOutline.addEventListener(ElementsTreeOutline.Events.SelectedNodeChanged, this._clearState, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.OverlayModel.OverlayModel, SDK.OverlayModel.Events.HighlightNodeRequested, this._highlightNode, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.OverlayModel.OverlayModel, SDK.OverlayModel.Events.InspectModeWillBeToggled, this._clearState, this);

    this._currentHighlightedElement = null;
    this._alreadyExpandedParentElement = null;
    this._pendingHighlightNode = null;
    this._isModifyingTreeOutline = false;
  }

  _highlightNode(event: Common.EventTarget.EventTargetEvent): void {
    if (!Common.Settings.Settings.instance().moduleSetting('highlightNodeOnHoverInOverlay').get()) {
      return;
    }

    const domNode = (event.data as SDK.DOMModel.DOMNode);

    this._throttler.schedule(async () => {
      this._highlightNodeInternal(this._pendingHighlightNode);
      this._pendingHighlightNode = null;
    });
    this._pendingHighlightNode =
        this._treeOutline === ElementsTreeOutline.forDOMModel(domNode.domModel()) ? domNode : null;
  }

  _highlightNodeInternal(node: SDK.DOMModel.DOMNode|null): void {
    this._isModifyingTreeOutline = true;
    let treeElement: (ElementsTreeElement|null)|null = null;

    if (this._currentHighlightedElement) {
      let currentTreeElement: ((UI.TreeOutline.TreeElement & ElementsTreeElement)|null)|ElementsTreeElement =
          this._currentHighlightedElement;
      while (currentTreeElement && currentTreeElement !== this._alreadyExpandedParentElement) {
        if (currentTreeElement.expanded) {
          currentTreeElement.collapse();
        }

        const parent: UI.TreeOutline.TreeElement|null = currentTreeElement.parent;
        currentTreeElement = parent instanceof ElementsTreeElement ? parent : null;
      }
    }

    this._currentHighlightedElement = null;
    this._alreadyExpandedParentElement = null;
    if (node) {
      let deepestExpandedParent: (SDK.DOMModel.DOMNode|null) = (node as SDK.DOMModel.DOMNode | null);
      const treeElementByNode = this._treeOutline.treeElementByNode;

      const treeIsNotExpanded = (deepestExpandedParent: SDK.DOMModel.DOMNode): boolean => {
        const element = treeElementByNode.get(deepestExpandedParent);
        return element ? !element.expanded : true;
      };
      while (deepestExpandedParent && treeIsNotExpanded(deepestExpandedParent)) {
        deepestExpandedParent = deepestExpandedParent.parentNode;
      }

      this._alreadyExpandedParentElement =
          deepestExpandedParent ? treeElementByNode.get(deepestExpandedParent) : this._treeOutline.rootElement();
      treeElement = this._treeOutline.createTreeElementFor(node);
    }

    this._currentHighlightedElement = treeElement;
    this._treeOutline.setHoverEffect(treeElement);
    if (treeElement) {
      treeElement.reveal(true);
    }

    this._isModifyingTreeOutline = false;
  }

  _clearState(): void {
    if (this._isModifyingTreeOutline) {
      return;
    }

    this._currentHighlightedElement = null;
    this._alreadyExpandedParentElement = null;
    this._pendingHighlightNode = null;
  }
}
