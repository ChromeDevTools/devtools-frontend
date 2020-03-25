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

import * as Common from '../common/common.js';
import * as ObjectUI from '../object_ui/object_ui.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export class RequestHeadersView extends UI.Widget.VBox {
  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  constructor(request) {
    super();
    this.registerRequiredCSS('network/requestHeadersView.css');
    this.element.classList.add('request-headers-view');

    this._request = request;
    this._decodeRequestParameters = true;
    this._showRequestHeadersText = false;
    this._showResponseHeadersText = false;

    /** @type {?UI.TreeOutline.TreeElement} */
    this._highlightedElement = null;

    const root = new UI.TreeOutline.TreeOutlineInShadow();
    root.registerRequiredCSS('object_ui/objectValue.css');
    root.registerRequiredCSS('object_ui/objectPropertiesSection.css');
    root.registerRequiredCSS('network/requestHeadersTree.css');
    root.element.classList.add('request-headers-tree');
    root.makeDense();
    this.element.appendChild(root.element);

    const generalCategory = new Category(root, 'general', Common.UIString.UIString('General'));
    generalCategory.hidden = false;
    this._root = generalCategory;
    this._urlItem = generalCategory.createLeaf();
    this._requestMethodItem = generalCategory.createLeaf();
    this._statusCodeItem = generalCategory.createLeaf();
    this._remoteAddressItem = generalCategory.createLeaf();
    this._remoteAddressItem.hidden = true;
    this._referrerPolicyItem = generalCategory.createLeaf();
    this._referrerPolicyItem.hidden = true;

    this._responseHeadersCategory = new Category(root, 'responseHeaders', '');
    this._requestHeadersCategory = new Category(root, 'requestHeaders', '');
    this._queryStringCategory = new Category(root, 'queryString', '');
    this._formDataCategory = new Category(root, 'formData', '');
    this._requestPayloadCategory = new Category(root, 'requestPayload', Common.UIString.UIString('Request Payload'));
  }

  /**
   * @override
   */
  wasShown() {
    this._clearHighlight();
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
    this._root.select(/* omitFocus */ true, /* selectedByUser */ false);
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
    const fragment = createDocumentFragment();
    fragment.createChild('div', 'header-name').textContent = name + ': ';
    fragment.createChild('span', 'header-separator');
    fragment.createChild('div', 'header-value source-code').textContent = value;

    return fragment;
  }

  /**
   * @param {!{name:string,value:(string|undefined),headerNotSet:(boolean|undefined),headerValueIncorrect:(boolean|undefined),details:(!{explanation:string,examples:!Array<!{codeSnippet:string,comment:(string|undefined)}>}|undefined)}} header
   * @return {!DocumentFragment}
   */
  _formatHeaderObject(header) {
    const fragment = createDocumentFragment();
    if (header.headerNotSet) {
      fragment.createChild('div', 'header-badge header-badge-text').textContent = 'not-set';
    }
    const colon = header.value ? ': ' : '';
    fragment.createChild('div', 'header-name').textContent = header.name + colon;
    fragment.createChild('span', 'header-separator');
    if (header.value) {
      if (header.headerValueIncorrect) {
        fragment.createChild('div', 'header-value source-code header-warning').textContent = header.value;
      } else {
        fragment.createChild('div', 'header-value source-code').textContent = header.value;
      }
    }
    if (header.details) {
      const detailsNode = fragment.createChild('div', 'header-details');
      const callToAction = detailsNode.createChild('div', 'call-to-action');
      const callToActionBody = callToAction.createChild('div', 'call-to-action-body');
      callToActionBody.createChild('div', 'explanation').textContent = header.details.explanation;
      for (const example of header.details.examples) {
        const exampleNode = callToActionBody.createChild('div', 'example');
        exampleNode.createChild('code').textContent = example.codeSnippet;
        if (example.comment) {
          exampleNode.createChild('span', 'comment').textContent = example.comment;
        }
      }

      if (Root.Runtime.experiments.isEnabled('issuesPane') &&
          SDK.RelatedIssue.hasIssueOfCategory(
              this._request, SDK.RelatedIssue.IssueCategory.CrossOriginEmbedderPolicy)) {
        const link = createElementWithClass('div', 'devtools-link');
        link.onclick = () => {
          SDK.RelatedIssue.reveal(this._request, SDK.RelatedIssue.IssueCategory.CrossOriginEmbedderPolicy);
        };
        const text = createElementWithClass('span', 'devtools-link');
        text.textContent = 'Learn more in the issues panel';
        link.appendChild(text);
        link.prepend(UI.Icon.Icon.create('largeicon-breaking-change', 'icon'));
        callToActionBody.appendChild(link);
      } else if (header.details.link) {
        const link = UI.XLink.XLink.create(header.details.link.url, ls`Learn more`, 'link');
        link.prepend(UI.Icon.Icon.create('largeicon-link', 'link-icon'));
        callToActionBody.appendChild(link);
      }
    }
    return fragment;
  }

  /**
   * @param {string} value
   * @param {string} className
   * @param {boolean} decodeParameters
   * @return {!Element}
   */
  _formatParameter(value, className, decodeParameters) {
    let errorDecoding = false;

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
    const div = createElementWithClass('div', className);
    if (value === '') {
      div.classList.add('empty-value');
    }
    if (errorDecoding) {
      div.createChild('span', 'header-decode-error').textContent = Common.UIString.UIString('(unable to decode value)');
    } else {
      div.textContent = value;
    }
    return div;
  }

  _refreshURL() {
    this._urlItem.title = this._formatHeader(Common.UIString.UIString('Request URL'), this._request.url());
  }

  _refreshQueryString() {
    const queryString = this._request.queryString();
    const queryParameters = this._request.queryParameters;
    this._queryStringCategory.hidden = !queryParameters;
    if (queryParameters) {
      this._refreshParams(
          Common.UIString.UIString('Query String Parameters'), queryParameters, queryString, this._queryStringCategory);
    }
  }

  async _refreshFormData() {
    this._formDataCategory.hidden = true;
    this._requestPayloadCategory.hidden = true;

    const formData = await this._request.requestFormData();
    if (!formData) {
      return;
    }

    const formParameters = await this._request.formParameters();
    if (formParameters) {
      this._formDataCategory.hidden = false;
      this._refreshParams(Common.UIString.UIString('Form Data'), formParameters, formData, this._formDataCategory);
    } else {
      this._requestPayloadCategory.hidden = false;
      try {
        const json = JSON.parse(formData);
        this._refreshRequestJSONPayload(json, formData);
      } catch (e) {
        this._populateTreeElementWithSourceText(this._requestPayloadCategory, formData);
      }
    }
  }

  /**
   * @param {!UI.TreeOutline.TreeElement} treeElement
   * @param {?string} sourceText
   */
  _populateTreeElementWithSourceText(treeElement, sourceText) {
    const max_len = 3000;
    const text = (sourceText || '').trim();
    const trim = text.length > max_len;

    const sourceTextElement = createElementWithClass('span', 'header-value source-code');
    sourceTextElement.textContent = trim ? text.substr(0, max_len) : text;

    const sourceTreeElement = new UI.TreeOutline.TreeElement(sourceTextElement);
    treeElement.removeChildren();
    treeElement.appendChild(sourceTreeElement);
    if (!trim) {
      return;
    }

    const showMoreButton = createElementWithClass('button', 'request-headers-show-more-button');
    showMoreButton.textContent = Common.UIString.UIString('Show more');

    function showMore() {
      showMoreButton.remove();
      sourceTextElement.textContent = text;
      sourceTreeElement.listItemElement.removeEventListener('contextmenu', onContextMenuShowMore);
    }
    showMoreButton.addEventListener('click', showMore);

    /**
     * @param {!Event} event
     */
    function onContextMenuShowMore(event) {
      const contextMenu = new UI.ContextMenu.ContextMenu(event);
      const section = contextMenu.newSection();
      section.appendItem(ls`Show more`, showMore);
      contextMenu.show();
    }
    sourceTreeElement.listItemElement.addEventListener('contextmenu', onContextMenuShowMore);
    sourceTextElement.appendChild(showMoreButton);
  }

  /**
   * @param {string} title
   * @param {?Array.<!SDK.NetworkRequest.NameValue>} params
   * @param {?string} sourceText
   * @param {!UI.TreeOutline.TreeElement} paramsTreeElement
   */
  _refreshParams(title, params, sourceText, paramsTreeElement) {
    paramsTreeElement.removeChildren();

    paramsTreeElement.listItemElement.removeChildren();
    paramsTreeElement.listItemElement.createChild('div', 'selection fill');
    paramsTreeElement.listItemElement.createTextChild(title);

    const headerCount = createElementWithClass('span', 'header-count');
    headerCount.textContent = Common.UIString.UIString('\xA0(%d)', params.length);
    paramsTreeElement.listItemElement.appendChild(headerCount);

    const shouldViewSource = paramsTreeElement[_viewSourceSymbol];
    if (shouldViewSource) {
      this._appendParamsSource(title, params, sourceText, paramsTreeElement);
    } else {
      this._appendParamsParsed(title, params, sourceText, paramsTreeElement);
    }
  }

  /**
   * @param {string} title
   * @param {?Array.<!SDK.NetworkRequest.NameValue>} params
   * @param {?string} sourceText
   * @param {!UI.TreeOutline.TreeElement} paramsTreeElement
   */
  _appendParamsSource(title, params, sourceText, paramsTreeElement) {
    this._populateTreeElementWithSourceText(paramsTreeElement, sourceText);

    const listItemElement = paramsTreeElement.listItemElement;

    /**
     * @param {!Event} event
     * @this {RequestHeadersView}
     */
    const viewParsed = function(event) {
      listItemElement.removeEventListener('contextmenu', viewParsedContextMenu);

      paramsTreeElement[_viewSourceSymbol] = false;
      this._refreshParams(title, params, sourceText, paramsTreeElement);
      event.consume();
    };

    /**
     * @param {!Event} event
     * @this {RequestHeadersView}
     */
    const viewParsedContextMenu = function(event) {
      if (!paramsTreeElement.expanded) {
        return;
      }
      const contextMenu = new UI.ContextMenu.ContextMenu(event);
      contextMenu.newSection().appendItem(ls`View parsed`, viewParsed.bind(this, event));
      contextMenu.show();
    }.bind(this);

    const viewParsedButton = this._createViewSourceToggle(/* viewSource */ true, viewParsed.bind(this));
    listItemElement.appendChild(viewParsedButton);

    listItemElement.addEventListener('contextmenu', viewParsedContextMenu);
  }

  /**
   * @param {string} title
   * @param {?Array.<!SDK.NetworkRequest.NameValue>} params
   * @param {?string} sourceText
   * @param {!UI.TreeOutline.TreeElement} paramsTreeElement
   */
  _appendParamsParsed(title, params, sourceText, paramsTreeElement) {
    for (let i = 0; i < params.length; ++i) {
      const paramNameValue = createDocumentFragment();
      if (params[i].name !== '') {
        const name = this._formatParameter(params[i].name + ': ', 'header-name', this._decodeRequestParameters);
        const value = this._formatParameter(params[i].value, 'header-value source-code', this._decodeRequestParameters);
        paramNameValue.appendChild(name);
        paramNameValue.createChild('span', 'header-separator');
        paramNameValue.appendChild(value);
      } else {
        paramNameValue.appendChild(this._formatParameter(
            Common.UIString.UIString('(empty)'), 'empty-request-header', this._decodeRequestParameters));
      }

      const paramTreeElement = new UI.TreeOutline.TreeElement(paramNameValue);
      paramsTreeElement.appendChild(paramTreeElement);
    }

    const listItemElement = paramsTreeElement.listItemElement;

    /**
     * @param {!Event} event
     * @this {RequestHeadersView}
     */
    const viewSource = function(event) {
      listItemElement.removeEventListener('contextmenu', viewSourceContextMenu);

      paramsTreeElement[_viewSourceSymbol] = true;
      this._refreshParams(title, params, sourceText, paramsTreeElement);
      event.consume();
    };

    /**
     * @param {!Event} event
     * @this {RequestHeadersView}
     */
    const toggleURLDecoding = function(event) {
      listItemElement.removeEventListener('contextmenu', viewSourceContextMenu);
      this._toggleURLDecoding(event);
    };

    /**
     * @param {!Event} event
     * @this {RequestHeadersView}
     */
    const viewSourceContextMenu = function(event) {
      if (!paramsTreeElement.expanded) {
        return;
      }
      const contextMenu = new UI.ContextMenu.ContextMenu(event);
      const section = contextMenu.newSection();
      section.appendItem(ls`View source`, viewSource.bind(this, event));
      const viewURLEncodedText = this._decodeRequestParameters ? ls`View URL encoded` : ls`View decoded`;
      section.appendItem(viewURLEncodedText, toggleURLDecoding.bind(this, event));
      contextMenu.show();
    }.bind(this);

    const viewSourceButton = this._createViewSourceToggle(/* viewSource */ false, viewSource.bind(this));
    listItemElement.appendChild(viewSourceButton);

    const toggleTitle = this._decodeRequestParameters ? ls`view URL encoded` : ls`view decoded`;
    const toggleButton = this._createToggleButton(toggleTitle);
    toggleButton.addEventListener('click', toggleURLDecoding.bind(this), false);
    listItemElement.appendChild(toggleButton);

    listItemElement.addEventListener('contextmenu', viewSourceContextMenu);
  }

  /**
   * @param {*} parsedObject
   * @param {string} sourceText
   */
  _refreshRequestJSONPayload(parsedObject, sourceText) {
    const rootListItem = this._requestPayloadCategory;
    rootListItem.removeChildren();

    const rootListItemElement = rootListItem.listItemElement;
    rootListItemElement.removeChildren();
    rootListItemElement.createChild('div', 'selection fill');
    rootListItemElement.createTextChild(this._requestPayloadCategory.title);

    const shouldViewSource = rootListItem[_viewSourceSymbol];
    if (shouldViewSource) {
      this._appendJSONPayloadSource(rootListItem, parsedObject, sourceText);
    } else {
      this._appendJSONPayloadParsed(rootListItem, parsedObject, sourceText);
    }
  }

  /**
   * @param {!Category} rootListItem
   * @param {*} parsedObject
   * @param {string} sourceText
   */
  _appendJSONPayloadSource(rootListItem, parsedObject, sourceText) {
    const rootListItemElement = rootListItem.listItemElement;
    this._populateTreeElementWithSourceText(rootListItem, sourceText);

    /**
     * @param {!Event} event
     * @this {RequestHeadersView}
     */
    const viewParsed = function(event) {
      rootListItemElement.removeEventListener('contextmenu', viewParsedContextMenu);
      rootListItem[_viewSourceSymbol] = false;
      this._refreshRequestJSONPayload(parsedObject, sourceText);
      event.consume();
    };

    const viewParsedButton = this._createViewSourceToggle(/* viewSource */ true, viewParsed.bind(this));
    rootListItemElement.appendChild(viewParsedButton);

    /**
     * @param {!Event} event
     * @this {RequestHeadersView}
     */
    const viewParsedContextMenu = function(event) {
      if (!rootListItem.expanded) {
        return;
      }
      const contextMenu = new UI.ContextMenu.ContextMenu(event);
      contextMenu.newSection().appendItem(ls`View parsed`, viewParsed.bind(this, event));
      contextMenu.show();
    }.bind(this);

    rootListItemElement.addEventListener('contextmenu', viewParsedContextMenu);
  }

  /**
   * @param {!Category} rootListItem
   * @param {*} parsedObject
   * @param {string} sourceText
   */
  _appendJSONPayloadParsed(rootListItem, parsedObject, sourceText) {
    const object =
        /** @type {!SDK.RemoteObject.LocalJSONObject} */ (SDK.RemoteObject.RemoteObject.fromLocalObject(parsedObject));
    const section = new ObjectUI.ObjectPropertiesSection.RootElement(object);
    section.title = object.description;
    section.expand();
    section.editable = false;
    rootListItem.childrenListElement.classList.add('source-code', 'object-properties-section');

    rootListItem.appendChild(section);
    const rootListItemElement = rootListItem.listItemElement;

    /**
     * @param {!Event} event
     * @this {RequestHeadersView}
     */
    const viewSource = function(event) {
      rootListItemElement.removeEventListener('contextmenu', viewSourceContextMenu);

      rootListItem[_viewSourceSymbol] = true;
      this._refreshRequestJSONPayload(parsedObject, sourceText);
      event.consume();
    };

    /**
     * @param {!Event} event
     * @this {RequestHeadersView}
     */
    const viewSourceContextMenu = function(event) {
      if (!rootListItem.expanded) {
        return;
      }
      const contextMenu = new UI.ContextMenu.ContextMenu(event);
      contextMenu.newSection().appendItem(ls`View source`, viewSource.bind(this, event));
      contextMenu.show();
    }.bind(this);

    const viewSourceButton = this._createViewSourceToggle(/* viewSource */ false, viewSource.bind(this));
    rootListItemElement.appendChild(viewSourceButton);

    rootListItemElement.addEventListener('contextmenu', viewSourceContextMenu);
  }

  /**
   * @param {boolean} viewSource
   * @param {function(!Event)} handler
   * @return {!Element}
   */
  _createViewSourceToggle(viewSource, handler) {
    const viewSourceToggleTitle =
        viewSource ? Common.UIString.UIString('view parsed') : Common.UIString.UIString('view source');
    const viewSourceToggleButton = this._createToggleButton(viewSourceToggleTitle);
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
    const treeElement = this._requestHeadersCategory;
    const headers = this._request.requestHeaders().slice();
    headers.sort(function(a, b) {
      return a.name.toLowerCase().compareTo(b.name.toLowerCase());
    });
    const headersText = this._request.requestHeadersText();

    if (this._showRequestHeadersText && headersText) {
      this._refreshHeadersText(Common.UIString.UIString('Request Headers'), headers.length, headersText, treeElement);
    } else {
      this._refreshHeaders(
          Common.UIString.UIString('Request Headers'), headers, treeElement, headersText === undefined);
    }

    if (headersText) {
      const toggleButton = this._createHeadersToggleButton(this._showRequestHeadersText);
      toggleButton.addEventListener('click', this._toggleRequestHeadersText.bind(this), false);
      treeElement.listItemElement.appendChild(toggleButton);
    }

    this._refreshFormData();
  }

  _refreshResponseHeaders() {
    const treeElement = this._responseHeadersCategory;
    const headers = this._request.sortedResponseHeaders.slice();
    const headersText = this._request.responseHeadersText;

    if (this._showResponseHeadersText) {
      this._refreshHeadersText(Common.UIString.UIString('Response Headers'), headers.length, headersText, treeElement);
    } else {
      const headersWithIssues = [];
      if (this._request.wasBlocked()) {
        const headerWithIssues = BlockedReasonDetails.get(this._request.blockedReason());
        if (headerWithIssues) {
          headersWithIssues.push(headerWithIssues);
        }
      }
      this._refreshHeaders(
          Common.UIString.UIString('Response Headers'), mergeHeadersWithIssues(headers, headersWithIssues), treeElement,
          /* provisional */ false, this._request.blockedResponseCookies());
    }

    if (headersText) {
      const toggleButton = this._createHeadersToggleButton(this._showResponseHeadersText);
      toggleButton.addEventListener('click', this._toggleResponseHeadersText.bind(this), false);
      treeElement.listItemElement.appendChild(toggleButton);
    }

    /**
     *
     * @param {!Array<*>} headers
     * @param {!Array<*>} headersWithIssues
     */
    function mergeHeadersWithIssues(headers, headersWithIssues) {
      let i = 0, j = 0;
      const result = [];
      while (i < headers.length || j < headersWithIssues.length) {
        if (i < headers.length && (j >= headersWithIssues.length || headers[i].name < headersWithIssues[j].name)) {
          result.push({...headers[i++], headerNotSet: false});
        } else if (
            j < headersWithIssues.length && (i >= headers.length || headers[i].name > headersWithIssues[j].name)) {
          result.push({...headersWithIssues[j++], headerNotSet: true});
        } else if (
            i < headers.length && j < headersWithIssues.length && headers[i].name === headersWithIssues[j].name) {
          result.push({...headersWithIssues[j++], ...headers[i++], headerNotSet: false});
        }
      }
      return result;
    }
  }

  _refreshHTTPInformation() {
    const requestMethodElement = this._requestMethodItem;
    requestMethodElement.hidden = !this._request.statusCode;
    const statusCodeElement = this._statusCodeItem;
    statusCodeElement.hidden = !this._request.statusCode;

    if (this._request.statusCode) {
      const statusCodeFragment = createDocumentFragment();
      statusCodeFragment.createChild('div', 'header-name').textContent = ls`Status Code` +
          ': ';
      statusCodeFragment.createChild('span', 'header-separator');

      const statusCodeImage = statusCodeFragment.createChild('span', 'resource-status-image', 'dt-icon-label');
      statusCodeImage.title = this._request.statusCode + ' ' + this._request.statusText;

      if (this._request.statusCode < 300 || this._request.statusCode === 304) {
        statusCodeImage.type = 'smallicon-green-ball';
      } else if (this._request.statusCode < 400) {
        statusCodeImage.type = 'smallicon-orange-ball';
      } else {
        statusCodeImage.type = 'smallicon-red-ball';
      }

      requestMethodElement.title = this._formatHeader(ls`Request Method`, this._request.requestMethod);

      const statusTextElement = statusCodeFragment.createChild('div', 'header-value source-code');
      let statusText = this._request.statusCode + ' ' + this._request.statusText;
      if (this._request.cachedInMemory()) {
        statusText += ' ' + ls`(from memory cache)`;
        statusTextElement.classList.add('status-from-cache');
      } else if (this._request.fetchedViaServiceWorker) {
        statusText += ' ' + ls`(from ServiceWorker)`;
        statusTextElement.classList.add('status-from-cache');
      } else if (
          this._request.redirectSource() && this._request.redirectSource().signedExchangeInfo() &&
          !this._request.redirectSource().signedExchangeInfo().errors) {
        statusText += ' ' + ls`(from signed-exchange)`;
        statusTextElement.classList.add('status-from-cache');
      } else if (this._request.fromPrefetchCache()) {
        statusText += ' ' + ls`(from prefetch cache)`;
        statusTextElement.classList.add('status-from-cache');
      } else if (this._request.cached()) {
        statusText += ' ' + ls`(from disk cache)`;
        statusTextElement.classList.add('status-from-cache');
      }
      statusTextElement.textContent = statusText;

      statusCodeElement.title = statusCodeFragment;
    }
  }

  /**
   * @param {string} title
   * @param {!UI.TreeOutline.TreeElement} headersTreeElement
   * @param {number} headersLength
   */
  _refreshHeadersTitle(title, headersTreeElement, headersLength) {
    headersTreeElement.listItemElement.removeChildren();
    headersTreeElement.listItemElement.createChild('div', 'selection fill');
    headersTreeElement.listItemElement.createTextChild(title);

    const headerCount = Common.UIString.UIString('\xA0(%d)', headersLength);
    headersTreeElement.listItemElement.createChild('span', 'header-count').textContent = headerCount;
  }

  /**
   * @param {string} title
   * @param {!Array.<!SDK.NetworkRequest.NameValue>} headers
   * @param {!UI.TreeOutline.TreeElement} headersTreeElement
   * @param {boolean=} provisionalHeaders
   * @param {!Array<!SDK.NetworkRequest.BlockedSetCookieWithReason>=} blockedResponseCookies
   */
  _refreshHeaders(title, headers, headersTreeElement, provisionalHeaders, blockedResponseCookies) {
    headersTreeElement.removeChildren();

    const length = headers.length;
    this._refreshHeadersTitle(title, headersTreeElement, length);

    if (provisionalHeaders) {
      let cautionText;
      let cautionTitle = '';
      if (this._request.cachedInMemory() || this._request.cached()) {
        cautionText = ls`Provisional headers are shown. Disable cache to see full headers.`;
        cautionTitle = ls
        `Only provisional headers are available because this request was not sent over the network and instead was served from a local cache, which doesn't store the original request headers. Disable cache to see full request headers.`;
      } else {
        cautionText = ls`Provisional headers are shown`;
      }
      const cautionElement = createElement('div');
      cautionElement.title = cautionTitle;
      cautionElement.createChild('span', '', 'dt-icon-label').type = 'smallicon-warning';
      cautionElement.createChild('div', 'caution').textContent = cautionText;
      const cautionTreeElement = new UI.TreeOutline.TreeElement(cautionElement);
      headersTreeElement.appendChild(cautionTreeElement);
    }

    /** @type {!Map<string, !Array<!Protocol.Network.SetCookieBlockedReason>>} */
    const blockedCookieLineToReasons = new Map();
    if (blockedResponseCookies) {
      blockedResponseCookies.forEach(blockedCookie => {
        blockedCookieLineToReasons.set(blockedCookie.cookieLine, blockedCookie.blockedReasons);
      });
    }

    headersTreeElement.hidden = !length && !provisionalHeaders;
    for (let i = 0; i < length; ++i) {
      const headerTreeElement = new UI.TreeOutline.TreeElement(this._formatHeaderObject(headers[i]));
      headerTreeElement[_headerNameSymbol] = headers[i].name;

      if (headers[i].name.toLowerCase() === 'set-cookie') {
        const matchingBlockedReasons = blockedCookieLineToReasons.get(headers[i].value);
        if (matchingBlockedReasons) {
          const icon = UI.Icon.Icon.create('smallicon-warning', '');
          headerTreeElement.listItemElement.appendChild(icon);

          let titleText = '';
          for (const blockedReason of matchingBlockedReasons) {
            if (titleText) {
              titleText += '\n';
            }
            titleText += SDK.NetworkRequest.setCookieBlockedReasonToUiString(blockedReason);
          }
          icon.title = titleText;
        }
      }

      headersTreeElement.appendChild(headerTreeElement);
    }
  }

  /**
   * @param {string} title
   * @param {number} count
   * @param {string} headersText
   * @param {!UI.TreeOutline.TreeElement} headersTreeElement
   */
  _refreshHeadersText(title, count, headersText, headersTreeElement) {
    this._populateTreeElementWithSourceText(headersTreeElement, headersText);
    this._refreshHeadersTitle(title, headersTreeElement, count);
  }

  _refreshRemoteAddress() {
    const remoteAddress = this._request.remoteAddress();
    const treeElement = this._remoteAddressItem;
    treeElement.hidden = !remoteAddress;
    if (remoteAddress) {
      treeElement.title = this._formatHeader(Common.UIString.UIString('Remote Address'), remoteAddress);
    }
  }

  _refreshReferrerPolicy() {
    const referrerPolicy = this._request.referrerPolicy();
    const treeElement = this._referrerPolicyItem;
    treeElement.hidden = !referrerPolicy;
    if (referrerPolicy) {
      treeElement.title = this._formatHeader(Common.UIString.UIString('Referrer Policy'), referrerPolicy);
    }
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
    const button = createElementWithClass('span', 'header-toggle');
    button.textContent = title;
    return button;
  }

  /**
   * @param {boolean} isHeadersTextShown
   * @return {!Element}
   */
  _createHeadersToggleButton(isHeadersTextShown) {
    const toggleTitle =
        isHeadersTextShown ? Common.UIString.UIString('view parsed') : Common.UIString.UIString('view source');
    return this._createToggleButton(toggleTitle);
  }

  _clearHighlight() {
    if (this._highlightedElement) {
      this._highlightedElement.listItemElement.classList.remove('header-highlight');
    }
    this._highlightedElement = null;
  }


  /**
   * @param {?UI.TreeOutline.TreeElement} category
   * @param {string} name
   */
  _revealAndHighlight(category, name) {
    this._clearHighlight();
    for (const element of category.children()) {
      if (element[_headerNameSymbol] !== name) {
        continue;
      }
      this._highlightedElement = element;
      element.reveal();
      element.listItemElement.classList.add('header-highlight');
      return;
    }
  }

  /**
   * @param {string} header
   */
  revealRequestHeader(header) {
    this._revealAndHighlight(this._requestHeadersCategory, header);
  }

  /**
   * @param {string} header
   */
  revealResponseHeader(header) {
    this._revealAndHighlight(this._responseHeadersCategory, header);
  }
}

