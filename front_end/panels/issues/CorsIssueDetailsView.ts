// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';

import {AffectedItem, AffectedResourcesView} from './AffectedResourcesView.js';

import {type AggregatedIssue} from './IssueAggregator.js';
import {type IssueView} from './IssueView.js';

const UIStrings = {
  /**
   *@description Label for number of affected resources indication in issue view
   */
  nRequests: '{n, plural, =1 {# request} other {# requests}}',
  /**
   *@description Value for the status column in SharedArrayBuffer issues
   */
  warning: 'warning',
  /**
   *@description The kind of resolution for a mixed content issue
   */
  blocked: 'blocked',
  /**
   *@description Text for the status column in the item list in the CORS issue details view
   */
  status: 'Status',
  /**
   *@description Text for the column showing the associated network request in the item list in the CORS issue details view
   */
  request: 'Request',
  /**
   *@description Text for the column showing the resource's address in the item list in the CORS issue details view
   */
  resourceAddressSpace: 'Resource Address',
  /**
   *@description Text for the column showing the address of the resource load initiator in the item list in the CORS issue details view
   */
  initiatorAddressSpace: 'Initiator Address',
  /**
   *@description Text for the status of the initiator context
   */
  secure: 'secure',
  /**
   *@description Text for the status of the initiator context
   */
  insecure: 'insecure',
  /**
   *@description Title for a column showing the status of the initiator context. The initiator context is either secure or insecure depending on whether it was loaded via HTTP or HTTPS.
   */
  initiatorContext: 'Initiator Context',
  /**
   *@description Title for a column in the affected resources for a CORS issue showing a link to the associated preflight request in case the preflight request caused the issue.
   */
  preflightRequestIfProblematic: 'Preflight Request (if problematic)',
  /**
   *@description Title for a column in the affected resources for a CORS issue showing a link to the associated preflight request.
   */
  preflightRequest: 'Preflight Request',
  /**
   *@description Title for a column in the affected resources for a CORS issue showing the name of the problematic HTTP response header.
   */
  header: 'Header',
  /**
   *@description Title for a column in the affected resources for a CORS issue showing the problem associated with the resource.
   */
  problem: 'Problem',
  /**
   *@description Title for a column in the affected resources for a CORS issue showing the value that was invalid and caused the problem if it is available.
   */
  invalidValue: 'Invalid Value (if available)',
  /**
   *@description Content for the problem column in the affected resources table for a CORS issue that indicates that a response header was missing.
   */
  problemMissingHeader: 'Missing Header',
  /**
   *@description Content for the problem column in the affected resources table for a CORS issue that indicates that a response header contained multiple values.
   */
  problemMultipleValues: 'Multiple Values',
  /**
   *@description Content for the problem column in the affected resources table for a CORS issue that indicates that a response header contained an invalid value.
   */
  problemInvalidValue: 'Invalid Value',
  /**
   *@description Content for the problem column in the affected resources table for a CORS issue that indicates that the response to the preflight request was a redirect.
   */
  preflightDisallowedRedirect: 'Response to preflight was a redirect',
  /**
   *@description Content for the problem column in the affected resources table for a CORS issue that indicates that the HTTP status the preflight request was not successful.
   */
  preflightInvalidStatus: 'HTTP status of preflight request didn\'t indicate success',
  /**
   *@description Title for a column in the affected resources for a CORS issue showing the origin that was allowed according to CORS headers.
   */
  allowedOrigin: 'Allowed Origin (from header)',
  /**
   *@description Title for a column in the affected resources for a CORS issue showing the value of the Access-Control-Allow-Credentials response header.
   */
  allowCredentialsValueFromHeader: '`Access-Control-Allow-Credentials` Header Value',
  /**
   *@description Title for a column in the affected resources for a CORS issue showing the request method that was disallowed.
   */
  disallowedRequestMethod: 'Disallowed Request Method',
  /**
   *@description Title for a column in the affected resources for a CORS issue showing the request header that was disallowed.
   */
  disallowedRequestHeader: 'Disallowed Request Header',
  /**
   *@description Header for the source location column
   */
  sourceLocation: 'Source Location',
  /**
   *@description Header for the column with the URL scheme that is not supported by fetch
   */
  unsupportedScheme: 'Unsupported Scheme',
  /**
   *@description A failed network request.
   */
  failedRequest: 'Failed Request',
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/CorsIssueDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CorsIssueDetailsView extends AffectedResourcesView {
  constructor(parent: IssueView, issue: AggregatedIssue, jslogContext: string) {
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
      case IssuesManager.CorsIssue.IssueCode.INSECURE_PRIVATE_NETWORK:
        this.appendColumnTitle(header, i18nString(UIStrings.resourceAddressSpace));
        this.appendColumnTitle(header, i18nString(UIStrings.initiatorAddressSpace));
        this.appendColumnTitle(header, i18nString(UIStrings.initiatorContext));
        break;
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_ALLOW_PRIVATE_NETWORK_ERROR:
        this.appendColumnTitle(header, i18nString(UIStrings.preflightRequest));
        this.appendColumnTitle(header, i18nString(UIStrings.invalidValue));
        this.appendColumnTitle(header, i18nString(UIStrings.initiatorAddressSpace));
        this.appendColumnTitle(header, i18nString(UIStrings.initiatorContext));
        break;
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_MISSING_PRIVATE_NETWORK_ACCESS_ID:
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_MISSING_PRIVATE_NETWORK_ACCESS_NAME:
        this.appendColumnTitle(header, i18nString(UIStrings.preflightRequest));
        this.appendColumnTitle(header, i18nString(UIStrings.invalidValue));
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
      default:
        Platform.assertUnhandled<IssuesManager.CorsIssue.IssueCode.PREFLIGHT_MISSING_ALLOW_EXTERNAL|
                                 IssuesManager.CorsIssue.IssueCode.PREFLIGHT_INVALID_ALLOW_EXTERNAL|
                                 IssuesManager.CorsIssue.IssueCode.INVALID_PRIVATE_NETWORK_ACCESS|
                                 IssuesManager.CorsIssue.IssueCode.UNEXPECTED_PRIVATE_NETWORK_ACCESS|IssuesManager
                                     .CorsIssue.IssueCode.PRIVATE_NETWORK_ACCESS_PERMISSION_UNAVAILABLE|
                                 IssuesManager.CorsIssue.IssueCode.PRIVATE_NETWORK_ACCESS_PERMISSION_DENIED>(issueCode);
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
      case Protocol.Network.CorsError.PreflightMissingAllowPrivateNetwork:
      case Protocol.Network.CorsError.PreflightInvalidAllowPrivateNetwork:
        return 'Access-Control-Allow-Private-Network';
      case Protocol.Network.CorsError.RedirectContainsCredentials:
      case Protocol.Network.CorsError.PreflightDisallowedRedirect:
        return 'Location';
      case Protocol.Network.CorsError.PreflightInvalidStatus:
        return 'Status-Code';
      case Protocol.Network.CorsError.PreflightMissingPrivateNetworkAccessId:
        return 'Private-Network-Access-Id';
      case Protocol.Network.CorsError.PreflightMissingPrivateNetworkAccessName:
        return 'Private-Network-Access-Name';
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
      case IssuesManager.CorsIssue.IssueCode.INSECURE_PRIVATE_NETWORK:
        element.appendChild(this.createRequestCell(details.request, opts));
        this.#appendStatus(element, details.isWarning);
        this.appendIssueDetailCell(element, details.resourceIPAddressSpace ?? '');
        this.appendIssueDetailCell(element, details.clientSecurityState?.initiatorIPAddressSpace ?? '');
        this.#appendSecureContextCell(element, details.clientSecurityState?.initiatorIsSecureContext);
        break;
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_ALLOW_PRIVATE_NETWORK_ERROR: {
        element.appendChild(this.createRequestCell(details.request, opts));
        this.#appendStatus(element, details.isWarning);
        element.appendChild(this.createRequestCell(details.request, {...opts, linkToPreflight: true, highlightHeader}));
        this.appendIssueDetailCell(element, details.corsErrorStatus.failedParameter, 'code-example');
        this.appendIssueDetailCell(element, details.clientSecurityState?.initiatorIPAddressSpace ?? '');
        this.#appendSecureContextCell(element, details.clientSecurityState?.initiatorIsSecureContext);
        break;
      }
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
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_MISSING_PRIVATE_NETWORK_ACCESS_ID:
      case IssuesManager.CorsIssue.IssueCode.PREFLIGHT_MISSING_PRIVATE_NETWORK_ACCESS_NAME:
        element.appendChild(this.createRequestCell(details.request, opts));
        this.#appendStatus(element, details.isWarning);
        element.appendChild(this.createRequestCell(details.request, {...opts, linkToPreflight: true, highlightHeader}));
        this.appendIssueDetailCell(element, CorsIssueDetailsView.getHeaderFromError(corsError));
        this.appendIssueDetailCell(element, details.resourceIPAddressSpace ?? '');
        this.appendIssueDetailCell(element, details.clientSecurityState?.initiatorIPAddressSpace ?? '');
        this.#appendSecureContextCell(element, details.clientSecurityState?.initiatorIsSecureContext);
        break;
      default:
        element.appendChild(this.createRequestCell(details.request, opts));
        this.#appendStatus(element, details.isWarning);
        Platform.assertUnhandled<IssuesManager.CorsIssue.IssueCode.PREFLIGHT_MISSING_ALLOW_EXTERNAL|
                                 IssuesManager.CorsIssue.IssueCode.PREFLIGHT_INVALID_ALLOW_EXTERNAL|
                                 IssuesManager.CorsIssue.IssueCode.INVALID_PRIVATE_NETWORK_ACCESS|
                                 IssuesManager.CorsIssue.IssueCode.UNEXPECTED_PRIVATE_NETWORK_ACCESS|IssuesManager
                                     .CorsIssue.IssueCode.PRIVATE_NETWORK_ACCESS_PERMISSION_UNAVAILABLE|
                                 IssuesManager.CorsIssue.IssueCode.PRIVATE_NETWORK_ACCESS_PERMISSION_DENIED>(issueCode);
        break;
    }

    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    const issues = this.issue.getCorsIssues();
    if (issues.size > 0) {
      this.#appendDetails(issues.values().next().value.code(), issues);
    } else {
      this.updateAffectedResourceCount(0);
    }
  }
}
