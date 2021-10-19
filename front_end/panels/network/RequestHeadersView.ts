// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as ClientVariations from '../../third_party/chromium/client-variations/client-variations.js';
// eslint-disable-next-line rulesdir/es_modules_import
import objectPropertiesSectionStyles from '../../ui/legacy/components/object_ui/objectPropertiesSection.css.js';
// eslint-disable-next-line rulesdir/es_modules_import
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as UI from '../../ui/legacy/legacy.js';

import requestHeadersTreeStyles from './requestHeadersTree.css.js';
import requestHeadersViewStyles from './requestHeadersView.css.js';

const UIStrings = {
  /**
  *@description Text in Request Headers View of the Network panel
  */
  general: 'General',
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
  requestUrl: 'Request URL',
  /**
  *@description Text to show more content
  */
  showMore: 'Show more',
  /**
  *@description Text for toggling the view of header data (e.g. query string parameters) from source to parsed in the headers tab
  */
  viewParsed: 'View parsed',
  /**
  *@description Text for toggling the view of header data (e.g. query string parameters) from parsed to source in the headers tab
  */
  viewSource: 'View source',
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
  *@description Text in Request Headers View of the Network panel
  */
  fromWebBundle: '(from Web Bundle)',
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
  activeClientExperimentVariation: 'Active `client experiment variation IDs`.',
  /**
  *@description Comment used in decoded X-Client-Data HTTP header output in Headers View of the Network panel
  */
  activeClientExperimentVariationIds: 'Active `client experiment variation IDs` that trigger server-side behavior.',
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
  /**
   * @description Shown in the network panel for network requests that meet special criteria.
   * 'Attribution' is a term used by the "Attribution Reporting API" and refers to an event, e.g.
   * buying an item in an online store after an ad was clicked.
   * @example {foo} PH1
   */
  recordedAttribution: 'Recorded attribution with `trigger-data`: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestHeadersView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
export class RequestHeadersView extends UI.Widget.VBox {
  private request: SDK.NetworkRequest.NetworkRequest;
  private showRequestHeadersText: boolean;
  private showResponseHeadersText: boolean;
  private highlightedElement: UI.TreeOutline.TreeElement|null;
  private readonly root: Category;
  private urlItem: UI.TreeOutline.TreeElement;
  private readonly requestMethodItem: UI.TreeOutline.TreeElement;
  private readonly statusCodeItem: UI.TreeOutline.TreeElement;
  private readonly remoteAddressItem: UI.TreeOutline.TreeElement;
  private readonly referrerPolicyItem: UI.TreeOutline.TreeElement;
  private readonly responseHeadersCategory: Category;
  private readonly requestHeadersCategory: Category;

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();

    this.element.classList.add('request-headers-view');

    this.request = request;
    this.showRequestHeadersText = false;
    this.showResponseHeadersText = false;

    this.highlightedElement = null;

    const root = new UI.TreeOutline.TreeOutlineInShadow();
    root.registerCSSFiles([objectValueStyles, objectPropertiesSectionStyles, requestHeadersTreeStyles]);

    root.element.classList.add('request-headers-tree');
    root.makeDense();
    root.setUseLightSelectionColor(true);
    this.element.appendChild(root.element);

    const generalCategory = new Category(root, 'general', i18nString(UIStrings.general));
    generalCategory.hidden = false;
    this.root = generalCategory;
    this.setDefaultFocusedElement(this.root.listItemElement);
    this.urlItem = generalCategory.createLeaf();
    this.requestMethodItem = generalCategory.createLeaf();
    headerNames.set(this.requestMethodItem, 'Request-Method');
    this.statusCodeItem = generalCategory.createLeaf();
    headerNames.set(this.statusCodeItem, 'Status-Code');
    this.remoteAddressItem = generalCategory.createLeaf();
    this.remoteAddressItem.hidden = true;
    this.referrerPolicyItem = generalCategory.createLeaf();
    this.referrerPolicyItem.hidden = true;

    this.responseHeadersCategory = new Category(root, 'responseHeaders', '');
    this.requestHeadersCategory = new Category(root, 'requestHeaders', '');
  }

  wasShown(): void {
    this.clearHighlight();
    this.registerCSSFiles([requestHeadersViewStyles]);
    this.request.addEventListener(SDK.NetworkRequest.Events.RemoteAddressChanged, this.refreshRemoteAddress, this);
    this.request.addEventListener(SDK.NetworkRequest.Events.RequestHeadersChanged, this.refreshRequestHeaders, this);
    this.request.addEventListener(SDK.NetworkRequest.Events.ResponseHeadersChanged, this.refreshResponseHeaders, this);
    this.request.addEventListener(SDK.NetworkRequest.Events.FinishedLoading, this.refreshHTTPInformation, this);

    this.refreshURL();
    this.refreshRequestHeaders();
    this.refreshResponseHeaders();
    this.refreshHTTPInformation();
    this.refreshRemoteAddress();
    this.refreshReferrerPolicy();
    this.root.select(/* omitFocus */ true, /* selectedByUser */ false);
  }

  willHide(): void {
    this.request.removeEventListener(SDK.NetworkRequest.Events.RemoteAddressChanged, this.refreshRemoteAddress, this);
    this.request.removeEventListener(SDK.NetworkRequest.Events.RequestHeadersChanged, this.refreshRequestHeaders, this);
    this.request.removeEventListener(
        SDK.NetworkRequest.Events.ResponseHeadersChanged, this.refreshResponseHeaders, this);
    this.request.removeEventListener(SDK.NetworkRequest.Events.FinishedLoading, this.refreshHTTPInformation, this);
  }

  private addEntryContextMenuHandler(treeElement: UI.TreeOutline.TreeElement, value: string): void {
    treeElement.listItemElement.addEventListener('contextmenu', event => {
      event.consume(true);
      const contextMenu = new UI.ContextMenu.ContextMenu(event);
      const decodedValue = decodeURIComponent(value);
      const copyDecodedValueHandler = (): void => {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue);
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(decodedValue);
      };
      contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyValue), copyDecodedValueHandler);
      contextMenu.show();
    });
  }

  private formatHeader(name: string, value: string): DocumentFragment {
    const fragment = document.createDocumentFragment();
    fragment.createChild('div', 'header-name').textContent = name + ': ';
    fragment.createChild('span', 'header-separator');
    fragment.createChild('div', 'header-value source-code').textContent = value;

    return fragment;
  }

  private formatHeaderObject(header: BlockedReasonDetailDescriptor): DocumentFragment {
    const fragment = document.createDocumentFragment();
    if (header.headerNotSet) {
      fragment.createChild('div', 'header-badge header-badge-error header-badge-text').textContent = 'not-set';
    }
    // Highlight successful Attribution Reporting API redirects. If the request was
    // not canceled, then something went wrong.
    if (header.name.toLowerCase() === 'location' && this.request.canceled) {
      const url = new URL(header.value?.toString() || '', this.request.parsedURL.securityOrigin());
      const triggerData = getTriggerDataFromAttributionRedirect(url);
      if (triggerData) {
        fragment.createChild('div', 'header-badge header-badge-success header-badge-text').textContent =
            'Attribution Reporting API';
        header.details = {
          explanation: (): string => i18nString(UIStrings.recordedAttribution, {PH1: triggerData}),
          examples: [],
          link: null,
        };
      }
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
      callToActionBody.createChild('div', 'explanation').textContent = header.details.explanation();
      for (const example of header.details.examples) {
        const exampleNode = callToActionBody.createChild('div', 'example');
        exampleNode.createChild('code').textContent = example.codeSnippet;
        if (example.comment) {
          exampleNode.createChild('span', 'comment').textContent = example.comment();
        }
      }

      if (IssuesManager.RelatedIssue.hasIssueOfCategory(
              this.request, IssuesManager.Issue.IssueCategory.CrossOriginEmbedderPolicy)) {
        const link = document.createElement('div');
        link.classList.add('devtools-link');
        link.onclick = (): void => {
          Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.LearnMoreLinkCOEP);
          IssuesManager.RelatedIssue.reveal(this.request, IssuesManager.Issue.IssueCategory.CrossOriginEmbedderPolicy);
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

  private refreshURL(): void {
    const requestURL = this.request.url();
    this.urlItem.title = this.formatHeader(i18nString(UIStrings.requestUrl), requestURL);
    this.addEntryContextMenuHandler(this.urlItem, requestURL);
  }

  private populateTreeElementWithSourceText(treeElement: UI.TreeOutline.TreeElement, sourceText: string|null): void {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/naming-convention
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

    function showMore(): void {
      showMoreButton.remove();
      sourceTextElement.textContent = text;
      sourceTreeElement.listItemElement.removeEventListener('contextmenu', onContextMenuShowMore);
    }
    showMoreButton.addEventListener('click', showMore);

    function onContextMenuShowMore(event: Event): void {
      const contextMenu = new UI.ContextMenu.ContextMenu(event);
      const section = contextMenu.newSection();
      section.appendItem(i18nString(UIStrings.showMore), showMore);
      contextMenu.show();
    }
    sourceTreeElement.listItemElement.addEventListener('contextmenu', onContextMenuShowMore);
    sourceTextElement.appendChild(showMoreButton);
  }

  private refreshRequestHeaders(): void {
    const treeElement = this.requestHeadersCategory;
    const headers = this.request.requestHeaders().slice();
    headers.sort(function(a, b) {
      return Platform.StringUtilities.compare(a.name.toLowerCase(), b.name.toLowerCase());
    });
    const headersText = this.request.requestHeadersText();

    if (this.showRequestHeadersText && headersText) {
      this.refreshHeadersText(i18nString(UIStrings.requestHeaders), headers.length, headersText, treeElement);
    } else {
      this.refreshHeaders(i18nString(UIStrings.requestHeaders), headers, treeElement, headersText === undefined);
    }

    if (headersText) {
      const toggleButton = this.createHeadersToggleButton(this.showRequestHeadersText);
      toggleButton.addEventListener('click', this.toggleRequestHeadersText.bind(this), false);
      treeElement.listItemElement.appendChild(toggleButton);
    }
  }

  private refreshResponseHeaders(): void {
    const treeElement = this.responseHeadersCategory;
    const headers = this.request.sortedResponseHeaders.slice();
    const headersText = this.request.responseHeadersText;

    if (this.showResponseHeadersText) {
      this.refreshHeadersText(i18nString(UIStrings.responseHeaders), headers.length, headersText, treeElement);
    } else {
      const headersWithIssues = [];
      if (this.request.wasBlocked()) {
        const headerWithIssues =
            BlockedReasonDetails.get((this.request.blockedReason() as Protocol.Network.BlockedReason));
        if (headerWithIssues) {
          headersWithIssues.push(headerWithIssues);
        }
      }
      this.refreshHeaders(
          i18nString(UIStrings.responseHeaders), mergeHeadersWithIssues(headers, headersWithIssues), treeElement,
          /* provisional */ false, this.request.blockedResponseCookies());
    }

    if (headersText) {
      const toggleButton = this.createHeadersToggleButton(this.showResponseHeadersText);
      toggleButton.addEventListener('click', this.toggleResponseHeadersText.bind(this), false);
      treeElement.listItemElement.appendChild(toggleButton);
    }

    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function mergeHeadersWithIssues(headers: any[], headersWithIssues: any[]): any[] {
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

  private refreshHTTPInformation(): void {
    const requestMethodElement = this.requestMethodItem;
    requestMethodElement.hidden = !this.request.statusCode;
    const statusCodeElement = this.statusCodeItem;
    statusCodeElement.hidden = !this.request.statusCode;

    if (this.request.statusCode) {
      const statusCodeFragment = document.createDocumentFragment();
      statusCodeFragment.createChild('div', 'header-name').textContent = i18nString(UIStrings.statusCode) + ': ';
      statusCodeFragment.createChild('span', 'header-separator');

      const statusCodeImage =
          (statusCodeFragment.createChild('span', 'resource-status-image', 'dt-icon-label') as
           UI.UIUtils.DevToolsIconLabel);
      UI.Tooltip.Tooltip.install(statusCodeImage, this.request.statusCode + ' ' + this.request.statusText);

      if (this.request.statusCode < 300 || this.request.statusCode === 304) {
        statusCodeImage.type = 'smallicon-green-ball';
      } else if (this.request.statusCode < 400) {
        statusCodeImage.type = 'smallicon-orange-ball';
      } else {
        statusCodeImage.type = 'smallicon-red-ball';
      }

      requestMethodElement.title = this.formatHeader(i18nString(UIStrings.requestMethod), this.request.requestMethod);

      const statusTextElement = statusCodeFragment.createChild('div', 'header-value source-code');
      let statusText = this.request.statusCode + ' ' + this.request.statusText;
      if (this.request.cachedInMemory()) {
        statusText += ' ' + i18nString(UIStrings.fromMemoryCache);
        statusTextElement.classList.add('status-from-cache');
      } else if (this.request.fetchedViaServiceWorker) {
        statusText += ' ' + i18nString(UIStrings.fromServiceWorker);
        statusTextElement.classList.add('status-from-cache');
      } else if (this.request.redirectSourceSignedExchangeInfoHasNoErrors()) {
        statusText += ' ' + i18nString(UIStrings.fromSignedexchange);
        statusTextElement.classList.add('status-from-cache');
      } else if (this.request.webBundleInnerRequestInfo()) {
        statusText += ' ' + i18nString(UIStrings.fromWebBundle);
        statusTextElement.classList.add('status-from-cache');
      } else if (this.request.fromPrefetchCache()) {
        statusText += ' ' + i18nString(UIStrings.fromPrefetchCache);
        statusTextElement.classList.add('status-from-cache');
      } else if (this.request.cached()) {
        statusText += ' ' + i18nString(UIStrings.fromDiskCache);
        statusTextElement.classList.add('status-from-cache');
      }
      statusTextElement.textContent = statusText;

      statusCodeElement.title = statusCodeFragment;
    }
  }

  private refreshHeadersTitle(title: string, headersTreeElement: UI.TreeOutline.TreeElement, headersLength: number):
      void {
    headersTreeElement.listItemElement.removeChildren();
    headersTreeElement.listItemElement.createChild('div', 'selection fill');
    UI.UIUtils.createTextChild(headersTreeElement.listItemElement, title);

    const headerCount = `\xA0(${headersLength})`;
    headersTreeElement.listItemElement.createChild('span', 'header-count').textContent = headerCount;
  }

  private refreshHeaders(
      title: string, headers: SDK.NetworkRequest.NameValue[], headersTreeElement: UI.TreeOutline.TreeElement,
      provisionalHeaders?: boolean, blockedResponseCookies?: SDK.NetworkRequest.BlockedSetCookieWithReason[]): void {
    headersTreeElement.removeChildren();

    const length = headers.length;
    this.refreshHeadersTitle(title, headersTreeElement, length);

    if (provisionalHeaders) {
      let cautionText;
      let cautionTitle = '';
      if (this.request.cachedInMemory() || this.request.cached()) {
        cautionText = i18nString(UIStrings.provisionalHeadersAreShownS);
        cautionTitle = i18nString(UIStrings.onlyProvisionalHeadersAre);
      } else {
        cautionText = i18nString(UIStrings.provisionalHeadersAreShown);
      }
      const cautionElement = document.createElement('div');
      cautionElement.classList.add('request-headers-caution');
      UI.Tooltip.Tooltip.install(cautionElement, cautionTitle);
      (cautionElement.createChild('span', '', 'dt-icon-label') as UI.UIUtils.DevToolsIconLabel).type =
          'smallicon-warning';
      cautionElement.createChild('div', 'caution').textContent = cautionText;
      const cautionTreeElement = new UI.TreeOutline.TreeElement(cautionElement);

      cautionElement.createChild('div', 'learn-more')
          .appendChild(UI.XLink.XLink.create(
              'https://developer.chrome.com/docs/devtools/network/reference/#provisional-headers',
              i18nString(UIStrings.learnMore)));

      headersTreeElement.appendChild(cautionTreeElement);
    }

    const blockedCookieLineToReasons = new Map<string, Protocol.Network.SetCookieBlockedReason[]>();
    if (blockedResponseCookies) {
      blockedResponseCookies.forEach(blockedCookie => {
        blockedCookieLineToReasons.set(blockedCookie.cookieLine, blockedCookie.blockedReasons);
      });
    }

    headersTreeElement.hidden = !length && !provisionalHeaders;
    for (const header of headers) {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const headerTreeElement = new UI.TreeOutline.TreeElement(this.formatHeaderObject((header as any)));
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

      this.addEntryContextMenuHandler(headerTreeElement, header.value);
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

  private refreshHeadersText(
      title: string, count: number, headersText: string, headersTreeElement: UI.TreeOutline.TreeElement): void {
    this.populateTreeElementWithSourceText(headersTreeElement, headersText);
    this.refreshHeadersTitle(title, headersTreeElement, count);
  }

  private refreshRemoteAddress(): void {
    const remoteAddress = this.request.remoteAddress();
    const treeElement = this.remoteAddressItem;
    treeElement.hidden = !remoteAddress;
    if (remoteAddress) {
      treeElement.title = this.formatHeader(i18nString(UIStrings.remoteAddress), remoteAddress);
    }
  }

  private refreshReferrerPolicy(): void {
    const referrerPolicy = this.request.referrerPolicy();
    const treeElement = this.referrerPolicyItem;
    treeElement.hidden = !referrerPolicy;
    if (referrerPolicy) {
      treeElement.title = this.formatHeader(i18nString(UIStrings.referrerPolicy), referrerPolicy);
    }
  }

  private toggleRequestHeadersText(event: Event): void {
    this.showRequestHeadersText = !this.showRequestHeadersText;
    this.refreshRequestHeaders();
    event.consume();
  }

  private toggleResponseHeadersText(event: Event): void {
    this.showResponseHeadersText = !this.showResponseHeadersText;
    this.refreshResponseHeaders();
    event.consume();
  }

  private createToggleButton(title: string): Element {
    const button = document.createElement('span');
    button.classList.add('header-toggle');
    button.textContent = title;
    return button;
  }

  private createHeadersToggleButton(isHeadersTextShown: boolean): Element {
    const toggleTitle = isHeadersTextShown ? i18nString(UIStrings.viewParsed) : i18nString(UIStrings.viewSource);
    return this.createToggleButton(toggleTitle);
  }

  private clearHighlight(): void {
    if (this.highlightedElement) {
      this.highlightedElement.listItemElement.classList.remove('header-highlight');
    }
    this.highlightedElement = null;
  }

  private revealAndHighlight(category: UI.TreeOutline.TreeElement|null, name?: string): void {
    this.clearHighlight();
    if (!category) {
      return;
    }
    if (name) {
      for (const element of category.children()) {
        // HTTP headers are case insensitive.
        if (headerNames.get(element)?.toUpperCase() !== name.toUpperCase()) {
          continue;
        }
        this.highlightedElement = element;
        element.reveal();
        element.listItemElement.classList.add('header-highlight');
        return;
      }
    }
    // If there wasn't a match, reveal the first element of the category (without highlighting it).
    if (category.childCount() > 0) {
      category.childAt(0)?.reveal();
    }
  }

  private getCategoryForSection(section: NetworkForward.UIRequestLocation.UIHeaderSection): Category {
    switch (section) {
      case NetworkForward.UIRequestLocation.UIHeaderSection.General:
        return this.root;
      case NetworkForward.UIRequestLocation.UIHeaderSection.Request:
        return this.requestHeadersCategory;
      case NetworkForward.UIRequestLocation.UIHeaderSection.Response:
        return this.responseHeadersCategory;
    }
  }

  revealHeader(section: NetworkForward.UIRequestLocation.UIHeaderSection, header?: string): void {
    this.revealAndHighlight(this.getCategoryForSection(section), header);
  }
}

const headerNames = new WeakMap<UI.TreeOutline.TreeElement, string>();

export class Category extends UI.TreeOutline.TreeElement {
  toggleOnClick: boolean;
  private readonly expandedSetting: Common.Settings.Setting<boolean>;
  expanded: boolean;

  constructor(root: UI.TreeOutline.TreeOutline, name: string, title?: string) {
    super(title || '', true);
    this.toggleOnClick = true;
    this.hidden = true;
    this.expandedSetting =
        Common.Settings.Settings.instance().createSetting('request-info-' + name + '-category-expanded', true);
    this.expanded = this.expandedSetting.get();
    root.appendChild(this);
  }

  createLeaf(): UI.TreeOutline.TreeElement {
    const leaf = new UI.TreeOutline.TreeElement();
    this.appendChild(leaf);
    return leaf;
  }

  onexpand(): void {
    this.expandedSetting.set(true);
  }

  oncollapse(): void {
    this.expandedSetting.set(false);
  }
}

/**
 * Returns the value for the `trigger-data` search parameter iff the provided
 * url is a valid attribution redirect as specified by the Attribution
 * Reporting API.
 */
function getTriggerDataFromAttributionRedirect(url: URL): string|null {
  if (url.pathname === '/.well-known/attribution-reporting/trigger-attribution' &&
      url.searchParams.has('trigger-data')) {
    return url.searchParams.get('trigger-data');
  }
  return null;
}

interface BlockedReasonDetailDescriptor {
  name: string;
  value: Object|null;
  headerValueIncorrect: boolean|null;
  details: {
    explanation: () => string,
    examples: Array<{
      codeSnippet: string,
      comment?: (() => string),
    }>,
    link: {
      url: string,
    }|null,
  };
  headerNotSet: boolean|null;
}

const BlockedReasonDetails = new Map<Protocol.Network.BlockedReason, BlockedReasonDetailDescriptor>([
  [
    Protocol.Network.BlockedReason.CoepFrameResourceNeedsCoepHeader,
    {
      name: 'cross-origin-embedder-policy',
      value: null,
      headerValueIncorrect: null,
      details: {
        explanation: i18nLazyString(UIStrings.toEmbedThisFrameInYourDocument),
        examples: [{codeSnippet: 'Cross-Origin-Embedder-Policy: require-corp', comment: undefined}],
        link: {url: 'https://web.dev/coop-coep/'},
      },
      headerNotSet: null,
    },
  ],
  [
    Protocol.Network.BlockedReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep,
    {
      name: 'cross-origin-resource-policy',
      value: null,
      headerValueIncorrect: null,
      details: {
        explanation: i18nLazyString(UIStrings.toUseThisResourceFromADifferent),
        examples: [
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: same-site',
            comment: i18nLazyString(UIStrings.chooseThisOptionIfTheResourceAnd),
          },
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: cross-origin',
            comment: i18nLazyString(UIStrings.onlyChooseThisOptionIfAn),
          },
        ],
        link: {url: 'https://web.dev/coop-coep/'},
      },
      headerNotSet: null,
    },
  ],
  [
    Protocol.Network.BlockedReason.CoopSandboxedIframeCannotNavigateToCoopPage,
    {
      name: 'cross-origin-opener-policy',
      value: null,
      headerValueIncorrect: false,
      details: {
        explanation: i18nLazyString(UIStrings.thisDocumentWasBlockedFrom),
        examples: [],
        link: {url: 'https://web.dev/coop-coep/'},
      },
      headerNotSet: null,
    },
  ],
  [
    Protocol.Network.BlockedReason.CorpNotSameSite,
    {
      name: 'cross-origin-resource-policy',
      value: null,
      headerValueIncorrect: true,
      details: {
        explanation: i18nLazyString(UIStrings.toUseThisResourceFromADifferentSite),
        examples: [
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: cross-origin',
            comment: i18nLazyString(UIStrings.onlyChooseThisOptionIfAn),
          },
        ],
        link: null,
      },
      headerNotSet: null,
    },
  ],
  [
    Protocol.Network.BlockedReason.CorpNotSameOrigin,
    {
      name: 'cross-origin-resource-policy',
      value: null,
      headerValueIncorrect: true,
      details: {
        explanation: i18nLazyString(UIStrings.toUseThisResourceFromADifferentOrigin),
        examples: [
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: same-site',
            comment: i18nLazyString(UIStrings.chooseThisOptionIfTheResourceAnd),
          },
          {
            codeSnippet: 'Cross-Origin-Resource-Policy: cross-origin',
            comment: i18nLazyString(UIStrings.onlyChooseThisOptionIfAn),
          },
        ],
        link: null,
      },
      headerNotSet: null,
    },
  ],
]);
