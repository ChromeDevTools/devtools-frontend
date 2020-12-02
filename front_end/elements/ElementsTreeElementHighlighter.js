// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {ElementsTreeElement} from './ElementsTreeElement.js';
import {ElementsTreeOutline} from './ElementsTreeOutline.js';

export class ElementsTreeElementHighlighter {
  /**
   * @param {!ElementsTreeOutline} treeOutline
   */
  constructor(treeOutline) {
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

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _highlightNode(event) {
    if (!Common.Settings.Settings.instance().moduleSetting('highlightNodeOnHoverInOverlay').get()) {
      return;
    }

    const domNode = /** @type {!SDK.DOMModel.DOMNode} */ (event.data);

    this._throttler.schedule(async () => {
      this._highlightNodeInternal(this._pendingHighlightNode);
      this._pendingHighlightNode = null;
    });
    this._pendingHighlightNode =
        this._treeOutline === ElementsTreeOutline.forDOMModel(domNode.domModel()) ? domNode : null;
  }

  /**
   * @param {?SDK.DOMModel.DOMNode} node
   */
  _highlightNodeInternal(node) {
    this._isModifyingTreeOutline = true;
    let treeElement = null;

    if (this._currentHighlightedElement) {
      /** @type {?ElementsTreeElement} */
      let currentTreeElement = this._currentHighlightedElement;
      while (currentTreeElement && currentTreeElement !== this._alreadyExpandedParentElement) {
        if (currentTreeElement.expanded) {
          currentTreeElement.collapse();
        }

        /** @type {?UI.TreeOutline.TreeElement} */
        const parent = currentTreeElement.parent;
        currentTreeElement = parent instanceof ElementsTreeElement ? parent : null;
      }
    }

    this._currentHighlightedElement = null;
    this._alreadyExpandedParentElement = null;
    if (node) {
      let deepestExpandedParent = /** @type {?SDK.DOMModel.DOMNode} */ (node);
      const treeElementByNode = this._treeOutline.treeElementByNode;

      /**
       * @param {!SDK.DOMModel.DOMNode} deepestExpandedParent
       */
      const treeIsNotExpanded = deepestExpandedParent => {
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

  _clearState() {
    if (this._isModifyingTreeOutline) {
      return;
    }

    this._currentHighlightedElement = null;
    this._alreadyExpandedParentElement = null;
    this._pendingHighlightNode = null;
  }
}
