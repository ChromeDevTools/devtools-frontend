// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {Common.Revealer.Revealer}
 * @unrestricted
 */
export class IssueRevealer {
  /**
   * @override
   * @param {!Object} issue
   * @return {!Promise}
   */
  async reveal(issue) {
    if (!(issue instanceof SDK.Issue.Issue)) {
      throw new Error('Internal error: not a issue');
    }
    await self.UI.viewManager.showView('issues-pane');
    const issuesPane = await self.UI.viewManager.view('issues-pane').widget();
    issuesPane.revealByCode(issue.code());
  }
}
