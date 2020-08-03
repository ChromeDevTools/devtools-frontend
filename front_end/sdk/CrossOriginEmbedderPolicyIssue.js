// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../common/common.js';  // eslint-disable-line rulesdir/es_modules_import

import {Issue, IssueCategory, IssueDescription, IssueKind} from './Issue.js';  // eslint-disable-line no-unused-vars

/**
 * @param {!Protocol.Audits.BlockedByResponseReason} reason
 * @return {boolean}
 */
export function isCrossOriginEmbedderPolicyIssue(reason) {
  switch (reason) {
    case Protocol.Audits.BlockedByResponseReason.CoepFrameResourceNeedsCoepHeader:
      return true;
    case Protocol.Audits.BlockedByResponseReason.CoopSandboxedIFrameCannotNavigateToCoopPage:
      return true;
    case Protocol.Audits.BlockedByResponseReason.CorpNotSameOrigin:
      return true;
    case Protocol.Audits.BlockedByResponseReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep:
      return true;
    case Protocol.Audits.BlockedByResponseReason.CorpNotSameSite:
      return true;
  }
  return false;
}

export class CrossOriginEmbedderPolicyIssue extends Issue {
  /**
   * @param {!Protocol.Audits.BlockedByResponseIssueDetails} issueDetails
   */
  constructor(issueDetails) {
    super(`CrossOriginEmbedderPolicy::${issueDetails.reason}`);
    /** @type {!Protocol.Audits.BlockedByResponseIssueDetails} */
    this._details = issueDetails;
  }

  /**
   * @override
   */
  primaryKey() {
    return `${this.code()}-(${this._details.request.requestId})`;
  }

  /**
   * @override
   * @returns {!Iterable<Protocol.Audits.BlockedByResponseIssueDetails>}
   */
  blockedByResponseDetails() {
    return [this._details];
  }

  /**
   * @override
   * @returns {!Iterable<Protocol.Audits.AffectedRequest>}
   */
  requests() {
    return [this._details.request];
  }

  /**
   * @override
   * @return {!IssueCategory}
   */
  getCategory() {
    return IssueCategory.CrossOriginEmbedderPolicy;
  }

  /**
   * @override
   * @returns {?IssueDescription}
   */
  getDescription() {
    const description = issueDescriptions.get(this.code());
    if (!description) {
      return null;
    }
    return description;
  }
}

/**
 * @return {!Element}
 */
function CorpNotSameOriginAfterDefaultedToSameOriginByCoepMessage() {
  const message = document.createElement('div');
  message.classList.add('message');

  message.createChild('p').textContent = ls
  `Because your site has the Cross-Origin Embedder Policy (COEP) enabled, each resource must specify a suitable Cross-Origin Resource Policy (CORP).
   This behavior prevents a document from loading cross-origin resources which don't explicitly grant permission to be loaded.`;

  const solveBy = message.createChild('p');
  solveBy.createChild('span').textContent = ls`To solve this, add the following to the resource’s response header:`;
  const list = solveBy.createChild('ul', 'resolutions-list');

  const example1 = list.createChild('li');
  example1.createChild('code').textContent = 'Cross-Origin-Resource-Policy: same-site';
  example1.createChild('span').textContent = ' ';
  example1.createChild('span').textContent = ls`if the resource and your site are served from the same site.`;

  const example2 = list.createChild('li');
  example2.createChild('code').textContent = 'Cross-Origin-Resource-Policy: cross-origin';
  example2.createChild('span').textContent = ' ';
  example2.createChild('span').textContent =
      ls`if the resource is served from another location than your website. ⚠️If you set this header, any website can embed this resource.`;
  return message;
}

/**
 * @return {!Element}
 */
function CoepFrameResourceNeedsCoepHeaderMessage() {
  const message = document.createElement('div');
  message.classList.add('message');

  message.createChild('p').textContent = ls
  `Because your site has the Cross-Origin Embedder Policy (COEP) enabled, each embedded iframe must also specify this policy.
  This behavior protects private data from being exposed to untrusted third party sites.`;

  const solvedBy = message.createChild('p');
  solvedBy.createChild('span').textContent = ls
  `To solve this, add the following to the embedded frame’s HTML response header:` +
      ' ';

  solvedBy.createChild('code').textContent = 'Cross-Origin-Embedder-Policy: require-corp';

  return message;
}

/**
 * @return {!Element}
 */
