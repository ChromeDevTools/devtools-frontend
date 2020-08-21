// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ContentSecurityPolicyIssue} from './ContentSecurityPolicyIssue.js';
import {CrossOriginEmbedderPolicyIssue, isCrossOriginEmbedderPolicyIssue} from './CrossOriginEmbedderPolicyIssue.js';
import {HeavyAdIssue} from './HeavyAdIssue.js';
import {Issue} from './Issue.js';  // eslint-disable-line no-unused-vars
import {MixedContentIssue} from './MixedContentIssue.js';
import {SameSiteCookieIssue} from './SameSiteCookieIssue.js';
import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars


/**
 * The `IssuesModel` is a thin dispatch that does not store issues, but only creates the representation
 * class (usually derived from `Issue`) and passes the instances on via a dispatched event.
 * We chose this approach here because the lifetime of the Model is tied to the target, but DevTools
 * wants to preserve issues for targets (e.g. iframes) that are already gone as well.
 * @implements {ProtocolProxyApi.AuditsDispatcher}
 */
export class IssuesModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);
    this._enabled = false;
    /** @type {*} */
    this._auditsAgent = null;
    this.ensureEnabled();
    this._disposed = false;
  }

  /**
   * @return {!Protocol.UsesObjectNotation}
   */
  usesObjectNotation() {
    return true;
  }

  ensureEnabled() {
    if (this._enabled) {
      return;
    }

    this._enabled = true;
    this.target().registerAuditsDispatcher(this);
    this._auditsAgent = this.target().auditsAgent();
    this._auditsAgent.invoke_enable();
  }

  /**
   * @override
   * @param {!Protocol.Audits.IssueAddedEvent} issueAddedEvent
   */
  issueAdded(issueAddedEvent) {
    const issues = this._createIssuesFromProtocolIssue(issueAddedEvent.issue);
    for (const issue of issues) {
      this.addIssue(issue);
    }
  }

  /**
   * @param {!Issue} issue
   */
  addIssue(issue) {
    this.dispatchEventToListeners(Events.IssueAdded, {issuesModel: this, issue});
  }

  /**
   * Each issue reported by the backend can result in multiple {!Issue} instances.
   * Handlers are simple functions hard-coded into a map.
   * @param {!Protocol.Audits.InspectorIssue} inspectorIssue} inspectorIssue
   * @return {!Array<!Issue>}
   */
  _createIssuesFromProtocolIssue(inspectorIssue) {
    const handler = issueCodeHandlers.get(inspectorIssue.code);
    if (handler) {
      return handler(this, inspectorIssue.details);
    }

    console.warn(`No handler registered for issue code ${inspectorIssue.code}`);
    return [];
  }

  /**
   * @override
   */
  dispose() {
    super.dispose();
    this._disposed = true;
  }

  /**
   * @returns {?Target}
   */
  getTargetIfNotDisposed() {
    if (!this._disposed) {
      return this.target();
    }
    return null;
  }
}

/**
 * @param {!IssuesModel} issuesModel
 * @param {!Protocol.Audits.InspectorIssueDetails} inspectorDetails
 * @return {!Array<!Issue>}
 */
function createIssuesForSameSiteCookieIssue(issuesModel, inspectorDetails) {
  const sameSiteDetails = inspectorDetails.sameSiteCookieIssueDetails;
  if (!sameSiteDetails) {
    console.warn('SameSite issue without details received.');
    return [];
  }

  return SameSiteCookieIssue.createIssuesFromSameSiteDetails(sameSiteDetails);
}

/**
 * @param {!IssuesModel} issuesModel
 * @param {!Protocol.Audits.InspectorIssueDetails} inspectorDetails
 * @return {!Array<!Issue>}
 */
function createIssuesForMixedContentIssue(issuesModel, inspectorDetails) {
  const mixedContentDetails = inspectorDetails.mixedContentIssueDetails;
  if (!mixedContentDetails) {
    console.warn('Mixed content issue without details received.');
    return [];
  }
  return [new MixedContentIssue(mixedContentDetails)];
}


/**
 * @param {!IssuesModel} issuesModel
 * @param {!Protocol.Audits.InspectorIssueDetails} inspectorDetails
 * @return {!Array<!Issue>}
 */
function createIssuesForContentSecurityPolicyIssue(issuesModel, inspectorDetails) {
  const cspDetails = inspectorDetails.contentSecurityPolicyIssueDetails;
  if (!cspDetails) {
    console.warn('Content security policy issue without details received.');
    return [];
  }
  return [new ContentSecurityPolicyIssue(cspDetails, issuesModel)];
}


/**
 * @param {!IssuesModel} issuesModel
 * @param {!Protocol.Audits.InspectorIssueDetails} inspectorDetails
 * @return {!Array<!Issue>}
 */
function createIssuesForHeavyAdIssue(issuesModel, inspectorDetails) {
  const heavyAdIssueDetails = inspectorDetails.heavyAdIssueDetails;
  if (!heavyAdIssueDetails) {
    console.warn('Heavy Ad issue without details received.');
    return [];
  }
  return [new HeavyAdIssue(heavyAdIssueDetails)];
}

/**
 * @param {!IssuesModel} issuesModel
 * @param {!Protocol.Audits.InspectorIssueDetails} inspectorDetails
 * @return {!Array<!Issue>}
 */
function createIssuesForBlockedByResponseIssue(issuesModel, inspectorDetails) {
  const blockedByResponseIssueDetails = inspectorDetails.blockedByResponseIssueDetails;
  if (!blockedByResponseIssueDetails) {
    console.warn('BlockedByResponse issue without details received.');
    return [];
  }
  if (isCrossOriginEmbedderPolicyIssue(blockedByResponseIssueDetails.reason)) {
    return [new CrossOriginEmbedderPolicyIssue(blockedByResponseIssueDetails)];
  }
  return [];
}

/**
 * @type {!Map<!Protocol.Audits.InspectorIssueCode, function(!IssuesModel, !Protocol.Audits.InspectorIssueDetails):!Array<!Issue>>}
 */
const issueCodeHandlers = new Map([
  [Protocol.Audits.InspectorIssueCode.SameSiteCookieIssue, createIssuesForSameSiteCookieIssue],
  [Protocol.Audits.InspectorIssueCode.MixedContentIssue, createIssuesForMixedContentIssue],
  [Protocol.Audits.InspectorIssueCode.HeavyAdIssue, createIssuesForHeavyAdIssue],
  [Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue, createIssuesForContentSecurityPolicyIssue],
  [Protocol.Audits.InspectorIssueCode.BlockedByResponseIssue, createIssuesForBlockedByResponseIssue],
]);

/** @enum {symbol} */
export const Events = {
  IssueAdded: Symbol('IssueAdded'),
};

SDKModel.register(IssuesModel, Capability.Audits, true);
