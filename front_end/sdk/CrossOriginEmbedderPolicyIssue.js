// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ls} from '../common/common.js';  // eslint-disable-line rulesdir/es_modules_import

import {Issue, IssueCategory, IssueDescription, IssueKind} from './Issue.js';  // eslint-disable-line no-unused-vars

/**
 * @param {string} string
 * @return {string}
 */
function toCamelCase(string) {
  const result = string.replace(/-\p{ASCII}/gu, match => match.substr(1).toUpperCase());
  return result.replace(/^./, match => match.toUpperCase());
}

export class CrossOriginEmbedderPolicyIssue extends Issue {
  /**
   * @param {string} blockedReason
   * @param {string} requestId
   */
  constructor(blockedReason, requestId) {
    super(`CrossOriginEmbedderPolicy::${toCamelCase(blockedReason)}`);
    /** @type {!Protocol.Audits.AffectedRequest} */
    this._affectedRequest = {requestId};
  }

  /**
   * @override
   */
  primaryKey() {
    return `${this.code()}-(${this._affectedRequest.requestId})`;
  }

  /**
   * @override
   * @returns {!Iterable<Protocol.Audits.AffectedRequest>}
   */
  requests() {
    return [this._affectedRequest];
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
  `Because your site has the cross-origin embedder policy (COEP) enabled, each resource must specify a suitable cross-origin resource policy (CORP).
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
  `Because your site has the cross-origin embedder policy (COEP) enabled, each embedded iframe must also specify this policy.
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
  title: ls`Specify a cross-origin resource policy to prevent a resource from being blocked`,
  message: CorpNotSameOriginAfterDefaultedToSameOriginByCoepMessage,
  issueKind: IssueKind.BreakingChange,
  links: [
    {link: ls`https://web.dev/coop-coep/`,
     linkTitle: ls`COOP and COEP`},
    {link: ls`https://web.dev/same-site-same-origin/`,
     linkTitle: ls`Same-Site and Same-Origin`},
  ],
}],
['CrossOriginEmbedderPolicy::CoepFrameResourceNeedsCoepHeader',  {
  title: ls`Specify a cross-origin embedder policy to prevent this frame from being blocked`,
  message: CoepFrameResourceNeedsCoepHeaderMessage,
  issueKind: IssueKind.BreakingChange,
  links: [
    {link: ls`https://web.dev/coop-coep/`,
     linkTitle: ls`COOP and COEP`},
  ],
}],
['CrossOriginEmbedderPolicy::CoopSandboxedIframeCannotNavigateToCoopPage',  {
  title: ls`An iframe navigation to a document with a cross-origin opener policy was blocked`,
  message: () => textOnlyMessage(ls
  `A document with a cross-origin opener policy (COOP) was blocked from loading in an iframe, because the iframe specifies a sandbox attribute.
  This protects COOP-enabled documents from inheriting properties from its opener.`),
  issueKind: IssueKind.BreakingChange,
  links: [
    {link: ls`https://web.dev/coop-coep/`,
     linkTitle: ls`COOP and COEP`},
  ],
}],
['CrossOriginEmbedderPolicy::CorpNotSameSite',  {
  title: ls`Specify a more permissive cross-origin resource policy to prevent a resource from being blocked`,
  message: CorpNotSameSiteMessage,
  issueKind: IssueKind.BreakingChange,
  links: [
    {link: ls`https://web.dev/coop-coep/`,
     linkTitle: ls`COOP and COEP`},
    {link: ls`https://web.dev/same-site-same-origin/`,
     linkTitle: ls`Same-Site and Same-Origin`},
  ],
}],
['CrossOriginEmbedderPolicy::CorpNotSameOrigin',  {
  title: ls`Specify a more permissive cross-origin resource policy to prevent a resource from being blocked`,
  message: CorpNotSameOriginMessage,
  issueKind: IssueKind.BreakingChange,
  links: [
    {link: ls`https://web.dev/coop-coep/`,
     linkTitle: ls`COOP and COEP`},
    {link: ls`https://web.dev/same-site-same-origin/`,
     linkTitle: ls`Same-Site and Same-Origin`},
  ],
}],
]);
