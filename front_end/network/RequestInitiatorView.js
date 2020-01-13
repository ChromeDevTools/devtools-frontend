// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export default class RequestInitiatorView extends UI.VBox {
  /**
   * @param {!SDK.NetworkRequest} request
   */
  constructor(request) {
    super();
    this.registerRequiredCSS('network/requestInitiatorView.css');
    this.element.classList.add('request-initiator-view');
    /** @type {!Components.Linkifier} */
    this._linkifier = new Components.Linkifier();
    this._request = request;
    this._emptyWidget = new UI.EmptyWidget(Common.UIString('This request has no initiator data.'));
    this._emptyWidget.show(this.element);
    this._hasShown = false;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @param {!Components.Linkifier} linkifier
   * @param {boolean=} focusableLink
   * @param {function()=} callback
   * @return {?{element: !Element, links: !Array<!Element>}}
   */
  static createStackTracePreview(request, linkifier, focusableLink, callback) {
    const initiator = request.initiator();
    if (!initiator || !initiator.stack) {
      return null;
    }
    const networkManager = SDK.NetworkManager.forRequest(request);
    const target = networkManager ? networkManager.target() : null;
    const stackTrace = Components.JSPresentationUtils.buildStackTracePreviewContents(
        target, linkifier, {stackTrace: initiator.stack, contentUpdated: callback, tabStops: focusableLink});
    return stackTrace;
  }

  /**
   * @param {!Element} sectionContent
   * @param {string} title
   * @param {boolean} expanded
   */
  _appendExpandableSection(sectionContent, title, expanded) {
    const section = createElementWithClass('div', 'request-initiator-view-section');
    const icon = UI.Icon.create('smallicon-triangle-right');
    const clickableElement = section.createChild('div', 'request-initiator-view-section-title');
    clickableElement.appendChild(icon);
    clickableElement.createTextChild(title);
    clickableElement.tabIndex = 0;
    sectionContent.classList.add('hidden', 'request-initiator-view-section-content');
    section.appendChild(sectionContent);

    const expand = expanded => {
      icon.setIconType(expanded ? 'smallicon-triangle-down' : 'smallicon-triangle-right');
      sectionContent.classList.toggle('hidden', !expanded);
    };
    self.onInvokeElement(clickableElement, event => {
      expand(sectionContent.classList.contains('hidden'));
      event.consume();
    });

    expand(expanded);
    this.element.appendChild(section);
  }

  /**
   * @param {!SDK.NetworkLog.InitiatorGraph} initiatorGraph
   * @return {!UI.TreeOutlineInShadow}
   */
  _buildRequestChainTree(initiatorGraph) {
    const root = new UI.TreeOutlineInShadow();
    const initiators = initiatorGraph.initiators;
    let parent = root;
    for (const request of Array.from(initiators).reverse()) {
      const treeElement = new UI.TreeElement(request.url());
      parent.appendChild(treeElement);
      if (parent !== root) {
        parent.expand();
      }
      parent = treeElement;
    }

    // parent should be this._request tree element now
    parent.select();
    parent.titleElement.style.fontWeight = 'bold';

    const initiated = initiatorGraph.initiated;
    this._depthFirstSearchTreeBuilder(initiated, /** @type {!UI.TreeElement} */ (parent), this._request);
    return root;
  }

  /**
   * @param {!Map<!SDK.NetworkRequest, !SDK.NetworkRequest>} initiated
   * @param {!UI.TreeElement} parentElement
   * @param {!SDK.NetworkRequest} parentRequest
   */
  _depthFirstSearchTreeBuilder(initiated, parentElement, parentRequest) {
    const visited = new Set();
    // this._request should be already in the tree when build initiator part
    visited.add(this._request);
    for (const request of initiated.keys()) {
      if (initiated.get(request) === parentRequest) {
        const treeElement = new UI.TreeElement(request.url());
        parentElement.appendChild(treeElement);
        parentElement.expand();
        // only do dfs when we haven't done one
        if (!visited.has(request)) {
          visited.add(request);
          this._depthFirstSearchTreeBuilder(initiated, treeElement, request);
        }
      }
    }
  }

  /**
   * @override
   */
  wasShown() {
    if (this._hasShown) {
      return;
    }
    let initiatorDataPresent = false;
    const stackTracePreview =
        Network.RequestInitiatorView.createStackTracePreview(this._request, this._linkifier, true);
    if (stackTracePreview) {
      initiatorDataPresent = true;
      this._appendExpandableSection(stackTracePreview.element, ls`Request call stack`, true);
    }

    const initiatorGraph = SDK.networkLog.initiatorGraphForRequest(this._request);
    if (initiatorGraph.initiators.size > 1 || initiatorGraph.initiated.size > 1) {
      initiatorDataPresent = true;
      this._appendExpandableSection(
          this._buildRequestChainTree(initiatorGraph).element, ls`Request initiator chain`, true);
    }
    if (initiatorDataPresent) {
      this._emptyWidget.hideWidget();
    }
    this._hasShown = true;
  }
}

/* Legacy exported object */
self.Network = self.Network || {};

/* Legacy exported object */
Network = Network || {};

/**
 * @constructor
 */
Network.RequestInitiatorView = RequestInitiatorView;
