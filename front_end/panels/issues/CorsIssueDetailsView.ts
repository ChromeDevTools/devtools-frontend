// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/request_link_icon/request_link_icon.js';

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import type * as Logs from '../../models/logs/logs.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import type * as RequestLinkIcon from '../../ui/components/request_link_icon/request_link_icon.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';

import {AffectedItem, AffectedResourcesView} from './AffectedResourcesView.js';
import type {IssueView} from './IssueView.js';

const {widget} = UI.Widget;

export interface RequestCellData {
  affectedRequest: Protocol.Audits.AffectedRequest;
  linkToPreflight?: boolean;
  highlightHeader?: {section: NetworkForward.UIRequestLocation.UIHeaderSection, name: string};
  additionalOnClickAction?: () => void;
}

export interface SourceLocationData {
  target: SDK.Target.Target|null;
  scriptId: Protocol.Runtime.ScriptId|null;
  url: Platform.DevToolsPath.UrlString;
  lineNumber: number;
  columnNumber?: number;
}

export interface CorsRow {
  request: RequestCellData;
  isWarning: boolean;
  preflight?: RequestCellData;
  header: string;
  problem: string;
  failedParameter: string;
  initiatorOrigin: string;
  resourceIPAddressSpace: string;
  initiatorIPAddressSpace: string;
  initiatorIsSecureContext: boolean|undefined;
  sourceLocation?: SourceLocationData;
}

export interface ViewInput {
  issueCode?: IssuesManager.CorsIssue.IssueCode;
  rows: CorsRow[];
  requestResolver: Logs.RequestResolver.RequestResolver;
}

