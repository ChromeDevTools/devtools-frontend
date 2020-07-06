// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../platform/platform.js';

import {Issue, IssueCategory, IssueDescription, IssueKind} from './Issue.js';  // eslint-disable-line no-unused-vars

export class ContentSecurityPolicyIssue extends Issue {
  /**
   * @param {!Protocol.Audits.ContentSecurityPolicyIssueDetails} issueDetails
   */
  constructor(issueDetails) {
    super(Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue);
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
    return JSON.stringify(
        this._issueDetails, ['blockedURL', 'contentSecurityPolicyViolationType', 'violatedDirective']);
  }

  /**
   * @override
   * @return {string}
   */
  code() {
    return this._issueDetails.contentSecurityPolicyViolationType;
  }

  /**
   * @override
   * @returns {?IssueDescription}
   */
  getDescription() {
    const description = issueDescriptions.get(this._issueDetails.contentSecurityPolicyViolationType);
    if (description) {
      return description;
    }
    return null;
  }

  /**
   * @override
   * @returns {!Iterable<!Protocol.Audits.ContentSecurityPolicyIssueDetails>}
   */
  cspViolations() {
    return [this._issueDetails];
  }
}

/**
 * @param {!Array<string>} paragraphs
 * @return {!Element}
 */
function paragraphedMessage(paragraphs) {
  const message = document.createElement('div');
  message.classList.add('message');
  for (const paragraph of paragraphs) {
    const paragraphElement = document.createElement('p');
    paragraphElement.textContent = paragraph;
    message.appendChild(paragraphElement);
  }
  return message;
}

const cspURLViolation = {
  title:
      ls`Some resources are blocked because their origin is not included in your site's content security policy header`,
  message: () => paragraphedMessage([
    ls`The Content Security Policy (CSP) improves the security of your site by defining a list of trusted sources and
     instructs the browser to only execute or render resources from this list. Some resources on your site can't be accessed
     because their origin is not listed in the CSP policy.`,
    ls`Solve this problem by carefully checking that all the blocked resources listed below are trustworthy and include their
     source in the Content Security Policy of your website.`,
    ls`⚠️ Never add a source you don't trust to your site's Content Security Policy. If you don't trust the source, consider
     hosting resources on your own site instead.`
  ]),
  issueKind: IssueKind.BreakingChange,
  links: [{
    link: ls`https://developers.google.com/web/fundamentals/security/csp#source_whitelists`,
    linkTitle: ls`Content Security Policy | Source Allowlists`
  }],
};

// TODO(crbug.com/1082628): Add handling of other CSP violation types later as they'll need more work.
/** @type {!Map<!Protocol.Audits.ContentSecurityPolicyViolationType, !IssueDescription>} */
const issueDescriptions = new Map([
  [Protocol.Audits.ContentSecurityPolicyViolationType.KURLViolation, cspURLViolation],
]);
