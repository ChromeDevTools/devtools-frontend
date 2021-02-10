// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
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
  _eventListeners: WeakMap<SDK.IssuesModel.IssuesModel, Common.EventTarget.EventDescriptor>;
  _issues: Map<string, SDK.Issue.Issue>;
  _filteredIssues: Map<string, SDK.Issue.Issue>;
  _hasSeenTopFrameNavigated: boolean;
  _showThirdPartySettingsChangeListener: Common.EventTarget.EventDescriptor|null;
  _sourceFrameIssuesManager: SourceFrameIssuesManager;

  constructor() {
    super();
    this._eventListeners = new WeakMap();
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.IssuesModel.IssuesModel, this);
    this._issues = new Map();
    this._filteredIssues = new Map();
    this._hasSeenTopFrameNavigated = false;
    SDK.FrameManager.FrameManager.instance().addEventListener(
        SDK.FrameManager.Events.TopFrameNavigated, this._onTopFrameNavigated, this);
    SDK.FrameManager.FrameManager.instance().addEventListener(
        SDK.FrameManager.Events.FrameAddedToTarget, this._onFrameAddedToTarget, this);

    this._showThirdPartySettingsChangeListener = null;

    this._sourceFrameIssuesManager = new SourceFrameIssuesManager(this);
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
    return !this._hasSeenTopFrameNavigated;
  }

  _onTopFrameNavigated(event: Common.EventTarget.EventTargetEvent): void {
    const {frame} = event.data as {
      frame: SDK.ResourceTreeModel.ResourceTreeFrame,
    };
    const keptIssues = new Map<string, SDK.Issue.Issue>();
    for (const [key, issue] of this._issues.entries()) {
      if (issue.isAssociatedWithRequestId(frame.loaderId)) {
        keptIssues.set(key, issue);
      }
    }
    this._issues = keptIssues;
    this._hasSeenTopFrameNavigated = true;
    this._updateFilteredIssues();
  }

  _onFrameAddedToTarget(event: Common.EventTarget.EventTargetEvent): void {
    const {frame} = event.data as {
      frame: SDK.ResourceTreeModel.ResourceTreeFrame,
    };
    // Determining third-party status usually requires the registered domain of the top frame.
    // When DevTools is opened after navigation has completed, issues may be received
    // before the top frame is available. Thus, we trigger a recalcuation of third-party-ness
    // when we attach to the top frame.
    if (frame.isTopFrame()) {
      this._updateFilteredIssues();
    }
  }

  modelAdded(issuesModel: SDK.IssuesModel.IssuesModel): void {
    const listener = issuesModel.addEventListener(SDK.IssuesModel.Events.IssueAdded, this._issueAdded, this);
    this._eventListeners.set(issuesModel, listener);
  }

  modelRemoved(issuesModel: SDK.IssuesModel.IssuesModel): void {
    const listener = this._eventListeners.get(issuesModel);
    if (listener) {
      Common.EventTarget.EventTarget.removeEventListeners([listener]);
    }
  }

  _issueAdded(event: Common.EventTarget.EventTargetEvent): void {
    const {issuesModel, issue} = event.data as {
      issuesModel: SDK.IssuesModel.IssuesModel,
      issue: SDK.Issue.Issue,
    };
    // Ignore issues without proper description; they are invisible to the user and only cause confusion.
    if (!issue.getDescription()) {
      return;
    }
    const primaryKey = issue.primaryKey();
    if (this._issues.has(primaryKey)) {
      return;
    }
    this._issues.set(primaryKey, issue);

    if (this._issueFilter(issue)) {
      this._filteredIssues.set(primaryKey, issue);
      this.dispatchEventToListeners(Events.IssueAdded, {issuesModel, issue});
    }
    // Always fire the "count" event even if the issue was filtered out.
    // The result of `hasOnlyThirdPartyIssues` could still change.
    this.dispatchEventToListeners(Events.IssuesCountUpdated);
  }

  issues(): Iterable<SDK.Issue.Issue> {
    return this._filteredIssues.values();
  }

  numberOfIssues(): number {
    return this._filteredIssues.size;
  }

  numberOfAllStoredIssues(): number {
    return this._issues.size;
  }

  _issueFilter(issue: SDK.Issue.Issue): boolean {
    if (!this._showThirdPartySettingsChangeListener) {
      // _issueFilter uses the 'showThirdPartyIssues' setting. Clients of IssuesManager need
      // a full update when the setting changes to get an up-to-date issues list.
      //
      // The settings change listener can't be set up in IssuesManager's constructor. At that
      // time, the settings storage is not initialized yet, so the setting can't be created.
      const showThirdPartyIssuesSetting = SDK.Issue.getShowThirdPartyIssuesSetting();
      this._showThirdPartySettingsChangeListener = showThirdPartyIssuesSetting.addChangeListener(() => {
        this._updateFilteredIssues();
      });
    }

    const showThirdPartyIssuesSetting = SDK.Issue.getShowThirdPartyIssuesSetting();
    return showThirdPartyIssuesSetting.get() || !issue.isCausedByThirdParty();
  }

  _updateFilteredIssues(): void {
    this._filteredIssues.clear();
    for (const [key, issue] of this._issues) {
      if (this._issueFilter(issue)) {
        this._filteredIssues.set(key, issue);
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
