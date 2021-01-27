// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../i18n/i18n.js';
export const UIStrings = {
  /**
  *@description Text for DevTools appearance
  */
  appearance: 'Appearance',
  /**
  *@description Title of a setting under the Appearance category that can be invoked through the Command Menu
  */
  showWhatsNewAfterEachUpdate: 'Show What\'s New after each update',
  /**
  *@description Title of a setting under the Appearance category that can be invoked through the Command Menu
  */
  doNotShowWhatsNewAfterEachUpdate: 'Do not show What\'s New after each update',
  /**
  *@description Text for the viewing the help options
  */
  help: 'Help',
  /**
  *@description Title of an action in the help tool to release notes
  */
  releaseNotes: 'Release notes',
  /**
  *@description Title of an action in the help tool to file an issue
  */
  reportADevtoolsIssue: 'Report a DevTools issue',
  /**
  *@description A search term referring to a software defect (i.e. bug) that can be entered in the command menu
  */
  bug: 'bug',
};
i18n.i18n.registerUIStrings('help/ModuleUIStrings.ts', UIStrings);
