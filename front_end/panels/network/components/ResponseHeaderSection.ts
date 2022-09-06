// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import type * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as NetworkForward from '../../../panels/network/forward/forward.js';
import * as Host from '../../../core/host/host.js';
import * as IssuesManager from '../../../models/issues_manager/issues_manager.js';
import {type HeaderDescriptor, HeaderSectionRow, type HeaderSectionRowData} from './HeaderSectionRow.js';

import responseHeaderSectionStyles from './ResponseHeaderSection.css.js';

const {render, html} = LitHtml;

const UIStrings = {
  /**
  *@description Explanation text for which cross-origin policy to set.
  */
  chooseThisOptionIfTheResourceAnd:
      'Choose this option if the resource and the document are served from the same site.',
  /**
  *@description Explanation text for which cross-origin policy to set.
  */
  onlyChooseThisOptionIfAn:
      'Only choose this option if an arbitrary website including this resource does not impose a security risk.',
  /**
  *@description Message in the Headers View of the Network panel when a cross-origin opener policy blocked loading a sandbox iframe.
  */
  thisDocumentWasBlockedFrom:
      'This document was blocked from loading in an `iframe` with a `sandbox` attribute because this document specified a cross-origin opener policy.',
  /**
  *@description Message in the Headers View of the Network panel when a cross-origin embedder policy header needs to be set.
  */
  toEmbedThisFrameInYourDocument:
      'To embed this frame in your document, the response needs to enable the cross-origin embedder policy by specifying the following response header:',
  /**
  *@description Message in the Headers View of the Network panel when a cross-origin resource policy header needs to be set.
  */
  toUseThisResourceFromADifferent:
      'To use this resource from a different origin, the server needs to specify a cross-origin resource policy in the response headers:',
  /**
  *@description Message in the Headers View of the Network panel when the cross-origin resource policy header is too strict.
  */
  toUseThisResourceFromADifferentOrigin:
      'To use this resource from a different origin, the server may relax the cross-origin resource policy response header:',
  /**
  *@description Message in the Headers View of the Network panel when the cross-origin resource policy header is too strict.
  */
  toUseThisResourceFromADifferentSite:
      'To use this resource from a different site, the server may relax the cross-origin resource policy response header:',
};

const str_ = i18n.i18n.registerUIStrings('panels/network/components/ResponseHeaderSection.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export interface ResponseHeaderSectionData {
  request: SDK.NetworkRequest.NetworkRequest;
  toReveal?: {section: NetworkForward.UIRequestLocation.UIHeaderSection, header?: string};
}

export class ResponseHeaderSection extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-response-header-section`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #request?: Readonly<SDK.NetworkRequest.NetworkRequest>;
  #headers: HeaderDescriptor[] = [];

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [responseHeaderSectionStyles];
  }

  set data(data: ResponseHeaderSectionData) {
    this.#request = data.request;

    const headersWithIssues = [];
    if (this.#request.wasBlocked()) {
      const headerWithIssues =
          BlockedReasonDetails.get((this.#request.blockedReason() as Protocol.Network.BlockedReason));
      if (headerWithIssues) {
        if (IssuesManager.RelatedIssue.hasIssueOfCategory(
                this.#request, IssuesManager.Issue.IssueCategory.CrossOriginEmbedderPolicy)) {
          const followLink = (): void => {
            Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.LearnMoreLinkCOEP);
            if (this.#request) {
              void IssuesManager.RelatedIssue.reveal(
                  this.#request, IssuesManager.Issue.IssueCategory.CrossOriginEmbedderPolicy);
            }
          };
          if (headerWithIssues.blockedDetails) {
            headerWithIssues.blockedDetails.reveal = followLink;
          }
        }
        headersWithIssues.push(headerWithIssues);
      }
    }

    function mergeHeadersWithIssues(
        headers: HeaderDescriptor[], headersWithIssues: HeaderDescriptor[]): HeaderDescriptor[] {
      let i = 0, j = 0;
      const result: HeaderDescriptor[] = [];
      while (i < headers.length && j < headersWithIssues.length) {
        if (headers[i].name < headersWithIssues[j].name) {
          result.push({...headers[i++], headerNotSet: false});
        } else if (headers[i].name > headersWithIssues[j].name) {
          result.push({...headersWithIssues[j++], headerNotSet: true});
        } else {
          result.push({...headersWithIssues[j++], ...headers[i++], headerNotSet: false});
        }
      }
      while (i < headers.length) {
        result.push({...headers[i++], headerNotSet: false});
      }
      while (j < headersWithIssues.length) {
        result.push({...headersWithIssues[j++], headerNotSet: true});
      }
      return result;
    }

    this.#headers = this.#request.sortedResponseHeaders.map(
        header => ({name: header.name.toLowerCase(), value: header.value, headerNotSet: false}));
    this.#headers = mergeHeadersWithIssues(this.#headers, headersWithIssues);

    const blockedResponseCookies = this.#request.blockedResponseCookies();
    const blockedCookieLineToReasons = new Map<string, Protocol.Network.SetCookieBlockedReason[]>(
        blockedResponseCookies?.map(c => [c.cookieLine, c.blockedReasons]));
    for (const header of this.#headers) {
      if (header.name === 'set-cookie' && header.value) {
        const matchingBlockedReasons = blockedCookieLineToReasons.get(header.value);
        if (matchingBlockedReasons) {
          header.setCookieBlockedReasons = matchingBlockedReasons;
        }
      }
    }

    if (data.toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.Response) {
      this.#headers.filter(header => header.name === data.toReveal?.header?.toLowerCase()).forEach(header => {
        header.highlight = true;
      });
    }

    this.#render();
  }

  #render(): void {
    if (!this.#request) {
      return;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      ${this.#headers.map(header => html`
        <${HeaderSectionRow.litTagName} .data=${{
          header: header,
        } as HeaderSectionRowData}></${HeaderSectionRow.litTagName}>
      `)}
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-response-header-section', ResponseHeaderSection);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-response-header-section': ResponseHeaderSection;
  }
}

const BlockedReasonDetails = new Map<Protocol.Network.BlockedReason, HeaderDescriptor>([
  [
    Protocol.Network.BlockedReason.CoepFrameResourceNeedsCoepHeader,
    {
      name: 'cross-origin-embedder-policy',
      value: null,
      headerValueIncorrect: null,
      blockedDetails: {
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
      blockedDetails: {
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
      blockedDetails: {
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
      blockedDetails: {
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
      blockedDetails: {
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
