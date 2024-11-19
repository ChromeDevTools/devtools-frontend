// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {AttributionReportingIssue} from './AttributionReportingIssue.js';
import {BounceTrackingIssue} from './BounceTrackingIssue.js';
import {ClientHintIssue} from './ClientHintIssue.js';
import {ContentSecurityPolicyIssue} from './ContentSecurityPolicyIssue.js';
import {CookieDeprecationMetadataIssue} from './CookieDeprecationMetadataIssue.js';
import {CookieIssue} from './CookieIssue.js';
import {CorsIssue} from './CorsIssue.js';
import {CrossOriginEmbedderPolicyIssue, isCrossOriginEmbedderPolicyIssue} from './CrossOriginEmbedderPolicyIssue.js';
import {DeprecationIssue} from './DeprecationIssue.js';
import {FederatedAuthRequestIssue} from './FederatedAuthRequestIssue.js';
import {GenericIssue} from './GenericIssue.js';
import {HeavyAdIssue} from './HeavyAdIssue.js';
import type {Issue, IssueKind} from './Issue.js';
import {Events} from './IssuesManagerEvents.js';
import {LowTextContrastIssue} from './LowTextContrastIssue.js';
import {MixedContentIssue} from './MixedContentIssue.js';
import {PropertyRuleIssue} from './PropertyRuleIssue.js';
import {QuirksModeIssue} from './QuirksModeIssue.js';
import {SharedArrayBufferIssue} from './SharedArrayBufferIssue.js';
import {SharedDictionaryIssue} from './SharedDictionaryIssue.js';
import {SourceFrameIssuesManager} from './SourceFrameIssuesManager.js';
import {StylesheetLoadingIssue} from './StylesheetLoadingIssue.js';

export {Events} from './IssuesManagerEvents.js';

let issuesManagerInstance: IssuesManager|null = null;

function createIssuesForBlockedByResponseIssue(
    issuesModel: SDK.IssuesModel.IssuesModel,
    inspectorIssue: Protocol.Audits.InspectorIssue): CrossOriginEmbedderPolicyIssue[] {
  const blockedByResponseIssueDetails = inspectorIssue.details.blockedByResponseIssueDetails;
  if (!blockedByResponseIssueDetails) {
    console.warn('BlockedByResponse issue without details received.');
    return [];
  }
  if (isCrossOriginEmbedderPolicyIssue(blockedByResponseIssueDetails.reason)) {
    return [new CrossOriginEmbedderPolicyIssue(blockedByResponseIssueDetails, issuesModel)];
  }
  return [];
}

const issueCodeHandlers = new Map<
    Protocol.Audits.InspectorIssueCode,
    (model: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue) => Issue[]>([
  [
    Protocol.Audits.InspectorIssueCode.CookieIssue,
    CookieIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.MixedContentIssue,
    MixedContentIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.HeavyAdIssue,
    HeavyAdIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
    ContentSecurityPolicyIssue.fromInspectorIssue,
  ],
  [Protocol.Audits.InspectorIssueCode.BlockedByResponseIssue, createIssuesForBlockedByResponseIssue],
  [
    Protocol.Audits.InspectorIssueCode.SharedArrayBufferIssue,
    SharedArrayBufferIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.SharedDictionaryIssue,
    SharedDictionaryIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.LowTextContrastIssue,
    LowTextContrastIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.CorsIssue,
    CorsIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.QuirksModeIssue,
    QuirksModeIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.AttributionReportingIssue,
    AttributionReportingIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.GenericIssue,
    GenericIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.DeprecationIssue,
    DeprecationIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.ClientHintIssue,
    ClientHintIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.FederatedAuthRequestIssue,
    FederatedAuthRequestIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.BounceTrackingIssue,
    BounceTrackingIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.StylesheetLoadingIssue,
    StylesheetLoadingIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.PropertyRuleIssue,
    PropertyRuleIssue.fromInspectorIssue,
  ],
  [
    Protocol.Audits.InspectorIssueCode.CookieDeprecationMetadataIssue,
    CookieDeprecationMetadataIssue.fromInspectorIssue,
  ],
]);

/**
 * Each issue reported by the backend can result in multiple `Issue` instances.
 * Handlers are simple functions hard-coded into a map.
 */
export function createIssuesFromProtocolIssue(
    issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue): Issue[] {
  const handler = issueCodeHandlers.get(inspectorIssue.code);
  if (handler) {
    return handler(issuesModel, inspectorIssue);
  }
  console.warn(`No handler registered for issue code ${inspectorIssue.code}`);
  return [];
}

