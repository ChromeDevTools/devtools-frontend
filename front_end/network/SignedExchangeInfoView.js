// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Network.SignedExchangeInfoView = class extends UI.VBox {
  /**
   * @param {!SDK.NetworkRequest} request
   */
  constructor(request) {
    super();
    const signedExchangeInfo = request.signedExchangeInfo();
    console.assert(signedExchangeInfo);

    this.registerRequiredCSS('network/signedExchangeInfoView.css');
    this.element.classList.add('signed-exchange-info-view');

    const root = new UI.TreeOutlineInShadow();
    root.registerRequiredCSS('network/signedExchangeInfoTree.css');
    root.element.classList.add('signed-exchange-info-tree');
    root.setFocusable(false);
    root.makeDense();
    root.expandTreeElementsWhenArrowing = true;
    this.element.appendChild(root.element);

    if (signedExchangeInfo.errors && signedExchangeInfo.errors.length) {
      const errorMessagesCategory = new Network.SignedExchangeInfoView.Category(root, Common.UIString('Errors'));
      for (const errorMessage of signedExchangeInfo.errors) {
        const fragment = createDocumentFragment();
        fragment.appendChild(UI.Icon.create('smallicon-error', 'prompt-icon'));
        fragment.createChild('div', 'error-log').textContent = errorMessage;
        errorMessagesCategory.createLeaf(fragment);
      }
    }
    if (signedExchangeInfo.header) {
      const header = signedExchangeInfo.header;
      const titleElement = createDocumentFragment();
      titleElement.createChild('div', 'header-name').textContent = Common.UIString('Signed HTTP exchange');
      const learnMoreNode =
          UI.XLink.create('https://github.com/WICG/webpackage', Common.UIString('Learn\xa0more'), 'header-toggle');
      titleElement.appendChild(learnMoreNode);

      const headerCategory = new Network.SignedExchangeInfoView.Category(root, titleElement);
      const redirectDestination = request.redirectDestination();
      const requestURLElement = this._formatHeader(Common.UIString('Request URL'), header.requestUrl);
      if (redirectDestination) {
        const viewRequestLink = Components.Linkifier.linkifyRevealable(redirectDestination, 'View request');
        viewRequestLink.classList.add('header-toggle');
        requestURLElement.appendChild(viewRequestLink);
      }
      headerCategory.createLeaf(requestURLElement);
      headerCategory.createLeaf(this._formatHeader(Common.UIString('Request method'), header.requestMethod));
      headerCategory.createLeaf(this._formatHeader(Common.UIString('Response code'), header.responseCode + ''));

      this._responseHeadersItem =
          headerCategory.createLeaf(this._formatHeader(Common.UIString('Response headers'), ''));
      const responseHeaders = header.responseHeaders;
      for (const name in responseHeaders) {
        const headerTreeElement = new UI.TreeElement(this._formatHeader(name, responseHeaders[name]));
        headerTreeElement.selectable = false;
        this._responseHeadersItem.appendChild(headerTreeElement);
      }
      this._responseHeadersItem.expand();

      for (const signature of header.signatures) {
        const signatureCategory = new Network.SignedExchangeInfoView.Category(root, Common.UIString('Signature'));
        signatureCategory.createLeaf(this._formatHeader(Common.UIString('Label'), signature.label));
        signatureCategory.createLeaf(this._formatHeader(Common.UIString('Integrity'), signature.integrity));
        signatureCategory.createLeaf(this._formatHeader(Common.UIString('Certificate URL'), signature.certUrl));
        signatureCategory.createLeaf(this._formatHeader(Common.UIString('Validity URL'), signature.validityUrl));
        signatureCategory.createLeaf().title =
            this._formatHeader(Common.UIString('Date'), new Date(1000 * signature.date).toUTCString());
        signatureCategory.createLeaf().title =
            this._formatHeader(Common.UIString('Expires'), new Date(1000 * signature.expires).toUTCString());
      }
    }
    if (signedExchangeInfo.securityDetails) {
      const securityDetails = signedExchangeInfo.securityDetails;
      const securityCategory = new Network.SignedExchangeInfoView.Category(root, Common.UIString('Certificate'));
      securityCategory.createLeaf(this._formatHeader(Common.UIString('Subject'), securityDetails.subjectName));
      securityCategory.createLeaf(
          this._formatHeader(Common.UIString('Valid from'), new Date(1000 * securityDetails.validFrom).toUTCString()));
      securityCategory.createLeaf(
          this._formatHeader(Common.UIString('Valid until'), new Date(1000 * securityDetails.validTo).toUTCString()));
      securityCategory.createLeaf(this._formatHeader(Common.UIString('Issuer'), securityDetails.issuer));
    }
  }

  /**
   * @param {string} name
   * @param {string} value
   * @return {!DocumentFragment}
   */
  _formatHeader(name, value) {
    const fragment = createDocumentFragment();
    fragment.createChild('div', 'header-name').textContent = name + ': ';
    fragment.createChild('span', 'header-separator');
    fragment.createChild('div', 'header-value source-code').textContent = value;
    return fragment;
  }
};


/**
 * @unrestricted
 */
Network.SignedExchangeInfoView.Category = class extends UI.TreeElement {
  /**
   * @param {!UI.TreeOutline} root
   * @param {(string|!Node)=} title
   */
  constructor(root, title) {
    super(title, true);
    this.selectable = false;
    this.toggleOnClick = true;
    this.expanded = true;
    root.appendChild(this);
  }

  /**
   * @param {(string|!Node)=} title
   */
  createLeaf(title) {
    const leaf = new UI.TreeElement(title);
    leaf.selectable = false;
    this.appendChild(leaf);
    return leaf;
  }
};