export type View = (input: ViewInput, _output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const renderStatus = (isWarning: boolean): LitTemplate => html`
    <td class=${isWarning ? 'affected-resource-report-only-status' : 'affected-resource-blocked-status'}>
      ${isWarning ? i18nString(UIStrings.warning) : i18nString(UIStrings.blocked)}
    </td>
  `;

  const renderRequestCell = (request: RequestCellData): LitTemplate => {
    // clang-format off
    return html`
      <td class="affected-resource-cell">
        <devtools-request-link-icon .data=${{
          ...request,
          requestResolver: input.requestResolver,
          displayURL: true,
        } as RequestLinkIcon.RequestLinkIcon.RequestLinkIconData}></devtools-request-link-icon>
      </td>
    `;
    // clang-format on
  };

  const renderPreflightCell = (preflight: RequestCellData|undefined): LitTemplate =>
      preflight ? renderRequestCell(preflight) : html`<td></td>`;

  const renderCodeExampleCell = (text: string): LitTemplate => html`<td class="code-example">${text}</td>`;

  const renderSourceLocationCell = (location: SourceLocationData|undefined): LitTemplate => {
    if (!location) {
      return html`<td class="affected-source-location"></td>`;
    }
    // clang-format off
    return html`
      <td class="affected-source-location">${
        widget(Components.Linkifier.ScriptLocationLink, {
          target: location.target ?? undefined,
          scriptId: location.scriptId ?? undefined,
          sourceURL: location.url,
          lineNumber: location.lineNumber,
          options: {
            columnNumber: location.columnNumber,
            maxLength: UI.UIUtils.MaxLengthForDisplayedURLsInConsole,
            jslogContext: 'source-location',
          },
        })}</td>
    `;
    // clang-format on
  };

  const renderSecureContextCell = (isSecureContext: boolean|undefined): LitTemplate => html`
    <td>${
      isSecureContext === undefined ? nothing :
          isSecureContext           ? i18nString(UIStrings.secure) :
                                      i18nString(UIStrings.insecure)}</td>
  `;

  const renderExtraHeaderColumns = (issueCode: IssuesManager.CorsIssue.IssueCode): LitTemplate => {
    switch (issueCode) {
      case IssuesManager.CorsIssue.IssueCode.INVALID_HEADER_VALUES:
        // clang-format off
        return html`
          <td class="affected-resource-header">${i18nString(UIStrings.preflightRequestIfProblematic)}</td>
          <td class="affected-resource-header">${i18nString(UIStrings.header)}</td>
          <td class="affected-resource-header">${i18nString(UIStrings.problem)}</td>
          <td class="affected-resource-header">${i18nString(UIStrings.invalidValue)}</td>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.WILDCARD_ORIGN_NOT_ALLOWED:
        return html`<td class="affected-resource-header">${i18nString(UIStrings.preflightRequestIfProblematic)}</td>`;
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_RESPONSE_INVALID:
        // clang-format off
        return html`
          <td class="affected-resource-header">${i18nString(UIStrings.preflightRequest)}</td>
          <td class="affected-resource-header">${i18nString(UIStrings.problem)}</td>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.ORIGIN_MISMATCH:
        // clang-format off
        return html`
          <td class="affected-resource-header">${i18nString(UIStrings.preflightRequestIfProblematic)}</td>
          <td class="affected-resource-header">${i18nString(UIStrings.initiatorContext)}</td>
          <td class="affected-resource-header">${i18nString(UIStrings.allowedOrigin)}</td>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.ALLOW_CREDENTIALS_REQUIRED:
        // clang-format off
        return html`
          <td class="affected-resource-header">${i18nString(UIStrings.preflightRequestIfProblematic)}</td>
          <td class="affected-resource-header">${i18nString(UIStrings.allowCredentialsValueFromHeader)}</td>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.INSECURE_LOCAL_NETWORK:
        // clang-format off
        return html`
          <td class="affected-resource-header">${i18nString(UIStrings.resourceAddressSpace)}</td>
          <td class="affected-resource-header">${i18nString(UIStrings.initiatorAddressSpace)}</td>
          <td class="affected-resource-header">${i18nString(UIStrings.initiatorContext)}</td>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.METHOD_DISALLOWED_BY_PREFLIGHT_RESPONSE:
        // clang-format off
        return html`
          <td class="affected-resource-header">${i18nString(UIStrings.preflightRequest)}</td>
          <td class="affected-resource-header">${i18nString(UIStrings.disallowedRequestMethod)}</td>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.HEADER_DISALLOWED_BY_PREFLIGHT_RESPONSE:
        // clang-format off
        return html`
          <td class="affected-resource-header">${i18nString(UIStrings.preflightRequest)}</td>
          <td class="affected-resource-header">${i18nString(UIStrings.disallowedRequestHeader)}</td>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.DISALLOWED_BY_MODE:
        // clang-format off
        return html`
          <td class="affected-resource-header">${i18nString(UIStrings.initiatorContext)}</td>
          <td class="affected-resource-header">${i18nString(UIStrings.sourceLocation)}</td>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.CORS_DISABLED_SCHEME:
        // clang-format off
        return html`
          <td class="affected-resource-header">${i18nString(UIStrings.initiatorContext)}</td>
          <td class="affected-resource-header">${i18nString(UIStrings.sourceLocation)}</td>
          <td class="affected-resource-header">${i18nString(UIStrings.unsupportedScheme)}</td>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.NO_CORS_REDIRECT_MODE_NOT_FOLLOW:
        return html`<td class="affected-resource-header">${i18nString(UIStrings.sourceLocation)}</td>`;
      case IssuesManager.CorsIssue.IssueCode.REDIRECT_CONTAINS_CREDENTIALS:
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_MISSING_ALLOW_EXTERNAL:
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_INVALID_ALLOW_EXTERNAL:
      case IssuesManager.CorsIssue.IssueCode.INVALID_LOCAL_NETWORK_ACCESS:
      case IssuesManager.CorsIssue.IssueCode.LOCAL_NETWORK_ACCESS_PERMISSION_DENIED:
        return nothing;
      default:
        Platform.assertNever(issueCode, 'Unknown issue code: ' + issueCode);
    }
  };

  const renderRow = (issueCode: IssuesManager.CorsIssue.IssueCode, row: CorsRow): LitTemplate => {
    switch (issueCode) {
      case IssuesManager.CorsIssue.IssueCode.INVALID_HEADER_VALUES:
        // clang-format off
        return html`
          <tr class="affected-resource-directive">
            ${renderRequestCell(row.request)}
            ${renderStatus(row.isWarning)}
            ${renderPreflightCell(row.preflight)}
            ${renderCodeExampleCell(row.header)}
            <td>${row.problem}</td>
            ${renderCodeExampleCell(row.failedParameter)}
          </tr>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.WILDCARD_ORIGN_NOT_ALLOWED:
        // clang-format off
        return html`
          <tr class="affected-resource-directive">
            ${renderRequestCell(row.request)}
            ${renderStatus(row.isWarning)}
            ${renderPreflightCell(row.preflight)}
          </tr>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_RESPONSE_INVALID:
        // clang-format off
        return html`
          <tr class="affected-resource-directive">
            ${renderRequestCell(row.request)}
            ${renderStatus(row.isWarning)}
            ${renderPreflightCell(row.preflight)}
            <td>${row.problem}</td>
          </tr>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.ORIGIN_MISMATCH:
        // clang-format off
        return html`
          <tr class="affected-resource-directive">
            ${renderRequestCell(row.request)}
            ${renderStatus(row.isWarning)}
            ${renderPreflightCell(row.preflight)}
            ${renderCodeExampleCell(row.initiatorOrigin)}
            ${renderCodeExampleCell(row.failedParameter)}
          </tr>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.ALLOW_CREDENTIALS_REQUIRED:
      case IssuesManager.CorsIssue.IssueCode.METHOD_DISALLOWED_BY_PREFLIGHT_RESPONSE:
      case IssuesManager.CorsIssue.IssueCode.HEADER_DISALLOWED_BY_PREFLIGHT_RESPONSE:
        // clang-format off
        return html`
          <tr class="affected-resource-directive">
            ${renderRequestCell(row.request)}
            ${renderStatus(row.isWarning)}
            ${renderPreflightCell(row.preflight)}
            ${renderCodeExampleCell(row.failedParameter)}
          </tr>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.INSECURE_LOCAL_NETWORK:
        // clang-format off
        return html`
          <tr class="affected-resource-directive">
            ${renderRequestCell(row.request)}
            ${renderStatus(row.isWarning)}
            <td>${row.resourceIPAddressSpace}</td>
            <td>${row.initiatorIPAddressSpace}</td>
            ${renderSecureContextCell(row.initiatorIsSecureContext)}
          </tr>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.DISALLOWED_BY_MODE:
        // clang-format off
        return html`
          <tr class="affected-resource-directive">
            ${renderRequestCell(row.request)}
            ${renderStatus(row.isWarning)}
            ${renderCodeExampleCell(row.initiatorOrigin)}
            ${renderSourceLocationCell(row.sourceLocation)}
          </tr>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.CORS_DISABLED_SCHEME:
        // clang-format off
        return html`
          <tr class="affected-resource-directive">
            ${renderRequestCell(row.request)}
            ${renderStatus(row.isWarning)}
            ${renderCodeExampleCell(row.initiatorOrigin)}
            ${renderSourceLocationCell(row.sourceLocation)}
            ${renderCodeExampleCell(row.failedParameter)}
          </tr>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.NO_CORS_REDIRECT_MODE_NOT_FOLLOW:
        // clang-format off
        return html`
          <tr class="affected-resource-directive">
            ${renderRequestCell(row.request)}
            ${renderStatus(row.isWarning)}
            ${renderSourceLocationCell(row.sourceLocation)}
          </tr>
        `;
        // clang-format on
      case IssuesManager.CorsIssue.IssueCode.REDIRECT_CONTAINS_CREDENTIALS:
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_MISSING_ALLOW_EXTERNAL:
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_INVALID_ALLOW_EXTERNAL:
      case IssuesManager.CorsIssue.IssueCode.INVALID_LOCAL_NETWORK_ACCESS:
      case IssuesManager.CorsIssue.IssueCode.LOCAL_NETWORK_ACCESS_PERMISSION_DENIED:
        // clang-format off
        return html`
          <tr class="affected-resource-directive">
            ${renderRequestCell(row.request)}
            ${renderStatus(row.isWarning)}
          </tr>
        `;
        // clang-format on
      default:
        Platform.assertNever(issueCode, 'Unknown issue code: ' + issueCode);
    }
  };

  const issueCode = input.issueCode;
  // clang-format off
  render(issueCode ? html`
    <tr>
      <td class="affected-resource-header">${i18nString(UIStrings.request)}</td>
      <td class="affected-resource-header">${i18nString(UIStrings.status)}</td>
      ${renderExtraHeaderColumns(issueCode)}
    </tr>
    ${input.rows.map(row => renderRow(issueCode, row))}
  ` : nothing, target);
  // clang-format on
};

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected requests
   * in the CORS affected resources table.
   */
  nRequests: '{n, plural, =1 {# request} other {# requests}}',
  /**
   * @description Violation status in the Issues panel indicating that a CORS
   * issue produced a warning.
   */
  warning: 'Warning',
  /**
   * @description Violation status in the Issues panel indicating that a CORS
   * request was blocked.
   */
  blocked: 'Blocked',
  /**
   * @description Column header in the Issues panel for request status in the
   * CORS affected resources table.
   */
  status: 'Status',
  /**
   * @description Column header in the Issues panel for network requests in the
   * CORS affected resources table.
   */
  request: 'Request',
  /**
   * @description Column header in the Issues panel for resource addresses in
   * the CORS affected resources table.
   */
  resourceAddressSpace: 'Resource address',
  /**
   * @description Column header in the Issues panel for initiator addresses in
   * the CORS affected resources table.
   */
  initiatorAddressSpace: 'Initiator address',
  /**
   * @description Context status in the Issues panel indicating a secure
   * initiator context.
   */
  secure: 'Secure',
  /**
   * @description Context status in the Issues panel indicating an insecure
   * initiator context.
   */
  insecure: 'Insecure',
  /**
   * @description Column header in the Issues panel for initiator context in the
   * CORS affected resources table.
   */
  initiatorContext: 'Initiator context',
  /**
   * @description Column header in the Issues panel for preflight requests when
   * problematic in the CORS affected resources table.
   */
  preflightRequestIfProblematic: 'Preflight request (if problematic)',
  /**
   * @description Column header in the Issues panel for preflight requests in
   * the CORS affected resources table.
   */
  preflightRequest: 'Preflight request',
  /**
   * @description Column header in the Issues panel for HTTP header names in the
   * CORS affected resources table.
   */
  header: 'Header',
  /**
   * @description Column header in the Issues panel for problem descriptions in
   * the CORS affected resources table.
   */
  problem: 'Problem',
  /**
   * @description Column header in the Issues panel for invalid header values in
   * the CORS affected resources table.
   */
  invalidValue: 'Invalid value (if available)',
  /**
   * @description Problem description in the Issues panel indicating that a
   * required CORS response header was missing.
   */
  problemMissingHeader: 'Missing header',
  /**
   * @description Problem description in the Issues panel indicating that a CORS
   * response header contained multiple values.
   */
  problemMultipleValues: 'Multiple values',
  /**
   * @description Problem description in the Issues panel indicating that a CORS
   * response header contained an invalid value.
   */
  problemInvalidValue: 'Invalid value',
  /**
   * @description Problem description in the Issues panel indicating that the
   * preflight response was a redirect.
   */
  preflightDisallowedRedirect: 'Response to preflight was a redirect',
  /**
   * @description Problem description in the Issues panel indicating that the
   * preflight request HTTP status was not successful.
   */
  preflightInvalidStatus: 'HTTP status of preflight request didn’t indicate success',
  /**
   * @description Column header in the Issues panel for allowed origins in the
   * CORS affected resources table.
   */
  allowedOrigin: 'Allowed origin (from header)',
  /**
   * @description Column header in the Issues panel for the
   * Access-Control-Allow-Credentials header value in the CORS affected
   * resources table.
   */
  allowCredentialsValueFromHeader: '`Access-Control-Allow-Credentials` header value',
  /**
   * @description Column header in the Issues panel for disallowed request
   * methods in the CORS affected resources table.
   */
  disallowedRequestMethod: 'Disallowed request method',
  /**
   * @description Column header in the Issues panel for disallowed request
   * headers in the CORS affected resources table.
   */
  disallowedRequestHeader: 'Disallowed request header',
  /**
   * @description Column header in the Issues panel for source locations in the
   * CORS affected resources table.
   */
  sourceLocation: 'Source location',
  /**
   * @description Column header in the Issues panel for unsupported URL schemes
   * in the CORS affected resources table.
   */
  unsupportedScheme: 'Unsupported scheme',
  /**
   * @description Problem description in the Issues panel indicating that a
   * network request failed.
   */
  failedRequest: 'Failed request',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/CorsIssueDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CorsIssueDetailsView extends AffectedResourcesView {
  readonly #view: View;
  readonly #onRequestClick = (): void => {
    Host.userMetrics.issuesPanelResourceOpened(IssuesManager.Issue.IssueCategory.CORS, AffectedItem.REQUEST);
  };

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: View = DEFAULT_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
    this.affectedResourcesCountElement.classList.add('cors-issue-affected-resource-label');
  }

  protected getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nRequests, {n: count});
  }

  #appendDetails(issueCode: IssuesManager.CorsIssue.IssueCode,
                 issues: Iterable<IssuesManager.CorsIssue.CorsIssue>): void {
    const rows: CorsRow[] = [];
    for (const issue of issues) {
      rows.push(this.#createDetailRow(issueCode, issue));
    }
    const input: ViewInput = {issueCode, rows, requestResolver: this.requestResolver};
    this.#view(input, undefined, this.affectedResources);
    this.updateAffectedResourceCount(rows.length);
  }

  private static getHeaderFromError(corsError: Protocol.Network.CorsError): string {
    switch (corsError) {
      case Protocol.Network.CorsError.InvalidAllowHeadersPreflightResponse:
        return 'Access-Control-Allow-Headers';
      case Protocol.Network.CorsError.InvalidAllowMethodsPreflightResponse:
      case Protocol.Network.CorsError.MethodDisallowedByPreflightResponse:
        return 'Access-Control-Allow-Methods';
      case Protocol.Network.CorsError.PreflightMissingAllowOriginHeader:
      case Protocol.Network.CorsError.PreflightMultipleAllowOriginValues:
      case Protocol.Network.CorsError.PreflightInvalidAllowOriginValue:
      case Protocol.Network.CorsError.MissingAllowOriginHeader:
      case Protocol.Network.CorsError.MultipleAllowOriginValues:
      case Protocol.Network.CorsError.InvalidAllowOriginValue:
      case Protocol.Network.CorsError.WildcardOriginNotAllowed:
      case Protocol.Network.CorsError.PreflightWildcardOriginNotAllowed:
      case Protocol.Network.CorsError.AllowOriginMismatch:
      case Protocol.Network.CorsError.PreflightAllowOriginMismatch:
        return 'Access-Control-Allow-Origin';
      case Protocol.Network.CorsError.InvalidAllowCredentials:
      case Protocol.Network.CorsError.PreflightInvalidAllowCredentials:
        return 'Access-Control-Allow-Credentials';
      case Protocol.Network.CorsError.RedirectContainsCredentials:
      case Protocol.Network.CorsError.PreflightDisallowedRedirect:
        return 'Location';
      case Protocol.Network.CorsError.PreflightInvalidStatus:
        return 'Status-Code';
    }
    return '';
  }

  private static getProblemFromError(corsErrorStatus: Protocol.Network.CorsErrorStatus): string {
    switch (corsErrorStatus.corsError) {
      case Protocol.Network.CorsError.InvalidAllowHeadersPreflightResponse:
      case Protocol.Network.CorsError.InvalidAllowMethodsPreflightResponse:
      case Protocol.Network.CorsError.PreflightInvalidAllowOriginValue:
      case Protocol.Network.CorsError.InvalidAllowOriginValue:
        return i18nString(UIStrings.problemInvalidValue);
      case Protocol.Network.CorsError.PreflightMultipleAllowOriginValues:
      case Protocol.Network.CorsError.MultipleAllowOriginValues:
        return i18nString(UIStrings.problemMultipleValues);
      case Protocol.Network.CorsError.MissingAllowOriginHeader:
      case Protocol.Network.CorsError.PreflightMissingAllowOriginHeader:
        return i18nString(UIStrings.problemMissingHeader);
      case Protocol.Network.CorsError.PreflightInvalidStatus:
        return i18nString(UIStrings.preflightInvalidStatus);
      case Protocol.Network.CorsError.PreflightDisallowedRedirect:
        return i18nString(UIStrings.preflightDisallowedRedirect);
      case Protocol.Network.CorsError.InvalidResponse:
        return i18nString(UIStrings.failedRequest);
    }
    throw new Error('Invalid Argument');
  }

  #createDetailRow(issueCode: IssuesManager.CorsIssue.IssueCode, issue: IssuesManager.CorsIssue.CorsIssue): CorsRow {
    const details = issue.details();
    const corsErrorStatus = details.corsErrorStatus;
    const corsError = details.corsErrorStatus.corsError;

    const highlightHeader = {
      section: NetworkForward.UIRequestLocation.UIHeaderSection.RESPONSE,
      name: CorsIssueDetailsView.getHeaderFromError(corsError),
    };

    const opts = {
      additionalOnClickAction: this.#onRequestClick,
    };

    let request: RequestCellData;
    if (issueCode === IssuesManager.CorsIssue.IssueCode.HEADER_DISALLOWED_BY_PREFLIGHT_RESPONSE) {
      request = {
        affectedRequest: details.request,
        ...opts,
        highlightHeader: {
          section: NetworkForward.UIRequestLocation.UIHeaderSection.REQUEST,
          name: corsErrorStatus.failedParameter,
        },
      };
    } else if (issueCode === IssuesManager.CorsIssue.IssueCode.REDIRECT_CONTAINS_CREDENTIALS ||
               issueCode === IssuesManager.CorsIssue.IssueCode.CORS_DISABLED_SCHEME) {
      request = {
        affectedRequest: details.request,
        ...opts,
        highlightHeader,
      };
    } else {
      request = {
        affectedRequest: details.request,
        ...opts,
      };
    }

    let preflight: RequestCellData|undefined;
    if (issueCode === IssuesManager.CorsIssue.IssueCode.PREFLIGHT_RESPONSE_INVALID) {
      const specialHighlightHeader = corsError === Protocol.Network.CorsError.PreflightInvalidStatus ? {
        section: NetworkForward.UIRequestLocation.UIHeaderSection.GENERAL,
        name: 'Status-Code',
      } :
                                                                                                       highlightHeader;
      preflight = {
        affectedRequest: details.request,
        ...opts,
        linkToPreflight: true,
        highlightHeader: specialHighlightHeader,
      };
    } else if (issueCode === IssuesManager.CorsIssue.IssueCode.METHOD_DISALLOWED_BY_PREFLIGHT_RESPONSE) {
      preflight = {affectedRequest: details.request, ...opts, linkToPreflight: true, highlightHeader};
    } else if (issueCode === IssuesManager.CorsIssue.IssueCode.HEADER_DISALLOWED_BY_PREFLIGHT_RESPONSE) {
      preflight = {
        affectedRequest: details.request,
        ...opts,
        linkToPreflight: true,
        highlightHeader: {
          section: NetworkForward.UIRequestLocation.UIHeaderSection.RESPONSE,
          name: 'Access-Control-Allow-Headers',
        },
      };
    } else if ((issueCode === IssuesManager.CorsIssue.IssueCode.INVALID_HEADER_VALUES ||
                issueCode === IssuesManager.CorsIssue.IssueCode.WILDCARD_ORIGN_NOT_ALLOWED ||
                issueCode === IssuesManager.CorsIssue.IssueCode.ORIGIN_MISMATCH ||
                issueCode === IssuesManager.CorsIssue.IssueCode.ALLOW_CREDENTIALS_REQUIRED) &&
               corsError.includes('Preflight')) {
      preflight = {affectedRequest: details.request, ...opts, linkToPreflight: true, highlightHeader};
    }

    let problem = '';
    if (issueCode === IssuesManager.CorsIssue.IssueCode.INVALID_HEADER_VALUES ||
        issueCode === IssuesManager.CorsIssue.IssueCode.PREFLIGHT_RESPONSE_INVALID) {
      problem = CorsIssueDetailsView.getProblemFromError(details.corsErrorStatus);
    }

    let sourceLocation: SourceLocationData|undefined;
    if ((issueCode === IssuesManager.CorsIssue.IssueCode.DISALLOWED_BY_MODE ||
         issueCode === IssuesManager.CorsIssue.IssueCode.CORS_DISABLED_SCHEME ||
         issueCode === IssuesManager.CorsIssue.IssueCode.NO_CORS_REDIRECT_MODE_NOT_FOLLOW) &&
        details.location) {
      sourceLocation = {
        target: issue.model()?.getTargetIfNotDisposed() || null,
        scriptId: details.location.scriptId || null,
        url: details.location.url as Platform.DevToolsPath.UrlString,
        lineNumber: details.location.lineNumber,
        columnNumber: details.location.columnNumber,
      };
    }

    return {
      request,
      isWarning: details.isWarning,
      preflight,
      header: CorsIssueDetailsView.getHeaderFromError(corsError),
      problem,
      failedParameter: details.corsErrorStatus.failedParameter ?? '',
      initiatorOrigin: details.initiatorOrigin ?? '',
      resourceIPAddressSpace: details.resourceIPAddressSpace ?? '',
      initiatorIPAddressSpace: details.clientSecurityState?.initiatorIPAddressSpace ?? '',
      initiatorIsSecureContext: details.clientSecurityState?.initiatorIsSecureContext,
      sourceLocation,
    };
  }

  update(): void {
    this.requestResolver.clear();
    const issues = this.issue.getCorsIssues();
    const issue = issues.values().next();
    if (issue.done) {
      const input: ViewInput = {rows: [], requestResolver: this.requestResolver};
      this.#view(input, undefined, this.affectedResources);
      this.updateAffectedResourceCount(0);
    } else {
      this.#appendDetails(issue.value.code(), issues);
    }
  }
}