export interface IssuesManagerCreationOptions {
  forceNew: boolean;
  /** Throw an error if this is not the first instance created */
  ensureFirst: boolean;
  showThirdPartyIssuesSetting?: Common.Settings.Setting<boolean>;
  hideIssueSetting?: Common.Settings.Setting<HideIssueMenuSetting>;
}

export type HideIssueMenuSetting = {
  [x: string]: IssueStatus,
};

export const enum IssueStatus {
  HIDDEN = 'Hidden',
  UNHIDDEN = 'Unhidden',
}

export function defaultHideIssueByCodeSetting(): HideIssueMenuSetting {
  const setting: HideIssueMenuSetting = {};
  return setting;
}

export function getHideIssueByCodeSetting(): Common.Settings.Setting<HideIssueMenuSetting> {
  return Common.Settings.Settings.instance().createSetting(
      'hide-issue-by-code-setting-experiment-2021', defaultHideIssueByCodeSetting());
}

/**
 * The `IssuesManager` is the central storage for issues. It collects issues from all the
 * `IssuesModel` instances in the page, and deduplicates them wrt their primary key.
 * It also takes care of clearing the issues when it sees a main-frame navigated event.
 * Any client can subscribe to the events provided, and/or query the issues via the public
 * interface.
 *
 * Additionally, the `IssuesManager` can filter Issues. All Issues are stored, but only
 * Issues that are accepted by the filter cause events to be fired or are returned by
 * `IssuesManager#issues()`.
 */
export class IssuesManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    SDK.TargetManager.SDKModelObserver<SDK.IssuesModel.IssuesModel> {
  #eventListeners = new WeakMap<SDK.IssuesModel.IssuesModel, Common.EventTarget.EventDescriptor>();
  #allIssues = new Map<string, Issue>();
  #filteredIssues = new Map<string, Issue>();
  #issueCounts = new Map<IssueKind, number>();
  #hiddenIssueCount = new Map<IssueKind, number>();
  #hasSeenPrimaryPageChanged = false;
  #issuesById: Map<string, Issue> = new Map();
  #issuesByOutermostTarget: WeakMap<SDK.Target.Target, Set<Issue>> = new Map();

