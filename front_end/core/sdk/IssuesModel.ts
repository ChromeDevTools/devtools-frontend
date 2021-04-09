// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ContentSecurityPolicyIssue} from './ContentSecurityPolicyIssue.js';
import {CorsIssue} from './CorsIssue.js';
import {CrossOriginEmbedderPolicyIssue, isCrossOriginEmbedderPolicyIssue} from './CrossOriginEmbedderPolicyIssue.js';
import {HeavyAdIssue} from './HeavyAdIssue.js';
import {Issue} from './Issue.js';  // eslint-disable-line no-unused-vars
import {LowTextContrastIssue} from './LowTextContrastIssue.js';
import {MixedContentIssue} from './MixedContentIssue.js';
import {SameSiteCookieIssue} from './SameSiteCookieIssue.js';
import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars
import {SharedArrayBufferIssue} from './SharedArrayBufferIssue.js';
import {TrustedWebActivityIssue} from './TrustedWebActivityIssue.js';


/**
 * The `IssuesModel` is a thin dispatch that does not store issues, but only creates the representation
 * class (usually derived from `Issue`) and passes the instances on via a dispatched event.
 * We chose this approach here because the lifetime of the Model is tied to the target, but DevTools
 * wants to preserve issues for targets (e.g. iframes) that are already gone as well.
 */
export class IssuesModel extends SDKModel implements ProtocolProxyApi.AuditsDispatcher {
  private disposed: boolean;
  private enabled: boolean;
  private auditsAgent: ProtocolProxyApi.AuditsApi|null;

  constructor(target: Target) {
    super(target);
    this.enabled = false;
    this.auditsAgent = null;
    this.ensureEnabled();
    this.disposed = false;
  }

  private async ensureEnabled(): Promise<void> {
    if (this.enabled) {
      return;
    }

    this.enabled = true;
    this.target().registerAuditsDispatcher(this);
    this.auditsAgent = this.target().auditsAgent();
    await this.auditsAgent.invoke_enable();
  }

  issueAdded(issueAddedEvent: Protocol.Audits.IssueAddedEvent): void {
    const issues = this.createIssuesFromProtocolIssue(issueAddedEvent.issue);
    for (const issue of issues) {
      this.addIssue(issue);
    }
  }

  private addIssue(issue: Issue): void {
    this.dispatchEventToListeners(Events.IssueAdded, {issuesModel: this, issue});
  }

  /**
   * Each issue reported by the backend can result in multiple {!Issue} instances.
   * Handlers are simple functions hard-coded into a map.
   */
  private createIssuesFromProtocolIssue(inspectorIssue: Protocol.Audits.InspectorIssue): Issue[] {
    const handler = issueCodeHandlers.get(inspectorIssue.code);
    if (handler) {
      return handler(this, inspectorIssue.details);
    }

    console.warn(`No handler registered for issue code ${inspectorIssue.code}`);
    return [];
  }

  dispose(): void {
    super.dispose();
    this.disposed = true;
  }

  getTargetIfNotDisposed(): Target|null {
    if (!this.disposed) {
      return this.target();
    }
    return null;
  }
}

function createIssuesForSameSiteCookieIssue(
    issuesModel: IssuesModel, inspectorDetails: Protocol.Audits.InspectorIssueDetails): SameSiteCookieIssue[] {
  const sameSiteDetails = inspectorDetails.sameSiteCookieIssueDetails;
  if (!sameSiteDetails) {
    console.warn('SameSite issue without details received.');
    return [];
  }

  return SameSiteCookieIssue.createIssuesFromSameSiteDetails(sameSiteDetails, issuesModel);
}

function createIssuesForMixedContentIssue(
    issuesModel: IssuesModel, inspectorDetails: Protocol.Audits.InspectorIssueDetails): MixedContentIssue[] {
  const mixedContentDetails = inspectorDetails.mixedContentIssueDetails;
  if (!mixedContentDetails) {
    console.warn('Mixed content issue without details received.');
    return [];
  }
  return [new MixedContentIssue(mixedContentDetails, issuesModel)];
}

function createIssuesForContentSecurityPolicyIssue(
    issuesModel: IssuesModel, inspectorDetails: Protocol.Audits.InspectorIssueDetails): ContentSecurityPolicyIssue[] {
  const cspDetails = inspectorDetails.contentSecurityPolicyIssueDetails;
  if (!cspDetails) {
    console.warn('Content security policy issue without details received.');
    return [];
  }
  return [new ContentSecurityPolicyIssue(cspDetails, issuesModel)];
}

