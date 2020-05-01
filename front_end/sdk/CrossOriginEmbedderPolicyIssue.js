// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

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
  message.textContent = ls
  `The resource is not a same-origin resource, and the response headers for the resource did not specify any cross-origin resource policy.
     The cross-origin resource policy was defaulted to same-origin, because the resource was used in a context that enables the cross-origin embedder policy.
     To use this resource from a different origin, the server needs to specify a cross-origin resource policy in the response headers:`;
  const example1 = document.createElement('div');
  example1.classList.add('example');
  example1.createChild('code').textContent = 'Cross-Origin-Resource-Policy: same-site';
  example1.createChild('span', 'comment').textContent =
      ls`Choose this option if the resource and the document are served from the same site.`;
  message.appendChild(example1);
  const example2 = document.createElement('div');
  example2.classList.add('example');
  example2.createChild('code').textContent = 'Cross-Origin-Resource-Policy: cross-origin';
  example2.createChild('span', 'comment').textContent =
      ls`Only choose this option if an arbitrary website including this resource does not impose a security risk.`;
  message.appendChild(example2);
  return message;
}

/**
 * @return {!Element}
 */
function CoepFrameResourceNeedsCoepHeaderMessage() {
  const message = document.createElement('div');
  message.classList.add('message');
  message.textContent = ls
  `An iframe was emdbedded on a site which enables the cross-origin embedder policy, but the response headers for the document of the iframe did not specify a cross-origin embedder policy, which causes the iframe to get blocked.
  To allow embedding of the iframe, the response needs to enable the cross-origin embedder policy for the iframe by specifying the following response header:`;
  const example1 = document.createElement('div');
  example1.classList.add('example');
  example1.createChild('code').textContent = 'Cross-Origin-Embedder-Policy: require-corp';
  message.appendChild(example1);
  return message;
}

/**
 * @return {!Element}
 */
function CorpNotSameSiteMessage() {
  const message = document.createElement('div');
  message.classList.add('message');
  message.textContent = ls
  `The resource was loaded in a context that is not same-site and that enables the cross-origin embedder policy. The resource specified a cross-origin resource policy that allows only same-site usage, and was hence blocked.
  To allow usage of the resource from a different site, the server may relax the cross-origin resource policy response header:`;
  const example = document.createElement('div');
  example.classList.add('example');
  example.createChild('code').textContent = 'Cross-Origin-Resource-Policy: cross-origin';
  example.createChild('span', 'comment').textContent =
      ls`Only choose this option if an arbitrary website including this resource does not impose a security risk.`;
  message.appendChild(example);
  return message;
}

/**
 * @return {!Element}
 */
function CorpNotSameOriginMessage() {
  const message = document.createElement('div');
  message.classList.add('message');
  message.textContent = ls
  `The resource was loaded in a context that is not same-origin and that enables the cross-origin embedder policy. The resource specified a cross-origin resource policy that allows only same-origin usage, and was hence blocked.
  To use this resource from a different origin, the server may relax the cross-origin resource policy response header:`;
  const example1 = document.createElement('div');
  example1.classList.add('example');
  example1.createChild('code').textContent = 'Cross-Origin-Resource-Policy: same-site';
  example1.createChild('span', 'comment').textContent =
      ls`Choose this option if the resource and the document are served from the same site.`;
  message.appendChild(example1);
  const example2 = document.createElement('div');
  example2.classList.add('example');
  example2.createChild('code').textContent = 'Cross-Origin-Resource-Policy: cross-origin';
  example2.createChild('span', 'comment').textContent =
      ls`Only choose this option if an arbitrary website including this resource does not impose a security risk.`;
  message.appendChild(example2);
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
  title: ls`A resource was blocked because it is missing a cross-origin resource policy`,
  message: CorpNotSameOriginAfterDefaultedToSameOriginByCoepMessage,
  issueKind: IssueKind.BreakingChange,
  link: ls`https://web.dev/coop-coep/`,
  linkTitle: ls`Enable powerful features with COOP and COEP`,
}],
['CrossOriginEmbedderPolicy::CoepFrameResourceNeedsCoepHeader',  {
  title: ls`An iframe was blocked because it did not specify a cross-origin embedder policy`,
  message: CoepFrameResourceNeedsCoepHeaderMessage,
   issueKind: IssueKind.BreakingChange,
  link: ls`https://web.dev/coop-coep/`,
  linkTitle: ls`Enable powerful features with COOP and COEP`,
}],
['CrossOriginEmbedderPolicy::CoopSandboxedIframeCannotNavigateToCoopPage',  {
  title: ls`An iframe navigation to a document with a cross-origin opener policy was blocked`,
  message: () => textOnlyMessage(ls
  `A document was blocked from loading in an iframe with a sandbox attribute because the document specified a cross-origin opener policy.`),
  issueKind: IssueKind.BreakingChange,
  link: ls`https://web.dev/coop-coep/`,
  linkTitle: ls`Enable powerful features with COOP and COEP`,
}],
['CrossOriginEmbedderPolicy::CorpNotSameSite',  {
  title: ls`A resource was blocked because its cross-origin resource policy only allows same-site usage`,
  message: CorpNotSameSiteMessage,
  issueKind: IssueKind.BreakingChange,
  link: ls`https://web.dev/coop-coep/`,
  linkTitle: ls`Enable powerful features with COOP and COEP`,
}],
['CrossOriginEmbedderPolicy::CorpNotSameOrigin',  {
  title: ls`A resource was blocked because its cross-origin resource policy only allows same-origin usage`,
  message: CorpNotSameOriginMessage,
  issueKind: IssueKind.BreakingChange,
  link: ls`https://web.dev/coop-coep/`,
  linkTitle: ls`Enable powerful features with COOP and COEP`,
}],
]);