  constructor(
      private readonly showThirdPartyIssuesSetting?: Common.Settings.Setting<boolean>,
      private readonly hideIssueSetting?: Common.Settings.Setting<HideIssueMenuSetting>) {
    super();
    new SourceFrameIssuesManager(this);
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.IssuesModel.IssuesModel, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        this.#onPrimaryPageChanged, this);
    SDK.FrameManager.FrameManager.instance().addEventListener(
        SDK.FrameManager.Events.FRAME_ADDED_TO_TARGET, this.#onFrameAddedToTarget, this);

    // issueFilter uses the 'show-third-party-issues' setting. Clients of IssuesManager need
    // a full update when the setting changes to get an up-to-date issues list.
    this.showThirdPartyIssuesSetting?.addChangeListener(() => this.#updateFilteredIssues());
    this.hideIssueSetting?.addChangeListener(() => this.#updateFilteredIssues());
    SDK.TargetManager.TargetManager.instance().observeTargets(
        {
          targetAdded: (target: SDK.Target.Target) => {
            if (target.outermostTarget() === target) {
              this.#updateFilteredIssues();
            }
          },
          targetRemoved: (_: SDK.Target.Target) => {},
        },
        {scoped: true});
  }

  static instance(opts: IssuesManagerCreationOptions = {
    forceNew: false,
    ensureFirst: false,
  }): IssuesManager {
    if (issuesManagerInstance && opts.ensureFirst) {
      throw new Error(
          'IssuesManager was already created. Either set "ensureFirst" to false or make sure that this invocation is really the first one.');
    }

    if (!issuesManagerInstance || opts.forceNew) {
      issuesManagerInstance = new IssuesManager(opts.showThirdPartyIssuesSetting, opts.hideIssueSetting);
    }

    return issuesManagerInstance;
  }

  static removeInstance(): void {
    issuesManagerInstance = null;
  }

  /**
   * Once we have seen at least one `PrimaryPageChanged` event, we can be reasonably sure
   * that we also collected issues that were reported during the navigation to the current
   * page. If we haven't seen a main frame navigated, we might have missed issues that arose
   * during navigation.
   */
  reloadForAccurateInformationRequired(): boolean {
    return !this.#hasSeenPrimaryPageChanged;
  }

  #onPrimaryPageChanged(
      event: Common.EventTarget.EventTargetEvent<
          {frame: SDK.ResourceTreeModel.ResourceTreeFrame, type: SDK.ResourceTreeModel.PrimaryPageChangeType}>): void {
    const {frame, type} = event.data;
    const keptIssues = new Map<string, Issue>();
    for (const [key, issue] of this.#allIssues.entries()) {
      if (issue.isAssociatedWithRequestId(frame.loaderId)) {
        keptIssues.set(key, issue);
        // Keep issues for prerendered target alive in case of prerender-activation.
      } else if (
          (type === SDK.ResourceTreeModel.PrimaryPageChangeType.ACTIVATION) &&
          (frame.resourceTreeModel().target() === issue.model()?.target())) {
        keptIssues.set(key, issue);
        // Keep BounceTrackingIssues alive for non-user-initiated navigations.
      } else if (
          issue.code() === Protocol.Audits.InspectorIssueCode.BounceTrackingIssue ||
          issue.code() === Protocol.Audits.InspectorIssueCode.CookieIssue) {
        const networkManager = frame.resourceTreeModel().target().model(SDK.NetworkManager.NetworkManager);
        if (networkManager?.requestForLoaderId(frame.loaderId as Protocol.Network.LoaderId)?.hasUserGesture() ===
            false) {
          keptIssues.set(key, issue);
        }
      }
    }
    this.#allIssues = keptIssues;
    this.#hasSeenPrimaryPageChanged = true;
    this.#updateFilteredIssues();
  }

  #onFrameAddedToTarget(event: Common.EventTarget.EventTargetEvent<{frame: SDK.ResourceTreeModel.ResourceTreeFrame}>):
      void {
    const {frame} = event.data;
    // Determining third-party status usually requires the registered domain of the outermost frame.
    // When DevTools is opened after navigation has completed, issues may be received
    // before the outermost frame is available. Thus, we trigger a recalcuation of third-party-ness
    // when we attach to the outermost frame.
    if (frame.isOutermostFrame() && SDK.TargetManager.TargetManager.instance().isInScope(frame.resourceTreeModel())) {
      this.#updateFilteredIssues();
    }
  }

  modelAdded(issuesModel: SDK.IssuesModel.IssuesModel): void {
    const listener = issuesModel.addEventListener(SDK.IssuesModel.Events.ISSUE_ADDED, this.#onIssueAddedEvent, this);
    this.#eventListeners.set(issuesModel, listener);
  }

  modelRemoved(issuesModel: SDK.IssuesModel.IssuesModel): void {
    const listener = this.#eventListeners.get(issuesModel);
    if (listener) {
      Common.EventTarget.removeEventListeners([listener]);
    }
  }

  #onIssueAddedEvent(event: Common.EventTarget.EventTargetEvent<SDK.IssuesModel.IssueAddedEvent>): void {
    const {issuesModel, inspectorIssue} = event.data;
    const issues = createIssuesFromProtocolIssue(issuesModel, inspectorIssue);
    for (const issue of issues) {
      this.addIssue(issuesModel, issue);
      const message = issue.maybeCreateConsoleMessage();
      if (message) {
        issuesModel.target().model(SDK.ConsoleModel.ConsoleModel)?.addMessage(message);
      }
    }
  }

  addIssue(issuesModel: SDK.IssuesModel.IssuesModel, issue: Issue): void {
    // Ignore issues without proper description; they are invisible to the user and only cause confusion.
    if (!issue.getDescription()) {
      return;
    }
    const primaryKey = issue.primaryKey();
    if (this.#allIssues.has(primaryKey)) {
      return;
    }
    this.#allIssues.set(primaryKey, issue);

    const outermostTarget = issuesModel.target().outermostTarget();
    if (outermostTarget) {
      let issuesForTarget = this.#issuesByOutermostTarget.get(outermostTarget);
      if (!issuesForTarget) {
        issuesForTarget = new Set();
        this.#issuesByOutermostTarget.set(outermostTarget, issuesForTarget);
      }
      issuesForTarget.add(issue);
    }
    if (this.#issueFilter(issue)) {
      this.#filteredIssues.set(primaryKey, issue);
      this.#issueCounts.set(issue.getKind(), 1 + (this.#issueCounts.get(issue.getKind()) || 0));
      const issueId = issue.getIssueId();
      if (issueId) {
        this.#issuesById.set(issueId, issue);
      }
      const values = this.hideIssueSetting?.get();
      this.#updateIssueHiddenStatus(issue, values);
      if (issue.isHidden()) {
        this.#hiddenIssueCount.set(issue.getKind(), 1 + (this.#hiddenIssueCount.get(issue.getKind()) || 0));
      }
      this.dispatchEventToListeners(Events.ISSUE_ADDED, {issuesModel, issue});
    }
    // Always fire the "count" event even if the issue was filtered out.
    // The result of `hasOnlyThirdPartyIssues` could still change.
    this.dispatchEventToListeners(Events.ISSUES_COUNT_UPDATED);
  }

  issues(): Iterable<Issue> {
    return this.#filteredIssues.values();
  }

  numberOfIssues(kind?: IssueKind): number {
    if (kind) {
      return (this.#issueCounts.get(kind) ?? 0) - this.numberOfHiddenIssues(kind);
    }
    return this.#filteredIssues.size - this.numberOfHiddenIssues();
  }

  numberOfHiddenIssues(kind?: IssueKind): number {
    if (kind) {
      return this.#hiddenIssueCount.get(kind) ?? 0;
    }
    let count = 0;
    for (const num of this.#hiddenIssueCount.values()) {
      count += num;
    }
    return count;
  }

  numberOfAllStoredIssues(): number {
    return this.#allIssues.size;
  }

  #issueFilter(issue: Issue): boolean {
    const scopeTarget = SDK.TargetManager.TargetManager.instance().scopeTarget();
    if (!scopeTarget) {
      return false;
    }
    if (!this.#issuesByOutermostTarget.get(scopeTarget)?.has(issue)) {
      return false;
    }
    return this.showThirdPartyIssuesSetting?.get() || !issue.isCausedByThirdParty();
  }

  #updateIssueHiddenStatus(issue: Issue, values: HideIssueMenuSetting|undefined): void {
    const code = issue.code();
    // All issues are hidden via their code.
    // For hiding we check whether the issue code is present and has a value of IssueStatus.Hidden
    // assosciated with it. If all these conditions are met the issue is hidden.
    // IssueStatus is set in hidden issues menu.
    // In case a user wants to hide a specific issue, the issue code is added to "code" section
    // of our setting and its value is set to IssueStatus.Hidden. Then issue then gets hidden.
    if (values && values[code]) {
      if (values[code] === IssueStatus.HIDDEN) {
        issue.setHidden(true);
        return;
      }
      issue.setHidden(false);
      return;
    }
  }

  #updateFilteredIssues(): void {
    this.#filteredIssues.clear();
    this.#issueCounts.clear();
    this.#issuesById.clear();
    this.#hiddenIssueCount.clear();
    const values = this.hideIssueSetting?.get();
    for (const [key, issue] of this.#allIssues) {
      if (this.#issueFilter(issue)) {
        this.#updateIssueHiddenStatus(issue, values);
        this.#filteredIssues.set(key, issue);
        this.#issueCounts.set(issue.getKind(), 1 + (this.#issueCounts.get(issue.getKind()) ?? 0));
        if (issue.isHidden()) {
          this.#hiddenIssueCount.set(issue.getKind(), 1 + (this.#hiddenIssueCount.get(issue.getKind()) || 0));
        }
        const issueId = issue.getIssueId();
        if (issueId) {
          this.#issuesById.set(issueId, issue);
        }
      }
    }
    this.dispatchEventToListeners(Events.FULL_UPDATE_REQUIRED);
    this.dispatchEventToListeners(Events.ISSUES_COUNT_UPDATED);
  }

  unhideAllIssues(): void {
    for (const issue of this.#allIssues.values()) {
      issue.setHidden(false);
    }
    this.hideIssueSetting?.set(defaultHideIssueByCodeSetting());
  }

  getIssueById(id: string): Issue|undefined {
    return this.#issuesById.get(id);
  }
}

export interface IssueAddedEvent {
  issuesModel: SDK.IssuesModel.IssuesModel;
  issue: Issue;
}

export type EventTypes = {
  [Events.ISSUES_COUNT_UPDATED]: void,
  [Events.FULL_UPDATE_REQUIRED]: void,
  [Events.ISSUE_ADDED]: IssueAddedEvent,
};

// @ts-ignore
globalThis.addIssueForTest = (issue: Protocol.Audits.InspectorIssue) => {
  const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
  const issuesModel = mainTarget?.model(SDK.IssuesModel.IssuesModel);
  issuesModel?.issueAdded({issue});
};
