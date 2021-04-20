// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import {AXNodeSubPane} from './AccessibilityNodeView.js';
import {ARIAAttributesPane} from './ARIAAttributesView.js';
import {AXBreadcrumbsPane} from './AXBreadcrumbsPane.js';
import {SourceOrderPane} from './SourceOrderView.js';

let accessibilitySidebarViewInstance: AccessibilitySidebarView;

export class AccessibilitySidebarView extends UI.ThrottledWidget.ThrottledWidget {
  _sourceOrderViewerExperimentEnabled: boolean;
  _node: SDK.DOMModel.DOMNode|null;
  _axNode: SDK.AccessibilityModel.AccessibilityNode|null;
  _skipNextPullNode: boolean;
  _sidebarPaneStack: UI.View.ViewLocation;
  _breadcrumbsSubPane: AXBreadcrumbsPane|null = null;
  _ariaSubPane: ARIAAttributesPane;
  _axNodeSubPane: AXNodeSubPane;
  _sourceOrderSubPane: SourceOrderPane|undefined;
  private constructor() {
    super();
    this._sourceOrderViewerExperimentEnabled = Root.Runtime.experiments.isEnabled('sourceOrderViewer');
    this._node = null;
    this._axNode = null;
    this._skipNextPullNode = false;
    this._sidebarPaneStack = UI.ViewManager.ViewManager.instance().createStackLocation();
    if (!Root.Runtime.experiments.isEnabled('fullAccessibilityTree')) {
      this._breadcrumbsSubPane = new AXBreadcrumbsPane(this);
      this._sidebarPaneStack.showView(this._breadcrumbsSubPane);
    }
    this._ariaSubPane = new ARIAAttributesPane();
    this._sidebarPaneStack.showView(this._ariaSubPane);
    this._axNodeSubPane = new AXNodeSubPane();
    this._sidebarPaneStack.showView(this._axNodeSubPane);
    if (this._sourceOrderViewerExperimentEnabled) {
      this._sourceOrderSubPane = new SourceOrderPane();
      this._sidebarPaneStack.showView(this._sourceOrderSubPane);
    }
    this._sidebarPaneStack.widget().show(this.element);
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this._pullNode, this);
    this._pullNode();
  }

  static instance(): AccessibilitySidebarView {
    if (!accessibilitySidebarViewInstance) {
      accessibilitySidebarViewInstance = new AccessibilitySidebarView();
    }
    return accessibilitySidebarViewInstance;
  }

  node(): SDK.DOMModel.DOMNode|null {
    return this._node;
  }

  axNode(): SDK.AccessibilityModel.AccessibilityNode|null {
    return this._axNode;
  }

  setNode(node: SDK.DOMModel.DOMNode|null, fromAXTree?: boolean): void {
    this._skipNextPullNode = Boolean(fromAXTree);
    this._node = node;
    this.update();
  }

  accessibilityNodeCallback(axNode: SDK.AccessibilityModel.AccessibilityNode|null): void {
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

  async doUpdate(): Promise<void> {
    const node = this.node();
    this._axNodeSubPane.setNode(node);
    this._ariaSubPane.setNode(node);
    if (this._breadcrumbsSubPane) {
      this._breadcrumbsSubPane.setNode(node);
    }
    if (this._sourceOrderViewerExperimentEnabled && this._sourceOrderSubPane) {
      this._sourceOrderSubPane.setNodeAsync(node);
    }
    if (!node) {
      return;
    }
    const accessibilityModel = node.domModel().target().model(SDK.AccessibilityModel.AccessibilityModel);
    if (!accessibilityModel) {
      return;
    }
    accessibilityModel.clear();
    await accessibilityModel.requestPartialAXTree(node);
    this.accessibilityNodeCallback(accessibilityModel.axNodeForDOMNode(node));
  }

  wasShown(): void {
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

  willHide(): void {
    SDK.SDKModel.TargetManager.instance().removeModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrModified, this._onAttrChange, this);
    SDK.SDKModel.TargetManager.instance().removeModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrRemoved, this._onAttrChange, this);
    SDK.SDKModel.TargetManager.instance().removeModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.CharacterDataModified, this._onNodeChange, this);
    SDK.SDKModel.TargetManager.instance().removeModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.ChildNodeCountUpdated, this._onNodeChange, this);
  }

  _pullNode(): void {
    if (this._skipNextPullNode) {
      this._skipNextPullNode = false;
      return;
    }
    this.setNode(UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode));
  }

  _onAttrChange(event: Common.EventTarget.EventTargetEvent): void {
    if (!this.node()) {
      return;
    }
    const node = event.data.node;
    if (this.node() !== node) {
      return;
    }
    this.update();
  }

  _onNodeChange(event: Common.EventTarget.EventTargetEvent): void {
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