export const _headerNameSymbol = Symbol('HeaderName');
export const _viewSourceSymbol = Symbol('ViewSource');

/**
 * @unrestricted
 */
export class Category extends UI.TreeOutline.TreeElement {
  /**
   * @param {!UI.TreeOutline.TreeOutline} root
   * @param {string} name
   * @param {string=} title
   */
  constructor(root, name, title) {
    super(title || '', true);
    this.toggleOnClick = true;
    this.hidden = true;
    this._expandedSetting =
        Common.Settings.Settings.instance().createSetting('request-info-' + name + '-category-expanded', true);
    this.expanded = this._expandedSetting.get();
    root.appendChild(this);
  }

  /**
   * @return {!UI.TreeOutline.TreeElement}
   */
  createLeaf() {
    const leaf = new UI.TreeOutline.TreeElement();
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
}


const BlockedReasonDetails = new Map([
  [
    Protocol.Network.BlockedReason.CoepFrameResourceNeedsCoepHeader, {
      name: 'cross-origin-embedder-policy',
      value: null,
      details: {
          explanation:
              ls
          `To embed this frame in your document, the response needs to enable the cross-origin embedder policy by specifying the following response header:`,
          examples: [{codeSnippet:'Cross-Origin-Embedder-Policy: require-corp'}],
          link: {url: 'https://web.dev/coop-coep/'}
      }
    }
  ],
  [
    Protocol.Network.BlockedReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep, {
      name: 'cross-origin-resource-policy',
      value: null,
      details: {
        explanation:
            ls
            `To use this resource from a different origin, the server needs to specify a cross-origin resource policy in the response headers:`,
        examples: [
          {codeSnippet:'Cross-Origin-Resource-Policy: same-site', comment: ls`Choose this option if the resource and the document are served from the same site.` },
          {codeSnippet:'Cross-Origin-Resource-Policy: cross-origin', comment: ls`Only choose this option if an arbitrary website including this resource does not impose a security risk.` },
        ],
        link: {url: 'https://web.dev/coop-coep/'}
      }
    }
  ],
  [
    Protocol.Network.BlockedReason.CoopSandboxedIframeCannotNavigateToCoopPage, {
      name: 'cross-origin-opener-policy',
      value: null,
      headerValueIncorrect: false,
      details: {
        explanation:
        ls
        `This document was blocked from loading in an iframe with a sandbox attribute because this document specified a cross-origin opener policy.`,
        examples: [],
        link: {url: 'https://web.dev/coop-coep/'}
      }
    }
  ],
  [
    Protocol.Network.BlockedReason.CorpNotSameSite, {
      name: 'cross-origin-resource-policy',
      value: null,
      headerValueIncorrect: true,
      details: {
        explanation:
            ls
            `To use this resource from a different site, the server may relax the cross-origin resource policy response header:`,
        examples: [
          {codeSnippet:'Cross-Origin-Resource-Policy: cross-origin', comment: ls`Only choose this option if an arbitrary website including this resource does not impose a security risk.` },
        ]
      }
    }
  ],
  [
    Protocol.Network.BlockedReason.CorpNotSameOrigin, {
      name: 'cross-origin-resource-policy',
      value: null,
      headerValueIncorrect: true,
      details: {
        explanation:
            ls
            `To use this resource from a different origin, the server may relax the cross-origin resource policy response header:`,
            examples: [
              {codeSnippet:'Cross-Origin-Resource-Policy: same-site', comment: ls`Choose this option if the resource and the document are served from the same site.` },
              {codeSnippet:'Cross-Origin-Resource-Policy: cross-origin', comment: ls`Only choose this option if an arbitrary website including this resource does not impose a security risk.` },
            ]
      }
    }
  ],
]);
