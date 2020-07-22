// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ContentSecurityPolicyIssue} from './ContentSecurityPolicyIssue.js';
import {CrossOriginEmbedderPolicyIssue} from './CrossOriginEmbedderPolicyIssue.js';
import {HeavyAdIssue} from './HeavyAdIssue.js';
import {Issue} from './Issue.js';  // eslint-disable-line no-unused-vars
import {MixedContentIssue} from './MixedContentIssue.js';
import {NetworkLog} from './NetworkLog.js';
import {Events as NetworkManagerEvents, NetworkManager} from './NetworkManager.js';
import {NetworkRequest} from './NetworkRequest.js';  // eslint-disable-line no-unused-vars
import {SameSiteCookieIssue} from './SameSiteCookieIssue.js';
import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars


/**
 * This class generates issues in the front-end based on information provided by the network panel. In the long
 * term, we might move this reporting to the back-end, but the current COVID-19 policy requires us to tone down
 * back-end changes until we are back at normal release cycle.
 */
export class NetworkIssueDetector {
  /**
   * @param {!Target} target
   * @param {!IssuesModel} issuesModel
   */
  constructor(target, issuesModel) {
    this._issuesModel = issuesModel;
    this._networkManager = target.model(NetworkManager);
    if (this._networkManager) {
      this._networkManager.addEventListener(NetworkManagerEvents.RequestFinished, this._handleRequestFinished, this);
    }
    for (const request of NetworkLog.instance().requests()) {
      this._handleRequestFinished({data: request});
    }
  }

  /**
   * @param {!{data:*}} event
   */
  _handleRequestFinished(event) {
    const request = /** @type {!NetworkRequest} */ (event.data);
    const blockedReason = getCoepBlockedReason(request);
    if (blockedReason) {
      this._issuesModel.addIssue(new CrossOriginEmbedderPolicyIssue(blockedReason, request.requestId()));
    }

    /**
     * @param {!NetworkRequest} request
     * @return {?string}
     */
    function getCoepBlockedReason(request) {
      if (!request.wasBlocked()) {
        return null;
      }
      const blockedReason = request.blockedReason() || null;
      if (blockedReason === Protocol.Network.BlockedReason.CoepFrameResourceNeedsCoepHeader ||
          blockedReason === Protocol.Network.BlockedReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep ||
          blockedReason === Protocol.Network.BlockedReason.CoopSandboxedIframeCannotNavigateToCoopPage ||
          blockedReason === Protocol.Network.BlockedReason.CorpNotSameSite ||
          blockedReason === Protocol.Network.BlockedReason.CorpNotSameOrigin) {
        return blockedReason;
      }
      return null;
    }
  }

  detach() {
    if (this._networkManager) {
      this._networkManager.removeEventListener(NetworkManagerEvents.RequestFinished, this._handleRequestFinished, this);
    }
  }
}


/**
 * The `IssuesModel` is a thin dispatch that does not store issues, but only creates the representation
 * class (usually derived from `Issue`) and passes the instances on via a dispatched event.
 * We chose this approach here because the lifetime of the Model is tied to the target, but DevTools
 * wants to preserve issues for targets (e.g. iframes) that are already gone as well.
 * @implements {ProtocolProxyApiWorkaround_AuditsDispatcher}
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
    this._networkIssueDetector = null;
    this.ensureEnabled();
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
    this._networkIssueDetector = new NetworkIssueDetector(this.target(), this);
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

  /** @type {!Array<!Issue>} */
  const issues = [];

  // Exclusion reasons have priority. It means a cookie was blocked. Create an issue
  // for every exclusion reason but ignore warning reasons if the cookie was blocked.
  if (sameSiteDetails.cookieExclusionReasons && sameSiteDetails.cookieExclusionReasons.length > 0) {
    for (const exclusionReason of sameSiteDetails.cookieExclusionReasons) {
      const code = SameSiteCookieIssue.codeForSameSiteDetails(
          exclusionReason, sameSiteDetails.operation, sameSiteDetails.cookieUrl);
      issues.push(new SameSiteCookieIssue(code, sameSiteDetails));
    }
    return issues;
  }

  if (sameSiteDetails.cookieWarningReasons) {
    for (const warningReason of sameSiteDetails.cookieWarningReasons) {
      const code = SameSiteCookieIssue.codeForSameSiteDetails(
          warningReason, sameSiteDetails.operation, sameSiteDetails.cookieUrl);
      issues.push(new SameSiteCookieIssue(code, sameSiteDetails));
    }
  }
  return issues;
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
  return [new ContentSecurityPolicyIssue(cspDetails)];
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
 * @type {!Map<!Protocol.Audits.InspectorIssueCode, function(!IssuesModel, !Protocol.Audits.InspectorIssueDetails):!Array<!Issue>>}
 */
const issueCodeHandlers = new Map([
  [Protocol.Audits.InspectorIssueCode.SameSiteCookieIssue, createIssuesForSameSiteCookieIssue],
  [Protocol.Audits.InspectorIssueCode.MixedContentIssue, createIssuesForMixedContentIssue],
  [Protocol.Audits.InspectorIssueCode.HeavyAdIssue, createIssuesForHeavyAdIssue],
  [Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue, createIssuesForContentSecurityPolicyIssue],
]);

/** @enum {symbol} */
export const Events = {
  IssueAdded: Symbol('IssueAdded'),
};

SDKModel.register(IssuesModel, Capability.Audits, true);
