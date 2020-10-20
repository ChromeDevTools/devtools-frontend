// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../platform/platform.js';

import {Issue, IssueCategory, IssueKind, MarkdownIssueDescription} from './Issue.js';  // eslint-disable-line no-unused-vars
import {IssuesModel} from './IssuesModel.js';  // eslint-disable-line no-unused-vars


export class ContentSecurityPolicyIssue extends Issue {
  /**
   * @param {!Protocol.Audits.ContentSecurityPolicyIssueDetails} issueDetails
   * @param {!IssuesModel} issuesModel
   */
  constructor(issueDetails, issuesModel) {
    const issue_code = [
      Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue, issueDetails.contentSecurityPolicyViolationType
    ].join('::');
    super(issue_code);
    this._issueDetails = issueDetails;
    this._issuesModel = issuesModel;
  }

  /**
   * @override
   * @return {!IssueCategory}
   */
  getCategory() {
    return IssueCategory.ContentSecurityPolicy;
  }

  /**
   * @override
   * @return {string}
   */
  primaryKey() {
    return JSON.stringify(this._issueDetails, [
      'blockedURL', 'contentSecurityPolicyViolationType', 'violatedDirective', 'isReportOnly', 'sourceCodeLocation',
      'url', 'lineNumber', 'columnNumber', 'violatingNodeId'
    ]);
  }

  /**
   * @override
   * @returns {?MarkdownIssueDescription}
   */
  getDescription() {
    const description = issueDescriptions.get(this._issueDetails.contentSecurityPolicyViolationType);
    if (description) {
      return description;
    }
    return null;
  }

  /**
   * @returns {!IssuesModel}
   */
  model() {
    return this._issuesModel;
  }

  /**
   * @returns {!Protocol.Audits.ContentSecurityPolicyIssueDetails}
   */
  details() {
    return this._issueDetails;
  }
}

const cspURLViolation = {
  file: 'issues/descriptions/cspURLViolation.md',
  issueKind: IssueKind.BreakingChange,
  links: [{
    link: 'https://developers.google.com/web/fundamentals/security/csp#source_whitelists',
    linkTitle: ls`Content Security Policy - Source Allowlists`
  }],
};

const cspInlineViolation = {
  file: 'issues/descriptions/cspInlineViolation.md',
  issueKind: IssueKind.BreakingChange,
  links: [{
    link: 'https://developers.google.com/web/fundamentals/security/csp#inline_code_is_considered_harmful',
    linkTitle: ls`Learn more: Content Security Policy - Inline Code`
  }],
};

const cspEvalViolation = {
  file: 'issues/descriptions/cspEvalViolation.md',
  issueKind: IssueKind.BreakingChange,
  links: [{
    link: 'https://developers.google.com/web/fundamentals/security/csp#eval_too',
    linkTitle: ls`Learn more: Content Security Policy - Eval`
  }],
};

/** @type {string} */
export const urlViolationCode = [
  Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
  Protocol.Audits.ContentSecurityPolicyViolationType.KURLViolation
].join('::');

/** @type {string} */
export const inlineViolationCode = [
  Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
  Protocol.Audits.ContentSecurityPolicyViolationType.KInlineViolation
].join('::');

/** @type {string} */
export const evalViolationCode = [
  Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
  Protocol.Audits.ContentSecurityPolicyViolationType.KEvalViolation
].join('::');

// TODO(crbug.com/1082628): Add handling of other CSP violation types later as they'll need more work.
/** @type {!Map<!Protocol.Audits.ContentSecurityPolicyViolationType, !MarkdownIssueDescription>} */
const issueDescriptions = new Map([
  [Protocol.Audits.ContentSecurityPolicyViolationType.KURLViolation, cspURLViolation],
  [Protocol.Audits.ContentSecurityPolicyViolationType.KInlineViolation, cspInlineViolation],
  [Protocol.Audits.ContentSecurityPolicyViolationType.KEvalViolation, cspEvalViolation],
]);
