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

import * as BrowserSDK from '../browser_sdk/browser_sdk.js';
import * as ClientVariations from '../client_variations/client_variations.js';
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as ObjectUI from '../object_ui/object_ui.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Text in Request Headers View of the Network panel
  */
  general: 'General',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  requestPayload: 'Request Payload',
  /**
  *@description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel and Network pane request.
  */
  copyValue: 'Copy value',
  /**
  *@description Text for a link to the issues panel
  */
  learnMoreInTheIssuesTab: 'Learn more in the issues tab',
  /**
  *@description Text that is usually a hyperlink to more documentation
  */
  learnMore: 'Learn more',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  unableToDecodeValue: '(unable to decode value)',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  requestUrl: 'Request URL',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  queryStringParameters: 'Query String Parameters',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  formData: 'Form Data',
  /**
  *@description Text to show more content
  */
  showMore: 'Show more',
  /**
  *@description Text for toggling the view of header data (e.g. query string parameters) from source to parsed in the headers tab
  */
  viewParsed: 'View parsed',
  /**
  *@description Text to show an item is empty
  */
  empty: '(empty)',
  /**
  *@description Text for toggling the view of header data (e.g. query string parameters) from parsed to source in the headers tab
  */
  viewSource: 'View source',
  /**
  *@description Text for toggling header data (e.g. query string parameters) from decoded to encoded in the headers tab or in the cookies preview
  */
  viewUrlEncoded: 'View URL encoded',
  /**
  *@description Text for toggling header data (e.g. query string parameters) from encoded to decoded in the headers tab or in the cookies preview
  */
  viewDecoded: 'View decoded',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  viewUrlEncodedL: 'view URL encoded',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  viewDecodedL: 'view decoded',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  viewParsedL: 'view parsed',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  viewSourceL: 'view source',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  requestHeaders: 'Request Headers',
  /**
  *@description A context menu item in the Network Log View Columns of the Network panel
  */
  responseHeaders: 'Response Headers',
  /**
  *@description Status code of an event
  */
  statusCode: 'Status Code',
  /**
  *@description Text that refers to the network request method
  */
  requestMethod: 'Request Method',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  fromMemoryCache: '(from memory cache)',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  fromServiceWorker: '(from `service worker`)',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  fromSignedexchange: '(from signed-exchange)',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  fromPrefetchCache: '(from prefetch cache)',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  fromDiskCache: '(from disk cache)',
  /**
  *@description Message to explain lack of raw headers for a particular network request
  */
  provisionalHeadersAreShownS: 'Provisional headers are shown. Disable cache to see full headers.',
  /**
  *@description Tooltip to explain lack of raw headers for a particular network request
  */
  onlyProvisionalHeadersAre:
      'Only provisional headers are available because this request was not sent over the network and instead was served from a local cache, which doesn’t store the original request headers. Disable cache to see full request headers.',
  /**
  *@description Message to explain lack of raw headers for a particular network request
  */
  provisionalHeadersAreShown: 'Provisional headers are shown',
  /**
  *@description Comment used in decoded X-Client-Data HTTP header output in Headers View of the Network panel
  */
  activeClientExperimentVariation: 'Active client experiment variation IDs.',
  /**
  *@description Comment used in decoded X-Client-Data HTTP header output in Headers View of the Network panel
  */
  activeClientExperimentVariationIds: 'Active client experiment variation IDs that trigger server-side behavior.',
  /**
  *@description Text in Headers View of the Network panel for X-Client-Data HTTP headers
  */
  decoded: 'Decoded:',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  remoteAddress: 'Remote Address',
  /**
  *@description Text in Request Headers View of the Network panel
  */
  referrerPolicy: 'Referrer Policy',
  /**
  *@description Text in Headers View of the Network panel
  */
  toEmbedThisFrameInYourDocument:
      'To embed this frame in your document, the response needs to enable the cross-origin embedder policy by specifying the following response header:',
  /**
  *@description Text in Headers View of the Network panel
  */
  toUseThisResourceFromADifferent:
      'To use this resource from a different origin, the server needs to specify a cross-origin resource policy in the response headers:',
  /**
  *@description Text in Headers View of the Network panel
  */
  chooseThisOptionIfTheResourceAnd:
      'Choose this option if the resource and the document are served from the same site.',
  /**
  *@description Text in Headers View of the Network panel
  */
  onlyChooseThisOptionIfAn:
      'Only choose this option if an arbitrary website including this resource does not impose a security risk.',
  /**
  *@description Text in Headers View of the Network panel
  */
  thisDocumentWasBlockedFrom:
      'This document was blocked from loading in an `iframe` with a `sandbox` attribute because this document specified a cross-origin opener policy.',
  /**
  *@description Text in Headers View of the Network panel
  */
  toUseThisResourceFromADifferentSite:
      'To use this resource from a different site, the server may relax the cross-origin resource policy response header:',
  /**
  *@description Text in Headers View of the Network panel
  */
  toUseThisResourceFromADifferentOrigin:
      'To use this resource from a different origin, the server may relax the cross-origin resource policy response header:',
};
const str_ = i18n.i18n.registerUIStrings('network/RequestHeadersView.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class RequestHeadersView extends UI.Widget.VBox {
  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  constructor(request) {
    super();
    this.registerRequiredCSS('network/requestHeadersView.css', {enableLegacyPatching: true});
    this.element.classList.add('request-headers-view');

    this._request = request;
    this._decodeRequestParameters = true;
    this._showRequestHeadersText = false;
    this._showResponseHeadersText = false;

    const contentType = request.requestContentType();
    if (contentType) {
      this._decodeRequestParameters = Boolean(contentType.match(/^application\/x-www-form-urlencoded\s*(;.*)?$/i));
    }

    /** @type {?UI.TreeOutline.TreeElement} */
    this._highlightedElement = null;

    const root = new UI.TreeOutline.TreeOutlineInShadow();
    root.registerRequiredCSS('object_ui/objectValue.css', {enableLegacyPatching: true});
    root.registerRequiredCSS('object_ui/objectPropertiesSection.css', {enableLegacyPatching: true});
    root.registerRequiredCSS('network/requestHeadersTree.css', {enableLegacyPatching: true});
    root.element.classList.add('request-headers-tree');
    root.makeDense();
    this.element.appendChild(root.element);

    const generalCategory = new Category(root, 'general', i18nString(UIStrings.general));
    generalCategory.hidden = false;
    this._root = generalCategory;
    this.setDefaultFocusedElement(this._root.listItemElement);
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
    this._requestPayloadCategory = new Category(root, 'requestPayload', i18nString(UIStrings.requestPayload));
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
   * @param {!UI.TreeOutline.TreeElement} treeElement
   * @param {string} value
   */
  _addEntryContextMenuHandler(treeElement, value) {
    treeElement.listItemElement.addEventListener('contextmenu', event => {
      event.consume(true);
      const contextMenu = new UI.ContextMenu.ContextMenu(event);
      const decodedValue = decodeURIComponent(value);
      const copyDecodedValueHandler = () => {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(decodedValue);
      };
      contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyValue), copyDecodedValueHandler);
      contextMenu.show();
    });
  }

  /**
   * @param {string} name
   * @param {string} value
   * @return {!DocumentFragment}
   */
  _formatHeader(name, value) {
    const fragment = document.createDocumentFragment();
    fragment.createChild('div', 'header-name').textContent = name + ': ';
    fragment.createChild('span', 'header-separator');
    fragment.createChild('div', 'header-value source-code').textContent = value;

    return fragment;
  }

  /**
   * @param {!BlockedReasonDetailDescriptor} header
   * @return {!DocumentFragment}
   */
  _formatHeaderObject(header) {
    const fragment = document.createDocumentFragment();
    if (header.headerNotSet) {
      fragment.createChild('div', 'header-badge header-badge-text').textContent = 'not-set';
    }
    const colon = header.value ? ': ' : '';
    fragment.createChild('div', 'header-name').textContent = header.name + colon;
    fragment.createChild('span', 'header-separator');
    if (header.value) {
      if (header.headerValueIncorrect) {
        fragment.createChild('div', 'header-value source-code header-warning').textContent = header.value.toString();
      } else {
        fragment.createChild('div', 'header-value source-code').textContent = header.value.toString();
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

      if (BrowserSDK.RelatedIssue.hasIssueOfCategory(
              this._request, SDK.Issue.IssueCategory.CrossOriginEmbedderPolicy)) {
        const link = document.createElement('div');
        link.classList.add('devtools-link');
        link.onclick = () => {
          Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.LearnMoreLinkCOEP);
          BrowserSDK.RelatedIssue.reveal(this._request, SDK.Issue.IssueCategory.CrossOriginEmbedderPolicy);
        };
        const text = document.createElement('span');
        text.classList.add('devtools-link');
        text.textContent = i18nString(UIStrings.learnMoreInTheIssuesTab);
        link.appendChild(text);
        link.prepend(UI.Icon.Icon.create('largeicon-breaking-change', 'icon'));
        callToActionBody.appendChild(link);
      } else if (header.details.link) {
        const link = UI.XLink.XLink.create(header.details.link.url, i18nString(UIStrings.learnMore), 'link');
        link.prepend(UI.Icon.Icon.create('largeicon-link'));
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
    const div = document.createElement('div');
    if (className) {
      div.className = className;
    }
    if (value === '') {
      div.classList.add('empty-value');
    }
    if (errorDecoding) {
      div.createChild('span', 'header-decode-error').textContent = i18nString(UIStrings.unableToDecodeValue);
    } else {
      div.textContent = value;
    }
    return div;
  }

  _refreshURL() {
    this._urlItem.title = this._formatHeader(i18nString(UIStrings.requestUrl), this._request.url());
  }

  _refreshQueryString() {
    const queryString = this._request.queryString();
    const queryParameters = this._request.queryParameters;
    this._queryStringCategory.hidden = !queryParameters;
    if (queryParameters) {
      this._refreshParams(
          i18nString(UIStrings.queryStringParameters), queryParameters, queryString, this._queryStringCategory);
    }
  }

  async _refreshFormData() {
    const formData = await this._request.requestFormData();
    if (!formData) {
      this._formDataCategory.hidden = true;
      this._requestPayloadCategory.hidden = true;
      return;
    }

    const formParameters = await this._request.formParameters();
    if (formParameters) {
      this._formDataCategory.hidden = false;
      this._requestPayloadCategory.hidden = true;
      this._refreshParams(i18nString(UIStrings.formData), formParameters, formData, this._formDataCategory);
    } else {
      this._requestPayloadCategory.hidden = false;
      this._formDataCategory.hidden = true;
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

    const sourceTextElement = document.createElement('span');
    sourceTextElement.classList.add('header-value');
    sourceTextElement.classList.add('source-code');
    sourceTextElement.textContent = trim ? text.substr(0, max_len) : text;

    const sourceTreeElement = new UI.TreeOutline.TreeElement(sourceTextElement);
    treeElement.removeChildren();
    treeElement.appendChild(sourceTreeElement);
    if (!trim) {
      return;
    }

    const showMoreButton = document.createElement('button');
    showMoreButton.classList.add('request-headers-show-more-button');
    showMoreButton.textContent = i18nString(UIStrings.showMore);

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
      section.appendItem(i18nString(UIStrings.showMore), showMore);
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
    UI.UIUtils.createTextChild(paramsTreeElement.listItemElement, title);

    const headerCount = document.createElement('span');
    headerCount.classList.add('header-count');
    const numberOfParams = params ? params.length : 0;
    headerCount.textContent = `\xA0(${numberOfParams})`;
    paramsTreeElement.listItemElement.appendChild(headerCount);

    const shouldViewSource = viewSourceForItems.has(paramsTreeElement);
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

      viewSourceForItems.delete(paramsTreeElement);
      this._refreshParams(title, params, sourceText, paramsTreeElement);
      event.consume();
    };

    /**
     * @param {!Event} event
     */
    const viewParsedContextMenu = event => {
      if (!paramsTreeElement.expanded) {
        return;
      }
      const contextMenu = new UI.ContextMenu.ContextMenu(event);
      contextMenu.newSection().appendItem(i18nString(UIStrings.viewParsed), viewParsed.bind(this, event));
      contextMenu.show();
    };

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
    for (const param of params || []) {
      const paramNameValue = document.createDocumentFragment();
      if (param.name !== '') {
        const name = this._formatParameter(param.name + ': ', 'header-name', this._decodeRequestParameters);
        const value = this._formatParameter(param.value, 'header-value source-code', this._decodeRequestParameters);
        paramNameValue.appendChild(name);
        paramNameValue.createChild('span', 'header-separator');
        paramNameValue.appendChild(value);
      } else {
        paramNameValue.appendChild(
            this._formatParameter(i18nString(UIStrings.empty), 'empty-request-header', this._decodeRequestParameters));
      }

      const paramTreeElement = new UI.TreeOutline.TreeElement(paramNameValue);
      this._addEntryContextMenuHandler(paramTreeElement, param.value);
      paramsTreeElement.appendChild(paramTreeElement);
    }

    const listItemElement = paramsTreeElement.listItemElement;

    /**
     * @param {!Event} event
     * @this {RequestHeadersView}
     */
    const viewSource = function(event) {
      listItemElement.removeEventListener('contextmenu', viewSourceContextMenu);

      viewSourceForItems.add(paramsTreeElement);
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
     */
    const viewSourceContextMenu = event => {
      if (!paramsTreeElement.expanded) {
        return;
      }
      const contextMenu = new UI.ContextMenu.ContextMenu(event);
      const section = contextMenu.newSection();
      section.appendItem(i18nString(UIStrings.viewSource), viewSource.bind(this, event));
      const viewURLEncodedText =
          this._decodeRequestParameters ? i18nString(UIStrings.viewUrlEncoded) : i18nString(UIStrings.viewDecoded);
      section.appendItem(viewURLEncodedText, toggleURLDecoding.bind(this, event));
      contextMenu.show();
    };

    const viewSourceButton = this._createViewSourceToggle(/* viewSource */ false, viewSource.bind(this));
    listItemElement.appendChild(viewSourceButton);

    const toggleTitle =
        this._decodeRequestParameters ? i18nString(UIStrings.viewUrlEncodedL) : i18nString(UIStrings.viewDecodedL);
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
    UI.UIUtils.createTextChild(rootListItemElement, this._requestPayloadCategory.title.toString());

    if (viewSourceForItems.has(rootListItem)) {
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
      viewSourceForItems.delete(rootListItem);
      this._refreshRequestJSONPayload(parsedObject, sourceText);
      event.consume();
    };

    const viewParsedButton = this._createViewSourceToggle(/* viewSource */ true, viewParsed.bind(this));
    rootListItemElement.appendChild(viewParsedButton);

    /**
     * @param {!Event} event
     */
    const viewParsedContextMenu = event => {
      if (!rootListItem.expanded) {
        return;
      }
      const contextMenu = new UI.ContextMenu.ContextMenu(event);
      contextMenu.newSection().appendItem(i18nString(UIStrings.viewParsed), viewParsed.bind(this, event));
      contextMenu.show();
    };

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
    section.title = /** @type {string} */ (object.description);
    section.expand();
    // `editable` is not a valid property for `ObjectUI.ObjectPropertiesSection.RootElement`. Only for
    // `ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection`. We do not know if this assignment is
    // safe to delete.
    // @ts-ignore
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

      viewSourceForItems.add(rootListItem);
      this._refreshRequestJSONPayload(parsedObject, sourceText);
      event.consume();
    };

    /**
     * @param {!Event} event
     */
    const viewSourceContextMenu = event => {
      if (!rootListItem.expanded) {
        return;
      }
      const contextMenu = new UI.ContextMenu.ContextMenu(event);
      contextMenu.newSection().appendItem(i18nString(UIStrings.viewSource), viewSource.bind(this, event));
      contextMenu.show();
    };

    const viewSourceButton = this._createViewSourceToggle(/* viewSource */ false, viewSource.bind(this));
    rootListItemElement.appendChild(viewSourceButton);

    rootListItemElement.addEventListener('contextmenu', viewSourceContextMenu);
  }

  /**
   * @param {boolean} viewSource
   * @param {function(!Event):void} handler
   * @return {!Element}
   */
  _createViewSourceToggle(viewSource, handler) {
    const viewSourceToggleTitle = viewSource ? i18nString(UIStrings.viewParsedL) : i18nString(UIStrings.viewSourceL);
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
      return Platform.StringUtilities.compare(a.name.toLowerCase(), b.name.toLowerCase());
    });
    const headersText = this._request.requestHeadersText();

    if (this._showRequestHeadersText && headersText) {
      this._refreshHeadersText(i18nString(UIStrings.requestHeaders), headers.length, headersText, treeElement);
    } else {
      this._refreshHeaders(i18nString(UIStrings.requestHeaders), headers, treeElement, headersText === undefined);
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
      this._refreshHeadersText(i18nString(UIStrings.responseHeaders), headers.length, headersText, treeElement);
    } else {
      const headersWithIssues = [];
      if (this._request.wasBlocked()) {
        const headerWithIssues =
            BlockedReasonDetails.get(/** @type {!Protocol.Network.BlockedReason} */ (this._request.blockedReason()));
        if (headerWithIssues) {
          headersWithIssues.push(headerWithIssues);
        }
      }
      this._refreshHeaders(
          i18nString(UIStrings.responseHeaders), mergeHeadersWithIssues(headers, headersWithIssues), treeElement,
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
      const statusCodeFragment = document.createDocumentFragment();
      statusCodeFragment.createChild('div', 'header-name').textContent = i18nString(UIStrings.statusCode) + ': ';
      statusCodeFragment.createChild('span', 'header-separator');

      const statusCodeImage = /** @type {!UI.UIUtils.DevToolsIconLabel} */ (
          statusCodeFragment.createChild('span', 'resource-status-image', 'dt-icon-label'));
      UI.Tooltip.Tooltip.install(statusCodeImage, this._request.statusCode + ' ' + this._request.statusText);

      if (this._request.statusCode < 300 || this._request.statusCode === 304) {
        statusCodeImage.type = 'smallicon-green-ball';
      } else if (this._request.statusCode < 400) {
        statusCodeImage.type = 'smallicon-orange-ball';
      } else {
        statusCodeImage.type = 'smallicon-red-ball';
      }

      requestMethodElement.title = this._formatHeader(i18nString(UIStrings.requestMethod), this._request.requestMethod);

      const statusTextElement = statusCodeFragment.createChild('div', 'header-value source-code');
      let statusText = this._request.statusCode + ' ' + this._request.statusText;
      if (this._request.cachedInMemory()) {
        statusText += ' ' + i18nString(UIStrings.fromMemoryCache);
        statusTextElement.classList.add('status-from-cache');
      } else if (this._request.fetchedViaServiceWorker) {
        statusText += ' ' + i18nString(UIStrings.fromServiceWorker);
        statusTextElement.classList.add('status-from-cache');
      } else if (this._request.redirectSourceSignedExchangeInfoHasNoErrors()) {
        statusText += ' ' + i18nString(UIStrings.fromSignedexchange);
        statusTextElement.classList.add('status-from-cache');
      } else if (this._request.fromPrefetchCache()) {
        statusText += ' ' + i18nString(UIStrings.fromPrefetchCache);
        statusTextElement.classList.add('status-from-cache');
      } else if (this._request.cached()) {
        statusText += ' ' + i18nString(UIStrings.fromDiskCache);
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
    UI.UIUtils.createTextChild(headersTreeElement.listItemElement, title);

    const headerCount = `\xA0(${headersLength})`;
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
        cautionText = i18nString(UIStrings.provisionalHeadersAreShownS);
        cautionTitle = i18nString(UIStrings.onlyProvisionalHeadersAre);
      } else {
        cautionText = i18nString(UIStrings.provisionalHeadersAreShown);
      }
      const cautionElement = document.createElement('div');
      UI.Tooltip.Tooltip.install(cautionElement, cautionTitle);
      /** @type {!UI.UIUtils.DevToolsIconLabel} */ (cautionElement.createChild('span', '', 'dt-icon-label')).type =
          'smallicon-warning';
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
    for (const header of headers) {
      const headerTreeElement = new UI.TreeOutline.TreeElement(
          this._formatHeaderObject(/** @type {!BlockedReasonDetailDescriptor} */ (/** @type {*} */ (header))));
      headerNames.set(headerTreeElement, header.name);

      const headerId = header.name.toLowerCase();

      if (headerId === 'set-cookie') {
        const matchingBlockedReasons = blockedCookieLineToReasons.get(header.value);
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
          UI.Tooltip.Tooltip.install(icon, titleText);
        }
      }

      this._addEntryContextMenuHandler(headerTreeElement, header.value);
      headersTreeElement.appendChild(headerTreeElement);

      if (headerId === 'x-client-data') {
        const data = ClientVariations.parseClientVariations(header.value);
        const output = ClientVariations.formatClientVariations(
            data, i18nString(UIStrings.activeClientExperimentVariation),
            i18nString(UIStrings.activeClientExperimentVariationIds));
        const wrapper = document.createElement('div');
        wrapper.classList.add('x-client-data-details');
        UI.UIUtils.createTextChild(wrapper, i18nString(UIStrings.decoded));
        const div = wrapper.createChild('div');
        div.classList.add('source-code');
        div.textContent = output;
        headerTreeElement.listItemElement.appendChild(wrapper);
      }
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
      treeElement.title = this._formatHeader(i18nString(UIStrings.remoteAddress), remoteAddress);
    }
  }

  _refreshReferrerPolicy() {
    const referrerPolicy = this._request.referrerPolicy();
    const treeElement = this._referrerPolicyItem;
    treeElement.hidden = !referrerPolicy;
    if (referrerPolicy) {
      treeElement.title = this._formatHeader(i18nString(UIStrings.referrerPolicy), referrerPolicy);
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
    const button = document.createElement('span');
    button.classList.add('header-toggle');
    button.textContent = title;
    return button;
  }

  /**
   * @param {boolean} isHeadersTextShown
   * @return {!Element}
   */
  _createHeadersToggleButton(isHeadersTextShown) {
    const toggleTitle = isHeadersTextShown ? i18nString(UIStrings.viewParsed) : i18nString(UIStrings.viewSource);
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
    if (!category) {
      return;
    }
    for (const element of category.children()) {
      if (headerNames.get(element) !== name) {
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

/** @type {!WeakSet<(!Category|!UI.TreeOutline.TreeElement)>} */
const viewSourceForItems = new WeakSet();

/** @type {!WeakMap<!UI.TreeOutline.TreeElement, string>} */
const headerNames = new WeakMap();

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

/**
 * @typedef {{
 *   name: string,
 *   value: ?Object,
 *   headerValueIncorrect: ?boolean,
 *   details: !{
 *     explanation: string,
 *     examples: !Array<!{codeSnippet: string, comment:(string|undefined)}>,
 *     link: ?{url:string},
 *   },
 *   headerNotSet: ?boolean,
 * }}
 */
let BlockedReasonDetailDescriptor;  // eslint-disable-line no-unused-vars

/** @type {!Map<!Protocol.Network.BlockedReason, !BlockedReasonDetailDescriptor>} */
const BlockedReasonDetails = new Map([
  [
    Protocol.Network.BlockedReason.CoepFrameResourceNeedsCoepHeader, {
      name: 'cross-origin-embedder-policy',
      value: null,
      headerValueIncorrect: null,
      details: {
        explanation: i18nString(UIStrings.toEmbedThisFrameInYourDocument),
        examples: [{codeSnippet: 'Cross-Origin-Embedder-Policy: require-corp', comment: undefined}],
        link: {url: 'https://web.dev/coop-coep/'}
      },
      headerNotSet: null,
    }
  ],
  [
    Protocol.Network.BlockedReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep, {
      name: 'cross-origin-resource-policy',
      value: null,
      headerValueIncorrect: null,
      details: {
        explanation: i18nString(UIStrings.toUseThisResourceFromADifferent),
        examples: [
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: same-site',
            comment: i18nString(UIStrings.chooseThisOptionIfTheResourceAnd)
          },
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: cross-origin',
            comment: i18nString(UIStrings.onlyChooseThisOptionIfAn)
          },
        ],
        link: {url: 'https://web.dev/coop-coep/'},
      },
      headerNotSet: null,
    }
  ],
  [
    Protocol.Network.BlockedReason.CoopSandboxedIframeCannotNavigateToCoopPage, {
      name: 'cross-origin-opener-policy',
      value: null,
      headerValueIncorrect: false,
      details: {
        explanation: i18nString(UIStrings.thisDocumentWasBlockedFrom),
        examples: [],
        link: {url: 'https://web.dev/coop-coep/'}
      },
      headerNotSet: null,
    }
  ],
  [
    Protocol.Network.BlockedReason.CorpNotSameSite, {
      name: 'cross-origin-resource-policy',
      value: null,
      headerValueIncorrect: true,
      details: {
        explanation: i18nString(UIStrings.toUseThisResourceFromADifferentSite),
        examples: [
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: cross-origin',
            comment: i18nString(UIStrings.onlyChooseThisOptionIfAn)
          },
        ],
        link: null,
      },
      headerNotSet: null,
    }
  ],
  [
    Protocol.Network.BlockedReason.CorpNotSameOrigin, {
      name: 'cross-origin-resource-policy',
      value: null,
      headerValueIncorrect: true,
      details: {
        explanation: i18nString(UIStrings.toUseThisResourceFromADifferentOrigin),
        examples: [
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: same-site',
            comment: i18nString(UIStrings.chooseThisOptionIfTheResourceAnd)
          },
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: cross-origin',
            comment: i18nString(UIStrings.onlyChooseThisOptionIfAn)
          },
        ],
        link: null,
      },
      headerNotSet: null,
    }
  ],
]);
