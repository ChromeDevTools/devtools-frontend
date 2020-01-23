// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as HelpModule from './help.js';

self.Help = self.Help || {};
Help = Help || {};

Help.latestReleaseNote = HelpModule.Help.latestReleaseNote;
Help._innerShowReleaseNoteIfNeeded = HelpModule.Help.innerShowReleaseNoteIfNeeded;
Help._showReleaseNoteIfNeeded = HelpModule.Help.showReleaseNoteIfNeeded;

/** @type {!Common.Setting} */
Help._releaseNoteVersionSetting = self.self.Common.settings.createSetting('releaseNoteVersionSeen', 0);

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

/** @typedef {!{title: string, subtitle: string, link: string}} */
Help.ReleaseNoteHighlight;

/**
 * @typedef {!{version: number, header: string, highlights: !Array<!Help.ReleaseNoteHighlight>,
 *    link: string}}
 */
Help.ReleaseNote;
