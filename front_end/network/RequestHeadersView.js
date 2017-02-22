/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) IBM Corp. 2009  All rights reserved.
 * Copyright (C) 2010 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
Network.RequestHeadersView = class extends UI.VBox {
  /**
   * @param {!SDK.NetworkRequest} request
   */
  constructor(request) {
    super();
    this.registerRequiredCSS('network/requestHeadersView.css');
    this.element.classList.add('request-headers-view');

    this._request = request;
    this._decodeRequestParameters = true;
    this._showRequestHeadersText = false;
    this._showResponseHeadersText = false;

    var root = new UI.TreeOutlineInShadow();
    root.registerRequiredCSS('network/requestHeadersTree.css');
    root.element.classList.add('request-headers-tree');
    root.setFocusable(false);
    root.makeDense();
    root.expandTreeElementsWhenArrowing = true;
    this.element.appendChild(root.element);

    var generalCategory = new Network.RequestHeadersView.Category(root, 'general', Common.UIString('General'));
    generalCategory.hidden = false;
    this._urlItem = generalCategory.createLeaf();
    this._requestMethodItem = generalCategory.createLeaf();
    this._statusCodeItem = generalCategory.createLeaf();
    this._remoteAddressItem = generalCategory.createLeaf();
    this._remoteAddressItem.hidden = true;
    this._referrerPolicyItem = generalCategory.createLeaf();
    this._referrerPolicyItem.hidden = true;

    this._responseHeadersCategory = new Network.RequestHeadersView.Category(root, 'responseHeaders', '');
    this._requestHeadersCategory = new Network.RequestHeadersView.Category(root, 'requestHeaders', '');
    this._queryStringCategory = new Network.RequestHeadersView.Category(root, 'queryString', '');
    this._formDataCategory = new Network.RequestHeadersView.Category(root, 'formData', '');
    this._requestPayloadCategory =
        new Network.RequestHeadersView.Category(root, 'requestPayload', Common.UIString('Request Payload'));
  }

  /**
   * @override
   */
  wasShown() {
    this._request.addEventListener(SDK.NetworkRequest.Events.RemoteAddressChanged, this._refreshRemoteAddress, this);
    this._request.addEventListener(SDK.NetworkRequest.Events.RequestHeadersChanged, this._refreshRequestHeaders, this);
    this._request.addEventListener(
        SDK.NetworkRequest.Events.ResponseHeadersChanged, this._refreshResponseHeaders, this);
    this._request.addEventListener(SDK.NetworkRequest.Events.FinishedLoading, this._refreshHTTPInformation, this);

    this._refreshURL();
    this._refreshQueryString();
    this._refreshRequestHeaders();
    this._refreshResponseHeaders();
    this._refreshHTTPInformation();
    this._refreshRemoteAddress();
    this._refreshReferrerPolicy();
  }

  /**
   * @override
   */
  willHide() {
    this._request.removeEventListener(SDK.NetworkRequest.Events.RemoteAddressChanged, this._refreshRemoteAddress, this);
    this._request.removeEventListener(
        SDK.NetworkRequest.Events.RequestHeadersChanged, this._refreshRequestHeaders, this);
    this._request.removeEventListener(
        SDK.NetworkRequest.Events.ResponseHeadersChanged, this._refreshResponseHeaders, this);
    this._request.removeEventListener(SDK.NetworkRequest.Events.FinishedLoading, this._refreshHTTPInformation, this);
  }

  /**
   * @param {string} name
   * @param {string} value
   * @return {!DocumentFragment}
   */
  _formatHeader(name, value) {
    var fragment = createDocumentFragment();
    fragment.createChild('div', 'header-name').textContent = name + ':';
    fragment.createChild('div', 'header-value source-code').textContent = value;

    return fragment;
  }

  /**
   * @param {string} value
   * @param {string} className
   * @param {boolean} decodeParameters
   * @return {!Element}
   */
  _formatParameter(value, className, decodeParameters) {
    var errorDecoding = false;

    if (decodeParameters) {
      value = value.replace(/\+/g, ' ');
      if (value.indexOf('%') >= 0) {
        try {
          value = decodeURIComponent(value);
        } catch (e) {
          errorDecoding = true;
        }
      }
    }
    var div = createElementWithClass('div', className);
    if (value === '')
      div.classList.add('empty-value');
    if (errorDecoding)
      div.createChild('span', 'header-decode-error').textContent = Common.UIString('(unable to decode value)');
    else
      div.textContent = value;
    return div;
  }

  _refreshURL() {
    this._urlItem.title = this._formatHeader(Common.UIString('Request URL'), this._request.url());
  }

  _refreshQueryString() {
    var queryString = this._request.queryString();
    var queryParameters = this._request.queryParameters;
    this._queryStringCategory.hidden = !queryParameters;
    if (queryParameters) {
      this._refreshParams(
          Common.UIString('Query String Parameters'), queryParameters, queryString, this._queryStringCategory);
    }
  }

  _refreshFormData() {
    this._formDataCategory.hidden = true;
    this._requestPayloadCategory.hidden = true;

    var formData = this._request.requestFormData;
    if (!formData)
      return;

    var formParameters = this._request.formParameters;
    if (formParameters) {
      this._formDataCategory.hidden = false;
      this._refreshParams(Common.UIString('Form Data'), formParameters, formData, this._formDataCategory);
    } else {
      this._requestPayloadCategory.hidden = false;
      try {
        var json = JSON.parse(formData);
        this._refreshRequestJSONPayload(json, formData);
      } catch (e) {
        this._populateTreeElementWithSourceText(this._requestPayloadCategory, formData);
      }
    }
  }

  /**
   * @param {!UI.TreeElement} treeElement
   * @param {?string} sourceText
   */
  _populateTreeElementWithSourceText(treeElement, sourceText) {
    var sourceTextElement = createElementWithClass('span', 'header-value source-code');
    sourceTextElement.textContent = String(sourceText || '').trim();

    var sourceTreeElement = new UI.TreeElement(sourceTextElement);
    sourceTreeElement.selectable = false;
    treeElement.removeChildren();
    treeElement.appendChild(sourceTreeElement);
  }

  /**
   * @param {string} title
   * @param {?Array.<!SDK.NetworkRequest.NameValue>} params
   * @param {?string} sourceText
   * @param {!UI.TreeElement} paramsTreeElement
   */
  _refreshParams(title, params, sourceText, paramsTreeElement) {
    paramsTreeElement.removeChildren();

    paramsTreeElement.listItemElement.removeChildren();
    paramsTreeElement.listItemElement.createTextChild(title);

    var headerCount = createElementWithClass('span', 'header-count');
    headerCount.textContent = Common.UIString('\u00A0(%d)', params.length);
    paramsTreeElement.listItemElement.appendChild(headerCount);

    /**
     * @param {!Event} event
     * @this {Network.RequestHeadersView}
     */
    function toggleViewSource(event) {
      paramsTreeElement[Network.RequestHeadersView._viewSourceSymbol] =
          !paramsTreeElement[Network.RequestHeadersView._viewSourceSymbol];
      this._refreshParams(title, params, sourceText, paramsTreeElement);
      event.consume();
    }

    paramsTreeElement.listItemElement.appendChild(this._createViewSourceToggle(
        paramsTreeElement[Network.RequestHeadersView._viewSourceSymbol], toggleViewSource.bind(this)));

    if (paramsTreeElement[Network.RequestHeadersView._viewSourceSymbol]) {
      this._populateTreeElementWithSourceText(paramsTreeElement, sourceText);
      return;
    }

    var toggleTitle =
        this._decodeRequestParameters ? Common.UIString('view URL encoded') : Common.UIString('view decoded');
    var toggleButton = this._createToggleButton(toggleTitle);
    toggleButton.addEventListener('click', this._toggleURLDecoding.bind(this), false);
    paramsTreeElement.listItemElement.appendChild(toggleButton);

    for (var i = 0; i < params.length; ++i) {
      var paramNameValue = createDocumentFragment();
      if (params[i].name !== '') {
        var name = this._formatParameter(params[i].name + ':', 'header-name', this._decodeRequestParameters);
        var value = this._formatParameter(params[i].value, 'header-value source-code', this._decodeRequestParameters);
        paramNameValue.appendChild(name);
        paramNameValue.appendChild(value);
      } else {
        paramNameValue.appendChild(
            this._formatParameter(Common.UIString('(empty)'), 'empty-request-header', this._decodeRequestParameters));
      }

      var paramTreeElement = new UI.TreeElement(paramNameValue);
      paramTreeElement.selectable = false;
      paramsTreeElement.appendChild(paramTreeElement);
    }
  }

  /**
   * @param {*} parsedObject
   * @param {string} sourceText
   */
  _refreshRequestJSONPayload(parsedObject, sourceText) {
    var treeElement = this._requestPayloadCategory;
    treeElement.removeChildren();

    var listItem = this._requestPayloadCategory.listItemElement;
    listItem.removeChildren();
    listItem.createTextChild(this._requestPayloadCategory.title);

    /**
     * @param {!Event} event
     * @this {Network.RequestHeadersView}
     */
    function toggleViewSource(event) {
      treeElement[Network.RequestHeadersView._viewSourceSymbol] =
          !treeElement[Network.RequestHeadersView._viewSourceSymbol];
      this._refreshRequestJSONPayload(parsedObject, sourceText);
      event.consume();
    }

    listItem.appendChild(this._createViewSourceToggle(
        treeElement[Network.RequestHeadersView._viewSourceSymbol], toggleViewSource.bind(this)));
    if (treeElement[Network.RequestHeadersView._viewSourceSymbol]) {
      this._populateTreeElementWithSourceText(this._requestPayloadCategory, sourceText);
    } else {
      var object = SDK.RemoteObject.fromLocalObject(parsedObject);
      var section = new ObjectUI.ObjectPropertiesSection(object, object.description);
      section.expand();
      section.editable = false;
      treeElement.appendChild(new UI.TreeElement(section.element));
    }
  }

  /**
   * @param {boolean} viewSource
   * @param {function(!Event)} handler
   * @return {!Element}
   */
  _createViewSourceToggle(viewSource, handler) {
    var viewSourceToggleTitle = viewSource ? Common.UIString('view parsed') : Common.UIString('view source');
    var viewSourceToggleButton = this._createToggleButton(viewSourceToggleTitle);
    viewSourceToggleButton.addEventListener('click', handler, false);
    return viewSourceToggleButton;
  }

  /**
   * @param {!Event} event
   */
  _toggleURLDecoding(event) {
    this._decodeRequestParameters = !this._decodeRequestParameters;
    this._refreshQueryString();
    this._refreshFormData();
    event.consume();
  }

  _refreshRequestHeaders() {
    var treeElement = this._requestHeadersCategory;
    var headers = this._request.requestHeaders().slice();
    headers.sort(function(a, b) {
      return a.name.toLowerCase().compareTo(b.name.toLowerCase());
    });
    var headersText = this._request.requestHeadersText();

    if (this._showRequestHeadersText && headersText)
      this._refreshHeadersText(Common.UIString('Request Headers'), headers.length, headersText, treeElement);
    else
      this._refreshHeaders(Common.UIString('Request Headers'), headers, treeElement, headersText === undefined);

    if (headersText) {
      var toggleButton = this._createHeadersToggleButton(this._showRequestHeadersText);
      toggleButton.addEventListener('click', this._toggleRequestHeadersText.bind(this), false);
      treeElement.listItemElement.appendChild(toggleButton);
    }

    this._refreshFormData();
  }

  _refreshResponseHeaders() {
    var treeElement = this._responseHeadersCategory;
    var headers = this._request.sortedResponseHeaders.slice();
    var headersText = this._request.responseHeadersText;

    if (this._showResponseHeadersText)
      this._refreshHeadersText(Common.UIString('Response Headers'), headers.length, headersText, treeElement);
    else
      this._refreshHeaders(Common.UIString('Response Headers'), headers, treeElement);

    if (headersText) {
      var toggleButton = this._createHeadersToggleButton(this._showResponseHeadersText);
      toggleButton.addEventListener('click', this._toggleResponseHeadersText.bind(this), false);
      treeElement.listItemElement.appendChild(toggleButton);
    }
  }

  _refreshHTTPInformation() {
    var requestMethodElement = this._requestMethodItem;
    requestMethodElement.hidden = !this._request.statusCode;
    var statusCodeElement = this._statusCodeItem;
    statusCodeElement.hidden = !this._request.statusCode;

    if (this._request.statusCode) {
      var statusCodeFragment = createDocumentFragment();
      statusCodeFragment.createChild('div', 'header-name').textContent = Common.UIString('Status Code') + ':';

      var statusCodeImage = statusCodeFragment.createChild('label', 'resource-status-image', 'dt-icon-label');
      statusCodeImage.title = this._request.statusCode + ' ' + this._request.statusText;

      if (this._request.statusCode < 300 || this._request.statusCode === 304)
        statusCodeImage.type = 'smallicon-green-ball';
      else if (this._request.statusCode < 400)
        statusCodeImage.type = 'smallicon-orange-ball';
      else
        statusCodeImage.type = 'smallicon-red-ball';

      requestMethodElement.title = this._formatHeader(Common.UIString('Request Method'), this._request.requestMethod);

      var statusTextElement = statusCodeFragment.createChild('div', 'header-value source-code');
      var statusText = this._request.statusCode + ' ' + this._request.statusText;
      if (this._request.fetchedViaServiceWorker) {
        statusText += ' ' + Common.UIString('(from ServiceWorker)');
        statusTextElement.classList.add('status-from-cache');
      } else if (this._request.cached()) {
        if (this._request.cachedInMemory())
          statusText += ' ' + Common.UIString('(from memory cache)');
        else
          statusText += ' ' + Common.UIString('(from disk cache)');
        statusTextElement.classList.add('status-from-cache');
      }
      statusTextElement.textContent = statusText;

      statusCodeElement.title = statusCodeFragment;
    }
  }

  /**
   * @param {string} title
   * @param {!UI.TreeElement} headersTreeElement
   * @param {number} headersLength
   */
  _refreshHeadersTitle(title, headersTreeElement, headersLength) {
    headersTreeElement.listItemElement.removeChildren();
    headersTreeElement.listItemElement.createTextChild(title);

    var headerCount = Common.UIString('\u00A0(%d)', headersLength);
    headersTreeElement.listItemElement.createChild('span', 'header-count').textContent = headerCount;
  }

  /**
   * @param {string} title
   * @param {!Array.<!SDK.NetworkRequest.NameValue>} headers
   * @param {!UI.TreeElement} headersTreeElement
   * @param {boolean=} provisionalHeaders
   */
  _refreshHeaders(title, headers, headersTreeElement, provisionalHeaders) {
    headersTreeElement.removeChildren();

    var length = headers.length;
    this._refreshHeadersTitle(title, headersTreeElement, length);

    if (provisionalHeaders) {
      var cautionText = Common.UIString('Provisional headers are shown');
      var cautionFragment = createDocumentFragment();
      cautionFragment.createChild('label', '', 'dt-icon-label').type = 'smallicon-warning';
      cautionFragment.createChild('div', 'caution').textContent = cautionText;
      var cautionTreeElement = new UI.TreeElement(cautionFragment);
      cautionTreeElement.selectable = false;
      headersTreeElement.appendChild(cautionTreeElement);
    }

    headersTreeElement.hidden = !length && !provisionalHeaders;
    for (var i = 0; i < length; ++i) {
      var headerTreeElement = new UI.TreeElement(this._formatHeader(headers[i].name, headers[i].value));
      headerTreeElement.selectable = false;
      headersTreeElement.appendChild(headerTreeElement);
    }
  }

  /**
   * @param {string} title
   * @param {number} count
   * @param {string} headersText
   * @param {!UI.TreeElement} headersTreeElement
   */
  _refreshHeadersText(title, count, headersText, headersTreeElement) {
    this._populateTreeElementWithSourceText(headersTreeElement, headersText);
    this._refreshHeadersTitle(title, headersTreeElement, count);
  }

  _refreshRemoteAddress() {
    var remoteAddress = this._request.remoteAddress();
    var treeElement = this._remoteAddressItem;
    treeElement.hidden = !remoteAddress;
    if (remoteAddress)
      treeElement.title = this._formatHeader(Common.UIString('Remote Address'), remoteAddress);
  }

  _refreshReferrerPolicy() {
    var referrerPolicy = this._request.referrerPolicy();
    var treeElement = this._referrerPolicyItem;
    treeElement.hidden = !referrerPolicy;
    if (referrerPolicy)
      treeElement.title = this._formatHeader(Common.UIString('Referrer Policy'), referrerPolicy);
  }

  /**
   * @param {!Event} event
   */
  _toggleRequestHeadersText(event) {
    this._showRequestHeadersText = !this._showRequestHeadersText;
    this._refreshRequestHeaders();
    event.consume();
  }

  /**
   * @param {!Event} event
   */
  _toggleResponseHeadersText(event) {
    this._showResponseHeadersText = !this._showResponseHeadersText;
    this._refreshResponseHeaders();
    event.consume();
  }

  /**
   * @param {string} title
   * @return {!Element}
   */
  _createToggleButton(title) {
    var button = createElementWithClass('span', 'header-toggle');
    button.textContent = title;
    return button;
  }

  /**
   * @param {boolean} isHeadersTextShown
   * @return {!Element}
   */
  _createHeadersToggleButton(isHeadersTextShown) {
    var toggleTitle = isHeadersTextShown ? Common.UIString('view parsed') : Common.UIString('view source');
    return this._createToggleButton(toggleTitle);
  }
};

Network.RequestHeadersView._viewSourceSymbol = Symbol('ViewSource');

/**
 * @unrestricted
 */
Network.RequestHeadersView.Category = class extends UI.TreeElement {
  /**
   * @param {!UI.TreeOutline} root
   * @param {string} name
   * @param {string=} title
   */
  constructor(root, name, title) {
    super(title || '', true);
    this.selectable = false;
    this.toggleOnClick = true;
    this.hidden = true;
    this._expandedSetting = Common.settings.createSetting('request-info-' + name + '-category-expanded', true);
    this.expanded = this._expandedSetting.get();
    root.appendChild(this);
  }

  /**
   * @return {!UI.TreeElement}
   */
  createLeaf() {
    var leaf = new UI.TreeElement();
    leaf.selectable = false;
    this.appendChild(leaf);
    return leaf;
  }

  /**
   * @override
   */
  onexpand() {
    this._expandedSetting.set(true);
  }

  /**
   * @override
   */
  oncollapse() {
    this._expandedSetting.set(false);
  }
};
