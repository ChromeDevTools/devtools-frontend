// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';

import {
  resolveLazyDescription,
  type LazyMarkdownIssueDescription,
  type MarkdownIssueDescription,
} from './MarkdownIssueDescription.js';

const UIStrings = {
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
   *@description Title for Trusted Types policy violation issue link. https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API
   */
  trustedTypesFixViolations: 'Trusted Types - Fix violations',
  /**
   *@description Title for Trusted Types policy violation issue link. https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API
   */
  trustedTypesPolicyViolation: 'Trusted Types - Policy violation',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/ContentSecurityPolicyIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class ContentSecurityPolicyIssue extends Issue {
  #issueDetails: Protocol.Audits.ContentSecurityPolicyIssueDetails;

  constructor(
      issueDetails: Protocol.Audits.ContentSecurityPolicyIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel,
      issueId?: Protocol.Audits.IssueId) {
    const issueCode = [
      Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
      issueDetails.contentSecurityPolicyViolationType,
    ].join('::');
    super(issueCode, issuesModel, issueId);
    this.#issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.CONTENT_SECURITY_POLICY;
  }

  primaryKey(): string {
    return JSON.stringify(this.#issueDetails, [
      'blockedURL',
      'contentSecurityPolicyViolationType',
      'violatedDirective',
      'isReportOnly',
      'sourceCodeLocation',
      'url',
      'lineNumber',
      'columnNumber',
      'violatingNodeId',
    ]);
  }

  getDescription(): MarkdownIssueDescription|null {
    const description = issueDescriptions.get(this.#issueDetails.contentSecurityPolicyViolationType);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }

  details(): Protocol.Audits.ContentSecurityPolicyIssueDetails {
    return this.#issueDetails;
  }

  getKind(): IssueKind {
    if (this.#issueDetails.isReportOnly) {
      return IssueKind.IMPROVEMENT;
    }
    return IssueKind.PAGE_ERROR;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      ContentSecurityPolicyIssue[] {
    const cspDetails = inspectorIssue.details.contentSecurityPolicyIssueDetails;
    if (!cspDetails) {
      console.warn('Content security policy issue without details received.');
      return [];
    }
    return [new ContentSecurityPolicyIssue(cspDetails, issuesModel, inspectorIssue.issueId)];
  }
}

const cspURLViolation = {
  file: 'cspURLViolation.md',
  links: [{
    link: 'https://developers.google.com/web/fundamentals/security/csp#source_allowlists',
    linkTitle: i18nLazyString(UIStrings.contentSecurityPolicySource),
  }],
};

const cspInlineViolation = {
  file: 'cspInlineViolation.md',
  links: [{
    link: 'https://developers.google.com/web/fundamentals/security/csp#inline_code_is_considered_harmful',
    linkTitle: i18nLazyString(UIStrings.contentSecurityPolicyInlineCode),
  }],
};

const cspEvalViolation = {
  file: 'cspEvalViolation.md',
  links: [{
    link: 'https://developers.google.com/web/fundamentals/security/csp#eval_too',
    linkTitle: i18nLazyString(UIStrings.contentSecurityPolicyEval),
  }],
};

const cspTrustedTypesSinkViolation = {
  file: 'cspTrustedTypesSinkViolation.md',
  links: [{
    link: 'https://web.dev/trusted-types/#fix-the-violations',
    linkTitle: i18nLazyString(UIStrings.trustedTypesFixViolations),
  }],
};

const cspTrustedTypesPolicyViolation = {
  file: 'cspTrustedTypesPolicyViolation.md',
  links: [{link: 'https://web.dev/trusted-types/', linkTitle: i18nLazyString(UIStrings.trustedTypesPolicyViolation)}],
};

export const urlViolationCode = [
  Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
  Protocol.Audits.ContentSecurityPolicyViolationType.KURLViolation,
].join('::');

export const inlineViolationCode = [
  Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
  Protocol.Audits.ContentSecurityPolicyViolationType.KInlineViolation,
].join('::');

export const evalViolationCode = [
  Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
  Protocol.Audits.ContentSecurityPolicyViolationType.KEvalViolation,
].join('::');

export const trustedTypesSinkViolationCode = [
  Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
  Protocol.Audits.ContentSecurityPolicyViolationType.KTrustedTypesSinkViolation,
].join('::');

export const trustedTypesPolicyViolationCode = [
  Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
  Protocol.Audits.ContentSecurityPolicyViolationType.KTrustedTypesPolicyViolation,
].join('::');

const issueDescriptions: Map<Protocol.Audits.ContentSecurityPolicyViolationType, LazyMarkdownIssueDescription> =
    new Map([
      [Protocol.Audits.ContentSecurityPolicyViolationType.KURLViolation, cspURLViolation],
      [Protocol.Audits.ContentSecurityPolicyViolationType.KInlineViolation, cspInlineViolation],
      [Protocol.Audits.ContentSecurityPolicyViolationType.KEvalViolation, cspEvalViolation],
      [Protocol.Audits.ContentSecurityPolicyViolationType.KTrustedTypesSinkViolation, cspTrustedTypesSinkViolation],
      [Protocol.Audits.ContentSecurityPolicyViolationType.KTrustedTypesPolicyViolation, cspTrustedTypesPolicyViolation],
    ]);
