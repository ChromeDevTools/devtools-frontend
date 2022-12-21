// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import requestInitiatorViewStyles from './requestInitiatorView.css.js';
import requestInitiatorViewTreeStyles from './requestInitiatorViewTree.css.js';

const UIStrings = {
  /**
   *@description Text in Request Initiator View of the Network panel
   */
  thisRequestHasNoInitiatorData: 'This request has no initiator data.',
  /**
   *@description Title of a section in Request Initiator view of the Network Panel
   */
  requestCallStack: 'Request call stack',
  /**
   *@description Title of a section in Request Initiator view of the Network Panel
   */
  requestInitiatorChain: 'Request initiator chain',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestInitiatorView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class RequestInitiatorView extends UI.Widget.VBox {
  private readonly linkifier: Components.Linkifier.Linkifier;
  private readonly request: SDK.NetworkRequest.NetworkRequest;
  private readonly emptyWidget: UI.EmptyWidget.EmptyWidget;
  private hasShown: boolean;

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();

    this.element.classList.add('request-initiator-view');
    this.linkifier = new Components.Linkifier.Linkifier();
    this.request = request;
    this.emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.thisRequestHasNoInitiatorData));
    this.emptyWidget.show(this.element);
    this.hasShown = false;
  }

  static createStackTracePreview(
      request: SDK.NetworkRequest.NetworkRequest, linkifier: Components.Linkifier.Linkifier, focusableLink?: boolean): {
    element: Element,
    links: Array<Element>,
  }|null {
    const initiator = request.initiator();
    if (!initiator || !initiator.stack) {
      return null;
    }
    const networkManager = SDK.NetworkManager.NetworkManager.forRequest(request);
    const target = networkManager ? networkManager.target() : null;
    const stackTrace = Components.JSPresentationUtils.buildStackTracePreviewContents(
        target, linkifier, {stackTrace: initiator.stack, tabStops: focusableLink});
    return stackTrace;
  }

  private createTree(): UI.TreeOutline.TreeOutlineInShadow {
    const treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    treeOutline.registerCSSFiles([requestInitiatorViewTreeStyles]);
    treeOutline.contentElement.classList.add('request-initiator-view-tree');

    return treeOutline;
  }

  private buildRequestChainTree(
      initiatorGraph: Logs.NetworkLog.InitiatorGraph, title: string,
      tree: UI.TreeOutline.TreeOutlineInShadow): UI.TreeOutline.TreeElement {
    const root = new UI.TreeOutline.TreeElement(title);

    tree.appendChild(root);

    if (root.titleElement instanceof HTMLElement) {
      root.titleElement.classList.add('request-initiator-view-section-title');
    }

    const initiators = initiatorGraph.initiators;
    let parent: UI.TreeOutline.TreeElement = root;
    for (const request of Array.from(initiators).reverse()) {
      const treeElement = new UI.TreeOutline.TreeElement(request.url());
      parent.appendChild(treeElement);
      parent.expand();
      parent = treeElement;
    }

    root.expand();
    parent.select();
    const titleElement = parent.titleElement;
    if (titleElement instanceof HTMLElement) {
      titleElement.style.fontWeight = 'bold';
    }

    const initiated = initiatorGraph.initiated;
    this.depthFirstSearchTreeBuilder(initiated, (parent as UI.TreeOutline.TreeElement), this.request);
    return root;
  }

  private depthFirstSearchTreeBuilder(
      initiated: Map<SDK.NetworkRequest.NetworkRequest, SDK.NetworkRequest.NetworkRequest>,
      parentElement: UI.TreeOutline.TreeElement, parentRequest: SDK.NetworkRequest.NetworkRequest): void {
    const visited = new Set<SDK.NetworkRequest.NetworkRequest>();
    // this.request should be already in the tree when build initiator part
    visited.add(this.request);
    for (const request of initiated.keys()) {
      if (initiated.get(request) === parentRequest) {
        const treeElement = new UI.TreeOutline.TreeElement(request.url());
        parentElement.appendChild(treeElement);
        parentElement.expand();
        // only do dfs when we haven't done one
        if (!visited.has(request)) {
          visited.add(request);
          this.depthFirstSearchTreeBuilder(initiated, treeElement, request);
        }
      }
    }
  }

  private buildStackTraceSection(content: Element, title: string, tree: UI.TreeOutline.TreeOutlineInShadow): void {
    const root = new UI.TreeOutline.TreeElement(title);
    tree.appendChild(root);

    if (root.titleElement instanceof HTMLElement) {
      root.titleElement.classList.add('request-initiator-view-section-title');
    }

    const contentElement = new UI.TreeOutline.TreeElement(content, false);
    contentElement.selectable = false;

    root.appendChild(contentElement);
    root.expand();
  }

  wasShown(): void {
    if (this.hasShown) {
      return;
    }
    this.registerCSSFiles([requestInitiatorViewStyles]);
    let initiatorDataPresent = false;
    const containerTree = this.createTree();

    const stackTracePreview = RequestInitiatorView.createStackTracePreview(this.request, this.linkifier, true);

    if (stackTracePreview) {
      initiatorDataPresent = true;
      this.buildStackTraceSection(stackTracePreview.element, i18nString(UIStrings.requestCallStack), containerTree);
    }

    const initiatorGraph = Logs.NetworkLog.NetworkLog.instance().initiatorGraphForRequest(this.request);

    if (initiatorGraph.initiators.size > 1 || initiatorGraph.initiated.size > 1) {
      initiatorDataPresent = true;
      this.buildRequestChainTree(initiatorGraph, i18nString(UIStrings.requestInitiatorChain), containerTree);
    }

    const firstChild = containerTree.firstChild();

    if (firstChild) {
      firstChild.select(true);
    }

    if (initiatorDataPresent) {
      this.element.appendChild(containerTree.element);
      this.emptyWidget.hideWidget();
    }
    this.hasShown = true;
  }
}
