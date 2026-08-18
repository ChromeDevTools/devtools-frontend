// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';

import {AffectedItem, AffectedResourcesView} from './AffectedResourcesView.js';
import type {IssueView} from './IssueView.js';

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected requests in the CORS affected resources table.
   */
  nRequests: '{n, plural, =1 {# request} other {# requests}}',
  /**
   * @description Violation status in the Issues panel indicating that a CORS issue produced a warning.
   */
  warning: 'Warning',
  /**
   * @description Violation status in the Issues panel indicating that a CORS request was blocked.
   */
  blocked: 'Blocked',
  /**
   * @description Column header in the Issues panel for request status in the CORS affected resources table.
   */
  status: 'Status',
  /**
   * @description Column header in the Issues panel for network requests in the CORS affected resources table.
   */
  request: 'Request',
  /**
   * @description Column header in the Issues panel for resource addresses in the CORS affected resources table.
   */
  resourceAddressSpace: 'Resource address',
  /**
   * @description Column header in the Issues panel for initiator addresses in the CORS affected resources table.
   */
  initiatorAddressSpace: 'Initiator address',
  /**
   * @description Context status in the Issues panel indicating a secure initiator context.
   */
  secure: 'Secure',
  /**
   * @description Context status in the Issues panel indicating an insecure initiator context.
   */
  insecure: 'Insecure',
  /**
   * @description Column header in the Issues panel for initiator context in the CORS affected resources table.
   */
  initiatorContext: 'Initiator context',
  /**
   * @description Column header in the Issues panel for preflight requests when problematic in the CORS affected resources table.
   */
  preflightRequestIfProblematic: 'Preflight request (if problematic)',
  /**
   * @description Column header in the Issues panel for preflight requests in the CORS affected resources table.
   */
  preflightRequest: 'Preflight request',
  /**
   * @description Column header in the Issues panel for HTTP header names in the CORS affected resources table.
   */
  header: 'Header',
  /**
   * @description Column header in the Issues panel for problem descriptions in the CORS affected resources table.
   */
  problem: 'Problem',
  /**
   * @description Column header in the Issues panel for invalid header values in the CORS affected resources table.
   */
  invalidValue: 'Invalid value (if available)',
  /**
   * @description Problem description in the Issues panel indicating that a required CORS response header was missing.
   */
  problemMissingHeader: 'Missing header',
  /**
   * @description Problem description in the Issues panel indicating that a CORS response header contained multiple values.
   */
  problemMultipleValues: 'Multiple values',
  /**
   * @description Problem description in the Issues panel indicating that a CORS response header contained an invalid value.
   */
  problemInvalidValue: 'Invalid value',
  /**
   * @description Problem description in the Issues panel indicating that the preflight response was a redirect.
   */
  preflightDisallowedRedirect: 'Response to preflight was a redirect',
  /**
   * @description Problem description in the Issues panel indicating that the preflight request HTTP status was not successful.
   */
  preflightInvalidStatus: 'HTTP status of preflight request didn’t indicate success',
  /**
   * @description Column header in the Issues panel for allowed origins in the CORS affected resources table.
   */
  allowedOrigin: 'Allowed origin (from header)',
  /**
   * @description Column header in the Issues panel for the Access-Control-Allow-Credentials header value in the CORS affected resources table.
   */
  allowCredentialsValueFromHeader: '`Access-Control-Allow-Credentials` header value',
  /**
   * @description Column header in the Issues panel for disallowed request methods in the CORS affected resources table.
   */
  disallowedRequestMethod: 'Disallowed request method',
  /**
   * @description Column header in the Issues panel for disallowed request headers in the CORS affected resources table.
   */
  disallowedRequestHeader: 'Disallowed request header',
  /**
   * @description Column header in the Issues panel for source locations in the CORS affected resources table.
   */
  sourceLocation: 'Source location',
  /**
   * @description Column header in the Issues panel for unsupported URL schemes in the CORS affected resources table.
   */
  unsupportedScheme: 'Unsupported scheme',
  /**
   * @description Problem description in the Issues panel indicating that a network request failed.
   */
  failedRequest: 'Failed request',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/CorsIssueDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CorsIssueDetailsView extends AffectedResourcesView {
  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string) {
    super(parent, issue, jslogContext);
    this.affectedResourcesCountElement.classList.add('cors-issue-affected-resource-label');
  }

  #appendStatus(element: HTMLElement, isWarning: boolean): void {
    const status = document.createElement('td');
    if (isWarning) {
      status.classList.add('affected-resource-report-only-status');
      status.textContent = i18nString(UIStrings.warning);
    } else {
      status.classList.add('affected-resource-blocked-status');
      status.textContent = i18nString(UIStrings.blocked);
    }
    element.appendChild(status);
  }

  protected getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nRequests, {n: count});
  }

  #appendDetails(issueCode: IssuesManager.CorsIssue.IssueCode, issues: Iterable<IssuesManager.CorsIssue.CorsIssue>):
      void {
    const header = document.createElement('tr');
    this.appendColumnTitle(header, i18nString(UIStrings.request));
    this.appendColumnTitle(header, i18nString(UIStrings.status));
    switch (issueCode) {
      case IssuesManager.CorsIssue.IssueCode.INVALID_HEADER_VALUES:
        this.appendColumnTitle(header, i18nString(UIStrings.preflightRequestIfProblematic));
        this.appendColumnTitle(header, i18nString(UIStrings.header));
        this.appendColumnTitle(header, i18nString(UIStrings.problem));
        this.appendColumnTitle(header, i18nString(UIStrings.invalidValue));
        break;
      case IssuesManager.CorsIssue.IssueCode.WILDCARD_ORIGN_NOT_ALLOWED:
        this.appendColumnTitle(header, i18nString(UIStrings.preflightRequestIfProblematic));
        break;
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_RESPONSE_INVALID:
        this.appendColumnTitle(header, i18nString(UIStrings.preflightRequest));
        this.appendColumnTitle(header, i18nString(UIStrings.problem));
        break;
      case IssuesManager.CorsIssue.IssueCode.ORIGIN_MISMATCH:
        this.appendColumnTitle(header, i18nString(UIStrings.preflightRequestIfProblematic));
        this.appendColumnTitle(header, i18nString(UIStrings.initiatorContext));
        this.appendColumnTitle(header, i18nString(UIStrings.allowedOrigin));
        break;
      case IssuesManager.CorsIssue.IssueCode.ALLOW_CREDENTIALS_REQUIRED:
        this.appendColumnTitle(header, i18nString(UIStrings.preflightRequestIfProblematic));
        this.appendColumnTitle(header, i18nString(UIStrings.allowCredentialsValueFromHeader));
        break;
      case IssuesManager.CorsIssue.IssueCode.INSECURE_LOCAL_NETWORK:
        this.appendColumnTitle(header, i18nString(UIStrings.resourceAddressSpace));
        this.appendColumnTitle(header, i18nString(UIStrings.initiatorAddressSpace));
        this.appendColumnTitle(header, i18nString(UIStrings.initiatorContext));
        break;
      case IssuesManager.CorsIssue.IssueCode.METHOD_DISALLOWED_BY_PREFLIGHT_RESPONSE:
        this.appendColumnTitle(header, i18nString(UIStrings.preflightRequest));
        this.appendColumnTitle(header, i18nString(UIStrings.disallowedRequestMethod));
        break;
      case IssuesManager.CorsIssue.IssueCode.HEADER_DISALLOWED_BY_PREFLIGHT_RESPONSE:
        this.appendColumnTitle(header, i18nString(UIStrings.preflightRequest));
        this.appendColumnTitle(header, i18nString(UIStrings.disallowedRequestHeader));
        break;
      case IssuesManager.CorsIssue.IssueCode.REDIRECT_CONTAINS_CREDENTIALS:
        // The default columns suffice.
        break;
      case IssuesManager.CorsIssue.IssueCode.DISALLOWED_BY_MODE:
        this.appendColumnTitle(header, i18nString(UIStrings.initiatorContext));
        this.appendColumnTitle(header, i18nString(UIStrings.sourceLocation));
        break;
      case IssuesManager.CorsIssue.IssueCode.CORS_DISABLED_SCHEME:
        this.appendColumnTitle(header, i18nString(UIStrings.initiatorContext));
        this.appendColumnTitle(header, i18nString(UIStrings.sourceLocation));
        this.appendColumnTitle(header, i18nString(UIStrings.unsupportedScheme));
        break;
      case IssuesManager.CorsIssue.IssueCode.NO_CORS_REDIRECT_MODE_NOT_FOLLOW:
        this.appendColumnTitle(header, i18nString(UIStrings.sourceLocation));
        break;
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_MISSING_ALLOW_EXTERNAL:
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_INVALID_ALLOW_EXTERNAL:
      case IssuesManager.CorsIssue.IssueCode.INVALID_LOCAL_NETWORK_ACCESS:
      case IssuesManager.CorsIssue.IssueCode.LOCAL_NETWORK_ACCESS_PERMISSION_DENIED:
        // The default columns suffice.
        break;
      default:
        Platform.assertNever(issueCode, 'Unknow issue code ' + issueCode);
    }

    this.affectedResources.appendChild(header);
    let count = 0;
    for (const issue of issues) {
      count++;
      this.#appendDetail(issueCode, issue);
    }
    this.updateAffectedResourceCount(count);
  }

  #appendSecureContextCell(element: HTMLElement, isSecureContext: boolean|undefined): void {
    if (isSecureContext === undefined) {
      this.appendIssueDetailCell(element, '');
      return;
    }
    this.appendIssueDetailCell(
        element, isSecureContext ? i18nString(UIStrings.secure) : i18nString(UIStrings.insecure));
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

  #appendDetail(issueCode: IssuesManager.CorsIssue.IssueCode, issue: IssuesManager.CorsIssue.CorsIssue): void {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-directive');

    const details = issue.details();
    const corsErrorStatus = details.corsErrorStatus;
    const corsError = details.corsErrorStatus.corsError;

    const highlightHeader = {
      section: NetworkForward.UIRequestLocation.UIHeaderSection.RESPONSE,
      name: CorsIssueDetailsView.getHeaderFromError(corsError),
    };

    const opts = {
      additionalOnClickAction(): void {
        Host.userMetrics.issuesPanelResourceOpened(IssuesManager.Issue.IssueCategory.CORS, AffectedItem.REQUEST);
      },
    };

    switch (issueCode) {
      case IssuesManager.CorsIssue.IssueCode.INVALID_HEADER_VALUES:
        element.appendChild(this.createRequestCell(details.request, opts));
        this.#appendStatus(element, details.isWarning);
        if (corsError.includes('Preflight')) {
          element.appendChild(
              this.createRequestCell(details.request, {...opts, linkToPreflight: true, highlightHeader}));
        } else {
          this.appendIssueDetailCell(element, '');
        }
        this.appendIssueDetailCell(element, CorsIssueDetailsView.getHeaderFromError(corsError), 'code-example');
        this.appendIssueDetailCell(element, CorsIssueDetailsView.getProblemFromError(details.corsErrorStatus));
        this.appendIssueDetailCell(element, details.corsErrorStatus.failedParameter, 'code-example');
        break;
      case IssuesManager.CorsIssue.IssueCode.WILDCARD_ORIGN_NOT_ALLOWED:
        element.appendChild(this.createRequestCell(details.request, opts));
        this.#appendStatus(element, details.isWarning);
        if (corsError.includes('Preflight')) {
          element.appendChild(
              this.createRequestCell(details.request, {...opts, linkToPreflight: true, highlightHeader}));
        } else {
          this.appendIssueDetailCell(element, '');
        }
        break;
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_RESPONSE_INVALID: {
        element.appendChild(this.createRequestCell(details.request, opts));
        this.#appendStatus(element, details.isWarning);
        const specialHighlightHeader = corsError === Protocol.Network.CorsError.PreflightInvalidStatus ?
            {
              section: NetworkForward.UIRequestLocation.UIHeaderSection.GENERAL,
              name: 'Status-Code',
            } :
            highlightHeader;
        element.appendChild(this.createRequestCell(
            details.request, {...opts, linkToPreflight: true, highlightHeader: specialHighlightHeader}));
        this.appendIssueDetailCell(element, CorsIssueDetailsView.getProblemFromError(details.corsErrorStatus));
        break;
      }
      case IssuesManager.CorsIssue.IssueCode.ORIGIN_MISMATCH:
        element.appendChild(this.createRequestCell(details.request, opts));
        this.#appendStatus(element, details.isWarning);
        if (corsError.includes('Preflight')) {
          element.appendChild(
              this.createRequestCell(details.request, {...opts, linkToPreflight: true, highlightHeader}));
        } else {
          this.appendIssueDetailCell(element, '');
        }
        this.appendIssueDetailCell(element, details.initiatorOrigin ?? '', 'code-example');
        this.appendIssueDetailCell(element, details.corsErrorStatus.failedParameter, 'code-example');
        break;
      case IssuesManager.CorsIssue.IssueCode.ALLOW_CREDENTIALS_REQUIRED:
        element.appendChild(this.createRequestCell(details.request, opts));
        this.#appendStatus(element, details.isWarning);
        if (corsError.includes('Preflight')) {
          element.appendChild(
              this.createRequestCell(details.request, {...opts, linkToPreflight: true, highlightHeader}));
        } else {
          this.appendIssueDetailCell(element, '');
        }
        this.appendIssueDetailCell(element, details.corsErrorStatus.failedParameter, 'code-example');
        break;
      case IssuesManager.CorsIssue.IssueCode.INSECURE_LOCAL_NETWORK:
        element.appendChild(this.createRequestCell(details.request, opts));
        this.#appendStatus(element, details.isWarning);
        this.appendIssueDetailCell(element, details.resourceIPAddressSpace ?? '');
        this.appendIssueDetailCell(element, details.clientSecurityState?.initiatorIPAddressSpace ?? '');
        this.#appendSecureContextCell(element, details.clientSecurityState?.initiatorIsSecureContext);
        break;
      case IssuesManager.CorsIssue.IssueCode.METHOD_DISALLOWED_BY_PREFLIGHT_RESPONSE:
        element.appendChild(this.createRequestCell(details.request, opts));
        this.#appendStatus(element, details.isWarning);
        element.appendChild(this.createRequestCell(details.request, {...opts, linkToPreflight: true, highlightHeader}));
        this.appendIssueDetailCell(element, details.corsErrorStatus.failedParameter, 'code-example');
        break;
      case IssuesManager.CorsIssue.IssueCode.HEADER_DISALLOWED_BY_PREFLIGHT_RESPONSE:
        element.appendChild(this.createRequestCell(details.request, {
          ...opts,
          highlightHeader: {
            section: NetworkForward.UIRequestLocation.UIHeaderSection.REQUEST,
            name: corsErrorStatus.failedParameter,
          },
        }));
        this.#appendStatus(element, details.isWarning);
        element.appendChild(this.createRequestCell(details.request, {
          ...opts,
          linkToPreflight: true,
          highlightHeader: {
            section: NetworkForward.UIRequestLocation.UIHeaderSection.RESPONSE,
            name: 'Access-Control-Allow-Headers',
          },
        }));
        this.appendIssueDetailCell(element, details.corsErrorStatus.failedParameter, 'code-example');
        break;
      case IssuesManager.CorsIssue.IssueCode.REDIRECT_CONTAINS_CREDENTIALS:
        element.appendChild(this.createRequestCell(details.request, {
          ...opts,
          highlightHeader: {
            section: NetworkForward.UIRequestLocation.UIHeaderSection.RESPONSE,
            name: CorsIssueDetailsView.getHeaderFromError(corsError),
          },
        }));
        this.#appendStatus(element, details.isWarning);
        break;
      case IssuesManager.CorsIssue.IssueCode.DISALLOWED_BY_MODE:
        element.appendChild(this.createRequestCell(details.request, opts));
        this.#appendStatus(element, details.isWarning);
        this.appendIssueDetailCell(element, details.initiatorOrigin ?? '', 'code-example');
        this.appendSourceLocation(element, details.location, issue.model()?.getTargetIfNotDisposed());
        break;
      case IssuesManager.CorsIssue.IssueCode.CORS_DISABLED_SCHEME:
        element.appendChild(this.createRequestCell(details.request, {
          ...opts,
          highlightHeader: {
            section: NetworkForward.UIRequestLocation.UIHeaderSection.RESPONSE,
            name: CorsIssueDetailsView.getHeaderFromError(corsError),
          },
        }));
        this.#appendStatus(element, details.isWarning);
        this.appendIssueDetailCell(element, details.initiatorOrigin ?? '', 'code-example');
        this.appendSourceLocation(element, details.location, issue.model()?.getTargetIfNotDisposed());
        this.appendIssueDetailCell(element, details.corsErrorStatus.failedParameter ?? '', 'code-example');
        break;
      case IssuesManager.CorsIssue.IssueCode.NO_CORS_REDIRECT_MODE_NOT_FOLLOW:
        element.appendChild(this.createRequestCell(details.request, opts));
        this.#appendStatus(element, details.isWarning);
        this.appendSourceLocation(element, details.location, issue.model()?.getTargetIfNotDisposed());
        break;
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_MISSING_ALLOW_EXTERNAL:
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_INVALID_ALLOW_EXTERNAL:
      case IssuesManager.CorsIssue.IssueCode.INVALID_LOCAL_NETWORK_ACCESS:
      case IssuesManager.CorsIssue.IssueCode.LOCAL_NETWORK_ACCESS_PERMISSION_DENIED:
        element.appendChild(this.createRequestCell(details.request, opts));
        this.#appendStatus(element, details.isWarning);
        break;
      default:
        Platform.assertNever(issueCode, 'Unknown issue code: ' + issueCode);
    }

    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    const issues = this.issue.getCorsIssues();
    const issue = issues.values().next();
    if (issue.done) {
      this.updateAffectedResourceCount(0);
    } else {
      this.#appendDetails(issue.value.code(), issues);
    }
  }
}
