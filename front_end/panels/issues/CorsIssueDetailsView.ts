// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';
import {AggregatedIssue} from './IssueAggregator.js';
import {IssueView} from './IssueView.js';

const UIStrings = {
  /**
  *@description Label for number of affected resources indication in issue view
  */
  nRequests: '{n, plural, =1 { request} other { requests}}',
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
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/CorsIssueDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CorsIssueDetailsView extends AffectedResourcesView {
  private issue: AggregatedIssue;

  constructor(parentView: IssueView, issue: AggregatedIssue) {
    super(parentView);
    this.issue = issue;
    this.affectedResourcesCountElement.classList.add('cors-issue-affected-resource-label');
  }

  private appendStatus(element: HTMLElement, isWarning: boolean): void {
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

  protected getResourceName(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nRequests, {n: count});
  }

  private appendDetails(issueCode: string, issues: Iterable<IssuesManager.CorsIssue.CorsIssue>): void {
    const header = document.createElement('tr');
    this.appendColumnTitle(header, i18nString(UIStrings.request));
    this.appendColumnTitle(header, i18nString(UIStrings.status));
    if (issueCode === IssuesManager.CorsIssue.InvalidHeaders) {
      this.appendColumnTitle(header, i18nString(UIStrings.preflightRequestIfProblematic));
      this.appendColumnTitle(header, i18nString(UIStrings.header));
      this.appendColumnTitle(header, i18nString(UIStrings.problem));
      this.appendColumnTitle(header, i18nString(UIStrings.invalidValue));
    } else if (issueCode === IssuesManager.CorsIssue.WildcardOriginWithCredentials) {
      this.appendColumnTitle(header, i18nString(UIStrings.preflightRequestIfProblematic));
    } else if (issueCode === IssuesManager.CorsIssue.PreflightResponseInvalid) {
      this.appendColumnTitle(header, i18nString(UIStrings.preflightRequest));
      this.appendColumnTitle(header, i18nString(UIStrings.problem));
    } else if (issueCode === IssuesManager.CorsIssue.OriginMismatch) {
      this.appendColumnTitle(header, i18nString(UIStrings.preflightRequestIfProblematic));
      this.appendColumnTitle(header, i18nString(UIStrings.initiatorContext));
      this.appendColumnTitle(header, i18nString(UIStrings.allowedOrigin));
    } else if (issueCode === IssuesManager.CorsIssue.AllowCredentialsRequired) {
      this.appendColumnTitle(header, i18nString(UIStrings.preflightRequestIfProblematic));
      this.appendColumnTitle(header, i18nString(UIStrings.allowCredentialsValueFromHeader));
    } else {
      this.appendColumnTitle(header, i18nString(UIStrings.resourceAddressSpace));
      this.appendColumnTitle(header, i18nString(UIStrings.initiatorAddressSpace));
      this.appendColumnTitle(header, i18nString(UIStrings.initiatorContext));
    }

    this.affectedResources.appendChild(header);
    let count = 0;
    for (const issue of issues) {
      count++;
      this.appendDetail(issueCode, issue);
    }
    this.updateAffectedResourceCount(count);
  }

  private appendSecureContextCell(element: HTMLElement, isSecureContext: boolean|undefined): void {
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
        return 'Access-Control-Allow-Methods';
      case Protocol.Network.CorsError.PreflightMissingAllowOriginHeader:
      case Protocol.Network.CorsError.PreflightMultipleAllowOriginValues:
      case Protocol.Network.CorsError.PreflightInvalidAllowOriginValue:
      case Protocol.Network.CorsError.MissingAllowOriginHeader:
      case Protocol.Network.CorsError.MultipleAllowOriginValues:
      case Protocol.Network.CorsError.InvalidAllowOriginValue:
        return 'Access-Control-Allow-Origin';
    }
    throw new Error('Invalid Argument');
  }

  private static getProblemFromError(corsError: Protocol.Network.CorsErrorStatus): string {
    switch (corsError.corsError) {
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
    }
    throw new Error('Invalid Argument');
  }

  private appendDetail(issueCode: string, issue: IssuesManager.CorsIssue.CorsIssue): void {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-directive');

    const details = issue.details();
    element.appendChild(this.createRequestCell(details.request));
    this.appendStatus(element, details.isWarning);

    const corsError = details.corsErrorStatus.corsError;
    if (issueCode === IssuesManager.CorsIssue.InvalidHeaders) {
      if (corsError.includes('Preflight')) {
        element.appendChild(this.createRequestCell(details.request, {linkToPreflight: true}));
      } else {
        this.appendIssueDetailCell(element, '');
      }
      this.appendIssueDetailCell(element, CorsIssueDetailsView.getHeaderFromError(corsError), 'code-example');
      this.appendIssueDetailCell(element, CorsIssueDetailsView.getProblemFromError(details.corsErrorStatus));
      this.appendIssueDetailCell(element, details.corsErrorStatus.failedParameter, 'code-example');
    } else if (issueCode === IssuesManager.CorsIssue.WildcardOriginWithCredentials) {
      if (corsError.includes('Preflight')) {
        element.appendChild(this.createRequestCell(details.request, {linkToPreflight: true}));
      } else {
        this.appendIssueDetailCell(element, '');
      }
    } else if (issueCode === IssuesManager.CorsIssue.PreflightResponseInvalid) {
      element.appendChild(this.createRequestCell(details.request, {linkToPreflight: true}));
      this.appendIssueDetailCell(element, CorsIssueDetailsView.getProblemFromError(details.corsErrorStatus));
    } else if (issueCode === IssuesManager.CorsIssue.OriginMismatch) {
      if (corsError.includes('Preflight')) {
        element.appendChild(this.createRequestCell(details.request, {linkToPreflight: true}));
      } else {
        this.appendIssueDetailCell(element, '');
      }
      this.appendIssueDetailCell(element, details.initiatorOrigin ?? '', 'code-example');
      this.appendIssueDetailCell(element, details.corsErrorStatus.failedParameter, 'code-example');
    } else if (issueCode === IssuesManager.CorsIssue.AllowCredentialsRequired) {
      if (corsError.includes('Preflight')) {
        element.appendChild(this.createRequestCell(details.request, {linkToPreflight: true}));
      } else {
        this.appendIssueDetailCell(element, '');
      }
      this.appendIssueDetailCell(element, details.corsErrorStatus.failedParameter, 'code-example');
    } else {
      this.appendIssueDetailCell(element, details.resourceIPAddressSpace ?? '');
      this.appendIssueDetailCell(element, details.clientSecurityState?.initiatorIPAddressSpace ?? '');
      this.appendSecureContextCell(element, details.clientSecurityState?.initiatorIsSecureContext);
    }


    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    this.appendDetails(this.issue.code(), this.issue.getCorsIssues());
  }
}
