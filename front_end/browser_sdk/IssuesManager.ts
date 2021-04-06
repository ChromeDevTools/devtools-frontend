// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';
import * as SDK from '../core/sdk/sdk.js';
import {SourceFrameIssuesManager} from './SourceFrameIssuesManager.js';

let issuesManagerInstance: IssuesManager|null = null;

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
export class IssuesManager extends Common.ObjectWrapper.ObjectWrapper implements
    SDK.SDKModel.SDKModelObserver<SDK.IssuesModel.IssuesModel> {
  private eventListeners: WeakMap<SDK.IssuesModel.IssuesModel, Common.EventTarget.EventDescriptor>;
  private allIssues: Map<string, SDK.Issue.Issue>;
  private filteredIssues: Map<string, SDK.Issue.Issue>;
  private issueCounts: Map<SDK.Issue.IssueKind, number>;
  private hasSeenTopFrameNavigated: boolean;
  private showThirdPartySettingsChangeListener: Common.EventTarget.EventDescriptor|null;
  private sourceFrameIssuesManager: SourceFrameIssuesManager;

  constructor() {
    super();
    this.eventListeners = new WeakMap();
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.IssuesModel.IssuesModel, this);
    this.allIssues = new Map();
    this.filteredIssues = new Map();
    this.issueCounts = new Map();
    this.hasSeenTopFrameNavigated = false;
    SDK.FrameManager.FrameManager.instance().addEventListener(
        SDK.FrameManager.Events.TopFrameNavigated, this.onTopFrameNavigated, this);
    SDK.FrameManager.FrameManager.instance().addEventListener(
        SDK.FrameManager.Events.FrameAddedToTarget, this.onFrameAddedToTarget, this);

    this.showThirdPartySettingsChangeListener = null;

    this.sourceFrameIssuesManager = new SourceFrameIssuesManager(this);
  }

  static instance({forceNew}: {forceNew: boolean} = {forceNew: false}): IssuesManager {
    if (!issuesManagerInstance || forceNew) {
      issuesManagerInstance = new IssuesManager();
    }

    return issuesManagerInstance;
  }

  /**
   * Once we have seen at least one `TopFrameNavigated` event, we can be reasonably sure
   * that we also collected issues that were reported during the navigation to the current
   * page. If we haven't seen a main frame navigated, we might have missed issues that arose
   * during navigation.
   */
  reloadForAccurateInformationRequired(): boolean {
    return !this.hasSeenTopFrameNavigated;
  }

  private onTopFrameNavigated(event: Common.EventTarget.EventTargetEvent): void {
    const {frame} = event.data as {
      frame: SDK.ResourceTreeModel.ResourceTreeFrame,
    };
    const keptIssues = new Map<string, SDK.Issue.Issue>();
    for (const [key, issue] of this.allIssues.entries()) {
      if (issue.isAssociatedWithRequestId(frame.loaderId)) {
        keptIssues.set(key, issue);
      }
    }
    this.allIssues = keptIssues;
    this.hasSeenTopFrameNavigated = true;
    this.updateFilteredIssues();
  }

  private onFrameAddedToTarget(event: Common.EventTarget.EventTargetEvent): void {
    const {frame} = event.data as {
      frame: SDK.ResourceTreeModel.ResourceTreeFrame,
    };
    // Determining third-party status usually requires the registered domain of the top frame.
    // When DevTools is opened after navigation has completed, issues may be received
    // before the top frame is available. Thus, we trigger a recalcuation of third-party-ness
    // when we attach to the top frame.
    if (frame.isTopFrame()) {
      this.updateFilteredIssues();
    }
  }

  modelAdded(issuesModel: SDK.IssuesModel.IssuesModel): void {
    const listener = issuesModel.addEventListener(SDK.IssuesModel.Events.IssueAdded, this.onIssueAdded, this);
    this.eventListeners.set(issuesModel, listener);
  }

  modelRemoved(issuesModel: SDK.IssuesModel.IssuesModel): void {
    const listener = this.eventListeners.get(issuesModel);
    if (listener) {
      Common.EventTarget.EventTarget.removeEventListeners([listener]);
    }
  }

  private onIssueAdded(event: Common.EventTarget.EventTargetEvent): void {
    const {issuesModel, issue} = event.data as {
      issuesModel: SDK.IssuesModel.IssuesModel,
      issue: SDK.Issue.Issue,
    };
    // Ignore issues without proper description; they are invisible to the user and only cause confusion.
    if (!issue.getDescription()) {
      return;
    }
    const primaryKey = issue.primaryKey();
    if (this.allIssues.has(primaryKey)) {
      return;
    }
    this.allIssues.set(primaryKey, issue);

    if (this.issueFilter(issue)) {
      this.filteredIssues.set(primaryKey, issue);
      this.issueCounts.set(issue.getKind(), 1 + (this.issueCounts.get(issue.getKind()) || 0));
      this.dispatchEventToListeners(Events.IssueAdded, {issuesModel, issue});
    }
    // Always fire the "count" event even if the issue was filtered out.
    // The result of `hasOnlyThirdPartyIssues` could still change.
    this.dispatchEventToListeners(Events.IssuesCountUpdated);
  }

  issues(): Iterable<SDK.Issue.Issue> {
    return this.filteredIssues.values();
  }

  numberOfIssues(kind?: SDK.Issue.IssueKind): number {
    if (kind) {
      return this.issueCounts.get(kind) ?? 0;
    }
    return this.filteredIssues.size;
  }

  numberOfAllStoredIssues(): number {
    return this.allIssues.size;
  }

  private issueFilter(issue: SDK.Issue.Issue): boolean {
    if (!this.showThirdPartySettingsChangeListener) {
      // issueFilter uses the 'showThirdPartyIssues' setting. Clients of IssuesManager need
      // a full update when the setting changes to get an up-to-date issues list.
      //
      // The settings change listener can't be set up in IssuesManager's constructor. At that
      // time, the settings storage is not initialized yet, so the setting can't be created.
      const showThirdPartyIssuesSetting = SDK.Issue.getShowThirdPartyIssuesSetting();
      this.showThirdPartySettingsChangeListener = showThirdPartyIssuesSetting.addChangeListener(() => {
        this.updateFilteredIssues();
      });
    }

    const showThirdPartyIssuesSetting = SDK.Issue.getShowThirdPartyIssuesSetting();
    return showThirdPartyIssuesSetting.get() || !issue.isCausedByThirdParty();
  }

  private updateFilteredIssues(): void {
    this.filteredIssues.clear();
    this.issueCounts.clear();
    for (const [key, issue] of this.allIssues) {
      if (this.issueFilter(issue)) {
        this.filteredIssues.set(key, issue);
        this.issueCounts.set(issue.getKind(), 1 + (this.issueCounts.get(issue.getKind()) ?? 0));
      }
    }

    this.dispatchEventToListeners(Events.FullUpdateRequired);
    this.dispatchEventToListeners(Events.IssuesCountUpdated);
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  IssuesCountUpdated = 'IssuesCountUpdated',
  IssueAdded = 'IssueAdded',
  FullUpdateRequired = 'FullUpdateRequired',
}

// @ts-ignore
globalThis.addIssueForTest = (issue: Protocol.Audits.InspectorIssue): void => {
  const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
  const issuesModel = mainTarget?.model(SDK.IssuesModel.IssuesModel);
  issuesModel?.issueAdded({issue});
};