function createIssuesForHeavyAdIssue(
    issuesModel: IssuesModel, inspectorDetails: Protocol.Audits.InspectorIssueDetails): HeavyAdIssue[] {
  const heavyAdIssueDetails = inspectorDetails.heavyAdIssueDetails;
  if (!heavyAdIssueDetails) {
    console.warn('Heavy Ad issue without details received.');
    return [];
  }
  return [new HeavyAdIssue(heavyAdIssueDetails, issuesModel)];
}

function createIssuesForBlockedByResponseIssue(
    issuesModel: IssuesModel,
    inspectorDetails: Protocol.Audits.InspectorIssueDetails): CrossOriginEmbedderPolicyIssue[] {
  const blockedByResponseIssueDetails = inspectorDetails.blockedByResponseIssueDetails;
  if (!blockedByResponseIssueDetails) {
    console.warn('BlockedByResponse issue without details received.');
    return [];
  }
  if (isCrossOriginEmbedderPolicyIssue(blockedByResponseIssueDetails.reason)) {
    return [new CrossOriginEmbedderPolicyIssue(blockedByResponseIssueDetails, issuesModel)];
  }
  return [];
}

function createIssuesForSharedArrayBufferIssue(
    issuesModel: IssuesModel, inspectorDetails: Protocol.Audits.InspectorIssueDetails): SharedArrayBufferIssue[] {
  const sabIssueDetails = inspectorDetails.sharedArrayBufferIssueDetails;
  if (!sabIssueDetails) {
    console.warn('SAB transfer issue without details received.');
    return [];
  }
  return [new SharedArrayBufferIssue(sabIssueDetails, issuesModel)];
}

function createIssuesForTrustedWebActivityIssue(
    issuesModel: IssuesModel, inspectorDetails: Protocol.Audits.InspectorIssueDetails): TrustedWebActivityIssue[] {
  const twaQualityEnforcementDetails = inspectorDetails.twaQualityEnforcementDetails;
  if (!twaQualityEnforcementDetails) {
    console.warn('TWA Quality Enforcement issue without details received.');
    return [];
  }
  return [new TrustedWebActivityIssue(twaQualityEnforcementDetails)];
}

function createIssuesForLowTextContrastIssue(
    issuesModel: IssuesModel, inspectorDetails: Protocol.Audits.InspectorIssueDetails): LowTextContrastIssue[] {
  const lowTextContrastIssueDetails = inspectorDetails.lowTextContrastIssueDetails;
  if (!lowTextContrastIssueDetails) {
    console.warn('LowTextContrast issue without details received.');
    return [];
  }
  return [new LowTextContrastIssue(lowTextContrastIssueDetails)];
}

function createIssuesForCorsIssue(
    issuesModel: IssuesModel, inspectorDetails: Protocol.Audits.InspectorIssueDetails): CorsIssue[] {
  const corsIssueDetails = inspectorDetails.corsIssueDetails;
  if (!corsIssueDetails) {
    console.warn('Cors issue without details received.');
    return [];
  }
  return [new CorsIssue(corsIssueDetails, issuesModel)];
}

const issueCodeHandlers = new Map<
    Protocol.Audits.InspectorIssueCode,
    (model: IssuesModel, details: Protocol.Audits.InspectorIssueDetails) => Issue[]>([
  [Protocol.Audits.InspectorIssueCode.SameSiteCookieIssue, createIssuesForSameSiteCookieIssue],
  [Protocol.Audits.InspectorIssueCode.MixedContentIssue, createIssuesForMixedContentIssue],
  [Protocol.Audits.InspectorIssueCode.HeavyAdIssue, createIssuesForHeavyAdIssue],
  [Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue, createIssuesForContentSecurityPolicyIssue],
  [Protocol.Audits.InspectorIssueCode.BlockedByResponseIssue, createIssuesForBlockedByResponseIssue],
  [Protocol.Audits.InspectorIssueCode.SharedArrayBufferIssue, createIssuesForSharedArrayBufferIssue],
  [Protocol.Audits.InspectorIssueCode.TrustedWebActivityIssue, createIssuesForTrustedWebActivityIssue],
  [Protocol.Audits.InspectorIssueCode.LowTextContrastIssue, createIssuesForLowTextContrastIssue],
  [Protocol.Audits.InspectorIssueCode.CorsIssue, createIssuesForCorsIssue],
]);

export const Events = {
  IssueAdded: Symbol('IssueAdded'),
};

SDKModel.register(IssuesModel, Capability.Audits, true);
