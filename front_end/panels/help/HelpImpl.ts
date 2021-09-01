// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as UI from '../../ui/legacy/legacy.js';

import {releaseNoteText} from './ReleaseNoteText.js';

export const releaseVersionSeen = 'releaseNoteVersionSeen';

export const releaseNoteViewId: string = 'release-note';

let latestReleaseNoteInstance: ReleaseNote;

let releaseNotesForTest: ReleaseNote[];

let releaseNoteVersionSetting: Common.Settings.Setting<number>;

export function latestReleaseNote(): ReleaseNote {
  if (!latestReleaseNoteInstance) {
    latestReleaseNoteInstance =
        (releaseNotesForTest || releaseNoteText).reduce((acc, note) => note.version > acc.version ? note : acc);
  }
  return latestReleaseNoteInstance;
}

export function showReleaseNoteIfNeeded(): void {
  const releaseNoteVersionSetting = Common.Settings.Settings.instance().createSetting(releaseVersionSeen, 0);
  const releaseNoteVersionSettingValue = releaseNoteVersionSetting.get();
  innerShowReleaseNoteIfNeeded(
      releaseNoteVersionSettingValue, latestReleaseNote().version,
      Common.Settings.Settings.instance().moduleSetting('help.show-release-note').get());
}

export function setReleaseNotesForTest(releaseNote: ReleaseNote[]): void {
  releaseNotesForTest = releaseNote;
}

export function getReleaseNoteVersionSetting(): Common.Settings.Setting<number> {
  if (!releaseNoteVersionSetting) {
    releaseNoteVersionSetting = Common.Settings.Settings.instance().createSetting(releaseVersionSeen, 0);
  }
  return releaseNoteVersionSetting;
}

export function innerShowReleaseNoteIfNeeded(
    lastSeenVersion: number, latestVersion: number, showReleaseNote: boolean): boolean {
  const releaseNoteVersionSetting = Common.Settings.Settings.instance().createSetting(releaseVersionSeen, 0);
  if (!lastSeenVersion) {
    releaseNoteVersionSetting.set(latestVersion);
    return false;
  }
  if (!showReleaseNote) {
    return false;
  }
  if (lastSeenVersion >= latestVersion) {
    return false;
  }
  releaseNoteVersionSetting.set(latestVersion);
  UI.ViewManager.ViewManager.instance().showView(releaseNoteViewId, true);
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
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(latestReleaseNote().link);
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
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(
        'https://bugs.chromium.org/p/chromium/issues/entry?template=DevTools+issue');
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

let reportTranslationIssueActionDelegateInstance: ReportTranslationIssueActionDelegate;
export class ReportTranslationIssueActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, _actionId: string): boolean {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab('https://goo.gle/devtools-translate');
    return true;
  }
  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): ReportTranslationIssueActionDelegate {
    const {forceNew} = opts;
    if (!reportTranslationIssueActionDelegateInstance || forceNew) {
      reportTranslationIssueActionDelegateInstance = new ReportTranslationIssueActionDelegate();
    }

    return reportTranslationIssueActionDelegateInstance;
  }
}
export interface ReleaseNoteHighlight {
  title: string;
  subtitle: string;
  link: string;
}
export interface ReleaseNote {
  version: number;
  header: string;
  highlights: {title: string, subtitle: string, link: string}[];
  link: string;
}
