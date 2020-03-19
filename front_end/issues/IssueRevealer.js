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
    await UI.ViewManager.ViewManager.instance().showView('issues-pane');
    const issuesPane = await UI.ViewManager.ViewManager.instance().view('issues-pane').widget();
    issuesPane.revealByCode(issue.code());
  }
}
