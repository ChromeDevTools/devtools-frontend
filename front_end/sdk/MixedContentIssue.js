// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../common/common.js';  // eslint-disable-line rulesdir/es_modules_import

import {Issue, IssueCategory, IssueDescription, IssueKind} from './Issue.js';  // eslint-disable-line no-unused-vars

export class MixedContentIssue extends Issue {
  /**
   * @param {!Protocol.Audits.MixedContentIssueDetails} issueDetails
   */
  constructor(issueDetails) {
    super(Protocol.Audits.InspectorIssueCode.MixedContentIssue);
    this._issueDetails = issueDetails;
  }

  /**
   * @param {string} resolutionStatus
   * @returns {!string}
   */
  static translateStatus(resolutionStatus) {
    return mixedContentStatus.get(resolutionStatus) || resolutionStatus;
  }

  /**
   * @override
   * @returns {!Iterable<Protocol.Audits.AffectedRequest>}
   */
  requests() {
    if (this._issueDetails.request) {
      return [this._issueDetails.request];
    }
    return [];
  }

  /**
   * @override
   * @returns {!Iterable<!Protocol.Audits.MixedContentIssueDetails>}
   */
  mixedContents() {
    return [this._issueDetails];
  }

  /**
   * @override
   * @return {!IssueCategory}
   */
  getCategory() {
    return IssueCategory.MixedContent;
  }

  /**
   * @override
   * @returns {!IssueDescription}
   */
  getDescription() {
    return {
      title: ls`Mixed content: load all resources via HTTPS to improve the security of your site`,
      message: () => paragraphedMessage([
        ls`Even though the initial HTML page is loaded over a secure HTTPS connection, some resources like images, stylesheets or scripts are being accessed over an insecure HTTP connection. Usage of insecure resources is restricted to strengthen the security of your entire site.`,
        ls`To resolve this issue load all resources over a secure HTTPS connection.`
      ]),
      issueKind: IssueKind.BreakingChange,
      links: [{
        link: 'https://developers.google.com/web/fundamentals/security/prevent-mixed-content/fixing-mixed-content',
        linkTitle: ls`Preventing mixed content`
      }],
    };
  }

  /**
  * @override
  */
  primaryKey() {
    return JSON.stringify(this._issueDetails);
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

/** @type {!Map<string, string>} */
const mixedContentStatus = new Map([
  ['MixedContentBlocked', ls`blocked`],
  ['MixedContentAutomaticallyUpgraded', ls`automatically upgraded`],
  ['MixedContentWarning', ls`warned`],
]);
