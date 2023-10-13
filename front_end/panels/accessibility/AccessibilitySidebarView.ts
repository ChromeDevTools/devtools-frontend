// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {AXNodeSubPane} from './AccessibilityNodeView.js';
import {ARIAAttributesPane} from './ARIAAttributesView.js';
import {AXBreadcrumbsPane} from './AXBreadcrumbsPane.js';
import {SourceOrderPane} from './SourceOrderView.js';

let accessibilitySidebarViewInstance: AccessibilitySidebarView;

export class AccessibilitySidebarView extends UI.ThrottledWidget.ThrottledWidget {
  private readonly sourceOrderViewerExperimentEnabled: boolean;
  private nodeInternal: SDK.DOMModel.DOMNode|null;
  private axNodeInternal: SDK.AccessibilityModel.AccessibilityNode|null;
  private skipNextPullNode: boolean;
  private readonly sidebarPaneStack: UI.View.ViewLocation;
  private readonly breadcrumbsSubPane: AXBreadcrumbsPane|null = null;
  private readonly ariaSubPane: ARIAAttributesPane;
  private readonly axNodeSubPane: AXNodeSubPane;
  private readonly sourceOrderSubPane: SourceOrderPane|undefined;
  private constructor(throttlingTimeout?: number) {
    super(false /* isWebComponent */, throttlingTimeout);
    this.sourceOrderViewerExperimentEnabled = Root.Runtime.experiments.isEnabled('sourceOrderViewer');
    this.nodeInternal = null;
    this.axNodeInternal = null;
    this.skipNextPullNode = false;
    this.sidebarPaneStack = UI.ViewManager.ViewManager.instance().createStackLocation();
    this.breadcrumbsSubPane = new AXBreadcrumbsPane(this);
    void this.sidebarPaneStack.showView(this.breadcrumbsSubPane);
    this.ariaSubPane = new ARIAAttributesPane();
    void this.sidebarPaneStack.showView(this.ariaSubPane);
    this.axNodeSubPane = new AXNodeSubPane();
    void this.sidebarPaneStack.showView(this.axNodeSubPane);
    if (this.sourceOrderViewerExperimentEnabled) {
      this.sourceOrderSubPane = new SourceOrderPane();
      void this.sidebarPaneStack.showView(this.sourceOrderSubPane);
    }
    this.sidebarPaneStack.widget().show(this.element);
    this.element.setAttribute('jslog', `${VisualLogging.accessibilityPane()}`);
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.pullNode, this);
    this.pullNode();
  }

  static instance(opts?: {
    forceNew: boolean,
    throttlingTimeout: number,
  }): AccessibilitySidebarView {
    if (!accessibilitySidebarViewInstance || opts?.forceNew) {
      accessibilitySidebarViewInstance = new AccessibilitySidebarView(opts?.throttlingTimeout);
    }
    return accessibilitySidebarViewInstance;
  }

  node(): SDK.DOMModel.DOMNode|null {
    return this.nodeInternal;
  }

  axNode(): SDK.AccessibilityModel.AccessibilityNode|null {
    return this.axNodeInternal;
  }

  setNode(node: SDK.DOMModel.DOMNode|null, fromAXTree?: boolean): void {
    this.skipNextPullNode = Boolean(fromAXTree);
    this.nodeInternal = node;
    this.update();
  }

  accessibilityNodeCallback(axNode: SDK.AccessibilityModel.AccessibilityNode|null): void {
    if (!axNode) {
      return;
    }

    this.axNodeInternal = axNode;

    if (axNode.isDOMNode()) {
      void this.sidebarPaneStack.showView(this.ariaSubPane, this.axNodeSubPane);
    } else {
      this.sidebarPaneStack.removeView(this.ariaSubPane);
    }

    if (this.axNodeSubPane) {
      this.axNodeSubPane.setAXNode(axNode);
    }
    if (this.breadcrumbsSubPane) {
      this.breadcrumbsSubPane.setAXNode(axNode);
    }
  }

  override async doUpdate(): Promise<void> {
    const node = this.node();
    this.axNodeSubPane.setNode(node);
    this.ariaSubPane.setNode(node);
    if (this.breadcrumbsSubPane) {
      this.breadcrumbsSubPane.setNode(node);
    }
    if (this.sourceOrderViewerExperimentEnabled && this.sourceOrderSubPane) {
      void this.sourceOrderSubPane.setNodeAsync(node);
    }
    if (!node) {
      return;
    }
    const accessibilityModel = node.domModel().target().model(SDK.AccessibilityModel.AccessibilityModel);
    if (!accessibilityModel) {
      return;
    }
    if (!Root.Runtime.experiments.isEnabled('fullAccessibilityTree')) {
      accessibilityModel.clear();
    }
    await accessibilityModel.requestPartialAXTree(node);
    this.accessibilityNodeCallback(accessibilityModel.axNodeForDOMNode(node));
  }

  override wasShown(): void {
    super.wasShown();

    // Pull down the latest date for this node.
    void this.doUpdate();

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrModified, this.onNodeChange, this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrRemoved, this.onNodeChange, this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.CharacterDataModified, this.onNodeChange, this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.ChildNodeCountUpdated, this.onNodeChange, this, {scoped: true});
  }

  override willHide(): void {
    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrModified, this.onNodeChange, this);
    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrRemoved, this.onNodeChange, this);
    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.CharacterDataModified, this.onNodeChange, this);
    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.ChildNodeCountUpdated, this.onNodeChange, this);
  }

  private pullNode(): void {
    if (this.skipNextPullNode) {
      this.skipNextPullNode = false;
      return;
    }
    this.setNode(UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode));
  }

  private onNodeChange(event: Common.EventTarget
                           .EventTargetEvent<{node: SDK.DOMModel.DOMNode, name: string}|SDK.DOMModel.DOMNode>): void {
    if (!this.node()) {
      return;
    }
    const data = event.data;
    const node = (data instanceof SDK.DOMModel.DOMNode ? data : data.node as SDK.DOMModel.DOMNode);
    if (this.node() !== node) {
      return;
    }
    this.update();
  }
}