function CorpNotSameSiteMessage() {
  const message = document.createElement('div');
  message.classList.add('message');

  message.createChild('p').textContent = ls
  `Your site tries to access an external resource that only allows same-site usage.
  This behavior prevents a document from loading any non-same-site resources which don't explicitly grant permission to be loaded.`;

  const solvedBy = message.createChild('p');
  solvedBy.createChild('span').textContent =
      ls`To solve this, add the following to the resource’s HTML response header:` +
      ' ';
  solvedBy.createChild('code').textContent = 'Cross-Origin-Embedder-Policy: cross-origin';
  solvedBy.createChild('span').textContent =
      ' ' + ls`⚠️If you set this header, any website can embed this resource.`;

  return message;
}

/**
 * @return {!Element}
 */
function CorpNotSameOriginMessage() {
  const message = document.createElement('div');
  message.classList.add('message');

  message.createChild('p').textContent = ls
  `Your site tries to access an external resource that only allows same-origin usage.
  This behavior prevents a document from loading any non-same-origin resources which don't explicitly grant permission to be loaded.`;

  const solveBy = message.createChild('p');
  solveBy.createChild('span').textContent =
      ls`To solve this, add the following to the resource’s HTML response header:`;
  const list = solveBy.createChild('ul', 'resolutions-list');

  const example1 = list.createChild('li');
  example1.createChild('code').textContent = 'Cross-Origin-Resource-Policy: same-site';
  example1.createChild('span').textContent = ' ';
  example1.createChild('span').textContent = ls`if the resource and your site are served from the same site.`;

  const example2 = list.createChild('li');
  example2.createChild('code').textContent = 'Cross-Origin-Resource-Policy: cross-origin';
  example2.createChild('span').textContent = ' ';
  example2.createChild('span').textContent =
      ls`if the resource is served from another location than your website. ⚠️If you set this header, any website can embed this resource.`;

  return message;
}

/**
  * @param {string} text
  * @return {!Element}
  */
function textOnlyMessage(text) {
  const message = document.createElement('div');
  message.classList.add('message');
  message.textContent = text;
  return message;
}

/** @type {!Map<string, !IssueDescription>} */
const issueDescriptions = new Map([
['CrossOriginEmbedderPolicy::CorpNotSameOriginAfterDefaultedToSameOriginByCoep', {
  title: ls`Specify a Cross-Origin Resource Policy to prevent a resource from being blocked`,
  message: CorpNotSameOriginAfterDefaultedToSameOriginByCoepMessage,
  issueKind: IssueKind.BreakingChange,
  links: [
    {link: 'https://web.dev/coop-coep/',
     linkTitle: ls`COOP and COEP`},
    {link: 'https://web.dev/same-site-same-origin/',
     linkTitle: ls`Same-Site and Same-Origin`},
  ],
}],
['CrossOriginEmbedderPolicy::CoepFrameResourceNeedsCoepHeader',  {
  title: ls`Specify a Cross-Origin Embedder Policy to prevent this frame from being blocked`,
  message: CoepFrameResourceNeedsCoepHeaderMessage,
  issueKind: IssueKind.BreakingChange,
  links: [
    {link: 'https://web.dev/coop-coep/',
     linkTitle: ls`COOP and COEP`},
  ],
}],
['CrossOriginEmbedderPolicy::CoopSandboxedIframeCannotNavigateToCoopPage',  {
  title: ls`An iframe navigation to a document with a Cross-Origin Opener Policy was blocked`,
  message: () => textOnlyMessage(ls
  `A document with a Cross-Origin Opener Policy (COOP) was blocked from loading in an iframe, because the iframe specifies a sandbox attribute.
  This protects COOP-enabled documents from inheriting properties from its opener.`),
  issueKind: IssueKind.BreakingChange,
  links: [
    {link: 'https://web.dev/coop-coep/',
     linkTitle: ls`COOP and COEP`},
  ],
}],
['CrossOriginEmbedderPolicy::CorpNotSameSite',  {
  title: ls`Specify a more permissive Cross-Origin Resource Policy to prevent a resource from being blocked`,
  message: CorpNotSameSiteMessage,
  issueKind: IssueKind.BreakingChange,
  links: [
    {link: 'https://web.dev/coop-coep/',
     linkTitle: ls`COOP and COEP`},
    {link: 'https://web.dev/same-site-same-origin/',
     linkTitle: ls`Same-Site and Same-Origin`},
  ],
}],
['CrossOriginEmbedderPolicy::CorpNotSameOrigin',  {
  title: ls`Specify a more permissive Cross-Origin Resource Policy to prevent a resource from being blocked`,
  message: CorpNotSameOriginMessage,
  issueKind: IssueKind.BreakingChange,
  links: [
    {link: 'https://web.dev/coop-coep/',
     linkTitle: ls`COOP and COEP`},
    {link: 'https://web.dev/same-site-same-origin/',
     linkTitle: ls`Same-Site and Same-Origin`},
  ],
}],
]);
