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
import {
  type HeaderDescriptor,
  type HeaderDetailsDescriptor,
  type HeaderEditedEvent,
  type HeaderEditorDescriptor,
  HeaderSectionRow,
  type HeaderSectionRowData,
} from './HeaderSectionRow.js';
import * as Persistence from '../../../models/persistence/persistence.js';
import type * as Workspace from '../../../models/workspace/workspace.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Common from '../../../core/common/common.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';

import responseHeaderSectionStyles from './ResponseHeaderSection.css.js';

const {render, html} = LitHtml;

const UIStrings = {
  /**
  *@description Label for a button which allows adding an HTTP header.
  */
  addHeader: 'Add header',
  /**
  *@description Explanation text for which cross-origin policy to set.
  */
  chooseThisOptionIfTheResourceAnd:
      'Choose this option if the resource and the document are served from the same site.',
  /**
  *@description Default name of the HTTP header when adding a header override. Header names are lower case and cannot contain whitespace.
  */
  defaultHeaderName: 'header-name',
  /**
  *@description Default value of the HTTP header when adding a header override.
  */
  defaultHeaderValue: 'header value',
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
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

const plusIconUrl = new URL('../../../Images/plus_icon.svg', import.meta.url).toString();

const associatedDataKeyForRequest = 'ResponseHeaderSection';

export interface ResponseHeaderSectionData {
  request: SDK.NetworkRequest.NetworkRequest;
  toReveal?: {section: NetworkForward.UIRequestLocation.UIHeaderSection, header?: string};
}

export class ResponseHeaderSection extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-response-header-section`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #request?: Readonly<SDK.NetworkRequest.NetworkRequest>;
  #headerDetails: HeaderDetailsDescriptor[] = [];
  #headerEditors: HeaderEditorDescriptor[] = [];
  #uiSourceCode: Workspace.UISourceCode.UISourceCode|null = null;
  #overrides: Persistence.NetworkPersistenceManager.HeaderOverride[] = [];
  #successfullyParsedOverrides = false;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [responseHeaderSectionStyles];
  }

  set data(data: ResponseHeaderSectionData) {
    this.#request = data.request;
    this.#headerDetails =
        this.#request.sortedResponseHeaders.map(header => ({
                                                  name: Platform.StringUtilities.toLowerCaseString(header.name),
                                                  value: header.value,
                                                }));

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
        headers: HeaderDetailsDescriptor[], headersWithIssues: HeaderDetailsDescriptor[]): HeaderDetailsDescriptor[] {
      let i = 0, j = 0;
      const result: HeaderDetailsDescriptor[] = [];
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

    this.#headerDetails = mergeHeadersWithIssues(this.#headerDetails, headersWithIssues);

    const blockedResponseCookies = this.#request.blockedResponseCookies();
    const blockedCookieLineToReasons = new Map<string, Protocol.Network.SetCookieBlockedReason[]>(
        blockedResponseCookies?.map(c => [c.cookieLine, c.blockedReasons]));
    for (const header of this.#headerDetails) {
      if (header.name === 'set-cookie' && header.value) {
        const matchingBlockedReasons = blockedCookieLineToReasons.get(header.value);
        if (matchingBlockedReasons) {
          header.setCookieBlockedReasons = matchingBlockedReasons;
        }
      }
    }

    if (data.toReveal?.section === NetworkForward.UIRequestLocation.UIHeaderSection.Response) {
      this.#headerDetails.filter(header => header.name === data.toReveal?.header?.toLowerCase()).forEach(header => {
        header.highlight = true;
      });
    }

    const dataAssociatedWithRequest = this.#request.getAssociatedData(associatedDataKeyForRequest);
    if (dataAssociatedWithRequest) {
      this.#headerEditors = dataAssociatedWithRequest as HeaderEditorDescriptor[];
    } else {
      this.#headerEditors =
          this.#headerDetails.map(header => ({name: header.name, value: header.value, originalValue: header.value}));
      this.#markOverrides();
    }

    void this.#loadOverridesFileInfo();
    this.#request.setAssociatedData(associatedDataKeyForRequest, this.#headerEditors);
    this.#render();
  }

  async #loadOverridesFileInfo(): Promise<void> {
    if (!this.#request) {
      return;
    }
    this.#uiSourceCode =
        Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().getHeadersUISourceCodeFromUrl(
            this.#request.url());
    if (!this.#uiSourceCode) {
      return;
    }
    try {
      const deferredContent = await this.#uiSourceCode.requestContent();
      this.#overrides =
          JSON.parse(deferredContent.content || '[]') as Persistence.NetworkPersistenceManager.HeaderOverride[];
      if (!this.#overrides.every(Persistence.NetworkPersistenceManager.isHeaderOverride)) {
        throw 'Type mismatch after parsing';
      }
      this.#successfullyParsedOverrides = true;
      for (const header of this.#headerEditors) {
        header.valueEditable = true;
      }
      this.#render();
    } catch (error) {
      this.#successfullyParsedOverrides = false;
      console.error(
          'Failed to parse', this.#uiSourceCode?.url() || 'source code file', 'for locally overriding headers.');
    }
  }

  #markOverrides(): void {
    if (!this.#request || this.#request.originalResponseHeaders.length === 0) {
      return;
    }

    // To compare original headers and actual headers we use a map from header
    // name to an array of header values. This allows us to handle the cases
    // in which we have multiple headers with the same name (and corresponding
    // header values which may or may not occur multiple times as well). We are
    // not using MultiMaps, because a Set would not able to distinguish between
    // header values [a, a, b] and [a, b, b].
    const originalHeaders = new Map<Platform.StringUtilities.LowerCaseString, string[]>();
    for (const header of this.#request?.originalResponseHeaders || []) {
      const headerName = Platform.StringUtilities.toLowerCaseString(header.name);
      const headerValues = originalHeaders.get(headerName);
      if (headerValues) {
        headerValues.push(header.value);
      } else {
        originalHeaders.set(headerName, [header.value]);
      }
    }

    const actualHeaders = new Map<Platform.StringUtilities.LowerCaseString, string[]>();
    for (const header of this.#headerDetails) {
      const headerValues = actualHeaders.get(header.name);
      if (headerValues) {
        headerValues.push(header.value || '');
      } else {
        actualHeaders.set(header.name, [header.value || '']);
      }
    }

    const isDifferent =
        (headerName: Platform.StringUtilities.LowerCaseString,
         actualHeaders: Map<Platform.StringUtilities.LowerCaseString, string[]>,
         originalHeaders: Map<Platform.StringUtilities.LowerCaseString, string[]>): boolean => {
          const actual = actualHeaders.get(headerName);
          const original = originalHeaders.get(headerName);
          if (!actual || !original || actual.length !== original.length) {
            return true;
          }
          actual.sort();
          original.sort();
          for (let i = 0; i < actual.length; i++) {
            if (actual[i] !== original[i]) {
              return true;
            }
          }
          return false;
        };

    for (const headerName of actualHeaders.keys()) {
      // If the array of actual headers and the array of original headers do not
      // exactly match, mark all headers with 'headerName' as being overridden.
      if (isDifferent(headerName, actualHeaders, originalHeaders)) {
        this.#headerEditors.filter(header => header.name === headerName).forEach(header => {
          header.isOverride = true;
        });
      }
    }
  }

  #onHeaderEdited(event: HeaderEditedEvent): void {
    const target = event.target as HTMLElement;
    if (target.dataset.index === undefined) {
      return;
    }
    const index = Number(target.dataset.index);
    this.#updateOverrides(event.headerName, event.headerValue, index);
  }

  #updateOverrides(headerName: Platform.StringUtilities.LowerCaseString, headerValue: string, index: number): void {
    if (!this.#request) {
      return;
    }

    const previousName = this.#headerEditors[index].name;
    const previousValue = this.#headerEditors[index].value;
    this.#headerEditors[index].name = headerName;
    this.#headerEditors[index].value = headerValue;

    // If multiple headers have the same name 'foo', we treat them as a unit.
    // If there are overrides for 'foo', all original 'foo' headers are removed
    // and replaced with the override(s) for 'foo'.
    const headersToUpdate = this.#headerEditors.filter(
        header => header.name === headerName && (header.value !== header.originalValue || header.isOverride));

    const rawPath = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().rawPathFromUrl(
        this.#request.url(), true);
    const lastIndexOfSlash = rawPath.lastIndexOf('/');
    const rawFileName = Common.ParsedURL.ParsedURL.substring(rawPath, lastIndexOfSlash + 1);

    // If the last override-block matches 'rawFileName', use this last block.
    // Otherwise just append a new block at the end. We are not using earlier
    // blocks, because they could be overruled by later blocks, which contain
    // wildcards in the filenames they apply to.
    let block: Persistence.NetworkPersistenceManager.HeaderOverride|null = null;
    const [lastOverride] = this.#overrides.slice(-1);
    if (lastOverride?.applyTo === rawFileName) {
      block = lastOverride;
    } else {
      block = {
        applyTo: rawFileName,
        headers: [],
      };
      this.#overrides.push(block);
    }

    // Keep header overrides for headers with a different name.
    block.headers = block.headers.filter(header => header.name !== headerName);

    // If a header name has been edited (only possible when adding headers),
    // remove the previous override entry.
    if (this.#headerEditors[index].name !== previousName) {
      for (let i = 0; i < block.headers.length; ++i) {
        if (block.headers[i].name === previousName && block.headers[i].value === previousValue) {
          block.headers.splice(i, 1);
          break;
        }
      }
    }

    // Append freshly edited header overrides.
    for (const header of headersToUpdate) {
      block.headers.push({name: header.name, value: header.value || ''});
    }

    this.#uiSourceCode?.setWorkingCopy(JSON.stringify(this.#overrides, null, 2));
    this.#uiSourceCode?.commitWorkingCopy();
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().updateInterceptionPatterns();
  }

  #onAddHeaderClick(): void {
    this.#headerEditors.push({
      name: Platform.StringUtilities.toLowerCaseString(i18nString(UIStrings.defaultHeaderName)),
      value: i18nString(UIStrings.defaultHeaderValue),
      isOverride: true,
      nameEditable: true,
      valueEditable: true,
    });
    const index = this.#headerEditors.length - 1;
    this.#updateOverrides(this.#headerEditors[index].name, this.#headerEditors[index].value || '', index);
    this.#render();
  }

  #render(): void {
    if (!this.#request) {
      return;
    }

    const headerDescriptors: HeaderDescriptor[] =
        this.#headerEditors.map((headerEditor, index) => ({...this.#headerDetails[index], ...headerEditor}));

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      ${headerDescriptors.map((header, index) => html`
        <${HeaderSectionRow.litTagName} .data=${{
          header: header,
        } as HeaderSectionRowData} @headeredited=${this.#onHeaderEdited} data-index=${index}></${HeaderSectionRow.litTagName}>
      `)}
      ${this.#successfullyParsedOverrides ? html`
        <${Buttons.Button.Button.litTagName}
          class="add-header-button"
          .variant=${Buttons.Button.Variant.SECONDARY}
          .iconUrl=${plusIconUrl}
          @click=${this.#onAddHeaderClick}>
          ${i18nString(UIStrings.addHeader)}
        </${Buttons.Button.Button.litTagName}>
      ` : LitHtml.nothing}
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

const BlockedReasonDetails = new Map<Protocol.Network.BlockedReason, HeaderDetailsDescriptor>([
  [
    Protocol.Network.BlockedReason.CoepFrameResourceNeedsCoepHeader,
    {
      name: Platform.StringUtilities.toLowerCaseString('cross-origin-embedder-policy'),
      value: null,
      blockedDetails: {
        explanation: i18nLazyString(UIStrings.toEmbedThisFrameInYourDocument),
        examples: [{codeSnippet: 'Cross-Origin-Embedder-Policy: require-corp', comment: undefined}],
        link: {url: 'https://web.dev/coop-coep/'},
      },
    },
  ],
  [
    Protocol.Network.BlockedReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep,
    {
      name: Platform.StringUtilities.toLowerCaseString('cross-origin-resource-policy'),
      value: null,
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
    },
  ],
  [
    Protocol.Network.BlockedReason.CoopSandboxedIframeCannotNavigateToCoopPage,
    {
      name: Platform.StringUtilities.toLowerCaseString('cross-origin-opener-policy'),
      value: null,
      headerValueIncorrect: false,
      blockedDetails: {
        explanation: i18nLazyString(UIStrings.thisDocumentWasBlockedFrom),
        examples: [],
        link: {url: 'https://web.dev/coop-coep/'},
      },
    },
  ],
  [
    Protocol.Network.BlockedReason.CorpNotSameSite,
    {
      name: Platform.StringUtilities.toLowerCaseString('cross-origin-resource-policy'),
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
    },
  ],
  [
    Protocol.Network.BlockedReason.CorpNotSameOrigin,
    {
      name: Platform.StringUtilities.toLowerCaseString('cross-origin-resource-policy'),
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
    },
  ],
]);
