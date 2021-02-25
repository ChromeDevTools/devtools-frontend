// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';

import {Issue, IssueCategory, IssueKind, LazyMarkdownIssueDescription, MarkdownIssueDescription, resolveLazyDescription,} from './Issue.js';  // eslint-disable-line no-unused-vars
import {IssuesModel} from './IssuesModel.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Title for CSP url link
  */
  contentSecurityPolicySource: 'Content Security Policy - Source Allowlists',
  /**
  *@description Title for CSP inline issue link
  */
  contentSecurityPolicyInlineCode: 'Content Security Policy - Inline Code',
  /**
  *@description Title for the CSP eval link
  */
  contentSecurityPolicyEval: 'Content Security Policy - Eval',
  /**
  *@description Title for Trusted Types policy violation issue link
  */
  trustedTypesFixViolations: 'Trusted Types - Fix violations',
  /**
  *@description Title for Trusted Types policy violation issue link
  */
  trustedTypesPolicyViolation: 'Trusted Types - Policy violation',
};
const str_ = i18n.i18n.registerUIStrings('sdk/ContentSecurityPolicyIssue.js', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class ContentSecurityPolicyIssue extends Issue {
  /**
   * @param {!Protocol.Audits.ContentSecurityPolicyIssueDetails} issueDetails
   * @param {!IssuesModel} issuesModel
   */
  constructor(issueDetails, issuesModel) {
    const issueCode = [
      Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue, issueDetails.contentSecurityPolicyViolationType
    ].join('::');
    super(issueCode, issuesModel);
    this._issueDetails = issueDetails;
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
    return resolveLazyDescription(issueDescriptions.get(this._issueDetails.contentSecurityPolicyViolationType));
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
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{
    link: 'https://developers.google.com/web/fundamentals/security/csp#source_allowlists',
    linkTitle: i18nLazyString(UIStrings.contentSecurityPolicySource)
  }],
};

const cspInlineViolation = {
  file: 'issues/descriptions/cspInlineViolation.md',
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{
    link: 'https://developers.google.com/web/fundamentals/security/csp#inline_code_is_considered_harmful',
    linkTitle: i18nLazyString(UIStrings.contentSecurityPolicyInlineCode)
  }],
};

const cspEvalViolation = {
  file: 'issues/descriptions/cspEvalViolation.md',
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{
    link: 'https://developers.google.com/web/fundamentals/security/csp#eval_too',
    linkTitle: i18nLazyString(UIStrings.contentSecurityPolicyEval)
  }],
};

const cspTrustedTypesSinkViolation = {
  file: 'issues/descriptions/cspTrustedTypesSinkViolation.md',
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{
    link: 'https://web.dev/trusted-types/#fix-the-violations',
    linkTitle: i18nLazyString(UIStrings.trustedTypesFixViolations)
  }],
};

const cspTrustedTypesPolicyViolation = {
  file: 'issues/descriptions/cspTrustedTypesPolicyViolation.md',
  substitutions: undefined,
  issueKind: IssueKind.BreakingChange,
  links: [{link: 'https://web.dev/trusted-types/', linkTitle: i18nLazyString(UIStrings.trustedTypesPolicyViolation)}],
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

/** @type {string} */
export const trustedTypesSinkViolationCode = [
  Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
  Protocol.Audits.ContentSecurityPolicyViolationType.KTrustedTypesSinkViolation
].join('::');

/** @type {string} */
export const trustedTypesPolicyViolationCode = [
  Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
  Protocol.Audits.ContentSecurityPolicyViolationType.KTrustedTypesPolicyViolation
].join('::');

// TODO(crbug.com/1082628): Add handling of other CSP violation types later as they'll need more work.
/** @type {!Map<!Protocol.Audits.ContentSecurityPolicyViolationType, !LazyMarkdownIssueDescription>} */
const issueDescriptions = new Map([
  [Protocol.Audits.ContentSecurityPolicyViolationType.KURLViolation, cspURLViolation],
  [Protocol.Audits.ContentSecurityPolicyViolationType.KInlineViolation, cspInlineViolation],
  [Protocol.Audits.ContentSecurityPolicyViolationType.KEvalViolation, cspEvalViolation],
  [Protocol.Audits.ContentSecurityPolicyViolationType.KTrustedTypesSinkViolation, cspTrustedTypesSinkViolation],
  [Protocol.Audits.ContentSecurityPolicyViolationType.KTrustedTypesPolicyViolation, cspTrustedTypesPolicyViolation],
]);
