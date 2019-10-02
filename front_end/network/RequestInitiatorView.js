// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
Network.RequestInitiatorView = class extends UI.VBox {
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
    /** @type {?{element: !Element, links: !Array<!Element>}} */
    this._stackTracePreview = null;
    /** @type {?SDK.NetworkLog.InitiatorGraph} */
    this._initiatorGraph = null;
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
    const stackTrace =
        Components.JSPresentationUtils.buildStackTracePreviewContents(target, linkifier, initiator.stack, callback);
    if (focusableLink) {
      for (const link of stackTrace.links) {
        link.tabIndex = 0;
      }
    }
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
   * @override
   */
  wasShown() {
    if (this._stackTracePreview) {
      return;
    }
    this._stackTracePreview =
        Network.RequestInitiatorView.createStackTracePreview(this._request, this._linkifier, true);
    if (this._stackTracePreview) {
      this._appendExpandableSection(this._stackTracePreview.element, ls`Request call stack`, true);
    }
  }
};
