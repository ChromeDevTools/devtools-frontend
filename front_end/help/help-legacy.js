// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import * as HelpModule from './help.js';

self.Help = self.Help || {};
Help = Help || {};

Help.latestReleaseNote = HelpModule.Help.latestReleaseNote;
Help._innerShowReleaseNoteIfNeeded = HelpModule.Help.innerShowReleaseNoteIfNeeded;
Help._showReleaseNoteIfNeeded = HelpModule.Help.showReleaseNoteIfNeeded;

/** @type {!Common.Settings.Setting} */
Help._releaseNoteVersionSetting = Common.Settings.Settings.instance().createSetting('releaseNoteVersionSeen', 0);

/**
 * @constructor
 */
Help.HelpLateInitialization = HelpModule.Help.HelpLateInitialization;

/**
 * @constructor
 */
Help.ReleaseNotesActionDelegate = HelpModule.Help.ReleaseNotesActionDelegate;

/**
 * @constructor
 */
Help.ReportIssueActionDelegate = HelpModule.Help.ReportIssueActionDelegate;

Help.releaseNoteText = HelpModule.ReleaseNoteText.releaseNoteText;

/**
 * @constructor
 */
Help.ReleaseNoteView = HelpModule.ReleaseNoteView.ReleaseNoteView;
