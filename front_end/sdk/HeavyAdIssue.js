// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../common/common.js';  // eslint-disable-line rulesdir/es_modules_import

import {Issue, IssueCategory, IssueDescription, IssueKind} from './Issue.js';  // eslint-disable-line no-unused-vars

export class HeavyAdIssue extends Issue {
  /**
   * @param {!Protocol.Audits.HeavyAdIssueDetails} issueDetails
   */
  constructor(issueDetails) {
    super(Protocol.Audits.InspectorIssueCode.HeavyAdIssue);
    this._issueDetails = issueDetails;
  }

  /**
   * @override
   * @returns {!Iterable<!Protocol.Audits.HeavyAdIssueDetails>}
   */
  heavyAds() {
    return [this._issueDetails];
  }

  /**
   * @override
   * @returns {string}
   */
  primaryKey() {
    return `${Protocol.Audits.InspectorIssueCode.HeavyAdIssue}-${JSON.stringify(this._issueDetails)}`;
  }

  /**
   * @override
   * @return {?IssueDescription}
   */
  getDescription() {
    return {
      title: ls`An ad on your site has exceeded resource limits`,
      message: mkHeavyAdDescription,
      issueKind: IssueKind.BreakingChange,
      links: [
        {
          link: 'https://developers.google.com/web/updates/2020/05/heavy-ad-interventions',
          linkTitle: ls`Handling Heavy Ad Interventions`
        },
      ],
    };
  }

  /**
   * @override
   * @return {!IssueCategory}
   */
  getCategory() {
    return IssueCategory.HeavyAd;
  }
}

/**
 * @return {!Element}
 */
function mkHeavyAdDescription() {
  const message = document.createElement('div');
  message.classList.add('message');
  const contextParagraph = document.createElement('p');
  contextParagraph.textContent = ls`
  Chrome identifies heavy ads on your site that use too many resources without a user gesture. Heavy ads have an impact on performance and harm the user’s browsing experience. They increase battery drain, consume mobile data, and make your site slow. To improve the user experience, Chrome warns about or removes heavy ads.`;

  message.append(contextParagraph);

  const resourceLimitHeader =
      ls`An ad is considered heavy if the user has not interacted with it (for example, has not tapped or clicked it) and it meets any of the following criteria:`;
  const resourceLimits = [
    ls`Uses the main thread for more than 60 seconds in total (CPU total limit)`,
    ls`Uses the main thread for more than 15 seconds in any 30 second window (CPU peak limit)`,
    ls`Uses more than 4 megabytes of network bandwidth (Network limit)`
  ];

  const resourceLimitsParagraph = document.createElement('p');
  resourceLimitsParagraph.appendChild(document.createTextNode(resourceLimitHeader));
  const resourceLimitsList = document.createElement('ul');
  for (const resourceLimit of resourceLimits) {
    const listItem = document.createElement('li');
    listItem.classList.add('plain-enum');
    listItem.textContent = resourceLimit;
    resourceLimitsList.append(listItem);
  }
  resourceLimitsParagraph.appendChild(resourceLimitsList);
  message.append(resourceLimitsParagraph);

  const resolutionParagraph = document.createElement('p');
  resolutionParagraph.textContent = ls`Stop this from happening by only showing ads that stay within resource limits.`;
  message.append(resolutionParagraph);

  return message;
}
