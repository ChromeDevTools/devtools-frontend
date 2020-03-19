// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {AccessibilityModel, AccessibilityNode} from './AccessibilityModel.js';  // eslint-disable-line no-unused-vars
import {AXNodeSubPane} from './AccessibilityNodeView.js';
import {ARIAAttributesPane} from './ARIAAttributesView.js';
import {AXBreadcrumbsPane} from './AXBreadcrumbsPane.js';

/**
 * @unrestricted
 */
export class AccessibilitySidebarView extends UI.ThrottledWidget.ThrottledWidget {
  constructor() {
    super();
    this._node = null;
    this._axNode = null;
    this._skipNextPullNode = false;
    this._sidebarPaneStack = UI.ViewManager.ViewManager.instance().createStackLocation();
    this._breadcrumbsSubPane = new AXBreadcrumbsPane(this);
    this._sidebarPaneStack.showView(this._breadcrumbsSubPane);
    this._ariaSubPane = new ARIAAttributesPane();
    this._sidebarPaneStack.showView(this._ariaSubPane);
    this._axNodeSubPane = new AXNodeSubPane();
    this._sidebarPaneStack.showView(this._axNodeSubPane);
    this._sidebarPaneStack.widget().show(this.element);
    self.UI.context.addFlavorChangeListener(SDK.DOMModel.DOMNode, this._pullNode, this);
    this._pullNode();
  }

  /**
   * @return {?SDK.DOMModel.DOMNode}
   */
  node() {
    return this._node;
  }

  /**
   * @return {?AccessibilityNode}
   */
  axNode() {
    return this._axNode;
  }

  /**
   * @param {?SDK.DOMModel.DOMNode} node
   * @param {boolean=} fromAXTree
   */
  setNode(node, fromAXTree) {
    this._skipNextPullNode = !!fromAXTree;
    this._node = node;
    this.update();
  }

  /**
   * @param {?AccessibilityNode} axNode
   */
  accessibilityNodeCallback(axNode) {
    if (!axNode) {
      return;
    }

    this._axNode = axNode;

    if (axNode.isDOMNode()) {
      this._sidebarPaneStack.showView(this._ariaSubPane, this._axNodeSubPane);
    } else {
      this._sidebarPaneStack.removeView(this._ariaSubPane);
    }

    if (this._axNodeSubPane) {
      this._axNodeSubPane.setAXNode(axNode);
    }
    if (this._breadcrumbsSubPane) {
      this._breadcrumbsSubPane.setAXNode(axNode);
    }
  }

  /**
   * @override
   * @protected
   * @return {!Promise.<?>}
   */
  doUpdate() {
    const node = this.node();
    this._axNodeSubPane.setNode(node);
    this._ariaSubPane.setNode(node);
    this._breadcrumbsSubPane.setNode(node);
    if (!node) {
      return Promise.resolve();
    }
    const accessibilityModel = node.domModel().target().model(AccessibilityModel);
    accessibilityModel.clear();
    return accessibilityModel.requestPartialAXTree(node).then(() => {
      this.accessibilityNodeCallback(accessibilityModel.axNodeForDOMNode(node));
    });
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();

    // Pull down the latest date for this node.
    this.doUpdate();

    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrModified, this._onAttrChange, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrRemoved, this._onAttrChange, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.CharacterDataModified, this._onNodeChange, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.ChildNodeCountUpdated, this._onNodeChange, this);
  }

  /**
   * @override
   */
  willHide() {
    SDK.SDKModel.TargetManager.instance().removeModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrModified, this._onAttrChange, this);
    SDK.SDKModel.TargetManager.instance().removeModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrRemoved, this._onAttrChange, this);
    SDK.SDKModel.TargetManager.instance().removeModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.CharacterDataModified, this._onNodeChange, this);
    SDK.SDKModel.TargetManager.instance().removeModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.ChildNodeCountUpdated, this._onNodeChange, this);
  }

  _pullNode() {
    if (this._skipNextPullNode) {
      this._skipNextPullNode = false;
      return;
    }
    this.setNode(self.UI.context.flavor(SDK.DOMModel.DOMNode));
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onAttrChange(event) {
    if (!this.node()) {
      return;
    }
    const node = event.data.node;
    if (this.node() !== node) {
      return;
    }
    this.update();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onNodeChange(event) {
    if (!this.node()) {
      return;
    }
    const node = event.data;
    if (this.node() !== node) {
      return;
    }
    this.update();
  }
}
