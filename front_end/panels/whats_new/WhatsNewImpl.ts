// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as UI from '../../ui/legacy/legacy.js';

import {getReleaseNote} from './ReleaseNoteText.js';

export const releaseVersionSeen = 'releaseNoteVersionSeen';

export const releaseNoteViewId = 'release-note';

let releaseNoteVersionSetting: Common.Settings.Setting<number>;

export function showReleaseNoteIfNeeded(): boolean {
  const releaseNoteVersionSetting = Common.Settings.Settings.instance().createSetting(releaseVersionSeen, 0);
  const releaseNoteVersionSettingValue = releaseNoteVersionSetting.get();
  const releaseNote = getReleaseNote();
  return innerShowReleaseNoteIfNeeded(
      releaseNoteVersionSettingValue, releaseNote.version,
      Common.Settings.Settings.instance().moduleSetting('help.show-release-note').get());
}

export function getReleaseNoteVersionSetting(): Common.Settings.Setting<number> {
  if (!releaseNoteVersionSetting) {
    releaseNoteVersionSetting = Common.Settings.Settings.instance().createSetting(releaseVersionSeen, 0);
  }
  return releaseNoteVersionSetting;
}

function innerShowReleaseNoteIfNeeded(
    lastSeenVersion: number, latestVersion: number, showReleaseNoteSettingEnabled: boolean): boolean {
  const releaseNoteVersionSetting = Common.Settings.Settings.instance().createSetting(releaseVersionSeen, 0);
  if (!lastSeenVersion) {
    releaseNoteVersionSetting.set(latestVersion);
    return false;
  }
  if (!showReleaseNoteSettingEnabled) {
    return false;
  }
  if (lastSeenVersion >= latestVersion) {
    return false;
  }
  releaseNoteVersionSetting.set(latestVersion);
  void UI.ViewManager.ViewManager.instance().showView(releaseNoteViewId, true);
  return true;
}

let helpLateInitializationInstance: HelpLateInitialization;
export class HelpLateInitialization implements Common.Runnable.Runnable {
  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): HelpLateInitialization {
    const {forceNew} = opts;
    if (!helpLateInitializationInstance || forceNew) {
      helpLateInitializationInstance = new HelpLateInitialization();
    }
    return helpLateInitializationInstance;
  }

  async run(): Promise<void> {
    if (!Host.InspectorFrontendHost.isUnderTest()) {
      showReleaseNoteIfNeeded();
    }
  }
}

let releaseNotesActionDelegateInstance: ReleaseNotesActionDelegate;
export class ReleaseNotesActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, _actionId: string): boolean {
    const releaseNote = getReleaseNote();
    UI.UIUtils.openInNewTab(releaseNote.link);
    return true;
  }
  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): ReleaseNotesActionDelegate {
    const {forceNew} = opts;
    if (!releaseNotesActionDelegateInstance || forceNew) {
      releaseNotesActionDelegateInstance = new ReleaseNotesActionDelegate();
    }

    return releaseNotesActionDelegateInstance;
  }
}

let reportIssueActionDelegateInstance: ReportIssueActionDelegate;
export class ReportIssueActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, _actionId: string): boolean {
    UI.UIUtils.openInNewTab('https://goo.gle/devtools-bug');
    return true;
  }
  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): ReportIssueActionDelegate {
    const {forceNew} = opts;
    if (!reportIssueActionDelegateInstance || forceNew) {
      reportIssueActionDelegateInstance = new ReportIssueActionDelegate();
    }

    return reportIssueActionDelegateInstance;
  }
}
