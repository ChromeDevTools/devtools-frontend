// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as Host from '../host/host.js';
import * as UI from '../ui/ui.js';  // eslint-disable-line no-unused-vars

import {releaseNoteText} from './ReleaseNoteText.js';

export const releaseVersionSeen = 'releaseNoteVersionSeen';

export const releaseNoteViewId: string = 'release-note';

let _latestReleaseNote: ReleaseNote;

export function latestReleaseNote(): ReleaseNote {
  // @ts-ignore Included only for layout tests.
  const globalReleaseNotes: ReleaseNote[] = self.Help.releaseNoteText;
  if (!_latestReleaseNote) {
    _latestReleaseNote =
        (globalReleaseNotes || releaseNoteText).reduce((acc, note) => note.version > acc.version ? note : acc);
  }
  return _latestReleaseNote;
}

export function showReleaseNoteIfNeeded(): void {
  const releaseNoteVersionSetting = Common.Settings.Settings.instance().createSetting(releaseVersionSeen, 0);
  const releaseNoteVersionSettingValue = releaseNoteVersionSetting.get();
  innerShowReleaseNoteIfNeeded(
      releaseNoteVersionSettingValue, latestReleaseNote().version,
      Common.Settings.Settings.instance().moduleSetting('help.show-release-note').get());
}

export function innerShowReleaseNoteIfNeeded(
    lastSeenVersion: number, latestVersion: number, showReleaseNote: boolean): void {
  const releaseNoteVersionSetting = Common.Settings.Settings.instance().createSetting(releaseVersionSeen, 0);
  if (!lastSeenVersion) {
    releaseNoteVersionSetting.set(latestVersion);
    return;
  }
  if (!showReleaseNote) {
    return;
  }
  if (lastSeenVersion >= latestVersion) {
    return;
  }
  releaseNoteVersionSetting.set(latestVersion);
  UI.ViewManager.ViewManager.instance().showView(releaseNoteViewId, true);
}

export class HelpLateInitialization implements Common.Runnable.Runnable {
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
  static instance(opts: {forceNew: boolean|null;} = {forceNew: null}): ReleaseNotesActionDelegate {
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
  static instance(opts: {forceNew: boolean|null;} = {forceNew: null}): ReportIssueActionDelegate {
    const {forceNew} = opts;
    if (!reportIssueActionDelegateInstance || forceNew) {
      reportIssueActionDelegateInstance = new ReportIssueActionDelegate();
    }

    return reportIssueActionDelegateInstance;
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
  highlights: {title: string; subtitle: string; link: string;}[];
  link: string;
}
